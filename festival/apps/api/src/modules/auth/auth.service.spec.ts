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
import { PrismaService } from '../prisma/prisma.service';
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
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

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
  };

  beforeEach(async () => {
    // Reset mocks for Prisma and JWT only, ConfigService must maintain its values
    mockPrismaService.user.findUnique.mockReset();
    mockPrismaService.user.findFirst.mockReset();
    mockPrismaService.user.create.mockReset();
    mockPrismaService.user.update.mockReset();
    mockPrismaService.user.count.mockReset();
    mockJwtService.signAsync.mockReset();
    mockJwtService.verify.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

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
      await expect(authService.register({
        ...validRegistrationInput,
        email: regularUser.email,
      })).rejects.toThrow(ConflictException);
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
      mockPrismaService.user.create.mockImplementation((args) => Promise.resolve({
        id: 'new-user-id',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

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
        }),
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
      mockPrismaService.user.create.mockImplementation((args) => Promise.resolve({
        id: 'new-user-id',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      await authService.register(inputWithoutPhone);

      // Assert
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: null,
          }),
        }),
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
      expect(result.tokens.expiresIn).toBe(900);
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login({
        email: 'nonexistent@example.com',
        password: VALID_PASSWORD,
      })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(regularUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login({
        email: regularUser.email,
        password: 'wrong-password',
      })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for banned user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(bannedUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(authService.login({
        email: bannedUser.email,
        password: VALID_PASSWORD,
      })).rejects.toThrow(UnauthorizedException);
      await expect(authService.login({
        email: bannedUser.email,
        password: VALID_PASSWORD,
      })).rejects.toThrow('Your account has been banned');
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(inactiveUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(authService.login({
        email: inactiveUser.email,
        password: VALID_PASSWORD,
      })).rejects.toThrow(UnauthorizedException);
      await expect(authService.login({
        email: inactiveUser.email,
        password: VALID_PASSWORD,
      })).rejects.toThrow('Your account is inactive');
    });

    it('should throw UnauthorizedException for unverified email', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(unverifiedUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(authService.login({
        email: unverifiedUser.email,
        password: VALID_PASSWORD,
      })).rejects.toThrow(UnauthorizedException);
      await expect(authService.login({
        email: unverifiedUser.email,
        password: VALID_PASSWORD,
      })).rejects.toThrow('Please verify your email');
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
        }),
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
        }),
      );
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(authService.refreshTokens({
        refreshToken: 'invalid.token',
      })).rejects.toThrow(UnauthorizedException);
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
      await expect(authService.refreshTokens({
        refreshToken: 'provided.refresh.token',
      })).rejects.toThrow(UnauthorizedException);
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
      await expect(authService.refreshTokens({
        refreshToken: 'valid.token',
      })).rejects.toThrow(UnauthorizedException);
    });
  });

  // ==========================================================================
  // Password Change Tests
  // ==========================================================================

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      // Arrange
      const user = toPrismaUser(regularUser);
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)  // Current password check
        .mockResolvedValueOnce(false); // New password different check
      (bcrypt.hash as jest.Mock).mockResolvedValue('new.password.hash');
      mockPrismaService.user.update.mockResolvedValue(user);

      // Act
      await authService.changePassword(user.id, {
        currentPassword: VALID_PASSWORD,
        newPassword: 'NewPassword456!',
      });

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(VALID_PASSWORD, user.passwordHash);
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword456!', 12);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { passwordHash: 'new.password.hash' },
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.changePassword('non-existent-id', {
        currentPassword: VALID_PASSWORD,
        newPassword: 'NewPassword456!',
      })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if current password is incorrect', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(regularUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.changePassword(regularUser.id, {
        currentPassword: 'wrong-password',
        newPassword: 'NewPassword456!',
      })).rejects.toThrow(BadRequestException);
      await expect(authService.changePassword(regularUser.id, {
        currentPassword: 'wrong-password',
        newPassword: 'NewPassword456!',
      })).rejects.toThrow('Current password is incorrect');
    });

    it('should throw BadRequestException if new password is same as current', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(toPrismaUser(regularUser));
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)  // Current password check
        .mockResolvedValueOnce(true); // Same password check

      // Act & Assert
      await expect(authService.changePassword(regularUser.id, {
        currentPassword: VALID_PASSWORD,
        newPassword: VALID_PASSWORD,
      })).rejects.toThrow(BadRequestException);
      await expect(authService.changePassword(regularUser.id, {
        currentPassword: VALID_PASSWORD,
        newPassword: VALID_PASSWORD,
      })).rejects.toThrow('New password must be different');
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
      await expect(authService.getCurrentUser('non-existent-id')).rejects.toThrow(NotFoundException);
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
      const user = toPrismaUser(regularUser);
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
          refreshToken: null, // Sessions invalidated
        },
      });
    });

    it('should throw BadRequestException for invalid reset token', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.resetPassword({
        token: 'invalid-token',
        newPassword: 'NewSecurePass123!',
      })).rejects.toThrow(BadRequestException);
    });
  });
});
