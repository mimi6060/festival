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
import { UserRole, UserStatus, User } from '@prisma/client';
import { RegisterDto, LoginDto, RefreshTokenDto, ResetPasswordDto, ChangePasswordDto } from './dto';
import { EmailService } from '../email/email.service';

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
    private readonly configService: ConfigService,
    private readonly emailService: EmailService
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

    // Send verification email
    await this.sendVerificationEmail(user.id, user.email, user.firstName);

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
  async verifyEmail(token: string): Promise<void> {
    // Hash the received token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching token that hasn't expired
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user: mark as verified and activate account
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
        emailVerificationToken: null,
        emailVerificationExpires: null,
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

    // Send password reset email with the unhashed token
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await this.emailService.sendPasswordResetEmail(user.email, {
      firstName: user.firstName,
      resetUrl,
      expiresIn: '1 hour',
    });

    this.logger.log(`Password reset email sent to: ${normalizedEmail}`);
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
   * Send verification email to user
   */
  async sendVerificationEmail(userId: string, email: string, firstName: string): Promise<void> {
    // Generate a random verification token (32 bytes = 64 hex chars)
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing in database
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    // Token expires in 24 hours
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store hashed token and expiry in database
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: tokenExpiry,
      },
    });

    // Send verification email with the unhashed token
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    await this.emailService.sendVerificationEmail(email, {
      firstName,
      verificationUrl,
      expiresIn: '24 hours',
    });

    this.logger.log(`Verification email sent to: ${email}`);
  }

  /**
   * Resend verification email (with rate limiting)
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Don't reveal if email exists - always return success
      this.logger.log(`Resend verification requested for non-existent email: ${normalizedEmail}`);
      return;
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Check if a token was recently sent (within the last 10 minutes) to prevent spam
    if (user.emailVerificationExpires) {
      const tokenAge = Date.now() - (user.emailVerificationExpires.getTime() - 24 * 60 * 60 * 1000);
      const tenMinutesInMs = 10 * 60 * 1000;

      if (tokenAge < tenMinutesInMs) {
        throw new BadRequestException('Verification email was recently sent. Please wait a few minutes before requesting again.');
      }
    }

    // Send new verification email
    await this.sendVerificationEmail(user.id, user.email, user.firstName);
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
