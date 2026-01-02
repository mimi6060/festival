# Secrets Rotation Automation Guide

**Festival Management Platform**

**Date:** 2026-01-02
**Version:** 1.0
**Classification:** CONFIDENTIAL - Internal Use Only
**Compliance:** PCI-DSS, GDPR, SOC 2

---

## Table of Contents

1. [Overview](#1-overview)
2. [AWS Secrets Manager Rotation](#2-aws-secrets-manager-rotation)
3. [Database Credential Rotation](#3-database-credential-rotation)
4. [API Key Rotation Policies](#4-api-key-rotation-policies)
5. [JWT Secret Rotation](#5-jwt-secret-rotation)
6. [Third-Party API Key Management](#6-third-party-api-key-management)
7. [Rotation Schedules](#7-rotation-schedules)
8. [Emergency Rotation Procedures](#8-emergency-rotation-procedures)
9. [Automation Scripts & Lambda Functions](#9-automation-scripts--lambda-functions)
10. [Monitoring & Alerting](#10-monitoring--alerting)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Overview

This document details the secrets rotation automation strategy for the Festival Management Platform. Automatic rotation reduces the risk of credential compromise and ensures compliance with security standards.

### 1.1 Key Principles

1. **Zero-Downtime Rotation** - All rotations are designed to be seamless with no service interruption
2. **Dual-Secret Support** - During rotation, both old and new secrets are valid
3. **Automated Scheduling** - Secrets rotate automatically based on defined schedules
4. **Audit Trail** - All rotation events are logged and monitored
5. **Emergency Override** - Manual rotation can be triggered at any time

### 1.2 Architecture Overview

```
+------------------+     +-------------------------+     +------------------+
|   EventBridge    |---->|   Secrets Manager       |---->|  Lambda Rotation |
|   (Schedule)     |     |   Rotation Trigger      |     |  Function        |
+------------------+     +-------------------------+     +------------------+
                                                                  |
                                   +------------------------------+
                                   |
         +-------------------------+-------------------------+
         |                         |                         |
         v                         v                         v
+------------------+     +------------------+     +------------------+
|   PostgreSQL     |     |   ElastiCache    |     |   Application    |
|   (RDS)          |     |   (Redis)        |     |   (ECS/EKS)      |
+------------------+     +------------------+     +------------------+
                                   |
                                   v
                         +------------------+
                         |   SNS Topic      |
                         |   (Notifications)|
                         +------------------+
                                   |
                    +--------------+--------------+
                    |              |              |
                    v              v              v
              +----------+  +----------+  +----------+
              |  Email   |  |  Slack   |  | PagerDuty|
              +----------+  +----------+  +----------+
```

### 1.3 Secret Categories

| Category | Rotation Type | Automation Level |
|----------|---------------|------------------|
| Database Credentials | Automatic | Full |
| JWT Secrets | Automatic | Full |
| Redis Credentials | Automatic | Full |
| Internal API Keys | Automatic | Full |
| Stripe API Keys | Manual | Assisted |
| Firebase Credentials | Manual | Assisted |
| OAuth Client Secrets | Manual | Assisted |

---

## 2. AWS Secrets Manager Rotation

### 2.1 Infrastructure Setup

All secrets are managed through AWS Secrets Manager with the following Terraform configuration:

**Location:** `infra/security/secrets/`

```hcl
# KMS Key for Secrets Encryption
resource "aws_kms_key" "secrets" {
  description             = "KMS key for Festival Platform secrets encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true  # Annual automatic KMS key rotation
}

# Example Secret with Rotation
resource "aws_secretsmanager_secret" "database" {
  name        = "${local.name_prefix}/database"
  description = "PostgreSQL database credentials"
  kms_key_id  = aws_kms_key.secrets.arn
}

resource "aws_secretsmanager_secret_rotation" "database" {
  secret_id           = aws_secretsmanager_secret.database.id
  rotation_lambda_arn = aws_lambda_function.rotation.arn

  rotation_rules {
    automatically_after_days = 30
    schedule_expression      = "rate(30 days)"
  }
}
```

### 2.2 Secret Naming Convention

```
festival-{environment}/{secret-type}

Examples:
- festival-prod/database
- festival-prod/jwt
- festival-prod/redis
- festival-prod/stripe
- festival-prod/api-keys
- festival-staging/database
```

### 2.3 Secret Structure

Each secret contains structured JSON with both current and previous credentials:

```json
{
  "current": {
    "value": "current-secret-value",
    "created_at": "2026-01-02T10:00:00Z"
  },
  "previous": {
    "value": "previous-secret-value",
    "created_at": "2025-12-02T10:00:00Z"
  },
  "rotation_timestamp": "2026-01-02T10:00:00Z",
  "next_rotation": "2026-02-01T10:00:00Z"
}
```

### 2.4 Accessing Secrets in Application

**NestJS Application Integration:**

```typescript
// apps/api/src/config/secrets.service.ts
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

@Injectable()
export class SecretsService implements OnModuleInit {
  private client: SecretsManagerClient;
  private cache: Map<string, { value: any; expires: number }> = new Map();
  private readonly CACHE_TTL = 300_000; // 5 minutes

  async onModuleInit() {
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'eu-west-1',
    });
  }

  async getSecret(secretId: string): Promise<any> {
    // Check cache first
    const cached = this.cache.get(secretId);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await this.client.send(command);
    const secret = JSON.parse(response.SecretString);

    // Update cache
    this.cache.set(secretId, {
      value: secret,
      expires: Date.now() + this.CACHE_TTL,
    });

    return secret;
  }

  // Support both current and previous secrets during rotation
  async validateWithRotation(
    secretId: string,
    validator: (secret: any) => Promise<boolean>,
  ): Promise<boolean> {
    const secret = await this.getSecret(secretId);

    // Try current first
    if (await validator(secret.current)) {
      return true;
    }

    // Fallback to previous during rotation window
    if (secret.previous && (await validator(secret.previous))) {
      return true;
    }

    return false;
  }
}
```

---

## 3. Database Credential Rotation

### 3.1 PostgreSQL Rotation Strategy

The database rotation uses a **dual-user** strategy to ensure zero downtime:

1. Two database users exist: `festival_app` and `festival_app_clone`
2. Application uses one user at a time
3. During rotation, the inactive user's password is changed
4. Application switches to the updated user

```
                    Active User: festival_app
                           |
        +------------------+------------------+
        |                                     |
   [Rotation Start]                    [Normal Operations]
        |                                     |
   Update festival_app_clone password        |
        |                                     |
   Update secret with new credentials        |
        |                                     |
   Application reloads secrets               |
        |                                     |
   Switch to festival_app_clone    <---------+
        |
   [Rotation Complete]
```

### 3.2 Database User Setup

```sql
-- Initial setup (run once)
CREATE USER festival_app WITH PASSWORD 'initial_password_1';
CREATE USER festival_app_clone WITH PASSWORD 'initial_password_2';

-- Grant identical permissions
GRANT festival_app_role TO festival_app;
GRANT festival_app_role TO festival_app_clone;

-- Application role with minimal required permissions
CREATE ROLE festival_app_role;
GRANT CONNECT ON DATABASE festival TO festival_app_role;
GRANT USAGE ON SCHEMA public TO festival_app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO festival_app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO festival_app_role;
```

### 3.3 Connection Pool Configuration

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool settings for rotation support
  connectionLimit = 20
  poolTimeout     = 20
}
```

**Environment Configuration:**

```bash
# Connection with retry and reconnect support
DATABASE_URL="postgresql://festival_app:${PASSWORD}@${HOST}:5432/festival?sslmode=require&connect_timeout=10&pool_timeout=20"
```

### 3.4 Rotation Lambda Handler (Database)

```python
# infra/security/secrets/rotation/handlers/database_rotation.py

import json
import boto3
import psycopg2
from botocore.exceptions import ClientError

secrets_manager = boto3.client('secretsmanager')

def rotate_database_secret(secret_arn: str, token: str, step: str) -> None:
    """
    Rotate PostgreSQL database credentials.

    Steps:
    1. createSecret - Generate new password
    2. setSecret - Update database with new password
    3. testSecret - Verify new credentials work
    4. finishSecret - Mark rotation complete
    """

    if step == "createSecret":
        create_secret(secret_arn, token)
    elif step == "setSecret":
        set_secret(secret_arn, token)
    elif step == "testSecret":
        test_secret(secret_arn, token)
    elif step == "finishSecret":
        finish_secret(secret_arn, token)

def create_secret(secret_arn: str, token: str) -> None:
    """Generate new password and store as pending."""

    # Get current secret
    current = secrets_manager.get_secret_value(
        SecretId=secret_arn,
        VersionStage='AWSCURRENT'
    )
    current_secret = json.loads(current['SecretString'])

    # Generate new password
    new_password = secrets_manager.get_random_password(
        PasswordLength=32,
        ExcludeCharacters='/@"\'\\',
        RequireEachIncludedType=True
    )['RandomPassword']

    # Determine which user to rotate
    current_user = current_secret.get('username', 'festival_app')
    new_user = 'festival_app_clone' if current_user == 'festival_app' else 'festival_app'

    # Create new secret version
    new_secret = {
        **current_secret,
        'username': new_user,
        'password': new_password,
        'previous_username': current_user,
        'previous_password': current_secret['password'],
    }

    secrets_manager.put_secret_value(
        SecretId=secret_arn,
        ClientRequestToken=token,
        SecretString=json.dumps(new_secret),
        VersionStages=['AWSPENDING']
    )

def set_secret(secret_arn: str, token: str) -> None:
    """Update database with new credentials."""

    # Get pending secret
    pending = secrets_manager.get_secret_value(
        SecretId=secret_arn,
        VersionId=token,
        VersionStage='AWSPENDING'
    )
    pending_secret = json.loads(pending['SecretString'])

    # Get current secret for admin connection
    current = secrets_manager.get_secret_value(
        SecretId=secret_arn,
        VersionStage='AWSCURRENT'
    )
    current_secret = json.loads(current['SecretString'])

    # Connect with current credentials and update password
    conn = psycopg2.connect(
        host=current_secret['host'],
        port=current_secret['port'],
        dbname=current_secret['dbname'],
        user=current_secret['username'],
        password=current_secret['password'],
        sslmode='require'
    )

    try:
        with conn.cursor() as cur:
            # Use parameterized query for safety
            cur.execute(
                f"ALTER USER {pending_secret['username']} WITH PASSWORD %s",
                (pending_secret['password'],)
            )
        conn.commit()
    finally:
        conn.close()

def test_secret(secret_arn: str, token: str) -> None:
    """Verify new credentials work."""

    pending = secrets_manager.get_secret_value(
        SecretId=secret_arn,
        VersionId=token,
        VersionStage='AWSPENDING'
    )
    pending_secret = json.loads(pending['SecretString'])

    # Test connection with new credentials
    conn = psycopg2.connect(
        host=pending_secret['host'],
        port=pending_secret['port'],
        dbname=pending_secret['dbname'],
        user=pending_secret['username'],
        password=pending_secret['password'],
        sslmode='require',
        connect_timeout=5
    )
    conn.close()

def finish_secret(secret_arn: str, token: str) -> None:
    """Complete rotation by updating version stages."""

    metadata = secrets_manager.describe_secret(SecretId=secret_arn)

    for version_id, stages in metadata['VersionIdsToStages'].items():
        if 'AWSCURRENT' in stages and version_id != token:
            # Move current to previous
            secrets_manager.update_secret_version_stage(
                SecretId=secret_arn,
                VersionStage='AWSCURRENT',
                RemoveFromVersionId=version_id,
                MoveToVersionId=token
            )
            break
```

---

## 4. API Key Rotation Policies

### 4.1 Internal API Key Rotation

Internal service-to-service API keys are rotated automatically:

| API Key Type | Rotation Frequency | Validation Method |
|--------------|-------------------|-------------------|
| Service Auth | 180 days (prod) / 60 days (staging) | HMAC signature |
| Webhook Signing | 90 days | SHA-256 hash |
| Encryption Keys | 365 days | Key derivation |

### 4.2 API Key Structure

```json
{
  "internal_api_key": "festival_sk_live_abc123...",
  "internal_api_key_hash": "sha256:...",
  "previous_internal_api_key": "festival_sk_live_xyz789...",
  "previous_internal_api_key_hash": "sha256:...",
  "key_version": 2,
  "created_at": "2026-01-02T00:00:00Z",
  "expires_at": "2026-07-01T00:00:00Z"
}
```

### 4.3 API Key Validation Service

```typescript
// apps/api/src/common/guards/api-key.guard.ts

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private secretsService: SecretsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    const secrets = await this.secretsService.getSecret('festival-prod/api-keys');

    // Check current key first
    if (this.validateKey(apiKey, secrets.internal_api_key_hash)) {
      return true;
    }

    // Check previous key during rotation window (7 days)
    if (
      secrets.previous_internal_api_key_hash &&
      this.isWithinRotationWindow(secrets.rotation_timestamp) &&
      this.validateKey(apiKey, secrets.previous_internal_api_key_hash)
    ) {
      // Log usage of old key for monitoring
      this.logger.warn('API request using previous API key during rotation');
      return true;
    }

    throw new UnauthorizedException('Invalid API key');
  }

  private validateKey(key: string, hash: string): boolean {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(keyHash), Buffer.from(hash));
  }

  private isWithinRotationWindow(timestamp: string): boolean {
    const rotationDate = new Date(timestamp);
    const windowEnd = new Date(rotationDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    return new Date() < windowEnd;
  }
}
```

---

## 5. JWT Secret Rotation

### 5.1 Zero-Downtime JWT Rotation

JWT rotation is critical as it affects all authenticated users. The strategy:

1. **Phase 1:** Generate new JWT secret, add to validation list
2. **Phase 2:** Start signing new tokens with new secret
3. **Phase 3:** Wait for token expiry window (access: 15min, refresh: 7 days)
4. **Phase 4:** Remove old secret from validation list

```
Timeline:
|-------- Day 0 --------|-------- Day 1-7 --------|-------- Day 8+ --------|
     New secret added         Both secrets valid        Old secret removed
     Signing: NEW             Signing: NEW              Signing: NEW
     Validating: OLD+NEW      Validating: OLD+NEW       Validating: NEW
```

### 5.2 JWT Secret Structure

```json
{
  "secret": "current-jwt-secret-64-chars-minimum...",
  "refresh_secret": "current-refresh-secret-64-chars...",
  "previous_secret": "old-jwt-secret-for-validation...",
  "previous_refresh_secret": "old-refresh-secret...",
  "algorithm": "HS256",
  "access_token_expiry": "15m",
  "refresh_token_expiry": "7d",
  "rotation_timestamp": "2026-01-02T00:00:00Z",
  "rotation_complete_at": "2026-01-09T00:00:00Z"
}
```

### 5.3 Multi-Secret JWT Validation

```typescript
// apps/api/src/modules/auth/strategies/jwt.strategy.ts

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private secretsService: SecretsService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: async (request, rawJwtToken, done) => {
        try {
          const secrets = await this.secretsService.getSecret('festival-prod/jwt');

          // Return array of valid secrets for multi-key validation
          const validSecrets = [secrets.secret];

          // Include previous secret during rotation window
          if (secrets.previous_secret && this.isInRotationWindow(secrets)) {
            validSecrets.push(secrets.previous_secret);
          }

          // Try each secret
          for (const secret of validSecrets) {
            try {
              jwt.verify(rawJwtToken, secret, { algorithms: ['HS256'] });
              done(null, secret);
              return;
            } catch {
              continue;
            }
          }

          done(new Error('Invalid token'), null);
        } catch (error) {
          done(error, null);
        }
      },
    });
  }

  private isInRotationWindow(secrets: any): boolean {
    if (!secrets.rotation_complete_at) return false;
    return new Date() < new Date(secrets.rotation_complete_at);
  }
}
```

### 5.4 JWT Rotation Lambda

```python
# infra/security/secrets/rotation/handlers/jwt_rotation.py

import json
import boto3
import secrets as py_secrets
from datetime import datetime, timedelta

secrets_manager = boto3.client('secretsmanager')

def rotate_jwt_secret(secret_arn: str, token: str, step: str) -> None:
    """Rotate JWT signing secrets with graceful transition."""

    if step == "createSecret":
        # Generate new secrets
        current = get_current_secret(secret_arn)

        new_secret = {
            'secret': py_secrets.token_urlsafe(64),
            'refresh_secret': py_secrets.token_urlsafe(64),
            'previous_secret': current.get('secret', ''),
            'previous_refresh_secret': current.get('refresh_secret', ''),
            'algorithm': 'HS256',
            'access_token_expiry': '15m',
            'refresh_token_expiry': '7d',
            'rotation_timestamp': datetime.utcnow().isoformat() + 'Z',
            'rotation_complete_at': (datetime.utcnow() + timedelta(days=7)).isoformat() + 'Z'
        }

        secrets_manager.put_secret_value(
            SecretId=secret_arn,
            ClientRequestToken=token,
            SecretString=json.dumps(new_secret),
            VersionStages=['AWSPENDING']
        )

    elif step == "setSecret":
        # No external system to update for JWT
        pass

    elif step == "testSecret":
        # Verify new secret can sign and verify tokens
        import jwt as pyjwt

        pending = get_pending_secret(secret_arn, token)

        # Test access token
        test_payload = {'sub': 'test', 'exp': datetime.utcnow() + timedelta(minutes=15)}
        token = pyjwt.encode(test_payload, pending['secret'], algorithm='HS256')
        decoded = pyjwt.decode(token, pending['secret'], algorithms=['HS256'])

        if decoded['sub'] != 'test':
            raise ValueError("JWT verification failed")

    elif step == "finishSecret":
        finish_rotation(secret_arn, token)
```

---

## 6. Third-Party API Key Management

### 6.1 Manual Rotation Required

These secrets require manual rotation through provider dashboards:

| Provider | Secret Type | Dashboard URL | Rotation Procedure |
|----------|-------------|---------------|-------------------|
| Stripe | API Keys | https://dashboard.stripe.com/apikeys | See 6.2 |
| Firebase | Server Key | https://console.firebase.google.com | See 6.3 |
| SendGrid | API Key | https://app.sendgrid.com/settings/api_keys | See 6.4 |
| Google OAuth | Client Secret | https://console.cloud.google.com | See 6.5 |
| Sentry | DSN | https://sentry.io/settings | See 6.6 |

### 6.2 Stripe API Key Rotation

**Frequency:** On compromise only, or annually for compliance

**Procedure:**

```bash
#!/bin/bash
# scripts/rotate-stripe-key.sh

set -euo pipefail

ENVIRONMENT=${1:-staging}
SECRET_NAME="festival-${ENVIRONMENT}/stripe"

echo "=== Stripe API Key Rotation ==="
echo "Environment: $ENVIRONMENT"
echo ""

# Step 1: Generate new key in Stripe Dashboard
echo "Step 1: Create new API key in Stripe Dashboard"
echo "   1. Go to: https://dashboard.stripe.com/apikeys"
echo "   2. Click 'Create restricted key' or 'Create secret key'"
echo "   3. Copy the new key (starts with sk_live_ or sk_test_)"
echo ""
read -p "Enter new Stripe Secret Key: " NEW_STRIPE_KEY

# Step 2: Validate key format
if [[ ! "$NEW_STRIPE_KEY" =~ ^sk_(live|test)_ ]]; then
    echo "ERROR: Invalid Stripe key format"
    exit 1
fi

# Step 3: Get current secret
CURRENT_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --query 'SecretString' \
    --output text)

# Step 4: Update secret with new key
UPDATED_SECRET=$(echo "$CURRENT_SECRET" | jq --arg key "$NEW_STRIPE_KEY" \
    '.previous_secret_key = .secret_key | .secret_key = $key | .rotation_timestamp = (now | todate)')

aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$UPDATED_SECRET"

echo "Secret updated in AWS Secrets Manager"

# Step 5: Rolling restart of application
echo ""
echo "Step 5: Restart application to pick up new key"
if [ "$ENVIRONMENT" == "prod" ]; then
    kubectl rollout restart deployment/api -n production
else
    kubectl rollout restart deployment/api -n staging
fi

# Step 6: Verify
echo ""
echo "Step 6: Verify new key works"
echo "   - Check application logs for Stripe errors"
echo "   - Test a payment flow in $ENVIRONMENT"
echo ""

# Step 7: Delete old key
echo "Step 7: After 24 hours, delete old key in Stripe Dashboard"
echo "   Old key has been saved as 'previous_secret_key' in Secrets Manager"
echo ""

echo "=== Rotation Complete ==="
```

### 6.3 Firebase Server Key Rotation

```bash
#!/bin/bash
# scripts/rotate-firebase-key.sh

ENVIRONMENT=${1:-staging}
SECRET_NAME="festival-${ENVIRONMENT}/api-keys"

echo "=== Firebase Server Key Rotation ==="
echo ""
echo "Step 1: Generate new server key in Firebase Console"
echo "   1. Go to: https://console.firebase.google.com"
echo "   2. Select project: festival-${ENVIRONMENT}"
echo "   3. Settings > Cloud Messaging > Server key"
echo "   4. Click 'Add server key'"
echo ""
read -p "Enter new Firebase Server Key: " NEW_FIREBASE_KEY

# Update in Secrets Manager
CURRENT=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --query 'SecretString' \
    --output text)

UPDATED=$(echo "$CURRENT" | jq --arg key "$NEW_FIREBASE_KEY" \
    '.previous_firebase_server_key = .firebase_server_key | .firebase_server_key = $key')

aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$UPDATED"

echo "Firebase key updated. Restart application to apply."
```

### 6.4 SendGrid API Key Rotation

```bash
#!/bin/bash
# scripts/rotate-sendgrid-key.sh

ENVIRONMENT=${1:-staging}
SECRET_NAME="festival-${ENVIRONMENT}/api-keys"

echo "=== SendGrid API Key Rotation ==="
echo ""
echo "Create new key at: https://app.sendgrid.com/settings/api_keys"
echo "Required permissions: Mail Send, Template Engine"
echo ""
read -p "Enter new SendGrid API Key (SG.*): " NEW_KEY

if [[ ! "$NEW_KEY" =~ ^SG\. ]]; then
    echo "ERROR: Invalid SendGrid key format"
    exit 1
fi

CURRENT=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --query 'SecretString' \
    --output text)

UPDATED=$(echo "$CURRENT" | jq --arg key "$NEW_KEY" \
    '.previous_sendgrid_api_key = .sendgrid_api_key | .sendgrid_api_key = $key')

aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$UPDATED"

# Test email send
echo "Testing email configuration..."
curl -s --request POST \
    --url https://api.sendgrid.com/v3/mail/send \
    --header "Authorization: Bearer $NEW_KEY" \
    --header "Content-Type: application/json" \
    --data '{"personalizations":[{"to":[{"email":"test@festival-platform.com"}]}],"from":{"email":"noreply@festival-platform.com"},"subject":"Rotation Test","content":[{"type":"text/plain","value":"Key rotation test"}]}' \
    && echo "Email test successful" \
    || echo "Email test failed - check key permissions"
```

### 6.5 OAuth Client Secret Rotation

```bash
#!/bin/bash
# scripts/rotate-oauth-secret.sh

PROVIDER=${1:-google}  # google, facebook, apple
ENVIRONMENT=${2:-staging}

case $PROVIDER in
    google)
        echo "Rotate at: https://console.cloud.google.com/apis/credentials"
        SECRET_KEY="google_client_secret"
        ;;
    facebook)
        echo "Rotate at: https://developers.facebook.com/apps"
        SECRET_KEY="facebook_app_secret"
        ;;
    apple)
        echo "Rotate at: https://developer.apple.com/account/resources/authkeys"
        SECRET_KEY="apple_private_key"
        ;;
esac

read -p "Enter new $PROVIDER client secret: " NEW_SECRET

SECRET_NAME="festival-${ENVIRONMENT}/api-keys"
CURRENT=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --query 'SecretString' \
    --output text)

UPDATED=$(echo "$CURRENT" | jq --arg key "$NEW_SECRET" --arg field "$SECRET_KEY" \
    '.["previous_" + $field] = .[$field] | .[$field] = $key')

aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$UPDATED"

echo "OAuth secret updated for $PROVIDER"
```

### 6.6 Sentry DSN Update

```bash
#!/bin/bash
# scripts/update-sentry-dsn.sh

# Note: Sentry DSN rarely needs rotation unless compromised

ENVIRONMENT=${1:-staging}
SECRET_NAME="festival-${ENVIRONMENT}/api-keys"

echo "Get new DSN from: https://sentry.io/settings/projects/festival-${ENVIRONMENT}/keys/"
read -p "Enter new Sentry DSN: " NEW_DSN

CURRENT=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --query 'SecretString' \
    --output text)

UPDATED=$(echo "$CURRENT" | jq --arg dsn "$NEW_DSN" '.sentry_dsn = $dsn')

aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$UPDATED"
```

---

## 7. Rotation Schedules

### 7.1 Production Schedule

| Secret Type | Frequency | Day of Week | Time (UTC) | Notification Lead Time |
|-------------|-----------|-------------|------------|------------------------|
| Database | 30 days | Sunday | 02:00 | 7 days |
| JWT | 90 days | Sunday | 03:00 | 14 days |
| Redis | 60 days | Sunday | 04:00 | 7 days |
| Internal API Keys | 180 days | Sunday | 05:00 | 30 days |
| KMS Keys | 365 days | Automatic | N/A | N/A |

### 7.2 Staging Schedule

| Secret Type | Frequency | Purpose |
|-------------|-----------|---------|
| Database | 7 days | Test rotation process |
| JWT | 30 days | Validate token handling |
| Redis | 14 days | Test cache reconnection |
| Internal API Keys | 60 days | Test API key validation |

### 7.3 Rotation Calendar (2026)

```
January:
  - 02: JWT rotation (quarterly)
  - 05: Database rotation (monthly)
  - 19: Redis rotation (bi-monthly)

February:
  - 04: Database rotation
  - 16: Redis rotation

March:
  - 03: Database rotation
  - 16: Redis rotation

April:
  - 02: JWT rotation (quarterly)
  - 06: Database rotation
  - 13: Redis rotation
  - 30: Internal API Keys rotation (semi-annual)

[... continues for full year ...]
```

### 7.4 Terraform Rotation Configuration

```hcl
# infra/security/secrets/rotation_schedules.tf

locals {
  rotation_schedules = {
    database = {
      prod    = 30
      staging = 7
      dev     = 0  # No auto-rotation
    }
    jwt = {
      prod    = 90
      staging = 30
      dev     = 0
    }
    redis = {
      prod    = 60
      staging = 14
      dev     = 0
    }
    api_keys = {
      prod    = 180
      staging = 60
      dev     = 0
    }
  }
}

# Apply rotation schedule based on environment
resource "aws_secretsmanager_secret_rotation" "database" {
  count = local.rotation_schedules.database[var.environment] > 0 ? 1 : 0

  secret_id           = aws_secretsmanager_secret.database.id
  rotation_lambda_arn = aws_lambda_function.rotation.arn

  rotation_rules {
    automatically_after_days = local.rotation_schedules.database[var.environment]
  }
}
```

---

## 8. Emergency Rotation Procedures

### 8.1 Emergency Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P1 | Active exploitation | Immediate | Stolen production DB creds |
| P2 | Confirmed compromise | < 1 hour | API key exposed in logs |
| P3 | Potential exposure | < 4 hours | Key in public git commit |
| P4 | Precautionary | < 24 hours | Team member departure |

### 8.2 P1 Emergency: Active Exploitation

```bash
#!/bin/bash
# scripts/emergency-rotation-p1.sh
# Run immediately upon confirmed active exploitation

set -euo pipefail

ENVIRONMENT="prod"
INCIDENT_ID=$(date +%Y%m%d%H%M%S)

echo "=== P1 EMERGENCY ROTATION ==="
echo "Incident ID: $INCIDENT_ID"
echo "Started: $(date -u)"
echo ""

# 1. Immediate notification
aws sns publish \
    --topic-arn "arn:aws:sns:eu-west-1:ACCOUNT_ID:security-emergency" \
    --subject "[P1] Emergency Secret Rotation - $INCIDENT_ID" \
    --message "Emergency rotation initiated. Incident: $INCIDENT_ID"

# 2. Block compromised credentials at network level
echo "Enabling emergency WAF rules..."
aws wafv2 update-ip-set \
    --name emergency-block-list \
    --scope REGIONAL \
    --id "${WAF_IP_SET_ID}" \
    --addresses "${ATTACKER_IPS[@]}" \
    --lock-token "$(aws wafv2 get-ip-set --name emergency-block-list --scope REGIONAL --id ${WAF_IP_SET_ID} --query 'LockToken' --output text)"

# 3. Rotate ALL secrets simultaneously
echo "Rotating all secrets..."

# Database
aws secretsmanager rotate-secret \
    --secret-id "festival-prod/database" \
    --rotation-lambda-arn "arn:aws:lambda:eu-west-1:ACCOUNT_ID:function:festival-prod-secrets-rotation"

# JWT (invalidates all sessions)
aws secretsmanager rotate-secret \
    --secret-id "festival-prod/jwt" \
    --rotation-lambda-arn "arn:aws:lambda:eu-west-1:ACCOUNT_ID:function:festival-prod-secrets-rotation"

# Redis
aws secretsmanager rotate-secret \
    --secret-id "festival-prod/redis" \
    --rotation-lambda-arn "arn:aws:lambda:eu-west-1:ACCOUNT_ID:function:festival-prod-secrets-rotation"

# API Keys
aws secretsmanager rotate-secret \
    --secret-id "festival-prod/api-keys" \
    --rotation-lambda-arn "arn:aws:lambda:eu-west-1:ACCOUNT_ID:function:festival-prod-secrets-rotation"

# 4. Force restart all services
echo "Restarting all services..."
kubectl rollout restart deployment --all -n production

# 5. Invalidate all sessions
echo "Invalidating all user sessions..."
kubectl exec -n production deployment/api -- node -e "
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);
redis.flushdb().then(() => console.log('Sessions cleared'));
"

# 6. Enable enhanced logging
echo "Enabling enhanced security logging..."
aws logs put-retention-policy \
    --log-group-name "/aws/lambda/festival-prod-secrets-rotation" \
    --retention-in-days 365

# 7. Generate incident report
cat > "/tmp/incident-${INCIDENT_ID}.md" << EOF
# Security Incident Report

## Incident ID: $INCIDENT_ID
## Severity: P1 - Active Exploitation
## Started: $(date -u)

### Actions Taken:
1. Emergency notification sent
2. WAF blocking rules enabled
3. All production secrets rotated
4. All services restarted
5. All user sessions invalidated
6. Enhanced logging enabled

### Secrets Rotated:
- Database credentials
- JWT signing secrets
- Redis credentials
- Internal API keys

### Next Steps:
- [ ] Root cause analysis
- [ ] Forensic investigation
- [ ] User notification (if required)
- [ ] Regulatory notification (if required)

EOF

echo ""
echo "=== ROTATION COMPLETE ==="
echo "Incident report: /tmp/incident-${INCIDENT_ID}.md"
echo ""
echo "REQUIRED FOLLOW-UP:"
echo "1. Conduct root cause analysis"
echo "2. Review access logs"
echo "3. Notify stakeholders"
echo "4. Update incident documentation"
```

### 8.3 P2 Emergency: Confirmed Compromise

```bash
#!/bin/bash
# scripts/emergency-rotation-p2.sh
# Use when secret exposure is confirmed but no active exploitation

SECRET_TYPE=${1:?Usage: $0 <secret_type> [environment]}
ENVIRONMENT=${2:-prod}

echo "=== P2 Emergency Rotation ==="
echo "Secret: $SECRET_TYPE"
echo "Environment: $ENVIRONMENT"

# Rotate specific secret
case $SECRET_TYPE in
    database)
        aws secretsmanager rotate-secret --secret-id "festival-${ENVIRONMENT}/database"
        ;;
    jwt)
        aws secretsmanager rotate-secret --secret-id "festival-${ENVIRONMENT}/jwt"
        ;;
    redis)
        aws secretsmanager rotate-secret --secret-id "festival-${ENVIRONMENT}/redis"
        ;;
    api-keys)
        aws secretsmanager rotate-secret --secret-id "festival-${ENVIRONMENT}/api-keys"
        ;;
    stripe)
        echo "Stripe requires manual rotation. See section 6.2"
        exit 1
        ;;
    *)
        echo "Unknown secret type: $SECRET_TYPE"
        exit 1
        ;;
esac

# Wait for rotation to complete
echo "Waiting for rotation to complete..."
sleep 60

# Verify rotation
ROTATION_STATUS=$(aws secretsmanager describe-secret \
    --secret-id "festival-${ENVIRONMENT}/${SECRET_TYPE}" \
    --query 'RotationEnabled' \
    --output text)

if [ "$ROTATION_STATUS" == "true" ]; then
    echo "Rotation completed successfully"

    # Restart affected services
    kubectl rollout restart deployment/api -n ${ENVIRONMENT}
else
    echo "ERROR: Rotation may have failed. Check Lambda logs."
    exit 1
fi
```

### 8.4 Emergency Rotation Checklist

```markdown
## Emergency Rotation Checklist

### Immediate (0-15 minutes)
- [ ] Confirm incident severity (P1-P4)
- [ ] Notify security team lead
- [ ] Open incident channel (#security-incident-YYYYMMDD)
- [ ] Identify compromised secrets

### Containment (15-60 minutes)
- [ ] Block known attacker IPs (if applicable)
- [ ] Initiate secret rotation
- [ ] Monitor rotation Lambda logs
- [ ] Verify rotation completion

### Recovery (1-4 hours)
- [ ] Restart affected services
- [ ] Verify service health
- [ ] Test authentication flows
- [ ] Test payment flows (if Stripe affected)
- [ ] Monitor error rates

### Documentation (4-24 hours)
- [ ] Create incident report
- [ ] Document timeline
- [ ] Identify root cause
- [ ] Propose remediation steps
- [ ] Schedule post-mortem

### Follow-up (1-7 days)
- [ ] Implement remediation
- [ ] Update rotation procedures
- [ ] Security awareness communication
- [ ] Regulatory notifications (if required)
```

---

## 9. Automation Scripts & Lambda Functions

### 9.1 Main Rotation Lambda Handler

```python
# infra/security/secrets/rotation/handler.py

"""
Festival Platform - Secrets Rotation Lambda
Handles automatic rotation for all secret types
"""

import json
import logging
import boto3
from typing import Dict, Any
from handlers.database_rotation import rotate_database_secret
from handlers.jwt_rotation import rotate_jwt_secret
from handlers.redis_rotation import rotate_redis_secret
from handlers.api_key_rotation import rotate_api_key_secret

logger = logging.getLogger()
logger.setLevel(logging.INFO)

secrets_manager = boto3.client('secretsmanager')
sns = boto3.client('sns')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for secret rotation.

    Handles two types of events:
    1. Secrets Manager rotation events (automatic)
    2. Health check events (scheduled)
    """

    logger.info(f"Received event: {json.dumps(event)}")

    # Health check mode
    if event.get('action') == 'health_check':
        return health_check(event.get('secrets', []))

    # Rotation mode
    secret_arn = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']

    # Determine secret type from ARN
    secret_name = secret_arn.split(':')[-1]

    try:
        if '/database' in secret_name:
            rotate_database_secret(secret_arn, token, step)
        elif '/jwt' in secret_name:
            rotate_jwt_secret(secret_arn, token, step)
        elif '/redis' in secret_name:
            rotate_redis_secret(secret_arn, token, step)
        elif '/api-keys' in secret_name:
            rotate_api_key_secret(secret_arn, token, step)
        else:
            raise ValueError(f"Unknown secret type: {secret_name}")

        # Notify on successful completion
        if step == 'finishSecret':
            notify_rotation_complete(secret_name)

        return {'statusCode': 200, 'body': f'Step {step} completed'}

    except Exception as e:
        logger.error(f"Rotation failed: {str(e)}")
        notify_rotation_failure(secret_name, str(e))
        raise

def health_check(secret_arns: list) -> Dict[str, Any]:
    """Check rotation health for all secrets."""

    results = []

    for arn in secret_arns:
        try:
            metadata = secrets_manager.describe_secret(SecretId=arn)

            result = {
                'secret': arn,
                'rotation_enabled': metadata.get('RotationEnabled', False),
                'last_rotated': str(metadata.get('LastRotatedDate', 'Never')),
                'next_rotation': str(metadata.get('NextRotationDate', 'N/A')),
                'status': 'healthy'
            }

            # Check for rotation issues
            if metadata.get('RotationEnabled'):
                versions = metadata.get('VersionIdsToStages', {})
                if any('AWSPENDING' in stages for stages in versions.values()):
                    result['status'] = 'rotation_in_progress'

        except Exception as e:
            result = {
                'secret': arn,
                'status': 'error',
                'error': str(e)
            }

        results.append(result)

    # Send health report
    sns.publish(
        TopicArn=os.environ['SNS_TOPIC_ARN'],
        Subject='Daily Secrets Rotation Health Check',
        Message=json.dumps(results, indent=2)
    )

    return {'statusCode': 200, 'body': json.dumps(results)}

def notify_rotation_complete(secret_name: str) -> None:
    """Send notification on successful rotation."""

    message = {
        'event': 'rotation_complete',
        'secret': secret_name,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'environment': os.environ.get('ENVIRONMENT', 'unknown')
    }

    sns.publish(
        TopicArn=os.environ['SNS_TOPIC_ARN'],
        Subject=f'Secret Rotation Complete: {secret_name}',
        Message=json.dumps(message)
    )

    # Send to Slack if configured
    slack_webhook = os.environ.get('SLACK_WEBHOOK_URL')
    if slack_webhook:
        requests.post(slack_webhook, json={
            'text': f':white_check_mark: Secret rotation completed: `{secret_name}`'
        })

def notify_rotation_failure(secret_name: str, error: str) -> None:
    """Send notification on rotation failure."""

    message = {
        'event': 'rotation_failed',
        'secret': secret_name,
        'error': error,
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }

    sns.publish(
        TopicArn=os.environ['SNS_TOPIC_ARN'],
        Subject=f'ALERT: Secret Rotation Failed: {secret_name}',
        Message=json.dumps(message)
    )

    # Send to Slack with @channel mention
    slack_webhook = os.environ.get('SLACK_WEBHOOK_URL')
    if slack_webhook:
        requests.post(slack_webhook, json={
            'text': f':rotating_light: <!channel> Secret rotation FAILED: `{secret_name}`\nError: {error}'
        })
```

### 9.2 Redis Rotation Handler

```python
# infra/security/secrets/rotation/handlers/redis_rotation.py

import json
import boto3
import redis

secrets_manager = boto3.client('secretsmanager')

def rotate_redis_secret(secret_arn: str, token: str, step: str) -> None:
    """Rotate Redis AUTH password."""

    if step == "createSecret":
        current = get_current_secret(secret_arn)

        new_password = secrets_manager.get_random_password(
            PasswordLength=32,
            ExcludeCharacters='/@"\'\\',
        )['RandomPassword']

        new_secret = {
            **current,
            'password': new_password,
            'previous_password': current.get('password', ''),
            'rotation_timestamp': datetime.utcnow().isoformat() + 'Z'
        }

        secrets_manager.put_secret_value(
            SecretId=secret_arn,
            ClientRequestToken=token,
            SecretString=json.dumps(new_secret),
            VersionStages=['AWSPENDING']
        )

    elif step == "setSecret":
        pending = get_pending_secret(secret_arn, token)

        # Connect with current password
        r = redis.Redis(
            host=pending['host'],
            port=pending['port'],
            password=pending['previous_password'],
            ssl=True
        )

        # Set new password using CONFIG SET
        r.config_set('requirepass', pending['password'])

        # Also update ACL if using Redis 6+
        try:
            r.acl_setuser('default', passwords=['+' + pending['password']])
        except redis.ResponseError:
            pass  # Older Redis version

    elif step == "testSecret":
        pending = get_pending_secret(secret_arn, token)

        r = redis.Redis(
            host=pending['host'],
            port=pending['port'],
            password=pending['password'],
            ssl=True,
            socket_connect_timeout=5
        )

        # Test connection
        r.ping()

    elif step == "finishSecret":
        finish_rotation(secret_arn, token)
```

### 9.3 API Key Rotation Handler

```python
# infra/security/secrets/rotation/handlers/api_key_rotation.py

import json
import hashlib
import secrets as py_secrets
import boto3
from datetime import datetime

secrets_manager = boto3.client('secretsmanager')

def rotate_api_key_secret(secret_arn: str, token: str, step: str) -> None:
    """Rotate internal API keys."""

    if step == "createSecret":
        current = get_current_secret(secret_arn)

        # Generate new API key
        new_api_key = 'festival_sk_' + py_secrets.token_urlsafe(32)
        new_api_key_hash = hashlib.sha256(new_api_key.encode()).hexdigest()

        new_secret = {
            **current,
            'internal_api_key': new_api_key,
            'internal_api_key_hash': new_api_key_hash,
            'previous_internal_api_key': current.get('internal_api_key', ''),
            'previous_internal_api_key_hash': current.get('internal_api_key_hash', ''),
            'key_version': current.get('key_version', 0) + 1,
            'rotation_timestamp': datetime.utcnow().isoformat() + 'Z'
        }

        secrets_manager.put_secret_value(
            SecretId=secret_arn,
            ClientRequestToken=token,
            SecretString=json.dumps(new_secret),
            VersionStages=['AWSPENDING']
        )

    elif step == "setSecret":
        # No external system to update for internal API keys
        pass

    elif step == "testSecret":
        pending = get_pending_secret(secret_arn, token)

        # Verify hash calculation
        calculated_hash = hashlib.sha256(
            pending['internal_api_key'].encode()
        ).hexdigest()

        if calculated_hash != pending['internal_api_key_hash']:
            raise ValueError("API key hash mismatch")

        # Verify key format
        if not pending['internal_api_key'].startswith('festival_sk_'):
            raise ValueError("Invalid API key format")

    elif step == "finishSecret":
        finish_rotation(secret_arn, token)
```

### 9.4 Manual Rotation Script

```bash
#!/bin/bash
# scripts/manual-rotate.sh
# Trigger manual rotation for any secret

set -euo pipefail

SECRET_TYPE=${1:?Usage: $0 <database|jwt|redis|api-keys> [environment]}
ENVIRONMENT=${2:-prod}

SECRET_ID="festival-${ENVIRONMENT}/${SECRET_TYPE}"

echo "=== Manual Secret Rotation ==="
echo "Secret: $SECRET_ID"
echo "Started: $(date -u)"

# Check current status
echo ""
echo "Current secret status:"
aws secretsmanager describe-secret \
    --secret-id "$SECRET_ID" \
    --query '{LastRotated:LastRotatedDate,RotationEnabled:RotationEnabled,NextRotation:NextRotationDate}' \
    --output table

# Confirm rotation
echo ""
read -p "Proceed with rotation? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Rotation cancelled"
    exit 0
fi

# Trigger rotation
echo ""
echo "Initiating rotation..."
aws secretsmanager rotate-secret \
    --secret-id "$SECRET_ID" \
    --rotation-lambda-arn "arn:aws:lambda:eu-west-1:${AWS_ACCOUNT_ID}:function:festival-${ENVIRONMENT}-secrets-rotation"

# Monitor rotation
echo ""
echo "Monitoring rotation progress..."
for i in {1..12}; do
    sleep 10
    STATUS=$(aws secretsmanager describe-secret \
        --secret-id "$SECRET_ID" \
        --query 'VersionIdsToStages' \
        --output json)

    if echo "$STATUS" | grep -q "AWSPENDING"; then
        echo "Rotation in progress... ($((i*10)) seconds)"
    else
        echo "Rotation completed!"
        break
    fi
done

# Show new status
echo ""
echo "New secret status:"
aws secretsmanager describe-secret \
    --secret-id "$SECRET_ID" \
    --query '{LastRotated:LastRotatedDate,RotationEnabled:RotationEnabled,NextRotation:NextRotationDate}' \
    --output table

echo ""
echo "=== Rotation Complete ==="
echo "Remember to verify application health after rotation"
```

---

## 10. Monitoring & Alerting

### 10.1 CloudWatch Alarms

```hcl
# infra/security/secrets/monitoring.tf

# Rotation Error Alarm
resource "aws_cloudwatch_metric_alarm" "rotation_errors" {
  alarm_name          = "${local.name_prefix}-rotation-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Secret rotation Lambda errors detected"

  dimensions = {
    FunctionName = aws_lambda_function.rotation.function_name
  }

  alarm_actions = [aws_sns_topic.rotation_notifications.arn]
  ok_actions    = [aws_sns_topic.rotation_notifications.arn]
}

# Rotation Duration Alarm
resource "aws_cloudwatch_metric_alarm" "rotation_duration" {
  alarm_name          = "${local.name_prefix}-rotation-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Maximum"
  threshold           = 120000  # 2 minutes
  alarm_description   = "Secret rotation taking too long"

  dimensions = {
    FunctionName = aws_lambda_function.rotation.function_name
  }

  alarm_actions = [aws_sns_topic.rotation_notifications.arn]
}

# Pending Rotation Alarm (stuck rotation)
resource "aws_cloudwatch_metric_alarm" "pending_rotation" {
  alarm_name          = "${local.name_prefix}-pending-rotation"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 6  # 30 minutes
  metric_name         = "PendingRotation"
  namespace           = "Festival/Secrets"
  period              = 300
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Secret rotation stuck in pending state"

  alarm_actions = [aws_sns_topic.rotation_notifications.arn]
}
```

### 10.2 Custom CloudWatch Metrics

```python
# Lambda function to publish custom metrics

def publish_rotation_metrics(secret_name: str, success: bool, duration_ms: int):
    """Publish custom CloudWatch metrics for rotation monitoring."""

    cloudwatch = boto3.client('cloudwatch')

    cloudwatch.put_metric_data(
        Namespace='Festival/Secrets',
        MetricData=[
            {
                'MetricName': 'RotationAttempts',
                'Dimensions': [
                    {'Name': 'SecretName', 'Value': secret_name},
                    {'Name': 'Environment', 'Value': os.environ['ENVIRONMENT']}
                ],
                'Value': 1,
                'Unit': 'Count'
            },
            {
                'MetricName': 'RotationSuccess',
                'Dimensions': [
                    {'Name': 'SecretName', 'Value': secret_name}
                ],
                'Value': 1 if success else 0,
                'Unit': 'Count'
            },
            {
                'MetricName': 'RotationDuration',
                'Dimensions': [
                    {'Name': 'SecretName', 'Value': secret_name}
                ],
                'Value': duration_ms,
                'Unit': 'Milliseconds'
            }
        ]
    )
```

### 10.3 Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Secrets Rotation Monitoring",
    "panels": [
      {
        "title": "Rotation Success Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "sum(rate(festival_secrets_rotation_success[24h])) / sum(rate(festival_secrets_rotation_attempts[24h])) * 100"
          }
        ],
        "thresholds": {
          "mode": "absolute",
          "steps": [
            {"color": "red", "value": 0},
            {"color": "yellow", "value": 90},
            {"color": "green", "value": 99}
          ]
        }
      },
      {
        "title": "Rotation Timeline",
        "type": "table",
        "targets": [
          {
            "expr": "aws_secretsmanager_secret_last_rotated_date",
            "format": "table"
          }
        ],
        "columns": [
          {"title": "Secret", "field": "secret_name"},
          {"title": "Last Rotated", "field": "last_rotated"},
          {"title": "Next Rotation", "field": "next_rotation"},
          {"title": "Days Until", "field": "days_until"}
        ]
      },
      {
        "title": "Rotation Errors",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(increase(festival_secrets_rotation_errors[1h])) by (secret_name)"
          }
        ]
      }
    ]
  }
}
```

### 10.4 Prometheus Alerts

```yaml
# monitoring/prometheus/rules/secrets.yml

groups:
  - name: secrets_rotation
    rules:
      - alert: SecretRotationFailed
        expr: festival_secrets_rotation_success == 0 and festival_secrets_rotation_attempts > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Secret rotation failed for {{ $labels.secret_name }}"
          description: "The automatic rotation for secret {{ $labels.secret_name }} has failed."

      - alert: SecretRotationOverdue
        expr: (time() - festival_secrets_last_rotation_timestamp) > (festival_secrets_rotation_interval * 1.1)
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Secret rotation overdue for {{ $labels.secret_name }}"
          description: "Secret {{ $labels.secret_name }} has not been rotated within the expected interval."

      - alert: SecretRotationStuck
        expr: festival_secrets_rotation_pending == 1
        for: 30m
        labels:
          severity: critical
        annotations:
          summary: "Secret rotation stuck in pending state"
          description: "Secret {{ $labels.secret_name }} rotation has been pending for over 30 minutes."

      - alert: HighRotationLatency
        expr: festival_secrets_rotation_duration_seconds > 120
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High secret rotation latency"
          description: "Secret rotation for {{ $labels.secret_name }} is taking longer than expected."
```

---

## 11. Troubleshooting

### 11.1 Common Issues

#### Issue: Rotation Lambda Timeout

**Symptoms:**
- CloudWatch shows Lambda duration near 300 seconds
- Rotation stuck in AWSPENDING state

**Resolution:**
```bash
# Check Lambda logs
aws logs tail /aws/lambda/festival-prod-secrets-rotation --since 1h

# Increase Lambda timeout if needed
aws lambda update-function-configuration \
    --function-name festival-prod-secrets-rotation \
    --timeout 600

# Cancel stuck rotation
aws secretsmanager cancel-rotate-secret \
    --secret-id festival-prod/database
```

#### Issue: Database Connection Refused During Rotation

**Symptoms:**
- Lambda logs show "connection refused" errors
- Rotation fails at setSecret or testSecret step

**Resolution:**
```bash
# Check security group rules
aws ec2 describe-security-groups \
    --group-ids sg-xxxxxxxxx \
    --query 'SecurityGroups[0].IpPermissions'

# Verify Lambda is in correct VPC/subnet
aws lambda get-function-configuration \
    --function-name festival-prod-secrets-rotation \
    --query 'VpcConfig'

# Test connectivity from Lambda
aws lambda invoke \
    --function-name festival-prod-secrets-rotation \
    --payload '{"action":"test_connectivity","target":"database"}' \
    response.json
```

#### Issue: Application Not Picking Up New Secrets

**Symptoms:**
- Rotation completes successfully
- Application still using old credentials

**Resolution:**
```bash
# Force application secret cache refresh
kubectl exec -n production deployment/api -- \
    curl -X POST http://localhost:3000/admin/secrets/refresh

# Or restart pods
kubectl rollout restart deployment/api -n production

# Check secret caching settings
kubectl get deployment api -n production -o jsonpath='{.spec.template.spec.containers[0].env}' | jq
```

#### Issue: JWT Rotation Causing Auth Failures

**Symptoms:**
- Users logged out unexpectedly
- 401 errors spike after JWT rotation

**Resolution:**
```bash
# Verify both secrets are being accepted
aws secretsmanager get-secret-value \
    --secret-id festival-prod/jwt \
    --query 'SecretString' | jq '{current: .secret, previous: .previous_secret}'

# Check application JWT validation logic
kubectl logs -n production deployment/api | grep "JWT\|token"

# Extend rotation window if needed (manual update)
aws secretsmanager update-secret \
    --secret-id festival-prod/jwt \
    --secret-string '{"rotation_complete_at":"2026-01-15T00:00:00Z",...}'
```

### 11.2 Rollback Procedures

```bash
#!/bin/bash
# scripts/rollback-rotation.sh
# Rollback to previous secret version

SECRET_ID=${1:?Usage: $0 <secret-id>}

# List all versions
echo "Available versions:"
aws secretsmanager list-secret-version-ids \
    --secret-id "$SECRET_ID" \
    --query 'Versions[*].{VersionId:VersionId,Stages:VersionStages}' \
    --output table

# Find previous version
PREVIOUS_VERSION=$(aws secretsmanager list-secret-version-ids \
    --secret-id "$SECRET_ID" \
    --query 'Versions[?contains(VersionStages, `AWSPREVIOUS`)].VersionId' \
    --output text)

if [ -z "$PREVIOUS_VERSION" ]; then
    echo "ERROR: No previous version found"
    exit 1
fi

echo "Rolling back to version: $PREVIOUS_VERSION"

# Move AWSCURRENT to AWSPREVIOUS
CURRENT_VERSION=$(aws secretsmanager list-secret-version-ids \
    --secret-id "$SECRET_ID" \
    --query 'Versions[?contains(VersionStages, `AWSCURRENT`)].VersionId' \
    --output text)

aws secretsmanager update-secret-version-stage \
    --secret-id "$SECRET_ID" \
    --version-stage AWSCURRENT \
    --move-to-version-id "$PREVIOUS_VERSION" \
    --remove-from-version-id "$CURRENT_VERSION"

echo "Rollback complete. Restart application to apply."
```

### 11.3 Diagnostic Commands

```bash
# Full secret status
aws secretsmanager describe-secret --secret-id festival-prod/database

# Rotation history
aws secretsmanager list-secret-version-ids --secret-id festival-prod/database

# Lambda invocation logs
aws logs filter-log-events \
    --log-group-name /aws/lambda/festival-prod-secrets-rotation \
    --start-time $(date -d '1 hour ago' +%s)000 \
    --filter-pattern "ERROR"

# Test secret retrieval
aws secretsmanager get-secret-value \
    --secret-id festival-prod/database \
    --version-stage AWSCURRENT

# Verify KMS key access
aws kms decrypt \
    --key-id alias/festival-prod-secrets \
    --ciphertext-blob fileb://encrypted-data.bin
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Security Team | Initial document |

---

## Quick Reference

### Trigger Manual Rotation
```bash
aws secretsmanager rotate-secret --secret-id festival-prod/<secret-type>
```

### Check Rotation Status
```bash
aws secretsmanager describe-secret --secret-id festival-prod/<secret-type> \
    --query '{LastRotated:LastRotatedDate,NextRotation:NextRotationDate}'
```

### Emergency All-Secrets Rotation
```bash
./scripts/emergency-rotation-p1.sh
```

### View Rotation Logs
```bash
aws logs tail /aws/lambda/festival-prod-secrets-rotation --follow
```

---

**Questions:** Contact security@festival-platform.com
**Emergency:** PagerDuty - Security On-Call
