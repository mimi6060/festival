import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

export interface SentryErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  method: string;
  correlationId?: string;
  sentryEventId?: string;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only capture 5xx errors and unexpected errors to Sentry
    let sentryEventId: string | undefined;
    if (status >= 500 || !(exception instanceof HttpException)) {
      sentryEventId = this.captureToSentry(exception, request, status);
    }

    const errorResponse = this.buildErrorResponse(
      exception,
      status,
      request,
      sentryEventId,
    );

    // Log the error
    this.logError(exception, errorResponse);

    response.status(status).json(errorResponse);
  }

  private captureToSentry(
    exception: unknown,
    request: AuthenticatedRequest,
    status: number,
  ): string {
    // Set request context
    Sentry.setContext('request', {
      url: request.url,
      method: request.method,
      headers: this.sanitizeHeaders(request.headers),
      query: request.query,
      body: this.sanitizeBody(request.body),
    });

    // Set user context if available
    if (request.user) {
      Sentry.setUser({
        id: request.user.id,
        email: request.user.email,
        role: request.user.role,
      });
    }

    // Set tags for filtering in Sentry
    Sentry.setTag('http.status_code', status.toString());
    Sentry.setTag('http.method', request.method);
    Sentry.setTag('http.url', request.url);

    // Add correlation ID if present
    const correlationId = request.headers['x-correlation-id'];
    if (correlationId) {
      Sentry.setTag('correlation_id', correlationId as string);
    }

    // Capture the exception
    const eventId = Sentry.captureException(exception);

    return eventId;
  }

  private sanitizeHeaders(
    headers: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized = { ...headers };
    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];
    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    return sanitized;
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body } as Record<string, unknown>;
    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'passwordConfirmation',
      'currentPassword',
      'newPassword',
      'token',
      'refreshToken',
      'accessToken',
      'secret',
      'apiKey',
      'creditCard',
      'cvv',
      'cardNumber',
    ];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private buildErrorResponse(
    exception: unknown,
    status: number,
    request: Request,
    sentryEventId?: string,
  ): SentryErrorResponse {
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string | string[]) || message;
        error = (responseObj.error as string) || this.getErrorName(status);
      }
    } else if (exception instanceof Error) {
      // Don't expose internal error messages in production
      message =
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception.message;
      error = exception.name;
    }

    const errorResponse: SentryErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      correlationId: request.headers['x-correlation-id'] as string,
    };

    // Include Sentry event ID for support reference (only for 5xx errors)
    if (sentryEventId && status >= 500) {
      errorResponse.sentryEventId = sentryEventId;
    }

    return errorResponse;
  }

  private getErrorName(status: number): string {
    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return errorNames[status] || 'Unknown Error';
  }

  private logError(
    exception: unknown,
    errorResponse: SentryErrorResponse,
  ): void {
    const { statusCode, path, method, sentryEventId } = errorResponse;

    if (statusCode >= 500) {
      this.logger.error(
        `${method} ${path} - ${statusCode}${sentryEventId ? ` [Sentry: ${sentryEventId}]` : ''}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        `${method} ${path} - ${statusCode}: ${JSON.stringify(errorResponse.message)}`,
      );
    }
  }
}
