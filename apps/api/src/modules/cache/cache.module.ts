import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheService } from './cache.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { CacheController } from './cache.controller';
import {
  CacheInterceptor,
  MultiLevelCacheInterceptor,
  SWRCacheInterceptor,
  BatchCacheInterceptor,
} from './cache.interceptor';

/**
 * Enhanced Cache Module
 *
 * Provides:
 * - Redis-backed caching with in-memory fallback
 * - LRU cache implementation
 * - @Cacheable, @CacheEvict, @CachePut decorators
 * - Smart cache invalidation with dependency graph
 * - Cache monitoring dashboard
 * - Multi-level caching (L1/L2)
 * - Stale-while-revalidate pattern
 * - Batch caching for array operations
 */
@Global()
@Module({
  controllers: [CacheController],
  providers: [
    CacheService,
    CacheInvalidationService,
    CacheInterceptor,
    MultiLevelCacheInterceptor,
    SWRCacheInterceptor,
    BatchCacheInterceptor,
    // Register CacheInterceptor globally
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
  exports: [
    CacheService,
    CacheInvalidationService,
    CacheInterceptor,
    MultiLevelCacheInterceptor,
    SWRCacheInterceptor,
    BatchCacheInterceptor,
  ],
})
export class CacheModule {}
