/**
 * Sentry Configuration
 *
 * This file contains configuration for Sentry source maps upload
 * and other build-time settings.
 */

export interface SentryBuildConfig {
  org: string;
  project: string;
  authToken: string;
  release: string;
  environment: string;
  sourceMapsPath: string;
  urlPrefix: string;
}

/**
 * Get Sentry build configuration from environment variables
 */
export function getSentryBuildConfig(): SentryBuildConfig | null {
  const authToken = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG || 'festival';
  const project = process.env.SENTRY_PROJECT || 'festival-api';

  if (!authToken) {
    console.log('[Sentry] No auth token provided, skipping source maps upload');
    return null;
  }

  return {
    org,
    project,
    authToken,
    release:
      process.env.SENTRY_RELEASE ||
      `festival-api@${process.env.npm_package_version || '0.0.0'}`,
    environment: process.env.SENTRY_ENVIRONMENT || 'development',
    sourceMapsPath: './dist',
    urlPrefix: '~/',
  };
}
