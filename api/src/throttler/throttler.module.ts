import { Module, Global } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { RedisThrottlerStorageService } from './services/redis-throttler-storage.service';
import { CustomThrottlerGuard } from './guards/custom-throttler.guard';
import { RateLimitHeadersInterceptor } from './interceptors/rate-limit-headers.interceptor';

/**
 * Throttler Module
 *
 * Provides advanced rate limiting capabilities with:
 * - Redis-backed distributed storage
 * - Multiple rate limit tiers (Global, Auth, Payment, Public)
 * - Custom tracking by IP, User ID, or API Key
 * - Rate limit headers in responses
 * - Automatic blocking after excessive violations
 *
 * Configuration via environment variables:
 * - REDIS_URL: Redis connection URL (default: redis://localhost:6379)
 *
 * Rate Limit Tiers:
 * - Global: 100 requests/minute
 * - Auth: 5 requests/minute (anti brute-force)
 * - Payment: 10 requests/minute
 * - Public: 200 requests/minute
 * - Strict: 3 requests/5 minutes
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Redis storage service for distributed rate limiting
    RedisThrottlerStorageService,

    // Global throttler guard - applies to all routes by default
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },

    // Rate limit headers interceptor - adds X-RateLimit-* headers
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitHeadersInterceptor,
    },
  ],
  exports: [RedisThrottlerStorageService],
})
export class ThrottlerModule {}
