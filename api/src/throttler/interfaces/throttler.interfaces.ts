import { ThrottleTrackerType } from '../throttler.constants';

/**
 * Rate limit information for response headers
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds until reset
}

/**
 * Throttle record stored in Redis
 */
export interface ThrottleRecord {
  count: number;
  expiresAt: number;
  firstRequestAt: number;
}

/**
 * Custom throttle options for decorators
 */
export interface ThrottleOptions {
  limit?: number;
  ttl?: number;
  tracker?: ThrottleTrackerType;
  skipIf?: (context: any) => boolean;
}

/**
 * Rate limit violation event
 */
export interface RateLimitViolation {
  identifier: string;
  identifierType: ThrottleTrackerType;
  endpoint: string;
  method: string;
  limit: number;
  attempts: number;
  timestamp: Date;
  ip: string;
  userId?: string;
  apiKey?: string;
  userAgent?: string;
}

/**
 * Redis storage configuration
 */
export interface RedisThrottlerConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  tls?: boolean;
}

/**
 * Throttler module configuration
 */
export interface ThrottlerModuleConfig {
  redis: RedisThrottlerConfig;
  defaultLimit: number;
  defaultTtl: number;
  enableLogging: boolean;
  enableBlocking: boolean;
  maxViolationsBeforeBlock: number;
  blockDuration: number;
}
