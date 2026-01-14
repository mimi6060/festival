/**
 * Google OAuth Strategy Unit Tests
 *
 * Comprehensive tests for Google OAuth authentication strategy including:
 * - OAuth callback handling
 * - Profile data extraction
 * - User creation/update via authService
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { GoogleStrategy } from './google.strategy';
import { AuthService } from '../auth.service';
import { Profile } from 'passport-google-oauth20';

// ============================================================================
// Mock Setup
// ============================================================================

const mockAuthService = {
  validateOAuthUser: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:3333/api/auth/google/callback',
      API_URL: 'http://localhost:3333',
    };
    return config[key];
  }),
};

const createMockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'google-123456789',
  displayName: 'Test User',
  name: {
    familyName: 'User',
    givenName: 'Test',
  },
  emails: [{ value: 'test@gmail.com', verified: true }],
  photos: [{ value: 'https://lh3.googleusercontent.com/photo.jpg' }],
  provider: 'google',
  _raw: '{}',
  _json: {} as Profile['_json'],
  ...overrides,
});

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let authService: typeof mockAuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    authService = mockAuthService;
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should read Google OAuth configuration', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('GOOGLE_CLIENT_ID');
      expect(mockConfigService.get).toHaveBeenCalledWith('GOOGLE_CLIENT_SECRET');
    });
  });

  describe('validate', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@gmail.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      status: 'ACTIVE',
    };

    describe('successful validation', () => {
      it('should call done with user when profile is valid', async () => {
        const profile = createMockProfile();
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(done).toHaveBeenCalledWith(null, mockUser);
      });

      it('should call authService.validateOAuthUser with correct data', async () => {
        const profile = createMockProfile();
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith({
          email: 'test@gmail.com',
          firstName: 'Test',
          lastName: 'User',
          avatarUrl: 'https://lh3.googleusercontent.com/photo.jpg',
          provider: 'google',
          providerId: 'google-123456789',
        });
      });

      it('should extract first email from emails array', async () => {
        const profile = createMockProfile({
          emails: [
            { value: 'primary@gmail.com', verified: true },
            { value: 'secondary@gmail.com', verified: true },
          ],
        });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'primary@gmail.com',
          })
        );
      });

      it('should handle profile without photos', async () => {
        const profile = createMockProfile({ photos: undefined });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            avatarUrl: null,
          })
        );
      });

      it('should handle profile with empty photos array', async () => {
        const profile = createMockProfile({ photos: [] });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            avatarUrl: null,
          })
        );
      });
    });

    describe('missing name fields', () => {
      it('should use default firstName when givenName is missing', async () => {
        const profile = createMockProfile({
          name: { familyName: 'User', givenName: undefined },
        });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'User',
          })
        );
      });

      it('should use empty lastName when familyName is missing', async () => {
        const profile = createMockProfile({
          name: { givenName: 'Test', familyName: undefined },
        });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            lastName: '',
          })
        );
      });

      it('should handle profile with no name object', async () => {
        const profile = createMockProfile({ name: undefined });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'User',
            lastName: '',
          })
        );
      });
    });

    describe('missing email', () => {
      it('should call done with UnauthorizedException when no emails', async () => {
        const profile = createMockProfile({ emails: undefined });
        const done = jest.fn();

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(done).toHaveBeenCalledWith(expect.any(UnauthorizedException), undefined);
      });

      it('should call done with UnauthorizedException when emails array is empty', async () => {
        const profile = createMockProfile({ emails: [] });
        const done = jest.fn();

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(done).toHaveBeenCalledWith(expect.any(UnauthorizedException), undefined);
      });

      it('should include specific message for missing email', async () => {
        const profile = createMockProfile({ emails: [] });
        const done = jest.fn();

        await strategy.validate('access-token', 'refresh-token', profile, done);

        const error = done.mock.calls[0][0];
        expect(error.message).toBe('No email provided by Google');
      });
    });

    describe('error handling', () => {
      it('should call done with error when authService throws', async () => {
        const profile = createMockProfile();
        const done = jest.fn();
        const error = new Error('Database error');
        authService.validateOAuthUser.mockRejectedValue(error);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(done).toHaveBeenCalledWith(error, undefined);
      });

      it('should propagate UnauthorizedException from authService', async () => {
        const profile = createMockProfile();
        const done = jest.fn();
        const error = new UnauthorizedException('User is banned');
        authService.validateOAuthUser.mockRejectedValue(error);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(done).toHaveBeenCalledWith(error, undefined);
      });
    });

    describe('edge cases', () => {
      it('should handle profile with unicode characters in name', async () => {
        const profile = createMockProfile({
          name: { givenName: 'Étienne', familyName: 'Müller' },
        });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'Étienne',
            lastName: 'Müller',
          })
        );
      });

      it('should handle profile with very long names', async () => {
        const longName = 'A'.repeat(100);
        const profile = createMockProfile({
          name: { givenName: longName, familyName: longName },
        });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: longName,
            lastName: longName,
          })
        );
      });

      it('should handle google+ style email addresses', async () => {
        const profile = createMockProfile({
          emails: [{ value: 'user+tag@gmail.com', verified: true }],
        });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'user+tag@gmail.com',
          })
        );
      });
    });
  });
});
