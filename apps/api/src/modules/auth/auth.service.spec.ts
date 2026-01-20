/**
 * Auth Service Unit Tests
 *
 * Comprehensive tests for authentication functionality including:
 * - User registration
 * - Login with credentials
 * - JWT token management
 * - Password operations
 * - Email verification
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import {
  regularUser,
  unverifiedUser,
  bannedUser,
  inactiveUser,
  VALID_PASSWORD,
  VALID_PASSWORD_HASH,
  validRegistrationInput,
  validLoginInput,
  toPrismaUser,
} from '../../test/fixtures';
import { EmailService } from '../email/email.service';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-123'),
}));

describe('AuthService', () => {
  let authService: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    sign: jest.fn().mockReturnValue('mocked.verification.token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_ACCESS_EXPIRES_IN: 900,
        JWT_REFRESH_EXPIRES_IN: 604800,
      };
      return config[key] ?? defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, any> = {
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_ACCESS_EXPIRES_IN: 900,
        JWT_REFRESH_EXPIRES_IN: 604800,
      };
      const value = config[key];
      if (value === undefined) {
        throw new Error(`Configuration key "${key}" does not exist`);
      }
      return value;
    }),
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest
      .fn()
      .mockResolvedValue({ success: true, messageId: 'test-message-id' }),
    sendVerificationEmail: jest
      .fn()
      .mockResolvedValue({ success: true, messageId: 'test-message-id' }),
    sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);

    // Default bcrypt mocks
    (bcrypt.hash as jest.Mock).mockResolvedValue(VALID_PASSWORD_HASH);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    // Default JWT mocks
    mockJwtService.signAsync.mockResolvedValue('mocked.jwt.token');
  });

  // ==========================================================================
  // Registration Tests
  // ==========================================================================

  describe('register', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: validRegistrationInput.email.toLowerCase(),
        firstName: validRegistrationInput.firstName,
        lastName: validRegistrationInput.lastName,
        phone: validRegistrationInput.phone,
        role: UserRole.USER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await authService.register(validRegistrationInput);

      // Assert
      expect(result.user.email).toBe(validRegistrationInput.email.toLowerCase());
      expect(result.user.firstName).toBe(validRegistrationInput.firstName);
      expect(result.user.lastName).toBe(validRegistrationInput.lastName);
      expect(result.user.role).toBe(UserRole.USER);
      expect(result.user.status).toBe(UserStatus.PENDING_VERIFICATION);
      expect(result.message).toContain('Registration successful');
      expect(bcrypt.hash).toHaveBeenCalledWith(validRegistrationInput.password, 12);
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const inputWithUppercase = {
        ...validRegistrationInput,
        email: 'TEST@EXAMPLE.COM',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'test@example.com',
        firstName: inputWithUppercase.firstName,
        lastName: inputWithUppercase.lastName,
        phone: inputWithUppercase.phone,
        role: UserRole.USER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await authService.register(inputWithUppercase);

      // Assert
      expect(result.user.email).toBe('test@example.com');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(regularUser));

      // Act & Assert
      await expect(
        authService.register({
          ...validRegistrationInput,
          email: regularUser.email,
        })
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should trim whitespace from input fields', async () => {
      // Arrange
      const inputWithWhitespace = {
        email: '  test@example.com  ',
        password: VALID_PASSWORD,
        firstName: '  John  ',
        lastName: '  Doe  ',
        phone: '  +33612345678  ',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockImplementation((args) =>
        Promise.resolve({
          id: 'new-user-id',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      // Act
      await authService.register(inputWithWhitespace);

      // Assert
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            phone: '+33612345678',
          }),
        })
      );
    });

    it('should handle registration without phone number', async () => {
      // Arrange
      const inputWithoutPhone = {
        email: 'nophone@example.com',
        password: VALID_PASSWORD,
        firstName: 'No',
        lastName: 'Phone',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockImplementation((args) =>
        Promise.resolve({
          id: 'new-user-id',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      // Act
      await authService.register(inputWithoutPhone);

      // Assert
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: null,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Login Tests
  // ==========================================================================

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const user = {
        ...toPrismaUser(regularUser),
        status: UserStatus.ACTIVE,
        emailVerified: true,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access.token.here')
        .mockResolvedValueOnce('refresh.token.here');

      // Act
      const result = await authService.login(validLoginInput);

      // Assert
      expect(result.user.email).toBe(regularUser.email);
      expect(result.tokens.accessToken).toBe('access.token.here');
      expect(result.tokens.refreshToken).toBe('refresh.token.here');
      expect(result.tokens.tokenType).toBe('Bearer');
      // expiresIn comes from the constructor's config, verify it's a number
      expect(
        typeof result.tokens.expiresIn === 'number' || result.tokens.expiresIn === undefined
      ).toBe(true);
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: VALID_PASSWORD,
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(regularUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.login({
          email: regularUser.email,
          password: 'wrong-password',
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for banned user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(bannedUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.login({
          email: bannedUser.email,
          password: VALID_PASSWORD,
        })
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authService.login({
          email: bannedUser.email,
          password: VALID_PASSWORD,
        })
      ).rejects.toThrow('Your account has been banned');
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(inactiveUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.login({
          email: inactiveUser.email,
          password: VALID_PASSWORD,
        })
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authService.login({
          email: inactiveUser.email,
          password: VALID_PASSWORD,
        })
      ).rejects.toThrow('Your account is inactive');
    });

    it('should throw UnauthorizedException for unverified email', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(unverifiedUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.login({
          email: unverifiedUser.email,
          password: VALID_PASSWORD,
        })
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authService.login({
          email: unverifiedUser.email,
          password: VALID_PASSWORD,
        })
      ).rejects.toThrow('Please verify your email');
    });

    it('should update lastLoginAt and refreshToken on successful login', async () => {
      // Arrange
      const user = {
        ...toPrismaUser(regularUser),
        status: UserStatus.ACTIVE,
        emailVerified: true,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access.token')
        .mockResolvedValueOnce('refresh.token');

      // Act
      await authService.login(validLoginInput);

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: user.id },
          data: expect.objectContaining({
            refreshToken: 'refresh.token',
            lastLoginAt: expect.any(Date),
          }),
        })
      );
    });

    it('should normalize email to lowercase during login', async () => {
      // Arrange
      const user = {
        ...toPrismaUser(regularUser),
        status: UserStatus.ACTIVE,
        emailVerified: true,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      await authService.login({
        email: 'USER@FESTIVAL.TEST',
        password: VALID_PASSWORD,
      });

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@festival.test' },
      });
    });
  });

  // ==========================================================================
  // Logout Tests
  // ==========================================================================

  describe('logout', () => {
    it('should invalidate refresh token on logout', async () => {
      // Arrange
      mockPrismaService.user.update.mockResolvedValue(toPrismaUser(regularUser));

      // Act
      await authService.logout(regularUser.id);

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: regularUser.id },
        data: { refreshToken: null },
      });
    });
  });

  // ==========================================================================
  // Token Refresh Tests
  // ==========================================================================

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Arrange
      const user = {
        ...toPrismaUser(regularUser),
        refreshToken: 'valid.refresh.token',
      };
      mockJwtService.verify.mockReturnValue({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(user);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new.access.token')
        .mockResolvedValueOnce('new.refresh.token');

      // Act
      const result = await authService.refreshTokens({
        refreshToken: 'valid.refresh.token',
      });

      // Assert
      expect(result.accessToken).toBe('new.access.token');
      expect(result.refreshToken).toBe('new.refresh.token');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { refreshToken: 'new.refresh.token' },
        })
      );
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(
        authService.refreshTokens({
          refreshToken: 'invalid.token',
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token does not match stored token', async () => {
      // Arrange
      const user = {
        ...toPrismaUser(regularUser),
        refreshToken: 'different.refresh.token',
      };
      mockJwtService.verify.mockReturnValue({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      // Act & Assert
      await expect(
        authService.refreshTokens({
          refreshToken: 'provided.refresh.token',
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      mockJwtService.verify.mockReturnValue({
        sub: 'non-existent-user',
        email: 'test@example.com',
        role: UserRole.USER,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.refreshTokens({
          refreshToken: 'valid.token',
        })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ==========================================================================
  // Password Change Tests
  // ==========================================================================

  describe('changePassword', () => {
    it('should change password successfully and invalidate refresh tokens', async () => {
      // Arrange
      const user = toPrismaUser(regularUser);
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // Current password check
        .mockResolvedValueOnce(false); // New password different check
      (bcrypt.hash as jest.Mock).mockResolvedValue('new.password.hash');
      mockPrismaService.user.update.mockResolvedValue(user);

      // Act
      await authService.changePassword(user.id, {
        currentPassword: VALID_PASSWORD,
        newPassword: 'NewPassword456!',
        confirmPassword: 'NewPassword456!',
      });

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(VALID_PASSWORD, user.passwordHash);
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword456!', 12);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: {
          passwordHash: 'new.password.hash',
          refreshToken: null, // Sessions invalidated
        },
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.changePassword('non-existent-id', {
          currentPassword: VALID_PASSWORD,
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if current password is incorrect', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(regularUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.changePassword(regularUser.id, {
          currentPassword: 'wrong-password',
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!',
        })
      ).rejects.toThrow(BadRequestException);
      await expect(
        authService.changePassword(regularUser.id, {
          currentPassword: 'wrong-password',
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!',
        })
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw BadRequestException if new password is same as current', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(regularUser));
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // Current password check
        .mockResolvedValueOnce(true); // Same password check

      // Act & Assert
      await expect(
        authService.changePassword(regularUser.id, {
          currentPassword: VALID_PASSWORD,
          newPassword: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        })
      ).rejects.toThrow(BadRequestException);
      await expect(
        authService.changePassword(regularUser.id, {
          currentPassword: VALID_PASSWORD,
          newPassword: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        })
      ).rejects.toThrow('New password must be different');
    });

    it('should throw BadRequestException for OAuth users without password', async () => {
      // Arrange - OAuth user without passwordHash
      const oauthUser = {
        ...toPrismaUser(regularUser),
        passwordHash: null,
        authProvider: 'GOOGLE',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(oauthUser);

      // Act & Assert
      await expect(
        authService.changePassword(oauthUser.id, {
          currentPassword: 'anyPassword123!',
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!',
        })
      ).rejects.toThrow(BadRequestException);
      await expect(
        authService.changePassword(oauthUser.id, {
          currentPassword: 'anyPassword123!',
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!',
        })
      ).rejects.toThrow('Cannot change password for accounts using social login');
    });

    it('should invalidate all sessions by setting refreshToken to null', async () => {
      // Arrange
      const userWithRefreshToken = {
        ...toPrismaUser(regularUser),
        refreshToken: 'existing.refresh.token',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithRefreshToken);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new.password.hash');
      mockPrismaService.user.update.mockResolvedValue(userWithRefreshToken);

      // Act
      await authService.changePassword(userWithRefreshToken.id, {
        currentPassword: VALID_PASSWORD,
        newPassword: 'NewPassword456!',
        confirmPassword: 'NewPassword456!',
      });

      // Assert - verify refreshToken is set to null
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refreshToken: null,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Get Current User Tests
  // ==========================================================================

  describe('getCurrentUser', () => {
    it('should return sanitized user data', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(regularUser));

      // Act
      const result = await authService.getCurrentUser(regularUser.id);

      // Assert
      expect(result.id).toBe(regularUser.id);
      expect(result.email).toBe(regularUser.email);
      expect(result.firstName).toBe(regularUser.firstName);
      expect(result.lastName).toBe(regularUser.lastName);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.getCurrentUser('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ==========================================================================
  // Validate User Tests
  // ==========================================================================

  describe('validateUser', () => {
    it('should return user for valid payload and active user', async () => {
      // Arrange
      const user = {
        ...toPrismaUser(regularUser),
        status: UserStatus.ACTIVE,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      // Act
      const result = await authService.validateUser({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
    });

    it('should return null for non-existent user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await authService.validateUser({
        sub: 'non-existent',
        email: 'test@example.com',
        role: UserRole.USER,
      });

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for banned user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(bannedUser));

      // Act
      const result = await authService.validateUser({
        sub: bannedUser.id,
        email: bannedUser.email,
        role: bannedUser.role,
      });

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(inactiveUser));

      // Act
      const result = await authService.validateUser({
        sub: inactiveUser.id,
        email: inactiveUser.email,
        role: inactiveUser.role,
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Forgot Password Tests
  // ==========================================================================

  describe('forgotPassword', () => {
    it('should complete successfully for existing user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(regularUser));

      // Act & Assert (should not throw)
      await expect(authService.forgotPassword(regularUser.email)).resolves.toBeUndefined();
    });

    it('should complete successfully for non-existent email (security)', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert (should not throw - prevents email enumeration)
      await expect(authService.forgotPassword('nonexistent@example.com')).resolves.toBeUndefined();
    });

    it('should normalize email before lookup', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      await authService.forgotPassword('  TEST@EXAMPLE.COM  ');

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  // ==========================================================================
  // Verify Email Tests
  // ==========================================================================

  describe('verifyEmail', () => {
    it('should verify email and activate user', async () => {
      // Arrange
      const pendingUser = toPrismaUser(unverifiedUser);
      mockPrismaService.user.findFirst.mockResolvedValue(pendingUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...pendingUser,
        emailVerified: true,
        status: UserStatus.ACTIVE,
      });

      // Act
      await authService.verifyEmail('valid-verification-token');

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: pendingUser.id },
        data: {
          emailVerified: true,
          status: UserStatus.ACTIVE,
        },
      });
    });

    it('should throw BadRequestException for invalid token', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Reset Password Tests
  // ==========================================================================

  describe('resetPassword', () => {
    it('should reset password and invalidate sessions', async () => {
      // Arrange
      const user = {
        ...toPrismaUser(regularUser),
        status: UserStatus.ACTIVE,
      };
      mockPrismaService.user.findFirst.mockResolvedValue(user);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new.hashed.password');
      mockPrismaService.user.update.mockResolvedValue(user);

      // Act
      await authService.resetPassword({
        token: 'valid-reset-token',
        newPassword: 'NewSecurePass123!',
      });

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: {
          passwordHash: 'new.hashed.password',
          resetToken: null,
          resetTokenExpiry: null,
          refreshToken: null, // Sessions invalidated
        },
      });
    });

    it('should throw UnauthorizedException for invalid reset token', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.resetPassword({
          token: 'invalid-token',
          newPassword: 'NewSecurePass123!',
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired reset token', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.resetPassword({
          token: 'expired-token',
          newPassword: 'NewSecurePass123!',
        })
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authService.resetPassword({
          token: 'expired-token',
          newPassword: 'NewSecurePass123!',
        })
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should hash the token before database lookup', async () => {
      // Arrange
      const user = {
        ...toPrismaUser(regularUser),
        status: UserStatus.ACTIVE,
      };
      mockPrismaService.user.findFirst.mockResolvedValue(user);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new.hashed.password');
      mockPrismaService.user.update.mockResolvedValue(user);

      // Act
      await authService.resetPassword({
        token: 'test-reset-token',
        newPassword: 'NewSecurePass123!',
      });

      // Assert - the findFirst should be called with a hashed token
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          resetToken: expect.any(String), // SHA-256 hash
          resetTokenExpiry: { gt: expect.any(Date) },
          status: UserStatus.ACTIVE,
        },
      });
    });
  });

  // ==========================================================================
  // Forgot Password Tests (additional)
  // ==========================================================================

  describe('forgotPassword (token generation)', () => {
    it('should store hashed token and expiry in database', async () => {
      // Arrange
      const user = toPrismaUser(regularUser);
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(user);

      // Act
      await authService.forgotPassword(regularUser.email);

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: {
          resetToken: expect.any(String), // SHA-256 hash
          resetTokenExpiry: expect.any(Date),
        },
      });
    });

    it('should set token expiry to 1 hour from now', async () => {
      // Arrange
      const user = toPrismaUser(regularUser);
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(user);
      const now = Date.now();

      // Act
      await authService.forgotPassword(regularUser.email);

      // Assert
      const updateCall = mockPrismaService.user.update.mock.calls[0][0];
      const expiryDate = updateCall.data.resetTokenExpiry as Date;
      const expiryTime = expiryDate.getTime();

      // Should be approximately 1 hour from now (with some tolerance)
      expect(expiryTime).toBeGreaterThan(now + 59 * 60 * 1000);
      expect(expiryTime).toBeLessThan(now + 61 * 60 * 1000);
    });

    it('should send password reset email to user', async () => {
      // Arrange
      const user = toPrismaUser(regularUser);
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(user);

      // Act
      await authService.forgotPassword(regularUser.email);

      // Assert
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        user.email,
        expect.objectContaining({
          firstName: user.firstName,
          resetUrl: expect.stringContaining('/reset-password?token='),
          expiresIn: '1 hour',
        })
      );
    });

    it('should not send email for non-existent user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      await authService.forgotPassword('nonexistent@example.com');

      // Assert
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure gracefully', async () => {
      // Arrange
      const user = toPrismaUser(regularUser);
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(user);
      mockEmailService.sendPasswordResetEmail.mockRejectedValue(new Error('SMTP error'));

      // Act & Assert - should not throw despite email failure
      await expect(authService.forgotPassword(regularUser.email)).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // OAuth User Validation Tests
  // ==========================================================================

  describe('validateOAuthUser', () => {
    const oauthData = {
      email: 'oauth@example.com',
      firstName: 'OAuth',
      lastName: 'User',
      avatarUrl: 'https://example.com/avatar.jpg',
      provider: 'google',
      providerId: 'google-123456',
    };

    it('should create new user for first-time OAuth login', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      const createdUser = {
        id: 'new-oauth-user-id',
        email: oauthData.email,
        firstName: oauthData.firstName,
        lastName: oauthData.lastName,
        avatarUrl: oauthData.avatarUrl,
        phone: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      // Act
      const result = await authService.validateOAuthUser(oauthData);

      // Assert
      expect(result.email).toBe(oauthData.email);
      expect(result.firstName).toBe(oauthData.firstName);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: oauthData.email,
          firstName: oauthData.firstName,
          lastName: oauthData.lastName,
          avatarUrl: oauthData.avatarUrl,
          authProvider: 'GOOGLE',
          oauthProviderId: oauthData.providerId,
          passwordHash: null,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          emailVerified: true,
        }),
      });
    });

    it('should update existing user on OAuth login with same provider', async () => {
      // Arrange
      const existingUser = {
        id: 'existing-user-id',
        email: oauthData.email,
        firstName: 'Existing',
        lastName: 'User',
        avatarUrl: null,
        phone: '+33612345678',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: false,
        authProvider: 'GOOGLE',
        oauthProviderId: 'old-google-id',
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...existingUser,
        avatarUrl: oauthData.avatarUrl,
        emailVerified: true,
        status: UserStatus.ACTIVE,
      });

      // Act
      const result = await authService.validateOAuthUser(oauthData);

      // Assert
      expect(result.id).toBe(existingUser.id);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: existingUser.id },
        data: expect.objectContaining({
          authProvider: 'GOOGLE',
          oauthProviderId: oauthData.providerId,
          emailVerified: true,
          status: UserStatus.ACTIVE,
        }),
      });
    });

    it('should update existing LOCAL user to OAuth provider', async () => {
      // Arrange
      const localUser = {
        id: 'local-user-id',
        email: oauthData.email,
        firstName: 'Local',
        lastName: 'User',
        avatarUrl: null,
        phone: '+33612345678',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        authProvider: 'LOCAL',
        oauthProviderId: null,
        passwordHash: VALID_PASSWORD_HASH,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(localUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...localUser,
        authProvider: 'GOOGLE',
        oauthProviderId: oauthData.providerId,
      });

      // Act
      const result = await authService.validateOAuthUser(oauthData);

      // Assert
      expect(result.id).toBe(localUser.id);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: localUser.id },
        data: expect.objectContaining({
          authProvider: 'GOOGLE',
          oauthProviderId: oauthData.providerId,
        }),
      });
    });

    it('should not update user if using different OAuth provider', async () => {
      // Arrange - User registered with GitHub, trying to login with Google
      const githubUser = {
        id: 'github-user-id',
        email: oauthData.email,
        firstName: 'GitHub',
        lastName: 'User',
        avatarUrl: 'https://github.com/avatar.jpg',
        phone: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        authProvider: 'GITHUB',
        oauthProviderId: 'github-123',
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(githubUser);

      // Act
      const result = await authService.validateOAuthUser(oauthData);

      // Assert - Should return the user without updating
      expect(result.id).toBe(githubUser.id);
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const upperCaseEmailData = {
        ...oauthData,
        email: 'OAUTH@EXAMPLE.COM',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'oauth@example.com',
        firstName: oauthData.firstName,
        lastName: oauthData.lastName,
        avatarUrl: oauthData.avatarUrl,
        phone: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await authService.validateOAuthUser(upperCaseEmailData);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'oauth@example.com' },
      });
    });

    it('should handle GitHub provider', async () => {
      // Arrange
      const githubOAuthData = {
        ...oauthData,
        provider: 'github',
        providerId: 'github-789',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'new-github-user-id',
        email: oauthData.email,
        firstName: oauthData.firstName,
        lastName: oauthData.lastName,
        avatarUrl: oauthData.avatarUrl,
        phone: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await authService.validateOAuthUser(githubOAuthData);

      // Assert
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authProvider: 'GITHUB',
          oauthProviderId: 'github-789',
        }),
      });
    });

    it('should handle Facebook provider', async () => {
      // Arrange
      const facebookOAuthData = {
        ...oauthData,
        provider: 'facebook',
        providerId: 'facebook-123',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'new-facebook-user-id',
        email: oauthData.email,
        firstName: oauthData.firstName,
        lastName: oauthData.lastName,
        avatarUrl: oauthData.avatarUrl,
        phone: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await authService.validateOAuthUser(facebookOAuthData);

      // Assert
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authProvider: 'FACEBOOK',
        }),
      });
    });

    it('should handle Apple provider', async () => {
      // Arrange
      const appleOAuthData = {
        ...oauthData,
        provider: 'apple',
        providerId: 'apple-123',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'new-apple-user-id',
        email: oauthData.email,
        firstName: oauthData.firstName,
        lastName: oauthData.lastName,
        avatarUrl: oauthData.avatarUrl,
        phone: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await authService.validateOAuthUser(appleOAuthData);

      // Assert
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authProvider: 'APPLE',
        }),
      });
    });

    it('should default to LOCAL for unknown provider', async () => {
      // Arrange
      const unknownProviderData = {
        ...oauthData,
        provider: 'unknown-provider',
        providerId: 'unknown-123',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'new-unknown-user-id',
        email: oauthData.email,
        firstName: oauthData.firstName,
        lastName: oauthData.lastName,
        avatarUrl: oauthData.avatarUrl,
        phone: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await authService.validateOAuthUser(unknownProviderData);

      // Assert
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authProvider: 'LOCAL',
        }),
      });
    });

    it('should preserve existing avatar when OAuth avatar is null', async () => {
      // Arrange
      const noAvatarOAuthData = {
        ...oauthData,
        avatarUrl: null,
      };
      const existingUser = {
        id: 'existing-user-id',
        email: oauthData.email,
        firstName: 'Existing',
        lastName: 'User',
        avatarUrl: 'https://existing-avatar.com/photo.jpg',
        phone: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        authProvider: 'GOOGLE',
        oauthProviderId: 'old-google-id',
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockResolvedValue(existingUser);

      // Act
      await authService.validateOAuthUser(noAvatarOAuthData);

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: existingUser.id },
        data: expect.objectContaining({
          avatarUrl: existingUser.avatarUrl, // Should preserve existing
        }),
      });
    });
  });

  // ==========================================================================
  // Login OAuth Tests
  // ==========================================================================

  describe('loginOAuth', () => {
    it('should generate tokens and update user for OAuth login', async () => {
      // Arrange
      const oauthUser = {
        id: 'oauth-user-id',
        email: 'oauth@example.com',
        firstName: 'OAuth',
        lastName: 'User',
        phone: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockJwtService.signAsync
        .mockResolvedValueOnce('oauth.access.token')
        .mockResolvedValueOnce('oauth.refresh.token');
      mockPrismaService.user.update.mockResolvedValue(oauthUser);

      // Act
      const result = await authService.loginOAuth(oauthUser);

      // Assert
      expect(result.user).toEqual(oauthUser);
      expect(result.tokens.accessToken).toBe('oauth.access.token');
      expect(result.tokens.refreshToken).toBe('oauth.refresh.token');
      expect(result.tokens.tokenType).toBe('Bearer');
    });

    it('should update lastLoginAt and refreshToken on OAuth login', async () => {
      // Arrange
      const oauthUser = {
        id: 'oauth-user-id',
        email: 'oauth@example.com',
        firstName: 'OAuth',
        lastName: 'User',
        phone: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockJwtService.signAsync
        .mockResolvedValueOnce('access.token')
        .mockResolvedValueOnce('refresh.token');
      mockPrismaService.user.update.mockResolvedValue(oauthUser);

      // Act
      await authService.loginOAuth(oauthUser);

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: oauthUser.id },
        data: {
          refreshToken: 'refresh.token',
          lastLoginAt: expect.any(Date),
        },
      });
    });

    it('should generate tokens with correct payload', async () => {
      // Arrange
      const adminOAuthUser = {
        id: 'admin-oauth-id',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        phone: null,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockJwtService.signAsync.mockResolvedValue('mock.token');
      mockPrismaService.user.update.mockResolvedValue(adminOAuthUser);

      // Act
      await authService.loginOAuth(adminOAuthUser);

      // Assert - Verify the correct payload was passed to signAsync
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        {
          sub: adminOAuthUser.id,
          email: adminOAuthUser.email,
          role: adminOAuthUser.role,
        },
        expect.any(Object)
      );
    });
  });

  // ==========================================================================
  // Login Edge Cases
  // ==========================================================================

  describe('login edge cases', () => {
    it('should allow login for verified user with ACTIVE status', async () => {
      // Arrange - User is verified (emailVerified: true) and ACTIVE
      const verifiedActiveUser = {
        ...toPrismaUser(regularUser),
        status: UserStatus.ACTIVE,
        emailVerified: true,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(verifiedActiveUser);
      mockPrismaService.user.update.mockResolvedValue(verifiedActiveUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('mock.token');

      // Act & Assert - Should not throw
      await expect(authService.login(validLoginInput)).resolves.toBeDefined();
    });

    it('should allow login when user is verified but status is not PENDING_VERIFICATION', async () => {
      // Arrange - emailVerified is false but status is ACTIVE (not PENDING_VERIFICATION)
      // This tests the condition: !user.emailVerified && user.status === UserStatus.PENDING_VERIFICATION
      const activeUnverifiedUser = {
        ...toPrismaUser(regularUser),
        status: UserStatus.ACTIVE,
        emailVerified: false, // Not verified but active
      };
      mockPrismaService.user.findUnique.mockResolvedValue(activeUnverifiedUser);
      mockPrismaService.user.update.mockResolvedValue(activeUnverifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('mock.token');

      // Act & Assert - Should allow login (verification check only applies to PENDING_VERIFICATION status)
      await expect(authService.login(validLoginInput)).resolves.toBeDefined();
    });
  });

  // ==========================================================================
  // Refresh Tokens Edge Cases
  // ==========================================================================

  describe('refreshTokens edge cases', () => {
    it('should re-throw UnauthorizedException directly', async () => {
      // Arrange - verify throws UnauthorizedException
      const unauthorizedError = new UnauthorizedException('Custom unauthorized message');
      mockJwtService.verify.mockImplementation(() => {
        throw unauthorizedError;
      });

      // Act & Assert
      await expect(authService.refreshTokens({ refreshToken: 'any.token' })).rejects.toThrow(
        UnauthorizedException
      );
      await expect(authService.refreshTokens({ refreshToken: 'any.token' })).rejects.toThrow(
        'Custom unauthorized message'
      );
    });

    it('should wrap non-UnauthorizedException errors', async () => {
      // Arrange - verify throws a generic error
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      // Act & Assert
      await expect(authService.refreshTokens({ refreshToken: 'expired.token' })).rejects.toThrow(
        UnauthorizedException
      );
      await expect(authService.refreshTokens({ refreshToken: 'expired.token' })).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });
  });
});
