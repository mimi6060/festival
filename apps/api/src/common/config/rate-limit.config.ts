/**
 * Rate Limit Configuration
 *
 * Centralized configuration for all rate limiting parameters.
 * This file defines quotas per plan, endpoint-specific limits,
 * and global rate limiting settings.
 *
 * @module RateLimitConfig
 */

import { UserPlan } from '../guards/rate-limit.guard';

// ============================================================================
// Plan Quotas Configuration
// ============================================================================

/**
 * Rate limit quotas per user plan
 *
 * These define the base limits that apply to all endpoints
 * unless overridden by endpoint-specific configurations.
 */
export const PLAN_QUOTAS = {
  [UserPlan.FREE]: {
    // API limits
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,

    // Feature limits
    maxTicketPurchasesPerHour: 5,
    maxPaymentAttemptsPerHour: 10,
    maxCashlessTopupsPerDay: 10,
    maxExportsPerDay: 5,
    maxSupportTicketsPerDay: 3,

    // Data limits
    maxUploadSizeMB: 5,
    maxBatchSize: 10,

    // Concurrent limits
    maxConcurrentConnections: 5,
    maxWebSocketConnections: 2,
  },

  [UserPlan.PREMIUM]: {
    // API limits
    requestsPerMinute: 300,
    requestsPerHour: 10000,
    requestsPerDay: 100000,

    // Feature limits
    maxTicketPurchasesPerHour: 50,
    maxPaymentAttemptsPerHour: 100,
    maxCashlessTopupsPerDay: 50,
    maxExportsPerDay: 50,
    maxSupportTicketsPerDay: 20,

    // Data limits
    maxUploadSizeMB: 50,
    maxBatchSize: 100,

    // Concurrent limits
    maxConcurrentConnections: 50,
    maxWebSocketConnections: 10,
  },

  [UserPlan.ENTERPRISE]: {
    // API limits
    requestsPerMinute: 1000,
    requestsPerHour: 50000,
    requestsPerDay: 500000,

    // Feature limits
    maxTicketPurchasesPerHour: 500,
    maxPaymentAttemptsPerHour: 1000,
    maxCashlessTopupsPerDay: 500,
    maxExportsPerDay: 500,
    maxSupportTicketsPerDay: 100,

    // Data limits
    maxUploadSizeMB: 100,
    maxBatchSize: 1000,

    // Concurrent limits
    maxConcurrentConnections: 200,
    maxWebSocketConnections: 50,
  },

  [UserPlan.INTERNAL]: {
    // Unlimited for internal services
    requestsPerMinute: 100000,
    requestsPerHour: 1000000,
    requestsPerDay: 10000000,

    maxTicketPurchasesPerHour: 10000,
    maxPaymentAttemptsPerHour: 10000,
    maxCashlessTopupsPerDay: 10000,
    maxExportsPerDay: 10000,
    maxSupportTicketsPerDay: 1000,

    maxUploadSizeMB: 500,
    maxBatchSize: 10000,

    maxConcurrentConnections: 1000,
    maxWebSocketConnections: 500,
  },
};

// ============================================================================
// Endpoint Rate Limits Configuration
// ============================================================================

/**
 * Endpoint-specific rate limit configurations
 *
 * Format: 'METHOD:PATH' => { limit, window, keyPrefix, ... }
 */
export const ENDPOINT_LIMITS = {
  // =========================================================================
  // Authentication Endpoints (Strict limits to prevent brute force)
  // =========================================================================
  auth: {
    login: {
      path: 'POST:/api/auth/login',
      limit: 5,
      windowSeconds: 300, // 5 attempts per 5 minutes
      perUser: false, // Per IP since user unknown
      errorMessage: 'Too many login attempts. Your account may be temporarily locked.',
    },
    register: {
      path: 'POST:/api/auth/register',
      limit: 3,
      windowSeconds: 3600, // 3 per hour per IP
      perUser: false,
      errorMessage: 'Too many registration attempts. Please try again later.',
    },
    forgotPassword: {
      path: 'POST:/api/auth/forgot-password',
      limit: 3,
      windowSeconds: 3600,
      perUser: false,
      errorMessage: 'Too many password reset requests.',
    },
    verifyEmail: {
      path: 'POST:/api/auth/verify-email',
      limit: 10,
      windowSeconds: 3600,
      perUser: false,
    },
    resendVerification: {
      path: 'POST:/api/auth/resend-verification',
      limit: 3,
      windowSeconds: 900, // 3 per 15 minutes
      perUser: false,
    },
    refresh: {
      path: 'POST:/api/auth/refresh',
      limit: 30,
      windowSeconds: 60,
      perUser: true,
    },
  },

  // =========================================================================
  // Payment Endpoints (Moderate limits for fraud prevention)
  // =========================================================================
  payments: {
    checkout: {
      path: 'POST:/api/payments/checkout',
      limit: 10,
      windowSeconds: 60,
      perUser: true,
      errorMessage: 'Too many payment attempts. Please wait before trying again.',
      cost: 5, // Weighted - counts as 5 requests
    },
    refund: {
      path: 'POST:/api/payments/refund',
      limit: 5,
      windowSeconds: 300,
      perUser: true,
      cost: 10,
    },
    webhook: {
      path: 'POST:/api/webhooks/stripe',
      limit: 1000,
      windowSeconds: 60,
      perUser: false,
      skipAuthenticated: true,
    },
  },

  // =========================================================================
  // Cashless Endpoints
  // =========================================================================
  cashless: {
    topup: {
      path: 'POST:/api/cashless/topup',
      limit: 10,
      windowSeconds: 60,
      perUser: true,
    },
    pay: {
      path: 'POST:/api/cashless/pay',
      limit: 60,
      windowSeconds: 60, // Higher for POS usage
      perUser: true,
    },
    transfer: {
      path: 'POST:/api/cashless/transfer',
      limit: 20,
      windowSeconds: 300,
      perUser: true,
    },
    balance: {
      path: 'GET:/api/cashless/balance',
      limit: 60,
      windowSeconds: 60,
      perUser: true,
    },
  },

  // =========================================================================
  // Ticket Endpoints
  // =========================================================================
  tickets: {
    buy: {
      path: 'POST:/api/tickets/buy',
      limit: 10,
      windowSeconds: 60,
      perUser: true,
      errorMessage: 'Too many purchase attempts. Please wait before trying again.',
      cost: 5,
    },
    validate: {
      path: 'POST:/api/tickets/validate',
      limit: 120,
      windowSeconds: 60, // High for entry scanning
      perUser: true,
    },
    list: {
      path: 'GET:/api/tickets/me',
      limit: 60,
      windowSeconds: 60,
      perUser: true,
    },
    cancel: {
      path: 'POST:/api/tickets/*/cancel',
      limit: 5,
      windowSeconds: 300,
      perUser: true,
    },
  },

  // =========================================================================
  // Export Endpoints (Low limits due to resource intensity)
  // =========================================================================
  exports: {
    analytics: {
      path: 'GET:/api/analytics/export',
      limit: 5,
      windowSeconds: 300,
      perUser: true,
      cost: 20,
    },
    tickets: {
      path: 'GET:/api/tickets/export',
      limit: 5,
      windowSeconds: 300,
      perUser: true,
      cost: 20,
    },
    users: {
      path: 'GET:/api/users/export',
      limit: 5,
      windowSeconds: 300,
      perUser: true,
      cost: 20,
    },
    transactions: {
      path: 'GET:/api/cashless/export',
      limit: 5,
      windowSeconds: 300,
      perUser: true,
      cost: 20,
    },
  },

  // =========================================================================
  // Search Endpoints
  // =========================================================================
  search: {
    global: {
      path: 'GET:/api/search',
      limit: 30,
      windowSeconds: 60,
      perUser: false,
    },
    users: {
      path: 'GET:/api/users/search',
      limit: 30,
      windowSeconds: 60,
      perUser: true,
    },
    festivals: {
      path: 'GET:/api/festivals/search',
      limit: 60,
      windowSeconds: 60,
      perUser: false,
    },
  },

  // =========================================================================
  // Zone Access Endpoints (High limits for scanning)
  // =========================================================================
  zones: {
    scan: {
      path: 'POST:/api/zones/*/scan',
      limit: 180,
      windowSeconds: 60, // 3 scans per second
      perUser: true,
    },
    occupancy: {
      path: 'GET:/api/zones/*/occupancy',
      limit: 120,
      windowSeconds: 60,
      perUser: true,
    },
  },

  // =========================================================================
  // Notification Endpoints
  // =========================================================================
  notifications: {
    send: {
      path: 'POST:/api/notifications/send',
      limit: 100,
      windowSeconds: 60,
      perUser: true,
    },
    broadcast: {
      path: 'POST:/api/notifications/broadcast',
      limit: 10,
      windowSeconds: 300,
      perUser: true,
      cost: 50,
    },
  },

  // =========================================================================
  // Support Endpoints
  // =========================================================================
  support: {
    createTicket: {
      path: 'POST:/api/support/tickets',
      limit: 5,
      windowSeconds: 3600,
      perUser: true,
    },
    sendMessage: {
      path: 'POST:/api/support/tickets/*/messages',
      limit: 30,
      windowSeconds: 60,
      perUser: true,
    },
  },

  // =========================================================================
  // Admin Endpoints
  // =========================================================================
  admin: {
    bulkOperations: {
      path: 'POST:/api/admin/bulk/*',
      limit: 5,
      windowSeconds: 60,
      perUser: true,
      cost: 50,
    },
    reports: {
      path: 'GET:/api/admin/reports/*',
      limit: 10,
      windowSeconds: 300,
      perUser: true,
      cost: 10,
    },
  },
};

// ============================================================================
// Global Rate Limit Settings
// ============================================================================

export const GLOBAL_RATE_LIMIT_CONFIG = {
  // Default limits for unlisted endpoints
  defaultLimit: 100,
  defaultWindowSeconds: 60,

  // Skip rate limiting in certain conditions
  skipForRoles: ['SUPER_ADMIN'],
  skipForPaths: ['/api/health', '/api/docs', '/api/metrics'],

  // Whitelist (bypass rate limiting entirely)
  ipWhitelist: process.env.RATE_LIMIT_WHITELIST?.split(',').filter(Boolean) || [],

  // Headers configuration
  headers: {
    // Standard headers
    limit: 'X-RateLimit-Limit',
    remaining: 'X-RateLimit-Remaining',
    reset: 'X-RateLimit-Reset',
    window: 'X-RateLimit-Window',
    policy: 'X-RateLimit-Policy',
    plan: 'X-RateLimit-Plan',
    cost: 'X-RateLimit-Cost',

    // IETF draft standard headers
    ietfLimit: 'RateLimit-Limit',
    ietfRemaining: 'RateLimit-Remaining',
    ietfReset: 'RateLimit-Reset',
  },

  // Error response configuration
  errorResponse: {
    statusCode: 429,
    error: 'Too Many Requests',
    defaultMessage: 'Rate limit exceeded. Please try again later.',
  },

  // Redis configuration
  redis: {
    keyPrefix: 'ratelimit:',
    keyTTL: 3600, // 1 hour
  },

  // Metrics collection
  metrics: {
    enabled: true,
    collectInterval: 60000, // 1 minute
    retentionPeriod: 86400, // 24 hours
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get quota for a specific plan and feature
 */
export function getPlanQuota(plan: UserPlan, feature: keyof typeof PLAN_QUOTAS[UserPlan.FREE]): number {
  return PLAN_QUOTAS[plan]?.[feature] || PLAN_QUOTAS[UserPlan.FREE][feature];
}

/**
 * Get endpoint rate limit configuration
 */
export function getEndpointLimit(method: string, path: string): typeof ENDPOINT_LIMITS['auth']['login'] | null {
  const key = `${method}:${path}`;

  for (const category of Object.values(ENDPOINT_LIMITS)) {
    for (const config of Object.values(category)) {
      if (config.path === key) {
        return config;
      }
      // Check for wildcard patterns
      if (config.path.includes('*')) {
        const regex = new RegExp('^' + config.path.replace(/\*/g, '[^/]+') + '$');
        if (regex.test(key)) {
          return config;
        }
      }
    }
  }

  return null;
}

/**
 * Check if an IP is whitelisted
 */
export function isIpWhitelisted(ip: string): boolean {
  return GLOBAL_RATE_LIMIT_CONFIG.ipWhitelist.includes(ip);
}

/**
 * Check if a path should skip rate limiting
 */
export function shouldSkipPath(path: string): boolean {
  return GLOBAL_RATE_LIMIT_CONFIG.skipForPaths.some(
    (skipPath) => path === skipPath || path.startsWith(skipPath + '/'),
  );
}

/**
 * Check if a role should skip rate limiting
 */
export function shouldSkipRole(role: string): boolean {
  return GLOBAL_RATE_LIMIT_CONFIG.skipForRoles.includes(role);
}
