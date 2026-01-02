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
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto';

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
  ) {
    // Token expiration in seconds
    this.accessTokenExpiresIn = this.configService.get<number>('JWT_ACCESS_EXPIRES_IN', 900); // 15 minutes
    this.refreshTokenExpiresIn = this.configService.get<number>('JWT_REFRESH_EXPIRES_IN', 604800); // 7 days
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
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Find user and verify refresh token matches
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.refreshToken !== dto.refreshToken) {
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

    // TODO: Generate reset token and send email
    // For now, just log
    this.logger.log(`Password reset requested for: ${normalizedEmail}`);
  }

  /**
   * Reset password with token
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    // In a real implementation, this would:
    // 1. Verify the reset token
    // 2. Check token expiration
    // 3. Update password
    // 4. Invalidate all sessions

    // Placeholder: find user by token
    // For testing, we'll accept any token format and find a user
    const user = await this.prisma.user.findFirst({
      where: { status: UserStatus.ACTIVE },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.bcryptSaltRounds);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
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

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET', 'access-secret'),
        expiresIn: this.accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret'),
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
  private sanitizeUser(user: any): AuthenticatedUser {
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
