/**
 * API Version Interceptor Unit Tests
 *
 * Comprehensive tests for API version interceptor including:
 * - Version header on response
 * - Response wrapping with version info
 * - Deprecation warnings
 * - Sunset dates for deprecated versions
 * - Version extraction from request
 */

import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import type { Request, Response } from 'express';
import {
  ApiVersionInterceptor,
  ApiVersionHeaderInterceptor,
  VersionedResponse,
  DeprecationConfig,
} from './api-version.interceptor';
import { ApiVersion, API_VERSION_HEADER, DEFAULT_API_VERSION } from './api-version.decorator';

// ============================================================================
// Mock Setup
// ============================================================================

const createMockExecutionContext = (
  overrides: {
    apiVersion?: ApiVersion;
    path?: string;
  } = {},
): ExecutionContext => {
  const mockRequest: Partial<Request> & { apiVersion?: ApiVersion } = {
    apiVersion: overrides.apiVersion,
    path: overrides.path ?? '/api/test',
  };

  const mockResponse: Partial<Response> = {
    setHeader: jest.fn(),
  };

  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
    getType: jest.fn().mockReturnValue('http'),
    getArgs: jest.fn().mockReturnValue([mockRequest, mockResponse]),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  } as unknown as ExecutionContext;
};

const createMockCallHandler = (response?: unknown): CallHandler => ({
  handle: () => of(response ?? { data: 'test' }),
});

describe('ApiVersionInterceptor', () => {
  describe('constructor', () => {
    it('should create with default config', () => {
      const interceptor = new ApiVersionInterceptor();
      expect(interceptor).toBeDefined();
    });

    it('should accept custom deprecation config', () => {
      const config: DeprecationConfig = {
        deprecatedVersions: [ApiVersion.V1],
        warningMessage: 'Custom warning',
        sunsetDates: { [ApiVersion.V1]: '2025-12-31' },
      };
      const interceptor = new ApiVersionInterceptor(config);
      expect(interceptor).toBeDefined();
    });

    it('should accept wrapResponses parameter', () => {
      const interceptor = new ApiVersionInterceptor({}, true);
      expect(interceptor).toBeDefined();
    });
  });

  describe('intercept - version header', () => {
    it('should set X-API-Version header on response', (done) => {
      const interceptor = new ApiVersionInterceptor();
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          const response = context.switchToHttp().getResponse();
          expect(response.setHeader).toHaveBeenCalledWith(
            API_VERSION_HEADER,
            'v1',
          );
          done();
        },
      });
    });

    it('should set version v2 header correctly', (done) => {
      const interceptor = new ApiVersionInterceptor();
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V2 });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          const response = context.switchToHttp().getResponse();
          expect(response.setHeader).toHaveBeenCalledWith(
            API_VERSION_HEADER,
            'v2',
          );
          done();
        },
      });
    });
  });

  describe('intercept - version extraction from path', () => {
    it('should extract version from path when not in request', (done) => {
      const interceptor = new ApiVersionInterceptor();
      const context = createMockExecutionContext({
        apiVersion: undefined,
        path: '/api/v2/users',
      });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          const response = context.switchToHttp().getResponse();
          expect(response.setHeader).toHaveBeenCalledWith(
            API_VERSION_HEADER,
            'v2',
          );
          done();
        },
      });
    });

    it('should use default version when path has no version', (done) => {
      const interceptor = new ApiVersionInterceptor();
      const context = createMockExecutionContext({
        apiVersion: undefined,
        path: '/api/users',
      });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          const response = context.switchToHttp().getResponse();
          expect(response.setHeader).toHaveBeenCalledWith(
            API_VERSION_HEADER,
            `v${DEFAULT_API_VERSION}`,
          );
          done();
        },
      });
    });
  });

  describe('intercept - deprecation warnings', () => {
    it('should set Deprecation header for deprecated versions', (done) => {
      const interceptor = new ApiVersionInterceptor({
        deprecatedVersions: [ApiVersion.V1],
      });
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          const response = context.switchToHttp().getResponse();
          expect(response.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
          done();
        },
      });
    });

    it('should set X-Deprecation-Warning header', (done) => {
      const warningMessage = 'Version 1 is deprecated';
      const interceptor = new ApiVersionInterceptor({
        deprecatedVersions: [ApiVersion.V1],
        warningMessage,
      });
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          const response = context.switchToHttp().getResponse();
          expect(response.setHeader).toHaveBeenCalledWith(
            'X-Deprecation-Warning',
            warningMessage,
          );
          done();
        },
      });
    });

    it('should set Sunset header when sunsetDate is provided', (done) => {
      const sunsetDate = '2025-12-31';
      const interceptor = new ApiVersionInterceptor({
        deprecatedVersions: [ApiVersion.V1],
        sunsetDates: { [ApiVersion.V1]: sunsetDate },
      });
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          const response = context.switchToHttp().getResponse();
          expect(response.setHeader).toHaveBeenCalledWith('Sunset', sunsetDate);
          done();
        },
      });
    });

    it('should not set deprecation headers for non-deprecated versions', (done) => {
      const interceptor = new ApiVersionInterceptor({
        deprecatedVersions: [ApiVersion.V1],
      });
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V2 });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          const response = context.switchToHttp().getResponse();
          expect(response.setHeader).not.toHaveBeenCalledWith(
            'Deprecation',
            'true',
          );
          done();
        },
      });
    });
  });

  describe('intercept - response wrapping', () => {
    it('should not wrap response by default', (done) => {
      const interceptor = new ApiVersionInterceptor();
      const responseData = { id: 1, name: 'Test' };
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toEqual(responseData);
        },
        complete: done,
      });
    });

    it('should wrap response when wrapResponses is true', (done) => {
      const interceptor = new ApiVersionInterceptor({}, true);
      const responseData = { id: 1, name: 'Test' };
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          const wrapped = result as VersionedResponse<typeof responseData>;
          expect(wrapped.apiVersion).toBe('v1');
          expect(wrapped.data).toEqual(responseData);
        },
        complete: done,
      });
    });

    it('should include deprecation warning in wrapped response', (done) => {
      const warningMessage = 'Version deprecated';
      const interceptor = new ApiVersionInterceptor(
        {
          deprecatedVersions: [ApiVersion.V1],
          warningMessage,
        },
        true,
      );
      const responseData = { id: 1 };
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          const wrapped = result as VersionedResponse<typeof responseData>;
          expect(wrapped.deprecationWarning).toBe(warningMessage);
        },
        complete: done,
      });
    });

    it('should include sunset date in wrapped response', (done) => {
      const sunsetDate = '2025-12-31';
      const interceptor = new ApiVersionInterceptor(
        {
          deprecatedVersions: [ApiVersion.V1],
          sunsetDates: { [ApiVersion.V1]: sunsetDate },
        },
        true,
      );
      const responseData = { id: 1 };
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          const wrapped = result as VersionedResponse<typeof responseData>;
          expect(wrapped.sunsetDate).toBe(sunsetDate);
        },
        complete: done,
      });
    });

    it('should not include deprecation in wrapped response for non-deprecated versions', (done) => {
      const interceptor = new ApiVersionInterceptor(
        {
          deprecatedVersions: [ApiVersion.V1],
        },
        true,
      );
      const responseData = { id: 1 };
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V2 });
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          const wrapped = result as VersionedResponse<typeof responseData>;
          expect(wrapped.deprecationWarning).toBeUndefined();
          expect(wrapped.sunsetDate).toBeUndefined();
        },
        complete: done,
      });
    });
  });

  describe('intercept - data passthrough', () => {
    it('should pass through original data without modification when not wrapping', (done) => {
      const interceptor = new ApiVersionInterceptor();
      const complexData = {
        users: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
        ],
        metadata: { total: 2, page: 1 },
      };
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
      const handler = createMockCallHandler(complexData);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toEqual(complexData);
        },
        complete: done,
      });
    });

    it('should handle null response', (done) => {
      const interceptor = new ApiVersionInterceptor();
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
      const handler: CallHandler = { handle: () => of(null) };

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toBeNull();
        },
        complete: done,
      });
    });

    it('should handle undefined response', (done) => {
      const interceptor = new ApiVersionInterceptor();
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
      const handler: CallHandler = { handle: () => of(undefined) };

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toBeUndefined();
        },
        complete: done,
      });
    });

    it('should handle array response', (done) => {
      const interceptor = new ApiVersionInterceptor();
      const arrayData = [1, 2, 3];
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
      const handler = createMockCallHandler(arrayData);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toEqual(arrayData);
        },
        complete: done,
      });
    });
  });
});

describe('ApiVersionHeaderInterceptor', () => {
  describe('intercept', () => {
    it('should set version header on response', (done) => {
      const interceptor = new ApiVersionHeaderInterceptor();
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V2 });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          const response = context.switchToHttp().getResponse();
          expect(response.setHeader).toHaveBeenCalledWith(
            API_VERSION_HEADER,
            'v2',
          );
          done();
        },
      });
    });

    it('should use default version when not set', (done) => {
      const interceptor = new ApiVersionHeaderInterceptor();
      const context = createMockExecutionContext({ apiVersion: undefined });
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          const response = context.switchToHttp().getResponse();
          expect(response.setHeader).toHaveBeenCalledWith(
            API_VERSION_HEADER,
            `v${DEFAULT_API_VERSION}`,
          );
          done();
        },
      });
    });

    it('should pass through response data unchanged', (done) => {
      const interceptor = new ApiVersionHeaderInterceptor();
      const responseData = { id: 1, name: 'Test' };
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toEqual(responseData);
        },
        complete: done,
      });
    });

    it('should not wrap response with version metadata', (done) => {
      const interceptor = new ApiVersionHeaderInterceptor();
      const responseData = { id: 1 };
      const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
      const handler = createMockCallHandler(responseData);

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect((result as any).apiVersion).toBeUndefined();
          expect((result as any).data).toBeUndefined();
        },
        complete: done,
      });
    });
  });
});

describe('VersionedResponse interface', () => {
  it('should have correct structure', () => {
    const response: VersionedResponse<{ id: number }> = {
      apiVersion: 'v1',
      data: { id: 1 },
    };

    expect(response.apiVersion).toBeDefined();
    expect(response.data).toBeDefined();
  });

  it('should allow optional deprecation fields', () => {
    const response: VersionedResponse<{ id: number }> = {
      apiVersion: 'v1',
      data: { id: 1 },
      deprecationWarning: 'This version is deprecated',
      sunsetDate: '2025-12-31',
    };

    expect(response.deprecationWarning).toBeDefined();
    expect(response.sunsetDate).toBeDefined();
  });
});

describe('DeprecationConfig interface', () => {
  it('should have correct default structure', () => {
    const config: DeprecationConfig = {
      deprecatedVersions: [],
    };

    expect(config.deprecatedVersions).toBeDefined();
    expect(config.warningMessage).toBeUndefined();
    expect(config.sunsetDates).toBeUndefined();
  });

  it('should allow all optional fields', () => {
    const config: DeprecationConfig = {
      deprecatedVersions: [ApiVersion.V1],
      warningMessage: 'Warning',
      sunsetDates: { [ApiVersion.V1]: '2025-12-31' },
    };

    expect(config.deprecatedVersions).toContain(ApiVersion.V1);
    expect(config.warningMessage).toBe('Warning');
    expect(config.sunsetDates![ApiVersion.V1]).toBe('2025-12-31');
  });
});

describe('Edge cases', () => {
  it('should handle multiple deprecated versions', (done) => {
    const interceptor = new ApiVersionInterceptor({
      deprecatedVersions: [ApiVersion.V1, ApiVersion.V2],
    });
    const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        const response = context.switchToHttp().getResponse();
        expect(response.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
        done();
      },
    });
  });

  it('should handle empty deprecatedVersions array', (done) => {
    const interceptor = new ApiVersionInterceptor({
      deprecatedVersions: [],
    });
    const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        const response = context.switchToHttp().getResponse();
        expect(response.setHeader).not.toHaveBeenCalledWith(
          'Deprecation',
          'true',
        );
        done();
      },
    });
  });

  it('should handle missing sunsetDate for deprecated version', (done) => {
    const interceptor = new ApiVersionInterceptor({
      deprecatedVersions: [ApiVersion.V1],
      sunsetDates: {}, // No sunset date for V1
    });
    const context = createMockExecutionContext({ apiVersion: ApiVersion.V1 });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        const response = context.switchToHttp().getResponse();
        expect(response.setHeader).not.toHaveBeenCalledWith(
          'Sunset',
          expect.any(String),
        );
        done();
      },
    });
  });
});
