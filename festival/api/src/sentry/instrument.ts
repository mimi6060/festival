/**
 * Sentry Instrumentation File
 *
 * This file must be imported BEFORE any other imports in main.ts
 * It initializes Sentry with tracing and error monitoring.
 */

import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const dsn = process.env.SENTRY_DSN;

// Only initialize Sentry if DSN is provided
if (dsn) {
  Sentry.init({
    dsn,
    environment,

    // Release version - typically set during build
    release: process.env.SENTRY_RELEASE || `festival-api@${process.env.npm_package_version || '0.0.0'}`,

    // Performance Monitoring
    tracesSampleRate: getTracesSampleRate(environment),

    // Profiling (only in production/staging for performance)
    profilesSampleRate: getProfilesSampleRate(environment),

    integrations: [
      // Enable profiling
      nodeProfilingIntegration(),
    ],

    // Filter out health check endpoints from transactions
    ignoreTransactions: [
      '/api/health',
      '/api/health/ready',
      '/api/health/live',
    ],

    // Don't send errors in development unless explicitly enabled
    enabled: environment !== 'development' || process.env.SENTRY_ENABLED === 'true',

    // Configure which errors to ignore
    ignoreErrors: [
      // Ignore common client errors
      'UnauthorizedException',
      'ForbiddenException',
      'NotFoundException',
      'BadRequestException',
    ],

    // Before sending an event, we can modify or drop it
    beforeSend(event, hint) {
      // Add additional context
      if (event.contexts) {
        event.contexts.runtime = {
          name: 'node',
          version: process.version,
        };
      }

      // In development, log the error instead of sending
      if (environment === 'development' && process.env.SENTRY_ENABLED !== 'true') {
        console.log('[Sentry] Would have sent event:', event.event_id);
        return null;
      }

      return event;
    },

    // Before sending a transaction, we can modify or drop it
    beforeSendTransaction(transaction) {
      // Filter out noisy transactions
      const transactionName = transaction.transaction;
      if (transactionName?.includes('health')) {
        return null;
      }
      return transaction;
    },
  });

  console.log(`[Sentry] Initialized for environment: ${environment}`);
} else {
  console.log('[Sentry] DSN not provided, Sentry is disabled');
}

/**
 * Get traces sample rate based on environment
 */
function getTracesSampleRate(env: string): number {
  switch (env) {
    case 'production':
      return 0.1; // Sample 10% in production
    case 'staging':
      return 0.5; // Sample 50% in staging
    default:
      return 1.0; // Sample everything in development
  }
}

/**
 * Get profiles sample rate based on environment
 */
function getProfilesSampleRate(env: string): number {
  switch (env) {
    case 'production':
      return 0.1; // Profile 10% of sampled transactions
    case 'staging':
      return 0.3; // Profile 30% of sampled transactions
    default:
      return 0; // No profiling in development
  }
}
