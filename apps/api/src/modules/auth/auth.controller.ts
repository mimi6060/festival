import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiTooManyRequestsResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
  LoginResponseDto,
  RegisterResponseDto,
  UserResponseDto,
  AuthTokensDto,
} from './dto';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
  UnauthorizedResponseDto,
  ConflictResponseDto,
  TooManyRequestsResponseDto,
  SuccessResponseDto,
} from '../../common/dto';
import { AuthService, AuthenticatedUser } from './auth.service';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { GitHubOAuthGuard } from './guards/github-oauth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

/**
 * Authentication Controller
 *
 * Handles all authentication-related operations including:
 * - User registration and email verification
 * - Login/logout with JWT tokens
 * - Password reset flow
 * - Token refresh
 */
@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Register a new user
   *
   * Creates a new user account and sends a verification email.
   * The user must verify their email before they can log in.
   */
  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: `
Creates a new user account with the provided information.

**Process:**
1. Validates the input data
2. Checks if email is already registered
3. Hashes the password securely
4. Creates the user account
5. Sends a verification email

**After Registration:**
- User receives an email with a verification link
- User must click the link to activate their account
- Until verified, login attempts will fail

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
    `,
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration data',
    examples: {
      basic: {
        summary: 'Basic registration',
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
      withPhone: {
        summary: 'Registration with phone',
        value: {
          email: 'jane.smith@example.com',
          password: 'MySecure456!',
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+33612345678',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'User successfully registered',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error - invalid input data',
    type: ValidationErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email already registered',
    type: ConflictResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many registration attempts',
    type: TooManyRequestsResponseDto,
  })
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * Login with email and password
   *
   * Authenticates a user and returns JWT tokens.
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email and password',
    description: `
Authenticates a user with their email and password.

**Returns:**
- User profile information
- JWT access token (valid for 15 minutes)
- Refresh token (valid for 7 days)

**Token Usage:**
Include the access token in the Authorization header:
\`\`\`
Authorization: Bearer <access-token>
\`\`\`

**Token Refresh:**
When the access token expires, use the refresh token with \`POST /auth/refresh\` to get new tokens.

**Security Notes:**
- Account is locked after 5 failed attempts
- Login is blocked if email is not verified
    `,
  })
  @ApiBody({
    type: LoginDto,
    description: 'Login credentials',
    examples: {
      standard: {
        summary: 'Standard login',
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePass123!',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or unverified email',
    type: UnauthorizedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
    type: ValidationErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Account locked due to too many failed attempts',
    type: TooManyRequestsResponseDto,
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(loginDto);

    // Set httpOnly cookies for tokens (secure in production)
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('strict' as const) : ('lax' as const),
      path: '/',
    };

    // Access token cookie (shorter expiry)
    res.cookie('access_token', result.tokens.accessToken, {
      ...cookieOptions,
      maxAge: result.tokens.expiresIn * 1000, // Convert to milliseconds
    });

    // Refresh token cookie (longer expiry - 7 days)
    res.cookie('refresh_token', result.tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result;
  }

  /**
   * Logout current session
   *
   * Invalidates the current refresh token.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout current session',
    description: `
Logs out the current user by invalidating their refresh token.

**What Happens:**
- The refresh token is added to a blocklist
- The access token remains valid until expiration
- Client should discard all tokens

**Best Practice:**
Clear tokens from client storage after calling this endpoint.
    `,
  })
  @ApiOkResponse({
    description: 'Logout successful',
    type: SuccessResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
    type: UnauthorizedResponseDto,
  })
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<SuccessResponseDto> {
    await this.authService.logout(userId);

    // Clear auth cookies
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  /**
   * Refresh access token
   *
   * Uses a refresh token to get new access and refresh tokens.
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: `
Exchanges a valid refresh token for new access and refresh tokens.

**Token Rotation:**
- A new access token is generated
- A new refresh token is generated
- The old refresh token is invalidated

**Usage:**
Call this endpoint when the access token expires (401 response).

**Security:**
If a refresh token is used twice (indicating theft), all sessions are invalidated.
    `,
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token',
    examples: {
      standard: {
        summary: 'Token refresh',
        value: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Tokens refreshed successfully',
    type: AuthTokensDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
    type: UnauthorizedResponseDto,
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthTokensDto> {
    // Try to get refresh token from cookie if not in body
    const refreshToken = refreshTokenDto.refreshToken || (req.cookies?.refresh_token as string);

    const result = await this.authService.refreshTokens({
      refreshToken,
    });

    // Update cookies with new tokens
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('strict' as const) : ('lax' as const),
      path: '/',
    };

    res.cookie('access_token', result.accessToken, {
      ...cookieOptions,
      maxAge: result.expiresIn * 1000,
    });

    res.cookie('refresh_token', result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return result;
  }

  /**
   * Get current user profile
   *
   * Returns the authenticated user's profile information.
   */
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description: `
Returns the profile information of the currently authenticated user.

**Requires:** Valid JWT access token

**Returns:** User profile including role, verification status, and timestamps.
    `,
  })
  @ApiOkResponse({
    description: 'Current user profile',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
    type: UnauthorizedResponseDto,
  })
  async me(@CurrentUser('id') userId: string): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(userId);
  }

  /**
   * Verify email address
   *
   * Verifies a user's email using the token sent via email.
   */
  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description: `
Verifies a user's email address using the token received via email.

**Process:**
1. User clicks verification link in email
2. Frontend extracts token from URL
3. Token is sent to this endpoint
4. If valid, email is marked as verified

**Token Validity:** 24 hours
    `,
  })
  @ApiBody({
    type: VerifyEmailDto,
    description: 'Email verification token',
    examples: {
      standard: {
        summary: 'Verify email',
        value: {
          token: 'verify-abc123def456',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Email verified successfully',
    type: SuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired token',
    type: ErrorResponseDto,
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<SuccessResponseDto> {
    await this.authService.verifyEmail(verifyEmailDto.token);
    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
    };
  }

  /**
   * Request password reset
   *
   * Sends a password reset email to the specified address.
   */
  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: `
Initiates the password reset flow by sending an email with a reset link.

**Process:**
1. User provides their email address
2. If account exists, a reset email is sent
3. Email contains a link with a reset token
4. Token is valid for 1 hour

**Security:**
- Same response whether email exists or not (prevents enumeration)
- Rate limited to 3 requests per hour per email
    `,
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Email address for password reset',
    examples: {
      standard: {
        summary: 'Request reset',
        value: {
          email: 'john.doe@example.com',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Reset email sent (if account exists)',
    type: SuccessResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many reset requests',
    type: TooManyRequestsResponseDto,
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<SuccessResponseDto> {
    await this.authService.forgotPassword(forgotPasswordDto.email);
    return {
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.',
    };
  }

  /**
   * Reset password with token
   *
   * Sets a new password using the reset token from email.
   */
  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description: `
Resets the user's password using a valid reset token.

**Process:**
1. User clicks reset link in email
2. Frontend extracts token from URL
3. User enters new password
4. Token and new password are sent here

**After Reset:**
- All existing sessions are invalidated
- User must log in with new password
    `,
  })
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Reset token and new password',
    examples: {
      standard: {
        summary: 'Reset password',
        value: {
          token: 'reset-token-abc123',
          newPassword: 'NewSecurePass456!',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Password reset successful',
    type: SuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired token',
    type: ErrorResponseDto,
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<SuccessResponseDto> {
    await this.authService.resetPassword(resetPasswordDto);
    return {
      success: true,
      message: 'Password reset successful. Please log in with your new password.',
    };
  }

  /**
   * Change password
   *
   * Changes the password for the authenticated user.
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change password',
    description: `
Changes the password for the currently authenticated user.

**Requirements:**
- Must be logged in
- Must provide current password
- New password must meet security requirements

**After Change:**
- Other sessions remain active
- Current session continues to work
    `,
  })
  @ApiBody({
    type: ChangePasswordDto,
    description: 'Current and new password',
    examples: {
      standard: {
        summary: 'Change password',
        value: {
          currentPassword: 'OldPass123!',
          newPassword: 'NewSecurePass456!',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Password changed successfully',
    type: SuccessResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated or wrong current password',
    type: UnauthorizedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or same as old password',
    type: ValidationErrorResponseDto,
  })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto
  ): Promise<SuccessResponseDto> {
    await this.authService.changePassword(userId, changePasswordDto);
    return {
      success: true,
      message: 'Password changed successfully.',
    };
  }

  /**
   * Resend verification email
   *
   * Sends a new verification email to the user.
   */
  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend verification email',
    description: `
Sends a new verification email to the specified address.

**Use Cases:**
- Original email didn't arrive
- Verification link expired
- User deleted the email

**Rate Limit:** 1 request per 5 minutes per email
    `,
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Email address to resend verification to',
  })
  @ApiOkResponse({
    description: 'Verification email sent',
    type: SuccessResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests',
    type: TooManyRequestsResponseDto,
  })
  async resendVerification(@Body() dto: ForgotPasswordDto): Promise<SuccessResponseDto> {
    await this.authService.forgotPassword(dto.email);
    return {
      success: true,
      message: 'If the account exists and is not verified, a new verification email has been sent.',
    };
  }

  // ==========================================================================
  // OAuth Endpoints
  // ==========================================================================

  /**
   * Initiate Google OAuth flow
   */
  @Get('google')
  @Public()
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({
    summary: 'Login with Google',
    description: 'Redirects to Google OAuth consent screen.',
  })
  @ApiOkResponse({
    description: 'Redirects to Google OAuth',
  })
  async googleAuth() {
    // Guard handles redirect to Google
  }

  /**
   * Google OAuth callback
   */
  @Get('google/callback')
  @Public()
  @UseGuards(GoogleOAuthGuard)
  @ApiExcludeEndpoint()
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as AuthenticatedUser;
    const result = await this.authService.loginOAuth(user);

    // Set httpOnly cookies for tokens
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const frontendUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('strict' as const) : ('lax' as const),
      path: '/',
    };

    res.cookie('access_token', result.tokens.accessToken, {
      ...cookieOptions,
      maxAge: result.tokens.expiresIn * 1000,
    });

    res.cookie('refresh_token', result.tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend callback page (without tokens in URL)
    res.redirect(`${frontendUrl}/auth/callback?success=true`);
  }

  /**
   * Initiate GitHub OAuth flow
   */
  @Get('github')
  @Public()
  @UseGuards(GitHubOAuthGuard)
  @ApiOperation({
    summary: 'Login with GitHub',
    description: 'Redirects to GitHub OAuth authorization page.',
  })
  @ApiOkResponse({
    description: 'Redirects to GitHub OAuth',
  })
  async githubAuth() {
    // Guard handles redirect to GitHub
  }

  /**
   * GitHub OAuth callback
   */
  @Get('github/callback')
  @Public()
  @UseGuards(GitHubOAuthGuard)
  @ApiExcludeEndpoint()
  async githubAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as AuthenticatedUser;
    const result = await this.authService.loginOAuth(user);

    // Set httpOnly cookies for tokens
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const frontendUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('strict' as const) : ('lax' as const),
      path: '/',
    };

    res.cookie('access_token', result.tokens.accessToken, {
      ...cookieOptions,
      maxAge: result.tokens.expiresIn * 1000,
    });

    res.cookie('refresh_token', result.tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend callback page (without tokens in URL)
    res.redirect(`${frontendUrl}/auth/callback?success=true`);
  }

  /**
   * Get available OAuth providers
   */
  @Get('providers')
  @Public()
  @ApiOperation({
    summary: 'Get available OAuth providers',
    description: 'Returns a list of enabled OAuth providers.',
  })
  @ApiOkResponse({
    description: 'List of OAuth providers',
  })
  getOAuthProviders() {
    return {
      providers: [
        {
          name: 'google',
          enabled: this.configService.get<boolean>('GOOGLE_OAUTH_ENABLED') || false,
          url: '/api/auth/google',
        },
        {
          name: 'github',
          enabled: this.configService.get<boolean>('GITHUB_OAUTH_ENABLED') || false,
          url: '/api/auth/github',
        },
      ],
    };
  }
}
