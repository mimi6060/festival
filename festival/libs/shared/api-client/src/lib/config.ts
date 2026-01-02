/**
 * API Client Configuration
 * Centralized configuration for the API client
 */

import type { ApiClientConfig } from './types';

// ============================================================================
// Environment Detection
// ============================================================================

const isBrowser = typeof window !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions?.node;

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Get environment variable safely (works in both browser and Node.js)
 */
function getEnvVar(key: string, defaultValue: string = ''): string {
  if (isNode && process.env[key]) {
    return process.env[key] as string;
  }
  if (isBrowser && typeof (window as unknown as Record<string, unknown>)[`__ENV_${key}__`] === 'string') {
    return (window as unknown as Record<string, string>)[`__ENV_${key}__`];
  }
  // Next.js public env vars
  if (isBrowser && typeof process !== 'undefined' && process.env) {
    const nextKey = `NEXT_PUBLIC_${key}`;
    if (process.env[nextKey]) {
      return process.env[nextKey] as string;
    }
  }
  return defaultValue;
}

/**
 * Default API client configuration
 */
export const DEFAULT_CONFIG: Required<ApiClientConfig> = {
  baseURL: getEnvVar('API_URL', 'http://localhost:3000/api/v1'),
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
};

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * API endpoint paths organized by domain
 */
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    CHANGE_PASSWORD: '/auth/change-password',
  },

  // Users
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    PROFILE: '/users/profile',
    PREFERENCES: '/users/preferences',
    AVATAR: '/users/avatar',
  },

  // Festivals
  FESTIVALS: {
    BASE: '/festivals',
    BY_ID: (id: string) => `/festivals/${id}`,
    BY_SLUG: (slug: string) => `/festivals/slug/${slug}`,
    STATS: (id: string) => `/festivals/${id}/stats`,
    PUBLISH: (id: string) => `/festivals/${id}/publish`,
    ARCHIVE: (id: string) => `/festivals/${id}/archive`,
  },

  // Tickets
  TICKETS: {
    BASE: '/tickets',
    BY_ID: (id: string) => `/tickets/${id}`,
    MY_TICKETS: '/tickets/me',
    BUY: '/tickets/buy',
    CANCEL: (id: string) => `/tickets/${id}/cancel`,
    VALIDATE: (id: string) => `/tickets/${id}/validate`,
    QR_CODE: (id: string) => `/tickets/${id}/qr`,
    CATEGORIES: {
      BASE: '/ticket-categories',
      BY_ID: (id: string) => `/ticket-categories/${id}`,
      BY_FESTIVAL: (festivalId: string) =>
        `/festivals/${festivalId}/ticket-categories`,
    },
  },

  // Payments
  PAYMENTS: {
    BASE: '/payments',
    BY_ID: (id: string) => `/payments/${id}`,
    CREATE_CHECKOUT: '/payments/checkout',
    CREATE_INTENT: '/payments/intent',
    REFUND: (id: string) => `/payments/${id}/refund`,
    METHODS: '/payments/methods',
    INVOICES: '/payments/invoices',
    INVOICE_BY_ID: (id: string) => `/payments/invoices/${id}`,
  },

  // Cashless
  CASHLESS: {
    BASE: '/cashless',
    ACCOUNTS: '/cashless/accounts',
    ACCOUNT_BY_ID: (id: string) => `/cashless/accounts/${id}`,
    MY_ACCOUNT: '/cashless/me',
    TOPUP: '/cashless/topup',
    PAY: '/cashless/pay',
    TRANSFER: '/cashless/transfer',
    REFUND: '/cashless/refund',
    CASHOUT: '/cashless/cashout',
    SET_PIN: '/cashless/pin',
    TRANSACTIONS: '/cashless/transactions',
    STATS: (festivalId: string) => `/cashless/festivals/${festivalId}/stats`,
    ACTIVATE: '/cashless/activate',
    LINK_NFC: '/cashless/link-nfc',
  },

  // Program (Artists, Stages, Performances)
  PROGRAM: {
    // Artists
    ARTISTS: {
      BASE: '/artists',
      BY_ID: (id: string) => `/artists/${id}`,
      BY_SLUG: (slug: string) => `/artists/slug/${slug}`,
      BY_FESTIVAL: (festivalId: string) => `/festivals/${festivalId}/artists`,
    },
    // Stages
    STAGES: {
      BASE: '/stages',
      BY_ID: (id: string) => `/stages/${id}`,
      BY_FESTIVAL: (festivalId: string) => `/festivals/${festivalId}/stages`,
    },
    // Performances
    PERFORMANCES: {
      BASE: '/performances',
      BY_ID: (id: string) => `/performances/${id}`,
      BY_FESTIVAL: (festivalId: string) =>
        `/festivals/${festivalId}/performances`,
      BY_ARTIST: (artistId: string) => `/artists/${artistId}/performances`,
      BY_STAGE: (stageId: string) => `/stages/${stageId}/performances`,
    },
    // Full program
    SCHEDULE: (festivalId: string) => `/festivals/${festivalId}/schedule`,
    FULL_PROGRAM: (festivalId: string) => `/festivals/${festivalId}/program`,
  },

  // Notifications
  NOTIFICATIONS: {
    BASE: '/notifications',
    BY_ID: (id: string) => `/notifications/${id}`,
    UNREAD: '/notifications/unread',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    PREFERENCES: '/notifications/preferences',
    REGISTER_DEVICE: '/notifications/devices',
    UNREGISTER_DEVICE: (deviceId: string) => `/notifications/devices/${deviceId}`,
  },

  // Health
  HEALTH: {
    STATUS: '/health',
    LIVE: '/health/live',
    READY: '/health/ready',
  },
} as const;

// ============================================================================
// HTTP Status Codes
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// ============================================================================
// Cache Keys
// ============================================================================

/**
 * Query cache key factories for React Query
 */
export const QUERY_KEYS = {
  // Auth
  auth: {
    all: ['auth'] as const,
    me: () => [...QUERY_KEYS.auth.all, 'me'] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...QUERY_KEYS.users.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...QUERY_KEYS.users.lists(), filters] as const,
    details: () => [...QUERY_KEYS.users.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.users.details(), id] as const,
    profile: () => [...QUERY_KEYS.users.all, 'profile'] as const,
  },

  // Festivals
  festivals: {
    all: ['festivals'] as const,
    lists: () => [...QUERY_KEYS.festivals.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...QUERY_KEYS.festivals.lists(), filters] as const,
    details: () => [...QUERY_KEYS.festivals.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.festivals.details(), id] as const,
    bySlug: (slug: string) =>
      [...QUERY_KEYS.festivals.all, 'slug', slug] as const,
    stats: (id: string) =>
      [...QUERY_KEYS.festivals.detail(id), 'stats'] as const,
  },

  // Tickets
  tickets: {
    all: ['tickets'] as const,
    lists: () => [...QUERY_KEYS.tickets.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...QUERY_KEYS.tickets.lists(), filters] as const,
    details: () => [...QUERY_KEYS.tickets.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.tickets.details(), id] as const,
    myTickets: () => [...QUERY_KEYS.tickets.all, 'my'] as const,
    categories: (festivalId: string) =>
      [...QUERY_KEYS.tickets.all, 'categories', festivalId] as const,
  },

  // Payments
  payments: {
    all: ['payments'] as const,
    lists: () => [...QUERY_KEYS.payments.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...QUERY_KEYS.payments.lists(), filters] as const,
    details: () => [...QUERY_KEYS.payments.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.payments.details(), id] as const,
    methods: () => [...QUERY_KEYS.payments.all, 'methods'] as const,
    invoices: () => [...QUERY_KEYS.payments.all, 'invoices'] as const,
  },

  // Cashless
  cashless: {
    all: ['cashless'] as const,
    myAccount: () => [...QUERY_KEYS.cashless.all, 'me'] as const,
    account: (id: string) => [...QUERY_KEYS.cashless.all, 'account', id] as const,
    transactions: (filters?: Record<string, unknown>) =>
      [...QUERY_KEYS.cashless.all, 'transactions', filters] as const,
    stats: (festivalId: string) =>
      [...QUERY_KEYS.cashless.all, 'stats', festivalId] as const,
  },

  // Program
  program: {
    all: ['program'] as const,
    artists: {
      all: () => [...QUERY_KEYS.program.all, 'artists'] as const,
      list: (festivalId: string, filters?: Record<string, unknown>) =>
        [...QUERY_KEYS.program.artists.all(), festivalId, filters] as const,
      detail: (id: string) =>
        [...QUERY_KEYS.program.artists.all(), 'detail', id] as const,
    },
    stages: {
      all: () => [...QUERY_KEYS.program.all, 'stages'] as const,
      list: (festivalId: string) =>
        [...QUERY_KEYS.program.stages.all(), festivalId] as const,
      detail: (id: string) =>
        [...QUERY_KEYS.program.stages.all(), 'detail', id] as const,
    },
    performances: {
      all: () => [...QUERY_KEYS.program.all, 'performances'] as const,
      list: (festivalId: string, filters?: Record<string, unknown>) =>
        [...QUERY_KEYS.program.performances.all(), festivalId, filters] as const,
      detail: (id: string) =>
        [...QUERY_KEYS.program.performances.all(), 'detail', id] as const,
    },
    schedule: (festivalId: string) =>
      [...QUERY_KEYS.program.all, 'schedule', festivalId] as const,
    fullProgram: (festivalId: string) =>
      [...QUERY_KEYS.program.all, 'full', festivalId] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...QUERY_KEYS.notifications.all, 'list', filters] as const,
    unread: () => [...QUERY_KEYS.notifications.all, 'unread'] as const,
    preferences: () =>
      [...QUERY_KEYS.notifications.all, 'preferences'] as const,
  },
} as const;
