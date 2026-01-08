/**
 * Auth Decorators Unit Tests
 *
 * Comprehensive tests for authentication decorators including:
 * - @Public() decorator
 * - @Roles() decorator
 * - @CurrentUser() decorator
 */

/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unsafe-function-type */

import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import { IS_PUBLIC_KEY, Public } from './public.decorator';
import { ROLES_KEY, Roles } from './roles.decorator';
import { CurrentUser } from './current-user.decorator';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper to get param decorator factory for testing
 */
function getParamDecoratorFactory(decorator: Function) {
  class TestController {
    testMethod(@decorator() _value: unknown) {
      // Empty method for decorator testing
    }
  }

  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'testMethod');
  const key = Object.keys(metadata)[0];
  return metadata[key].factory;
}

/**
 * Create mock execution context for param decorator tests
 */
function createMockExecutionContext(user: any): ExecutionContext {
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user }),
      getResponse: jest.fn().mockReturnValue({}),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
    getType: jest.fn().mockReturnValue('http'),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  } as unknown as ExecutionContext;
}

// ============================================================================
// @Public() Decorator Tests
// ============================================================================

describe('@Public() Decorator', () => {
  describe('metadata', () => {
    it('should set IS_PUBLIC_KEY metadata to true', () => {
      @Public()
      class TestController {}

      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, TestController);
      expect(metadata).toBe(true);
    });

    it('should export IS_PUBLIC_KEY constant', () => {
      expect(IS_PUBLIC_KEY).toBe('isPublic');
    });

    it('should work as method decorator', () => {
      class TestController {
        @Public()
        publicMethod() {}
      }

      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, TestController.prototype.publicMethod);
      expect(metadata).toBe(true);
    });

    it('should work as class decorator', () => {
      @Public()
      class PublicController {}

      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, PublicController);
      expect(metadata).toBe(true);
    });

    it('should not set metadata on non-decorated methods', () => {
      class TestController {
        @Public()
        publicMethod() {}

        privateMethod() {}
      }

      const publicMetadata = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        TestController.prototype.publicMethod
      );
      const privateMetadata = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        TestController.prototype.privateMethod
      );

      expect(publicMetadata).toBe(true);
      expect(privateMetadata).toBeUndefined();
    });
  });

  describe('usage patterns', () => {
    it('should be usable for health check endpoints', () => {
      class HealthController {
        @Public()
        check() {
          return { status: 'ok' };
        }
      }

      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, HealthController.prototype.check);
      expect(metadata).toBe(true);
    });

    it('should be usable for webhook endpoints', () => {
      class WebhookController {
        @Public()
        stripeWebhook() {}
      }

      const metadata = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        WebhookController.prototype.stripeWebhook
      );
      expect(metadata).toBe(true);
    });

    it('should be usable for OAuth callback endpoints', () => {
      class AuthController {
        @Public()
        googleCallback() {}

        @Public()
        githubCallback() {}
      }

      expect(Reflect.getMetadata(IS_PUBLIC_KEY, AuthController.prototype.googleCallback)).toBe(
        true
      );
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, AuthController.prototype.githubCallback)).toBe(
        true
      );
    });
  });
});

// ============================================================================
// @Roles() Decorator Tests
// ============================================================================

describe('@Roles() Decorator', () => {
  describe('metadata', () => {
    it('should set ROLES_KEY metadata with provided roles', () => {
      class TestController {
        @Roles(UserRole.ADMIN)
        adminMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.adminMethod);
      expect(metadata).toEqual([UserRole.ADMIN]);
    });

    it('should export ROLES_KEY constant', () => {
      expect(ROLES_KEY).toBe('roles');
    });

    it('should accept multiple roles', () => {
      class TestController {
        @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
        managementMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.managementMethod);
      expect(metadata).toEqual([UserRole.ADMIN, UserRole.ORGANIZER]);
    });

    it('should accept all UserRole enum values', () => {
      class TestController {
        @Roles(
          UserRole.ADMIN,
          UserRole.ORGANIZER,
          UserRole.STAFF,
          UserRole.CASHIER,
          UserRole.SECURITY,
          UserRole.USER
        )
        allRolesMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.allRolesMethod);
      expect(metadata).toHaveLength(6);
      expect(metadata).toContain(UserRole.ADMIN);
      expect(metadata).toContain(UserRole.ORGANIZER);
      expect(metadata).toContain(UserRole.STAFF);
      expect(metadata).toContain(UserRole.CASHIER);
      expect(metadata).toContain(UserRole.SECURITY);
      expect(metadata).toContain(UserRole.USER);
    });

    it('should work as class decorator', () => {
      @Roles(UserRole.ADMIN)
      class AdminController {}

      const metadata = Reflect.getMetadata(ROLES_KEY, AdminController);
      expect(metadata).toEqual([UserRole.ADMIN]);
    });

    it('should accept empty roles array', () => {
      class TestController {
        @Roles()
        noRolesMethod() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.noRolesMethod);
      expect(metadata).toEqual([]);
    });

    it('should not set metadata on non-decorated methods', () => {
      class TestController {
        @Roles(UserRole.ADMIN)
        adminMethod() {}

        publicMethod() {}
      }

      const adminMetadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.adminMethod);
      const publicMetadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.publicMethod);

      expect(adminMetadata).toEqual([UserRole.ADMIN]);
      expect(publicMetadata).toBeUndefined();
    });
  });

  describe('usage patterns', () => {
    it('should support admin-only endpoints', () => {
      class UsersController {
        @Roles(UserRole.ADMIN)
        deleteUser() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, UsersController.prototype.deleteUser);
      expect(metadata).toEqual([UserRole.ADMIN]);
    });

    it('should support organizer management endpoints', () => {
      class FestivalsController {
        @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
        createFestival() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, FestivalsController.prototype.createFestival);
      expect(metadata).toContain(UserRole.ADMIN);
      expect(metadata).toContain(UserRole.ORGANIZER);
    });

    it('should support staff operation endpoints', () => {
      class TicketsController {
        @Roles(UserRole.STAFF, UserRole.SECURITY)
        scanTicket() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TicketsController.prototype.scanTicket);
      expect(metadata).toContain(UserRole.STAFF);
      expect(metadata).toContain(UserRole.SECURITY);
    });

    it('should support cashier payment endpoints', () => {
      class CashlessController {
        @Roles(UserRole.CASHIER, UserRole.STAFF)
        processPayment() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, CashlessController.prototype.processPayment);
      expect(metadata).toContain(UserRole.CASHIER);
      expect(metadata).toContain(UserRole.STAFF);
    });

    it('should support security access control endpoints', () => {
      class ZonesController {
        @Roles(UserRole.SECURITY, UserRole.STAFF)
        checkAccess() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, ZonesController.prototype.checkAccess);
      expect(metadata).toContain(UserRole.SECURITY);
      expect(metadata).toContain(UserRole.STAFF);
    });
  });

  describe('role combinations', () => {
    it('should support ADMIN + ORGANIZER combination', () => {
      class TestController {
        @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
        method() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.method);
      expect(metadata).toHaveLength(2);
    });

    it('should support STAFF + CASHIER + SECURITY combination', () => {
      class TestController {
        @Roles(UserRole.STAFF, UserRole.CASHIER, UserRole.SECURITY)
        method() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.method);
      expect(metadata).toHaveLength(3);
    });

    it('should support single USER role', () => {
      class TestController {
        @Roles(UserRole.USER)
        method() {}
      }

      const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.method);
      expect(metadata).toEqual([UserRole.USER]);
    });
  });
});

// ============================================================================
// @CurrentUser() Decorator Tests
// ============================================================================

describe('@CurrentUser() Decorator', () => {
  describe('basic functionality', () => {
    it('should return the full user object when no data key provided', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        firstName: 'John',
        lastName: 'Doe',
      };
      const context = createMockExecutionContext(user);

      const factory = getParamDecoratorFactory(CurrentUser);
      const result = factory(undefined, context);

      expect(result).toEqual(user);
    });

    it('should return null when user is not present', () => {
      const context = createMockExecutionContext(null);

      const factory = getParamDecoratorFactory(CurrentUser);
      const result = factory(undefined, context);

      expect(result).toBeNull();
    });

    it('should return null when user is undefined', () => {
      const context = createMockExecutionContext(undefined);

      const factory = getParamDecoratorFactory(CurrentUser);
      const result = factory(undefined, context);

      expect(result).toBeNull();
    });
  });

  describe('property extraction', () => {
    const testUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: UserRole.ADMIN,
      firstName: 'John',
      lastName: 'Doe',
      status: 'ACTIVE',
    };

    it('should extract id property', () => {
      const context = createMockExecutionContext(testUser);

      const factory = getParamDecoratorFactory(CurrentUser);
      const result = factory('id', context);

      expect(result).toBe('user-123');
    });

    it('should extract email property', () => {
      const context = createMockExecutionContext(testUser);

      const factory = getParamDecoratorFactory(CurrentUser);
      const result = factory('email', context);

      expect(result).toBe('test@example.com');
    });

    it('should extract role property', () => {
      const context = createMockExecutionContext(testUser);

      const factory = getParamDecoratorFactory(CurrentUser);
      const result = factory('role', context);

      expect(result).toBe(UserRole.ADMIN);
    });

    it('should extract firstName property', () => {
      const context = createMockExecutionContext(testUser);

      const factory = getParamDecoratorFactory(CurrentUser);
      const result = factory('firstName', context);

      expect(result).toBe('John');
    });

    it('should extract lastName property', () => {
      const context = createMockExecutionContext(testUser);

      const factory = getParamDecoratorFactory(CurrentUser);
      const result = factory('lastName', context);

      expect(result).toBe('Doe');
    });

    it('should return undefined for non-existent property', () => {
      const context = createMockExecutionContext(testUser);

      const factory = getParamDecoratorFactory(CurrentUser);
      const result = factory('nonExistent', context);

      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty user object', () => {
      const context = createMockExecutionContext({});

      const factory = getParamDecoratorFactory(CurrentUser);
      const result = factory(undefined, context);

      expect(result).toEqual({});
    });

    it('should handle user with null properties', () => {
      const user = {
        id: 'user-123',
        email: null,
        role: UserRole.USER,
      };
      const context = createMockExecutionContext(user);

      const factory = getParamDecoratorFactory(CurrentUser);

      expect(factory(undefined, context)).toEqual(user);
      expect(factory('email', context)).toBeNull();
    });

    it('should handle user with extra properties', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        customField: 'custom-value',
        nestedObject: { key: 'value' },
      };
      const context = createMockExecutionContext(user);

      const factory = getParamDecoratorFactory(CurrentUser);

      expect(factory('customField', context)).toBe('custom-value');
      expect(factory('nestedObject', context)).toEqual({ key: 'value' });
    });

    it('should handle request without user property returning null', () => {
      const contextWithoutUser = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({}),
        }),
      } as unknown as ExecutionContext;

      const factory = getParamDecoratorFactory(CurrentUser);
      const result = factory(undefined, contextWithoutUser);

      expect(result).toBeNull();
    });
  });

  describe('usage patterns', () => {
    it('should work for getting user ID in service calls', () => {
      const user = { id: 'user-123', email: 'test@example.com', role: UserRole.USER };
      const context = createMockExecutionContext(user);

      const factory = getParamDecoratorFactory(CurrentUser);
      const userId = factory('id', context);

      expect(userId).toBe('user-123');
    });

    it('should work for authorization checks', () => {
      const user = { id: 'user-123', email: 'test@example.com', role: UserRole.ADMIN };
      const context = createMockExecutionContext(user);

      const factory = getParamDecoratorFactory(CurrentUser);
      const role = factory('role', context);

      expect(role).toBe(UserRole.ADMIN);
    });

    it('should work for profile updates', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
        firstName: 'John',
        lastName: 'Doe',
      };
      const context = createMockExecutionContext(user);

      const factory = getParamDecoratorFactory(CurrentUser);
      const fullUser = factory(undefined, context);

      expect(fullUser).toEqual(user);
    });
  });
});

// ============================================================================
// Decorator Composition Tests
// ============================================================================

describe('Decorator Composition', () => {
  describe('@Public() with @Roles()', () => {
    it('should allow both decorators on same method', () => {
      class TestController {
        @Public()
        @Roles(UserRole.ADMIN)
        hybridMethod() {}
      }

      const publicMetadata = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        TestController.prototype.hybridMethod
      );
      const rolesMetadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.hybridMethod);

      expect(publicMetadata).toBe(true);
      expect(rolesMetadata).toEqual([UserRole.ADMIN]);
    });
  });

  describe('class and method level decorators', () => {
    it('should support class-level @Roles() with method-level @Public()', () => {
      @Roles(UserRole.ADMIN)
      class AdminController {
        @Public()
        login() {}

        dashboard() {}
      }

      const classRoles = Reflect.getMetadata(ROLES_KEY, AdminController);
      const methodPublic = Reflect.getMetadata(IS_PUBLIC_KEY, AdminController.prototype.login);

      expect(classRoles).toEqual([UserRole.ADMIN]);
      expect(methodPublic).toBe(true);
    });

    it('should support method-level @Roles() overriding class-level', () => {
      @Roles(UserRole.ADMIN)
      class AdminController {
        @Roles(UserRole.USER)
        userAccessibleMethod() {}
      }

      const classRoles = Reflect.getMetadata(ROLES_KEY, AdminController);
      const methodRoles = Reflect.getMetadata(
        ROLES_KEY,
        AdminController.prototype.userAccessibleMethod
      );

      expect(classRoles).toEqual([UserRole.ADMIN]);
      expect(methodRoles).toEqual([UserRole.USER]);
    });
  });
});
