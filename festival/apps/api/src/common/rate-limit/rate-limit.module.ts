/**
 * Rate Limiting Module for Festival Platform API
 *
 * Provides comprehensive rate limiting capabilities:
 * - Global and per-endpoint rate limits
 * - User-based and IP-based throttling
 * - Plan-based quotas (free, premium, enterprise)
 * - Redis-backed distributed rate limiting
 * - Rate limit headers in all responses
 *
 * @module RateLimitModule
 */

import { Module, Global, DynamicModule, Provider, Type } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitInterceptor } from './rate-limit.interceptor';

// ============================================================================
// Module Options
// ============================================================================

/**
 * Rate limit module configuration options
 */
export interface RateLimitModuleOptions {
  /** Redis connection URL */
  redisUrl?: string;
  /** Default rate limit for all endpoints */
  defaultLimit?: number;
  /** Default time window in seconds */
  defaultWindowSeconds?: number;
  /** Enable global rate limiting */
  enableGlobal?: boolean;
  /** Enable rate limit headers */
  enableHeaders?: boolean;
  /** Skip rate limiting in development */
  skipInDevelopment?: boolean;
  /** Whitelist of IPs to skip rate limiting */
  whitelist?: string[];
  /** Custom error message */
  errorMessage?: string;
}

/**
 * Async options factory interface
 */
export interface RateLimitModuleAsyncOptions {
  imports?: Type<any>[];
  useFactory: (...args: any[]) => Promise<RateLimitModuleOptions> | RateLimitModuleOptions;
  inject?: any[];
}

// ============================================================================
// Rate Limit Module
// ============================================================================

@Global()
@Module({})
export class RateLimitModule {
  /**
   * Register the module with static options
   */
  static forRoot(options: RateLimitModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'RATE_LIMIT_OPTIONS',
        useValue: options,
      },
      RateLimitService,
    ];

    if (options.enableGlobal !== false) {
      providers.push({
        provide: APP_GUARD,
        useClass: RateLimitGuard,
      });
    }

    if (options.enableHeaders !== false) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useClass: RateLimitInterceptor,
      });
    }

    return {
      module: RateLimitModule,
      imports: [ConfigModule],
      providers,
      exports: [RateLimitService, 'RATE_LIMIT_OPTIONS'],
    };
  }

  /**
   * Register the module with async options (using factory)
   */
  static forRootAsync(options: RateLimitModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'RATE_LIMIT_OPTIONS',
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      RateLimitService,
      {
        provide: APP_GUARD,
        useClass: RateLimitGuard,
      },
      {
        provide: APP_INTERCEPTOR,
        useClass: RateLimitInterceptor,
      },
    ];

    return {
      module: RateLimitModule,
      imports: [...(options.imports || []), ConfigModule],
      providers,
      exports: [RateLimitService, 'RATE_LIMIT_OPTIONS'],
    };
  }

  /**
   * Register with environment-based configuration
   */
  static forRootWithConfig(): DynamicModule {
    return this.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): RateLimitModuleOptions => ({
        redisUrl: configService.get<string>('REDIS_URL'),
        defaultLimit: configService.get<number>('RATE_LIMIT_DEFAULT', 100),
        defaultWindowSeconds: configService.get<number>('RATE_LIMIT_WINDOW', 60),
        enableGlobal: configService.get<boolean>('RATE_LIMIT_ENABLED', true),
        enableHeaders: true,
        skipInDevelopment: configService.get<string>('NODE_ENV') === 'development',
        whitelist: configService.get<string>('RATE_LIMIT_WHITELIST', '').split(',').filter(Boolean),
        errorMessage: configService.get<string>('RATE_LIMIT_MESSAGE', 'Too many requests. Please try again later.'),
      }),
      inject: [ConfigService],
    });
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export { RateLimitGuard } from '../guards/rate-limit.guard';
export { RateLimitService } from '../services/rate-limit.service';
export {
  RateLimit,
  SkipRateLimit,
  StrictRateLimit,
  BurstRateLimit,
  PlanBasedRateLimit,
  UserPlan,
  PLAN_RATE_LIMITS,
  ENDPOINT_RATE_LIMITS,
  ANONYMOUS_RATE_LIMIT,
  type RateLimitConfig,
  type RateLimitState,
} from '../guards/rate-limit.guard';
export {
  type RateLimitResult,
  type RateLimitOptions,
  type RateLimitMetrics,
  type RateLimitAlgorithm,
} from '../services/rate-limit.service';
