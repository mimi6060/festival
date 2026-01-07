/**
 * Authentication Service
 *
 * Handles all authentication-related business logic including:
 * - User registration
 * - Login/logout with JWT tokens
 * - Password reset flow
 * - Token refresh
 * - Email verification
 */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus, User, AuthProvider } from '@prisma/client';
import { RegisterDto, LoginDto, RefreshTokenDto, ResetPasswordDto, ChangePasswordDto } from './dto';

// OAuth user data interface
export interface OAuthUserData {
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  provider: string;
  providerId: string;
}

// ============================================================================
// Types
// ============================================================================

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResult {
  user: AuthenticatedUser;
  tokens: AuthTokens;
}

export interface RegisterResult {
  user: AuthenticatedUser;
  message: string;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptSaltRounds = 12;
  private readonly accessTokenExpiresIn: number;
  private readonly refreshTokenExpiresIn: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {
    // Token expiration in seconds - fail fast if not configured
    this.accessTokenExpiresIn = this.configService.getOrThrow<number>('JWT_ACCESS_EXPIRES_IN');
    this.refreshTokenExpiresIn = this.configService.getOrThrow<number>('JWT_REFRESH_EXPIRES_IN');

    // Validate JWT secrets are configured at startup
    this.validateJwtSecrets();
  }

  /**
   * Validate that all required JWT secrets are configured
   * Fails fast on application startup if secrets are missing
   */
  private validateJwtSecrets(): void {
    this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.logger.log('JWT secrets validated successfully');
  }

  /**
   * Register a new user
   */
  async register(dto: RegisterDto): Promise<RegisterResult> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptSaltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim() || null,
        role: UserRole.USER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
      },
    });

    this.logger.log(`New user registered: ${normalizedEmail}`);

    // TODO: Send verification email

    return {
      user: this.sanitizeUser(user),
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  /**
   * Login with email and password
   */
  async login(dto: LoginDto): Promise<LoginResult> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check user status
    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('Your account has been banned');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Your account is inactive');
    }

    // Check email verification (optional - can be made configurable)
    if (!user.emailVerified && user.status === UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Update refresh token and last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLoginAt: new Date(),
      },
    });

    this.logger.log(`User logged in: ${normalizedEmail}`);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Logout user by invalidating refresh token
   */
  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(dto: RefreshTokenDto): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      // Find user and verify refresh token matches
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (user?.refreshToken !== dto.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user.id, user.email, user.role);

      // Update refresh token
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken },
      });

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(_token: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Verify the token from a verification_tokens table
    // 2. Update the user's emailVerified status
    // 3. Activate the account

    // For now, this is a placeholder
    const user = await this.prisma.user.findFirst({
      where: {
        status: UserStatus.PENDING_VERIFICATION,
        // In reality: verification token would be checked
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: UserStatus.ACTIVE,
      },
    });

    this.logger.log(`Email verified for user: ${user.email}`);
  }

  /**
   * Initiate password reset
   */
  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      this.logger.log(`Password reset requested for non-existent email: ${normalizedEmail}`);
      return;
    }

    // Generate a random reset token (32 bytes = 64 hex chars)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing in database
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token expires in 1 hour
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Store hashed token and expiry in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry,
      },
    });

    // TODO: Send email with resetToken (unhashed) to user
    // The resetToken should be sent in the email as a link: /reset-password?token={resetToken}
    this.logger.log(`Password reset token generated for: ${normalizedEmail}`);
  }

  /**
   * Reset password with token
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    // Hash the received token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(dto.token).digest('hex');

    // Find user with matching token that hasn't expired
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gt: new Date() },
        status: UserStatus.ACTIVE,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(dto.newPassword, this.bcryptSaltRounds);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        refreshToken: null, // Invalidate all sessions
      },
    });

    this.logger.log(`Password reset completed for user: ${user.email}`);
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Check new password is different
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);

    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Update password
    const passwordHash = await bcrypt.hash(dto.newPassword, this.bcryptSaltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    this.logger.log(`Password changed for user: ${user.email}`);
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Validate user for JWT strategy
   */
  async validateUser(payload: JwtPayload): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status === UserStatus.BANNED || user.status === UserStatus.INACTIVE) {
      return null;
    }

    return this.sanitizeUser(user);
  }

  /**
   * Validate or create OAuth user
   * Called by OAuth strategies (Google, GitHub, etc.)
   */
  async validateOAuthUser(oauthData: OAuthUserData): Promise<AuthenticatedUser> {
    const normalizedEmail = oauthData.email.toLowerCase().trim();
    const provider = this.mapProviderString(oauthData.provider);

    // Try to find existing user by email
    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // User exists - update OAuth info if using same provider
      if (user.authProvider === provider || user.authProvider === AuthProvider.LOCAL) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            authProvider: provider,
            oauthProviderId: oauthData.providerId,
            avatarUrl: oauthData.avatarUrl || user.avatarUrl,
            emailVerified: true, // OAuth emails are verified
            status: UserStatus.ACTIVE,
            lastLoginAt: new Date(),
          },
        });
      }

      this.logger.log(
        `OAuth login for existing user: ${normalizedEmail} via ${oauthData.provider}`
      );
    } else {
      // Create new user from OAuth
      user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          firstName: oauthData.firstName.trim(),
          lastName: oauthData.lastName.trim(),
          avatarUrl: oauthData.avatarUrl,
          authProvider: provider,
          oauthProviderId: oauthData.providerId,
          passwordHash: null, // No password for OAuth users
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          emailVerified: true, // OAuth emails are verified
        },
      });

      this.logger.log(`New OAuth user created: ${normalizedEmail} via ${oauthData.provider}`);
    }

    return this.sanitizeUser(user);
  }

  /**
   * Generate tokens for OAuth user after successful authentication
   */
  async loginOAuth(user: AuthenticatedUser): Promise<LoginResult> {
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Update refresh token and last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLoginAt: new Date(),
      },
    });

    return {
      user,
      tokens,
    };
  }

  /**
   * Map provider string to AuthProvider enum
   */
  private mapProviderString(provider: string): AuthProvider {
    switch (provider.toLowerCase()) {
      case 'google':
        return AuthProvider.GOOGLE;
      case 'github':
        return AuthProvider.GITHUB;
      case 'facebook':
        return AuthProvider.FACEBOOK;
      case 'apple':
        return AuthProvider.APPLE;
      default:
        return AuthProvider.LOCAL;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(userId: string, email: string, role: UserRole): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.refreshTokenExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiresIn,
      tokenType: 'Bearer',
    };
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
