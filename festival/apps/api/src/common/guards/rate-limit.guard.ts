/**
 * Rate Limiting Guard for Festival Platform API
 *
 * Provides comprehensive rate limiting functionality including:
 * - Per-endpoint rate limits
 * - User/IP based throttling
 * - Plan-based quotas (free, premium, enterprise)
 * - Sliding window algorithm with Redis backend
 * - Rate limit headers in responses
 *
 * @module RateLimitGuard
 * @security Critical - Protects against DDoS and abuse
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
import { Redis } from 'ioredis';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * User plan types for quota-based rate limiting
 */
export enum UserPlan {
  FREE = 'free',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
  INTERNAL = 'internal',
}

/**
 * Rate limit configuration for a specific endpoint or plan
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Optional custom key prefix */
  keyPrefix?: string;
  /** Whether to skip rate limiting for authenticated users */
  skipAuthenticated?: boolean;
  /** Whether to apply per-user limits (vs per-IP) */
  perUser?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Points cost per request (for weighted rate limiting) */
  cost?: number;
}

/**
 * Rate limit state for a specific key
 */
export interface RateLimitState {
  /** Number of requests made in current window */
  count: number;
  /** Remaining requests allowed */
  remaining: number;
  /** Unix timestamp when the window resets */
  resetAt: number;
  /** Total limit for the window */
  limit: number;
  /** Whether the rate limit has been exceeded */
  exceeded: boolean;
  /** Retry after seconds (if exceeded) */
  retryAfter?: number;
}

/**
 * Request with user context
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
    plan?: UserPlan;
  };
}

// ============================================================================
// Decorator Metadata Keys
// ============================================================================

export const RATE_LIMIT_KEY = 'rate_limit';
export const SKIP_RATE_LIMIT_KEY = 'skip_rate_limit';
export const RATE_LIMIT_PLAN_KEY = 'rate_limit_plan';

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default rate limits per user plan
 */
export const PLAN_RATE_LIMITS: Record<UserPlan, RateLimitConfig> = {
  [UserPlan.FREE]: {
    limit: 100,
    windowSeconds: 60,
    keyPrefix: 'free',
  },
  [UserPlan.PREMIUM]: {
    limit: 1000,
    windowSeconds: 60,
    keyPrefix: 'premium',
  },
  [UserPlan.ENTERPRISE]: {
    limit: 10000,
    windowSeconds: 60,
    keyPrefix: 'enterprise',
  },
  [UserPlan.INTERNAL]: {
    limit: 100000,
    windowSeconds: 60,
    keyPrefix: 'internal',
  },
};

/**
 * Default rate limits for anonymous requests
 */
export const ANONYMOUS_RATE_LIMIT: RateLimitConfig = {
  limit: 60,
  windowSeconds: 60,
  keyPrefix: 'anon',
};

/**
 * Endpoint-specific rate limits
 */
export const ENDPOINT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth endpoints - strict limits to prevent brute force
  'POST:/api/auth/login': {
    limit: 5,
    windowSeconds: 300, // 5 attempts per 5 minutes
    keyPrefix: 'auth:login',
    errorMessage: 'Too many login attempts. Please try again in 5 minutes.',
  },
  'POST:/api/auth/register': {
    limit: 3,
    windowSeconds: 3600, // 3 registrations per hour per IP
    keyPrefix: 'auth:register',
    errorMessage: 'Too many registration attempts. Please try again later.',
  },
  'POST:/api/auth/forgot-password': {
    limit: 3,
    windowSeconds: 3600, // 3 requests per hour
    keyPrefix: 'auth:forgot',
    errorMessage: 'Too many password reset requests. Please try again later.',
  },
  'POST:/api/auth/resend-verification': {
    limit: 3,
    windowSeconds: 900, // 3 per 15 minutes
    keyPrefix: 'auth:verify',
  },

  // Payment endpoints - moderate limits
  'POST:/api/payments/checkout': {
    limit: 10,
    windowSeconds: 60,
    keyPrefix: 'payment:checkout',
    perUser: true,
    errorMessage: 'Too many payment requests. Please wait before trying again.',
  },
  'POST:/api/payments/refund': {
    limit: 5,
    windowSeconds: 300,
    keyPrefix: 'payment:refund',
    perUser: true,
  },

  // Cashless endpoints
  'POST:/api/cashless/topup': {
    limit: 10,
    windowSeconds: 60,
    keyPrefix: 'cashless:topup',
    perUser: true,
  },
  'POST:/api/cashless/pay': {
    limit: 60,
    windowSeconds: 60, // Higher limit for point of sale usage
    keyPrefix: 'cashless:pay',
    perUser: true,
  },

  // Ticket endpoints
  'POST:/api/tickets/buy': {
    limit: 10,
    windowSeconds: 60,
    keyPrefix: 'tickets:buy',
    perUser: true,
    errorMessage: 'Too many purchase attempts. Please wait before trying again.',
  },
  'POST:/api/tickets/validate': {
    limit: 120,
    windowSeconds: 60, // High limit for entry scanning
    keyPrefix: 'tickets:validate',
    perUser: true,
  },

  // Data export endpoints - lower limits
  'GET:/api/analytics/export': {
    limit: 5,
    windowSeconds: 300,
    keyPrefix: 'export:analytics',
    perUser: true,
    cost: 10, // Weighted - counts as 10 requests
  },
  'GET:/api/tickets/export': {
    limit: 5,
    windowSeconds: 300,
    keyPrefix: 'export:tickets',
    perUser: true,
    cost: 10,
  },

  // Search endpoints
  'GET:/api/search': {
    limit: 30,
    windowSeconds: 60,
    keyPrefix: 'search',
  },

  // Webhook endpoints - special handling
  'POST:/api/webhooks/stripe': {
    limit: 1000,
    windowSeconds: 60,
    keyPrefix: 'webhook:stripe',
    skipAuthenticated: true,
  },
};

// ============================================================================
// In-Memory Rate Limiter (Fallback)
// ============================================================================

/**
 * Simple in-memory rate limiter for development/fallback
 */
class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();
  private readonly logger = new Logger('InMemoryRateLimiter');

  async increment(key: string, windowSeconds: number, cost = 1): Promise<RateLimitState> {
    const now = Math.floor(Date.now() / 1000);
    const entry = this.store.get(key);

    if (!entry || entry.resetAt <= now) {
      // Create new window
      const resetAt = now + windowSeconds;
      this.store.set(key, { count: cost, resetAt });
      return {
        count: cost,
        remaining: 0, // Will be calculated by caller
        resetAt,
        limit: 0, // Will be set by caller
        exceeded: false,
      };
    }

    // Increment existing window
    entry.count += cost;
    return {
      count: entry.count,
      remaining: 0,
      resetAt: entry.resetAt,
      limit: 0,
      exceeded: false,
    };
  }

  async getState(key: string): Promise<{ count: number; resetAt: number } | null> {
    const now = Math.floor(Date.now() / 1000);
    const entry = this.store.get(key);

    if (!entry || entry.resetAt <= now) {
      return null;
    }

    return entry;
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    let cleaned = 0;

    for (const [key, value] of this.store.entries()) {
      if (value.resetAt <= now) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }
}

// ============================================================================
// Redis Rate Limiter
// ============================================================================

/**
 * Redis-based rate limiter using sliding window algorithm
 */
class RedisRateLimiter {
  private readonly logger = new Logger('RedisRateLimiter');

  constructor(private readonly redis: Redis) {}

  /**
   * Increment rate limit counter using sliding window
   */
  async increment(
    key: string,
    windowSeconds: number,
    limit: number,
    cost = 1,
  ): Promise<RateLimitState> {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;
    const fullKey = `ratelimit:${key}`;

    try {
      // Use Redis sorted set for sliding window
      const pipeline = this.redis.pipeline();

      // Remove expired entries
      pipeline.zremrangebyscore(fullKey, 0, windowStart);

      // Add current request
      pipeline.zadd(fullKey, now, `${now}:${Math.random()}`);

      // Count requests in window
      pipeline.zcard(fullKey);

      // Set expiry
      pipeline.expire(fullKey, windowSeconds + 1);

      const results = await pipeline.exec();
      const count = (results?.[2]?.[1] as number) || 0;

      const remaining = Math.max(0, limit - count);
      const exceeded = count > limit;
      const resetAt = now + windowSeconds;

      return {
        count,
        remaining,
        resetAt,
        limit,
        exceeded,
        retryAfter: exceeded ? windowSeconds : undefined,
      };
    } catch (error) {
      this.logger.error('Redis rate limit error', error);
      // Fail open - allow request but log error
      return {
        count: 0,
        remaining: limit,
        resetAt: now + windowSeconds,
        limit,
        exceeded: false,
      };
    }
  }

  /**
   * Get current rate limit state without incrementing
   */
  async getState(key: string, windowSeconds: number, limit: number): Promise<RateLimitState> {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;
    const fullKey = `ratelimit:${key}`;

    try {
      const count = await this.redis.zcount(fullKey, windowStart, '+inf');
      const remaining = Math.max(0, limit - count);

      return {
        count,
        remaining,
        resetAt: now + windowSeconds,
        limit,
        exceeded: count >= limit,
      };
    } catch (error) {
      this.logger.error('Redis rate limit state error', error);
      return {
        count: 0,
        remaining: limit,
        resetAt: now + windowSeconds,
        limit,
        exceeded: false,
      };
    }
  }
}

// ============================================================================
// Rate Limit Guard
// ============================================================================

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly inMemoryLimiter: InMemoryRateLimiter;
  private redisLimiter: RedisRateLimiter | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject('REDIS_CLIENT') private readonly redis?: Redis,
  ) {
    this.inMemoryLimiter = new InMemoryRateLimiter();

    if (redis) {
      this.redisLimiter = new RedisRateLimiter(redis);
      this.logger.log('Rate limiting using Redis backend');
    } else {
      this.logger.warn('Redis not available, using in-memory rate limiting (not recommended for production)');
      // Setup cleanup for in-memory store
      this.cleanupInterval = setInterval(() => {
        this.inMemoryLimiter.cleanup();
      }, 60000); // Every minute
    }
  }

  /**
   * Main guard execution
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check if rate limiting should be skipped
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipRateLimit) {
      return true;
    }

    // Get rate limit configuration
    const config = this.getRateLimitConfig(context, request);

    // Generate rate limit key
    const key = this.generateKey(request, config);

    // Check and update rate limit
    const state = await this.checkRateLimit(key, config);

    // Always set rate limit headers
    this.setRateLimitHeaders(response, state, config);

    if (state.exceeded) {
      this.logger.warn(`Rate limit exceeded for ${key}`, {
        ip: this.getClientIp(request),
        userId: request.user?.id,
        path: request.path,
        method: request.method,
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: config.errorMessage || 'Rate limit exceeded. Please try again later.',
          retryAfter: state.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Get rate limit configuration for the current request
   */
  private getRateLimitConfig(context: ExecutionContext, request: AuthenticatedRequest): RateLimitConfig {
    // 1. Check for endpoint-specific decorator config
    const decoratorConfig = this.reflector.getAllAndOverride<RateLimitConfig>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (decoratorConfig) {
      return decoratorConfig;
    }

    // 2. Check for endpoint-specific predefined config
    const endpointKey = `${request.method}:${request.path}`;
    const endpointConfig = ENDPOINT_RATE_LIMITS[endpointKey];

    if (endpointConfig) {
      return endpointConfig;
    }

    // 3. Check for pattern-based endpoint config
    for (const [pattern, config] of Object.entries(ENDPOINT_RATE_LIMITS)) {
      if (this.matchesPattern(endpointKey, pattern)) {
        return config;
      }
    }

    // 4. Use plan-based config for authenticated users
    if (request.user) {
      const plan = request.user.plan || UserPlan.FREE;
      return PLAN_RATE_LIMITS[plan];
    }

    // 5. Fall back to anonymous rate limit
    return ANONYMOUS_RATE_LIMIT;
  }

  /**
   * Check if endpoint matches a pattern
   */
  private matchesPattern(endpoint: string, pattern: string): boolean {
    // Simple pattern matching with wildcards
    const regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '.*')
      .replace(/\\\?/g, '.');

    return new RegExp(`^${regexPattern}$`).test(endpoint);
  }

  /**
   * Generate rate limit key
   */
  private generateKey(request: AuthenticatedRequest, config: RateLimitConfig): string {
    const parts: string[] = [];

    // Add prefix
    if (config.keyPrefix) {
      parts.push(config.keyPrefix);
    }

    // Add user ID or IP
    if (config.perUser && request.user?.id) {
      parts.push(`user:${request.user.id}`);
    } else {
      const ip = this.getClientIp(request);
      parts.push(`ip:${ip}`);
    }

    // Add endpoint info for general limits
    if (!config.keyPrefix) {
      parts.push(request.method);
      parts.push(request.path.replace(/\//g, ':'));
    }

    return parts.join(':');
  }

  /**
   * Get client IP address, handling proxies
   */
  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  /**
   * Check rate limit using Redis or in-memory store
   */
  private async checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitState> {
    const cost = config.cost || 1;

    if (this.redisLimiter) {
      return this.redisLimiter.increment(key, config.windowSeconds, config.limit, cost);
    }

    // Use in-memory fallback
    const state = await this.inMemoryLimiter.increment(key, config.windowSeconds, cost);
    state.limit = config.limit;
    state.remaining = Math.max(0, config.limit - state.count);
    state.exceeded = state.count > config.limit;

    if (state.exceeded) {
      state.retryAfter = state.resetAt - Math.floor(Date.now() / 1000);
    }

    return state;
  }

  /**
   * Set rate limit headers on response
   */
  private setRateLimitHeaders(response: Response, state: RateLimitState, config: RateLimitConfig): void {
    // Standard rate limit headers
    response.setHeader('X-RateLimit-Limit', state.limit.toString());
    response.setHeader('X-RateLimit-Remaining', state.remaining.toString());
    response.setHeader('X-RateLimit-Reset', state.resetAt.toString());

    // Additional headers for transparency
    response.setHeader('X-RateLimit-Window', config.windowSeconds.toString());

    // Retry-After header when exceeded
    if (state.exceeded && state.retryAfter) {
      response.setHeader('Retry-After', state.retryAfter.toString());
    }

    // RateLimit draft standard headers (IETF draft)
    response.setHeader('RateLimit-Limit', state.limit.toString());
    response.setHeader('RateLimit-Remaining', state.remaining.toString());
    response.setHeader('RateLimit-Reset', state.retryAfter?.toString() || '0');
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// ============================================================================
// Decorators
// ============================================================================

import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { ApiTooManyRequestsResponse } from '@nestjs/swagger';

/**
 * Apply custom rate limit to an endpoint
 *
 * @example
 * ```typescript
 * @RateLimit({ limit: 5, windowSeconds: 60 })
 * @Post('sensitive-action')
 * async sensitiveAction() { ... }
 * ```
 */
export function RateLimit(config: Partial<RateLimitConfig>) {
  const fullConfig: RateLimitConfig = {
    limit: config.limit || 100,
    windowSeconds: config.windowSeconds || 60,
    ...config,
  };

  return applyDecorators(
    SetMetadata(RATE_LIMIT_KEY, fullConfig),
    UseGuards(RateLimitGuard),
    ApiTooManyRequestsResponse({
      description: `Rate limited: ${fullConfig.limit} requests per ${fullConfig.windowSeconds} seconds`,
    }),
  );
}

/**
 * Skip rate limiting for an endpoint
 *
 * @example
 * ```typescript
 * @SkipRateLimit()
 * @Get('public-health')
 * async healthCheck() { ... }
 * ```
 */
export function SkipRateLimit() {
  return SetMetadata(SKIP_RATE_LIMIT_KEY, true);
}

/**
 * Apply strict rate limiting for sensitive endpoints
 */
export function StrictRateLimit() {
  return RateLimit({
    limit: 5,
    windowSeconds: 300,
    errorMessage: 'Too many attempts. Please wait 5 minutes before trying again.',
  });
}

/**
 * Apply burst rate limiting (high limit, short window)
 */
export function BurstRateLimit() {
  return RateLimit({
    limit: 30,
    windowSeconds: 10,
    errorMessage: 'Too many requests. Please slow down.',
  });
}

/**
 * Apply API rate limiting based on user plan
 */
export function PlanBasedRateLimit() {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_PLAN_KEY, true),
    UseGuards(RateLimitGuard),
    ApiTooManyRequestsResponse({
      description: 'Rate limited based on user plan',
    }),
  );
}
