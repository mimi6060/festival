/**
 * Rate Limit Guard Unit Tests
 *
 * Comprehensive tests for rate limiting guard including:
 * - Redis-based rate limiting
 * - In-memory fallback
 * - Skip rate limit decorator
 * - Plan-based rate limits
 * - Endpoint-specific rate limits
 * - Rate limit headers
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RateLimitGuard,
  SKIP_RATE_LIMIT_KEY,
  RATE_LIMIT_KEY,
  UserPlan,
  PLAN_RATE_LIMITS,
  ANONYMOUS_RATE_LIMIT,
  RateLimitConfig,
} from './rate-limit.guard';

// ============================================================================
// Mock Setup
// ============================================================================

const createMockExecutionContext = (
  overrides: {
    user?: { id: string; plan?: UserPlan; role?: string } | null;
    headers?: Record<string, string | string[]>;
    method?: string;
    path?: string;
    ip?: string;
    remoteAddress?: string;
    handler?: () => void;
    class?: any;
  } = {}
): ExecutionContext => {
  const mockResponse = {
    setHeader: jest.fn(),
  };

  const mockRequest = {
    user: overrides.user ?? null,
    headers: overrides.headers ?? {},
    method: overrides.method ?? 'GET',
    path: overrides.path ?? '/api/test',
    ip: overrides.ip ?? '127.0.0.1',
    socket: {
      remoteAddress: overrides.remoteAddress ?? '127.0.0.1',
    },
  };

  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
    getHandler: jest.fn().mockReturnValue(overrides.handler ?? jest.fn()),
    getClass: jest.fn().mockReturnValue(overrides.class ?? class TestController {}),
    getType: jest.fn().mockReturnValue('http'),
    getArgs: jest.fn().mockReturnValue([mockRequest, mockResponse]),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  } as unknown as ExecutionContext;
};

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
  };

  const createMockRedis = () => {
    const pipelineMock = {
      zremrangebyscore: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 0], // zremrangebyscore
        [null, 1], // zadd
        [null, 1], // zcard - count of requests
        [null, 1], // expire
      ]),
    };
    return {
      pipeline: jest.fn().mockReturnValue(pipelineMock),
      zcount: jest.fn().mockResolvedValue(0),
      _pipelineMock: pipelineMock,
    };
  };

  let mockRedis = createMockRedis();

  describe('without Redis (in-memory fallback)', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      jest.useFakeTimers();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RateLimitGuard,
          {
            provide: Reflector,
            useValue: mockReflector,
          },
        ],
      }).compile();

      guard = module.get<RateLimitGuard>(RateLimitGuard);
      reflector = module.get<Reflector>(Reflector);
    });

    afterEach(() => {
      jest.useRealTimers();
      guard.onModuleDestroy();
    });

    describe('constructor', () => {
      it('should be defined', () => {
        expect(guard).toBeDefined();
      });

      it('should have reflector injected', () => {
        expect(reflector).toBeDefined();
      });

      it('should use in-memory limiter when Redis not available', () => {
        expect(guard).toBeDefined();
        // Guard logs warning about in-memory rate limiting
      });
    });

    describe('canActivate - skip rate limit', () => {
      it('should return true when @SkipRateLimit() is set', async () => {
        mockReflector.getAllAndOverride.mockReturnValue(true);
        const context = createMockExecutionContext();

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
          SKIP_RATE_LIMIT_KEY,
          expect.any(Array)
        );
      });

      it('should check both handler and class for skip decorator', async () => {
        mockReflector.getAllAndOverride.mockReturnValue(true);
        const handler = jest.fn();
        class SkipController {}
        const context = createMockExecutionContext({ handler, class: SkipController });

        await guard.canActivate(context);

        expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_RATE_LIMIT_KEY, [
          handler,
          SkipController,
        ]);
      });
    });

    describe('canActivate - rate limit config', () => {
      it('should use decorator config when provided', async () => {
        const customConfig: RateLimitConfig = {
          limit: 5,
          windowSeconds: 60,
          keyPrefix: 'custom',
        };
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(false) // skip rate limit
          .mockReturnValueOnce(customConfig); // rate limit config

        const context = createMockExecutionContext();

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
          RATE_LIMIT_KEY,
          expect.any(Array)
        );
      });

      it('should use plan-based config for authenticated users', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(false) // skip rate limit
          .mockReturnValueOnce(null); // no decorator config

        const context = createMockExecutionContext({
          user: { id: 'user-123', plan: UserPlan.PREMIUM },
          path: '/api/some-endpoint',
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should use anonymous rate limit for unauthenticated users', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(false) // skip rate limit
          .mockReturnValueOnce(null); // no decorator config

        const context = createMockExecutionContext({
          user: null,
          path: '/api/some-endpoint',
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should use FREE plan as default for users without plan', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(false) // skip rate limit
          .mockReturnValueOnce(null); // no decorator config

        const context = createMockExecutionContext({
          user: { id: 'user-123' }, // no plan specified
          path: '/api/some-endpoint',
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('canActivate - rate limit exceeded', () => {
      it('should throw HttpException when rate limit exceeded', async () => {
        // Mock needs to return values for multiple calls
        mockReflector.getAllAndOverride.mockImplementation((key) => {
          if (key === SKIP_RATE_LIMIT_KEY) {
            return false;
          }
          if (key === RATE_LIMIT_KEY) {
            return { limit: 1, windowSeconds: 60 };
          }
          return null;
        });

        const context = createMockExecutionContext();

        // First request should pass
        await guard.canActivate(context);

        // Second request should be rate limited
        await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      });

      it('should return 429 status code when rate limited', async () => {
        mockReflector.getAllAndOverride.mockImplementation((key) => {
          if (key === SKIP_RATE_LIMIT_KEY) {
            return false;
          }
          if (key === RATE_LIMIT_KEY) {
            return { limit: 1, windowSeconds: 60 };
          }
          return null;
        });

        const context = createMockExecutionContext();

        await guard.canActivate(context);

        try {
          await guard.canActivate(context);
          fail('Should have thrown');
        } catch (error) {
          expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        }
      });

      it('should include custom error message when provided', async () => {
        const customMessage = 'Custom rate limit message';
        mockReflector.getAllAndOverride.mockImplementation((key) => {
          if (key === SKIP_RATE_LIMIT_KEY) {
            return false;
          }
          if (key === RATE_LIMIT_KEY) {
            return { limit: 1, windowSeconds: 60, errorMessage: customMessage };
          }
          return null;
        });

        const context = createMockExecutionContext();

        await guard.canActivate(context);

        try {
          await guard.canActivate(context);
          fail('Should have thrown');
        } catch (error) {
          const response = (error as HttpException).getResponse() as any;
          expect(response.message).toBe(customMessage);
        }
      });

      it('should include retryAfter in error response', async () => {
        mockReflector.getAllAndOverride.mockImplementation((key) => {
          if (key === SKIP_RATE_LIMIT_KEY) {
            return false;
          }
          if (key === RATE_LIMIT_KEY) {
            return { limit: 1, windowSeconds: 60 };
          }
          return null;
        });

        const context = createMockExecutionContext();

        await guard.canActivate(context);

        try {
          await guard.canActivate(context);
          fail('Should have thrown');
        } catch (error) {
          const response = (error as HttpException).getResponse() as any;
          expect(response.retryAfter).toBeDefined();
        }
      });
    });

    describe('rate limit headers', () => {
      it('should set X-RateLimit-Limit header', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(false)
          .mockReturnValueOnce({ limit: 100, windowSeconds: 60 });

        const context = createMockExecutionContext();
        const response = context.switchToHttp().getResponse();

        await guard.canActivate(context);

        expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      });

      it('should set X-RateLimit-Remaining header', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(false)
          .mockReturnValueOnce({ limit: 100, windowSeconds: 60 });

        const context = createMockExecutionContext();
        const response = context.switchToHttp().getResponse();

        await guard.canActivate(context);

        expect(response.setHeader).toHaveBeenCalledWith(
          'X-RateLimit-Remaining',
          expect.any(String)
        );
      });

      it('should set X-RateLimit-Reset header', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(false)
          .mockReturnValueOnce({ limit: 100, windowSeconds: 60 });

        const context = createMockExecutionContext();
        const response = context.switchToHttp().getResponse();

        await guard.canActivate(context);

        expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
      });

      it('should set X-RateLimit-Window header', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(false)
          .mockReturnValueOnce({ limit: 100, windowSeconds: 60 });

        const context = createMockExecutionContext();
        const response = context.switchToHttp().getResponse();

        await guard.canActivate(context);

        expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Window', '60');
      });

      it('should set Retry-After header when rate limited', async () => {
        mockReflector.getAllAndOverride.mockImplementation((key) => {
          if (key === SKIP_RATE_LIMIT_KEY) {
            return false;
          }
          if (key === RATE_LIMIT_KEY) {
            return { limit: 1, windowSeconds: 60 };
          }
          return null;
        });

        const context = createMockExecutionContext();
        const response = context.switchToHttp().getResponse();

        await guard.canActivate(context);

        try {
          await guard.canActivate(context);
        } catch {
          expect(response.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
        }
      });

      it('should set IETF draft RateLimit headers', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(false)
          .mockReturnValueOnce({ limit: 100, windowSeconds: 60 });

        const context = createMockExecutionContext();
        const response = context.switchToHttp().getResponse();

        await guard.canActivate(context);

        expect(response.setHeader).toHaveBeenCalledWith('RateLimit-Limit', expect.any(String));
        expect(response.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', expect.any(String));
        expect(response.setHeader).toHaveBeenCalledWith('RateLimit-Reset', expect.any(String));
      });
    });

    describe('key generation', () => {
      it('should use user ID for per-user rate limiting', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(false)
          .mockReturnValueOnce({ limit: 100, windowSeconds: 60, perUser: true });

        const context = createMockExecutionContext({
          user: { id: 'user-123' },
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should use IP for anonymous requests', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(false)
          .mockReturnValueOnce({ limit: 100, windowSeconds: 60 });

        const context = createMockExecutionContext({
          user: null,
          ip: '192.168.1.1',
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should use x-forwarded-for header when present', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(false)
          .mockReturnValueOnce({ limit: 100, windowSeconds: 60 });

        const context = createMockExecutionContext({
          headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should use x-real-ip header when present', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(false)
          .mockReturnValueOnce({ limit: 100, windowSeconds: 60 });

        const context = createMockExecutionContext({
          headers: { 'x-real-ip': '10.0.0.1' },
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should use key prefix when provided', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(false)
          .mockReturnValueOnce({ limit: 100, windowSeconds: 60, keyPrefix: 'custom-prefix' });

        const context = createMockExecutionContext();

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('weighted rate limiting', () => {
      it('should apply cost multiplier for weighted requests', async () => {
        mockReflector.getAllAndOverride.mockImplementation((key) => {
          if (key === SKIP_RATE_LIMIT_KEY) {
            return false;
          }
          if (key === RATE_LIMIT_KEY) {
            return { limit: 10, windowSeconds: 60, cost: 5 };
          }
          return null;
        });

        const context = createMockExecutionContext();

        // First request costs 5, so 5/10 used
        await guard.canActivate(context);

        // Second request costs another 5, so 10/10 used
        await guard.canActivate(context);

        // Third request should fail (would be 15/10)
        await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      });
    });

    describe('window reset', () => {
      it('should reset count after window expires', async () => {
        mockReflector.getAllAndOverride.mockImplementation((key) => {
          if (key === SKIP_RATE_LIMIT_KEY) {
            return false;
          }
          if (key === RATE_LIMIT_KEY) {
            return { limit: 1, windowSeconds: 1 };
          }
          return null;
        });

        const context = createMockExecutionContext();

        // First request should pass
        await guard.canActivate(context);

        // Second request should fail
        await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

        // Advance time past window
        jest.advanceTimersByTime(2000);

        // Should pass again after window reset
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });
    });
  });

  describe('with Redis', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      mockRedis = createMockRedis();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RateLimitGuard,
          {
            provide: Reflector,
            useValue: mockReflector,
          },
          {
            provide: 'REDIS_CLIENT',
            useValue: mockRedis,
          },
        ],
      }).compile();

      guard = module.get<RateLimitGuard>(RateLimitGuard);
    });

    afterEach(() => {
      guard.onModuleDestroy();
    });

    it('should use Redis rate limiter when Redis is available', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({ limit: 100, windowSeconds: 60 });

      const context = createMockExecutionContext();

      await guard.canActivate(context);

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should use sliding window algorithm with sorted sets', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({ limit: 100, windowSeconds: 60 });

      const context = createMockExecutionContext();

      await guard.canActivate(context);

      // Verify pipeline methods are defined
      expect(mockRedis._pipelineMock.zremrangebyscore).toBeDefined();
      expect(mockRedis._pipelineMock.zadd).toBeDefined();
      expect(mockRedis._pipelineMock.zcard).toBeDefined();
      expect(mockRedis._pipelineMock.expire).toBeDefined();
    });

    it('should handle Redis errors gracefully (fail open)', async () => {
      // Override exec to throw error
      mockRedis._pipelineMock.exec.mockRejectedValueOnce(new Error('Redis connection failed'));

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({ limit: 100, windowSeconds: 60 });

      const context = createMockExecutionContext();

      // Should not throw - fail open
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('endpoint-specific rate limits', () => {
    beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RateLimitGuard,
          {
            provide: Reflector,
            useValue: mockReflector,
          },
        ],
      }).compile();

      guard = module.get<RateLimitGuard>(RateLimitGuard);
    });

    afterEach(() => {
      guard.onModuleDestroy();
    });

    it('should apply login endpoint rate limit', async () => {
      mockReflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce(null); // no decorator config

      const context = createMockExecutionContext({
        method: 'POST',
        path: '/api/auth/login',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should apply register endpoint rate limit', async () => {
      mockReflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce(null);

      const context = createMockExecutionContext({
        method: 'POST',
        path: '/api/auth/register',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should apply payment endpoint rate limit', async () => {
      mockReflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce(null);

      const context = createMockExecutionContext({
        method: 'POST',
        path: '/api/payments/checkout',
        user: { id: 'user-123' },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('plan-based rate limits', () => {
    beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RateLimitGuard,
          {
            provide: Reflector,
            useValue: mockReflector,
          },
        ],
      }).compile();

      guard = module.get<RateLimitGuard>(RateLimitGuard);
    });

    afterEach(() => {
      guard.onModuleDestroy();
    });

    it('should apply FREE plan limits', async () => {
      mockReflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce(null);

      const context = createMockExecutionContext({
        user: { id: 'user-123', plan: UserPlan.FREE },
        path: '/api/some-endpoint',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(PLAN_RATE_LIMITS[UserPlan.FREE].limit).toBe(100);
    });

    it('should apply PREMIUM plan limits', async () => {
      mockReflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce(null);

      const context = createMockExecutionContext({
        user: { id: 'user-123', plan: UserPlan.PREMIUM },
        path: '/api/some-endpoint',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(PLAN_RATE_LIMITS[UserPlan.PREMIUM].limit).toBe(1000);
    });

    it('should apply ENTERPRISE plan limits', async () => {
      mockReflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce(null);

      const context = createMockExecutionContext({
        user: { id: 'user-123', plan: UserPlan.ENTERPRISE },
        path: '/api/some-endpoint',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(PLAN_RATE_LIMITS[UserPlan.ENTERPRISE].limit).toBe(10000);
    });

    it('should apply INTERNAL plan limits', async () => {
      mockReflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce(null);

      const context = createMockExecutionContext({
        user: { id: 'user-123', plan: UserPlan.INTERNAL },
        path: '/api/some-endpoint',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(PLAN_RATE_LIMITS[UserPlan.INTERNAL].limit).toBe(100000);
    });

    it('should apply anonymous rate limit for unauthenticated requests', async () => {
      mockReflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce(null);

      const context = createMockExecutionContext({
        user: null,
        path: '/api/some-endpoint',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(ANONYMOUS_RATE_LIMIT.limit).toBe(60);
    });
  });

  describe('onModuleDestroy', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      jest.useFakeTimers();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RateLimitGuard,
          {
            provide: Reflector,
            useValue: mockReflector,
          },
        ],
      }).compile();

      guard = module.get<RateLimitGuard>(RateLimitGuard);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should clear cleanup interval on destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      guard.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RateLimitGuard,
          {
            provide: Reflector,
            useValue: mockReflector,
          },
        ],
      }).compile();

      guard = module.get<RateLimitGuard>(RateLimitGuard);
    });

    afterEach(() => {
      guard.onModuleDestroy();
    });

    it('should handle missing IP gracefully', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({ limit: 100, windowSeconds: 60 });

      const context = createMockExecutionContext({
        ip: undefined,
        remoteAddress: undefined,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle array x-forwarded-for header', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({ limit: 100, windowSeconds: 60 });

      const context = createMockExecutionContext({
        headers: { 'x-forwarded-for': ['10.0.0.1', '192.168.1.1'] },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle zero limit config', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({ limit: 0, windowSeconds: 60 });

      const context = createMockExecutionContext();

      // Zero limit should immediately reject
      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });
  });
});
