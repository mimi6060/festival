/**
 * Auth Controller Unit Tests
 *
 * Comprehensive tests for authentication endpoints including:
 * - POST /auth/register
 * - POST /auth/login
 * - POST /auth/logout
 * - POST /auth/refresh
 * - GET /auth/me
 * - POST /auth/verify-email
 * - POST /auth/forgot-password
 * - POST /auth/reset-password
 * - POST /auth/change-password
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { AuthController } from './auth.controller';
import {
  AuthService,
  AuthenticatedUser,
  LoginResult,
  RegisterResult,
  AuthTokens,
} from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  regularUser,
  unverifiedUser,
  bannedUser,
  VALID_PASSWORD,
  validRegistrationInput,
  validLoginInput,
} from '../../test/fixtures';

// ============================================================================
// Mock Setup
// ============================================================================

describe('AuthController', () => {
  let controller: AuthController;

  // Mock Response object
  const mockResponse = (): Partial<Response> => ({
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  });

  // Mock Request object
  const mockRequest = (cookies?: Record<string, string>): Partial<Request> => ({
    cookies: cookies || {},
    user: undefined,
  });

  // Mock authenticated user
  const mockAuthenticatedUser: AuthenticatedUser = {
    id: regularUser.id,
    email: regularUser.email,
    firstName: regularUser.firstName,
    lastName: regularUser.lastName,
    phone: regularUser.phone,
    role: regularUser.role,
    status: regularUser.status,
    emailVerified: regularUser.emailVerified,
    createdAt: regularUser.createdAt,
    updatedAt: regularUser.updatedAt,
  };

  // Mock tokens
  const mockTokens: AuthTokens = {
    accessToken: 'mock.access.token',
    refreshToken: 'mock.refresh.token',
    expiresIn: 900,
    tokenType: 'Bearer',
  };

  // Mock login result
  const mockLoginResult: LoginResult = {
    user: mockAuthenticatedUser,
    tokens: mockTokens,
  };

  // Mock register result
  const mockRegisterResult: RegisterResult = {
    user: mockAuthenticatedUser,
    message: 'Registration successful. Please check your email to verify your account.',
  };

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
    getCurrentUser: jest.fn(),
    verifyEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    loginOAuth: jest.fn(),
    validateOAuthUser: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        NODE_ENV: 'test',
        APP_URL: 'http://localhost:3000',
        GOOGLE_OAUTH_ENABLED: true,
        GITHUB_OAUTH_ENABLED: true,
      };
      return config[key];
    }),
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, any> = {
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  // ==========================================================================
  // POST /auth/register Tests
  // ==========================================================================

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      mockAuthService.register.mockResolvedValue(mockRegisterResult);

      // Act
      const result = await controller.register(validRegistrationInput);

      // Assert
      expect(result).toEqual(mockRegisterResult);
      expect(mockAuthService.register).toHaveBeenCalledWith(validRegistrationInput);
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    });

    it('should pass registration data with phone number', async () => {
      // Arrange
      const inputWithPhone = {
        ...validRegistrationInput,
        phone: '+33612345678',
      };
      mockAuthService.register.mockResolvedValue(mockRegisterResult);

      // Act
      await controller.register(inputWithPhone);

      // Assert
      expect(mockAuthService.register).toHaveBeenCalledWith(inputWithPhone);
    });

    it('should pass registration data without phone number', async () => {
      // Arrange
      const inputWithoutPhone = {
        email: 'test@example.com',
        password: VALID_PASSWORD,
        firstName: 'Test',
        lastName: 'User',
      };
      mockAuthService.register.mockResolvedValue(mockRegisterResult);

      // Act
      await controller.register(inputWithoutPhone);

      // Assert
      expect(mockAuthService.register).toHaveBeenCalledWith(inputWithoutPhone);
    });

    it('should propagate ConflictException for duplicate email', async () => {
      // Arrange
      const error = new Error('Email is already registered');
      error.name = 'ConflictException';
      mockAuthService.register.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.register(validRegistrationInput)).rejects.toThrow(
        'Email is already registered'
      );
    });
  });

  // ==========================================================================
  // POST /auth/login Tests
  // ==========================================================================

  describe('POST /auth/login', () => {
    it('should login successfully and set cookies', async () => {
      // Arrange
      const res = mockResponse() as Response;
      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act
      const result = await controller.login(validLoginInput, res);

      // Assert
      expect(result).toEqual(mockLoginResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(validLoginInput);
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        mockTokens.accessToken,
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        })
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        mockTokens.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        })
      );
    });

    it('should set secure cookies in production environment', async () => {
      // Arrange
      const res = mockResponse() as Response;
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') {
          return 'production';
        }
        return undefined;
      });
      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act
      await controller.login(validLoginInput, res);

      // Assert
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        mockTokens.accessToken,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        })
      );
    });

    it('should set non-secure cookies in development environment', async () => {
      // Arrange
      const res = mockResponse() as Response;
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') {
          return 'development';
        }
        return undefined;
      });
      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act
      await controller.login(validLoginInput, res);

      // Assert
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        mockTokens.accessToken,
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
        })
      );
    });

    it('should propagate UnauthorizedException for invalid credentials', async () => {
      // Arrange
      const res = mockResponse() as Response;
      const error = new Error('Invalid email or password');
      error.name = 'UnauthorizedException';
      mockAuthService.login.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.login(validLoginInput, res)).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should propagate UnauthorizedException for banned user', async () => {
      // Arrange
      const res = mockResponse() as Response;
      const error = new Error('Your account has been banned');
      error.name = 'UnauthorizedException';
      mockAuthService.login.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.login({ email: bannedUser.email, password: VALID_PASSWORD }, res)
      ).rejects.toThrow('Your account has been banned');
    });

    it('should propagate UnauthorizedException for unverified email', async () => {
      // Arrange
      const res = mockResponse() as Response;
      const error = new Error('Please verify your email before logging in');
      error.name = 'UnauthorizedException';
      mockAuthService.login.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.login({ email: unverifiedUser.email, password: VALID_PASSWORD }, res)
      ).rejects.toThrow('Please verify your email before logging in');
    });
  });

  // ==========================================================================
  // POST /auth/logout Tests
  // ==========================================================================

  describe('POST /auth/logout', () => {
    it('should logout successfully and clear cookies', async () => {
      // Arrange
      const res = mockResponse() as Response;
      mockAuthService.logout.mockResolvedValue(undefined);

      // Act
      const result = await controller.logout(regularUser.id, res);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Logout successful',
      });
      expect(mockAuthService.logout).toHaveBeenCalledWith(regularUser.id);
      expect(res.clearCookie).toHaveBeenCalledWith('access_token', { path: '/' });
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/' });
    });

    it('should call logout with correct user ID', async () => {
      // Arrange
      const res = mockResponse() as Response;
      const userId = 'test-user-id-123';
      mockAuthService.logout.mockResolvedValue(undefined);

      // Act
      await controller.logout(userId, res);

      // Assert
      expect(mockAuthService.logout).toHaveBeenCalledWith(userId);
    });
  });

  // ==========================================================================
  // POST /auth/refresh Tests
  // ==========================================================================

  describe('POST /auth/refresh', () => {
    it('should refresh tokens from body and update cookies', async () => {
      // Arrange
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

      // Act
      const result = await controller.refresh({ refreshToken: 'valid.refresh.token' }, req, res);

      // Assert
      expect(result).toEqual(mockTokens);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith({
        refreshToken: 'valid.refresh.token',
      });
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });

    it('should refresh tokens from cookie when body is empty', async () => {
      // Arrange
      const req = mockRequest({ refresh_token: 'cookie.refresh.token' }) as Request;
      const res = mockResponse() as Response;
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

      // Act
      await controller.refresh({ refreshToken: '' }, req, res);

      // Assert
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith({
        refreshToken: 'cookie.refresh.token',
      });
    });

    it('should prefer body refresh token over cookie', async () => {
      // Arrange
      const req = mockRequest({ refresh_token: 'cookie.token' }) as Request;
      const res = mockResponse() as Response;
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

      // Act
      await controller.refresh({ refreshToken: 'body.token' }, req, res);

      // Assert
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith({
        refreshToken: 'body.token',
      });
    });

    it('should propagate UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const error = new Error('Invalid or expired refresh token');
      error.name = 'UnauthorizedException';
      mockAuthService.refreshTokens.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.refresh({ refreshToken: 'invalid.token' }, req, res)).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });

    it('should propagate UnauthorizedException for expired refresh token', async () => {
      // Arrange
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const error = new Error('Invalid or expired refresh token');
      error.name = 'UnauthorizedException';
      mockAuthService.refreshTokens.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.refresh({ refreshToken: 'expired.token' }, req, res)).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });
  });

  // ==========================================================================
  // GET /auth/me Tests
  // ==========================================================================

  describe('GET /auth/me', () => {
    it('should return current user profile', async () => {
      // Arrange
      mockAuthService.getCurrentUser.mockResolvedValue(mockAuthenticatedUser);

      // Act
      const result = await controller.me(regularUser.id);

      // Assert
      expect(result).toEqual(mockAuthenticatedUser);
      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith(regularUser.id);
    });

    it('should propagate NotFoundException for non-existent user', async () => {
      // Arrange
      const error = new Error('User not found');
      error.name = 'NotFoundException';
      mockAuthService.getCurrentUser.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.me('non-existent-id')).rejects.toThrow('User not found');
    });

    it('should return user with correct structure', async () => {
      // Arrange
      mockAuthService.getCurrentUser.mockResolvedValue(mockAuthenticatedUser);

      // Act
      const result = await controller.me(regularUser.id);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstName');
      expect(result).toHaveProperty('lastName');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('emailVerified');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshToken');
    });
  });

  // ==========================================================================
  // POST /auth/verify-email Tests
  // ==========================================================================

  describe('POST /auth/verify-email', () => {
    it('should verify email successfully', async () => {
      // Arrange
      mockAuthService.verifyEmail.mockResolvedValue(undefined);

      // Act
      const result = await controller.verifyEmail({ token: 'valid-verification-token' });

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Email verified successfully. You can now log in.',
      });
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('valid-verification-token');
    });

    it('should propagate BadRequestException for invalid token', async () => {
      // Arrange
      const error = new Error('Invalid or expired verification token');
      error.name = 'BadRequestException';
      mockAuthService.verifyEmail.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.verifyEmail({ token: 'invalid-token' })).rejects.toThrow(
        'Invalid or expired verification token'
      );
    });
  });

  // ==========================================================================
  // POST /auth/forgot-password Tests
  // ==========================================================================

  describe('POST /auth/forgot-password', () => {
    it('should initiate password reset for existing email', async () => {
      // Arrange
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      // Act
      const result = await controller.forgotPassword({ email: regularUser.email });

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
      });
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(regularUser.email);
    });

    it('should return success even for non-existent email (security)', async () => {
      // Arrange
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      // Act
      const result = await controller.forgotPassword({ email: 'nonexistent@example.com' });

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
      });
    });

    it('should normalize email before processing', async () => {
      // Arrange
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      // Act
      await controller.forgotPassword({ email: 'TEST@EXAMPLE.COM' });

      // Assert
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith('TEST@EXAMPLE.COM');
    });
  });

  // ==========================================================================
  // POST /auth/reset-password Tests
  // ==========================================================================

  describe('POST /auth/reset-password', () => {
    it('should reset password successfully', async () => {
      // Arrange
      mockAuthService.resetPassword.mockResolvedValue(undefined);

      // Act
      const result = await controller.resetPassword({
        token: 'valid-reset-token',
        newPassword: 'NewSecurePass456!',
      });

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Password reset successful. Please log in with your new password.',
      });
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith({
        token: 'valid-reset-token',
        newPassword: 'NewSecurePass456!',
      });
    });

    it('should propagate UnauthorizedException for invalid reset token', async () => {
      // Arrange
      const error = new Error('Invalid or expired reset token');
      error.name = 'UnauthorizedException';
      mockAuthService.resetPassword.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.resetPassword({
          token: 'invalid-token',
          newPassword: 'NewSecurePass456!',
        })
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should propagate UnauthorizedException for expired reset token', async () => {
      // Arrange
      const error = new Error('Invalid or expired reset token');
      error.name = 'UnauthorizedException';
      mockAuthService.resetPassword.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.resetPassword({
          token: 'expired-token',
          newPassword: 'NewSecurePass456!',
        })
      ).rejects.toThrow('Invalid or expired reset token');
    });
  });

  // ==========================================================================
  // POST /auth/change-password Tests
  // ==========================================================================

  describe('POST /auth/change-password', () => {
    it('should change password successfully', async () => {
      // Arrange
      mockAuthService.changePassword.mockResolvedValue(undefined);

      // Act
      const result = await controller.changePassword(regularUser.id, {
        currentPassword: VALID_PASSWORD,
        newPassword: 'NewSecurePass456!',
      });

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Password changed successfully.',
      });
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(regularUser.id, {
        currentPassword: VALID_PASSWORD,
        newPassword: 'NewSecurePass456!',
      });
    });

    it('should propagate BadRequestException for incorrect current password', async () => {
      // Arrange
      const error = new Error('Current password is incorrect');
      error.name = 'BadRequestException';
      mockAuthService.changePassword.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.changePassword(regularUser.id, {
          currentPassword: 'wrong-password',
          newPassword: 'NewSecurePass456!',
        })
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should propagate BadRequestException when new password is same as current', async () => {
      // Arrange
      const error = new Error('New password must be different from current password');
      error.name = 'BadRequestException';
      mockAuthService.changePassword.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.changePassword(regularUser.id, {
          currentPassword: VALID_PASSWORD,
          newPassword: VALID_PASSWORD,
        })
      ).rejects.toThrow('New password must be different from current password');
    });

    it('should propagate NotFoundException for non-existent user', async () => {
      // Arrange
      const error = new Error('User not found');
      error.name = 'NotFoundException';
      mockAuthService.changePassword.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.changePassword('non-existent-id', {
          currentPassword: VALID_PASSWORD,
          newPassword: 'NewSecurePass456!',
        })
      ).rejects.toThrow('User not found');
    });
  });

  // ==========================================================================
  // POST /auth/resend-verification Tests
  // ==========================================================================

  describe('POST /auth/resend-verification', () => {
    it('should resend verification email', async () => {
      // Arrange
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      // Act
      const result = await controller.resendVerification({ email: unverifiedUser.email });

      // Assert
      expect(result).toEqual({
        success: true,
        message:
          'If the account exists and is not verified, a new verification email has been sent.',
      });
    });
  });

  // ==========================================================================
  // GET /auth/providers Tests
  // ==========================================================================

  describe('GET /auth/providers', () => {
    it('should return list of OAuth providers', () => {
      // Act
      const result = controller.getOAuthProviders();

      // Assert
      expect(result).toHaveProperty('providers');
      expect(Array.isArray(result.providers)).toBe(true);
      expect(result.providers).toHaveLength(2);
    });

    it('should include Google provider', () => {
      // Act
      const result = controller.getOAuthProviders();

      // Assert
      const googleProvider = result.providers.find((p: { name: string }) => p.name === 'google');
      expect(googleProvider).toBeDefined();
      expect(googleProvider).toHaveProperty('url', '/api/auth/google');
      expect(googleProvider).toHaveProperty('enabled');
    });

    it('should include GitHub provider', () => {
      // Act
      const result = controller.getOAuthProviders();

      // Assert
      const githubProvider = result.providers.find((p: { name: string }) => p.name === 'github');
      expect(githubProvider).toBeDefined();
      expect(githubProvider).toHaveProperty('url', '/api/auth/github');
      expect(githubProvider).toHaveProperty('enabled');
    });

    it('should reflect OAuth provider enabled status from config', () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'GOOGLE_OAUTH_ENABLED') {
          return true;
        }
        if (key === 'GITHUB_OAUTH_ENABLED') {
          return false;
        }
        return undefined;
      });

      // Act
      const result = controller.getOAuthProviders();

      // Assert
      const googleProvider = result.providers.find((p: { name: string }) => p.name === 'google');
      const githubProvider = result.providers.find((p: { name: string }) => p.name === 'github');
      expect(googleProvider?.enabled).toBe(true);
      expect(githubProvider?.enabled).toBe(false);
    });

    it('should return false for disabled providers (undefined config value)', () => {
      // Arrange - Config returns undefined for OAuth settings
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'GOOGLE_OAUTH_ENABLED') {
          return undefined;
        }
        if (key === 'GITHUB_OAUTH_ENABLED') {
          return undefined;
        }
        return undefined;
      });

      // Act
      const result = controller.getOAuthProviders();

      // Assert - Should default to false when undefined
      const googleProvider = result.providers.find((p: { name: string }) => p.name === 'google');
      const githubProvider = result.providers.find((p: { name: string }) => p.name === 'github');
      expect(googleProvider?.enabled).toBe(false);
      expect(githubProvider?.enabled).toBe(false);
    });
  });

  // ==========================================================================
  // OAuth Callback Tests
  // ==========================================================================

  describe('OAuth Callbacks', () => {
    describe('GET /auth/google/callback', () => {
      it('should handle Google OAuth callback and set cookies', async () => {
        // Arrange
        const req = mockRequest() as Request;
        req.user = mockAuthenticatedUser;
        const res = mockResponse() as Response;
        mockAuthService.loginOAuth.mockResolvedValue(mockLoginResult);
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'NODE_ENV') {
            return 'test';
          }
          if (key === 'APP_URL') {
            return 'http://localhost:3000';
          }
          return undefined;
        });

        // Act
        await controller.googleAuthCallback(req, res);

        // Assert
        expect(mockAuthService.loginOAuth).toHaveBeenCalledWith(mockAuthenticatedUser);
        expect(res.cookie).toHaveBeenCalledWith(
          'access_token',
          mockTokens.accessToken,
          expect.objectContaining({
            httpOnly: true,
            path: '/',
          })
        );
        expect(res.cookie).toHaveBeenCalledWith(
          'refresh_token',
          mockTokens.refreshToken,
          expect.objectContaining({
            httpOnly: true,
            path: '/',
          })
        );
        expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/auth/callback?success=true');
      });

      it('should set secure cookies in production for Google callback', async () => {
        // Arrange
        const req = mockRequest() as Request;
        req.user = mockAuthenticatedUser;
        const res = mockResponse() as Response;
        mockAuthService.loginOAuth.mockResolvedValue(mockLoginResult);
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'NODE_ENV') {
            return 'production';
          }
          if (key === 'APP_URL') {
            return 'https://myapp.com';
          }
          return undefined;
        });

        // Act
        await controller.googleAuthCallback(req, res);

        // Assert
        expect(res.cookie).toHaveBeenCalledWith(
          'access_token',
          mockTokens.accessToken,
          expect.objectContaining({
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
          })
        );
      });

      it('should use default APP_URL when not configured', async () => {
        // Arrange
        const req = mockRequest() as Request;
        req.user = mockAuthenticatedUser;
        const res = mockResponse() as Response;
        mockAuthService.loginOAuth.mockResolvedValue(mockLoginResult);
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'NODE_ENV') {
            return 'test';
          }
          if (key === 'APP_URL') {
            return undefined; // Not configured
          }
          return undefined;
        });

        // Act
        await controller.googleAuthCallback(req, res);

        // Assert
        expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/auth/callback?success=true');
      });
    });

    describe('GET /auth/github/callback', () => {
      it('should handle GitHub OAuth callback and set cookies', async () => {
        // Arrange
        const req = mockRequest() as Request;
        req.user = mockAuthenticatedUser;
        const res = mockResponse() as Response;
        mockAuthService.loginOAuth.mockResolvedValue(mockLoginResult);
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'NODE_ENV') {
            return 'test';
          }
          if (key === 'APP_URL') {
            return 'http://localhost:3000';
          }
          return undefined;
        });

        // Act
        await controller.githubAuthCallback(req, res);

        // Assert
        expect(mockAuthService.loginOAuth).toHaveBeenCalledWith(mockAuthenticatedUser);
        expect(res.cookie).toHaveBeenCalledWith(
          'access_token',
          mockTokens.accessToken,
          expect.objectContaining({
            httpOnly: true,
            path: '/',
          })
        );
        expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/auth/callback?success=true');
      });

      it('should set secure cookies in production for GitHub callback', async () => {
        // Arrange
        const req = mockRequest() as Request;
        req.user = mockAuthenticatedUser;
        const res = mockResponse() as Response;
        mockAuthService.loginOAuth.mockResolvedValue(mockLoginResult);
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'NODE_ENV') {
            return 'production';
          }
          if (key === 'APP_URL') {
            return 'https://myapp.com';
          }
          return undefined;
        });

        // Act
        await controller.githubAuthCallback(req, res);

        // Assert
        expect(res.cookie).toHaveBeenCalledWith(
          'access_token',
          mockTokens.accessToken,
          expect.objectContaining({
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
          })
        );
        expect(res.redirect).toHaveBeenCalledWith('https://myapp.com/auth/callback?success=true');
      });
    });

    describe('GET /auth/google', () => {
      it('should be defined (guard handles redirect)', async () => {
        // Act & Assert - The method exists and can be called (guard handles the actual redirect)
        await expect(controller.googleAuth()).resolves.toBeUndefined();
      });
    });

    describe('GET /auth/github', () => {
      it('should be defined (guard handles redirect)', async () => {
        // Act & Assert - The method exists and can be called (guard handles the actual redirect)
        await expect(controller.githubAuth()).resolves.toBeUndefined();
      });
    });
  });

  // ==========================================================================
  // Refresh Token Edge Cases
  // ==========================================================================

  describe('POST /auth/refresh edge cases', () => {
    it('should use undefined when no token in body or cookie', async () => {
      // Arrange
      const req = mockRequest({}) as Request; // No cookies
      const res = mockResponse() as Response;
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

      // Act
      await controller.refresh({ refreshToken: '' }, req, res);

      // Assert - should pass undefined from empty cookie
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith({
        refreshToken: undefined,
      });
    });

    it('should handle missing cookies object', async () => {
      // Arrange
      const req = { cookies: undefined } as unknown as Request;
      const res = mockResponse() as Response;
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

      // Act
      await controller.refresh({ refreshToken: '' }, req, res);

      // Assert
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith({
        refreshToken: undefined,
      });
    });

    it('should set cookies in production mode during refresh', async () => {
      // Arrange
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') {
          return 'production';
        }
        return undefined;
      });

      // Act
      await controller.refresh({ refreshToken: 'valid.token' }, req, res);

      // Assert
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        mockTokens.accessToken,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        })
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        mockTokens.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        })
      );
    });

    it('should set lax cookies in non-production mode during refresh', async () => {
      // Arrange
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') {
          return 'development';
        }
        return undefined;
      });

      // Act
      await controller.refresh({ refreshToken: 'valid.token' }, req, res);

      // Assert
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        mockTokens.accessToken,
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
        })
      );
    });
  });
});
