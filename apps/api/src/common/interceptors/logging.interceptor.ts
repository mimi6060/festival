import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

/**
 * Request context for logging
 */
interface RequestContext {
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  userId?: string;
  requestId: string;
  correlationId?: string;
}

/**
 * List of sensitive fields that should not be logged
 */
const SENSITIVE_FIELDS = [
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'token',
  'refreshToken',
  'accessToken',
  'authorization',
  'cookie',
  'cardNumber',
  'cvv',
  'expiryDate',
  'secret',
  'apiKey',
  'privateKey',
];

/**
 * Logging Interceptor
 *
 * Logs incoming requests and outgoing responses with timing information.
 * Provides structured logging for request/response lifecycle monitoring.
 *
 * Features:
 * - Request/Response logging with timing
 * - Automatic request ID generation for tracing
 * - Correlation ID support for distributed tracing
 * - User context logging when authenticated
 * - Configurable log level
 * - Sensitive data redaction (passwords, tokens, etc.)
 * - Duration tracking in milliseconds
 *
 * @example
 * // Global registration in main.ts
 * app.useGlobalInterceptors(new LoggingInterceptor());
 *
 * @example
 * // Controller-level registration
 * @UseInterceptors(LoggingInterceptor)
 * @Controller('api')
 * export class ApiController {}
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Generate request ID if not present
    const requestId = this.getOrGenerateRequestId(request);

    // Set request ID on response headers for client tracing
    response.setHeader('X-Request-ID', requestId);

    const requestContext = this.extractRequestContext(request, requestId);
    const startTime = Date.now();

    // Log incoming request
    this.logRequest(requestContext);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logResponse(requestContext, response.statusCode, duration);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logError(requestContext, error, duration);
        },
      })
    );
  }

  /**
   * Get existing request ID from header or generate a new one
   * Stores the generated ID on the request object for downstream use
   */
  private getOrGenerateRequestId(request: Request): string {
    const existingId = request.headers['x-request-id'] as string | undefined;
    if (existingId) {
      return existingId;
    }

    const generatedId = randomUUID();
    // Store on request object for downstream access
    (request as Request & { requestId: string }).requestId = generatedId;
    return generatedId;
  }

  /**
   * Extract context information from the request
   */
  private extractRequestContext(request: Request, requestId: string): RequestContext {
    return {
      method: request.method,
      url: this.sanitizeUrl(request.url),
      ip: request.ip || request.connection?.remoteAddress || 'unknown',
      userAgent: request.headers['user-agent'] || 'unknown',
      userId: (request as Request & { user?: { id?: string } }).user?.id,
      requestId,
      correlationId: request.headers['x-correlation-id'] as string,
    };
  }

  /**
   * Sanitize URL to remove sensitive query parameters
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, 'http://localhost');
      const sensitiveParams: string[] = [];

      for (const field of SENSITIVE_FIELDS) {
        if (urlObj.searchParams.has(field)) {
          sensitiveParams.push(field);
        }
      }

      // No sensitive params found, return original URL
      if (sensitiveParams.length === 0) {
        return url;
      }

      // Build sanitized query string manually to avoid URL encoding issues
      const params: string[] = [];
      urlObj.searchParams.forEach((value, key) => {
        if (sensitiveParams.includes(key)) {
          params.push(`${key}=[REDACTED]`);
        } else {
          params.push(`${key}=${value}`);
        }
      });

      return urlObj.pathname + (params.length > 0 ? '?' + params.join('&') : '');
    } catch {
      return url;
    }
  }

  /**
   * Log incoming request
   */
  private logRequest(context: RequestContext): void {
    const logMessage = this.formatRequestLog(context);
    this.logger.log(logMessage);
  }

  /**
   * Log successful response
   */
  private logResponse(context: RequestContext, statusCode: number, duration: number): void {
    const logMessage = this.formatResponseLog(context, statusCode, duration);

    if (statusCode >= 400 && statusCode < 500) {
      this.logger.warn(logMessage);
    } else if (statusCode >= 500) {
      this.logger.error(logMessage);
    } else {
      this.logger.log(logMessage);
    }
  }

  /**
   * Log error response
   */
  private logError(context: RequestContext, error: Error, duration: number): void {
    const logMessage = this.formatErrorLog(context, error, duration);
    this.logger.error(logMessage, error.stack);
  }

  /**
   * Format request log message
   */
  private formatRequestLog(context: RequestContext): string {
    const parts = [
      `[${context.requestId}]`,
      `${context.method}`,
      context.url,
      `- User: ${context.userId || 'anonymous'}`,
    ];

    return parts.join(' ');
  }

  /**
   * Format response log message
   */
  private formatResponseLog(context: RequestContext, statusCode: number, duration: number): string {
    const parts = [
      `[${context.requestId}]`,
      `${context.method}`,
      context.url,
      `-`,
      statusCode.toString(),
      `(${duration}ms)`,
    ];

    return parts.join(' ');
  }

  /**
   * Format error log message
   */
  private formatErrorLog(context: RequestContext, error: Error, duration: number): string {
    const parts = [
      `[${context.requestId}]`,
      `${context.method}`,
      context.url,
      `- ERROR:`,
      error.message,
      `(${duration}ms)`,
    ];

    return parts.join(' ');
  }

  /**
   * Get structured log data for JSON logging
   */
  getStructuredLogData(
    context: RequestContext,
    statusCode: number,
    duration: number
  ): Record<string, unknown> {
    return {
      type: 'http',
      method: context.method,
      url: context.url,
      statusCode,
      duration,
      userId: context.userId,
      requestId: context.requestId,
      correlationId: context.correlationId,
      ip: context.ip,
      userAgent: context.userAgent,
      timestamp: new Date().toISOString(),
    };
  }
}
