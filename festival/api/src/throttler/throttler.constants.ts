/**
 * Rate Limiting Constants
 * Defines rate limit configurations for different endpoint types
 */

// Rate limit configurations (requests per time window)
export const THROTTLE_CONFIG = {
  // Global rate limit: 100 requests per minute
  GLOBAL: {
    name: 'global',
    ttl: 60000, // 1 minute in milliseconds
    limit: 100,
  },

  // Auth endpoints: 5 requests per minute (anti brute-force)
  AUTH: {
    name: 'auth',
    ttl: 60000, // 1 minute
    limit: 5,
  },

  // Payment endpoints: 10 requests per minute
  PAYMENT: {
    name: 'payment',
    ttl: 60000, // 1 minute
    limit: 10,
  },

  // Public endpoints: 200 requests per minute
  PUBLIC: {
    name: 'public',
    ttl: 60000, // 1 minute
    limit: 200,
  },

  // Strict rate limit for sensitive operations: 3 requests per 5 minutes
  STRICT: {
    name: 'strict',
    ttl: 300000, // 5 minutes
    limit: 3,
  },
} as const;

// Metadata keys for custom decorators
export const THROTTLE_LIMIT_KEY = 'THROTTLE_LIMIT';
export const THROTTLE_TTL_KEY = 'THROTTLE_TTL';
export const THROTTLE_SKIP_KEY = 'THROTTLE_SKIP';
export const THROTTLE_TRACKER_KEY = 'THROTTLE_TRACKER';

// Tracker types for rate limiting
export enum ThrottleTrackerType {
  IP = 'ip',
  USER_ID = 'userId',
  API_KEY = 'apiKey',
  COMBINED = 'combined',
}

// Redis key prefixes
export const REDIS_KEY_PREFIX = {
  RATE_LIMIT: 'rate_limit:',
  BLOCKED: 'blocked:',
  VIOLATION_COUNT: 'violation_count:',
} as const;

// Block duration after too many violations (in seconds)
export const VIOLATION_BLOCK_DURATION = 3600; // 1 hour
export const MAX_VIOLATIONS_BEFORE_BLOCK = 10;
