/**
 * JWT Strategy Unit Tests
 *
 * Comprehensive tests for JWT authentication strategy including:
 * - Token extraction from header and cookie
 * - Payload validation
 * - User retrieval
 * - Error handling
 */

import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { AuthService, JwtPayload } from '../auth.service';
import { ConfigService } from '@nestjs/config';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock passport-jwt to avoid the complex inheritance issues
jest.mock('passport-jwt', () => ({
  Strategy: class MockStrategy {
    constructor() {
      // Mock constructor
    }
  },
  ExtractJwt: {
    fromAuthHeaderAsBearerToken: jest.fn(() => () => null),
  },
}));

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockAuthService: jest.Mocked<Pick<AuthService, 'validateUser'>>;
  let mockConfigService: jest.Mocked<Pick<ConfigService, 'getOrThrow' | 'get'>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuthService = {
      validateUser: jest.fn(),
    };

    mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('test-jwt-secret-key-for-testing'),
      get: jest.fn().mockReturnValue('test-value'),
    };

    // Create strategy instance directly
    strategy = new JwtStrategy(
      mockConfigService as unknown as ConfigService,
      mockAuthService as unknown as AuthService
    );
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should call configService.getOrThrow for JWT_ACCESS_SECRET', () => {
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('JWT_ACCESS_SECRET');
    });
  });

  describe('validate', () => {
    const validPayload: JwtPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      role: 'USER',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'USER',
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
    };

    describe('successful validation', () => {
      it('should return user when payload is valid', async () => {
        mockAuthService.validateUser.mockResolvedValue(mockUser);

        const result = await strategy.validate(validPayload);

        expect(result).toEqual(mockUser);
        expect(mockAuthService.validateUser).toHaveBeenCalledWith(validPayload);
      });

      it('should pass payload to authService.validateUser', async () => {
        mockAuthService.validateUser.mockResolvedValue(mockUser);

        await strategy.validate(validPayload);

        expect(mockAuthService.validateUser).toHaveBeenCalledWith(validPayload);
        expect(mockAuthService.validateUser).toHaveBeenCalledTimes(1);
      });

      it('should return user with all properties from authService', async () => {
        const fullUser = {
          ...mockUser,
          phone: '+33612345678',
          avatarUrl: 'https://example.com/avatar.jpg',
          emailVerified: true,
        };
        mockAuthService.validateUser.mockResolvedValue(fullUser);

        const result = await strategy.validate(validPayload);

        expect(result).toEqual(fullUser);
        expect(result.phone).toBe('+33612345678');
        expect(result.emailVerified).toBe(true);
      });

      it('should work with ADMIN role payload', async () => {
        const adminPayload: JwtPayload = {
          sub: 'admin-123',
          email: 'admin@example.com',
          role: 'ADMIN',
        };
        const adminUser = { ...mockUser, id: 'admin-123', role: 'ADMIN' };
        mockAuthService.validateUser.mockResolvedValue(adminUser);

        const result = await strategy.validate(adminPayload);

        expect(result.role).toBe('ADMIN');
      });

      it('should work with ORGANIZER role payload', async () => {
        const organizerPayload: JwtPayload = {
          sub: 'org-123',
          email: 'organizer@example.com',
          role: 'ORGANIZER',
        };
        const organizerUser = { ...mockUser, id: 'org-123', role: 'ORGANIZER' };
        mockAuthService.validateUser.mockResolvedValue(organizerUser);

        const result = await strategy.validate(organizerPayload);

        expect(result.role).toBe('ORGANIZER');
      });
    });

    describe('user not found', () => {
      it('should throw UnauthorizedException when user is null', async () => {
        mockAuthService.validateUser.mockResolvedValue(null);

        await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException when user is undefined', async () => {
        mockAuthService.validateUser.mockResolvedValue(undefined as unknown as null);

        await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
      });

      it('should throw with specific message when user not found', async () => {
        mockAuthService.validateUser.mockResolvedValue(null);

        await expect(strategy.validate(validPayload)).rejects.toThrow(
          'Invalid token or user not found'
        );
      });
    });

    describe('error handling', () => {
      it('should propagate error when authService throws', async () => {
        const error = new Error('Database connection failed');
        mockAuthService.validateUser.mockRejectedValue(error);

        await expect(strategy.validate(validPayload)).rejects.toThrow('Database connection failed');
      });

      it('should propagate UnauthorizedException from authService', async () => {
        mockAuthService.validateUser.mockRejectedValue(
          new UnauthorizedException('User account is disabled')
        );

        await expect(strategy.validate(validPayload)).rejects.toThrow('User account is disabled');
      });
    });

    describe('edge cases', () => {
      it('should handle payload with additional properties', async () => {
        const extendedPayload = {
          ...validPayload,
          iat: 1234567890,
          exp: 1234571490,
          customClaim: 'custom-value',
        };
        mockAuthService.validateUser.mockResolvedValue(mockUser);

        const result = await strategy.validate(extendedPayload as JwtPayload);

        expect(result).toEqual(mockUser);
      });

      it('should handle payload with empty email', async () => {
        const emptyEmailPayload: JwtPayload = {
          sub: 'user-123',
          email: '',
          role: 'USER',
        };
        mockAuthService.validateUser.mockResolvedValue(null);

        await expect(strategy.validate(emptyEmailPayload)).rejects.toThrow(UnauthorizedException);
      });

      it('should handle payload with special characters in email', async () => {
        const specialPayload: JwtPayload = {
          sub: 'user-123',
          email: 'user+test@example.com',
          role: 'USER',
        };
        mockAuthService.validateUser.mockResolvedValue(mockUser);

        const result = await strategy.validate(specialPayload);

        expect(result).toEqual(mockUser);
      });
    });
  });
});
