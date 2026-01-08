/**
 * API Version Guard Unit Tests
 *
 * Comprehensive tests for API version guard including:
 * - Version extraction from headers
 * - Version extraction from query parameters
 * - Version extraction from URL path
 * - Version validation against allowed versions
 * - Error handling for unsupported versions
 * - Request version attachment
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiVersionGuard, getCurrentApiVersion } from './api-version.guard';
import {
  API_VERSION_KEY,
  API_VERSION_HEADER,
  API_VERSION_PARAM,
  ApiVersion,
  DEFAULT_API_VERSION,
} from './api-version.decorator';
import type { Request } from 'express';

// ============================================================================
// Mock Setup
// ============================================================================

const createMockExecutionContext = (
  overrides: {
    headers?: Record<string, string>;
    query?: Record<string, string>;
    path?: string;
    handler?: () => void;
    class?: any;
  } = {},
): ExecutionContext => {
  const mockRequest: Partial<Request> = {
    headers: overrides.headers ?? {},
    query: overrides.query ?? {},
    path: overrides.path ?? '/api/test',
  };

  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
    }),
    getHandler: jest.fn().mockReturnValue(overrides.handler ?? jest.fn()),
    getClass: jest.fn().mockReturnValue(overrides.class ?? class TestController {}),
    getType: jest.fn().mockReturnValue('http'),
    getArgs: jest.fn().mockReturnValue([mockRequest]),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  } as unknown as ExecutionContext;
};

describe('ApiVersionGuard', () => {
  let guard: ApiVersionGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiVersionGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<ApiVersionGuard>(ApiVersionGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should have reflector injected', () => {
      expect(reflector).toBeDefined();
    });
  });

  describe('canActivate - no version metadata', () => {
    it('should return true when no version metadata is set', () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createMockExecutionContext();
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when version metadata is empty array', () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);

      const context = createMockExecutionContext();
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('canActivate - version from header', () => {
    it('should extract version v1 from header', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V1]);

      const context = createMockExecutionContext({
        headers: { [API_VERSION_HEADER.toLowerCase()]: 'v1' },
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should extract version v2 from header', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V2]);

      const context = createMockExecutionContext({
        headers: { [API_VERSION_HEADER.toLowerCase()]: 'v2' },
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle version without v prefix', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V1]);

      const context = createMockExecutionContext({
        headers: { [API_VERSION_HEADER.toLowerCase()]: '1' },
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle version with uppercase V prefix', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V1]);

      const context = createMockExecutionContext({
        headers: { [API_VERSION_HEADER.toLowerCase()]: 'V1' },
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('canActivate - version from query parameter', () => {
    it('should extract version from query parameter', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V1]);

      const context = createMockExecutionContext({
        query: { [API_VERSION_PARAM]: 'v1' },
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should prefer header over query parameter', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V2]);

      const context = createMockExecutionContext({
        headers: { [API_VERSION_HEADER.toLowerCase()]: 'v2' },
        query: { [API_VERSION_PARAM]: 'v1' },
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('canActivate - version from URL path', () => {
    it('should extract version v1 from path', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V1]);

      const context = createMockExecutionContext({
        path: '/api/v1/users',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should extract version v2 from path', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V2]);

      const context = createMockExecutionContext({
        path: '/api/v2/users',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should prefer header over path', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V1]);

      const context = createMockExecutionContext({
        headers: { [API_VERSION_HEADER.toLowerCase()]: 'v1' },
        path: '/api/v2/users',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should prefer query over path', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V1]);

      const context = createMockExecutionContext({
        query: { [API_VERSION_PARAM]: 'v1' },
        path: '/api/v2/users',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('canActivate - default version', () => {
    it('should use default version when none specified', () => {
      mockReflector.getAllAndOverride.mockReturnValue([DEFAULT_API_VERSION]);

      const context = createMockExecutionContext({
        path: '/api/users',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should use default version for unknown version strings', () => {
      mockReflector.getAllAndOverride.mockReturnValue([DEFAULT_API_VERSION]);

      const context = createMockExecutionContext({
        headers: { [API_VERSION_HEADER.toLowerCase()]: 'v99' },
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('canActivate - version validation', () => {
    it('should throw BadRequestException for unsupported version', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V2]);

      const context = createMockExecutionContext({
        headers: { [API_VERSION_HEADER.toLowerCase()]: 'v1' },
      });

      expect(() => guard.canActivate(context)).toThrow(BadRequestException);
    });

    it('should include supported versions in error message', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V2]);

      const context = createMockExecutionContext({
        headers: { [API_VERSION_HEADER.toLowerCase()]: 'v1' },
      });

      try {
        guard.canActivate(context);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        expect(response.supportedVersions).toContain(ApiVersion.V2);
      }
    });

    it('should include requested version in error response', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V2]);

      const context = createMockExecutionContext({
        headers: { [API_VERSION_HEADER.toLowerCase()]: 'v1' },
      });

      try {
        guard.canActivate(context);
        fail('Should have thrown');
      } catch (error) {
        const response = (error as BadRequestException).getResponse() as any;
        expect(response.requestedVersion).toBe(ApiVersion.V1);
      }
    });

    it('should allow request when multiple versions are allowed', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V1, ApiVersion.V2]);

      const contextV1 = createMockExecutionContext({
        headers: { [API_VERSION_HEADER.toLowerCase()]: 'v1' },
      });

      const contextV2 = createMockExecutionContext({
        headers: { [API_VERSION_HEADER.toLowerCase()]: 'v2' },
      });

      expect(guard.canActivate(contextV1)).toBe(true);
      expect(guard.canActivate(contextV2)).toBe(true);
    });
  });

  describe('canActivate - request version attachment', () => {
    it('should attach apiVersion to request object', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V1]);

      const context = createMockExecutionContext({
        headers: { [API_VERSION_HEADER.toLowerCase()]: 'v1' },
      });

      guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.apiVersion).toBe(ApiVersion.V1);
    });

    it('should attach correct version when extracted from path', () => {
      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V2]);

      const context = createMockExecutionContext({
        path: '/api/v2/users',
      });

      guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.apiVersion).toBe(ApiVersion.V2);
    });
  });

  describe('reflector usage', () => {
    it('should check handler and class for metadata', () => {
      const handler = jest.fn();
      class TestController {}

      mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V1]);

      const context = createMockExecutionContext({
        handler,
        class: TestController,
      });

      guard.canActivate(context);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        API_VERSION_KEY,
        [handler, TestController],
      );
    });
  });
});

describe('getCurrentApiVersion', () => {
  it('should return apiVersion from request', () => {
    const request = {
      apiVersion: ApiVersion.V2,
    } as Request & { apiVersion?: ApiVersion };

    expect(getCurrentApiVersion(request)).toBe(ApiVersion.V2);
  });

  it('should return default version when apiVersion is not set', () => {
    const request = {} as Request;

    expect(getCurrentApiVersion(request)).toBe(DEFAULT_API_VERSION);
  });

  it('should return default version when apiVersion is undefined', () => {
    const request = {
      apiVersion: undefined,
    } as Request & { apiVersion?: ApiVersion };

    expect(getCurrentApiVersion(request)).toBe(DEFAULT_API_VERSION);
  });
});

describe('ApiVersion enum', () => {
  it('should have correct values', () => {
    expect(ApiVersion.V1).toBe('1');
    expect(ApiVersion.V2).toBe('2');
  });
});

describe('Constants', () => {
  it('should have correct API_VERSION_KEY', () => {
    expect(API_VERSION_KEY).toBe('apiVersion');
  });

  it('should have correct API_VERSION_HEADER', () => {
    expect(API_VERSION_HEADER).toBe('X-API-Version');
  });

  it('should have correct API_VERSION_PARAM', () => {
    expect(API_VERSION_PARAM).toBe('api-version');
  });

  it('should have correct DEFAULT_API_VERSION', () => {
    expect(DEFAULT_API_VERSION).toBe(ApiVersion.V1);
  });
});

describe('Edge cases', () => {
  let guard: ApiVersionGuard;
  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiVersionGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<ApiVersionGuard>(ApiVersionGuard);
  });

  it('should handle empty header value', () => {
    mockReflector.getAllAndOverride.mockReturnValue([DEFAULT_API_VERSION]);

    const context = createMockExecutionContext({
      headers: { [API_VERSION_HEADER.toLowerCase()]: '' },
    });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should handle path with multiple version-like patterns', () => {
    mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V1]);

    const context = createMockExecutionContext({
      path: '/api/v1/users/v2profile',
    });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should handle path without version prefix', () => {
    mockReflector.getAllAndOverride.mockReturnValue([DEFAULT_API_VERSION]);

    const context = createMockExecutionContext({
      path: '/api/users',
    });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should handle whitespace in version header', () => {
    mockReflector.getAllAndOverride.mockReturnValue([ApiVersion.V1]);

    const context = createMockExecutionContext({
      headers: { [API_VERSION_HEADER.toLowerCase()]: ' v1 ' },
    });

    // The current implementation doesn't trim, so this might use default
    // This tests the actual behavior
    expect(() => guard.canActivate(context)).not.toThrow();
  });
});
