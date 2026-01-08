/**
 * Cache Interceptor Unit Tests
 *
 * Comprehensive tests for cache interceptors including:
 * - CacheInterceptor: @Cacheable, @CacheEvict, @CachePut, @InvalidateTags
 * - MultiLevelCacheInterceptor: L1/L2 caching
 * - SWRCacheInterceptor: Stale-While-Revalidate pattern
 * - BatchCacheInterceptor: Batch cache operations
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import {
  CacheInterceptor,
  MultiLevelCacheInterceptor,
  SWRCacheInterceptor,
  BatchCacheInterceptor,
} from './cache.interceptor';
import { CacheService, CacheTag } from './cache.service';
import {
  CACHE_KEY_METADATA,
  CACHE_OPTIONS_METADATA,
  CACHE_EVICT_METADATA,
  CACHE_PUT_METADATA,
  CACHE_INVALIDATE_TAGS_METADATA,
} from './cache.decorators';

// ============================================================================
// Mock Setup
// ============================================================================

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  deletePattern: jest.fn(),
  clear: jest.fn(),
  invalidateByTag: jest.fn(),
  getOrSet: jest.fn(),
};

const mockReflector = {
  get: jest.fn(),
  getAllAndOverride: jest.fn(),
};

// Factory for creating mock ExecutionContext
function createMockExecutionContext(
  className: string = 'TestController',
  methodName: string = 'testMethod',
  args: any[] = [],
): ExecutionContext {
  const mockHandler = {
    name: methodName,
  };
  const mockClass = {
    name: className,
    prototype: {
      constructor: { name: className },
    },
  };

  return {
    getHandler: jest.fn().mockReturnValue(mockHandler),
    getClass: jest.fn().mockReturnValue(mockClass),
    getArgs: jest.fn().mockReturnValue(args),
    getType: jest.fn().mockReturnValue('http'),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({}),
      getResponse: jest.fn().mockReturnValue({}),
    }),
  } as unknown as ExecutionContext;
}

// Factory for creating mock CallHandler
function createMockCallHandler(returnValue: any = { data: 'test' }): CallHandler {
  return {
    handle: jest.fn().mockReturnValue(of(returnValue)),
  };
}

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;
  let cacheService: CacheService;
  let reflector: Reflector;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInterceptor,
        { provide: CacheService, useValue: mockCacheService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    interceptor = module.get<CacheInterceptor>(CacheInterceptor);
    cacheService = module.get<CacheService>(CacheService);
    reflector = module.get<Reflector>(Reflector);
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('initialization', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });
  });

  // ==========================================================================
  // No Decorator Tests
  // ==========================================================================

  describe('no cache decorators', () => {
    it('should pass through when no cache decorators present', (done) => {
      mockReflector.get.mockReturnValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual({ result: 'data' });
          expect(handler.handle).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  // ==========================================================================
  // @Cacheable Tests
  // ==========================================================================

  describe('@Cacheable decorator', () => {
    it('should return cached value when cache hit', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_OPTIONS_METADATA) {
            return { ttl: 300, tags: [CacheTag.USER] };
          }
          if (key === CACHE_KEY_METADATA) {
            return 'test:key';
          }
          return undefined;
        });

      mockCacheService.get.mockResolvedValue({ cached: 'data' });

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ fresh: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual({ cached: 'data' });
          expect(mockCacheService.get).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should execute method and cache result on cache miss', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_OPTIONS_METADATA) {
            return { ttl: 300 };
          }
          if (key === CACHE_KEY_METADATA) {
            return 'test:key';
          }
          return undefined;
        });

      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ fresh: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual({ fresh: 'data' });
          expect(handler.handle).toHaveBeenCalled();
          // Cache set happens async in tap
          setTimeout(() => {
            expect(mockCacheService.set).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });

    it('should use sync mode with getOrSet to prevent stampede', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_OPTIONS_METADATA) {
            return { ttl: 300, sync: true };
          }
          if (key === CACHE_KEY_METADATA) {
            return 'test:key';
          }
          return undefined;
        });

      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.getOrSet.mockResolvedValue({ computed: 'value' });

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ fresh: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual({ computed: 'value' });
          expect(mockCacheService.getOrSet).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should respect condition option', (done) => {
      const condition = jest.fn().mockReturnValue(false);
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_OPTIONS_METADATA) {
            return { ttl: 300, condition };
          }
          if (key === CACHE_KEY_METADATA) {
            return 'test:key';
          }
          return undefined;
        });

      mockCacheService.get.mockResolvedValue(null);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockCacheService.set).not.toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });

    it('should respect unless option', (done) => {
      const unless = jest.fn().mockReturnValue(true);
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_OPTIONS_METADATA) {
            return { ttl: 300, unless };
          }
          if (key === CACHE_KEY_METADATA) {
            return 'test:key';
          }
          return undefined;
        });

      mockCacheService.get.mockResolvedValue(null);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockCacheService.set).not.toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });

    it('should cache with tags', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_OPTIONS_METADATA) {
            return { ttl: 300, tags: [CacheTag.FESTIVAL, CacheTag.TICKET] };
          }
          if (key === CACHE_KEY_METADATA) {
            return 'test:key';
          }
          return undefined;
        });

      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockCacheService.set).toHaveBeenCalledWith(
              expect.any(String),
              expect.any(Object),
              expect.objectContaining({
                tags: [CacheTag.FESTIVAL, CacheTag.TICKET],
              }),
            );
            done();
          }, 10);
        },
      });
    });
  });

  // ==========================================================================
  // @CacheEvict Tests
  // ==========================================================================

  describe('@CacheEvict decorator', () => {
    it('should evict cache by key after method execution', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_EVICT_METADATA) {
            return { key: 'evict:key' };
          }
          return undefined;
        });

      mockCacheService.delete.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockCacheService.delete).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });

    it('should evict cache by pattern', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_EVICT_METADATA) {
            return { pattern: 'user:*' };
          }
          return undefined;
        });

      mockCacheService.deletePattern.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockCacheService.deletePattern).toHaveBeenCalledWith('user:*');
            done();
          }, 10);
        },
      });
    });

    it('should evict cache by tags', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_EVICT_METADATA) {
            return { tags: [CacheTag.USER, CacheTag.SESSION] };
          }
          return undefined;
        });

      mockCacheService.invalidateByTag.mockResolvedValue(5);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockCacheService.invalidateByTag).toHaveBeenCalledWith(CacheTag.USER);
            expect(mockCacheService.invalidateByTag).toHaveBeenCalledWith(CacheTag.SESSION);
            done();
          }, 10);
        },
      });
    });

    it('should clear all entries when allEntries is true', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_EVICT_METADATA) {
            return { allEntries: true };
          }
          return undefined;
        });

      mockCacheService.clear.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockCacheService.clear).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });

    it('should evict before invocation when beforeInvocation is true', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_EVICT_METADATA) {
            return { key: 'evict:key', beforeInvocation: true };
          }
          return undefined;
        });

      mockCacheService.delete.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      // The eviction should happen before handle() is called
      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(mockCacheService.delete).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should respect condition option for eviction', (done) => {
      const condition = jest.fn().mockReturnValue(false);
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_EVICT_METADATA) {
            return { key: 'evict:key', condition };
          }
          return undefined;
        });

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockCacheService.delete).not.toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });
  });

  // ==========================================================================
  // @CachePut Tests
  // ==========================================================================

  describe('@CachePut decorator', () => {
    it('should always execute method and update cache', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_PUT_METADATA) {
            return { key: 'put:key', ttl: 300 };
          }
          return undefined;
        });

      mockCacheService.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ updated: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual({ updated: 'data' });
          expect(handler.handle).toHaveBeenCalled();
          setTimeout(() => {
            expect(mockCacheService.set).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });

    it('should respect condition option', (done) => {
      const condition = jest.fn().mockReturnValue(false);
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_PUT_METADATA) {
            return { key: 'put:key', ttl: 300, condition };
          }
          return undefined;
        });

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockCacheService.set).not.toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });

    it('should respect unless option', (done) => {
      const unless = jest.fn().mockReturnValue(true);
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_PUT_METADATA) {
            return { key: 'put:key', ttl: 300, unless };
          }
          return undefined;
        });

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockCacheService.set).not.toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });

    it('should cache with tags', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_PUT_METADATA) {
            return { key: 'put:key', ttl: 300, tags: [CacheTag.USER] };
          }
          return undefined;
        });

      mockCacheService.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockCacheService.set).toHaveBeenCalledWith(
              expect.any(String),
              expect.any(Object),
              expect.objectContaining({
                tags: [CacheTag.USER],
              }),
            );
            done();
          }, 10);
        },
      });
    });
  });

  // ==========================================================================
  // @InvalidateTags Tests
  // ==========================================================================

  describe('@InvalidateTags decorator', () => {
    it('should invalidate specified tags after method execution', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_INVALIDATE_TAGS_METADATA) {
            return [CacheTag.FESTIVAL, CacheTag.TICKET];
          }
          return undefined;
        });

      mockCacheService.invalidateByTag.mockResolvedValue(5);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockCacheService.invalidateByTag).toHaveBeenCalledWith(CacheTag.FESTIVAL);
            expect(mockCacheService.invalidateByTag).toHaveBeenCalledWith(CacheTag.TICKET);
            done();
          }, 10);
        },
      });
    });

    it('should not invalidate when tags array is empty', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_INVALIDATE_TAGS_METADATA) {
            return [];
          }
          return undefined;
        });

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockCacheService.invalidateByTag).not.toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });
  });

  // ==========================================================================
  // Cache Key Generation Tests
  // ==========================================================================

  describe('cache key generation', () => {
    it('should generate key from string template', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_OPTIONS_METADATA) {
            return { ttl: 300 };
          }
          if (key === CACHE_KEY_METADATA) {
            return 'users:${0}';
          }
          return undefined;
        });

      mockCacheService.get.mockResolvedValue(null);

      const context = createMockExecutionContext('UserController', 'getUser', ['user-123']);
      const handler = createMockCallHandler({ user: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(mockCacheService.get).toHaveBeenCalledWith('users:user-123');
          done();
        },
      });
    });

    it('should generate default key when no key specified', (done) => {
      mockReflector.get
        .mockImplementation((key: string) => {
          if (key === CACHE_OPTIONS_METADATA) {
            return { ttl: 300 };
          }
          return undefined;
        });

      mockCacheService.get.mockResolvedValue(null);

      const context = createMockExecutionContext('TestController', 'testMethod', []);
      const handler = createMockCallHandler({ data: 'test' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          // Default key should include class name, method name, and arg hash
          const calledKey = mockCacheService.get.mock.calls[0][0];
          expect(calledKey).toContain('testMethod');
          done();
        },
      });
    });
  });
});

// =============================================================================
// MultiLevelCacheInterceptor Tests
// =============================================================================

describe('MultiLevelCacheInterceptor', () => {
  let interceptor: MultiLevelCacheInterceptor;
  let cacheService: CacheService;
  let reflector: Reflector;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiLevelCacheInterceptor,
        { provide: CacheService, useValue: mockCacheService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    interceptor = module.get<MultiLevelCacheInterceptor>(MultiLevelCacheInterceptor);
    cacheService = module.get<CacheService>(CacheService);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });
  });

  describe('no multi-level decorator', () => {
    it('should pass through when no decorator present', (done) => {
      mockReflector.get.mockReturnValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual({ result: 'data' });
          done();
        },
      });
    });
  });

  describe('L1/L2 caching', () => {
    it('should check L1 cache first', (done) => {
      mockReflector.get.mockReturnValue({
        key: 'multi:key',
        l1: { ttl: 60 },
        l2: { ttl: 3600 },
      });

      // L2 cache service returns null, so L1 should be checked internally
      mockCacheService.get.mockResolvedValue(null);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ fresh: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual({ fresh: 'data' });
          done();
        },
      });
    });

    it('should populate L1 from L2 on L2 hit', (done) => {
      mockReflector.get.mockReturnValue({
        key: 'multi:key',
        l1: { ttl: 60 },
        l2: { ttl: 3600 },
      });

      mockCacheService.get.mockResolvedValue({ l2: 'data' });

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ fresh: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual({ l2: 'data' });
          done();
        },
      });
    });

    it('should set in both L1 and L2 on cache miss', (done) => {
      mockReflector.get.mockReturnValue({
        key: 'multi:key',
        l1: { ttl: 60 },
        l2: { ttl: 3600 },
      });

      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ fresh: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockCacheService.set).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });

    it('should respect L1 maxSize', (done) => {
      mockReflector.get.mockReturnValue({
        key: 'multi:key',
        l1: { ttl: 60, maxSize: 2 },
        l2: { ttl: 3600 },
      });

      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ data: 'value' });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          done();
        },
      });
    });
  });
});

// =============================================================================
// SWRCacheInterceptor Tests
// =============================================================================

describe('SWRCacheInterceptor', () => {
  let interceptor: SWRCacheInterceptor;
  let cacheService: CacheService;
  let reflector: Reflector;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SWRCacheInterceptor,
        { provide: CacheService, useValue: mockCacheService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    interceptor = module.get<SWRCacheInterceptor>(SWRCacheInterceptor);
    cacheService = module.get<CacheService>(CacheService);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });
  });

  describe('no SWR decorator', () => {
    it('should pass through when no decorator present', (done) => {
      mockReflector.get.mockReturnValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual({ result: 'data' });
          done();
        },
      });
    });
  });

  describe('stale-while-revalidate', () => {
    it('should return fresh data on cache miss', (done) => {
      mockReflector.get.mockReturnValue({
        key: 'swr:key',
        staleTime: 60,
        maxAge: 3600,
      });

      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ fresh: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual({ fresh: 'data' });
          done();
        },
      });
    });

    it('should return cached data when valid', (done) => {
      mockReflector.get.mockReturnValue({
        key: 'swr:key',
        staleTime: 60,
        maxAge: 3600,
      });

      mockCacheService.get
        .mockResolvedValueOnce({ cached: 'data' })
        .mockResolvedValueOnce({ timestamp: Date.now() - 30000 }); // Not stale

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ fresh: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual({ cached: 'data' });
          done();
        },
      });
    });

    it('should return stale data and refresh in background', (done) => {
      mockReflector.get.mockReturnValue({
        key: 'swr:key',
        staleTime: 60,
        maxAge: 3600,
      });

      mockCacheService.get
        .mockResolvedValueOnce({ stale: 'data' })
        .mockResolvedValueOnce({ timestamp: Date.now() - 120000 }); // Stale (>60s)

      mockCacheService.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ fresh: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          // Should return stale data immediately
          expect(value).toEqual({ stale: 'data' });
          done();
        },
      });
    });
  });
});

// =============================================================================
// BatchCacheInterceptor Tests
// =============================================================================

describe('BatchCacheInterceptor', () => {
  let interceptor: BatchCacheInterceptor;
  let cacheService: CacheService;
  let reflector: Reflector;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchCacheInterceptor,
        { provide: CacheService, useValue: mockCacheService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    interceptor = module.get<BatchCacheInterceptor>(BatchCacheInterceptor);
    cacheService = module.get<CacheService>(CacheService);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });
  });

  describe('no batch decorator', () => {
    it('should pass through when no decorator present', (done) => {
      mockReflector.get.mockReturnValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual({ result: 'data' });
          done();
        },
      });
    });
  });

  describe('non-array argument', () => {
    it('should pass through when first arg is not array', (done) => {
      mockReflector.get.mockReturnValue({
        keyPrefix: 'users',
        idExtractor: (item: any) => item.id,
        ttl: 300,
      });

      const context = createMockExecutionContext('Controller', 'method', ['not-array']);
      const handler = createMockCallHandler({ result: 'data' });

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual({ result: 'data' });
          done();
        },
      });
    });
  });

  describe('batch operations', () => {
    it('should return cached items without calling handler', (done) => {
      mockReflector.get.mockReturnValue({
        keyPrefix: 'users',
        idExtractor: (item: any) => item.id,
        ttl: 300,
      });

      mockCacheService.get
        .mockResolvedValueOnce({ id: '1', name: 'User 1' })
        .mockResolvedValueOnce({ id: '2', name: 'User 2' });

      const context = createMockExecutionContext('Controller', 'method', [['1', '2']]);
      const handler = createMockCallHandler([]);

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value).toEqual([
            { id: '1', name: 'User 1' },
            { id: '2', name: 'User 2' },
          ]);
          done();
        },
      });
    });

    it('should fetch and cache missing items', (done) => {
      mockReflector.get.mockReturnValue({
        keyPrefix: 'users',
        idExtractor: (item: any) => item.id,
        ttl: 300,
      });

      mockCacheService.get
        .mockResolvedValueOnce({ id: '1', name: 'User 1' })
        .mockResolvedValueOnce(null); // Missing

      mockCacheService.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext('Controller', 'method', [['1', '2']]);
      const handler = createMockCallHandler([{ id: '2', name: 'User 2' }]);

      interceptor.intercept(context, handler).subscribe({
        next: (value) => {
          expect(value.length).toBe(2);
          done();
        },
      });
    });
  });
});
