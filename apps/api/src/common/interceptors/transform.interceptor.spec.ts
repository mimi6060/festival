import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import {
  TransformInterceptor,
  ApiResponse,
  PaginatedResult,
  SKIP_TRANSFORM_KEY,
  createPaginatedResult,
} from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
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

  const createMockCallHandler = (response: unknown): CallHandler => ({
    handle: () => of(response),
  });

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new TransformInterceptor(reflector);
  });

  describe('standard response transformation', () => {
    it('should wrap response data in standard format', (done) => {
      const responseData = { id: 1, name: 'Test' };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result).toEqual({
            success: true,
            data: responseData,
          });
        },
        complete: done,
      });
    });

    it('should handle null response', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(null);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result).toEqual({
            success: true,
            data: null,
          });
        },
        complete: done,
      });
    });

    it('should handle undefined response', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(undefined);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result).toEqual({
            success: true,
            data: null,
          });
        },
        complete: done,
      });
    });

    it('should handle array response', (done) => {
      const responseData = [{ id: 1 }, { id: 2 }];
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result).toEqual({
            success: true,
            data: responseData,
          });
        },
        complete: done,
      });
    });

    it('should handle string response', (done) => {
      const responseData = 'simple string';
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result).toEqual({
            success: true,
            data: 'simple string',
          });
        },
        complete: done,
      });
    });

    it('should handle number response', (done) => {
      const responseData = 42;
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result).toEqual({
            success: true,
            data: 42,
          });
        },
        complete: done,
      });
    });

    it('should handle boolean response', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(true);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result).toEqual({
            success: true,
            data: true,
          });
        },
        complete: done,
      });
    });

    it('should handle empty object response', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({});

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result).toEqual({
            success: true,
            data: {},
          });
        },
        complete: done,
      });
    });

    it('should handle empty array response', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler([]);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result).toEqual({
            success: true,
            data: [],
          });
        },
        complete: done,
      });
    });
  });

  describe('already wrapped response', () => {
    it('should not double-wrap already formatted response', (done) => {
      const responseData: ApiResponse<unknown> = {
        success: true,
        data: { id: 1 },
      };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result).toEqual(responseData);
          expect(result.data).not.toHaveProperty('success');
        },
        complete: done,
      });
    });

    it('should not double-wrap response with meta', (done) => {
      const responseData: ApiResponse<unknown> = {
        success: true,
        data: [{ id: 1 }],
        meta: { page: 1, limit: 10, total: 100, totalPages: 10 },
      };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result).toEqual(responseData);
        },
        complete: done,
      });
    });

    it('should not double-wrap error response', (done) => {
      const responseData = {
        success: false,
        data: null,
        error: 'Something went wrong',
      };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result).toEqual(responseData);
        },
        complete: done,
      });
    });
  });

  describe('paginated response', () => {
    it('should transform paginated result with meta', (done) => {
      const paginatedData: PaginatedResult<{ id: number }> = {
        data: [{ id: 1 }, { id: 2 }],
        page: 1,
        limit: 10,
        total: 50,
      };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(paginatedData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
          expect(result.meta).toEqual({
            page: 1,
            limit: 10,
            total: 50,
            totalPages: 5,
            hasNext: true,
            hasPrevious: false,
          });
        },
        complete: done,
      });
    });

    it('should calculate totalPages correctly', (done) => {
      const paginatedData: PaginatedResult<{ id: number }> = {
        data: [{ id: 1 }],
        page: 1,
        limit: 10,
        total: 25,
      };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(paginatedData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result.meta?.totalPages).toBe(3); // ceil(25/10) = 3
        },
        complete: done,
      });
    });

    it('should set hasNext false on last page', (done) => {
      const paginatedData: PaginatedResult<{ id: number }> = {
        data: [{ id: 1 }],
        page: 5,
        limit: 10,
        total: 50,
      };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(paginatedData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result.meta?.hasNext).toBe(false);
          expect(result.meta?.hasPrevious).toBe(true);
        },
        complete: done,
      });
    });

    it('should set hasPrevious false on first page', (done) => {
      const paginatedData: PaginatedResult<{ id: number }> = {
        data: [{ id: 1 }],
        page: 1,
        limit: 10,
        total: 50,
      };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(paginatedData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result.meta?.hasPrevious).toBe(false);
        },
        complete: done,
      });
    });

    it('should handle middle page pagination', (done) => {
      const paginatedData: PaginatedResult<{ id: number }> = {
        data: [{ id: 1 }],
        page: 3,
        limit: 10,
        total: 100,
      };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(paginatedData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result.meta?.hasNext).toBe(true);
          expect(result.meta?.hasPrevious).toBe(true);
        },
        complete: done,
      });
    });

    it('should handle single page result', (done) => {
      const paginatedData: PaginatedResult<{ id: number }> = {
        data: [{ id: 1 }],
        page: 1,
        limit: 10,
        total: 5,
      };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(paginatedData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result.meta?.totalPages).toBe(1);
          expect(result.meta?.hasNext).toBe(false);
          expect(result.meta?.hasPrevious).toBe(false);
        },
        complete: done,
      });
    });

    it('should handle empty paginated result', (done) => {
      const paginatedData: PaginatedResult<unknown> = {
        data: [],
        page: 1,
        limit: 10,
        total: 0,
      };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(paginatedData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result.data).toEqual([]);
          expect(result.meta?.total).toBe(0);
          expect(result.meta?.totalPages).toBe(0);
        },
        complete: done,
      });
    });
  });

  describe('SkipTransform decorator', () => {
    it('should skip transformation when SkipTransform is set', (done) => {
      const responseData = { rawData: 'value' };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      jest.spyOn(reflector, 'get').mockReturnValue(true);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          // Should return raw data without wrapping
          expect(result).toEqual(responseData);
        },
        complete: done,
      });
    });

    it('should transform when SkipTransform is not set', (done) => {
      const responseData = { id: 1 };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      jest.spyOn(reflector, 'get').mockReturnValue(false);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result).toEqual({
            success: true,
            data: responseData,
          });
        },
        complete: done,
      });
    });

    it('should check correct metadata key', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({});
      const getSpy = jest.spyOn(reflector, 'get').mockReturnValue(false);

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(getSpy).toHaveBeenCalledWith(
            SKIP_TRANSFORM_KEY,
            expect.any(Function),
          );
          done();
        },
      });
    });
  });

  describe('without reflector', () => {
    it('should transform response when no reflector provided', (done) => {
      const interceptorWithoutReflector = new TransformInterceptor();
      const responseData = { id: 1 };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      interceptorWithoutReflector.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result).toEqual({
            success: true,
            data: responseData,
          });
        },
        complete: done,
      });
    });
  });

  describe('complex nested data', () => {
    it('should handle deeply nested objects', (done) => {
      const responseData = {
        user: {
          profile: {
            address: {
              city: 'Paris',
              country: 'France',
            },
          },
        },
      };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual(responseData);
        },
        complete: done,
      });
    });

    it('should handle arrays of nested objects', (done) => {
      const responseData = [
        { id: 1, nested: { value: 'a' } },
        { id: 2, nested: { value: 'b' } },
      ];
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual(responseData);
        },
        complete: done,
      });
    });

    it('should handle mixed data types in response', (done) => {
      const responseData = {
        string: 'text',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { key: 'value' },
        null: null,
      };
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result: ApiResponse<unknown>) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual(responseData);
        },
        complete: done,
      });
    });
  });
});

describe('createPaginatedResult', () => {
  it('should create a paginated result object', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const result = createPaginatedResult(data, 1, 10, 100);

    expect(result).toEqual({
      data,
      page: 1,
      limit: 10,
      total: 100,
    });
  });

  it('should handle empty data array', () => {
    const result = createPaginatedResult([], 1, 10, 0);

    expect(result).toEqual({
      data: [],
      page: 1,
      limit: 10,
      total: 0,
    });
  });

  it('should preserve data types in array', () => {
    const data = [
      { id: 1, name: 'Test', active: true },
      { id: 2, name: 'Test2', active: false },
    ];
    const result = createPaginatedResult(data, 2, 5, 25);

    expect(result.data).toEqual(data);
    expect(result.data[0]?.active).toBe(true);
  });
});
