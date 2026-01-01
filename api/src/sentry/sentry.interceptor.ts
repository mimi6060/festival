import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import * as Sentry from '@sentry/node';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { method, url } = request;

    // Get the controller and handler names for better transaction naming
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    const transactionName = `${controllerName}.${handlerName}`;

    // Start a Sentry span for performance monitoring
    return Sentry.startSpan(
      {
        name: transactionName,
        op: 'http.server',
        attributes: {
          'http.method': method,
          'http.url': url,
          'http.route': this.extractRoute(request),
        },
      },
      () => {
        // Set user context if available
        if (request.user) {
          Sentry.setUser({
            id: request.user.id,
            email: request.user.email,
            role: request.user.role,
          });
        }

        // Add correlation ID as a tag
        const correlationId = request.headers['x-correlation-id'];
        if (correlationId) {
          Sentry.setTag('correlation_id', correlationId as string);
        }

        return next.handle().pipe(
          tap({
            next: () => {
              // Add response breadcrumb on success
              Sentry.addBreadcrumb({
                category: 'http',
                message: `${method} ${url} completed successfully`,
                level: 'info',
                data: {
                  controller: controllerName,
                  handler: handlerName,
                },
              });
            },
            error: (error) => {
              // Add error breadcrumb
              Sentry.addBreadcrumb({
                category: 'http',
                message: `${method} ${url} failed`,
                level: 'error',
                data: {
                  controller: controllerName,
                  handler: handlerName,
                  error: error.message,
                },
              });
            },
          }),
        );
      },
    );
  }

  private extractRoute(request: AuthenticatedRequest): string {
    // Try to get the route pattern from the request
    // This provides a cleaner route for Sentry grouping
    if (request.route?.path) {
      return request.route.path;
    }
    return request.url.split('?')[0];
  }
}
