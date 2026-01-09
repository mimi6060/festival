/**
 * Rate Limit Tiers Configuration
 *
 * Defines tier-based rate limits for the Festival API.
 * Each tier has specific limits for minute, hour, and day windows.
 *
 * @module RateLimitTiers
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Client tier levels for rate limiting
 */
export enum ClientTier {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

/**
 * Time window types for rate limiting
 */
export enum RateLimitWindow {
  MINUTE = 'MINUTE',
  HOUR = 'HOUR',
  DAY = 'DAY',
}

/**
 * Rate limit configuration for a specific time window
 */
export interface WindowLimit {
  /** Maximum number of requests allowed */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Whether the limit is unlimited (-1 means unlimited) */
  unlimited: boolean;
}

/**
 * Complete rate limit tier configuration
 */
export interface TierLimits {
  /** Tier identifier */
  tier: ClientTier;
  /** Display name for the tier */
  displayName: string;
  /** Description of the tier */
  description: string;
  /** Limits per time window */
  limits: {
    [RateLimitWindow.MINUTE]: WindowLimit;
    [RateLimitWindow.HOUR]: WindowLimit;
    [RateLimitWindow.DAY]: WindowLimit;
  };
  /** Priority for quota checking (higher = checked first) */
  priority: number;
  /** Features included in this tier */
  features: string[];
}

/**
 * Rate limit check result with tier information
 */
export interface TierRateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current tier of the client */
  tier: ClientTier;
  /** Which window caused the limit to be exceeded */
  limitedBy?: RateLimitWindow;
  /** Remaining requests per window */
  remaining: {
    minute: number;
    hour: number;
    day: number;
  };
  /** Reset timestamps per window (Unix seconds) */
  resetAt: {
    minute: number;
    hour: number;
    day: number;
  };
  /** Limits per window */
  limits: {
    minute: number;
    hour: number;
    day: number;
  };
  /** Retry after seconds (if limited) */
  retryAfter?: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Seconds in a minute */
export const SECONDS_PER_MINUTE = 60;

/** Seconds in an hour */
export const SECONDS_PER_HOUR = 3600;

/** Seconds in a day */
export const SECONDS_PER_DAY = 86400;

/** Marker for unlimited requests */
export const UNLIMITED = -1;

// ============================================================================
// Tier Configurations
// ============================================================================

/**
 * FREE Tier - Basic access for free users
 * - 100 requests per minute
 * - 1,000 requests per hour
 * - 10,000 requests per day
 */
export const FREE_TIER: TierLimits = {
  tier: ClientTier.FREE,
  displayName: 'Free',
  description: 'Basic API access for free users',
  limits: {
    [RateLimitWindow.MINUTE]: {
      limit: 100,
      windowSeconds: SECONDS_PER_MINUTE,
      unlimited: false,
    },
    [RateLimitWindow.HOUR]: {
      limit: 1000,
      windowSeconds: SECONDS_PER_HOUR,
      unlimited: false,
    },
    [RateLimitWindow.DAY]: {
      limit: 10000,
      windowSeconds: SECONDS_PER_DAY,
      unlimited: false,
    },
  },
  priority: 1,
  features: [
    'Basic API access',
    'Standard support',
    'Community resources',
  ],
};

/**
 * STARTER Tier - Enhanced access for paying customers
 * - 500 requests per minute
 * - 5,000 requests per hour
 * - 50,000 requests per day
 */
export const STARTER_TIER: TierLimits = {
  tier: ClientTier.STARTER,
  displayName: 'Starter',
  description: 'Enhanced API access for starter plans',
  limits: {
    [RateLimitWindow.MINUTE]: {
      limit: 500,
      windowSeconds: SECONDS_PER_MINUTE,
      unlimited: false,
    },
    [RateLimitWindow.HOUR]: {
      limit: 5000,
      windowSeconds: SECONDS_PER_HOUR,
      unlimited: false,
    },
    [RateLimitWindow.DAY]: {
      limit: 50000,
      windowSeconds: SECONDS_PER_DAY,
      unlimited: false,
    },
  },
  priority: 2,
  features: [
    'Enhanced API access',
    'Email support',
    'API analytics dashboard',
    'Webhook support',
  ],
};

/**
 * PRO Tier - Professional access for heavy users
 * - 2,000 requests per minute
 * - 20,000 requests per hour
 * - 200,000 requests per day
 */
export const PRO_TIER: TierLimits = {
  tier: ClientTier.PRO,
  displayName: 'Pro',
  description: 'Professional API access for power users',
  limits: {
    [RateLimitWindow.MINUTE]: {
      limit: 2000,
      windowSeconds: SECONDS_PER_MINUTE,
      unlimited: false,
    },
    [RateLimitWindow.HOUR]: {
      limit: 20000,
      windowSeconds: SECONDS_PER_HOUR,
      unlimited: false,
    },
    [RateLimitWindow.DAY]: {
      limit: 200000,
      windowSeconds: SECONDS_PER_DAY,
      unlimited: false,
    },
  },
  priority: 3,
  features: [
    'Professional API access',
    'Priority support',
    'Advanced analytics',
    'Custom webhooks',
    'Bulk operations',
    'Dedicated rate limit pools',
  ],
};

/**
 * ENTERPRISE Tier - Unlimited access for enterprise customers
 * - 10,000 requests per minute
 * - Unlimited requests per hour
 * - Unlimited requests per day
 */
export const ENTERPRISE_TIER: TierLimits = {
  tier: ClientTier.ENTERPRISE,
  displayName: 'Enterprise',
  description: 'Enterprise API access with unlimited quotas',
  limits: {
    [RateLimitWindow.MINUTE]: {
      limit: 10000,
      windowSeconds: SECONDS_PER_MINUTE,
      unlimited: false,
    },
    [RateLimitWindow.HOUR]: {
      limit: UNLIMITED,
      windowSeconds: SECONDS_PER_HOUR,
      unlimited: true,
    },
    [RateLimitWindow.DAY]: {
      limit: UNLIMITED,
      windowSeconds: SECONDS_PER_DAY,
      unlimited: true,
    },
  },
  priority: 4,
  features: [
    'Enterprise API access',
    'Dedicated support',
    'SLA guarantee',
    'Custom integrations',
    'Unlimited hourly/daily requests',
    'Priority processing',
    'Custom rate limit configurations',
    'IP whitelisting',
  ],
};

/**
 * All tier configurations indexed by tier name
 */
export const TIER_LIMITS: Record<ClientTier, TierLimits> = {
  [ClientTier.FREE]: FREE_TIER,
  [ClientTier.STARTER]: STARTER_TIER,
  [ClientTier.PRO]: PRO_TIER,
  [ClientTier.ENTERPRISE]: ENTERPRISE_TIER,
};

/**
 * Default tier for unauthenticated requests
 */
export const DEFAULT_TIER = ClientTier.FREE;

/**
 * Default tier for authenticated users without a subscription
 */
export const DEFAULT_AUTHENTICATED_TIER = ClientTier.FREE;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get tier limits by tier name
 */
export function getTierLimits(tier: ClientTier): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS[DEFAULT_TIER];
}

/**
 * Get limit for a specific window
 */
export function getWindowLimit(tier: ClientTier, window: RateLimitWindow): WindowLimit {
  const tierLimits = getTierLimits(tier);
  return tierLimits.limits[window];
}

/**
 * Check if a tier has unlimited requests for a window
 */
export function isUnlimited(tier: ClientTier, window: RateLimitWindow): boolean {
  const windowLimit = getWindowLimit(tier, window);
  return windowLimit.unlimited;
}

/**
 * Get all tiers sorted by priority (highest first)
 */
export function getTiersByPriority(): TierLimits[] {
  return Object.values(TIER_LIMITS).sort((a, b) => b.priority - a.priority);
}

/**
 * Get tier from string value (case-insensitive)
 */
export function parseTier(tierString: string): ClientTier {
  const normalized = tierString.toUpperCase();
  if (Object.values(ClientTier).includes(normalized as ClientTier)) {
    return normalized as ClientTier;
  }
  return DEFAULT_TIER;
}

/**
 * Check if tier A is higher than tier B
 */
export function isTierHigher(tierA: ClientTier, tierB: ClientTier): boolean {
  const limitsA = getTierLimits(tierA);
  const limitsB = getTierLimits(tierB);
  return limitsA.priority > limitsB.priority;
}

/**
 * Get the highest tier from a list
 */
export function getHighestTier(tiers: ClientTier[]): ClientTier {
  if (tiers.length === 0) {
    return DEFAULT_TIER;
  }

  return tiers.reduce((highest, current) => {
    return isTierHigher(current, highest) ? current : highest;
  }, tiers[0]);
}

/**
 * Calculate remaining time until window reset
 */
export function getTimeUntilReset(window: RateLimitWindow): number {
  const now = Math.floor(Date.now() / 1000);

  switch (window) {
    case RateLimitWindow.MINUTE:
      return SECONDS_PER_MINUTE - (now % SECONDS_PER_MINUTE);
    case RateLimitWindow.HOUR:
      return SECONDS_PER_HOUR - (now % SECONDS_PER_HOUR);
    case RateLimitWindow.DAY:
      return SECONDS_PER_DAY - (now % SECONDS_PER_DAY);
    default:
      return SECONDS_PER_MINUTE;
  }
}

/**
 * Get reset timestamp for a window
 */
export function getResetTimestamp(window: RateLimitWindow): number {
  const now = Math.floor(Date.now() / 1000);
  return now + getTimeUntilReset(window);
}

/**
 * Create Redis key for tier-based rate limiting
 */
export function createTierRateLimitKey(
  identifier: string,
  tier: ClientTier,
  window: RateLimitWindow,
): string {
  const windowKey = window.toLowerCase();
  return `ratelimit:tier:${tier.toLowerCase()}:${windowKey}:${identifier}`;
}

/**
 * Parse tier from user subscription or API key
 */
export function getTierFromSubscription(subscription?: {
  plan?: string;
  tier?: string;
  status?: string;
}): ClientTier {
  if (!subscription || subscription.status !== 'active') {
    return DEFAULT_TIER;
  }

  const tierValue: string | undefined = subscription.tier || subscription.plan;
  if (tierValue !== undefined) {
    return parseTier(tierValue);
  }

  return DEFAULT_TIER;
}

/**
 * Format rate limit info for headers
 */
export function formatRateLimitHeaders(result: TierRateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Tier': result.tier,
    'X-RateLimit-Limit-Minute': result.limits.minute.toString(),
    'X-RateLimit-Limit-Hour': result.limits.hour === UNLIMITED ? 'unlimited' : result.limits.hour.toString(),
    'X-RateLimit-Limit-Day': result.limits.day === UNLIMITED ? 'unlimited' : result.limits.day.toString(),
    'X-RateLimit-Remaining-Minute': result.remaining.minute.toString(),
    'X-RateLimit-Remaining-Hour': result.remaining.hour.toString(),
    'X-RateLimit-Remaining-Day': result.remaining.day.toString(),
    'X-RateLimit-Reset-Minute': result.resetAt.minute.toString(),
    'X-RateLimit-Reset-Hour': result.resetAt.hour.toString(),
    'X-RateLimit-Reset-Day': result.resetAt.day.toString(),
    ...(result.retryAfter ? { 'Retry-After': result.retryAfter.toString() } : {}),
  };
}
