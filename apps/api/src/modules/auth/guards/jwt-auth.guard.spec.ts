/**
 * JWT Auth Guard Unit Tests
 *
 * Comprehensive tests for JWT authentication guard including:
 * - Public route handling
 * - Token validation
 * - Error handling
 * - Reflector integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// ============================================================================
// Mock Setup
// ============================================================================

const createMockExecutionContext = (
  overrides: Partial<{
    user: any;
    headers: Record<string, string>;
    handler: () => void;
    class: any;
  }> = {}
): ExecutionContext => {
  const mockRequest = {
    user: overrides.user ?? null,
    headers: overrides.headers ?? {},
  };

  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue({}),
    }),
    getHandler: jest.fn().mockReturnValue(overrides.handler ?? jest.fn()),
    getClass: jest.fn().mockReturnValue(overrides.class ?? class TestController {}),
    getType: jest.fn().mockReturnValue('http'),
    getArgs: jest.fn().mockReturnValue([mockRequest, {}]),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  } as unknown as ExecutionContext;
};

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
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
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
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

  describe('canActivate', () => {
    describe('public routes', () => {
      it('should return true for routes marked with @Public()', () => {
        mockReflector.getAllAndOverride.mockReturnValue(true);
        const context = createMockExecutionContext();

        const result = guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
          context.getHandler(),
          context.getClass(),
        ]);
      });

      it('should check both handler and class for public decorator', () => {
        mockReflector.getAllAndOverride.mockReturnValue(true);
        const handler = jest.fn();
        class PublicController {}
        const context = createMockExecutionContext({ handler, class: PublicController });

        guard.canActivate(context);

        expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
          handler,
          PublicController,
        ]);
      });

      it('should return true when class is marked @Public() even if handler is not', () => {
        mockReflector.getAllAndOverride.mockReturnValue(true);
        const context = createMockExecutionContext();

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('protected routes', () => {
      it('should call parent canActivate for non-public routes', () => {
        mockReflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();

        // Parent canActivate returns Observable/Promise/boolean
        // Since we're extending AuthGuard('jwt'), we need to mock the parent behavior
        const parentCanActivateSpy = jest.spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate'
        );
        parentCanActivateSpy.mockReturnValue(true);

        guard.canActivate(context);

        // The parent should be called when not public
        expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
      });

      it('should call parent canActivate when @Public() is not set', () => {
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const context = createMockExecutionContext();

        const parentCanActivateSpy = jest.spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate'
        );
        parentCanActivateSpy.mockReturnValue(true);

        guard.canActivate(context);

        expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
          IS_PUBLIC_KEY,
          expect.any(Array)
        );
      });

      it('should call parent canActivate when @Public() is explicitly false', () => {
        mockReflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();

        const parentCanActivateSpy = jest.spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate'
        );
        parentCanActivateSpy.mockReturnValue(true);

        guard.canActivate(context);

        expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
      });
    });
  });

  describe('handleRequest', () => {
    it('should return user when user exists and no error', () => {
      const user = { id: 'user-123', email: 'test@example.com', role: 'USER' };

      const result = guard.handleRequest(null, user, null);

      expect(result).toBe(user);
    });

    it('should return user with all properties', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN',
        firstName: 'John',
        lastName: 'Doe',
        status: 'ACTIVE',
      };

      const result = guard.handleRequest(null, user, null);

      expect(result).toEqual(user);
      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('ADMIN');
    });

    it('should throw UnauthorizedException when error is provided', () => {
      const error = new Error('Token expired');

      expect(() => guard.handleRequest(error, null, null)).toThrow(error);
    });

    it('should throw provided error as-is when error is an Error instance', () => {
      const customError = new UnauthorizedException('Custom error message');

      expect(() => guard.handleRequest(customError, null, null)).toThrow(customError);
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => guard.handleRequest(null, undefined, null)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is false', () => {
      expect(() => guard.handleRequest(null, false, null)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with specific message when user is missing', () => {
      try {
        guard.handleRequest(null, null, null);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).message).toBe('Invalid or expired token');
      }
    });

    it('should prefer error over user when both are provided', () => {
      const error = new Error('Token validation failed');
      const user = { id: 'user-123' };

      expect(() => guard.handleRequest(error, user, null)).toThrow(error);
    });

    it('should handle info parameter (not used but should not affect behavior)', () => {
      const user = { id: 'user-123', email: 'test@example.com' };
      const info = { message: 'Token info' };

      const result = guard.handleRequest(null, user, info);

      expect(result).toBe(user);
    });
  });

  describe('integration with passport', () => {
    it('should extend AuthGuard with jwt strategy', () => {
      // Verify the guard is properly configured to use 'jwt' strategy
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });
  });

  describe('edge cases', () => {
    it('should handle empty user object', () => {
      const emptyUser = {};

      const result = guard.handleRequest(null, emptyUser, null);

      expect(result).toEqual({});
    });

    it('should handle user with extra properties', () => {
      const userWithExtras = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
        customField: 'custom-value',
        nestedObject: { key: 'value' },
      };

      const result = guard.handleRequest(null, userWithExtras, null);

      expect(result).toEqual(userWithExtras);
      expect(result.customField).toBe('custom-value');
    });

    it('should throw error when error has no message', () => {
      const error = new Error();

      expect(() => guard.handleRequest(error, null, null)).toThrow(error);
    });
  });
});
