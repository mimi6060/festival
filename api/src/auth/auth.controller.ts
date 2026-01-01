import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AuthService,
  RegisterResponse,
  TokenResponse,
  UserProfile,
} from './auth.service';
import { AuthenticatedUser, CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

/**
 * Authentication controller handling all auth-related endpoints.
 * Base path: /auth
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Creates a new user account and sends email verification.
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login
   * Authenticates user and returns access + refresh tokens.
   * Uses LocalAuthGuard to validate credentials.
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @CurrentUser() user: AuthenticatedUser,
    @Body() _dto: LoginDto, // DTO for validation, user comes from guard
  ): Promise<TokenResponse> {
    return this.authService.login(user);
  }

  /**
   * POST /auth/refresh
   * Refreshes access token using a valid refresh token.
   * Implements token rotation for security.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponse> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  /**
   * POST /auth/logout
   * Invalidates the user's refresh token.
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    await this.authService.invalidateRefreshToken(userId);
    return { message: 'Logged out successfully' };
  }

  /**
   * POST /auth/forgot-password
   * Initiates password reset process by sending email.
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  /**
   * POST /auth/reset-password
   * Resets password using the token received via email.
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  /**
   * POST /auth/verify-email
   * Verifies user email using the token received via email.
   */
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    return this.authService.verifyEmail(dto);
  }

  /**
   * GET /auth/me
   * Returns the authenticated user's profile.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser('id') userId: string): Promise<UserProfile> {
    return this.authService.getProfile(userId);
  }
}
