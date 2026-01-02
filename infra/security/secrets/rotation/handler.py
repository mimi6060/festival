"""
Festival Platform - Secrets Rotation Lambda Handler
====================================================
Main entry point for AWS Secrets Manager rotation.
Handles rotation for database, JWT, Redis, and API key secrets.
"""

import json
import logging
import os
from typing import Any, Dict, Optional

import boto3
from botocore.exceptions import ClientError

from database_rotation import rotate_database_secret
from jwt_rotation import rotate_jwt_secret
from api_key_rotation import rotate_api_key_secret
from redis_rotation import rotate_redis_secret
from notifications import send_notification, NotificationType

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
secrets_client = boto3.client('secretsmanager')
sns_client = boto3.client('sns')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for secrets rotation.

    This function is invoked by AWS Secrets Manager during rotation
    or by EventBridge for health checks.

    Args:
        event: Event data from Secrets Manager or EventBridge
        context: Lambda context

    Returns:
        Response indicating success or failure
    """
    logger.info(f"Received event: {json.dumps(event)}")

    # Handle health check from EventBridge
    if event.get('action') == 'health_check':
        return handle_health_check(event)

    # Handle manual rotation trigger
    if event.get('action') == 'manual_rotation':
        return handle_manual_rotation(event)

    # Standard Secrets Manager rotation
    secret_arn = event.get('SecretId')
    token = event.get('ClientRequestToken')
    step = event.get('Step')

    if not all([secret_arn, token, step]):
        logger.error("Missing required parameters for rotation")
        raise ValueError("SecretId, ClientRequestToken, and Step are required")

    # Get secret metadata to determine rotation type
    try:
        secret_metadata = secrets_client.describe_secret(SecretId=secret_arn)
        secret_name = secret_metadata['Name']
        tags = {tag['Key']: tag['Value'] for tag in secret_metadata.get('Tags', [])}
        secret_type = tags.get('SecretType', 'Unknown')
    except ClientError as e:
        logger.error(f"Failed to describe secret: {e}")
        raise

    logger.info(f"Processing rotation step '{step}' for secret '{secret_name}' (type: {secret_type})")

    # Route to appropriate rotation handler based on secret type
    rotation_handlers = {
        'DatabaseCredentials': rotate_database_secret,
        'JWTSecret': rotate_jwt_secret,
        'RedisCredentials': rotate_redis_secret,
        'APIKeys': rotate_api_key_secret,
    }

    handler = rotation_handlers.get(secret_type)
    if not handler:
        logger.error(f"Unknown secret type: {secret_type}")
        raise ValueError(f"No rotation handler for secret type: {secret_type}")

    try:
        # Execute the appropriate rotation step
        result = handler(
            secrets_client=secrets_client,
            secret_arn=secret_arn,
            token=token,
            step=step
        )

        # Send notification on successful completion
        if step == 'finishSecret':
            send_notification(
                notification_type=NotificationType.ROTATION_SUCCESS,
                secret_name=secret_name,
                secret_type=secret_type,
                message=f"Successfully rotated {secret_type} secret: {secret_name}"
            )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Successfully completed step {step}',
                'secret': secret_name,
                'type': secret_type
            })
        }

    except Exception as e:
        logger.error(f"Rotation failed: {e}")

        # Send failure notification
        send_notification(
            notification_type=NotificationType.ROTATION_FAILURE,
            secret_name=secret_name,
            secret_type=secret_type,
            message=f"Failed to rotate {secret_type} secret: {secret_name}. Error: {str(e)}"
        )

        # Attempt rollback
        if step not in ['createSecret']:
            try:
                rollback_rotation(secrets_client, secret_arn, token, secret_type)
            except Exception as rollback_error:
                logger.error(f"Rollback also failed: {rollback_error}")
                send_notification(
                    notification_type=NotificationType.ROLLBACK_FAILURE,
                    secret_name=secret_name,
                    secret_type=secret_type,
                    message=f"CRITICAL: Rollback failed for {secret_name}. Manual intervention required!"
                )

        raise


def handle_health_check(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle health check for secrets rotation system.

    Verifies that all secrets are properly configured and rotation
    is functioning as expected.
    """
    logger.info("Running secrets rotation health check")

    secrets_to_check = event.get('secrets', [])
    results = []
    issues = []

    for secret_arn in secrets_to_check:
        try:
            metadata = secrets_client.describe_secret(SecretId=secret_arn)
            secret_name = metadata['Name']

            # Check rotation configuration
            rotation_enabled = metadata.get('RotationEnabled', False)
            last_rotation = metadata.get('LastRotatedDate')
            next_rotation = metadata.get('NextRotationDate')

            # Check for pending rotation versions
            versions = metadata.get('VersionIdsToStages', {})
            pending_versions = [v for v, stages in versions.items() if 'AWSPENDING' in stages]

            status = 'healthy'
            if pending_versions:
                status = 'pending_rotation'
                issues.append(f"{secret_name}: Has pending rotation version")
            elif not rotation_enabled:
                status = 'rotation_disabled'
                issues.append(f"{secret_name}: Rotation is disabled")

            results.append({
                'secret_name': secret_name,
                'status': status,
                'rotation_enabled': rotation_enabled,
                'last_rotation': str(last_rotation) if last_rotation else None,
                'next_rotation': str(next_rotation) if next_rotation else None
            })

        except ClientError as e:
            logger.error(f"Failed to check secret {secret_arn}: {e}")
            issues.append(f"Failed to access secret: {secret_arn}")
            results.append({
                'secret_arn': secret_arn,
                'status': 'error',
                'error': str(e)
            })

    # Send notification if there are issues
    if issues:
        send_notification(
            notification_type=NotificationType.HEALTH_CHECK_WARNING,
            secret_name='Multiple',
            secret_type='HealthCheck',
            message=f"Health check found {len(issues)} issue(s): " + "; ".join(issues)
        )

    return {
        'statusCode': 200,
        'body': json.dumps({
            'status': 'healthy' if not issues else 'issues_found',
            'issues_count': len(issues),
            'results': results,
            'issues': issues
        })
    }


def handle_manual_rotation(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle manual rotation trigger.

    Allows operators to manually trigger rotation for specific secrets.
    """
    secret_arn = event.get('secret_arn')
    if not secret_arn:
        raise ValueError("secret_arn is required for manual rotation")

    logger.info(f"Triggering manual rotation for: {secret_arn}")

    try:
        # Get secret metadata
        metadata = secrets_client.describe_secret(SecretId=secret_arn)
        secret_name = metadata['Name']

        # Trigger rotation
        response = secrets_client.rotate_secret(SecretId=secret_arn)

        send_notification(
            notification_type=NotificationType.MANUAL_ROTATION_STARTED,
            secret_name=secret_name,
            secret_type='Manual',
            message=f"Manual rotation started for: {secret_name}"
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Manual rotation triggered successfully',
                'secret': secret_name,
                'version_id': response.get('VersionId')
            })
        }

    except ClientError as e:
        logger.error(f"Failed to trigger manual rotation: {e}")
        raise


def rollback_rotation(
    client: Any,
    secret_arn: str,
    token: str,
    secret_type: str
) -> None:
    """
    Attempt to rollback a failed rotation.

    This function tries to restore the previous secret version
    and clean up any pending versions.
    """
    logger.info(f"Attempting rollback for secret: {secret_arn}")

    try:
        # Get current versions
        metadata = client.describe_secret(SecretId=secret_arn)
        versions = metadata.get('VersionIdsToStages', {})

        # Find the current version
        current_version = None
        for version_id, stages in versions.items():
            if 'AWSCURRENT' in stages:
                current_version = version_id
                break

        if not current_version:
            logger.error("No current version found during rollback")
            return

        # Remove the pending version stage
        try:
            client.update_secret_version_stage(
                SecretId=secret_arn,
                VersionStage='AWSPENDING',
                RemoveFromVersionId=token
            )
            logger.info(f"Removed AWSPENDING stage from version {token}")
        except ClientError as e:
            if 'ResourceNotFoundException' not in str(e):
                raise

        logger.info(f"Rollback completed. Current version: {current_version}")

    except Exception as e:
        logger.error(f"Rollback failed: {e}")
        raise


def get_secret_value(secret_arn: str, version_stage: str = 'AWSCURRENT') -> Dict[str, Any]:
    """
    Retrieve a secret value from Secrets Manager.

    Args:
        secret_arn: ARN of the secret
        version_stage: Version stage to retrieve (AWSCURRENT or AWSPENDING)

    Returns:
        Parsed secret value as dictionary
    """
    try:
        response = secrets_client.get_secret_value(
            SecretId=secret_arn,
            VersionStage=version_stage
        )
        return json.loads(response['SecretString'])
    except ClientError as e:
        logger.error(f"Failed to get secret value: {e}")
        raise
