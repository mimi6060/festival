import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import {
  CACHE_EVICT_KEY_METADATA,
  CACHE_EVICT_PATTERN_METADATA,
  CACHE_EVICT_ALL_METADATA,
  CacheEvictConfig,
} from '../decorators/cache-evict.decorator';
import { CACHE_KEY_PARAM_METADATA, CacheKeyParamMetadata } from '../decorators/cache-key.decorator';

/**
 * Cache Evict Interceptor
 *
 * Invalidates cache entries after a method decorated with @CacheEvict executes successfully.
 * Supports single key, pattern-based, and multiple key invalidation.
 */
@Injectable()
export class CacheEvictInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheEvictInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap(async () => {
        try {
          await this.evictCache(context);
        } catch (error) {
          this.logger.error('Cache eviction failed:', error);
        }
      }),
    );
  }

  /**
   * Perform cache eviction based on decorator metadata
   */
  private async evictCache(context: ExecutionContext): Promise<void> {
    const handler = context.getHandler();

    // Check for multiple eviction configs
    const evictAll = this.reflector.get<CacheEvictConfig[] | 'all'>(
      CACHE_EVICT_ALL_METADATA,
      handler,
    );

    if (evictAll === 'all') {
      await this.cacheService.reset();
      this.logger.warn('Full cache reset triggered');
      return;
    }

    if (Array.isArray(evictAll) && evictAll.length > 0) {
      await Promise.all(
        evictAll.map((config) =>
          this.evictKey(context, config.key, config.pattern ?? false),
        ),
      );
      return;
    }

    // Single key eviction
    const keyOrPattern = this.reflector.get<string>(CACHE_EVICT_KEY_METADATA, handler);
    const isPattern = this.reflector.get<boolean>(CACHE_EVICT_PATTERN_METADATA, handler);

    if (keyOrPattern) {
      await this.evictKey(context, keyOrPattern, isPattern);
    }
  }

  /**
   * Evict a single key or pattern
   */
  private async evictKey(
    context: ExecutionContext,
    keyOrPattern: string,
    isPattern: boolean,
  ): Promise<void> {
    const finalKey = this.resolveKey(context, keyOrPattern);

    if (isPattern) {
      await this.cacheService.delPattern(finalKey);
      this.logger.debug(`Cache evicted pattern: ${finalKey}`);
    } else {
      await this.cacheService.del(finalKey);
      this.logger.debug(`Cache evicted key: ${finalKey}`);
    }
  }

  /**
   * Resolve dynamic key placeholders
   *
   * Supports placeholders like:
   * - {0}, {1}, etc. for positional arguments
   * - {id} for the first @CacheKey parameter
   */
  private resolveKey(context: ExecutionContext, keyTemplate: string): string {
    const handler = context.getHandler();
    const target = context.getClass();
    const args = context.getArgs();

    // Replace positional placeholders {0}, {1}, etc.
    let resolvedKey = keyTemplate.replace(/\{(\d+)\}/g, (_, index) => {
      const value = args[parseInt(index, 10)];
      return this.serializeValue(value);
    });

    // Replace {id} with the first @CacheKey parameter
    if (resolvedKey.includes('{id}')) {
      const keyParams: CacheKeyParamMetadata[] =
        Reflect.getMetadata(CACHE_KEY_PARAM_METADATA, target.prototype, handler.name) || [];

      if (keyParams.length > 0) {
        const firstKeyParam = keyParams[0];
        const idValue = args[firstKeyParam.index];
        resolvedKey = resolvedKey.replace('{id}', String(idValue));
      }
    }

    // Also try to get the id from request params
    const request = context.switchToHttp().getRequest();
    if (request?.params?.id && resolvedKey.includes('{id}')) {
      resolvedKey = resolvedKey.replace('{id}', request.params.id);
    }

    return resolvedKey;
  }

  /**
   * Serialize a value for use in cache key
   */
  private serializeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}
