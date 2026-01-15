/**
 * Rate Limit Tier Decorator
 *
 * Decorators for tier-based rate limiting configuration on endpoints.
 * Allows overriding default tier, setting request cost, and skipping rate limits.
 *
 * @module RateLimitTierDecorator
 */

import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { ApiTooManyRequestsResponse, ApiHeader } from '@nestjs/swagger';
import { ClientTier, RateLimitWindow } from '../rate-limit/rate-limit-tiers';
import {
  TierRateLimitGuard,
  TierRateLimitConfig,
  TIER_RATE_LIMIT_KEY,
  SKIP_TIER_RATE_LIMIT_KEY,
  RATE_LIMIT_TIER_OVERRIDE_KEY,
  RATE_LIMIT_COST_KEY,
} from '../guards/tier-rate-limit.guard';

// ============================================================================
// Main Decorator
// ============================================================================

/**
 * Apply tier-based rate limiting to an endpoint
 *
 * @example
 * ```typescript
 * // Use default tier from user/API key
 * @TierRateLimit()
 * @Get('resource')
 * async getResource() { ... }
 *
 * // Override tier for this endpoint
 * @TierRateLimit({ tier: ClientTier.PRO })
 * @Get('premium-resource')
 * async getPremiumResource() { ... }
 *
 * // Set request cost (counts as multiple requests)
 * @TierRateLimit({ cost: 10 })
 * @Post('expensive-operation')
 * async expensiveOperation() { ... }
 *
 * // Custom error message
 * @TierRateLimit({ errorMessage: 'Please upgrade to access more resources' })
 * @Get('limited')
 * async getLimited() { ... }
 * ```
 */
export function TierRateLimit(config: Partial<TierRateLimitConfig> = {}) {
  const fullConfig: TierRateLimitConfig = {
    tier: config.tier,
    cost: config.cost || 1,
    skip: config.skip || false,
    errorMessage: config.errorMessage,
    skipWindows: config.skipWindows || [],
  };

  return applyDecorators(
    SetMetadata(TIER_RATE_LIMIT_KEY, fullConfig),
    UseGuards(TierRateLimitGuard),
    ApiTooManyRequestsResponse({
      description: buildRateLimitDescription(fullConfig),
    }),
    ApiHeader({
      name: 'X-RateLimit-Tier',
      description: 'Your rate limit tier (FREE, STARTER, PRO, ENTERPRISE)',
      required: false,
    }),
    ApiHeader({
      name: 'X-RateLimit-Remaining-Minute',
      description: 'Remaining requests in the current minute',
      required: false,
    }),
    ApiHeader({
      name: 'X-RateLimit-Remaining-Hour',
      description: 'Remaining requests in the current hour',
      required: false,
    }),
    ApiHeader({
      name: 'X-RateLimit-Remaining-Day',
      description: 'Remaining requests in the current day',
      required: false,
    }),
  );
}

// ============================================================================
// Convenience Decorators
// ============================================================================

/**
 * Skip tier rate limiting for an endpoint
 *
 * @example
 * ```typescript
 * @SkipTierRateLimit()
 * @Get('health')
 * async healthCheck() { ... }
 * ```
 */
export function SkipTierRateLimit() {
  return SetMetadata(SKIP_TIER_RATE_LIMIT_KEY, true);
}

/**
 * Override the tier for a specific endpoint
 *
 * @example
 * ```typescript
 * @RateLimitTierOverride(ClientTier.ENTERPRISE)
 * @Get('admin/stats')
 * async getAdminStats() { ... }
 * ```
 */
export function RateLimitTierOverride(tier: ClientTier) {
  return SetMetadata(RATE_LIMIT_TIER_OVERRIDE_KEY, tier);
}

/**
 * Set the request cost for an endpoint
 *
 * @example
 * ```typescript
 * @RateLimitCost(5)
 * @Post('bulk-import')
 * async bulkImport() { ... }
 * ```
 */
export function RateLimitCost(cost: number) {
  return SetMetadata(RATE_LIMIT_COST_KEY, cost);
}

/**
 * Apply FREE tier rate limits
 * 100/min, 1000/hour, 10000/day
 */
export function FreeTierRateLimit() {
  return TierRateLimit({ tier: ClientTier.FREE });
}

/**
 * Apply STARTER tier rate limits
 * 500/min, 5000/hour, 50000/day
 */
export function StarterTierRateLimit() {
  return TierRateLimit({ tier: ClientTier.STARTER });
}

/**
 * Apply PRO tier rate limits
 * 2000/min, 20000/hour, 200000/day
 */
export function ProTierRateLimit() {
  return TierRateLimit({ tier: ClientTier.PRO });
}

/**
 * Apply ENTERPRISE tier rate limits
 * 10000/min, unlimited/hour, unlimited/day
 */
export function EnterpriseTierRateLimit() {
  return TierRateLimit({ tier: ClientTier.ENTERPRISE });
}

/**
 * Apply strict rate limiting (high cost, limited to minute window)
 * Good for expensive operations
 */
export function StrictTierRateLimit(cost = 10) {
  return TierRateLimit({
    cost,
    errorMessage: 'This is an expensive operation. Please wait before trying again.',
  });
}

/**
 * Apply lenient rate limiting (only day window checked)
 * Good for less critical endpoints
 */
export function LenientTierRateLimit() {
  return TierRateLimit({
    skipWindows: [RateLimitWindow.MINUTE, RateLimitWindow.HOUR],
  });
}

/**
 * Apply burst-friendly rate limiting (minute window skipped)
 * Good for endpoints that may have burst traffic
 */
export function BurstFriendlyTierRateLimit() {
  return TierRateLimit({
    skipWindows: [RateLimitWindow.MINUTE],
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build rate limit description for Swagger documentation
 */
function buildRateLimitDescription(config: TierRateLimitConfig): string {
  const parts: string[] = ['Rate limited by tier.'];

  if (config.tier) {
    parts.push(`Fixed tier: ${config.tier}.`);
  }

  if (config.cost && config.cost > 1) {
    parts.push(`Request cost: ${config.cost}.`);
  }

  parts.push('Tiers: FREE (100/min), STARTER (500/min), PRO (2000/min), ENTERPRISE (10000/min).');

  return parts.join(' ');
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export {
  ClientTier,
  RateLimitWindow,
  TIER_RATE_LIMIT_KEY,
  SKIP_TIER_RATE_LIMIT_KEY,
  RATE_LIMIT_TIER_OVERRIDE_KEY,
  RATE_LIMIT_COST_KEY,
};

export type { TierRateLimitConfig };
