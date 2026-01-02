import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { CACHE_TTL } from './cache.constants';

/**
 * Global Cache Module with Redis configuration
 *
 * Provides Redis-based caching for the application.
 * TTL values are configured per use case.
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('redis.url') || 'redis://localhost:6379';

        // Dynamic import for redis store
        const redisStore = await import('cache-manager-redis-store');
        const url = new URL(redisUrl);

        return {
          store: redisStore.redisStore,
          socket: {
            host: url.hostname,
            port: parseInt(url.port, 10) || 6379,
          },
          password: url.password || undefined,
          ttl: CACHE_TTL.DEFAULT * 1000, // cache-manager uses milliseconds
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheModule {}
