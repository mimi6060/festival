import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/**
 * Metrics Interceptor
 *
 * Automatically records HTTP request metrics for all endpoints.
 * Can be applied globally or to specific controllers/routes.
 *
 * Metrics recorded:
 * - Request count (by method, path, status)
 * - Request duration (histogram)
 * - Error count (by type)
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // Normalize the path to avoid high cardinality
    const path = this.normalizePath(request.route?.path || request.url);
    const method = request.method;

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          const duration = Date.now() - startTime;

          this.metricsService.recordHttpRequest(method, path, statusCode, duration);
        },
        error: (error) => {
          const statusCode = error.status || error.statusCode || 500;
          const duration = Date.now() - startTime;

          this.metricsService.recordHttpRequest(method, path, statusCode, duration);
        },
      }),
    );
  }

  /**
   * Normalize path to reduce cardinality
   * Replace dynamic segments like UUIDs with placeholders
   */
  private normalizePath(path: string): string {
    // Remove query parameters
    const pathWithoutQuery = path.split('?')[0];

    // Replace common dynamic segments
    return (
      pathWithoutQuery
        // Replace UUIDs
        .replace(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
          ':id',
        )
        // Replace numeric IDs
        .replace(/\/\d+(?=\/|$)/g, '/:id')
        // Replace slugs that look like random strings
        .replace(/\/[a-f0-9]{24,}/gi, '/:id')
    );
  }
}
