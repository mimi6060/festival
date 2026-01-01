import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as Sentry from '@sentry/node';
import {
  SENTRY_BREADCRUMB_KEY,
  BreadcrumbOptions,
} from './breadcrumbs.decorator';

/**
 * Interceptor that automatically adds Sentry breadcrumbs based on decorator metadata
 */
@Injectable()
export class SentryBreadcrumbInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const breadcrumbOptions = this.reflector.get<BreadcrumbOptions>(
      SENTRY_BREADCRUMB_KEY,
      context.getHandler(),
    );

    if (!breadcrumbOptions) {
      return next.handle();
    }

    const { category, action, extractData } = breadcrumbOptions;
    const args = context.getArgs();

    // Extract data if a function is provided
    let data: Record<string, unknown> = {};
    if (extractData) {
      try {
        data = extractData(args);
      } catch {
        // Ignore extraction errors
      }
    }

    // Add breadcrumb before execution
    Sentry.addBreadcrumb({
      category,
      message: `${category}: ${action} started`,
      level: 'info',
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    });

    return next.handle().pipe(
      tap({
        next: (result) => {
          // Add success breadcrumb
          Sentry.addBreadcrumb({
            category,
            message: `${category}: ${action} completed`,
            level: 'info',
            data: {
              ...data,
              success: true,
              timestamp: new Date().toISOString(),
            },
          });
        },
        error: (error) => {
          // Add error breadcrumb
          Sentry.addBreadcrumb({
            category,
            message: `${category}: ${action} failed`,
            level: 'error',
            data: {
              ...data,
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            },
          });
        },
      }),
    );
  }
}
