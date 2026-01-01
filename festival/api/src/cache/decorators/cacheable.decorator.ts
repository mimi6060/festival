import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { CacheableInterceptor } from '../interceptors/cacheable.interceptor';
import { CACHE_TTL } from '../cache.constants';

/**
 * Metadata keys for cacheable decorator
 */
export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

/**
 * Cacheable Decorator
 *
 * Caches the result of a method based on its arguments.
 * Uses the cache-aside pattern to store and retrieve cached values.
 *
 * @param keyPrefix - Prefix for the cache key
 * @param ttl - Time to live in seconds (default: 5 minutes)
 *
 * @example
 * // Cache festival list for 5 minutes
 * @Cacheable('festival:list', CACHE_TTL.FESTIVAL_LIST)
 * async findAll(query: QueryDto) {
 *   return this.prisma.festival.findMany();
 * }
 *
 * @example
 * // Cache individual festival for 1 minute
 * @Cacheable('festival:detail', CACHE_TTL.FESTIVAL_DETAIL)
 * async findOne(@CacheKey() id: string) {
 *   return this.prisma.festival.findUnique({ where: { id } });
 * }
 */
export function Cacheable(
  keyPrefix: string,
  ttl: number = CACHE_TTL.DEFAULT,
): MethodDecorator {
  return applyDecorators(
    SetMetadata(CACHE_KEY_METADATA, keyPrefix),
    SetMetadata(CACHE_TTL_METADATA, ttl),
    UseInterceptors(CacheableInterceptor),
  );
}

/**
 * Options for the Cacheable decorator
 */
export interface CacheableOptions {
  /** Cache key prefix */
  key: string;
  /** Time to live in seconds */
  ttl?: number;
  /** Whether to include the user ID in the cache key */
  includeUser?: boolean;
  /** Custom key generator function */
  keyGenerator?: (...args: unknown[]) => string;
}

/**
 * Advanced Cacheable Decorator with options
 *
 * Provides more control over cache key generation and behavior.
 *
 * @param options - Caching options
 *
 * @example
 * @CacheableAdvanced({
 *   key: 'festival:list',
 *   ttl: CACHE_TTL.FESTIVAL_LIST,
 *   keyGenerator: (query) => `${query.page}:${query.limit}:${query.status}`
 * })
 * async findAll(query: QueryDto) { ... }
 */
export function CacheableAdvanced(options: CacheableOptions): MethodDecorator {
  return applyDecorators(
    SetMetadata(CACHE_KEY_METADATA, options.key),
    SetMetadata(CACHE_TTL_METADATA, options.ttl ?? CACHE_TTL.DEFAULT),
    SetMetadata('cache:options', options),
    UseInterceptors(CacheableInterceptor),
  );
}
