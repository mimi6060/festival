import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Injectable()
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.message : 'Internal server error';

    // Only report to Sentry for 5xx errors or unhandled exceptions
    if (status >= 500 || !(exception instanceof HttpException)) {
      Sentry.withScope((scope) => {
        // Add request context
        scope.setExtra('url', request.url);
        scope.setExtra('method', request.method);
        scope.setExtra('headers', request.headers);
        scope.setExtra('query', request.query);
        scope.setExtra('params', request.params);
        scope.setExtra('body', this.sanitizeBody(request.body));

        // Add user context if available
        if ((request as Request & { user?: { id: string; email?: string } }).user) {
          const user = (request as Request & { user: { id: string; email?: string } }).user;
          scope.setUser({
            id: user.id,
            email: user.email,
          });
        }

        // Set transaction name
        scope.setTransactionName(`${request.method} ${request.url}`);

        // Capture the exception
        if (exception instanceof Error) {
          Sentry.captureException(exception);
        } else {
          Sentry.captureMessage(String(exception), 'error');
        }
      });
    }

    // Log the error
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined
      );
    }

    // Send response
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body) {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'credit_card'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
