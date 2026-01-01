import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { CacheEvictInterceptor } from '../interceptors/cache-evict.interceptor';

/**
 * Metadata keys for cache evict decorator
 */
export const CACHE_EVICT_KEY_METADATA = 'cache:evict_key';
export const CACHE_EVICT_PATTERN_METADATA = 'cache:evict_pattern';
export const CACHE_EVICT_ALL_METADATA = 'cache:evict_all';

/**
 * Cache Evict Decorator
 *
 * Invalidates cache entries after a method executes successfully.
 * Use this on methods that modify data to ensure cache consistency.
 *
 * @param keyOrPattern - Specific key or pattern to evict
 * @param isPattern - Whether the key is a glob pattern (default: false)
 *
 * @example
 * // Evict specific key
 * @CacheEvict('festival:list')
 * async create(dto: CreateDto) { ... }
 *
 * @example
 * // Evict using pattern
 * @CacheEvict('festival:*', true)
 * async delete(id: string) { ... }
 */
export function CacheEvict(keyOrPattern: string, isPattern: boolean = false): MethodDecorator {
  return applyDecorators(
    SetMetadata(CACHE_EVICT_KEY_METADATA, keyOrPattern),
    SetMetadata(CACHE_EVICT_PATTERN_METADATA, isPattern),
    UseInterceptors(CacheEvictInterceptor),
  );
}

/**
 * Cache Evict Multiple Keys/Patterns
 *
 * Invalidates multiple cache entries after a method executes.
 *
 * @param keys - Array of keys or patterns to evict
 *
 * @example
 * @CacheEvictMultiple([
 *   { key: 'festival:list' },
 *   { key: 'festival:detail:123' },
 *   { key: 'festival:*', pattern: true }
 * ])
 * async update(id: string, dto: UpdateDto) { ... }
 */
export interface CacheEvictConfig {
  key: string;
  pattern?: boolean;
}

export function CacheEvictMultiple(configs: CacheEvictConfig[]): MethodDecorator {
  return applyDecorators(
    SetMetadata(CACHE_EVICT_ALL_METADATA, configs),
    UseInterceptors(CacheEvictInterceptor),
  );
}

/**
 * Cache Evict All
 *
 * Clears the entire cache. Use with extreme caution!
 *
 * @example
 * @CacheEvictAll()
 * async resetAll() { ... }
 */
export function CacheEvictAll(): MethodDecorator {
  return applyDecorators(
    SetMetadata(CACHE_EVICT_ALL_METADATA, 'all'),
    UseInterceptors(CacheEvictInterceptor),
  );
}
