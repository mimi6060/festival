import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: ResponseMeta;
}

/**
 * Metadata for paginated responses
 */
export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

/**
 * Key for skip transform metadata
 */
export const SKIP_TRANSFORM_KEY = 'skipTransform';

/**
 * Decorator to skip response transformation for specific endpoints
 *
 * @example
 * @SkipTransform()
 * @Get('raw')
 * getRawData() { ... }
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);

/**
 * Transform Response Interceptor
 *
 * Wraps all successful responses in a standard API response format.
 * Handles pagination metadata automatically for array responses with
 * pagination info.
 *
 * Standard response format:
 * {
 *   "success": true,
 *   "data": { ... },
 *   "meta": { ... } // optional
 * }
 *
 * @example
 * // Global registration in main.ts
 * app.useGlobalInterceptors(new TransformInterceptor());
 *
 * @example
 * // Skip transformation for specific endpoint
 * @SkipTransform()
 * @Get('download')
 * downloadFile() { ... }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private readonly reflector?: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    // Check if transform should be skipped
    if (this.reflector) {
      const skipTransform = this.reflector.get<boolean>(
        SKIP_TRANSFORM_KEY,
        context.getHandler(),
      );

      if (skipTransform) {
        return next.handle() as Observable<ApiResponse<T>>;
      }
    }

    return next.handle().pipe(
      map((data) => this.transformResponse(data)),
    );
  }

  /**
   * Transform response data to standard format
   */
  private transformResponse(data: unknown): ApiResponse<T> {
    // Handle null/undefined responses
    if (data === null || data === undefined) {
      return {
        success: true,
        data: null as T,
      };
    }

    // Check if already wrapped
    if (this.isAlreadyWrapped(data)) {
      return data as ApiResponse<T>;
    }

    // Check for paginated result
    if (this.isPaginatedResult(data)) {
      return this.transformPaginatedResponse(data as PaginatedResult<unknown>);
    }

    // Standard response
    return {
      success: true,
      data: data as T,
    };
  }

  /**
   * Check if response is already wrapped
   */
  private isAlreadyWrapped(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const response = data as Record<string, unknown>;
    return (
      typeof response.success === 'boolean' &&
      'data' in response
    );
  }

  /**
   * Check if data is a paginated result
   */
  private isPaginatedResult(data: unknown): data is PaginatedResult<unknown> {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const result = data as Record<string, unknown>;
    return (
      Array.isArray(result.data) &&
      typeof result.page === 'number' &&
      typeof result.limit === 'number' &&
      typeof result.total === 'number'
    );
  }

  /**
   * Transform paginated response with meta information
   */
  private transformPaginatedResponse(
    result: PaginatedResult<unknown>,
  ): ApiResponse<T> {
    const totalPages = Math.ceil(result.total / result.limit);

    return {
      success: true,
      data: result.data as T,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages,
        hasNext: result.page < totalPages,
        hasPrevious: result.page > 1,
      },
    };
  }
}

/**
 * Create a paginated result helper
 */
export function createPaginatedResult<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResult<T> {
  return {
    data,
    page,
    limit,
    total,
  };
}
