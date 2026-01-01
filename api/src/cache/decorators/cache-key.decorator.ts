import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for cache key parameter marking
 */
export const CACHE_KEY_PARAM_METADATA = 'cache:key_param';

/**
 * Cache Key Decorator
 *
 * Marks a method parameter as the source for the cache key.
 * Used in conjunction with @Cacheable to dynamically generate cache keys.
 *
 * @param keyTemplate - Optional template for the key (use %s for value substitution)
 *
 * @example
 * // Simple usage - parameter value becomes the key
 * @Cacheable('festival:detail', CACHE_TTL.FESTIVAL_DETAIL)
 * async findOne(@CacheKey() id: string) { ... }
 *
 * @example
 * // With template
 * @Cacheable('festival', CACHE_TTL.FESTIVAL_DETAIL)
 * async findOne(@CacheKey('detail:%s') id: string) { ... }
 */
export function CacheKey(keyTemplate?: string): ParameterDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingParams =
      Reflect.getMetadata(CACHE_KEY_PARAM_METADATA, target, propertyKey!) || [];

    existingParams.push({
      index: parameterIndex,
      template: keyTemplate,
    });

    Reflect.defineMetadata(CACHE_KEY_PARAM_METADATA, existingParams, target, propertyKey!);
  };
}

/**
 * Interface for cache key parameter metadata
 */
export interface CacheKeyParamMetadata {
  index: number;
  template?: string;
}
