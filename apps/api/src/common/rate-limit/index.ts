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

// Tier-based guard
export {
  TierRateLimitGuard,
  TIER_RATE_LIMIT_KEY,
  SKIP_TIER_RATE_LIMIT_KEY,
  RATE_LIMIT_TIER_OVERRIDE_KEY,
  RATE_LIMIT_COST_KEY,
  type TierRateLimitConfig,
} from '../guards/tier-rate-limit.guard';

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

// Tier-based service
export {
  TierRateLimitService,
  type TierRateLimitOptions,
  type TierMetrics,
} from '../services/tier-rate-limit.service';

// Interceptor
export {
  RateLimitInterceptor,
  parseRateLimitHeaders,
  isRateLimited,
  getTimeUntilReset,
} from './rate-limit.interceptor';

// Tier-based interceptor
export {
  RateLimitHeadersInterceptor,
  parseTierRateLimitHeaders,
  isTierRateLimited,
  getMostRestrictiveRemaining,
} from '../interceptors/rate-limit-headers.interceptor';

// Tier definitions
export {
  ClientTier,
  RateLimitWindow,
  TIER_LIMITS,
  FREE_TIER,
  STARTER_TIER,
  PRO_TIER,
  ENTERPRISE_TIER,
  DEFAULT_TIER,
  DEFAULT_AUTHENTICATED_TIER,
  SECONDS_PER_MINUTE,
  SECONDS_PER_HOUR,
  SECONDS_PER_DAY,
  UNLIMITED,
  getTierLimits,
  getWindowLimit,
  isUnlimited,
  getTiersByPriority,
  parseTier,
  isTierHigher,
  getHighestTier,
  getTimeUntilReset as getTierTimeUntilReset,
  getResetTimestamp,
  createTierRateLimitKey,
  getTierFromSubscription,
  formatRateLimitHeaders,
} from './rate-limit-tiers';

export type {
  TierLimits,
  WindowLimit,
  TierRateLimitResult,
} from './rate-limit-tiers';
