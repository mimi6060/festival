# Production Security Configuration Guide

This document explains the production security configuration implemented for the Festival Platform.

## Overview

The platform now enforces strict security validations for production deployments:

- Database SSL enforcement
- Environment variable validation with minimum security requirements
- Pre-deployment validation scripts
- Comprehensive security documentation

## Critical Environment Variables

### 1. JWT Secrets (REQUIRED)

```bash
# Access token secret (minimum 32 characters)
JWT_ACCESS_SECRET=your_super_secret_jwt_access_key_min_32_chars_CHANGE_IN_PRODUCTION

# Refresh token secret (minimum 32 characters, MUST be different from JWT_ACCESS_SECRET)
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key_min_32_chars_CHANGE_IN_PRODUCTION
```

**Generate secure secrets:**
```bash
openssl rand -base64 64
```

**Security notes:**
- Minimum 32 characters enforced by validation schema
- Access and refresh secrets MUST be different
- Never use default/example values in production
- Never commit real secrets to version control

### 2. QR Code Secrets (REQUIRED)

```bash
# QR Code signing secret (minimum 32 characters)
QR_CODE_SECRET=your_qr_code_signing_secret_min_32_chars_CHANGE_IN_PRODUCTION
```

**Used for:**
- Ticket QR code signing (HMAC-SHA256)
- Camping booking QR codes
- Prevents QR code forgery

### 3. Database Configuration (REQUIRED)

```bash
# Development (no SSL)
DATABASE_URL=postgresql://user:password@host:5432/db?schema=public

# Production (with SSL - REQUIRED)
DATABASE_URL=postgresql://user:password@host:5432/db?schema=public&sslmode=require
```

**Production requirements:**
- MUST include `sslmode=require` parameter
- Use strong database passwords (16+ characters)
- Enable connection pooling (MIN=10, MAX=50 recommended)

### 4. Stripe Configuration (REQUIRED)

```bash
# Production keys (must start with sk_live_ / pk_live_)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

**Validation rules:**
- `STRIPE_SECRET_KEY` must match pattern `^sk_(test|live)_`
- `STRIPE_WEBHOOK_SECRET` must match pattern `^whsec_`
- In production: must use `sk_live_` keys

## Validation Schema

All environment variables are validated using Joi schema in `/apps/api/src/config/validation.schema.ts`.

### Validation Rules

| Variable | Type | Min Length | Pattern | Required |
|----------|------|------------|---------|----------|
| NODE_ENV | string | - | development/test/staging/production | Yes |
| DATABASE_URL | string | 20 | postgresql://... | Yes |
| JWT_ACCESS_SECRET | string | 32 | - | Yes |
| JWT_REFRESH_SECRET | string | 32 | - | Yes |
| QR_CODE_SECRET | string | 32 | - | Yes |
| STRIPE_SECRET_KEY | string | 20 | ^sk_(test\|live)_ | Yes |
| STRIPE_WEBHOOK_SECRET | string | 20 | ^whsec_ | Yes |

### Validation Options

```typescript
{
  allowUnknown: true,     // Allow extra env vars not in schema
  abortEarly: false,      // Report all errors, not just first one
  cache: true             // Cache validation results
}
```

## Pre-Deployment Validation

### Check Environment Variables

Run the validation script before deploying:

```bash
# Check production environment
./scripts/check-env.sh production

# Check staging environment
./scripts/check-env.sh staging
```

### What the script validates:

1. **Node Environment**
   - NODE_ENV matches target environment
   - Required for production deployment

2. **Database Configuration**
   - DATABASE_URL is set and valid
   - SSL is enabled (sslmode=require) in production
   - Password is strong enough (16+ chars)

3. **JWT Secrets**
   - JWT_ACCESS_SECRET is set and ≥32 chars
   - JWT_REFRESH_SECRET is set and ≥32 chars
   - Both secrets are different
   - No default/insecure values in production

4. **QR Code Secrets**
   - QR_CODE_SECRET is set and ≥32 chars
   - No default/insecure values in production

5. **Stripe Configuration**
   - STRIPE_SECRET_KEY format is valid
   - Using live keys (sk_live_*) in production
   - STRIPE_WEBHOOK_SECRET format is valid

6. **Security Settings**
   - CORS_ORIGINS doesn't contain localhost in production
   - Encryption key is set (if used)

### Exit codes:

- `0`: All checks passed
- `1`: One or more checks failed

## CI/CD Integration

### GitHub Actions

The validation is automatically run in CI:

```yaml
- name: Validate Environment
  run: ./scripts/check-env.sh ${{ env.ENVIRONMENT }}
```

### Pre-deployment checklist:

1. Run `./scripts/check-env.sh production`
2. Run `npx nx build api --skip-nx-cache`
3. Verify all tests pass
4. Review security warnings
5. Deploy

## Common Security Issues

### Issue: "JWT secrets are the same"

**Problem:** JWT_ACCESS_SECRET and JWT_REFRESH_SECRET have the same value.

**Solution:**
```bash
# Generate two different secrets
JWT_ACCESS_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
```

### Issue: "Database SSL not enabled"

**Problem:** DATABASE_URL doesn't include `sslmode=require`.

**Solution:**
```bash
# Add sslmode parameter
DATABASE_URL="postgresql://user:password@host:5432/db?schema=public&sslmode=require"
```

### Issue: "Using test Stripe keys in production"

**Problem:** STRIPE_SECRET_KEY starts with `sk_test_` in production.

**Solution:**
```bash
# Use live keys from Stripe dashboard
STRIPE_SECRET_KEY=sk_live_your_live_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key_here
```

### Issue: "CORS contains localhost in production"

**Problem:** CORS_ORIGINS includes localhost URLs in production.

**Solution:**
```bash
# Remove localhost, use actual domains
CORS_ORIGINS=https://app.example.com,https://admin.example.com
```

## Best Practices

### Secrets Management

1. **Never commit secrets to version control**
   - Use `.env` files (gitignored)
   - Use environment variables in CI/CD
   - Use secrets managers (AWS Secrets Manager, HashiCorp Vault, etc.)

2. **Rotate secrets regularly**
   - JWT secrets: every 90 days
   - API keys: per provider recommendations
   - Database passwords: every 180 days

3. **Use strong, unique secrets**
   - Minimum 32 characters
   - Use cryptographically secure random generators
   - Different for each environment

### Environment Separation

```bash
# Development
.env.development
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/festival_dev
STRIPE_SECRET_KEY=sk_test_...

# Production
.env.production
NODE_ENV=production
DATABASE_URL=postgresql://prod-host:5432/festival?sslmode=require
STRIPE_SECRET_KEY=sk_live_...
```

### Monitoring

1. **Set up alerts for:**
   - Failed authentication attempts
   - Invalid QR code scans
   - Webhook signature failures
   - Database connection errors

2. **Enable audit logging for:**
   - Secret rotation events
   - Configuration changes
   - Admin access

## Files Modified

- `/apps/api/src/config/validation.schema.ts` - Added JWT_ACCESS_SECRET and QR_CODE_SECRET validation
- `/.env.example` - Enhanced documentation with security warnings
- `/scripts/check-env.sh` - Created pre-deployment validation script
- `/prisma/schema.prisma` - Documented SSL requirement in comments

## Additional Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [NestJS Configuration Best Practices](https://docs.nestjs.com/techniques/configuration)
- [Stripe Security Best Practices](https://stripe.com/docs/security/guide)
- [PostgreSQL SSL Documentation](https://www.postgresql.org/docs/current/libpq-ssl.html)

## Support

For security issues or questions:
- Create a security issue in GitHub (private)
- Contact the security team
- Review audit logs regularly
