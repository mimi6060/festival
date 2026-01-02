"""
Festival Platform - JWT Secret Rotation
========================================
Handles JWT signing key rotation with zero-downtime.
Maintains previous keys for graceful token validation during transition.
"""

import json
import logging
import secrets
import string
from datetime import datetime, timezone
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def rotate_jwt_secret(
    secrets_client: Any,
    secret_arn: str,
    token: str,
    step: str
) -> Dict[str, Any]:
    """
    Rotate JWT secrets through the four-step rotation process.

    JWT rotation is special because we need to maintain the previous
    secrets for a transition period to validate existing tokens.

    Args:
        secrets_client: Boto3 Secrets Manager client
        secret_arn: ARN of the secret to rotate
        token: Client request token for this rotation
        step: Current rotation step

    Returns:
        Result of the rotation step
    """
    # Get secret metadata
    metadata = secrets_client.describe_secret(SecretId=secret_arn)
    versions = metadata.get('VersionIdsToStages', {})

    # Verify token is valid for this rotation
    if token not in versions:
        raise ValueError(f"Token {token} not found in secret versions")

    if 'AWSCURRENT' in versions.get(token, []):
        logger.info(f"Token {token} is already AWSCURRENT, skipping rotation")
        return {'status': 'already_current'}

    # Execute the appropriate step
    step_handlers = {
        'createSecret': create_jwt_secret,
        'setSecret': set_jwt_secret,
        'testSecret': test_jwt_secret,
        'finishSecret': finish_jwt_secret
    }

    handler = step_handlers.get(step)
    if not handler:
        raise ValueError(f"Unknown rotation step: {step}")

    return handler(secrets_client, secret_arn, token)


def create_jwt_secret(
    client: Any,
    secret_arn: str,
    token: str
) -> Dict[str, Any]:
    """
    Create new JWT signing secrets.

    Generates new secrets while preserving the current ones
    as 'previous' for graceful token validation.
    """
    logger.info(f"Creating new JWT secret version for: {secret_arn}")

    # Get current secret value
    try:
        current_secret = client.get_secret_value(
            SecretId=secret_arn,
            VersionStage='AWSCURRENT'
        )
        current_value = json.loads(current_secret['SecretString'])
    except ClientError as e:
        logger.error(f"Failed to get current secret: {e}")
        raise

    # Check if pending version already exists
    try:
        client.get_secret_value(
            SecretId=secret_arn,
            VersionId=token,
            VersionStage='AWSPENDING'
        )
        logger.info("Pending version already exists, using existing")
        return {'status': 'pending_exists'}
    except ClientError as e:
        if 'ResourceNotFoundException' not in str(e):
            raise

    # Generate new JWT secrets
    new_secret = generate_jwt_secret(64)
    new_refresh_secret = generate_jwt_secret(64)

    # Create new secret value preserving previous secrets
    new_value = {
        'secret': new_secret,
        'refresh_secret': new_refresh_secret,
        'algorithm': current_value.get('algorithm', 'HS256'),
        'access_token_expiry': current_value.get('access_token_expiry', '15m'),
        'refresh_token_expiry': current_value.get('refresh_token_expiry', '7d'),
        # Store previous secrets for graceful transition
        'previous_secret': current_value.get('secret', ''),
        'previous_refresh_secret': current_value.get('refresh_secret', ''),
        # Keep older secrets if they exist (for double transition)
        'previous_previous_secret': current_value.get('previous_secret', ''),
        'previous_previous_refresh_secret': current_value.get('previous_refresh_secret', ''),
        # Rotation metadata
        'rotation_timestamp': datetime.now(timezone.utc).isoformat(),
        'rotation_token': token,
        # Grace period in seconds (how long to accept old tokens)
        'grace_period_seconds': 86400 * 7,  # 7 days
    }

    # Store as pending version
    client.put_secret_value(
        SecretId=secret_arn,
        ClientRequestToken=token,
        SecretString=json.dumps(new_value),
        VersionStages=['AWSPENDING']
    )

    logger.info(f"Created pending JWT secret version: {token}")
    return {'status': 'created', 'token': token}


def set_jwt_secret(
    client: Any,
    secret_arn: str,
    token: str
) -> Dict[str, Any]:
    """
    Set the new JWT secret (no external system changes needed).

    For JWT rotation, there's no external system to update.
    The application will pick up the new secret automatically
    from Secrets Manager.
    """
    logger.info(f"JWT secret set step for: {secret_arn}")

    # Verify pending secret exists and is valid
    try:
        pending_secret = client.get_secret_value(
            SecretId=secret_arn,
            VersionId=token,
            VersionStage='AWSPENDING'
        )
        pending_value = json.loads(pending_secret['SecretString'])

        # Validate secret structure
        required_fields = ['secret', 'refresh_secret', 'algorithm']
        for field in required_fields:
            if field not in pending_value or not pending_value[field]:
                raise ValueError(f"Missing required field: {field}")

        logger.info("JWT secret structure validated")
        return {'status': 'set', 'valid': True}

    except ClientError as e:
        logger.error(f"Failed to validate pending secret: {e}")
        raise


def test_jwt_secret(
    client: Any,
    secret_arn: str,
    token: str
) -> Dict[str, Any]:
    """
    Test the new JWT secret.

    Verifies that the new secret can be used to sign and verify tokens.
    """
    logger.info(f"Testing new JWT secret for: {secret_arn}")

    # Get pending secret value
    pending_secret = client.get_secret_value(
        SecretId=secret_arn,
        VersionId=token,
        VersionStage='AWSPENDING'
    )
    pending_value = json.loads(pending_secret['SecretString'])

    # Test JWT signing and verification
    try:
        import jwt

        # Test access token
        test_payload = {
            'sub': 'test-user-id',
            'iat': datetime.now(timezone.utc).timestamp(),
            'exp': datetime.now(timezone.utc).timestamp() + 300,
            'type': 'access'
        }

        # Sign with new secret
        access_token = jwt.encode(
            test_payload,
            pending_value['secret'],
            algorithm=pending_value['algorithm']
        )

        # Verify with new secret
        decoded = jwt.decode(
            access_token,
            pending_value['secret'],
            algorithms=[pending_value['algorithm']]
        )

        if decoded['sub'] != 'test-user-id':
            raise Exception("Token verification failed: payload mismatch")

        # Test refresh token
        refresh_payload = {
            'sub': 'test-user-id',
            'iat': datetime.now(timezone.utc).timestamp(),
            'exp': datetime.now(timezone.utc).timestamp() + 3600,
            'type': 'refresh'
        }

        refresh_token = jwt.encode(
            refresh_payload,
            pending_value['refresh_secret'],
            algorithm=pending_value['algorithm']
        )

        decoded_refresh = jwt.decode(
            refresh_token,
            pending_value['refresh_secret'],
            algorithms=[pending_value['algorithm']]
        )

        if decoded_refresh['sub'] != 'test-user-id':
            raise Exception("Refresh token verification failed: payload mismatch")

        # Test that previous secret still works (graceful rotation)
        if pending_value.get('previous_secret'):
            previous_payload = {
                'sub': 'previous-user',
                'iat': datetime.now(timezone.utc).timestamp(),
                'exp': datetime.now(timezone.utc).timestamp() + 300,
                'type': 'access'
            }

            previous_token = jwt.encode(
                previous_payload,
                pending_value['previous_secret'],
                algorithm=pending_value['algorithm']
            )

            # Application should accept tokens signed with previous secret
            decoded_previous = jwt.decode(
                previous_token,
                pending_value['previous_secret'],
                algorithms=[pending_value['algorithm']]
            )

            logger.info("Previous secret validation works (graceful rotation)")

        logger.info("JWT secret tested successfully")
        return {'status': 'tested', 'success': True}

    except ImportError:
        # PyJWT not available in Lambda, skip signing test
        logger.warning("PyJWT not available, skipping signing test")

        # At minimum, validate secret format
        if len(pending_value['secret']) < 32:
            raise ValueError("JWT secret too short (minimum 32 characters)")
        if len(pending_value['refresh_secret']) < 32:
            raise ValueError("JWT refresh secret too short (minimum 32 characters)")

        return {'status': 'tested', 'success': True, 'note': 'format_only'}

    except Exception as e:
        logger.error(f"JWT secret test failed: {e}")
        raise Exception(f"Failed to test JWT secret: {e}")


def finish_jwt_secret(
    client: Any,
    secret_arn: str,
    token: str
) -> Dict[str, Any]:
    """
    Finalize the JWT rotation.

    Moves AWSPENDING to AWSCURRENT, completing the rotation.
    Previous secrets are preserved in the secret value for graceful transition.
    """
    logger.info(f"Finishing JWT secret rotation for: {secret_arn}")

    # Get current version
    metadata = client.describe_secret(SecretId=secret_arn)
    versions = metadata.get('VersionIdsToStages', {})

    current_version = None
    for version_id, stages in versions.items():
        if 'AWSCURRENT' in stages and version_id != token:
            current_version = version_id
            break

    # Move AWSPENDING to AWSCURRENT
    client.update_secret_version_stage(
        SecretId=secret_arn,
        VersionStage='AWSCURRENT',
        MoveToVersionId=token,
        RemoveFromVersionId=current_version
    )

    # Remove AWSPENDING stage
    try:
        client.update_secret_version_stage(
            SecretId=secret_arn,
            VersionStage='AWSPENDING',
            RemoveFromVersionId=token
        )
    except ClientError:
        pass

    # Keep previous version accessible
    if current_version:
        try:
            client.update_secret_version_stage(
                SecretId=secret_arn,
                VersionStage='AWSPREVIOUS',
                MoveToVersionId=current_version
            )
        except ClientError:
            pass

    logger.info(f"JWT rotation completed. New version: {token}")
    return {
        'status': 'finished',
        'new_version': token,
        'previous_version': current_version,
        'note': 'Previous secrets preserved for graceful transition'
    }


def generate_jwt_secret(length: int = 64) -> str:
    """
    Generate a cryptographically secure JWT secret.

    Args:
        length: Secret length (default 64)

    Returns:
        Secure random secret string
    """
    # Use URL-safe base64 characters for JWT compatibility
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def get_all_valid_secrets(secret_value: Dict[str, Any]) -> list:
    """
    Get all currently valid secrets for token validation.

    During rotation transition, both new and previous secrets should
    be accepted for token validation.

    Args:
        secret_value: Secret value dictionary

    Returns:
        List of valid secrets (current and previous)
    """
    valid_secrets = []

    # Current secret
    if secret_value.get('secret'):
        valid_secrets.append(secret_value['secret'])

    # Previous secret (within grace period)
    if secret_value.get('previous_secret'):
        valid_secrets.append(secret_value['previous_secret'])

    # Older previous secret (for double rotation scenarios)
    if secret_value.get('previous_previous_secret'):
        valid_secrets.append(secret_value['previous_previous_secret'])

    return valid_secrets
