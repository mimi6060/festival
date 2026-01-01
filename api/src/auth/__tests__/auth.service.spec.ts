import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService, TokenResponse, RegisterResponse } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from '../dto';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  // Mock data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+33612345678',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  const mockAuthenticatedUser: AuthenticatedUser = {
    id: mockUser.id,
    email: mockUser.email,
    role: mockUser.role,
    status: mockUser.status,
    firstName: mockUser.firstName,
    lastName: mockUser.lastName,
  };

  const mockRegisterDto: RegisterDto = {
    email: 'newuser@example.com',
    password: 'SecureP@ss123',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+33612345679',
  };

  beforeEach(async () => {
    // Create mock implementations
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'jwt.expiresIn': '15m',
          'jwt.refreshExpiresIn': '7d',
          'jwt.refreshSecret': 'test-refresh-secret',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      const createdUser = {
        ...mockUser,
        id: 'new-user-id',
        email: mockRegisterDto.email.toLowerCase(),
        firstName: mockRegisterDto.firstName,
        lastName: mockRegisterDto.lastName,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
      };
      (prismaService.user.create as jest.Mock).mockResolvedValue(createdUser);

      // Act
      const result = await service.register(mockRegisterDto);

      // Assert
      expect(result).toEqual({
        user: {
          id: createdUser.id,
          email: createdUser.email,
          firstName: createdUser.firstName,
          lastName: createdUser.lastName,
          role: createdUser.role,
        },
        message:
          'Registration successful. Please check your email to verify your account.',
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockRegisterDto.email.toLowerCase().trim() },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(mockRegisterDto.password, 12);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: mockRegisterDto.email.toLowerCase().trim(),
          firstName: mockRegisterDto.firstName.trim(),
          lastName: mockRegisterDto.lastName.trim(),
          role: UserRole.USER,
          status: UserStatus.PENDING_VERIFICATION,
          emailVerified: false,
        }),
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        'An account with this email already exists',
      );
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on database error', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      (prismaService.user.create as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      // Act & Assert
      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        'Failed to create account',
      );
    });

    it('should normalize email to lowercase and trim whitespace', async () => {
      // Arrange
      const dtoWithSpaces = {
        ...mockRegisterDto,
        email: '  TEST@EXAMPLE.COM  ',
        firstName: '  John  ',
        lastName: '  Doe  ',
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      (prismaService.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        email: 'test@example.com',
      });

      // Act
      await service.register(dtoWithSpaces);

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        }),
      });
    });
  });

  describe('validateUser', () => {
    it('should return authenticated user for valid credentials', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.validateUser('test@example.com', 'password');

      // Assert
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        status: mockUser.status,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });
    });

    it('should return null for non-existent user', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('dummy-hash');

      // Act
      const result = await service.validateUser('nonexistent@example.com', 'password');

      // Assert
      expect(result).toBeNull();
      // Should still hash to prevent timing attacks
      expect(bcrypt.hash).toHaveBeenCalledWith('dummy-password', 12);
    });

    it('should return null for wrong password', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.validateUser('test@example.com', 'wrong-password');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException for banned user', async () => {
      // Arrange
      const bannedUser = { ...mockUser, status: UserStatus.BANNED };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(bannedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow('Account has been banned');
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, status: UserStatus.INACTIVE };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(inactiveUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow('Account is inactive');
    });

    it('should normalize email when searching', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      await service.validateUser('  TEST@EXAMPLE.COM  ', 'password');

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      // Arrange
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await service.generateTokens(mockAuthenticatedUser);

      // Assert
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: 900, // 15 minutes in seconds
      });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockAuthenticatedUser.id },
        data: expect.objectContaining({
          refreshToken: expect.any(String),
          lastLoginAt: expect.any(Date),
        }),
      });
    });

    it('should sign access token with correct payload', async () => {
      // Arrange
      (jwtService.signAsync as jest.Mock).mockResolvedValue('token');
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);

      // Act
      await service.generateTokens(mockAuthenticatedUser);

      // Assert
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        {
          sub: mockAuthenticatedUser.id,
          email: mockAuthenticatedUser.email,
          role: mockAuthenticatedUser.role,
        },
        { expiresIn: 900 },
      );
    });

    it('should sign refresh token with refresh secret', async () => {
      // Arrange
      (jwtService.signAsync as jest.Mock).mockResolvedValue('token');
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);

      // Act
      await service.generateTokens(mockAuthenticatedUser);

      // Assert
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        { sub: mockAuthenticatedUser.id, type: 'refresh' },
        {
          secret: 'test-refresh-secret',
          expiresIn: 604800, // 7 days in seconds
        },
      );
    });
  });

  describe('login', () => {
    it('should generate tokens for authenticated user', async () => {
      // Arrange
      const mockTokens: TokenResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      };
      jest.spyOn(service, 'generateTokens').mockResolvedValue(mockTokens);

      // Act
      const result = await service.login(mockAuthenticatedUser);

      // Assert
      expect(result).toEqual(mockTokens);
      expect(service.generateTokens).toHaveBeenCalledWith(mockAuthenticatedUser);
    });
  });

  describe('refreshTokens', () => {
    const validRefreshToken = 'valid-refresh-token';

    it('should refresh tokens for valid refresh token', async () => {
      // Arrange
      const hashedToken = crypto
        .createHash('sha256')
        .update(validRefreshToken)
        .digest('hex');
      const userWithRefreshToken = {
        ...mockUser,
        refreshToken: hashedToken,
      };

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: mockUser.id,
        type: 'refresh',
      });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        userWithRefreshToken,
      );
      (jwtService.signAsync as jest.Mock).mockResolvedValue('new-token');
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await service.refreshTokens(validRefreshToken);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
    });

    it('should throw UnauthorizedException for invalid token type', async () => {
      // Arrange
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: mockUser.id,
        type: 'access', // Wrong type
      });

      // Act & Assert
      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        'Invalid token type',
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      // Arrange
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'non-existent-id',
        type: 'refresh',
      });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException for token mismatch (token reuse detection)', async () => {
      // Arrange
      const userWithDifferentToken = {
        ...mockUser,
        refreshToken: 'different-hash',
      };

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: mockUser.id,
        type: 'refresh',
      });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        userWithDifferentToken,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        'Token has been revoked',
      );

      // Should invalidate all tokens
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken: null },
      });
    });

    it('should throw UnauthorizedException for banned user during refresh', async () => {
      // Arrange
      const hashedToken = crypto
        .createHash('sha256')
        .update(validRefreshToken)
        .digest('hex');
      const bannedUser = {
        ...mockUser,
        status: UserStatus.BANNED,
        refreshToken: hashedToken,
      };

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: mockUser.id,
        type: 'refresh',
      });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(bannedUser);

      // Act & Assert
      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        'Account has been banned',
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      // Arrange
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(
        new Error('Token expired'),
      );

      // Act & Assert
      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });
  });

  describe('invalidateRefreshToken', () => {
    it('should set refreshToken to null', async () => {
      // Arrange
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);

      // Act
      await service.invalidateRefreshToken(mockUser.id);

      // Assert
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken: null },
      });
    });
  });

  describe('forgotPassword', () => {
    it('should return success message for existing user', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await service.forgotPassword({ email: mockUser.email });

      // Assert
      expect(result.message).toContain(
        'If an account with that email exists',
      );
    });

    it('should return same message for non-existent user (prevents enumeration)', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.forgotPassword({ email: 'nonexistent@example.com' });

      // Assert
      expect(result.message).toContain(
        'If an account with that email exists',
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await service.getProfile(mockUser.id);

      // Assert
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        status: mockUser.status,
      });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getProfile('non-existent')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.getProfile('non-existent')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      // Arrange
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      // Act
      const result = await service.hashPassword('plain-password');

      // Assert
      expect(result).toBe('hashed-password');
      expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', 12);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.comparePassword('plain', 'hashed');

      // Assert
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('plain', 'hashed');
    });

    it('should return false for non-matching passwords', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.comparePassword('wrong', 'hashed');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a 64-character hex token', () => {
      // Act
      const token = service.generateSecureToken();

      // Assert
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique tokens', () => {
      // Act
      const token1 = service.generateSecureToken();
      const token2 = service.generateSecureToken();

      // Assert
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should hash token with SHA-256', () => {
      // Arrange
      const token = 'test-token';
      const expectedHash = crypto.createHash('sha256').update(token).digest('hex');

      // Act
      const result = service.hashToken(token);

      // Assert
      expect(result).toBe(expectedHash);
      expect(result).toHaveLength(64);
    });
  });
});
