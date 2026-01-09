/**
 * Rate Limit Headers Interceptor
 *
 * Adds comprehensive rate limit information headers to all responses:
 * - X-RateLimit-Limit: Maximum requests allowed per window
 * - X-RateLimit-Remaining: Remaining requests in current window
 * - X-RateLimit-Reset: Unix timestamp when the limit resets
 * - X-RateLimit-Tier: Client's rate limit tier
 * - Retry-After: Seconds until limit resets (when exceeded)
 *
 * Also implements:
 * - Tier-based rate limit information
 * - Multi-window rate limit headers (minute, hour, day)
 * - IETF draft standard RateLimit headers
 *
 * @module RateLimitHeadersInterceptor
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import {
  ClientTier,
  TierRateLimitResult,
  DEFAULT_TIER,
  UNLIMITED,
} from '../rate-limit/rate-limit-tiers';
import { SKIP_TIER_RATE_LIMIT_KEY } from '../guards/tier-rate-limit.guard';

// ============================================================================
// Types
// ============================================================================

/**
 * Extended request with rate limit info
 */
interface RateLimitRequest extends Request {
  user?: {
    id: string;
    subscription?: {
      tier?: string;
      plan?: string;
    };
  };
  apiKey?: {
    tier: ClientTier;
  };
  tierRateLimitInfo?: TierRateLimitResult;
}

// ============================================================================
// Rate Limit Headers Interceptor
// ============================================================================

@Injectable()
export class RateLimitHeadersInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RateLimitRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check if rate limiting is skipped
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(SKIP_TIER_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipRateLimit) {
      return next.handle();
    }

    // Set initial headers with tier information
    this.setInitialHeaders(response, request);

    return next.handle().pipe(
      tap({
        next: () => {
          // Set final headers after successful response
          this.setFinalHeaders(response, request);
        },
      }),
      catchError((error) => {
        // Ensure headers are set even on error
        this.setFinalHeaders(response, request);
        throw error;
      }),
    );
  }

  /**
   * Set initial headers before request processing
   */
  private setInitialHeaders(response: Response, request: RateLimitRequest): void {
    // Get tier from request context
    const tier = this.determineTier(request);

    // Set tier header
    response.setHeader('X-RateLimit-Tier', tier);

    // Set policy header describing the rate limiting
    const policy = this.buildPolicyString(tier);
    response.setHeader('X-RateLimit-Policy', policy);
  }

  /**
   * Set final headers after request processing
   */
  private setFinalHeaders(response: Response, request: RateLimitRequest): void {
    // If rate limit info was attached by the guard, use it for detailed headers
    const rateLimitInfo = request.tierRateLimitInfo;

    if (rateLimitInfo) {
      this.setDetailedHeaders(response, rateLimitInfo);
    }
  }

  /**
   * Set detailed rate limit headers from rate limit result
   */
  private setDetailedHeaders(response: Response, result: TierRateLimitResult): void {
    // Primary rate limit headers (based on minute window)
    if (!response.getHeader('X-RateLimit-Limit')) {
      response.setHeader('X-RateLimit-Limit', result.limits.minute.toString());
    }
    if (!response.getHeader('X-RateLimit-Remaining')) {
      response.setHeader('X-RateLimit-Remaining', result.remaining.minute.toString());
    }
    if (!response.getHeader('X-RateLimit-Reset')) {
      response.setHeader('X-RateLimit-Reset', result.resetAt.minute.toString());
    }

    // Tier-specific headers
    response.setHeader('X-RateLimit-Tier', result.tier);

    // Multi-window headers
    this.setWindowHeaders(response, 'Minute', result.limits.minute, result.remaining.minute, result.resetAt.minute);
    this.setWindowHeaders(response, 'Hour', result.limits.hour, result.remaining.hour, result.resetAt.hour);
    this.setWindowHeaders(response, 'Day', result.limits.day, result.remaining.day, result.resetAt.day);

    // IETF draft standard headers
    if (!response.getHeader('RateLimit-Limit')) {
      response.setHeader('RateLimit-Limit', result.limits.minute.toString());
    }
    if (!response.getHeader('RateLimit-Remaining')) {
      response.setHeader('RateLimit-Remaining', result.remaining.minute.toString());
    }
    if (!response.getHeader('RateLimit-Reset')) {
      // IETF standard uses seconds until reset, not timestamp
      const now = Math.floor(Date.now() / 1000);
      const secondsUntilReset = Math.max(0, result.resetAt.minute - now);
      response.setHeader('RateLimit-Reset', secondsUntilReset.toString());
    }

    // If rate was limited, set Retry-After header
    if (result.retryAfter !== undefined && result.retryAfter > 0) {
      response.setHeader('Retry-After', result.retryAfter.toString());
    }
  }

  /**
   * Set headers for a specific time window
   */
  private setWindowHeaders(
    response: Response,
    windowName: string,
    limit: number,
    remaining: number,
    resetAt: number,
  ): void {
    const limitValue = limit === UNLIMITED ? 'unlimited' : limit.toString();
    const remainingValue = limit === UNLIMITED ? 'unlimited' : remaining.toString();

    response.setHeader(`X-RateLimit-Limit-${windowName}`, limitValue);
    response.setHeader(`X-RateLimit-Remaining-${windowName}`, remainingValue);
    response.setHeader(`X-RateLimit-Reset-${windowName}`, resetAt.toString());
  }

  /**
   * Determine the tier from request context
   */
  private determineTier(request: RateLimitRequest): ClientTier {
    // Check API key tier
    if (request.apiKey?.tier) {
      return request.apiKey.tier;
    }

    // Check user subscription tier
    if (request.user?.subscription?.tier) {
      const tierValue = request.user.subscription.tier.toUpperCase();
      if (Object.values(ClientTier).includes(tierValue as ClientTier)) {
        return tierValue as ClientTier;
      }
    }

    // Check user plan
    if (request.user?.subscription?.plan) {
      const planValue = request.user.subscription.plan.toUpperCase();
      if (Object.values(ClientTier).includes(planValue as ClientTier)) {
        return planValue as ClientTier;
      }
    }

    return DEFAULT_TIER;
  }

  /**
   * Build a human-readable policy string
   */
  private buildPolicyString(tier: ClientTier): string {
    const tierLimits = this.getTierLimitDescription(tier);
    return `${tier.toLowerCase()}: ${tierLimits}`;
  }

  /**
   * Get human-readable tier limit description
   */
  private getTierLimitDescription(tier: ClientTier): string {
    switch (tier) {
      case ClientTier.FREE:
        return '100/min, 1000/hour, 10000/day';
      case ClientTier.STARTER:
        return '500/min, 5000/hour, 50000/day';
      case ClientTier.PRO:
        return '2000/min, 20000/hour, 200000/day';
      case ClientTier.ENTERPRISE:
        return '10000/min, unlimited/hour, unlimited/day';
      default:
        return '100/min, 1000/hour, 10000/day';
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse rate limit headers from a response
 */
export function parseTierRateLimitHeaders(headers: Record<string, string | string[]>): {
  tier: ClientTier;
  limits: { minute: number; hour: number; day: number };
  remaining: { minute: number; hour: number; day: number };
  resetAt: { minute: number; hour: number; day: number };
  retryAfter?: number;
} {
  const getHeader = (name: string): string => {
    const value = headers[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0] || '';
    }
    return value || '';
  };

  const parseNumber = (value: string): number => {
    if (value === 'unlimited') return UNLIMITED;
    return parseInt(value, 10) || 0;
  };

  return {
    tier: (getHeader('x-ratelimit-tier') as ClientTier) || DEFAULT_TIER,
    limits: {
      minute: parseNumber(getHeader('x-ratelimit-limit-minute')),
      hour: parseNumber(getHeader('x-ratelimit-limit-hour')),
      day: parseNumber(getHeader('x-ratelimit-limit-day')),
    },
    remaining: {
      minute: parseNumber(getHeader('x-ratelimit-remaining-minute')),
      hour: parseNumber(getHeader('x-ratelimit-remaining-hour')),
      day: parseNumber(getHeader('x-ratelimit-remaining-day')),
    },
    resetAt: {
      minute: parseNumber(getHeader('x-ratelimit-reset-minute')),
      hour: parseNumber(getHeader('x-ratelimit-reset-hour')),
      day: parseNumber(getHeader('x-ratelimit-reset-day')),
    },
    retryAfter: getHeader('retry-after') ? parseInt(getHeader('retry-after'), 10) : undefined,
  };
}

/**
 * Check if response indicates rate limiting
 */
export function isTierRateLimited(statusCode: number): boolean {
  return statusCode === 429;
}

/**
 * Get the most restrictive remaining quota
 */
export function getMostRestrictiveRemaining(
  remaining: { minute: number; hour: number; day: number },
): { window: string; remaining: number } {
  const windows = [
    { window: 'minute', remaining: remaining.minute },
    { window: 'hour', remaining: remaining.hour },
    { window: 'day', remaining: remaining.day },
  ].filter((w) => w.remaining !== UNLIMITED);

  if (windows.length === 0) {
    return { window: 'minute', remaining: UNLIMITED };
  }

  return windows.reduce((min, current) =>
    current.remaining < min.remaining ? current : min,
  );
}
