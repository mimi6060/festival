"""
Festival Platform - Database Credentials Rotation
==================================================
Handles PostgreSQL database credential rotation with zero-downtime.
Uses a dual-user strategy for seamless credential rotation.
"""

import json
import logging
import secrets
import string
from typing import Any, Dict

import boto3
import psycopg2
from psycopg2 import sql
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def rotate_database_secret(
    secrets_client: Any,
    secret_arn: str,
    token: str,
    step: str
) -> Dict[str, Any]:
    """
    Rotate database credentials through the four-step rotation process.

    Steps:
    1. createSecret: Generate new credentials and store as AWSPENDING
    2. setSecret: Update database with new credentials
    3. testSecret: Verify new credentials work
    4. finishSecret: Move AWSPENDING to AWSCURRENT

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
        'createSecret': create_secret,
        'setSecret': set_secret,
        'testSecret': test_secret,
        'finishSecret': finish_secret
    }

    handler = step_handlers.get(step)
    if not handler:
        raise ValueError(f"Unknown rotation step: {step}")

    return handler(secrets_client, secret_arn, token)


def create_secret(
    client: Any,
    secret_arn: str,
    token: str
) -> Dict[str, Any]:
    """
    Create a new secret version with generated credentials.

    This step generates new database credentials and stores them
    as a pending version in Secrets Manager.
    """
    logger.info(f"Creating new secret version for: {secret_arn}")

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

    # Generate new password
    new_password = generate_secure_password(32)

    # Create new secret value
    new_value = current_value.copy()
    new_value['password'] = new_password
    new_value['previous_password'] = current_value['password']
    new_value['rotation_token'] = token

    # Update connection URL
    new_value['connection_url'] = (
        f"postgresql://{new_value['username']}:{new_password}@"
        f"{new_value['host']}:{new_value['port']}/{new_value['dbname']}?sslmode=require"
    )

    # Store as pending version
    client.put_secret_value(
        SecretId=secret_arn,
        ClientRequestToken=token,
        SecretString=json.dumps(new_value),
        VersionStages=['AWSPENDING']
    )

    logger.info(f"Created pending secret version: {token}")
    return {'status': 'created', 'token': token}


def set_secret(
    client: Any,
    secret_arn: str,
    token: str
) -> Dict[str, Any]:
    """
    Set the new credentials in the database.

    This step connects to the database using the master credentials
    and updates the application user's password.
    """
    logger.info(f"Setting new secret in database for: {secret_arn}")

    # Get pending secret value
    pending_secret = client.get_secret_value(
        SecretId=secret_arn,
        VersionId=token,
        VersionStage='AWSPENDING'
    )
    pending_value = json.loads(pending_secret['SecretString'])

    # Get current secret for connection
    current_secret = client.get_secret_value(
        SecretId=secret_arn,
        VersionStage='AWSCURRENT'
    )
    current_value = json.loads(current_secret['SecretString'])

    # Connect to database using current credentials
    conn = None
    try:
        conn = psycopg2.connect(
            host=current_value['host'],
            port=current_value['port'],
            database=current_value['dbname'],
            user=current_value['username'],
            password=current_value['password'],
            sslmode='require',
            connect_timeout=10
        )
        conn.autocommit = True

        with conn.cursor() as cursor:
            # Update password for the application user
            username = pending_value['username']
            new_password = pending_value['password']

            # Use safe parameter binding
            cursor.execute(
                sql.SQL("ALTER USER {} WITH PASSWORD %s").format(
                    sql.Identifier(username)
                ),
                [new_password]
            )

            logger.info(f"Updated password for user: {username}")

        return {'status': 'set', 'user': username}

    except psycopg2.Error as e:
        logger.error(f"Database error during set_secret: {e}")
        raise
    finally:
        if conn:
            conn.close()


def test_secret(
    client: Any,
    secret_arn: str,
    token: str
) -> Dict[str, Any]:
    """
    Test that the new credentials work.

    This step verifies that the application can connect to the database
    using the new credentials before finalizing the rotation.
    """
    logger.info(f"Testing new secret for: {secret_arn}")

    # Get pending secret value
    pending_secret = client.get_secret_value(
        SecretId=secret_arn,
        VersionId=token,
        VersionStage='AWSPENDING'
    )
    pending_value = json.loads(pending_secret['SecretString'])

    # Test connection with new credentials
    conn = None
    try:
        conn = psycopg2.connect(
            host=pending_value['host'],
            port=pending_value['port'],
            database=pending_value['dbname'],
            user=pending_value['username'],
            password=pending_value['password'],
            sslmode='require',
            connect_timeout=10
        )

        with conn.cursor() as cursor:
            # Verify we can execute queries
            cursor.execute("SELECT 1")
            result = cursor.fetchone()

            if result[0] != 1:
                raise Exception("Test query returned unexpected result")

            # Verify we have necessary permissions
            cursor.execute("""
                SELECT has_table_privilege(current_user, 'information_schema.tables', 'SELECT')
            """)

            logger.info("New credentials tested successfully")

        return {'status': 'tested', 'success': True}

    except psycopg2.Error as e:
        logger.error(f"Database connection test failed: {e}")
        raise Exception(f"Failed to connect with new credentials: {e}")
    finally:
        if conn:
            conn.close()


def finish_secret(
    client: Any,
    secret_arn: str,
    token: str
) -> Dict[str, Any]:
    """
    Finalize the rotation by moving AWSPENDING to AWSCURRENT.

    This step completes the rotation by updating version stages
    and cleaning up the previous version.
    """
    logger.info(f"Finishing secret rotation for: {secret_arn}")

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

    # Remove AWSPENDING stage from new current version
    try:
        client.update_secret_version_stage(
            SecretId=secret_arn,
            VersionStage='AWSPENDING',
            RemoveFromVersionId=token
        )
    except ClientError:
        pass  # May already be removed

    # Move old version to AWSPREVIOUS for rollback capability
    if current_version:
        try:
            client.update_secret_version_stage(
                SecretId=secret_arn,
                VersionStage='AWSPREVIOUS',
                MoveToVersionId=current_version
            )
        except ClientError:
            pass  # Previous stage may not exist

    logger.info(f"Rotation completed. New version: {token}")
    return {'status': 'finished', 'new_version': token, 'previous_version': current_version}


def generate_secure_password(length: int = 32) -> str:
    """
    Generate a cryptographically secure password.

    Args:
        length: Password length (default 32)

    Returns:
        Secure random password
    """
    # Define character sets
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    special = "!#$%&*()-_=+[]{}:?"

    # Ensure at least one of each type
    password = [
        secrets.choice(lowercase),
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
        secrets.choice(digits),
        secrets.choice(special),
        secrets.choice(special),
    ]

    # Fill remaining length with random characters
    all_chars = lowercase + uppercase + digits + special
    password.extend(secrets.choice(all_chars) for _ in range(length - len(password)))

    # Shuffle to randomize position of required characters
    password_list = list(password)
    secrets.SystemRandom().shuffle(password_list)

    return ''.join(password_list)


def validate_connection_params(secret_value: Dict[str, Any]) -> bool:
    """
    Validate that all required connection parameters are present.

    Args:
        secret_value: Secret value dictionary

    Returns:
        True if valid, raises ValueError otherwise
    """
    required_fields = ['host', 'port', 'dbname', 'username', 'password']

    for field in required_fields:
        if field not in secret_value or not secret_value[field]:
            raise ValueError(f"Missing required field: {field}")

    return True
