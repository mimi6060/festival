/**
 * Rate Limit Interceptor for Festival Platform API
 *
 * Adds rate limit information headers to all responses:
 * - X-RateLimit-Limit: Maximum requests allowed
 * - X-RateLimit-Remaining: Remaining requests in current window
 * - X-RateLimit-Reset: Unix timestamp when the limit resets
 * - X-RateLimit-Policy: Description of the rate limit policy
 * - Retry-After: Seconds until limit resets (when exceeded)
 *
 * Also implements:
 * - Plan-based rate limit information
 * - Request cost tracking for weighted endpoints
 * - Rate limit bypass for internal services
 *
 * @module RateLimitInterceptor
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import {
  RATE_LIMIT_KEY,
  SKIP_RATE_LIMIT_KEY,
  UserPlan,
  PLAN_RATE_LIMITS,
  ANONYMOUS_RATE_LIMIT,
  type RateLimitConfig,
} from '../guards/rate-limit.guard';

// ============================================================================
// Types
// ============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    plan?: UserPlan;
    role?: string;
  };
  rateLimitInfo?: {
    limit: number;
    remaining: number;
    reset: number;
    cost: number;
    policy: string;
  };
}

interface RateLimitModuleOptions {
  enableHeaders?: boolean;
  defaultLimit?: number;
  defaultWindowSeconds?: number;
}

// ============================================================================
// Rate Limit Interceptor
// ============================================================================

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject('RATE_LIMIT_OPTIONS') private readonly options?: RateLimitModuleOptions,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check if rate limiting is skipped
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipRateLimit) {
      return next.handle();
    }

    // Get rate limit configuration
    const config = this.getRateLimitConfig(context, request);

    // Set informational headers before request processing
    this.setPreRequestHeaders(response, config, request);

    return next.handle().pipe(
      tap({
        next: () => {
          // Set final headers after successful response
          this.setPostRequestHeaders(response, config, request);
        },
        error: () => {
          // Headers are already set by the guard if rate limited
        },
      }),
    );
  }

  /**
   * Get rate limit configuration for the current request
   */
  private getRateLimitConfig(context: ExecutionContext, request: AuthenticatedRequest): RateLimitConfig {
    // Check for endpoint-specific config
    const decoratorConfig = this.reflector.getAllAndOverride<RateLimitConfig>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (decoratorConfig) {
      return decoratorConfig;
    }

    // Use plan-based config for authenticated users
    if (request.user) {
      const plan = request.user.plan || UserPlan.FREE;
      return PLAN_RATE_LIMITS[plan];
    }

    // Fall back to anonymous rate limit
    return ANONYMOUS_RATE_LIMIT;
  }

  /**
   * Set headers before request processing
   */
  private setPreRequestHeaders(
    response: Response,
    config: RateLimitConfig,
    request: AuthenticatedRequest,
  ): void {
    // Set policy header
    const policy = this.buildPolicyString(config, request);
    response.setHeader('X-RateLimit-Policy', policy);

    // Set limit header
    response.setHeader('X-RateLimit-Limit', config.limit.toString());

    // Set window header
    response.setHeader('X-RateLimit-Window', `${config.windowSeconds}s`);

    // Set cost header if applicable
    if (config.cost && config.cost > 1) {
      response.setHeader('X-RateLimit-Cost', config.cost.toString());
    }
  }

  /**
   * Set headers after request processing
   */
  private setPostRequestHeaders(
    response: Response,
    config: RateLimitConfig,
    request: AuthenticatedRequest,
  ): void {
    // If rate limit info is attached by the guard, use it
    if (request.rateLimitInfo) {
      response.setHeader('X-RateLimit-Remaining', request.rateLimitInfo.remaining.toString());
      response.setHeader('X-RateLimit-Reset', request.rateLimitInfo.reset.toString());
    }

    // Set RateLimit draft standard headers (IETF)
    if (!response.getHeader('RateLimit-Limit')) {
      response.setHeader('RateLimit-Limit', config.limit.toString());
    }

    // Add plan-specific header for authenticated users
    if (request.user?.plan) {
      response.setHeader('X-RateLimit-Plan', request.user.plan);
    }
  }

  /**
   * Build a human-readable policy string
   */
  private buildPolicyString(config: RateLimitConfig, request: AuthenticatedRequest): string {
    const parts: string[] = [];

    // Add limit info
    parts.push(`${config.limit} requests`);

    // Add window info
    if (config.windowSeconds < 60) {
      parts.push(`per ${config.windowSeconds} seconds`);
    } else if (config.windowSeconds < 3600) {
      parts.push(`per ${config.windowSeconds / 60} minutes`);
    } else {
      parts.push(`per ${config.windowSeconds / 3600} hours`);
    }

    // Add plan info
    if (request.user?.plan) {
      parts.push(`(${request.user.plan} plan)`);
    } else {
      parts.push('(anonymous)');
    }

    // Add scope info
    if (config.perUser) {
      parts.push('per user');
    } else {
      parts.push('per IP');
    }

    return parts.join(' ');
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse rate limit headers from a response
 */
export function parseRateLimitHeaders(headers: Record<string, string>): {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
} {
  return {
    limit: parseInt(headers['x-ratelimit-limit'] || '0', 10),
    remaining: parseInt(headers['x-ratelimit-remaining'] || '0', 10),
    reset: parseInt(headers['x-ratelimit-reset'] || '0', 10),
    retryAfter: headers['retry-after'] ? parseInt(headers['retry-after'], 10) : undefined,
  };
}

/**
 * Check if a response indicates rate limiting
 */
export function isRateLimited(statusCode: number, headers: Record<string, string>): boolean {
  if (statusCode === 429) {
    return true;
  }
  const remaining = parseInt(headers['x-ratelimit-remaining'] || '1', 10);
  return remaining <= 0;
}

/**
 * Calculate time until rate limit resets
 */
export function getTimeUntilReset(headers: Record<string, string>): number {
  const reset = parseInt(headers['x-ratelimit-reset'] || '0', 10);
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, reset - now);
}
