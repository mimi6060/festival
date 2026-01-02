#!/bin/bash

# Sentry Source Maps Upload Script
# This script uploads source maps to Sentry for better error stack traces

set -e

# Check for required environment variables
if [ -z "$SENTRY_AUTH_TOKEN" ]; then
  echo "Error: SENTRY_AUTH_TOKEN is not set"
  exit 1
fi

if [ -z "$SENTRY_ORG" ]; then
  echo "Warning: SENTRY_ORG not set, using default 'festival'"
  SENTRY_ORG="festival"
fi

if [ -z "$SENTRY_PROJECT" ]; then
  echo "Warning: SENTRY_PROJECT not set, using default 'festival-api'"
  SENTRY_PROJECT="festival-api"
fi

# Get release version from package.json or environment
if [ -z "$SENTRY_RELEASE" ]; then
  VERSION=$(node -p "require('./package.json').version")
  SENTRY_RELEASE="festival-api@${VERSION}"
fi

echo "Uploading source maps to Sentry..."
echo "  Organization: $SENTRY_ORG"
echo "  Project: $SENTRY_PROJECT"
echo "  Release: $SENTRY_RELEASE"

# Create a new Sentry release
npx @sentry/cli releases new "$SENTRY_RELEASE" \
  --org "$SENTRY_ORG" \
  --project "$SENTRY_PROJECT"

# Upload source maps
npx @sentry/cli releases files "$SENTRY_RELEASE" upload-sourcemaps \
  --org "$SENTRY_ORG" \
  --project "$SENTRY_PROJECT" \
  ./dist/api \
  --url-prefix '~/' \
  --rewrite

# Associate commits with the release (if in a git repo)
if [ -d ".git" ]; then
  echo "Associating commits with release..."
  npx @sentry/cli releases set-commits "$SENTRY_RELEASE" \
    --org "$SENTRY_ORG" \
    --project "$SENTRY_PROJECT" \
    --auto
fi

# Finalize the release
npx @sentry/cli releases finalize "$SENTRY_RELEASE" \
  --org "$SENTRY_ORG" \
  --project "$SENTRY_PROJECT"

echo "Source maps uploaded successfully!"
