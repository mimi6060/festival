/**
 * Tier-Based Rate Limit Guard
 *
 * Enforces rate limits based on user subscription tier or API key tier.
 * Returns 429 Too Many Requests with Retry-After header when limits are exceeded.
 *
 * Features:
 * - Automatic tier detection from user subscription or API key
 * - Multi-window rate limiting (minute, hour, day)
 * - Custom tier override via decorator
 * - Detailed rate limit headers in responses
 * - Support for request cost weighting
 *
 * @module TierRateLimitGuard
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { TierRateLimitService } from '../services/tier-rate-limit.service';
import {
  ClientTier,
  RateLimitWindow,
  TierRateLimitResult,
  formatRateLimitHeaders,
  DEFAULT_TIER,
  parseTier,
  UNLIMITED,
} from '../rate-limit/rate-limit-tiers';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Extended request interface with user and API key information
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
    subscription?: {
      tier?: string;
      plan?: string;
      status?: string;
    };
  };
  apiKey?: {
    id: string;
    key: string;
    tier: ClientTier;
    name?: string;
    userId?: string;
  };
}

/**
 * Rate limit tier configuration from decorator
 */
export interface TierRateLimitConfig {
  /** Override tier for this endpoint */
  tier?: ClientTier;
  /** Request cost (default: 1) */
  cost?: number;
  /** Skip rate limiting for this endpoint */
  skip?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Skip specific windows */
  skipWindows?: RateLimitWindow[];
}

// ============================================================================
// Metadata Keys
// ============================================================================

export const TIER_RATE_LIMIT_KEY = 'tier_rate_limit';
export const SKIP_TIER_RATE_LIMIT_KEY = 'skip_tier_rate_limit';
export const RATE_LIMIT_TIER_OVERRIDE_KEY = 'rate_limit_tier_override';
export const RATE_LIMIT_COST_KEY = 'rate_limit_cost';

// ============================================================================
// Tier Rate Limit Guard
// ============================================================================

@Injectable()
export class TierRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(TierRateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(TierRateLimitService)
    private readonly tierRateLimitService?: TierRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if service is available
    if (!this.tierRateLimitService) {
      this.logger.warn('TierRateLimitService not available, skipping rate limit check');
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check if rate limiting should be skipped
    if (this.shouldSkipRateLimit(context)) {
      return true;
    }

    // Get tier configuration
    const config = this.getConfig(context);

    // Determine client tier
    const tier = this.determineClientTier(request, config);

    // Get identifier (API key, user ID, or IP)
    const identifier = this.getIdentifier(request);

    // Check rate limit
    const result = await this.tierRateLimitService.checkRateLimit({
      identifier,
      tier,
      cost: config.cost,
      skipWindows: config.skipWindows,
    });

    // Always set rate limit headers
    this.setRateLimitHeaders(response, result);

    // Attach rate limit info to request for interceptor
    (request as any).tierRateLimitInfo = result;

    // If rate limited, throw exception
    if (!result.allowed) {
      this.logRateLimitExceeded(request, result, identifier);
      throw this.createRateLimitException(result, config);
    }

    return true;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Check if rate limiting should be skipped for this request
   */
  private shouldSkipRateLimit(context: ExecutionContext): boolean {
    // Check for skip decorator
    const skipDecorator = this.reflector.getAllAndOverride<boolean>(SKIP_TIER_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipDecorator) {
      return true;
    }

    // Check for config with skip flag
    const config = this.reflector.getAllAndOverride<TierRateLimitConfig>(TIER_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return config?.skip === true;
  }

  /**
   * Get rate limit configuration from decorators
   */
  private getConfig(context: ExecutionContext): TierRateLimitConfig {
    const decoratorConfig = this.reflector.getAllAndOverride<TierRateLimitConfig>(
      TIER_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Check for individual decorator overrides
    const tierOverride = this.reflector.getAllAndOverride<ClientTier>(
      RATE_LIMIT_TIER_OVERRIDE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const costOverride = this.reflector.getAllAndOverride<number>(RATE_LIMIT_COST_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return {
      tier: tierOverride || decoratorConfig?.tier,
      cost: costOverride || decoratorConfig?.cost || 1,
      skip: decoratorConfig?.skip || false,
      errorMessage: decoratorConfig?.errorMessage,
      skipWindows: decoratorConfig?.skipWindows || [],
    };
  }

  /**
   * Determine the client tier from request context
   */
  private determineClientTier(request: AuthenticatedRequest, config: TierRateLimitConfig): ClientTier {
    // 1. Check for decorator override
    if (config.tier) {
      return config.tier;
    }

    // 2. Check for API key tier
    if (request.apiKey?.tier) {
      return request.apiKey.tier;
    }

    // 3. Check for user subscription tier
    if (request.user?.subscription) {
      const { tier, plan, status } = request.user.subscription;

      // Only use subscription tier if active
      if (status === 'active' || status === 'trialing') {
        const tierValue = tier || plan;
        if (tierValue) {
          return parseTier(tierValue);
        }
      }
    }

    // 4. Default tier
    return DEFAULT_TIER;
  }

  /**
   * Get identifier for rate limiting
   */
  private getIdentifier(request: AuthenticatedRequest): string {
    // Priority: API key > User ID > IP address

    if (request.apiKey?.id) {
      return `apikey:${request.apiKey.id}`;
    }

    if (request.user?.id) {
      return `user:${request.user.id}`;
    }

    // Fall back to IP address
    const ip = this.getClientIp(request);
    return `ip:${ip}`;
  }

  /**
   * Get client IP address, handling proxies
   */
  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips?.trim() || 'unknown';
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : (realIp || 'unknown');
    }

    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  /**
   * Set rate limit headers on response
   */
  private setRateLimitHeaders(response: Response, result: TierRateLimitResult): void {
    const headers = formatRateLimitHeaders(result);

    Object.entries(headers).forEach(([key, value]) => {
      response.setHeader(key, value);
    });

    // Set standard rate limit header (use minute window as primary)
    response.setHeader('X-RateLimit-Limit', result.limits.minute.toString());
    response.setHeader('X-RateLimit-Remaining', result.remaining.minute.toString());
    response.setHeader('X-RateLimit-Reset', result.resetAt.minute.toString());

    // IETF draft standard headers
    response.setHeader('RateLimit-Limit', result.limits.minute.toString());
    response.setHeader('RateLimit-Remaining', result.remaining.minute.toString());
    response.setHeader('RateLimit-Reset', result.resetAt.minute.toString());
  }

  /**
   * Log rate limit exceeded event
   */
  private logRateLimitExceeded(
    request: AuthenticatedRequest,
    result: TierRateLimitResult,
    identifier: string,
  ): void {
    this.logger.warn(`Rate limit exceeded`, {
      identifier,
      tier: result.tier,
      limitedBy: result.limitedBy,
      ip: this.getClientIp(request),
      userId: request.user?.id,
      apiKeyId: request.apiKey?.id,
      path: request.path,
      method: request.method,
      remaining: result.remaining,
      retryAfter: result.retryAfter,
    });
  }

  /**
   * Create rate limit exception with proper response format
   */
  private createRateLimitException(
    result: TierRateLimitResult,
    config: TierRateLimitConfig,
  ): HttpException {
    const windowName = result.limitedBy?.toLowerCase() || 'minute';
    const defaultMessage = `Rate limit exceeded. You have exceeded your ${windowName} quota. Please try again later.`;

    return new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: config.errorMessage || defaultMessage,
        tier: result.tier,
        limitedBy: result.limitedBy,
        limits: {
          minute: result.limits.minute === UNLIMITED ? 'unlimited' : result.limits.minute,
          hour: result.limits.hour === UNLIMITED ? 'unlimited' : result.limits.hour,
          day: result.limits.day === UNLIMITED ? 'unlimited' : result.limits.day,
        },
        remaining: result.remaining,
        resetAt: result.resetAt,
        retryAfter: result.retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
