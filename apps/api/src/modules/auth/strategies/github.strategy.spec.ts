/**
 * GitHub OAuth Strategy Unit Tests
 *
 * Comprehensive tests for GitHub OAuth authentication strategy including:
 * - OAuth callback handling
 * - Profile data extraction
 * - Name parsing from displayName
 * - User creation/update via authService
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { GitHubStrategy } from './github.strategy';
import { AuthService } from '../auth.service';
import { Profile } from 'passport-github2';

// ============================================================================
// Mock Setup
// ============================================================================

const mockAuthService = {
  validateOAuthUser: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      GITHUB_CLIENT_ID: 'test-github-client-id',
      GITHUB_CLIENT_SECRET: 'test-github-client-secret',
      GITHUB_CALLBACK_URL: 'http://localhost:3333/api/auth/github/callback',
      API_URL: 'http://localhost:3333',
    };
    return config[key];
  }),
};

const createMockProfile = (overrides: Partial<Profile> = {}): Profile =>
  ({
    id: 'github-12345678',
    displayName: 'Test User',
    username: 'testuser',
    emails: [{ value: 'test@github.com' }],
    photos: [{ value: 'https://avatars.githubusercontent.com/u/12345678' }],
    provider: 'github',
    _raw: '{}',
    _json: {},
    ...overrides,
  }) as Profile;

describe('GitHubStrategy', () => {
  let strategy: GitHubStrategy;
  let authService: typeof mockAuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubStrategy,
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

    strategy = module.get<GitHubStrategy>(GitHubStrategy);
    authService = mockAuthService;
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should read GitHub OAuth configuration', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('GITHUB_CLIENT_ID');
      expect(mockConfigService.get).toHaveBeenCalledWith('GITHUB_CLIENT_SECRET');
    });
  });

  describe('validate', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@github.com',
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
          email: 'test@github.com',
          firstName: 'Test',
          lastName: 'User',
          avatarUrl: 'https://avatars.githubusercontent.com/u/12345678',
          provider: 'github',
          providerId: 'github-12345678',
        });
      });

      it('should extract first email from emails array', async () => {
        const profile = createMockProfile({
          emails: [{ value: 'primary@github.com' }, { value: 'secondary@example.com' }],
        });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'primary@github.com',
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

    describe('name parsing', () => {
      it('should parse displayName with space into firstName and lastName', async () => {
        const profile = createMockProfile({ displayName: 'John Doe' });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
          })
        );
      });

      it('should handle displayName with multiple spaces', async () => {
        const profile = createMockProfile({ displayName: 'John Michael Doe' });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'John',
            lastName: 'Michael Doe',
          })
        );
      });

      it('should use displayName as firstName when no space', async () => {
        const profile = createMockProfile({ displayName: 'JohnDoe' });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'JohnDoe',
            lastName: '',
          })
        );
      });

      it('should use username when displayName is empty', async () => {
        const profile = createMockProfile({ displayName: '', username: 'octocat' });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'octocat',
            lastName: '',
          })
        );
      });

      it('should use username when displayName is null', async () => {
        const profile = createMockProfile({
          displayName: null as unknown as string,
          username: 'octocat',
        });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'octocat',
            lastName: '',
          })
        );
      });

      it('should use default when both displayName and username are empty', async () => {
        const profile = createMockProfile({
          displayName: '',
          username: '',
        });
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

      it('should include helpful message for missing email', async () => {
        const profile = createMockProfile({ emails: [] });
        const done = jest.fn();

        await strategy.validate('access-token', 'refresh-token', profile, done);

        const error = done.mock.calls[0][0];
        expect(error.message).toContain('No email associated with this GitHub account');
        expect(error.message).toContain('make your email public');
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
      it('should handle profile with unicode characters in displayName', async () => {
        const profile = createMockProfile({ displayName: 'Étienne Müller' });
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

      it('should handle profile with CJK characters in displayName', async () => {
        const profile = createMockProfile({ displayName: '田中 太郎' });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: '田中',
            lastName: '太郎',
          })
        );
      });

      it('should handle noreply github email', async () => {
        const profile = createMockProfile({
          emails: [{ value: '12345678+username@users.noreply.github.com' }],
        });
        const done = jest.fn();
        authService.validateOAuthUser.mockResolvedValue(mockUser);

        await strategy.validate('access-token', 'refresh-token', profile, done);

        expect(authService.validateOAuthUser).toHaveBeenCalledWith(
          expect.objectContaining({
            email: '12345678+username@users.noreply.github.com',
          })
        );
      });
    });
  });
});
