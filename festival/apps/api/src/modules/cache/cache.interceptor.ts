import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, from } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { CacheService, CacheTag } from './cache.service';
import {
  CACHE_KEY_METADATA,
  CACHE_OPTIONS_METADATA,
  CACHE_EVICT_METADATA,
  CACHE_PUT_METADATA,
  CACHE_INVALIDATE_TAGS_METADATA,
  generateCacheKey,
  CacheableOptions,
  CacheEvictOptions,
  CachePutOptions,
} from './cache.decorators';

/**
 * Cache Interceptor
 *
 * Handles @Cacheable, @CacheEvict, @CachePut, and @InvalidateTags decorators.
 * Implements intelligent caching with support for:
 * - TTL-based expiration
 * - Tag-based invalidation
 * - Pattern-based eviction
 * - Conditional caching
 * - Cache stampede prevention
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const target = context.getClass();

    // Check for cache decorators
    const cacheKeyMeta = this.reflector.get(CACHE_KEY_METADATA, handler);
    const cacheOptions = this.reflector.get<CacheableOptions>(
      CACHE_OPTIONS_METADATA,
      handler,
    );
    const evictOptions = this.reflector.get<CacheEvictOptions>(
      CACHE_EVICT_METADATA,
      handler,
    );
    const putOptions = this.reflector.get<CachePutOptions>(
      CACHE_PUT_METADATA,
      handler,
    );
    const invalidateTags = this.reflector.get<CacheTag[]>(
      CACHE_INVALIDATE_TAGS_METADATA,
      handler,
    );

    // Get method arguments
    const args = context.getArgs();
    const methodName = handler.name;

    // Handle @CacheEvict with beforeInvocation
    if (evictOptions?.beforeInvocation) {
      this.handleEviction(evictOptions, target.prototype, methodName, args);
    }

    // Handle @Cacheable
    if (cacheOptions && !putOptions && !evictOptions) {
      return this.handleCacheable(
        cacheKeyMeta,
        cacheOptions,
        target.prototype,
        methodName,
        args,
        next,
      );
    }

    // Handle @CachePut (always execute and cache)
    if (putOptions) {
      return this.handleCachePut(
        putOptions,
        target.prototype,
        methodName,
        args,
        next,
      );
    }

    // Execute method
    return next.handle().pipe(
      tap(async (result) => {
        // Handle @CacheEvict after invocation
        if (evictOptions && !evictOptions.beforeInvocation) {
          await this.handleEviction(
            evictOptions,
            target.prototype,
            methodName,
            args,
          );
        }

        // Handle @InvalidateTags
        if (invalidateTags && invalidateTags.length > 0) {
          await this.handleTagInvalidation(invalidateTags);
        }
      }),
    );
  }

  /**
   * Handle @Cacheable decorator
   */
  private handleCacheable(
    keyMeta: any,
    options: CacheableOptions,
    target: any,
    methodName: string,
    args: any[],
    next: CallHandler,
  ): Observable<any> {
    const cacheKey = generateCacheKey(keyMeta || options.key, target, methodName, args);

    return from(this.cacheService.get(cacheKey)).pipe(
      switchMap((cachedValue) => {
        if (cachedValue !== null) {
          this.logger.debug(`Cache hit for key: ${cacheKey}`);
          return of(cachedValue);
        }

        this.logger.debug(`Cache miss for key: ${cacheKey}`);

        // Use getOrSet for cache stampede prevention if sync is enabled
        if (options.sync) {
          return from(
            this.cacheService.getOrSet(
              cacheKey,
              async () => {
                // Execute the actual method
                const result = await next.handle().toPromise();
                return result;
              },
              {
                ttl: options.ttl,
                tags: options.tags,
              },
            ),
          );
        }

        // Normal execution without sync
        return next.handle().pipe(
          tap(async (result) => {
            // Check condition before caching
            if (options.condition && !options.condition(result, ...args)) {
              return;
            }

            // Check unless condition
            if (options.unless?.(result, ...args)) {
              return;
            }

            // Cache the result
            await this.cacheService.set(cacheKey, result, {
              ttl: options.ttl,
              tags: options.tags,
            });

            this.logger.debug(`Cached result for key: ${cacheKey}`);
          }),
        );
      }),
    );
  }

  /**
   * Handle @CachePut decorator
   */
  private handleCachePut(
    options: CachePutOptions,
    target: any,
    methodName: string,
    args: any[],
    next: CallHandler,
  ): Observable<any> {
    const cacheKey = generateCacheKey(options.key, target, methodName, args);

    return next.handle().pipe(
      tap(async (result) => {
        // Check condition before caching
        if (options.condition && !options.condition(result, ...args)) {
          return;
        }

        // Check unless condition
        if (options.unless?.(result, ...args)) {
          return;
        }

        // Always update cache
        await this.cacheService.set(cacheKey, result, {
          ttl: options.ttl,
          tags: options.tags,
        });

        this.logger.debug(`Updated cache for key: ${cacheKey}`);
      }),
    );
  }

  /**
   * Handle @CacheEvict decorator
   */
  private async handleEviction(
    options: CacheEvictOptions,
    target: any,
    methodName: string,
    args: any[],
  ): Promise<void> {
    // Check condition
    if (options.condition && !options.condition(...args)) {
      return;
    }

    // Evict all entries
    if (options.allEntries) {
      await this.cacheService.clear();
      this.logger.debug('Cleared all cache entries');
      return;
    }

    // Evict by tags
    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        await this.cacheService.invalidateByTag(tag);
      }
      this.logger.debug(`Evicted cache by tags: ${options.tags.join(', ')}`);
    }

    // Evict by pattern
    if (options.pattern) {
      await this.cacheService.deletePattern(options.pattern);
      this.logger.debug(`Evicted cache by pattern: ${options.pattern}`);
    }

    // Evict by key
    if (options.key) {
      const cacheKey = generateCacheKey(options.key, target, methodName, args);
      await this.cacheService.delete(cacheKey);
      this.logger.debug(`Evicted cache for key: ${cacheKey}`);
    }
  }

  /**
   * Handle @InvalidateTags decorator
   */
  private async handleTagInvalidation(tags: CacheTag[]): Promise<void> {
    for (const tag of tags) {
      await this.cacheService.invalidateByTag(tag);
    }
    this.logger.debug(`Invalidated cache for tags: ${tags.join(', ')}`);
  }
}

/**
 * Multi-Level Cache Interceptor
 *
 * Handles @MultiLevelCache decorator with L1 (local) and L2 (Redis) caching.
 */
@Injectable()
export class MultiLevelCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MultiLevelCacheInterceptor.name);
  private readonly l1Cache = new Map<string, { value: any; expiry: number }>();

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const options = this.reflector.get<any>('cache:multi_level', handler);

    if (!options) {
      return next.handle();
    }

    const target = context.getClass();
    const args = context.getArgs();
    const methodName = handler.name;
    const cacheKey = generateCacheKey(
      options.key,
      target.prototype,
      methodName,
      args,
    );

    return from(this.getFromL1OrL2(cacheKey, options)).pipe(
      switchMap((cachedValue) => {
        if (cachedValue !== null) {
          return of(cachedValue);
        }

        return next.handle().pipe(
          tap(async (result) => {
            await this.setInL1AndL2(cacheKey, result, options);
          }),
        );
      }),
    );
  }

  private async getFromL1OrL2(key: string, options: any): Promise<any> {
    // Check L1 (local memory)
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry && l1Entry.expiry > Date.now()) {
      this.logger.debug(`L1 cache hit for key: ${key}`);
      return l1Entry.value;
    }

    // Check L2 (Redis)
    const l2Value = await this.cacheService.get(key);
    if (l2Value !== null) {
      this.logger.debug(`L2 cache hit for key: ${key}`);

      // Populate L1 from L2
      if (options.l1?.ttl) {
        this.l1Cache.set(key, {
          value: l2Value,
          expiry: Date.now() + options.l1.ttl * 1000,
        });
      }

      return l2Value;
    }

    return null;
  }

  private async setInL1AndL2(key: string, value: any, options: any): Promise<void> {
    // Set in L1
    if (options.l1?.ttl) {
      this.l1Cache.set(key, {
        value,
        expiry: Date.now() + options.l1.ttl * 1000,
      });

      // Enforce max size for L1
      if (options.l1.maxSize && this.l1Cache.size > options.l1.maxSize) {
        const firstKey = this.l1Cache.keys().next().value;
        if (firstKey) {
          this.l1Cache.delete(firstKey);
        }
      }
    }

    // Set in L2
    if (options.l2?.ttl) {
      await this.cacheService.set(key, value, {
        ttl: options.l2.ttl,
        tags: options.l2.tags,
      });
    }

    this.logger.debug(`Set in L1 and L2 for key: ${key}`);
  }
}

/**
 * Stale-While-Revalidate Interceptor
 *
 * Handles @StaleWhileRevalidate decorator.
 * Returns stale data immediately while refreshing in background.
 */
@Injectable()
export class SWRCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SWRCacheInterceptor.name);
  private readonly revalidating = new Set<string>();

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const options = this.reflector.get<any>('cache:swr', handler);

    if (!options) {
      return next.handle();
    }

    const target = context.getClass();
    const args = context.getArgs();
    const methodName = handler.name;
    const cacheKey = generateCacheKey(
      options.key,
      target.prototype,
      methodName,
      args,
    );
    const metaKey = `${cacheKey}:meta`;

    return from(this.handleSWR(cacheKey, metaKey, options, next));
  }

  private async handleSWR(
    cacheKey: string,
    metaKey: string,
    options: any,
    next: CallHandler,
  ): Promise<any> {
    const [cachedValue, meta] = await Promise.all([
      this.cacheService.get(cacheKey),
      this.cacheService.get<{ timestamp: number }>(metaKey),
    ]);

    const now = Date.now();
    const isStale = meta && now - meta.timestamp > options.staleTime * 1000;
    const isExpired = meta && now - meta.timestamp > options.maxAge * 1000;

    // If expired or no cache, fetch fresh data
    if (cachedValue === null || isExpired) {
      const result = await next.handle().toPromise();
      await this.updateCache(cacheKey, metaKey, result, options);
      return result;
    }

    // If stale, return cached but refresh in background
    if (isStale && !this.revalidating.has(cacheKey)) {
      this.revalidating.add(cacheKey);

      // Background refresh
      setImmediate(async () => {
        try {
          const result = await next.handle().toPromise();
          await this.updateCache(cacheKey, metaKey, result, options);
          this.logger.debug(`SWR background refresh completed for: ${cacheKey}`);
        } catch (error) {
          this.logger.error(`SWR background refresh failed: ${(error as Error).message}`);
        } finally {
          this.revalidating.delete(cacheKey);
        }
      });
    }

    return cachedValue;
  }

  private async updateCache(
    cacheKey: string,
    metaKey: string,
    value: any,
    options: any,
  ): Promise<void> {
    await Promise.all([
      this.cacheService.set(cacheKey, value, {
        ttl: options.maxAge,
        tags: options.tags,
      }),
      this.cacheService.set(metaKey, { timestamp: Date.now() }, {
        ttl: options.maxAge,
      }),
    ]);
  }
}

/**
 * Batch Cache Interceptor
 *
 * Handles @BatchCacheable decorator.
 * Optimizes caching for methods that accept arrays of IDs.
 */
@Injectable()
export class BatchCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(BatchCacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const options = this.reflector.get<any>('cache:batch', handler);

    if (!options) {
      return next.handle();
    }

    const args = context.getArgs();
    const ids = args[0]; // Assume first argument is array of IDs

    if (!Array.isArray(ids)) {
      return next.handle();
    }

    return from(this.handleBatch(ids, options, next));
  }

  private async handleBatch(
    ids: string[],
    options: any,
    next: CallHandler,
  ): Promise<any[]> {
    const cached = new Map<string, any>();
    const missing: string[] = [];

    // Check cache for each ID
    await Promise.all(
      ids.map(async (id) => {
        const key = `${options.keyPrefix}:${id}`;
        const value = await this.cacheService.get(key);
        if (value !== null) {
          cached.set(id, value);
        } else {
          missing.push(id);
        }
      }),
    );

    this.logger.debug(
      `Batch cache: ${cached.size} hits, ${missing.length} misses`,
    );

    // If all found in cache, return immediately
    if (missing.length === 0) {
      return ids.map((id) => cached.get(id));
    }

    // Fetch missing items
    // Temporarily modify first argument to only fetch missing
    const originalIds = ids;
    const args = [missing];

    // This is a simplified version - in practice you'd need to modify the context
    const freshItems = await next.handle().toPromise();

    // Cache fresh items
    await Promise.all(
      freshItems.map(async (item: any) => {
        const id = options.idExtractor(item);
        const key = `${options.keyPrefix}:${id}`;
        await this.cacheService.set(key, item, {
          ttl: options.ttl,
          tags: options.tags,
        });
        cached.set(id, item);
      }),
    );

    // Return in original order
    return originalIds.map((id) => cached.get(id)).filter(Boolean);
  }
}
