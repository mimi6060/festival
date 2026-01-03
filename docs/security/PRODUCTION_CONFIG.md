# Production Security Configuration

## Overview

Production security validation ensures all critical environment variables are properly configured before deployment.

## Critical Environment Variables

### JWT Secrets (REQUIRED)

```bash
# Generate with: openssl rand -base64 64
JWT_ACCESS_SECRET=your_super_secret_jwt_access_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key_min_32_chars
```

- Minimum 32 characters
- Must be different from each other
- Never use default values in production

### QR Code Secret (REQUIRED)

```bash
QR_CODE_SECRET=your_qr_code_signing_secret_min_32_chars
```

- Minimum 32 characters
- Used for ticket/booking QR code signing (HMAC-SHA256)

### Database (REQUIRED)

```bash
# Production MUST use SSL
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public&sslmode=require
```

### Stripe (REQUIRED)

```bash
# Production must use live keys
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
```

## Pre-Deployment Validation

Run before deploying:

```bash
./scripts/check-env.sh production
```

Validates:

1. NODE_ENV matches environment
2. Database SSL enabled
3. JWT secrets (length, uniqueness, no defaults)
4. QR code secret (length, no defaults)
5. Stripe keys format
6. CORS configuration

## Validation Schema

All variables validated by `/apps/api/src/config/validation.schema.ts`:

- JWT_ACCESS_SECRET: min 32 chars, required
- JWT_REFRESH_SECRET: min 32 chars, required
- QR_CODE_SECRET: min 32 chars, required
- STRIPE*SECRET_KEY: pattern `^sk*(test|live)\_`, required
- DATABASE_URL: required

## Common Issues

**JWT secrets are the same**

```bash
# Generate two different secrets
JWT_ACCESS_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
```

**Database SSL not enabled**

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&sslmode=require"
```

**Using test Stripe keys in production**

```bash
STRIPE_SECRET_KEY=sk_live_your_live_key_here
```

## Best Practices

1. **Never commit secrets** - use environment variables or secrets managers
2. **Rotate secrets regularly** - JWT: 90 days, DB: 180 days
3. **Use strong secrets** - minimum 32 characters, cryptographically random
4. **Separate environments** - different secrets for dev/staging/production
