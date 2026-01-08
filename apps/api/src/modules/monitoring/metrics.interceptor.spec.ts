/**
 * MetricsInterceptor Unit Tests
 *
 * Comprehensive tests for the metrics interceptor including:
 * - Recording HTTP request metrics
 * - Path normalization
 * - Status code handling
 * - Error handling
 * - Duration measurement
 */

import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let metricsService: jest.Mocked<MetricsService>;

  const mockMetricsService = {
    recordHttpRequest: jest.fn(),
  };

  const createMockExecutionContext = (overrides: {
    method?: string;
    url?: string;
    routePath?: string;
    statusCode?: number;
  } = {}): ExecutionContext => {
    const request = {
      method: overrides.method ?? 'GET',
      url: overrides.url ?? '/api/test',
      route: overrides.routePath ? { path: overrides.routePath } : undefined,
    };

    const response = {
      statusCode: overrides.statusCode ?? 200,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (response?: unknown, error?: Error): CallHandler => ({
    handle: () => (error ? throwError(() => error) : of(response ?? { data: 'test' })),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    metricsService = mockMetricsService as unknown as jest.Mocked<MetricsService>;
    interceptor = new MetricsInterceptor(metricsService);
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });
  });

  // ==========================================================================
  // intercept() - Successful Request Tests
  // ==========================================================================

  describe('intercept - successful requests', () => {
    it('should record metrics for successful GET request', (done) => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/users',
        statusCode: 200,
      });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            'GET',
            '/api/users',
            200,
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should record metrics for successful POST request', (done) => {
      const context = createMockExecutionContext({
        method: 'POST',
        url: '/api/users',
        statusCode: 201,
      });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            'POST',
            '/api/users',
            201,
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should record metrics for successful PUT request', (done) => {
      const context = createMockExecutionContext({
        method: 'PUT',
        url: '/api/users/123',
        statusCode: 200,
      });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            'PUT',
            '/api/users/:id',
            200,
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should record metrics for successful DELETE request', (done) => {
      const context = createMockExecutionContext({
        method: 'DELETE',
        url: '/api/users/456',
        statusCode: 204,
      });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            'DELETE',
            '/api/users/:id',
            204,
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should return response data unchanged', (done) => {
      const responseData = { id: 1, name: 'test' };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toEqual(responseData);
        },
        complete: done,
      });
    });

    it('should measure duration correctly', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          const [, , , duration] = metricsService.recordHttpRequest.mock.calls[0];
          expect(duration).toBeGreaterThanOrEqual(0);
          expect(typeof duration).toBe('number');
          done();
        },
      });
    });
  });

  // ==========================================================================
  // intercept() - Error Request Tests
  // ==========================================================================

  describe('intercept - error requests', () => {
    it('should record metrics for 4xx errors', (done) => {
      const error = { status: 400, message: 'Bad Request' };
      const context = createMockExecutionContext({
        method: 'POST',
        url: '/api/users',
      });
      const handler = createMockCallHandler(undefined, error as unknown as Error);

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            'POST',
            '/api/users',
            400,
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should record metrics for 5xx errors', (done) => {
      const error = { status: 500, message: 'Internal Server Error' };
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/data',
      });
      const handler = createMockCallHandler(undefined, error as unknown as Error);

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            'GET',
            '/api/data',
            500,
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should use statusCode from error if status not present', (done) => {
      const error = { statusCode: 404, message: 'Not Found' };
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/users/999',
      });
      const handler = createMockCallHandler(undefined, error as unknown as Error);

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            'GET',
            '/api/users/:id',
            404,
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should default to 500 for errors without status', (done) => {
      const error = new Error('Unknown error');
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/test',
      });
      const handler = createMockCallHandler(undefined, error);

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            'GET',
            '/api/test',
            500,
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should propagate the original error', (done) => {
      const error = new Error('Original error');
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(undefined, error);

      interceptor.intercept(context, handler).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  // ==========================================================================
  // Path Normalization Tests
  // ==========================================================================

  describe('path normalization', () => {
    it('should use route path when available', (done) => {
      const context = createMockExecutionContext({
        routePath: '/api/users/:id',
        url: '/api/users/123',
      });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            expect.any(String),
            '/api/users/:id',
            expect.any(Number),
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should replace UUIDs with :id placeholder', (done) => {
      const context = createMockExecutionContext({
        url: '/api/users/550e8400-e29b-41d4-a716-446655440000',
      });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            expect.any(String),
            '/api/users/:id',
            expect.any(Number),
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should replace numeric IDs with :id placeholder', (done) => {
      const context = createMockExecutionContext({
        url: '/api/users/123/orders/456',
      });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            expect.any(String),
            '/api/users/:id/orders/:id',
            expect.any(Number),
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should replace long hex strings with :id placeholder', (done) => {
      const context = createMockExecutionContext({
        url: '/api/documents/507f1f77bcf86cd799439011',
      });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            expect.any(String),
            '/api/documents/:id',
            expect.any(Number),
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should remove query parameters', (done) => {
      const context = createMockExecutionContext({
        url: '/api/users?page=1&limit=10&sort=name',
      });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            expect.any(String),
            '/api/users',
            expect.any(Number),
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should handle complex paths with multiple dynamic segments', (done) => {
      const context = createMockExecutionContext({
        url: '/api/festivals/550e8400-e29b-41d4-a716-446655440000/zones/123/tickets',
      });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            expect.any(String),
            '/api/festivals/:id/zones/:id/tickets',
            expect.any(Number),
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should preserve static path segments', (done) => {
      const context = createMockExecutionContext({
        url: '/api/auth/login',
      });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            expect.any(String),
            '/api/auth/login',
            expect.any(Number),
            expect.any(Number),
          );
          done();
        },
      });
    });
  });

  // ==========================================================================
  // HTTP Methods Tests
  // ==========================================================================

  describe('HTTP methods', () => {
    it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])(
      'should record %s method correctly',
      (method, done) => {
        const context = createMockExecutionContext({ method });
        const handler = createMockCallHandler();

        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
              method,
              expect.any(String),
              expect.any(Number),
              expect.any(Number),
            );
            (done as jest.DoneCallback)();
          },
        });
      },
    );
  });

  // ==========================================================================
  // Concurrent Requests Tests
  // ==========================================================================

  describe('concurrent requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = [
        createMockExecutionContext({ method: 'GET', url: '/api/users' }),
        createMockExecutionContext({ method: 'POST', url: '/api/orders' }),
        createMockExecutionContext({ method: 'PUT', url: '/api/products/123' }),
      ];

      await Promise.all(
        requests.map(
          (context) =>
            new Promise<void>((resolve) => {
              interceptor
                .intercept(context, createMockCallHandler())
                .subscribe({ complete: resolve });
            }),
        ),
      );

      expect(metricsService.recordHttpRequest).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty URL', (done) => {
      const context = createMockExecutionContext({ url: '' });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle root path', (done) => {
      const context = createMockExecutionContext({ url: '/' });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            expect.any(String),
            '/',
            expect.any(Number),
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should handle URL with trailing slash', (done) => {
      const context = createMockExecutionContext({ url: '/api/users/' });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            expect.any(String),
            '/api/users/',
            expect.any(Number),
            expect.any(Number),
          );
          done();
        },
      });
    });

    it('should handle URL with special characters', (done) => {
      const context = createMockExecutionContext({
        url: '/api/search?q=hello%20world',
      });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
            expect.any(String),
            '/api/search',
            expect.any(Number),
            expect.any(Number),
          );
          done();
        },
      });
    });
  });
});
