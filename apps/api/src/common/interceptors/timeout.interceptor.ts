import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

/**
 * Default timeout in milliseconds (30 seconds)
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * Key for custom timeout metadata
 */
export const TIMEOUT_KEY = 'timeout';

/**
 * Decorator to set custom timeout for specific endpoints
 *
 * @param milliseconds - Timeout value in milliseconds
 *
 * @example
 * @SetTimeout(60000) // 60 seconds
 * @Post('long-process')
 * longProcess() { ... }
 */
export const SetTimeout = (milliseconds: number) =>
  SetMetadata(TIMEOUT_KEY, milliseconds);

/**
 * Timeout Interceptor Options
 */
export interface TimeoutInterceptorOptions {
  /** Default timeout in milliseconds */
  defaultTimeout?: number;
  /** Custom error message */
  message?: string;
}

/**
 * Timeout Interceptor
 *
 * Enforces request timeout limits to prevent long-running requests
 * from blocking resources. Supports per-endpoint custom timeouts
 * via the @SetTimeout() decorator.
 *
 * Features:
 * - Global default timeout
 * - Per-endpoint custom timeout via @SetTimeout()
 * - Clear timeout error messages
 * - Proper cleanup on timeout
 *
 * @example
 * // Global registration in main.ts
 * app.useGlobalInterceptors(new TimeoutInterceptor({ defaultTimeout: 30000 }));
 *
 * @example
 * // Custom timeout for specific endpoint
 * @SetTimeout(60000) // 60 seconds
 * @Post('upload')
 * uploadFile() { ... }
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly defaultTimeout: number;
  private readonly message: string;

  constructor(
    private readonly reflector?: Reflector,
    options?: TimeoutInterceptorOptions,
  ) {
    this.defaultTimeout = options?.defaultTimeout || DEFAULT_TIMEOUT;
    this.message = options?.message || 'Request timeout exceeded';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Get custom timeout from metadata if available
    const customTimeout = this.reflector?.get<number>(
      TIMEOUT_KEY,
      context.getHandler(),
    );

    const timeoutMs = customTimeout ?? this.defaultTimeout;

    // Skip timeout for very long timeouts (e.g., 0 or negative)
    if (timeoutMs <= 0) {
      return next.handle();
    }

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((error) => {
        if (error instanceof TimeoutError) {
          return throwError(
            () =>
              new RequestTimeoutException({
                message: this.message,
                timeout: timeoutMs,
                statusCode: 408,
              }),
          );
        }
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get the effective timeout for the current request
   * Useful for testing and debugging
   */
  getEffectiveTimeout(context: ExecutionContext): number {
    const customTimeout = this.reflector?.get<number>(
      TIMEOUT_KEY,
      context.getHandler(),
    );
    return customTimeout ?? this.defaultTimeout;
  }
}

/**
 * Factory function to create TimeoutInterceptor with options
 */
export function createTimeoutInterceptor(
  options?: TimeoutInterceptorOptions,
): TimeoutInterceptor {
  return new TimeoutInterceptor(new Reflector(), options);
}
