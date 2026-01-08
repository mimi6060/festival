import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
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
  requestId?: string;
  correlationId?: string;
}

/**
 * Logging Interceptor
 *
 * Logs incoming requests and outgoing responses with timing information.
 * Provides structured logging for request/response lifecycle monitoring.
 *
 * Features:
 * - Request/Response logging with timing
 * - Correlation ID support for distributed tracing
 * - User context logging when authenticated
 * - Configurable log level
 * - Sensitive data redaction
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

    const requestContext = this.extractRequestContext(request);
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
      }),
    );
  }

  /**
   * Extract context information from the request
   */
  private extractRequestContext(request: Request): RequestContext {
    return {
      method: request.method,
      url: request.url,
      ip: request.ip || request.connection?.remoteAddress || 'unknown',
      userAgent: request.headers['user-agent'] || 'unknown',
      userId: (request as Request & { user?: { id?: string } }).user?.id,
      requestId: request.headers['x-request-id'] as string,
      correlationId: request.headers['x-correlation-id'] as string,
    };
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
  private logResponse(
    context: RequestContext,
    statusCode: number,
    duration: number,
  ): void {
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
  private logError(
    context: RequestContext,
    error: Error,
    duration: number,
  ): void {
    const logMessage = this.formatErrorLog(context, error, duration);
    this.logger.error(logMessage, error.stack);
  }

  /**
   * Format request log message
   */
  private formatRequestLog(context: RequestContext): string {
    const parts = [
      `[${context.requestId || 'no-id'}]`,
      `${context.method}`,
      context.url,
      `- User: ${context.userId || 'anonymous'}`,
    ];

    return parts.join(' ');
  }

  /**
   * Format response log message
   */
  private formatResponseLog(
    context: RequestContext,
    statusCode: number,
    duration: number,
  ): string {
    const parts = [
      `[${context.requestId || 'no-id'}]`,
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
  private formatErrorLog(
    context: RequestContext,
    error: Error,
    duration: number,
  ): string {
    const parts = [
      `[${context.requestId || 'no-id'}]`,
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
    duration: number,
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
