/**
 * Common Decorators Exports
 *
 * Central export point for all common decorators
 */

// User decorators
export { CurrentUser, AuthenticatedUser } from './current-user.decorator';
export { Roles, ROLES_KEY } from './roles.decorator';

// Locale decorators
export { Locale, LocaleCode, AcceptLanguage, LocaleInfo } from './locale.decorator';

// Rate limit tier decorators
export {
  TierRateLimit,
  SkipTierRateLimit,
  RateLimitTierOverride,
  RateLimitCost,
  FreeTierRateLimit,
  StarterTierRateLimit,
  ProTierRateLimit,
  EnterpriseTierRateLimit,
  StrictTierRateLimit,
  LenientTierRateLimit,
  BurstFriendlyTierRateLimit,
  ClientTier,
  RateLimitWindow,
  TierRateLimitConfig,
  TIER_RATE_LIMIT_KEY,
  SKIP_TIER_RATE_LIMIT_KEY,
  RATE_LIMIT_TIER_OVERRIDE_KEY,
  RATE_LIMIT_COST_KEY,
} from './rate-limit-tier.decorator';
