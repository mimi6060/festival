import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../decorators/cacheable.decorator';
import { CACHE_KEY_PARAM_METADATA, CacheKeyParamMetadata } from '../decorators/cache-key.decorator';
import { createHash } from 'crypto';

/**
 * Cacheable Interceptor
 *
 * Implements the cache-aside pattern for methods decorated with @Cacheable.
 * Automatically generates cache keys based on method parameters and stores/retrieves results.
 */
@Injectable()
export class CacheableInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheableInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const keyPrefix = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());
    const ttl = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler());

    if (!keyPrefix) {
      return next.handle();
    }

    // Generate the full cache key
    const cacheKey = this.generateCacheKey(context, keyPrefix);

    // Try to get from cache
    try {
      const cachedValue = await this.cacheService.get<unknown>(cacheKey);

      if (cachedValue !== undefined) {
        this.logger.debug(`Cache HIT for ${cacheKey}`);
        return of(cachedValue);
      }
    } catch (error) {
      this.logger.warn(`Cache lookup failed for ${cacheKey}:`, error);
    }

    // Cache miss - execute the method and cache the result
    this.logger.debug(`Cache MISS for ${cacheKey}`);

    return next.handle().pipe(
      tap(async (response) => {
        if (response !== undefined && response !== null) {
          try {
            await this.cacheService.set(cacheKey, response, ttl);
            this.logger.debug(`Cached response for ${cacheKey} (TTL: ${ttl}s)`);
          } catch (error) {
            this.logger.warn(`Failed to cache response for ${cacheKey}:`, error);
          }
        }
      }),
    );
  }

  /**
   * Generate a unique cache key based on the method and its parameters
   */
  private generateCacheKey(context: ExecutionContext, keyPrefix: string): string {
    const handler = context.getHandler();
    const target = context.getClass();
    const args = context.getArgs();

    // Check for @CacheKey decorated parameters
    const keyParams: CacheKeyParamMetadata[] =
      Reflect.getMetadata(CACHE_KEY_PARAM_METADATA, target.prototype, handler.name) || [];

    let keySuffix = '';

    if (keyParams.length > 0) {
      // Use explicitly marked parameters
      const keyParts = keyParams
        .sort((a, b) => a.index - b.index)
        .map((param) => {
          const value = args[param.index];
          if (param.template) {
            return param.template.replace('%s', String(value));
          }
          return this.serializeValue(value);
        });

      keySuffix = keyParts.join(':');
    } else {
      // Auto-generate key from first argument (usually request object or DTO)
      const request = context.switchToHttp().getRequest();

      // Use query parameters for GET requests
      if (request?.query && Object.keys(request.query).length > 0) {
        keySuffix = this.hashObject(request.query);
      } else if (args[0] && typeof args[0] === 'object') {
        // Use first argument if it's an object (like a DTO)
        keySuffix = this.hashObject(args[0]);
      }
    }

    return keySuffix ? `${keyPrefix}:${keySuffix}` : keyPrefix;
  }

  /**
   * Serialize a value for use in cache key
   */
  private serializeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'object') {
      return this.hashObject(value);
    }
    return String(value);
  }

  /**
   * Create a hash of an object for use in cache keys
   */
  private hashObject(obj: unknown): string {
    const normalized = JSON.stringify(obj, Object.keys(obj as object).sort());
    return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }
}
