import { ExecutionContext, CallHandler, RequestTimeoutException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, delay, throwError } from 'rxjs';
import {
  TimeoutInterceptor,
  TIMEOUT_KEY,
  DEFAULT_TIMEOUT,
  createTimeoutInterceptor,
} from './timeout.interceptor';

describe('TimeoutInterceptor', () => {
  let interceptor: TimeoutInterceptor;
  let reflector: Reflector;

  const createMockExecutionContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  const createMockCallHandler = (response: unknown, delayMs = 0): CallHandler => ({
    handle: () => of(response).pipe(delay(delayMs)),
  });

  const createErrorCallHandler = (error: Error, delayMs = 0): CallHandler => ({
    handle: () => of(null).pipe(
      delay(delayMs),
      () => throwError(() => error),
    ),
  });

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new TimeoutInterceptor(reflector, { defaultTimeout: 100 });
  });

  describe('default timeout', () => {
    it('should have correct default timeout value', () => {
      expect(DEFAULT_TIMEOUT).toBe(30000);
    });

    it('should use default timeout when no options provided', () => {
      const defaultInterceptor = new TimeoutInterceptor();
      const context = createMockExecutionContext();

      const timeout = defaultInterceptor.getEffectiveTimeout(context);
      expect(timeout).toBe(DEFAULT_TIMEOUT);
    });

    it('should use custom default timeout from options', () => {
      const customInterceptor = new TimeoutInterceptor(reflector, {
        defaultTimeout: 5000,
      });
      const context = createMockExecutionContext();

      const timeout = customInterceptor.getEffectiveTimeout(context);
      expect(timeout).toBe(5000);
    });
  });

  describe('successful requests', () => {
    it('should return response when request completes before timeout', (done) => {
      const responseData = { id: 1, name: 'Test' };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData, 10);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toEqual(responseData);
        },
        complete: done,
      });
    });

    it('should return null response', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(null, 10);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toBeNull();
        },
        complete: done,
      });
    });

    it('should return array response', (done) => {
      const responseData = [{ id: 1 }, { id: 2 }];
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData, 10);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toEqual(responseData);
        },
        complete: done,
      });
    });
  });

  describe('timeout handling', () => {
    it('should throw RequestTimeoutException when timeout exceeded', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ id: 1 }, 200); // 200ms delay, 100ms timeout

      interceptor.intercept(context, handler).subscribe({
        error: (error) => {
          expect(error).toBeInstanceOf(RequestTimeoutException);
          done();
        },
      });
    });

    it('should include timeout value in error', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ id: 1 }, 200);

      interceptor.intercept(context, handler).subscribe({
        error: (error) => {
          expect(error).toBeInstanceOf(RequestTimeoutException);
          const response = error.getResponse();
          expect(response).toHaveProperty('timeout', 100);
          done();
        },
      });
    });

    it('should include custom message in error', (done) => {
      const customInterceptor = new TimeoutInterceptor(reflector, {
        defaultTimeout: 50,
        message: 'Custom timeout message',
      });
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ id: 1 }, 100);

      customInterceptor.intercept(context, handler).subscribe({
        error: (error) => {
          const response = error.getResponse();
          expect(response).toHaveProperty('message', 'Custom timeout message');
          done();
        },
      });
    });

    it('should include 408 status code', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ id: 1 }, 200);

      interceptor.intercept(context, handler).subscribe({
        error: (error) => {
          expect(error.getStatus()).toBe(408);
          done();
        },
      });
    });
  });

  describe('custom timeout via decorator', () => {
    it('should use custom timeout from metadata', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ id: 1 }, 50);

      jest.spyOn(reflector, 'get').mockReturnValue(200); // 200ms custom timeout

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toEqual({ id: 1 });
        },
        complete: done,
      });
    });

    it('should check correct metadata key', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({}, 10);
      const getSpy = jest.spyOn(reflector, 'get').mockReturnValue(undefined);

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(getSpy).toHaveBeenCalledWith(TIMEOUT_KEY, expect.any(Function));
          done();
        },
      });
    });

    it('should timeout with custom timeout when exceeded', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ id: 1 }, 100);

      jest.spyOn(reflector, 'get').mockReturnValue(50); // 50ms custom timeout

      interceptor.intercept(context, handler).subscribe({
        error: (error) => {
          expect(error).toBeInstanceOf(RequestTimeoutException);
          const response = error.getResponse();
          expect(response).toHaveProperty('timeout', 50);
          done();
        },
      });
    });
  });

  describe('disabled timeout', () => {
    it('should skip timeout for zero timeout value', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ id: 1 }, 10);

      jest.spyOn(reflector, 'get').mockReturnValue(0);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toEqual({ id: 1 });
        },
        complete: done,
      });
    });

    it('should skip timeout for negative timeout value', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ id: 1 }, 10);

      jest.spyOn(reflector, 'get').mockReturnValue(-1);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toEqual({ id: 1 });
        },
        complete: done,
      });
    });
  });

  describe('error propagation', () => {
    it('should propagate non-timeout errors', (done) => {
      const originalError = new Error('Database error');
      const context = createMockExecutionContext();
      const handler: CallHandler = {
        handle: () => throwError(() => originalError),
      };

      interceptor.intercept(context, handler).subscribe({
        error: (error) => {
          expect(error).toBe(originalError);
          expect(error.message).toBe('Database error');
          done();
        },
      });
    });

    it('should propagate HTTP exceptions', (done) => {
      const httpError = new RequestTimeoutException('Already timeout');
      const context = createMockExecutionContext();
      const handler: CallHandler = {
        handle: () => throwError(() => httpError),
      };

      interceptor.intercept(context, handler).subscribe({
        error: (error) => {
          expect(error).toBe(httpError);
          done();
        },
      });
    });
  });

  describe('getEffectiveTimeout', () => {
    it('should return default timeout when no custom timeout', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'get').mockReturnValue(undefined);

      const timeout = interceptor.getEffectiveTimeout(context);
      expect(timeout).toBe(100);
    });

    it('should return custom timeout from metadata', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'get').mockReturnValue(5000);

      const timeout = interceptor.getEffectiveTimeout(context);
      expect(timeout).toBe(5000);
    });

    it('should return default when reflector is not available', () => {
      const interceptorWithoutReflector = new TimeoutInterceptor(undefined, {
        defaultTimeout: 200,
      });
      const context = createMockExecutionContext();

      const timeout = interceptorWithoutReflector.getEffectiveTimeout(context);
      expect(timeout).toBe(200);
    });
  });

  describe('without reflector', () => {
    it('should work without reflector provided', (done) => {
      const interceptorWithoutReflector = new TimeoutInterceptor(undefined, {
        defaultTimeout: 100,
      });
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ id: 1 }, 10);

      interceptorWithoutReflector.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toEqual({ id: 1 });
        },
        complete: done,
      });
    });

    it('should timeout without reflector', (done) => {
      const interceptorWithoutReflector = new TimeoutInterceptor(undefined, {
        defaultTimeout: 50,
      });
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ id: 1 }, 100);

      interceptorWithoutReflector.intercept(context, handler).subscribe({
        error: (error) => {
          expect(error).toBeInstanceOf(RequestTimeoutException);
          done();
        },
      });
    });
  });
});

describe('createTimeoutInterceptor', () => {
  it('should create interceptor with default options', () => {
    const interceptor = createTimeoutInterceptor();
    expect(interceptor).toBeInstanceOf(TimeoutInterceptor);
  });

  it('should create interceptor with custom options', () => {
    const interceptor = createTimeoutInterceptor({
      defaultTimeout: 10000,
      message: 'Custom message',
    });
    expect(interceptor).toBeInstanceOf(TimeoutInterceptor);
  });

  it('should use provided timeout in created interceptor', (done) => {
    const interceptor = createTimeoutInterceptor({ defaultTimeout: 50 });
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
    const handler: CallHandler = {
      handle: () => of({ id: 1 }).pipe(delay(100)),
    };

    interceptor.intercept(context, handler).subscribe({
      error: (error) => {
        expect(error).toBeInstanceOf(RequestTimeoutException);
        done();
      },
    });
  });
});

describe('TIMEOUT_KEY', () => {
  it('should be defined', () => {
    expect(TIMEOUT_KEY).toBe('timeout');
  });
});
