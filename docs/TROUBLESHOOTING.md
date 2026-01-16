# Troubleshooting Guide - Festival Management Platform

This comprehensive guide helps you diagnose and resolve common issues with the Festival Management Platform.

## Table of Contents

1. [Development Setup](#1-development-setup)
   - [Node Version Issues](#node-version-issues)
   - [npm/pnpm Install Failures](#npmpnpm-install-failures)
   - [Prisma Generate Errors](#prisma-generate-errors)
   - [Docker Not Starting](#docker-not-starting)
2. [Database Issues](#2-database-issues)
   - [Connection Refused](#connection-refused)
   - [Migration Failures](#migration-failures)
   - [Prisma Client Not Generated](#prisma-client-not-generated)
3. [Authentication Issues](#3-authentication-issues)
   - [JWT Token Errors](#jwt-token-errors)
   - [Cookie Not Being Set](#cookie-not-being-set)
   - [OAuth Redirect Issues](#oauth-redirect-issues)
4. [Build Issues](#4-build-issues)
   - [TypeScript Errors](#typescript-errors)
   - [Missing Dependencies](#missing-dependencies)
   - [Nx Cache Issues](#nx-cache-issues)
5. [Runtime Issues](#5-runtime-issues)
   - [API Not Responding](#api-not-responding)
   - [WebSocket Connection Failed](#websocket-connection-failed)
   - [Stripe Webhooks Not Working](#stripe-webhooks-not-working)
6. [Testing Issues](#6-testing-issues)
   - [Tests Failing](#tests-failing)
   - [Mock Issues](#mock-issues)
7. [Docker Issues](#7-docker-issues)
8. [Kubernetes Issues](#8-kubernetes-issues)
9. [Performance Issues](#9-performance-issues)
10. [Logs and Debugging](#10-logs-and-debugging)

---

## 1. Development Setup

### Node Version Issues

#### Error: "The engine 'node' is incompatible with this module"

**Symptoms:**

```
error Found incompatible module.
error @festival/source@0.0.0: The engine "node" is incompatible with this module
Expected version ">=20.0.0"
Got "18.17.0"
```

**Solutions:**

```bash
# Option 1: Using nvm (recommended)
# Install nvm if not already installed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Install and use Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify version
node --version  # Should show v20.x.x

# Option 2: Using volta (alternative version manager)
curl https://get.volta.sh | bash
volta install node@20
```

#### Error: "Node.js version X is not supported"

**Symptoms:**

```
Node.js v16.x is not supported. Please upgrade to Node.js 20.x or later.
```

**Solution:**

```bash
# Check current version
node --version

# Upgrade using nvm
nvm install 20 --reinstall-packages-from=current
nvm use 20

# Or upgrade using Homebrew (macOS)
brew upgrade node

# Or using apt (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

### npm/pnpm Install Failures

#### Error: "EACCES permission denied"

**Symptoms:**

```
npm ERR! code EACCES
npm ERR! syscall mkdir
npm ERR! path /usr/local/lib/node_modules
npm ERR! errno -13
```

**Solutions:**

```bash
# Option 1: Fix npm permissions (recommended)
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Option 2: Use nvm (avoids permission issues entirely)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20

# DO NOT use sudo npm install!
```

#### Error: "ERESOLVE unable to resolve dependency tree"

**Symptoms:**

```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! peer dep missing: react@^17.0.0
```

**Solutions:**

```bash
# Option 1: Use --legacy-peer-deps (quick fix)
npm install --legacy-peer-deps

# Option 2: Clean install
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Option 3: Check for version conflicts
npm ls react
npm dedupe
```

#### Error: "gyp ERR! build error" (native module compilation)

**Symptoms:**

```
gyp ERR! build error
gyp ERR! stack Error: make failed with exit code: 2
```

**Solutions:**

```bash
# macOS: Install Xcode Command Line Tools
xcode-select --install

# Ubuntu/Debian: Install build essentials
sudo apt-get install -y build-essential python3

# Windows: Install Visual Studio Build Tools
npm install --global windows-build-tools

# Then reinstall
rm -rf node_modules
npm install
```

#### Error: "ENOENT: no such file or directory, open 'package.json'"

**Symptoms:**

```
npm ERR! code ENOENT
npm ERR! syscall open
npm ERR! path /path/to/festival/package.json
```

**Solutions:**

```bash
# Make sure you're in the project root
cd /path/to/festival
ls -la package.json  # Verify file exists

# If file is missing, clone the repository again
git clone https://github.com/your-org/festival.git
cd festival
npm install
```

---

### Prisma Generate Errors

#### Error: "Cannot find module '@prisma/client'"

**Symptoms:**

```
Error: Cannot find module '@prisma/client'
Require stack:
- /path/to/festival/apps/api/dist/main.js
```

**Solutions:**

```bash
# Generate Prisma client
npx prisma generate

# If that doesn't work, regenerate from scratch
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client
npm install
npx prisma generate

# Verify installation
ls node_modules/.prisma/client
```

#### Error: "Prisma schema validation error"

**Symptoms:**

```
Error: Prisma schema validation
error: Error validating model "User": The field `id` has the wrong type
```

**Solutions:**

```bash
# Validate the schema
npx prisma validate

# Format the schema (fixes formatting issues)
npx prisma format

# Check for syntax errors in prisma/schema.prisma
# Common issues:
# - Missing @id directive
# - Invalid relation definitions
# - Typos in field types
```

#### Error: "Environment variable not found: DATABASE_URL"

**Symptoms:**

```
error: Environment variable not found: DATABASE_URL.
  -->  prisma/schema.prisma:8
   |
 7 |   provider = "postgresql"
 8 |   url      = env("DATABASE_URL")
```

**Solutions:**

```bash
# Create .env file if it doesn't exist
cp .env.example .env

# Or set DATABASE_URL directly
export DATABASE_URL="postgresql://festival_user:festival_password@localhost:5432/festival_db"

# Verify the variable is set
echo $DATABASE_URL

# Then run prisma commands
npx prisma generate
```

---

### Docker Not Starting

#### Error: "Cannot connect to the Docker daemon"

**Symptoms:**

```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

**Solutions:**

```bash
# macOS: Start Docker Desktop application
open -a Docker

# Linux: Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Verify Docker is running
docker info
docker ps

# If using Docker Desktop, ensure it's running in the system tray
```

#### Error: "Port is already in use"

**Symptoms:**

```
Error response from daemon: driver failed programming external connectivity
Bind for 0.0.0.0:5432 failed: port is already allocated
```

**Solutions:**

```bash
# Find what's using the port
lsof -i :5432  # For PostgreSQL
lsof -i :6379  # For Redis
lsof -i :3000  # For API

# Kill the process (get PID from lsof output)
kill -9 <PID>

# Or change ports in docker-compose.override.yml
# Example for PostgreSQL:
# ports:
#   - '5433:5432'

# Or stop existing containers
docker-compose down
docker-compose up -d
```

#### Error: "no space left on device"

**Symptoms:**

```
Error response from daemon: no space left on device
```

**Solutions:**

```bash
# Check disk usage
df -h

# Clean Docker system (removes all unused data)
docker system prune -a --volumes

# Remove specific resources
docker image prune -a      # Remove unused images
docker container prune     # Remove stopped containers
docker volume prune        # Remove unused volumes
docker network prune       # Remove unused networks

# Check Docker disk usage
docker system df
```

#### Error: "docker-compose: command not found"

**Solutions:**

```bash
# Docker Compose V2 is included with Docker Desktop
# Use 'docker compose' instead of 'docker-compose'
docker compose up -d

# Or install standalone docker-compose
# Linux:
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# macOS with Homebrew:
brew install docker-compose
```

---

## 2. Database Issues

### Connection Refused

#### Error: "ECONNREFUSED 127.0.0.1:5432"

**Symptoms:**

```
Error: connect ECONNREFUSED 127.0.0.1:5432
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1141:16)
```

**Diagnostic Steps:**

```bash
# Step 1: Check if PostgreSQL is running
docker compose ps postgres
# Expected: festival-postgres   running

# Step 2: Check PostgreSQL logs
docker compose logs postgres --tail=50

# Step 3: Test connection directly
docker exec -it festival-postgres psql -U festival_user -d festival_db -c "SELECT 1"

# Step 4: Verify DATABASE_URL
echo $DATABASE_URL
# Expected format: postgresql://festival_user:password@localhost:5432/festival_db
```

**Solutions:**

```bash
# Solution 1: Start PostgreSQL if not running
docker compose up -d postgres

# Solution 2: Restart PostgreSQL
docker compose restart postgres

# Solution 3: Check .env file
cat .env | grep DATABASE_URL

# Solution 4: If using Docker, use container name or service name
# In docker-compose environment:
DATABASE_URL=postgresql://festival_user:password@postgres:5432/festival_db
# NOT: localhost (unless running outside Docker)

# Solution 5: Wait for PostgreSQL to be ready
docker compose up -d postgres
sleep 5  # Wait for startup
npx prisma migrate deploy
```

#### Error: "password authentication failed"

**Symptoms:**

```
Error: password authentication failed for user "festival_user"
```

**Solutions:**

```bash
# Verify credentials match between .env and docker-compose.yml
grep -E "POSTGRES_USER|POSTGRES_PASSWORD" .env
grep -E "POSTGRES_USER|POSTGRES_PASSWORD" docker-compose.yml

# Reset the database with correct credentials
docker compose down -v  # WARNING: Removes data!
docker compose up -d postgres

# Or update .env to match existing database credentials
```

---

### Migration Failures

#### Error: "P3009 migrate found failed migrations"

**Symptoms:**

```
Error: P3009
migrate found failed migrations in the target database,
new migrations will not be applied.
```

**Solutions:**

```bash
# Option 1: View migration status
npx prisma migrate status

# Option 2: Mark failed migration as applied (if it actually ran)
npx prisma migrate resolve --applied "20240101000000_migration_name"

# Option 3: Mark migration as rolled back
npx prisma migrate resolve --rolled-back "20240101000000_migration_name"

# Option 4: Reset database (DEVELOPMENT ONLY - destroys data!)
npx prisma migrate reset

# Option 5: Manual fix in production
# Connect to database and check _prisma_migrations table
docker exec -it festival-postgres psql -U festival_user -d festival_db
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;
```

#### Error: "P3006 Migration failed to apply"

**Symptoms:**

```
Error: P3006
Migration `20240101000000_add_users` failed to apply cleanly to the shadow database.
```

**Solutions:**

```bash
# Check the specific error in the migration file
cat prisma/migrations/20240101000000_add_users/migration.sql

# Common fixes:
# 1. Duplicate column/table - remove the CREATE statement
# 2. Missing dependency - reorder migrations
# 3. Syntax error - fix SQL

# After fixing, create a new migration
npx prisma migrate dev --name fixed_migration
```

#### Error: "P3014 Shadow database error"

**Solutions:**

```bash
# Prisma needs a shadow database for development migrations
# Add to DATABASE_URL or create manually:

# Option 1: Create shadow database
docker exec -it festival-postgres psql -U festival_user -d postgres -c "CREATE DATABASE festival_shadow;"

# Option 2: Disable shadow database (not recommended)
# In prisma/schema.prisma:
# datasource db {
#   shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
# }

# Option 3: Use db push instead (schema-only, no migrations)
npx prisma db push
```

---

### Prisma Client Not Generated

#### Error: "@prisma/client did not initialize"

**Symptoms:**

```
@prisma/client did not initialize yet. Please run "prisma generate"
and try to import it again.
```

**Solutions:**

```bash
# Step 1: Generate Prisma client
npx prisma generate

# Step 2: If error persists, clean and regenerate
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client
npm install @prisma/client
npx prisma generate

# Step 3: Verify generation succeeded
ls -la node_modules/.prisma/client/

# Step 4: Check schema is valid
npx prisma validate

# Step 5: In CI/CD, add prisma generate to build script
# package.json:
# "build": "npx prisma generate && nx build api"
```

---

## 3. Authentication Issues

### JWT Token Errors

#### Error: "Invalid token" or "jwt malformed"

**Symptoms:**

```
{
  "statusCode": 401,
  "message": "Invalid token",
  "error": "Unauthorized"
}
```

**Diagnostic Steps:**

```bash
# Step 1: Check JWT secret length (must be >= 64 characters)
echo -n "$JWT_SECRET" | wc -c

# Step 2: Decode token to inspect (without verification)
# Use jwt.io or:
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM..." | \
  cut -d. -f2 | base64 -d 2>/dev/null | jq .

# Step 3: Check if secrets match across all services
grep JWT_SECRET .env .env.development .env.production 2>/dev/null
```

**Solutions:**

```bash
# Solution 1: Generate strong JWT secret (64+ characters)
openssl rand -base64 64

# Solution 2: Update .env with new secret
JWT_SECRET=your_new_64_character_secret_here_must_be_very_long_and_random

# Solution 3: Restart API after changing secret
docker compose restart api

# Note: Changing JWT_SECRET will invalidate all existing tokens
# Users will need to log in again
```

#### Error: "jwt expired"

**Symptoms:**

```
{
  "statusCode": 401,
  "message": "jwt expired",
  "error": "Unauthorized"
}
```

**Solutions:**

```bash
# Check token expiry settings in .env
JWT_EXPIRES_IN=15m           # Access token (short-lived)
JWT_REFRESH_EXPIRES_IN=7d    # Refresh token (long-lived)

# Increase expiry if needed (balance security vs convenience)
JWT_EXPIRES_IN=1h

# Client should use refresh token to get new access token
# POST /auth/refresh with refreshToken in body or cookie
```

#### Error: "Token not provided"

**Solutions:**

```typescript
// Ensure token is sent in Authorization header:
// Authorization: Bearer <token>

// Or in cookies (if using httpOnly cookies)
// The token should be automatically sent with credentials: 'include'

// Client-side fix (Next.js/React):
fetch('/api/protected', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
  credentials: 'include', // For cookies
});
```

---

### Cookie Not Being Set

#### Symptoms: Login succeeds but cookie is not stored

**Diagnostic Steps:**

```bash
# Check response headers in browser DevTools
# Network tab -> Login request -> Response Headers
# Look for: Set-Cookie header

# Verify cookie settings in API response
curl -i -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Solutions:**

**1. Same-site/Cross-origin issues:**

```typescript
// In API (NestJS), ensure cookie options are correct:
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // true in production
  sameSite: 'lax', // or 'none' for cross-origin with secure: true
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

**2. CORS configuration:**

```typescript
// In main.ts
app.enableCors({
  origin: ['http://localhost:3000', 'http://localhost:4201'],
  credentials: true, // REQUIRED for cookies
});
```

**3. Frontend fetch configuration:**

```typescript
// Always include credentials
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // REQUIRED for cookies
  body: JSON.stringify({ email, password }),
});
```

**4. Secure cookie in development:**

```bash
# In .env for development:
NODE_ENV=development  # This should disable secure flag

# If testing HTTPS locally, enable secure cookies:
NODE_ENV=production
# And use HTTPS with valid certificate
```

---

### OAuth Redirect Issues

#### Error: "redirect_uri_mismatch"

**Symptoms:**

```
Error 400: redirect_uri_mismatch
The redirect URI in the request does not match the ones authorized for the OAuth client.
```

**Solutions:**

```bash
# Step 1: Check configured callback URL in .env
GOOGLE_CALLBACK_URL=http://localhost:3333/api/auth/google/callback

# Step 2: Verify URL matches exactly in Google/GitHub Console
# Google Cloud Console -> APIs & Services -> Credentials
# GitHub -> Settings -> Developer settings -> OAuth Apps

# Common mismatches:
# - http vs https
# - localhost vs 127.0.0.1
# - Missing /api prefix
# - Trailing slash difference

# Step 3: Update OAuth provider settings to include ALL redirect URIs:
# Development: http://localhost:3333/api/auth/google/callback
# Staging: https://staging.festival.com/api/auth/google/callback
# Production: https://festival.com/api/auth/google/callback
```

#### Error: "OAuth credentials not configured"

**Solutions:**

```bash
# Ensure OAuth is enabled and configured in .env
GOOGLE_OAUTH_ENABLED=true
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3333/api/auth/google/callback

# For GitHub:
GITHUB_OAUTH_ENABLED=true
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3333/api/auth/github/callback

# Restart API after adding credentials
docker compose restart api
```

#### Error: "Access blocked: Application not verified"

**Solutions:**

```
# For Google OAuth in development:
# 1. Add your email as a test user in Google Cloud Console
# 2. Go to OAuth consent screen -> Test users -> Add users

# For production:
# 1. Submit your app for verification
# 2. Complete security assessment if required
```

---

## 4. Build Issues

### TypeScript Errors

#### Error: "TS2307: Cannot find module '@festival/types'"

**Symptoms:**

```
error TS2307: Cannot find module '@festival/types' or its corresponding type declarations.
```

**Solutions:**

```bash
# Step 1: Check path aliases in tsconfig.base.json
cat tsconfig.base.json | jq '.compilerOptions.paths'

# Step 2: Verify the library exists
ls -la libs/types/src

# Step 3: Rebuild the library
npx nx build types

# Step 4: Reset TypeScript cache
rm -rf dist/ .nx/

# Step 5: Restart TypeScript server in VS Code
# Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

#### Error: "TS18046: 'X' is of type 'unknown'"

**Symptoms:**

```
error TS18046: 'error' is of type 'unknown'.
```

**Solutions:**

```typescript
// This is due to noUncheckedIndexedAccess in tsconfig
// Fix by adding type guards:

// Before (error):
catch (error) {
  console.log(error.message);
}

// After (fixed):
catch (error) {
  if (error instanceof Error) {
    console.log(error.message);
  }
}

// Or use type assertion if you're certain:
catch (error) {
  console.log((error as Error).message);
}
```

#### Error: "TS2339: Property 'X' does not exist on type"

**Solutions:**

```typescript
// Common causes and fixes:

// 1. Missing null check
const user = users[0]; // user might be undefined
user.name; // Error!

// Fix:
if (user) {
  user.name; // OK
}
// Or:
user?.name; // OK (optional chaining)

// 2. Object index access
const obj: Record<string, string> = {};
obj['key'].length; // Error! might be undefined

// Fix:
const value = obj['key'];
if (value) {
  value.length; // OK
}
```

---

### Missing Dependencies

#### Error: "Module not found: Can't resolve 'X'"

**Symptoms:**

```
Module not found: Can't resolve '@nestjs/swagger'
```

**Solutions:**

```bash
# Step 1: Check if dependency is in package.json
cat package.json | grep -i swagger

# Step 2: Install if missing
npm install @nestjs/swagger swagger-ui-express

# Step 3: If dependency exists but can't be found
rm -rf node_modules package-lock.json
npm install

# Step 4: Clear Nx cache
npx nx reset
npm install
```

#### Error: "Peer dependency not installed"

**Symptoms:**

```
npm WARN peer dep missing: react@^18.0.0, required by some-package@1.0.0
```

**Solutions:**

```bash
# Check overrides in package.json
cat package.json | jq '.overrides'

# Install peer dependencies
npm install react@18 react-dom@18

# Or add to overrides in package.json:
{
  "overrides": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  }
}
```

---

### Nx Cache Issues

#### Error: "Nx failed to execute command"

**Symptoms:**

```
> NX   Cannot find configuration for 'api'
```

**Solutions:**

```bash
# Step 1: Reset Nx cache completely
npx nx reset

# Step 2: Clear all caches
rm -rf .nx/ dist/ node_modules/.cache

# Step 3: Verify project configuration
npx nx show project api

# Step 4: Regenerate workspace
npx nx g @nx/workspace:fix-configuration
```

#### Error: Stale build output / Changes not reflected

**Symptoms:**

```
Code changes are not reflected in the running application
```

**Solutions:**

```bash
# Option 1: Skip cache for a single build
npx nx build api --skip-nx-cache

# Option 2: Clear and rebuild
npx nx reset
npx nx build api

# Option 3: Disable cache temporarily
NX_SKIP_NX_CACHE=true npx nx build api

# Option 4: Check for missing dependencies in build
npx nx graph  # Visualize dependencies
```

---

## 5. Runtime Issues

### API Not Responding

#### Symptoms: API returns 500 or doesn't respond

**Diagnostic Steps:**

```bash
# Step 1: Check if API is running
docker compose ps api
curl http://localhost:3333/api/health

# Step 2: Check API logs
docker compose logs api --tail=100

# Step 3: Check resource usage
docker stats festival-api

# Step 4: Test database connection
docker exec festival-api node -e "const {PrismaClient}=require('@prisma/client'); new PrismaClient().\$connect().then(()=>console.log('OK')).catch(console.error)"
```

**Common Causes and Solutions:**

```bash
# 1. Database not ready
docker compose restart postgres
sleep 10
docker compose restart api

# 2. Redis not ready
docker compose restart redis
docker compose restart api

# 3. Environment variables missing
docker compose exec api env | grep -E "DATABASE_URL|JWT_SECRET"

# 4. Port already in use
lsof -i :3333
kill -9 <PID>
docker compose up -d api

# 5. Out of memory
# Increase memory limit in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G
```

---

### WebSocket Connection Failed

#### Error: "WebSocket connection failed"

**Symptoms:**

```
WebSocket connection to 'ws://localhost:3333/socket.io/' failed
```

**Solutions:**

**1. Check WebSocket gateway is running:**

```bash
# Check API logs for WebSocket initialization
docker compose logs api | grep -i websocket
docker compose logs api | grep -i socket
```

**2. CORS configuration for WebSocket:**

```typescript
// In WebSocket gateway configuration
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:4201'],
    credentials: true
  },
  namespace: '/events'
})
```

**3. Nginx/Load balancer configuration:**

```nginx
# If using nginx as reverse proxy
location /socket.io/ {
    proxy_pass http://api:3333;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

**4. Client connection:**

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3333', {
  withCredentials: true,
  transports: ['websocket', 'polling'], // Try both
  auth: {
    token: 'your-jwt-token',
  },
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

---

### Stripe Webhooks Not Working

#### Symptoms: Payments succeed but system doesn't update

**Diagnostic Steps:**

```bash
# Step 1: Check webhook endpoint is accessible
curl -X POST http://localhost:3333/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{}'
# Should return 400 (bad signature), not 404

# Step 2: Check API logs for webhook events
docker compose logs api | grep -i webhook

# Step 3: Verify webhook secret
echo $STRIPE_WEBHOOK_SECRET
```

**Solutions:**

**1. Local development with Stripe CLI:**

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3333/api/webhooks/stripe

# Copy the webhook signing secret displayed and add to .env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Restart API
docker compose restart api

# Trigger a test event
stripe trigger payment_intent.succeeded
```

**2. Webhook endpoint must be public (no auth):**

```typescript
// In your controller, ensure webhook route is public
@Public()  // Skip JWT authentication
@Post('webhooks/stripe')
async handleStripeWebhook(@Req() req: RawBodyRequest<Request>) {
  // Webhook handling logic
}
```

**3. Raw body parsing for signature verification:**

```typescript
// In main.ts - enable raw body for webhooks
app.useBodyParser('raw', { type: 'application/json', limit: '10mb' });
```

**4. Verify webhook in Stripe Dashboard:**

```
1. Go to Stripe Dashboard -> Developers -> Webhooks
2. Check for failed webhook attempts
3. Verify endpoint URL matches your server
4. Check webhook secret matches your .env
```

---

## 6. Testing Issues

### Tests Failing

#### Error: "Cannot find module" in tests

**Symptoms:**

```
Cannot find module '@festival/types' from 'apps/api/src/module.ts'
```

**Solutions:**

```bash
# Step 1: Ensure jest.config uses correct moduleNameMapper
# Check apps/api/jest.config.ts:
moduleNameMapper: {
  '^@festival/(.*)$': '<rootDir>/../../libs/$1/src'
}

# Step 2: Generate Prisma client for tests
npx prisma generate

# Step 3: Build dependencies
npx nx build types
```

#### Error: "PrismaClient is not initialized"

**Solutions:**

```typescript
// In test setup, mock PrismaService
// Create apps/api/src/test/setup.ts:

import { PrismaService } from '../prisma/prisma.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));
```

#### Error: "Test timeout exceeded"

**Solutions:**

```typescript
// Increase timeout for slow tests
jest.setTimeout(30000);

// Or per-test:
it('slow test', async () => {
  // test code
}, 30000);

// Or in jest.config.ts:
export default {
  testTimeout: 30000,
};
```

#### Error: Database state pollution between tests

**Solutions:**

```typescript
// Use transactions for test isolation
describe('UserService', () => {
  let prisma: PrismaService;

  beforeEach(async () => {
    // Start transaction
    await prisma.$executeRaw`BEGIN`;
  });

  afterEach(async () => {
    // Rollback transaction
    await prisma.$executeRaw`ROLLBACK`;
  });
});

// Or use test database and reset between runs
beforeAll(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`;
});
```

---

### Mock Issues

#### Error: "Cannot spy on property because it is not a function"

**Solutions:**

```typescript
// Wrong:
jest.spyOn(service, 'property');

// Correct - mock the getter:
jest.spyOn(service, 'property', 'get').mockReturnValue('value');

// Or define property as function:
Object.defineProperty(service, 'property', {
  value: jest.fn().mockReturnValue('value'),
});
```

#### Error: Mock not being called

**Solutions:**

```typescript
// Ensure mock is defined BEFORE the code that uses it
jest.mock('./module', () => ({
  myFunction: jest.fn().mockReturnValue('mocked'),
}));

// Import AFTER mocking
import { myFunction } from './module';

// Verify mock is working
console.log(myFunction); // Should show [Function: mockConstructor]

// Check mock was called
expect(myFunction).toHaveBeenCalled();
expect(myFunction).toHaveBeenCalledWith(expectedArg);
```

#### Error: "Cannot mock a module that has already been imported"

**Solutions:**

```typescript
// Move jest.mock to the top of the file (hoisting)
jest.mock('./database'); // Must be at top level

// OR use jest.doMock for dynamic mocking
beforeEach(() => {
  jest.resetModules();
  jest.doMock('./database', () => ({
    query: jest.fn(),
  }));
});
```

---

## 7. Docker Issues

### Container Won't Start

**Diagnostic:**

```bash
docker compose logs <service> --tail=100
docker compose ps
docker inspect festival-<service>
```

**Common Solutions:**

```bash
# Rebuild containers
docker compose build --no-cache <service>
docker compose up -d <service>

# Remove and recreate
docker compose rm -f <service>
docker compose up -d <service>

# Check for volume issues
docker compose down -v  # WARNING: Removes volumes
docker compose up -d
```

### Image Too Large

**Solutions:**

```dockerfile
# Use multi-stage builds (already implemented)
# Dockerfile.api

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/main.js"]
```

```bash
# Clean up unused images
docker image prune -a

# Check image size
docker images | grep festival
```

---

## 8. Kubernetes Issues

### Pod CrashLoopBackOff

**Diagnostic:**

```bash
kubectl logs -n festival deployment/festival-api --previous
kubectl describe pod -n festival -l app=festival-api
kubectl get events -n festival --sort-by='.lastTimestamp'
```

**Common Causes:**

```bash
# 1. Missing secrets
kubectl get secrets -n festival
kubectl describe secret festival-secrets -n festival

# 2. Missing ConfigMap
kubectl get configmap -n festival

# 3. Resource limits too low
kubectl top pods -n festival
# Increase in deployment.yaml

# 4. Health check failing
kubectl exec -it -n festival deploy/festival-api -- wget -qO- http://localhost:3000/api/health
```

### Service Not Accessible

```bash
# Check service
kubectl get svc -n festival

# Check endpoints
kubectl get endpoints -n festival

# Test from within cluster
kubectl run debug --rm -it --image=alpine -- wget -qO- http://festival-api:3000/api/health

# Check ingress
kubectl get ingress -n festival
kubectl describe ingress festival-ingress -n festival
```

---

## 9. Performance Issues

### Slow API Responses (>500ms)

**Diagnostic:**

```bash
# Check metrics
curl http://localhost:3333/monitoring/metrics

# Analyze slow queries (PostgreSQL)
docker exec -it festival-postgres psql -U festival_user -d festival_db \
  -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

**Solutions:**

```bash
# 1. Enable Redis caching
REDIS_URL=redis://localhost:6379
# Restart API

# 2. Check for N+1 queries
# Add logging in Prisma:
const prisma = new PrismaClient({
  log: ['query'],
});

# 3. Add database indexes
# Check prisma/schema.prisma for missing @@index

# 4. Increase connection pool
DATABASE_POOL_MAX=20
```

### Memory Leak

**Diagnostic:**

```bash
docker stats festival-api
# Watch memory grow over time

# Profile Node.js
node --inspect apps/api/dist/main.js
# Connect Chrome DevTools to chrome://inspect
```

**Solutions:**

```typescript
// Clean up event listeners
onModuleDestroy() {
  this.eventEmitter.removeAllListeners();
}

// Limit query results
const users = await prisma.user.findMany({
  take: 100,  // Always limit
});

// Enable garbage collection logging
node --expose-gc --trace-gc apps/api/dist/main.js
```

---

## 10. Logs and Debugging

### Enable Detailed Logging

```bash
# Development
LOG_LEVEL=debug npm run start:dev

# Production (careful with performance)
LOG_LEVEL=verbose docker compose up -d api
```

### Find Errors in Logs

```bash
# Docker Compose
docker compose logs -f api 2>&1 | grep -i error

# Kubernetes
kubectl logs -n festival -l app=festival-api --since=1h | grep -i error

# Filter by timestamp
docker compose logs --since="2024-01-01T10:00:00" api
```

### VS Code Debugging

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to API",
      "port": 9229,
      "restart": true,
      "sourceMaps": true,
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/app"
    }
  ]
}
```

```bash
# Start API in debug mode
node --inspect=0.0.0.0:9229 dist/apps/api/main.js
```

### Analyze SQL Queries

```typescript
// Enable Prisma query logging
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'info', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
    { level: 'error', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

---

## Quick Reference: Common Commands

```bash
# Development setup
npm install                          # Install dependencies
npx prisma generate                  # Generate Prisma client
npx prisma migrate dev               # Run migrations
docker compose up -d                 # Start services

# Building
npx nx build api --skip-nx-cache     # Build API (skip cache)
npx nx build web                     # Build web app
npx nx run-many --target=build --all # Build everything

# Testing
npx nx test api                      # Test API
npx nx test api --testFile=auth      # Test specific file
npx nx test api --coverage           # Test with coverage

# Database
npx prisma studio                    # Visual database browser
npx prisma migrate reset             # Reset database (dev only)
npx prisma db seed                   # Seed database

# Docker
docker compose logs api -f           # Follow API logs
docker compose restart api           # Restart API
docker system prune -a               # Clean Docker

# Kubernetes
kubectl logs -n festival -l app=api  # View logs
kubectl rollout restart -n festival deployment/api  # Restart
```

---

## Additional Resources

- [API Documentation](./api/API_GUIDE.md)
- [API Reference](./api/API_REFERENCE.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Kubernetes Deployment](./KUBERNETES_DEPLOYMENT.md)
- [OAuth Setup Guide](./OAUTH_SETUP.md)
- [Security Configuration](./security/PRODUCTION_CONFIG.md)

---

## Getting Help

If the problem persists after following this guide:

1. **Search existing issues** on GitHub
2. **Open a new issue** with:
   - Clear problem description
   - Error message and stack trace
   - Steps to reproduce
   - Environment info (OS, Node version, Docker version)
   - Relevant log output
3. **Contact the team**: support@festival-platform.com

---

_Last updated: January 2026_
