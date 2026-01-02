# Secrets Management Guide

**Festival Management Platform**

**Date:** 2026-01-02
**Version:** 1.0
**Classification:** CONFIDENTIAL - Internal Use Only

---

## Table of Contents

1. [Overview](#overview)
2. [Secrets Inventory](#secrets-inventory)
3. [Generation Guidelines](#generation-guidelines)
4. [Storage Best Practices](#storage-best-practices)
5. [Rotation Procedures](#rotation-procedures)
6. [Access Control](#access-control)
7. [Audit & Monitoring](#audit--monitoring)
8. [Incident Response](#incident-response)
9. [Environment-Specific Configuration](#environment-specific-configuration)

---

## 1. Overview

This document provides comprehensive guidelines for managing secrets across the Festival Management Platform. Proper secrets management is critical for:

- **Security:** Preventing unauthorized access
- **Compliance:** Meeting PCI-DSS and GDPR requirements
- **Operations:** Enabling smooth deployments and rotations

### Key Principles

1. **Never commit secrets to version control**
2. **Use strong, unique secrets for each environment**
3. **Rotate secrets regularly**
4. **Apply least privilege access**
5. **Monitor and audit secret access**

---

## 2. Secrets Inventory

### 2.1 Authentication Secrets

| Secret | Purpose | Min Length | Rotation Frequency |
|--------|---------|------------|-------------------|
| `JWT_SECRET` | Access token signing | 64 chars | 90 days |
| `JWT_REFRESH_SECRET` | Refresh token signing | 64 chars | 90 days |
| `SESSION_SECRET` | Session encryption | 64 chars | 90 days |
| `CSRF_SECRET` | CSRF token generation | 32 chars | 90 days |

**Generation:**
```bash
# Generate JWT secrets
openssl rand -base64 64

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Security Requirements:**
- Use different secrets for each environment
- Store in secure secrets manager
- Never log or expose in error messages

### 2.2 Database Secrets

| Secret | Purpose | Rotation Frequency |
|--------|---------|-------------------|
| `DATABASE_PASSWORD` | PostgreSQL authentication | 90 days |
| `DATABASE_URL` | Full connection string | When password rotates |
| `REDIS_PASSWORD` | Redis authentication | 90 days |

**Generation:**
```bash
# Generate strong database password
openssl rand -base64 32 | tr -d '/+=' | head -c 32
```

**Security Requirements:**
- Use unique credentials per environment
- Restrict database network access
- Enable SSL/TLS for connections
- Use connection pooling
- Never expose in logs

### 2.3 Payment Secrets (Critical)

| Secret | Purpose | Rotation Frequency |
|--------|---------|-------------------|
| `STRIPE_SECRET_KEY` | Stripe API access | On compromise only |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | On rotation |

**Security Requirements:**
- **PCI-DSS Compliance Required**
- Use test keys (`sk_test_*`) in development
- Use live keys (`sk_live_*`) only in production
- Restrict API key permissions in Stripe dashboard
- Enable webhook signature verification
- Log all payment operations

**Key Rotation:**
1. Generate new key in Stripe dashboard
2. Update in secrets manager
3. Deploy to production
4. Revoke old key after verification
5. Document in change log

### 2.4 Encryption Secrets

| Secret | Purpose | Min Length | Rotation Frequency |
|--------|---------|------------|-------------------|
| `ENCRYPTION_KEY` | AES-256 data encryption | 32 bytes | 365 days |
| `QR_SECRET` | QR code HMAC signing | 32 chars | 90 days |

**Generation:**
```bash
# Generate 32-byte encryption key (hex)
openssl rand -hex 32

# Generate base64 key
openssl rand -base64 32
```

**Security Requirements:**
- Use different keys per environment
- Implement key derivation for multiple purposes
- Store backup keys securely
- Document key rotation procedures

### 2.5 External Service Secrets

| Secret | Purpose | Provider |
|--------|---------|----------|
| `AWS_ACCESS_KEY_ID` | AWS API access | AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | AWS API authentication | AWS IAM |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK | Firebase Console |
| `SENTRY_DSN` | Error tracking | Sentry |
| `GOOGLE_MAPS_API_KEY` | Maps integration | Google Cloud |
| `TWILIO_AUTH_TOKEN` | SMS sending | Twilio |

**Security Requirements:**
- Use IAM roles when possible (AWS)
- Apply least privilege permissions
- Use service-specific API keys
- Enable usage restrictions where available

### 2.6 OAuth Secrets

| Secret | Purpose | Provider |
|--------|---------|----------|
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Google Cloud Console |
| `FACEBOOK_APP_SECRET` | Facebook OAuth | Facebook Developers |
| `APPLE_PRIVATE_KEY` | Apple Sign In | Apple Developer |

**Security Requirements:**
- Register only required OAuth scopes
- Use state parameter for CSRF protection
- Validate redirect URIs

---

## 3. Generation Guidelines

### 3.1 Password/Secret Strength Requirements

| Type | Minimum Length | Character Requirements |
|------|----------------|----------------------|
| API Keys | 32 characters | Alphanumeric |
| JWT Secrets | 64 characters | Base64 |
| Database Passwords | 32 characters | All character types |
| Encryption Keys | 32 bytes (256 bits) | Binary/Hex |

### 3.2 Generation Commands

```bash
# Strong random password (32 chars)
openssl rand -base64 32 | tr -d '/+=' | head -c 32

# Hex key (64 chars = 32 bytes)
openssl rand -hex 32

# Base64 key (64 chars)
openssl rand -base64 48

# URL-safe token
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# UUID-based
uuidgen | tr -d '-'
```

### 3.3 What NOT to Do

- Use predictable values (dates, names, sequential numbers)
- Reuse secrets across environments
- Use online generators for production secrets
- Store secrets in source code, even temporarily
- Share secrets via email or chat

---

## 4. Storage Best Practices

### 4.1 Development Environment

**Acceptable:**
- `.env.development` file (gitignored)
- Local secrets manager (1Password, LastPass)
- Docker secrets for local services

**Not Acceptable:**
- Committing to git
- Plain text files in shared locations
- Hardcoded in source code

### 4.2 CI/CD Environment

**GitHub Actions:**
```yaml
# Store in GitHub Secrets
# Settings > Secrets and variables > Actions

# Access in workflow
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

**Best Practices:**
- Use environment-specific secrets
- Limit secret access to required workflows
- Use OIDC for cloud provider authentication when possible
- Rotate secrets after team member departure

### 4.3 Production Environment

**Recommended: AWS Secrets Manager**

```bash
# Create secret
aws secretsmanager create-secret \
  --name festival/production/database \
  --secret-string '{"username":"admin","password":"xxx"}'

# Retrieve in application
aws secretsmanager get-secret-value \
  --secret-id festival/production/database
```

**Alternative: HashiCorp Vault**

```bash
# Store secret
vault kv put secret/festival/production/jwt \
  secret="xxx" \
  refresh_secret="yyy"

# Retrieve secret
vault kv get secret/festival/production/jwt
```

**Kubernetes Secrets:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: festival-secrets
  namespace: production
type: Opaque
data:
  JWT_SECRET: <base64-encoded>
  DATABASE_PASSWORD: <base64-encoded>
```

### 4.4 Secret Hierarchy

```
/secrets
  /production
    /database
    /jwt
    /stripe
    /firebase
  /staging
    /database
    /jwt
    /stripe (test keys)
  /development
    /database
    /jwt (can be shared)
```

---

## 5. Rotation Procedures

### 5.1 Rotation Schedule

| Secret Type | Frequency | Trigger Events |
|-------------|-----------|----------------|
| JWT Secrets | 90 days | Team departure, compromise |
| Database Passwords | 90 days | DBA departure, compromise |
| API Keys | 90 days | Developer departure, compromise |
| Encryption Keys | 365 days | Security audit, compromise |

### 5.2 JWT Secret Rotation

**Zero-Downtime Rotation:**

1. **Phase 1: Add New Secret**
   - Generate new JWT_SECRET
   - Configure app to accept both old and new secrets
   - Deploy changes

2. **Phase 2: Transition**
   - Start signing new tokens with new secret
   - Old tokens still valid (accepted by old secret)
   - Wait for token expiry (15 min for access, 7 days for refresh)

3. **Phase 3: Remove Old Secret**
   - Remove old secret from configuration
   - Deploy final changes
   - Document rotation in audit log

### 5.3 Database Password Rotation

1. Create new database user/password
2. Update secrets manager
3. Deploy application with new credentials
4. Verify connectivity
5. Revoke old credentials
6. Document change

### 5.4 Stripe Key Rotation

1. Log into Stripe Dashboard
2. Generate new API key (Developers > API keys > Create key)
3. Update in secrets manager
4. Deploy to production
5. Monitor for errors
6. Delete old key after 24 hours
7. Update webhook endpoints if needed

---

## 6. Access Control

### 6.1 Role-Based Access

| Role | Production Secrets | Staging Secrets | Dev Secrets |
|------|-------------------|-----------------|-------------|
| Security Lead | Full Access | Full Access | Full Access |
| DevOps Lead | Full Access | Full Access | Full Access |
| Senior Developer | Read Only | Full Access | Full Access |
| Developer | No Access | Read Only | Full Access |
| Contractor | No Access | No Access | Limited |

### 6.2 Access Request Process

1. Submit request to Security Lead
2. Justification required
3. Time-limited access preferred
4. Two-person approval for production
5. Access logged and audited

### 6.3 Emergency Access

- Break-glass procedure documented
- Requires post-incident review
- Automatic audit trail
- 24-hour access revocation

---

## 7. Audit & Monitoring

### 7.1 What to Log

- Secret access attempts (success/failure)
- Secret modifications
- Secret rotations
- Unusual access patterns
- Failed authentication attempts

### 7.2 Alerting

**Immediate Alerts:**
- Production secret access from unknown IP
- Multiple failed access attempts
- Secret accessed outside business hours
- Bulk secret exports

**Daily Reports:**
- Secret access summary
- Upcoming rotation deadlines
- Access anomalies

### 7.3 Audit Requirements

- Retain logs for 1 year minimum
- Regular access review (quarterly)
- Document all exceptions
- Compliance reporting

---

## 8. Incident Response

### 8.1 Secret Compromise Response

**Severity Levels:**

| Level | Description | Response Time |
|-------|-------------|---------------|
| Critical | Production payment secrets | Immediate |
| High | Production auth secrets | < 1 hour |
| Medium | Staging secrets | < 4 hours |
| Low | Development secrets | < 24 hours |

### 8.2 Response Steps

1. **Identify**
   - Determine which secrets are compromised
   - Assess potential impact
   - Identify exposure vector

2. **Contain**
   - Revoke compromised secrets immediately
   - Block suspicious IPs/accounts
   - Enable enhanced monitoring

3. **Rotate**
   - Generate new secrets
   - Deploy to all environments
   - Verify system functionality

4. **Investigate**
   - Root cause analysis
   - Timeline reconstruction
   - Impact assessment

5. **Report**
   - Internal notification
   - Regulatory notification if required (72 hours for GDPR)
   - Customer notification if data exposed

6. **Remediate**
   - Fix vulnerability
   - Update procedures
   - Additional controls

### 8.3 Emergency Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| Security Lead | security@festival-platform.com | Incident command |
| DevOps Lead | devops@festival-platform.com | Technical response |
| CTO | cto@festival-platform.com | Escalation |

---

## 9. Environment-Specific Configuration

### 9.1 Development

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://dev_user:dev_pass@localhost:5432/festival_dev
JWT_SECRET=dev-jwt-secret-not-for-production
STRIPE_SECRET_KEY=sk_test_xxx
```

### 9.2 Staging

```bash
# Managed by secrets manager
NODE_ENV=staging
# All secrets retrieved from AWS Secrets Manager
# Stripe test keys used
```

### 9.3 Production

```bash
# All secrets from AWS Secrets Manager or Vault
NODE_ENV=production
# Stripe live keys
# Unique, strong secrets
# Regular rotation enforced
```

### 9.4 Verification Script

```bash
#!/bin/bash
# verify-secrets.sh

echo "Checking secret strength..."

# Check JWT secret length
if [ ${#JWT_SECRET} -lt 64 ]; then
  echo "ERROR: JWT_SECRET too short"
  exit 1
fi

# Check for test keys in production
if [ "$NODE_ENV" = "production" ]; then
  if [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then
    echo "ERROR: Test Stripe key in production"
    exit 1
  fi
fi

echo "Secret verification passed"
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Security Team | Initial document |

---

## Quick Reference Card

### Generating Secrets
```bash
# JWT/Session secrets (64 chars)
openssl rand -base64 64

# Passwords (32 chars)
openssl rand -base64 32 | tr -d '/+=' | head -c 32

# Encryption keys (32 bytes hex)
openssl rand -hex 32
```

### Emergency Rotation
```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 64)

# 2. Update secrets manager
aws secretsmanager update-secret \
  --secret-id festival/production/jwt \
  --secret-string "$NEW_SECRET"

# 3. Restart services
kubectl rollout restart deployment/api -n production
```

### Verification
```bash
# Check for leaked secrets
git log -p | grep -E "(password|secret|key|token)\s*[:=]"

# Scan for secrets in files
trufflehog filesystem --directory .
```

---

**Questions:** Contact security@festival-platform.com
