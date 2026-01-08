/**
 * Roles Guard Unit Tests
 *
 * Comprehensive tests for role-based access control guard including:
 * - Role verification
 * - No roles restriction
 * - User authentication status
 * - Multiple roles handling
 * - Reflector integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

// ============================================================================
// Mock Setup
// ============================================================================

const createMockExecutionContext = (
  user: any,
  handler?: () => void,
  controllerClass?: any
): ExecutionContext => {
  const mockRequest = { user };

  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue({}),
    }),
    getHandler: jest.fn().mockReturnValue(handler ?? jest.fn()),
    getClass: jest.fn().mockReturnValue(controllerClass ?? class TestController {}),
    getType: jest.fn().mockReturnValue('http'),
    getArgs: jest.fn().mockReturnValue([mockRequest, {}]),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  } as unknown as ExecutionContext;
};

describe('RolesGuard', () => {
  let guard: RolesGuard;
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
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
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

  describe('canActivate - no roles required', () => {
    it('should return true when no roles are required (undefined)', () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const user = { id: 'user-123', role: UserRole.USER };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when no roles are required (null)', () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);
      const user = { id: 'user-123', role: UserRole.USER };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when empty roles array (no roles match)', () => {
      // When @Roles() is used with empty array, some() returns false
      // as there are no roles to match against
      mockReflector.getAllAndOverride.mockReturnValue([]);
      const user = { id: 'user-123', role: UserRole.USER };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      // Empty array means no role matches, so returns false
      expect(result).toBe(false);
    });

    it('should allow unauthenticated users when no roles required', () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext(null);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('canActivate - roles required', () => {
    describe('single role', () => {
      it('should return true when user has required role', () => {
        mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
        const user = { id: 'user-123', role: UserRole.ADMIN };
        const context = createMockExecutionContext(user);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should return false when user does not have required role', () => {
        mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
        const user = { id: 'user-123', role: UserRole.USER };
        const context = createMockExecutionContext(user);

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });
    });

    describe('multiple roles', () => {
      it('should return true when user has one of the required roles', () => {
        mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.ORGANIZER]);
        const user = { id: 'user-123', role: UserRole.ORGANIZER };
        const context = createMockExecutionContext(user);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should return true when user is ADMIN and multiple roles allowed', () => {
        mockReflector.getAllAndOverride.mockReturnValue([
          UserRole.ADMIN,
          UserRole.ORGANIZER,
          UserRole.STAFF,
        ]);
        const user = { id: 'user-123', role: UserRole.ADMIN };
        const context = createMockExecutionContext(user);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should return false when user role is not in required roles', () => {
        mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.ORGANIZER]);
        const user = { id: 'user-123', role: UserRole.USER };
        const context = createMockExecutionContext(user);

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });

      it('should return false when user is STAFF but only ADMIN/ORGANIZER allowed', () => {
        mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.ORGANIZER]);
        const user = { id: 'user-123', role: UserRole.STAFF };
        const context = createMockExecutionContext(user);

        const result = guard.canActivate(context);

        expect(result).toBe(false);
      });
    });
  });

  describe('canActivate - user authentication', () => {
    it('should return false when user is null and roles required', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext(null);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user is undefined and roles required', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when request has no user property and roles required', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const mockRequest = {};
      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn().mockReturnValue(jest.fn()),
        getClass: jest.fn().mockReturnValue(class {}),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });

  describe('canActivate - all roles', () => {
    it('should allow ADMIN role access when required', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const user = { id: 'user-123', role: UserRole.ADMIN };
      const context = createMockExecutionContext(user);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow ORGANIZER role access when required', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ORGANIZER]);
      const user = { id: 'user-123', role: UserRole.ORGANIZER };
      const context = createMockExecutionContext(user);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow STAFF role access when required', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.STAFF]);
      const user = { id: 'user-123', role: UserRole.STAFF };
      const context = createMockExecutionContext(user);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow CASHIER role access when required', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.CASHIER]);
      const user = { id: 'user-123', role: UserRole.CASHIER };
      const context = createMockExecutionContext(user);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow SECURITY role access when required', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.SECURITY]);
      const user = { id: 'user-123', role: UserRole.SECURITY };
      const context = createMockExecutionContext(user);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow USER role access when required', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.USER]);
      const user = { id: 'user-123', role: UserRole.USER };
      const context = createMockExecutionContext(user);

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('reflector integration', () => {
    it('should call getAllAndOverride with ROLES_KEY', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const user = { id: 'user-123', role: UserRole.ADMIN };
      const context = createMockExecutionContext(user);

      guard.canActivate(context);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
    });

    it('should pass handler and class to reflector', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const handler = jest.fn();
      class TestController {}
      const user = { id: 'user-123', role: UserRole.ADMIN };
      const context = createMockExecutionContext(user, handler, TestController);

      guard.canActivate(context);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        handler,
        TestController,
      ]);
    });

    it('should check class-level decorator when handler has no roles', () => {
      // First call checks handler, returns undefined
      // getAllAndOverride checks both at once
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const user = { id: 'user-123', role: UserRole.ADMIN };
      const context = createMockExecutionContext(user);

      guard.canActivate(context);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle user with empty role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const user = { id: 'user-123', role: '' };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle user with invalid role string', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const user = { id: 'user-123', role: 'INVALID_ROLE' };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle user object without role property', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const user = { id: 'user-123', email: 'test@example.com' };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle user with null role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const user = { id: 'user-123', role: null };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle case sensitivity correctly', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const user = { id: 'user-123', role: 'admin' }; // lowercase
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(false); // Should fail because 'admin' !== 'ADMIN'
    });
  });

  describe('common authorization scenarios', () => {
    it('should allow admin access to admin-only endpoint', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const admin = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@example.com' };
      const context = createMockExecutionContext(admin);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny regular user access to admin-only endpoint', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const user = { id: 'user-123', role: UserRole.USER, email: 'user@example.com' };
      const context = createMockExecutionContext(user);

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should allow organizer access to organizer/admin endpoint', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.ORGANIZER]);
      const organizer = { id: 'org-123', role: UserRole.ORGANIZER };
      const context = createMockExecutionContext(organizer);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow staff access to staff/cashier/security endpoint', () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        UserRole.STAFF,
        UserRole.CASHIER,
        UserRole.SECURITY,
      ]);
      const staff = { id: 'staff-123', role: UserRole.STAFF };
      const context = createMockExecutionContext(staff);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny cashier access to security-only endpoint', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.SECURITY]);
      const cashier = { id: 'cashier-123', role: UserRole.CASHIER };
      const context = createMockExecutionContext(cashier);

      expect(guard.canActivate(context)).toBe(false);
    });
  });
});
