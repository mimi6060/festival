/**
 * Rate Limiting Module Exports
 *
 * Central export point for all rate limiting functionality
 */

// Module
export { RateLimitModule, type RateLimitModuleOptions, type RateLimitModuleAsyncOptions } from './rate-limit.module';

// Guard
export {
  RateLimitGuard,
  RateLimit,
  SkipRateLimit,
  StrictRateLimit,
  BurstRateLimit,
  PlanBasedRateLimit,
  UserPlan,
  PLAN_RATE_LIMITS,
  ENDPOINT_RATE_LIMITS,
  ANONYMOUS_RATE_LIMIT,
  RATE_LIMIT_KEY,
  SKIP_RATE_LIMIT_KEY,
  RATE_LIMIT_PLAN_KEY,
  type RateLimitConfig,
  type RateLimitState,
} from '../guards/rate-limit.guard';

// Service
export {
  RateLimitService,
  type RateLimitResult,
  type RateLimitOptions,
  type RateLimitMetrics,
  type RateLimitAlgorithm,
  type TokenBucket,
  type SlidingWindowEntry,
} from '../services/rate-limit.service';

// Interceptor
export {
  RateLimitInterceptor,
  parseRateLimitHeaders,
  isRateLimited,
  getTimeUntilReset,
} from './rate-limit.interceptor';
