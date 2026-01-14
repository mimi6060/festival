/**
 * GitHub OAuth Guard Unit Tests
 *
 * Comprehensive tests for GitHub OAuth guard including:
 * - OAuth enabled/disabled checks
 * - Credentials validation
 * - canActivate behavior
 * - handleRequest error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitHubOAuthGuard } from './github-oauth.guard';

// ============================================================================
// Mock Setup
// ============================================================================

const createMockExecutionContext = (): ExecutionContext => {
  const mockRequest = {
    user: null,
    headers: {},
  };

  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue({}),
    }),
    getHandler: jest.fn().mockReturnValue(jest.fn()),
    getClass: jest.fn().mockReturnValue(class TestController {}),
    getType: jest.fn().mockReturnValue('http'),
    getArgs: jest.fn().mockReturnValue([mockRequest, {}]),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  } as unknown as ExecutionContext;
};

describe('GitHubOAuthGuard', () => {
  let guard: GitHubOAuthGuard;

  const createConfigServiceMock = (config: Record<string, string | boolean | undefined>) => ({
    get: jest.fn((key: string) => config[key]),
  });

  const setupGuard = async (config: Record<string, string | boolean | undefined>) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubOAuthGuard,
        {
          provide: ConfigService,
          useValue: createConfigServiceMock(config),
        },
      ],
    }).compile();

    return module.get<GitHubOAuthGuard>(GitHubOAuthGuard);
  };

  describe('constructor', () => {
    it('should be defined', async () => {
      guard = await setupGuard({
        GITHUB_OAUTH_ENABLED: 'true',
        GITHUB_CLIENT_ID: 'test-client-id',
        GITHUB_CLIENT_SECRET: 'test-client-secret',
      });

      expect(guard).toBeDefined();
    });
  });

  describe('canActivate', () => {
    describe('OAuth disabled', () => {
      it('should throw BadRequestException when GITHUB_OAUTH_ENABLED is false string', async () => {
        guard = await setupGuard({
          GITHUB_OAUTH_ENABLED: 'false',
          GITHUB_CLIENT_ID: 'test-client-id',
          GITHUB_CLIENT_SECRET: 'test-client-secret',
        });

        const context = createMockExecutionContext();

        expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      });

      it('should throw BadRequestException when GITHUB_OAUTH_ENABLED is boolean false', async () => {
        guard = await setupGuard({
          GITHUB_OAUTH_ENABLED: false,
          GITHUB_CLIENT_ID: 'test-client-id',
          GITHUB_CLIENT_SECRET: 'test-client-secret',
        });

        const context = createMockExecutionContext();

        expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      });

      it('should throw BadRequestException when GITHUB_OAUTH_ENABLED is undefined', async () => {
        guard = await setupGuard({
          GITHUB_OAUTH_ENABLED: undefined,
          GITHUB_CLIENT_ID: 'test-client-id',
          GITHUB_CLIENT_SECRET: 'test-client-secret',
        });

        const context = createMockExecutionContext();

        expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      });

      it('should include helpful message when OAuth disabled', async () => {
        guard = await setupGuard({
          GITHUB_OAUTH_ENABLED: 'false',
          GITHUB_CLIENT_ID: 'test-client-id',
          GITHUB_CLIENT_SECRET: 'test-client-secret',
        });

        const context = createMockExecutionContext();

        try {
          guard.canActivate(context);
          fail('Should have thrown');
        } catch (error) {
          expect((error as BadRequestException).message).toContain(
            'GitHub OAuth is not configured'
          );
          expect((error as BadRequestException).message).toContain('email/password login');
        }
      });
    });

    describe('missing credentials', () => {
      it('should throw BadRequestException when GITHUB_CLIENT_ID is missing', async () => {
        guard = await setupGuard({
          GITHUB_OAUTH_ENABLED: 'true',
          GITHUB_CLIENT_ID: undefined,
          GITHUB_CLIENT_SECRET: 'test-client-secret',
        });

        const context = createMockExecutionContext();

        expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      });

      it('should throw BadRequestException when GITHUB_CLIENT_SECRET is missing', async () => {
        guard = await setupGuard({
          GITHUB_OAUTH_ENABLED: 'true',
          GITHUB_CLIENT_ID: 'test-client-id',
          GITHUB_CLIENT_SECRET: undefined,
        });

        const context = createMockExecutionContext();

        expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      });

      it('should throw BadRequestException when GITHUB_CLIENT_ID is "disabled"', async () => {
        guard = await setupGuard({
          GITHUB_OAUTH_ENABLED: 'true',
          GITHUB_CLIENT_ID: 'disabled',
          GITHUB_CLIENT_SECRET: 'test-client-secret',
        });

        const context = createMockExecutionContext();

        expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      });

      it('should throw BadRequestException when GITHUB_CLIENT_SECRET is "disabled"', async () => {
        guard = await setupGuard({
          GITHUB_OAUTH_ENABLED: 'true',
          GITHUB_CLIENT_ID: 'test-client-id',
          GITHUB_CLIENT_SECRET: 'disabled',
        });

        const context = createMockExecutionContext();

        expect(() => guard.canActivate(context)).toThrow(BadRequestException);
      });

      it('should include helpful message when credentials missing', async () => {
        guard = await setupGuard({
          GITHUB_OAUTH_ENABLED: 'true',
          GITHUB_CLIENT_ID: undefined,
          GITHUB_CLIENT_SECRET: 'test-client-secret',
        });

        const context = createMockExecutionContext();

        try {
          guard.canActivate(context);
          fail('Should have thrown');
        } catch (error) {
          expect((error as BadRequestException).message).toContain(
            'credentials are not configured'
          );
        }
      });
    });

    describe('OAuth enabled with valid credentials', () => {
      it('should accept string "true" for GITHUB_OAUTH_ENABLED', async () => {
        guard = await setupGuard({
          GITHUB_OAUTH_ENABLED: 'true',
          GITHUB_CLIENT_ID: 'test-client-id',
          GITHUB_CLIENT_SECRET: 'test-client-secret',
        });

        const context = createMockExecutionContext();

        // Mock parent canActivate to return true
        const parentCanActivateSpy = jest.spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate'
        );
        parentCanActivateSpy.mockReturnValue(true);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should accept boolean true for GITHUB_OAUTH_ENABLED', async () => {
        guard = await setupGuard({
          GITHUB_OAUTH_ENABLED: true,
          GITHUB_CLIENT_ID: 'test-client-id',
          GITHUB_CLIENT_SECRET: 'test-client-secret',
        });

        const context = createMockExecutionContext();

        const parentCanActivateSpy = jest.spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate'
        );
        parentCanActivateSpy.mockReturnValue(true);

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });
  });

  describe('handleRequest', () => {
    beforeEach(async () => {
      guard = await setupGuard({
        GITHUB_OAUTH_ENABLED: 'true',
        GITHUB_CLIENT_ID: 'test-client-id',
        GITHUB_CLIENT_SECRET: 'test-client-secret',
      });
    });

    it('should return user when user exists and no error', () => {
      const user = { id: 'user-123', email: 'test@github.com' };

      const result = guard.handleRequest(null, user);

      expect(result).toBe(user);
    });

    it('should throw error when error is provided', () => {
      const error = new Error('OAuth failed');

      expect(() => guard.handleRequest(error, null)).toThrow(error);
    });

    it('should throw error when user is null', () => {
      expect(() => guard.handleRequest(null, null)).toThrow('GitHub authentication failed');
    });

    it('should throw error when user is undefined', () => {
      expect(() => guard.handleRequest(null, undefined)).toThrow('GitHub authentication failed');
    });

    it('should throw provided error over generating new one', () => {
      const customError = new Error('Custom OAuth error');

      expect(() => guard.handleRequest(customError, null)).toThrow('Custom OAuth error');
    });

    it('should prefer error over user when both provided', () => {
      const error = new Error('OAuth error');
      const user = { id: 'user-123' };

      expect(() => guard.handleRequest(error, user)).toThrow('OAuth error');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string client ID', async () => {
      guard = await setupGuard({
        GITHUB_OAUTH_ENABLED: 'true',
        GITHUB_CLIENT_ID: '',
        GITHUB_CLIENT_SECRET: 'test-client-secret',
      });

      const context = createMockExecutionContext();

      expect(() => guard.canActivate(context)).toThrow(BadRequestException);
    });

    it('should handle empty string client secret', async () => {
      guard = await setupGuard({
        GITHUB_OAUTH_ENABLED: 'true',
        GITHUB_CLIENT_ID: 'test-client-id',
        GITHUB_CLIENT_SECRET: '',
      });

      const context = createMockExecutionContext();

      expect(() => guard.canActivate(context)).toThrow(BadRequestException);
    });

    it('should handle whitespace-only values', async () => {
      guard = await setupGuard({
        GITHUB_OAUTH_ENABLED: 'true',
        GITHUB_CLIENT_ID: '   ',
        GITHUB_CLIENT_SECRET: 'test-client-secret',
      });

      const context = createMockExecutionContext();

      // Whitespace is truthy, so should call parent
      const parentCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'canActivate'
      );
      parentCanActivateSpy.mockReturnValue(true);

      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  });
});
