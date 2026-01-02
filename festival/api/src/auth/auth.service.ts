import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditContext } from '../audit/audit.service';
import { AuditActions, EntityTypes } from '../audit/decorators/audit-action.decorator';
import { MailService } from '../mail/mail.service';
import { AuthenticatedUser } from './decorators/current-user.decorator';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

/**
 * Token response structure for login/refresh endpoints.
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * User registration response.
 */
export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  message: string;
}

/**
 * User profile response.
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

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
    private readonly auditService: AuditService,
    private readonly i18n: I18nService,
    private readonly mailService: MailService,
  ) {
    // Parse expiresIn configuration (e.g., '15m' -> 900 seconds)
    const accessExpiresIn = this.configService.get<string>('jwt.expiresIn') || '15m';
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';

    this.accessTokenExpiresIn = this.parseExpiresIn(accessExpiresIn);
    this.refreshTokenExpiresIn = this.parseExpiresIn(refreshExpiresIn);
  }

  /**
   * Translate a key with the current request context language.
   */
  private t(key: string, args?: Record<string, unknown>): string {
    const lang = I18nContext.current()?.lang || 'fr';
    return this.i18n.t(key, { lang, args }) as string;
  }

  /**
   * Translate a key with a specific language.
   */
  private translate(key: string, lang: string, args?: Record<string, unknown>): string {
    return this.i18n.t(key, { lang, args }) as string;
  }

  /**
   * Parses a time string (e.g., '15m', '7d', '1h') into seconds.
   */
  private parseExpiresIn(value: string): number {
    const match = value.match(/^(\d+)(s|m|h|d)$/);
    if (!match) {
      return 900; // Default to 15 minutes
    }
    const num = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return num;
      case 'm': return num * 60;
      case 'h': return num * 60 * 60;
      case 'd': return num * 60 * 60 * 24;
      default: return 900;
    }
  }

  /**
   * Hashes a password using bcrypt.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptSaltRounds);
  }

  /**
   * Compares a plain text password with a hashed password.
   */
  async comparePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Generates a secure random token for email verification or password reset.
   */
  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hashes a token for secure storage.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validates a user's credentials.
   * Returns the user data if valid, null otherwise.
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Use constant-time comparison to prevent timing attacks
      await this.hashPassword('dummy-password');
      return null;
    }

    const isPasswordValid = await this.comparePassword(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return null;
    }

    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException(this.t('auth.login.accountBanned'));
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException(this.t('auth.login.accountInactive'));
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  /**
   * Generates access and refresh tokens for a user.
   */
  async generateTokens(user: AuthenticatedUser): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.accessTokenExpiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.refreshTokenExpiresIn,
      },
    );

    // Store hashed refresh token in database
    const hashedRefreshToken = this.hashToken(refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: hashedRefreshToken,
        lastLoginAt: new Date(),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiresIn,
    };
  }

  /**
   * Registers a new user account.
   */
  async register(dto: RegisterDto, context?: AuditContext): Promise<RegisterResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException(this.t('auth.register.emailExists'));
    }

    // Hash password
    const passwordHash = await this.hashPassword(dto.password);

    // Generate email verification token
    const verificationToken = this.generateSecureToken();
    const hashedVerificationToken = this.hashToken(verificationToken);

    try {
      // Create user with pending verification status
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

      // TODO: Store verification token in a separate table or use a token service
      // Send verification email with token
      try {
        await this.mailService.sendVerificationEmail(
          {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          verificationToken,
        );
        this.logger.log(`Verification email sent to: ${user.email}`);
      } catch (emailError) {
        this.logger.error(`Failed to send verification email to ${user.email}: ${emailError.message}`);
        // Don't fail registration if email fails - user can request resend
      }

      // Log user registration
      await this.auditService.log(
        AuditActions.REGISTER,
        EntityTypes.USER,
        user.id,
        null,
        { email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        context || {},
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        message: this.t('auth.register.success'),
      };
    } catch (error) {
      this.logger.error(`Failed to register user: ${error.message}`, error.stack);
      throw new InternalServerErrorException(this.t('auth.register.failed'));
    }
  }

  /**
   * Authenticates a user and returns tokens.
   */
  async login(user: AuthenticatedUser, context?: AuditContext): Promise<TokenResponse> {
    const tokens = await this.generateTokens(user);

    // Log successful login
    await this.auditService.log(
      AuditActions.LOGIN,
      EntityTypes.AUTH,
      user.id,
      null,
      { email: user.email, role: user.role },
      context || { userId: user.id },
    );

    return tokens;
  }

  /**
   * Logs a failed login attempt for security auditing.
   */
  async logFailedLogin(email: string, context?: AuditContext): Promise<void> {
    await this.auditService.log(
      AuditActions.FAILED_LOGIN,
      EntityTypes.AUTH,
      null,
      null,
      { email, reason: 'Invalid credentials' },
      context || {},
    );
  }

  /**
   * Refreshes access token using a valid refresh token.
   */
  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        type: string;
      }>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException(this.t('auth.token.invalid'));
      }

      // Find user and validate stored refresh token
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          firstName: true,
          lastName: true,
          refreshToken: true,
        },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException(this.t('auth.token.invalid'));
      }

      // Verify stored hash matches
      const hashedToken = this.hashToken(refreshToken);
      if (user.refreshToken !== hashedToken) {
        // Possible token reuse detected - invalidate all tokens
        await this.prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });
        throw new UnauthorizedException(this.t('auth.token.revoked'));
      }

      if (user.status === UserStatus.BANNED) {
        throw new UnauthorizedException(this.t('auth.login.accountBanned'));
      }

      if (user.status === UserStatus.INACTIVE) {
        throw new UnauthorizedException(this.t('auth.login.accountInactive'));
      }

      // Generate new tokens (token rotation)
      return this.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(this.t('auth.token.expired'));
    }
  }

  /**
   * Invalidates a user's refresh token (logout).
   */
  async invalidateRefreshToken(userId: string, context?: AuditContext): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    // Log logout
    await this.auditService.log(
      AuditActions.LOGOUT,
      EntityTypes.AUTH,
      userId,
      null,
      null,
      context || { userId },
    );
  }

  /**
   * Initiates password reset process.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      this.logger.log(
        `Password reset requested for non-existent email: ${normalizedEmail}`,
      );
      return {
        message: this.t('auth.password.resetRequested'),
      };
    }

    // Generate password reset token
    const resetToken = this.generateSecureToken();
    const hashedResetToken = this.hashToken(resetToken);

    // TODO: Store reset token with expiration in database

    // Send password reset email
    try {
      await this.mailService.sendPasswordResetEmail(
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        resetToken,
      );
      this.logger.log(`Password reset email sent to: ${user.email}`);
    } catch (emailError) {
      this.logger.error(`Failed to send password reset email to ${user.email}: ${emailError.message}`);
      // Still return success to prevent email enumeration
    }

    return {
      message: this.t('auth.password.resetRequested'),
    };
  }

  /**
   * Resets user password using reset token.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // Hash the provided token
    const hashedToken = this.hashToken(dto.token);

    // TODO: Look up token in database and verify expiration
    // For now, this is a placeholder implementation

    // Hash new password
    const passwordHash = await this.hashPassword(dto.password);

    // TODO: Update user password and invalidate reset token
    // await this.prisma.user.update({...})

    this.logger.log(`Password reset attempted with token: ${dto.token}`);

    return {
      message: this.t('auth.password.resetSuccess'),
    };
  }

  /**
   * Verifies user email using verification token.
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    // Hash the provided token
    const hashedToken = this.hashToken(dto.token);

    // TODO: Look up token in database and verify
    // For now, this is a placeholder implementation

    this.logger.log(`Email verification attempted with token: ${dto.token}`);

    return {
      message: this.t('auth.email.verificationSuccess'),
    };
  }

  /**
   * Gets user profile by ID.
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(this.t('auth.profile.notFound'));
    }

    return user;
  }
}
