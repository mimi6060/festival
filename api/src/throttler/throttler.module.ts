import { Module, Global } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule as NestThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisThrottlerStorageService } from './services/redis-throttler-storage.service';
import { CustomThrottlerGuard } from './guards/custom-throttler.guard';
import { RateLimitHeadersInterceptor } from './interceptors/rate-limit-headers.interceptor';
import { THROTTLE_CONFIG } from './throttler.constants';

/**
 * Advanced Throttler Module
 *
 * Provides advanced rate limiting capabilities with:
 * - Redis-backed distributed storage for horizontal scaling
 * - Multiple rate limit tiers (Global, Auth, Payment, Public, Strict)
 * - Custom tracking by IP, User ID, or API Key
 * - Rate limit headers in responses (X-RateLimit-*)
 * - Automatic blocking after excessive violations
 * - Violation logging for security monitoring
 *
 * Configuration via environment variables:
 * - REDIS_URL: Redis connection URL (default: redis://localhost:6379)
 * - THROTTLE_TTL: Default TTL in ms (default: 60000)
 * - THROTTLE_LIMIT: Default limit (default: 100)
 *
 * Rate Limit Tiers:
 * - Global: 100 requests/minute (default for all endpoints)
 * - Auth: 5 requests/minute (anti brute-force for login, register, etc.)
 * - Payment: 10 requests/minute (payment processing endpoints)
 * - Public: 200 requests/minute (public endpoints like health checks)
 * - Strict: 3 requests/5 minutes (sensitive operations like password reset)
 *
 * Usage:
 * ```typescript
 * // Use default global rate limit (100 req/min)
 * @Controller('users')
 * export class UsersController {}
 *
 * // Apply auth rate limit (5 req/min)
 * @Controller('auth')
 * @ThrottleAuth()
 * export class AuthController {}
 *
 * // Apply payment rate limit (10 req/min)
 * @Controller('payments')
 * @ThrottlePayment()
 * export class PaymentsController {}
 *
 * // Skip throttling for webhooks
 * @Post('webhook')
 * @SkipThrottle()
 * async handleWebhook() {}
 *
 * // Custom rate limit
 * @Post('custom')
 * @Throttle(20, 60000) // 20 requests per minute
 * async customEndpoint() {}
 * ```
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    // Configure NestJS Throttler with multiple rate limit tiers
    NestThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            // Global rate limit: 100 requests per minute
            name: THROTTLE_CONFIG.GLOBAL.name,
            ttl: configService.get<number>('THROTTLE_TTL') || THROTTLE_CONFIG.GLOBAL.ttl,
            limit: configService.get<number>('THROTTLE_LIMIT') || THROTTLE_CONFIG.GLOBAL.limit,
          },
          {
            // Auth endpoints: 5 requests per minute (anti brute-force)
            name: THROTTLE_CONFIG.AUTH.name,
            ttl: THROTTLE_CONFIG.AUTH.ttl,
            limit: THROTTLE_CONFIG.AUTH.limit,
          },
          {
            // Payment endpoints: 10 requests per minute
            name: THROTTLE_CONFIG.PAYMENT.name,
            ttl: THROTTLE_CONFIG.PAYMENT.ttl,
            limit: THROTTLE_CONFIG.PAYMENT.limit,
          },
          {
            // Public endpoints: 200 requests per minute
            name: THROTTLE_CONFIG.PUBLIC.name,
            ttl: THROTTLE_CONFIG.PUBLIC.ttl,
            limit: THROTTLE_CONFIG.PUBLIC.limit,
          },
          {
            // Strict rate limit: 3 requests per 5 minutes
            name: THROTTLE_CONFIG.STRICT.name,
            ttl: THROTTLE_CONFIG.STRICT.ttl,
            limit: THROTTLE_CONFIG.STRICT.limit,
          },
        ],
      }),
    }),
  ],
  providers: [
    // Redis storage service for distributed rate limiting
    RedisThrottlerStorageService,

    // Custom throttler guard with advanced tracking (IP, User ID, API Key)
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },

    // Rate limit headers interceptor - adds X-RateLimit-* headers to responses
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitHeadersInterceptor,
    },
  ],
  exports: [RedisThrottlerStorageService, NestThrottlerModule],
})
export class ThrottlerModule {}
