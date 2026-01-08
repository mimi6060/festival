import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockLogger: jest.SpyInstance;

  const createMockExecutionContext = (overrides: {
    method?: string;
    url?: string;
    ip?: string;
    userAgent?: string;
    userId?: string;
    requestId?: string;
    correlationId?: string;
    statusCode?: number;
  } = {}): ExecutionContext => {
    const request = {
      method: overrides.method ?? 'GET',
      url: overrides.url ?? '/api/test',
      ip: overrides.ip ?? '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      headers: {
        'user-agent': overrides.userAgent ?? 'Jest Test Agent',
        'x-request-id': overrides.requestId,
        'x-correlation-id': overrides.correlationId,
      },
      user: overrides.userId ? { id: overrides.userId } : undefined,
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
    handle: () => error ? throwError(() => error) : of(response ?? { data: 'test' }),
  });

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    mockLogger = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('intercept', () => {
    it('should log incoming request', (done) => {
      const context = createMockExecutionContext({ requestId: 'req-123' });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(mockLogger).toHaveBeenCalledWith(
            expect.stringContaining('[req-123]'),
          );
          expect(mockLogger).toHaveBeenCalledWith(
            expect.stringContaining('GET'),
          );
          expect(mockLogger).toHaveBeenCalledWith(
            expect.stringContaining('/api/test'),
          );
          done();
        },
      });
    });

    it('should log response with status code and duration', (done) => {
      const context = createMockExecutionContext({ statusCode: 200 });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(mockLogger).toHaveBeenCalledWith(
            expect.stringMatching(/200.*\(\d+ms\)/),
          );
          done();
        },
      });
    });

    it('should log anonymous user when no user authenticated', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(mockLogger).toHaveBeenCalledWith(
            expect.stringContaining('User: anonymous'),
          );
          done();
        },
      });
    });

    it('should log user ID when authenticated', (done) => {
      const context = createMockExecutionContext({ userId: 'user-456' });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(mockLogger).toHaveBeenCalledWith(
            expect.stringContaining('User: user-456'),
          );
          done();
        },
      });
    });

    it('should log no-id when request ID is missing', (done) => {
      const context = createMockExecutionContext({ requestId: undefined });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(mockLogger).toHaveBeenCalledWith(
            expect.stringContaining('[no-id]'),
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
  });

  describe('log levels based on status code', () => {
    it('should log as info for 2xx status codes', (done) => {
      const context = createMockExecutionContext({ statusCode: 200 });
      const handler = createMockCallHandler();
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          // Two calls: request and response
          expect(logSpy).toHaveBeenCalledTimes(2);
          done();
        },
      });
    });

    it('should log as info for 3xx status codes', (done) => {
      const context = createMockExecutionContext({ statusCode: 301 });
      const handler = createMockCallHandler();
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalledTimes(2);
          done();
        },
      });
    });

    it('should log as warn for 4xx status codes', (done) => {
      const context = createMockExecutionContext({ statusCode: 400 });
      const handler = createMockCallHandler();
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(warnSpy).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should log as error for 5xx status codes', (done) => {
      const context = createMockExecutionContext({ statusCode: 500 });
      const handler = createMockCallHandler();
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(errorSpy).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('error handling', () => {
    it('should log error with stack trace', (done) => {
      const error = new Error('Test error');
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(undefined, error);
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining('ERROR:'),
            error.stack,
          );
          done();
        },
      });
    });

    it('should log error message', (done) => {
      const error = new Error('Something went wrong');
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(undefined, error);
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Something went wrong'),
            expect.any(String),
          );
          done();
        },
      });
    });

    it('should log error with duration', (done) => {
      const error = new Error('Test error');
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(undefined, error);
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(errorSpy).toHaveBeenCalledWith(
            expect.stringMatching(/\(\d+ms\)/),
            expect.any(String),
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

  describe('HTTP methods', () => {
    it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])(
      'should log %s method correctly',
      (method, done) => {
        const context = createMockExecutionContext({ method });
        const handler = createMockCallHandler();

        interceptor.intercept(context, handler).subscribe({
          complete: () => {
            expect(mockLogger).toHaveBeenCalledWith(
              expect.stringContaining(method),
            );
            (done as jest.DoneCallback)();
          },
        });
      },
    );
  });

  describe('URL logging', () => {
    it('should log full URL with query parameters', (done) => {
      const context = createMockExecutionContext({ url: '/api/users?page=1&limit=10' });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(mockLogger).toHaveBeenCalledWith(
            expect.stringContaining('/api/users?page=1&limit=10'),
          );
          done();
        },
      });
    });

    it('should log URL with path parameters', (done) => {
      const context = createMockExecutionContext({ url: '/api/users/123/orders/456' });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(mockLogger).toHaveBeenCalledWith(
            expect.stringContaining('/api/users/123/orders/456'),
          );
          done();
        },
      });
    });
  });

  describe('getStructuredLogData', () => {
    it('should return structured log data', () => {
      const context = {
        method: 'POST',
        url: '/api/users',
        ip: '192.168.1.1',
        userAgent: 'Test Agent',
        userId: 'user-123',
        requestId: 'req-456',
        correlationId: 'corr-789',
      };

      const result = interceptor.getStructuredLogData(context, 201, 150);

      expect(result).toEqual({
        type: 'http',
        method: 'POST',
        url: '/api/users',
        statusCode: 201,
        duration: 150,
        userId: 'user-123',
        requestId: 'req-456',
        correlationId: 'corr-789',
        ip: '192.168.1.1',
        userAgent: 'Test Agent',
        timestamp: expect.any(String),
      });
    });

    it('should include timestamp in ISO format', () => {
      const context = {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        userAgent: 'Test',
      };

      const result = interceptor.getStructuredLogData(context, 200, 100);

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle missing optional fields', () => {
      const context = {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        userAgent: 'Test',
        userId: undefined,
        requestId: undefined,
        correlationId: undefined,
      };

      const result = interceptor.getStructuredLogData(context, 200, 50);

      expect(result.userId).toBeUndefined();
      expect(result.requestId).toBeUndefined();
      expect(result.correlationId).toBeUndefined();
    });
  });

  describe('IP address extraction', () => {
    it('should use request.ip when available', (done) => {
      const context = createMockExecutionContext({ ip: '10.0.0.1' });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          // Verify the interceptor runs without error
          expect(mockLogger).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should fallback to connection.remoteAddress', (done) => {
      const request = {
        method: 'GET',
        url: '/api/test',
        ip: undefined,
        connection: { remoteAddress: '192.168.0.1' },
        headers: { 'user-agent': 'Test' },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({ statusCode: 200 }),
        }),
      } as unknown as ExecutionContext;

      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(mockLogger).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('concurrent requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = [
        createMockExecutionContext({ requestId: 'req-1', url: '/api/users' }),
        createMockExecutionContext({ requestId: 'req-2', url: '/api/orders' }),
        createMockExecutionContext({ requestId: 'req-3', url: '/api/products' }),
      ];

      const results = await Promise.all(
        requests.map(
          (context) =>
            new Promise<void>((resolve) => {
              interceptor
                .intercept(context, createMockCallHandler())
                .subscribe({ complete: resolve });
            }),
        ),
      );

      expect(results).toHaveLength(3);
      expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining('[req-1]'));
      expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining('[req-2]'));
      expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining('[req-3]'));
    });
  });
});
