# OAuth Provider Setup Guide

This guide explains how to configure OAuth authentication for Google and GitHub in the Festival Management Platform.

## Table of Contents

1. [Google OAuth Setup](#google-oauth-setup)
2. [GitHub OAuth Setup](#github-oauth-setup)
3. [Environment Configuration](#environment-configuration)
4. [Troubleshooting](#troubleshooting)

---

## Google OAuth Setup

### Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click **New Project**
4. Enter a project name (e.g., "Festival Platform")
5. Click **Create**
6. Wait for the project to be created, then select it from the project dropdown

### Step 2: Enable the Google+ API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google+ API" or "Google Identity"
3. Click on **Google+ API** and then **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace organization)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Your application name (e.g., "Festival Platform")
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **Save and Continue**

#### Add Scopes

1. Click **Add or Remove Scopes**
2. Select the following scopes:
   - `./auth/userinfo.email` - See your primary Google Account email address
   - `./auth/userinfo.profile` - See your personal info, including any personal info you've made publicly available
3. Click **Update**
4. Click **Save and Continue**

#### Add Test Users (Development Only)

1. If your app is in testing mode, add test user email addresses
2. Click **Add Users** and enter the email addresses
3. Click **Save and Continue**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Web application** as the application type
4. Enter a name (e.g., "Festival Platform Web Client")
5. Add **Authorized JavaScript origins**:
   - For local development: `http://localhost:3000`
   - For production: `https://yourdomain.com`
6. Add **Authorized redirect URIs**:
   - For local development: `http://localhost:3333/api/auth/google/callback`
   - For production: `https://api.yourdomain.com/api/auth/google/callback`
7. Click **Create**
8. Copy the **Client ID** and **Client Secret** - you'll need these for your environment variables

### Required Scopes Summary

| Scope     | Description                                                |
| --------- | ---------------------------------------------------------- |
| `email`   | Access to user's email address                             |
| `profile` | Access to user's basic profile information (name, picture) |

### Callback URL Format

```
{API_URL}/api/auth/google/callback
```

Examples:

- Local: `http://localhost:3333/api/auth/google/callback`
- Production: `https://api.yourdomain.com/api/auth/google/callback`

---

## GitHub OAuth Setup

### Step 1: Access GitHub Developer Settings

1. Log in to your GitHub account
2. Click on your profile picture in the top right corner
3. Go to **Settings**
4. Scroll down and click on **Developer settings** in the left sidebar
5. Click on **OAuth Apps**

### Step 2: Create a New OAuth App

1. Click **New OAuth App** (or **Register a new application**)
2. Fill in the required fields:

| Field                          | Description            | Example                                                          |
| ------------------------------ | ---------------------- | ---------------------------------------------------------------- |
| **Application name**           | Your app's name        | Festival Platform                                                |
| **Homepage URL**               | Your app's homepage    | `http://localhost:3000` (dev) or `https://yourdomain.com` (prod) |
| **Application description**    | Optional description   | Festival management platform                                     |
| **Authorization callback URL** | The OAuth callback URL | `http://localhost:3333/api/auth/github/callback`                 |

3. Click **Register application**

### Step 3: Get Your Credentials

1. After creating the app, you'll see your **Client ID**
2. Click **Generate a new client secret**
3. Copy the **Client Secret** immediately (it won't be shown again)
4. Store both values securely

### Callback URL Format

```
{API_URL}/api/auth/github/callback
```

Examples:

- Local: `http://localhost:3333/api/auth/github/callback`
- Production: `https://api.yourdomain.com/api/auth/github/callback`

### Updating Callback URLs

If you need to update the callback URL later (e.g., for production):

1. Go to **Settings** > **Developer settings** > **OAuth Apps**
2. Click on your application
3. Update the **Authorization callback URL**
4. Click **Update application**

---

## Environment Configuration

### Required Environment Variables

Add the following variables to your `.env` file:

```bash
# ===========================================
# OAuth Configuration
# ===========================================

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# OAuth Callback URLs (adjust based on environment)
# These should match the URLs configured in the OAuth provider settings
API_URL=http://localhost:3333
FRONTEND_URL=http://localhost:3000
```

### Example .env for Local Development

```bash
# API Configuration
API_URL=http://localhost:3333
FRONTEND_URL=http://localhost:3000

# Google OAuth (Development)
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop

# GitHub OAuth (Development)
GITHUB_CLIENT_ID=Iv1.abcdef123456
GITHUB_CLIENT_SECRET=abcdef123456789abcdef123456789abcdef12
```

### Example .env for Production

```bash
# API Configuration
API_URL=https://api.yourfestival.com
FRONTEND_URL=https://yourfestival.com

# Google OAuth (Production)
GOOGLE_CLIENT_ID=123456789-production.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-productionsecret

# GitHub OAuth (Production)
GITHUB_CLIENT_ID=Iv1.productionid
GITHUB_CLIENT_SECRET=productionsecretproductionsecret
```

### Setting Up Multiple Environments

For managing different environments, you can:

1. **Use separate OAuth apps** for development and production
2. **Create environment-specific .env files**:
   - `.env.local` - Local development
   - `.env.staging` - Staging environment
   - `.env.production` - Production environment

### Testing Locally vs Production URLs

| Environment | API URL                              | Frontend URL                     |
| ----------- | ------------------------------------ | -------------------------------- |
| Local       | `http://localhost:3333`              | `http://localhost:3000`          |
| Staging     | `https://api-staging.yourdomain.com` | `https://staging.yourdomain.com` |
| Production  | `https://api.yourdomain.com`         | `https://yourdomain.com`         |

---

## Troubleshooting

### Common Errors and Solutions

#### 1. "redirect_uri_mismatch" Error (Google)

**Error Message**: `Error 400: redirect_uri_mismatch`

**Cause**: The callback URL in your request doesn't match the one configured in Google Cloud Console.

**Solution**:

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Click on your OAuth 2.0 Client ID
3. Check the "Authorized redirect URIs"
4. Ensure it exactly matches your callback URL (including protocol, domain, port, and path)
5. Common issues:
   - Missing `http://` vs `https://`
   - Missing or extra trailing slash
   - Wrong port number
   - Typo in the path

#### 2. "Bad Request" or "Invalid Client" Error (GitHub)

**Error Message**: `Bad Request` or `The client_id and/or client_secret passed are incorrect`

**Cause**: Invalid or missing client credentials.

**Solution**:

1. Verify your `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
2. Check for extra whitespace in your .env file
3. Regenerate the client secret if needed
4. Ensure the OAuth app is not suspended

#### 3. "Access Denied" Error

**Error Message**: `Access Denied` or `User denied access`

**Cause**: User cancelled the OAuth flow or app is not authorized.

**Solution**:

1. For Google: Check if the user is added as a test user (if app is in testing mode)
2. For GitHub: Ensure the OAuth app is active
3. Check if any organization restrictions are blocking access

#### 4. "State Mismatch" Error

**Error Message**: `State mismatch` or `CSRF token mismatch`

**Cause**: The state parameter doesn't match between the initial request and callback.

**Solution**:

1. Ensure cookies are enabled in the browser
2. Check if session storage is working correctly
3. Verify Redis connection for session management
4. Clear browser cookies and try again

#### 5. Callback URL Not Found (404)

**Error Message**: `Cannot GET /api/auth/google/callback`

**Cause**: The OAuth callback route is not properly configured.

**Solution**:

1. Verify the API server is running
2. Check that the auth module is properly imported
3. Verify the route path matches the configured callback URL

### Debugging the OAuth Flow

#### Enable Debug Logging

Add these environment variables for detailed OAuth logs:

```bash
# Enable debug mode
DEBUG=true
LOG_LEVEL=debug
```

#### Check the Network Tab

1. Open browser Developer Tools (F12)
2. Go to the Network tab
3. Click the OAuth login button
4. Watch for:
   - Initial redirect to the OAuth provider
   - Redirect back to your callback URL
   - Any error responses

#### Verify Environment Variables

Run this command to check if environment variables are loaded:

```bash
# In your API directory
node -e "console.log({
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? 'SET' : 'NOT SET',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ? 'SET' : 'NOT SET'
})"
```

#### Test OAuth Endpoints Manually

```bash
# Test Google OAuth initiation
curl -I http://localhost:3333/api/auth/google

# Test GitHub OAuth initiation
curl -I http://localhost:3333/api/auth/github
```

Both should return a `302 Found` redirect to the respective OAuth provider.

### Security Best Practices

1. **Never commit OAuth secrets** to version control
2. **Use different OAuth apps** for development and production
3. **Rotate secrets periodically** in production
4. **Monitor OAuth app usage** in provider dashboards
5. **Limit scopes** to only what's needed
6. **Validate state parameter** to prevent CSRF attacks

### Getting Help

If you're still experiencing issues:

1. Check the API logs for detailed error messages
2. Verify all environment variables are correctly set
3. Ensure the OAuth provider dashboard shows correct configuration
4. Review the [NestJS Passport documentation](https://docs.nestjs.com/security/authentication)
5. Check the [Passport.js documentation](http://www.passportjs.org/docs/) for strategy-specific issues
