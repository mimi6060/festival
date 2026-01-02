# GitHub Secrets Configuration

This document lists all the secrets and variables required for the GitHub Actions workflows in the Festival Platform.

## Quick Setup Checklist

Before using the workflows, ensure you have configured:

- [ ] Repository secrets (Settings > Secrets and variables > Actions > Secrets)
- [ ] Repository variables (Settings > Secrets and variables > Actions > Variables)
- [ ] Environment secrets for staging and production
- [ ] Branch protection rules

---

## Required Secrets

### Core Secrets (Required)

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `GITHUB_TOKEN` | Automatically provided by GitHub | Built-in, no action needed |

### NX Cloud (Optional but Recommended)

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `NX_CLOUD_ACCESS_TOKEN` | NX Cloud remote caching token | [NX Cloud Dashboard](https://cloud.nx.app/) > Workspace Settings > Access Tokens |

### Vercel Deployment

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `VERCEL_TOKEN` | Vercel API token | [Vercel Dashboard](https://vercel.com/account/tokens) > Create Token |
| `VERCEL_ORG_ID` | Vercel organization/team ID | `vercel link` command or Project Settings |
| `VERCEL_PROJECT_ID_WEB` | Web app project ID | `vercel link` in apps/web or .vercel/project.json |
| `VERCEL_PROJECT_ID_ADMIN` | Admin app project ID | `vercel link` in apps/admin or .vercel/project.json |

### Docker Registry (API Deployment)

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `GITHUB_TOKEN` | GitHub Container Registry auth | Built-in (requires packages:write permission) |

For AWS ECR (alternative):
| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `AWS_ACCESS_KEY_ID` | AWS access key | AWS IAM Console > Create Access Key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | AWS IAM Console > Create Access Key |
| `AWS_REGION` | AWS region (e.g., eu-west-1) | Your AWS region |
| `ECR_REGISTRY` | ECR registry URL | AWS ECR Console |

### Stripe Integration

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `NEXT_PUBLIC_STRIPE_KEY` | Stripe publishable key | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_SECRET_KEY` | Stripe secret key | Stripe Dashboard > API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Stripe Dashboard > Webhooks > Signing secret |

### Sentry Error Tracking

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `SENTRY_AUTH_TOKEN` | Sentry authentication token | [Sentry](https://sentry.io/settings/auth-tokens/) > Auth Tokens |
| `SENTRY_DSN` | Sentry DSN for error reporting | Sentry Project Settings > Client Keys |

### Code Coverage

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `CODECOV_TOKEN` | Codecov upload token | [Codecov](https://codecov.io/) > Repository Settings |

### Security Scanning

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `SNYK_TOKEN` | Snyk API token | [Snyk](https://app.snyk.io/account) > Account Settings |
| `GITLEAKS_LICENSE` | Gitleaks enterprise license | [Gitleaks](https://gitleaks.io/) (optional) |

### Mobile App (Expo/EAS)

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `EXPO_TOKEN` | Expo access token | [Expo Dashboard](https://expo.dev/settings/access-tokens) |

#### Android Signing

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `ANDROID_KEYSTORE_BASE64` | Base64 encoded keystore file | `base64 -i your-keystore.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password | Your keystore password |
| `ANDROID_KEY_ALIAS` | Key alias in keystore | Your key alias |
| `ANDROID_KEY_PASSWORD` | Key password | Your key password |

#### iOS Signing

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `IOS_P12_BASE64` | Base64 encoded P12 certificate | `base64 -i certificate.p12` |
| `IOS_P12_PASSWORD` | P12 certificate password | Your certificate password |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64 encoded provisioning profile | `base64 -i profile.mobileprovision` |
| `IOS_TEAM_ID` | Apple Developer Team ID | Apple Developer Portal |
| `IOS_CODE_SIGN_IDENTITY` | Code signing identity | e.g., "iPhone Distribution: Your Company" |
| `IOS_PROVISIONING_PROFILE_NAME` | Provisioning profile name | Apple Developer Portal |

### Notifications

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL | [Slack API](https://api.slack.com/apps) > Incoming Webhooks |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL | Discord Server Settings > Integrations > Webhooks |
| `TEAMS_WEBHOOK_URL` | Microsoft Teams webhook URL | Teams Channel > Connectors > Incoming Webhook |

### CDN (Optional)

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `CF_ZONE_ID` | Cloudflare zone ID | Cloudflare Dashboard > Zone Overview |
| `CF_API_TOKEN` | Cloudflare API token | Cloudflare Dashboard > API Tokens |

---

## Repository Variables

Variables are non-sensitive configuration values.

| Variable Name | Description | Example |
|---------------|-------------|---------|
| `TURBO_TEAM` | Turborepo team name | `festival-team` |
| `NEXT_PUBLIC_API_URL` | Default API URL | `https://api.festival.example.com` |
| `STAGING_API_URL` | Staging API URL | `https://api-staging.festival.example.com` |
| `PRODUCTION_API_URL` | Production API URL | `https://api.festival.example.com` |
| `SENTRY_ORG` | Sentry organization slug | `festival-org` |

---

## Environment-Specific Configuration

### Environments to Create

Go to **Settings > Environments** and create:

1. **staging**
   - Protection rules: None (auto-deploy)
   - Secrets: Staging-specific credentials

2. **production**
   - Protection rules: Required reviewers
   - Secrets: Production credentials

3. **preview**
   - Protection rules: None
   - For PR deployments

4. **admin-staging** / **admin-production**
   - Separate environments for admin dashboard

### Environment Secrets

Each environment can have its own secrets that override repository secrets:

| Environment | Secrets to Override |
|-------------|---------------------|
| staging | `DATABASE_URL`, `REDIS_URL`, API keys |
| production | `DATABASE_URL`, `REDIS_URL`, API keys |

---

## Setup Instructions

### 1. Create Repository Secrets

```bash
# Using GitHub CLI
gh secret set VERCEL_TOKEN --body "your-vercel-token"
gh secret set VERCEL_ORG_ID --body "your-org-id"
gh secret set VERCEL_PROJECT_ID_WEB --body "your-project-id"
# ... repeat for other secrets
```

### 2. Create Repository Variables

```bash
gh variable set NEXT_PUBLIC_API_URL --body "https://api.festival.example.com"
gh variable set SENTRY_ORG --body "festival-org"
```

### 3. Get Vercel Project IDs

```bash
# In apps/web directory
cd apps/web
vercel link
cat .vercel/project.json
# Copy projectId and orgId

# In apps/admin directory
cd apps/admin
vercel link
cat .vercel/project.json
```

### 4. Get NX Cloud Token

```bash
# If not already connected
npx nx connect
# Token will be displayed or check .nx/cloud/config
```

### 5. Setup Expo/EAS

```bash
# Login to Expo
npx expo login

# Create EAS project
cd apps/mobile
eas init

# Get token from Expo dashboard
```

### 6. Generate iOS Certificates (Base64)

```bash
# Export from Keychain as .p12
base64 -i Certificates.p12 | pbcopy
# Paste as IOS_P12_BASE64 secret

# Export provisioning profile
base64 -i Festival_AppStore.mobileprovision | pbcopy
# Paste as IOS_PROVISIONING_PROFILE_BASE64 secret
```

### 7. Generate Android Keystore (Base64)

```bash
# Generate keystore if needed
keytool -genkeypair -v -storetype PKCS12 \
  -keystore festival.keystore \
  -alias festival \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Encode as base64
base64 -i festival.keystore | pbcopy
# Paste as ANDROID_KEYSTORE_BASE64 secret
```

---

## Security Best Practices

1. **Rotate secrets regularly** - Update secrets every 90 days
2. **Use environment-specific secrets** - Don't share production secrets with staging
3. **Limit secret access** - Use environment protection rules
4. **Audit secret usage** - Review Actions logs for secret access
5. **Never commit secrets** - Use `.env.example` for documentation only

---

## Troubleshooting

### Secret Not Found

```
Error: The secret `SECRET_NAME` was not found
```

**Solution**: Verify the secret is created in Settings > Secrets and variables > Actions

### Permission Denied

```
Error: Resource not accessible by integration
```

**Solution**: Check workflow permissions in Settings > Actions > General > Workflow permissions

### Vercel Deployment Fails

```
Error: VERCEL_ORG_ID or VERCEL_PROJECT_ID not found
```

**Solution**: Run `vercel link` in the app directory and copy IDs from `.vercel/project.json`

### Expo Build Fails

```
Error: EXPO_TOKEN is not set
```

**Solution**: Generate token at https://expo.dev/settings/access-tokens

---

## Support

For issues with specific secrets or configurations:

1. Check the [GitHub Actions documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
2. Review workflow logs for detailed error messages
3. Open an issue in the repository with the error details

---

Last updated: 2026-01-02
