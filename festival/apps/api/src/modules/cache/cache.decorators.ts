import { SetMetadata, applyDecorators, Inject } from '@nestjs/common';
import { CacheTag, CacheOptions, CacheStrategy } from './cache.service';

// Metadata keys
export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_OPTIONS_METADATA = 'cache:options';
export const CACHE_EVICT_METADATA = 'cache:evict';
export const CACHE_PUT_METADATA = 'cache:put';
export const CACHE_INVALIDATE_TAGS_METADATA = 'cache:invalidate_tags';

/**
 * Interface for cache key generation
 */
export interface CacheKeyOptions {
  /** Static prefix for the cache key */
  prefix?: string;
  /** Use method name in key */
  includeMethod?: boolean;
  /** Use class name in key */
  includeClass?: boolean;
  /** Parameter indices to include in key */
  paramIndices?: number[];
  /** Custom key generator function */
  keyGenerator?: (...args: any[]) => string;
}

/**
 * Extended cache options for decorators
 */
export interface CacheableOptions extends CacheOptions {
  /** Cache key configuration */
  key?: string | CacheKeyOptions;
  /** Condition for caching (SpEL-like expression or function) */
  condition?: (result: any, ...args: any[]) => boolean;
  /** Unless condition (SpEL-like expression or function) */
  unless?: (result: any, ...args: any[]) => boolean;
  /** Sync mode - only one thread executes factory */
  sync?: boolean;
}

/**
 * Cache eviction options
 */
export interface CacheEvictOptions {
  /** Cache key or pattern to evict */
  key?: string | CacheKeyOptions;
  /** Evict all entries for the specified tags */
  tags?: CacheTag[];
  /** Pattern to match keys for eviction */
  pattern?: string;
  /** Clear all cache */
  allEntries?: boolean;
  /** Evict before method execution */
  beforeInvocation?: boolean;
  /** Condition for eviction */
  condition?: (...args: any[]) => boolean;
}

/**
 * Cache put options (always updates cache)
 */
export interface CachePutOptions extends CacheableOptions {
  /** Key to update */
  key?: string | CacheKeyOptions;
}

/**
 * @Cacheable decorator
 *
 * Caches the result of a method. If cached value exists, returns it without executing method.
 *
 * @example
 * ```typescript
 * @Cacheable({ key: 'users:${0}', ttl: 3600 })
 * async findById(id: string): Promise<User> {
 *   return this.prisma.user.findUnique({ where: { id } });
 * }
 *
 * @Cacheable({
 *   key: { prefix: 'festivals', paramIndices: [0] },
 *   ttl: 300,
 *   tags: [CacheTag.FESTIVAL]
 * })
 * async getFestival(id: string): Promise<Festival> {
 *   return this.prisma.festival.findUnique({ where: { id } });
 * }
 * ```
 */
export function Cacheable(options: CacheableOptions = {}): MethodDecorator {
  return applyDecorators(
    SetMetadata(CACHE_KEY_METADATA, options.key),
    SetMetadata(CACHE_OPTIONS_METADATA, {
      ttl: options.ttl,
      tags: options.tags,
      strategy: options.strategy || CacheStrategy.CACHE_ASIDE,
      condition: options.condition,
      unless: options.unless,
      sync: options.sync,
    }),
  );
}

/**
 * @CacheEvict decorator
 *
 * Evicts cache entries when method is called.
 *
 * @example
 * ```typescript
 * @CacheEvict({ key: 'users:${0}' })
 * async deleteUser(id: string): Promise<void> {
 *   await this.prisma.user.delete({ where: { id } });
 * }
 *
 * @CacheEvict({ tags: [CacheTag.FESTIVAL], allEntries: true })
 * async clearFestivalCache(): Promise<void> {
 *   // Just clears cache
 * }
 *
 * @CacheEvict({ pattern: 'users:*' })
 * async clearAllUsers(): Promise<void> {
 *   // Clears all user cache entries
 * }
 * ```
 */
export function CacheEvict(options: CacheEvictOptions = {}): MethodDecorator {
  return applyDecorators(
    SetMetadata(CACHE_EVICT_METADATA, {
      key: options.key,
      tags: options.tags,
      pattern: options.pattern,
      allEntries: options.allEntries,
      beforeInvocation: options.beforeInvocation,
      condition: options.condition,
    }),
  );
}

/**
 * @CachePut decorator
 *
 * Always executes method and updates cache with result.
 * Unlike @Cacheable, it doesn't skip method execution.
 *
 * @example
 * ```typescript
 * @CachePut({ key: 'users:${0}' })
 * async updateUser(id: string, data: UpdateUserDto): Promise<User> {
 *   return this.prisma.user.update({ where: { id }, data });
 * }
 * ```
 */
export function CachePut(options: CachePutOptions = {}): MethodDecorator {
  return applyDecorators(
    SetMetadata(CACHE_PUT_METADATA, {
      key: options.key,
      ttl: options.ttl,
      tags: options.tags,
      condition: options.condition,
      unless: options.unless,
    }),
  );
}

/**
 * @InvalidateTags decorator
 *
 * Invalidates all cache entries with specified tags after method execution.
 *
 * @example
 * ```typescript
 * @InvalidateTags([CacheTag.TICKET, CacheTag.ANALYTICS])
 * async purchaseTicket(data: PurchaseDto): Promise<Ticket> {
 *   // After purchase, invalidate ticket and analytics caches
 * }
 * ```
 */
export function InvalidateTags(tags: CacheTag[]): MethodDecorator {
  return SetMetadata(CACHE_INVALIDATE_TAGS_METADATA, tags);
}

/**
 * Check if an object is a request-like object with circular references
 */
function isRequestObject(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  // Check for common request object properties
  return !!(
    obj.socket ||
    obj.connection ||
    obj.httpVersion ||
    obj.headers ||
    obj.rawHeaders ||
    (obj.constructor?.name === 'IncomingMessage') ||
    (obj.constructor?.name === 'Socket')
  );
}

/**
 * Utility function to generate cache key from options and arguments
 */
export function generateCacheKey(
  keyOptions: string | CacheKeyOptions | undefined,
  target: any,
  methodName: string,
  args: any[],
): string {
  if (!keyOptions) {
    // Default key generation
    const argHash = args.length > 0 ? hashArgs(args) : 'no-args';
    return `${target.constructor.name}:${methodName}:${argHash}`;
  }

  if (typeof keyOptions === 'string') {
    // Template string with ${index} placeholders
    return keyOptions.replace(/\$\{(\d+)\}/g, (_, index) => {
      const value = args[parseInt(index)];
      return value !== undefined ? String(value) : '';
    });
  }

  // CacheKeyOptions object
  const parts: string[] = [];

  if (keyOptions.prefix) {
    parts.push(keyOptions.prefix);
  }

  if (keyOptions.includeClass) {
    parts.push(target.constructor.name);
  }

  if (keyOptions.includeMethod) {
    parts.push(methodName);
  }

  if (keyOptions.keyGenerator) {
    parts.push(keyOptions.keyGenerator(...args));
  } else if (keyOptions.paramIndices && keyOptions.paramIndices.length > 0) {
    const paramValues = keyOptions.paramIndices
      .map((i) => args[i])
      .filter((v) => v !== undefined && !isRequestObject(v))
      .map((v) => {
        if (typeof v === 'object') {
          try {
            return JSON.stringify(v);
          } catch {
            return String(v?.id || v?.toString() || 'obj');
          }
        }
        return String(v);
      });
    parts.push(...paramValues);
  } else if (args.length > 0) {
    parts.push(hashArgs(args.filter((a) => !isRequestObject(a))));
  }

  return parts.join(':');
}

/**
 * Hash arguments for cache key
 */
function hashArgs(args: any[]): string {
  const str = args.map((arg) => {
    if (arg === null) {return 'null';}
    if (arg === undefined) {return 'undefined';}
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Cache configuration decorator for class-level defaults
 *
 * @example
 * ```typescript
 * @CacheConfig({ prefix: 'users', ttl: 3600 })
 * export class UsersService {
 *   // All @Cacheable methods will use these defaults
 * }
 * ```
 */
export function CacheConfig(options: {
  prefix?: string;
  ttl?: number;
  tags?: CacheTag[];
}): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata('cache:config', options, target);
    return target;
  };
}

/**
 * Decorator to inject CacheService with type safety
 */
export const InjectCache = () => Inject('CACHE_SERVICE');

/**
 * Multi-level caching decorator
 * First checks L1 (local memory), then L2 (Redis)
 *
 * @example
 * ```typescript
 * @MultiLevelCache({
 *   l1: { ttl: 60 },      // 1 minute local cache
 *   l2: { ttl: 3600 }     // 1 hour Redis cache
 * })
 * async getHotData(key: string): Promise<Data> {
 *   return this.fetchFromDb(key);
 * }
 * ```
 */
export function MultiLevelCache(options: {
  key?: string | CacheKeyOptions;
  l1?: { ttl: number; maxSize?: number };
  l2?: { ttl: number; tags?: CacheTag[] };
}): MethodDecorator {
  return applyDecorators(
    SetMetadata('cache:multi_level', options),
  );
}

/**
 * Batch cache decorator for methods that accept arrays
 * Automatically handles cache hits/misses for individual items
 *
 * @example
 * ```typescript
 * @BatchCacheable({
 *   keyPrefix: 'users',
 *   idExtractor: (user) => user.id,
 *   ttl: 3600
 * })
 * async getUsersByIds(ids: string[]): Promise<User[]> {
 *   return this.prisma.user.findMany({ where: { id: { in: ids } } });
 * }
 * ```
 */
export function BatchCacheable<T>(options: {
  keyPrefix: string;
  idExtractor: (item: T) => string;
  ttl?: number;
  tags?: CacheTag[];
}): MethodDecorator {
  return applyDecorators(
    SetMetadata('cache:batch', options),
  );
}

/**
 * Stale-while-revalidate caching pattern
 * Returns stale data immediately while refreshing in background
 *
 * @example
 * ```typescript
 * @StaleWhileRevalidate({
 *   key: 'stats:${0}',
 *   staleTime: 60,      // Consider stale after 1 minute
 *   maxAge: 3600        // Hard expiry at 1 hour
 * })
 * async getStats(festivalId: string): Promise<Stats> {
 *   return this.analyticsService.compute(festivalId);
 * }
 * ```
 */
export function StaleWhileRevalidate(options: {
  key?: string | CacheKeyOptions;
  staleTime: number;
  maxAge: number;
  tags?: CacheTag[];
}): MethodDecorator {
  return applyDecorators(
    SetMetadata('cache:swr', options),
  );
}

/**
 * Lock cache during expensive operations
 * Prevents cache stampede with distributed lock
 *
 * @example
 * ```typescript
 * @CacheLock({ key: 'report:${0}', lockTimeout: 30000 })
 * async generateReport(reportId: string): Promise<Report> {
 *   // Only one instance generates the report at a time
 * }
 * ```
 */
export function CacheLock(options: {
  key?: string | CacheKeyOptions;
  lockTimeout?: number;
  waitTimeout?: number;
  retryDelay?: number;
}): MethodDecorator {
  return applyDecorators(
    SetMetadata('cache:lock', options),
  );
}

/**
 * Conditional caching based on request context
 *
 * @example
 * ```typescript
 * @ConditionalCache({
 *   condition: (ctx) => !ctx.user?.isAdmin,  // Don't cache for admins
 *   key: 'public:festivals',
 *   ttl: 300
 * })
 * async getPublicFestivals(): Promise<Festival[]> {
 *   return this.prisma.festival.findMany({ where: { status: 'PUBLISHED' } });
 * }
 * ```
 */
export function ConditionalCache(options: {
  condition: (context: any) => boolean;
  key?: string | CacheKeyOptions;
  ttl?: number;
  tags?: CacheTag[];
}): MethodDecorator {
  return applyDecorators(
    SetMetadata('cache:conditional', options),
  );
}
