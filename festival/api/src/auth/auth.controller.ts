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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
import { ThrottleAuth } from '../throttler';
import {
  LoginResponseDto,
  RegisterResponseDto,
  TokenResponseDto,
  UserProfileResponseDto,
} from './dto/auth-response.dto';

/**
 * Authentication controller handling all auth-related endpoints.
 * Base path: /auth
 *
 * Rate limiting: 5 requests/minute (anti brute-force protection)
 */
@ApiTags('Auth')
@ApiExtraModels(TokenResponseDto, RegisterResponseDto, UserProfileResponseDto)
@Controller('auth')
@ThrottleAuth()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Creates a new user account and sends email verification.
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user account',
    description: `
Creates a new user account with the provided information.

**Process:**
1. Validates input data
2. Checks for existing email (returns 409 if exists)
3. Hashes password securely with bcrypt
4. Creates user in database
5. Sends email verification link

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

**Note:** Email verification is required before the account can be fully used.
    `,
    operationId: 'auth_register',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration data',
    examples: {
      standard: {
        summary: 'Standard registration',
        description: 'A typical user registration',
        value: {
          email: 'user@example.com',
          password: 'SecureP@ss123',
          firstName: 'Jean',
          lastName: 'Dupont',
          phone: '+33612345678',
        },
      },
      minimal: {
        summary: 'Minimal registration',
        description: 'Registration with only required fields',
        value: {
          email: 'user@example.com',
          password: 'SecureP@ss123',
          firstName: 'Jean',
          lastName: 'Dupont',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'User successfully registered',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data - validation failed',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'Validation failed',
        errors: [
          {
            field: 'email',
            message: 'Invalid email format',
          },
          {
            field: 'password',
            message: 'Password must contain at least one uppercase letter',
          },
        ],
      },
    },
  })
  @ApiConflictResponse({
    description: 'Email already registered',
    schema: {
      example: {
        success: false,
        statusCode: 409,
        error: 'CONFLICT',
        message: 'An account with this email already exists',
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many registration attempts',
    schema: {
      example: {
        success: false,
        statusCode: 429,
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many registration attempts. Please try again later.',
      },
    },
  })
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
  @ApiOperation({
    summary: 'Authenticate user and get tokens',
    description: `
Authenticates a user with email and password, returning JWT access and refresh tokens.

**Token Lifecycle:**
- **Access Token:** Valid for 15 minutes, used for API requests
- **Refresh Token:** Valid for 7 days, used to obtain new access tokens

**Security Features:**
- Brute force protection (5 failed attempts = 15 min lockout)
- Secure password comparison with bcrypt
- Token rotation on refresh

**Usage:**
After successful login, include the access token in the Authorization header:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`
    `,
    operationId: 'auth_login',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
    examples: {
      valid: {
        summary: 'Valid credentials',
        value: {
          email: 'user@example.com',
          password: 'SecureP@ss123',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Successfully authenticated',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    schema: {
      example: {
        success: false,
        statusCode: 401,
        error: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Account locked or email not verified',
    schema: {
      example: {
        success: false,
        statusCode: 403,
        error: 'FORBIDDEN',
        message: 'Account locked due to too many failed login attempts. Try again in 15 minutes.',
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many login attempts',
    schema: {
      example: {
        success: false,
        statusCode: 429,
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many login attempts. Please try again later.',
      },
    },
  })
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
  @ApiOperation({
    summary: 'Refresh access token',
    description: `
Exchanges a valid refresh token for a new access token.

**Token Rotation:**
For enhanced security, this endpoint implements token rotation:
- The provided refresh token is invalidated
- A new refresh token is issued along with the new access token
- Old refresh tokens cannot be reused

**When to use:**
Call this endpoint when your access token expires (after 15 minutes)
to obtain a new one without requiring the user to log in again.
    `,
    operationId: 'auth_refresh',
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token from previous login or refresh',
    examples: {
      token: {
        summary: 'Refresh token',
        value: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'New tokens generated successfully',
    type: TokenResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
    schema: {
      example: {
        success: false,
        statusCode: 401,
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired refresh token',
      },
    },
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout user',
    description: `
Invalidates the user's refresh token, effectively logging them out.

**What happens:**
- The user's refresh token is invalidated in the database
- The current access token remains valid until it expires (max 15 minutes)
- Client should discard both tokens locally

**Note:** For immediate security, clients should delete stored tokens
upon receiving the success response.
    `,
    operationId: 'auth_logout',
  })
  @ApiOkResponse({
    description: 'Successfully logged out',
    schema: {
      example: {
        success: true,
        message: 'Logged out successfully',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired access token',
    schema: {
      example: {
        success: false,
        statusCode: 401,
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    },
  })
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
  @ApiOperation({
    summary: 'Request password reset',
    description: `
Initiates the password reset process by sending a reset link to the user's email.

**Security Features:**
- Always returns success to prevent email enumeration attacks
- Reset tokens expire after 1 hour
- Only one active reset token per user
- Previous reset tokens are invalidated when a new one is requested

**Email Content:**
The email contains a secure link with a reset token that the user
can use to set a new password.
    `,
    operationId: 'auth_forgot_password',
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Email address for password reset',
    examples: {
      email: {
        summary: 'Email address',
        value: {
          email: 'user@example.com',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Password reset email sent (always returns success)',
    schema: {
      example: {
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.',
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many password reset requests',
    schema: {
      example: {
        success: false,
        statusCode: 429,
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many password reset requests. Please try again later.',
      },
    },
  })
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
  @ApiOperation({
    summary: 'Reset password with token',
    description: `
Resets the user's password using the token received via email.

**Token Validation:**
- Token must be valid and not expired (1 hour validity)
- Token can only be used once
- Invalid tokens return a 400 error

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

**After Reset:**
- User can log in with the new password
- All existing sessions are invalidated
- A confirmation email is sent
    `,
    operationId: 'auth_reset_password',
  })
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Reset token and new password',
    examples: {
      reset: {
        summary: 'Password reset',
        value: {
          token: 'abc123def456...',
          password: 'NewSecureP@ss123',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Password successfully reset',
    schema: {
      example: {
        success: true,
        message: 'Password has been successfully reset. You can now log in with your new password.',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired reset token',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'Invalid or expired password reset token',
      },
    },
  })
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
  @ApiOperation({
    summary: 'Verify email address',
    description: `
Verifies the user's email address using the token sent during registration.

**Token Validation:**
- Token must be valid and not expired (24 hour validity)
- Token can only be used once
- Invalid tokens return a 400 error

**After Verification:**
- User's email is marked as verified
- Full account access is granted
- A welcome email may be sent
    `,
    operationId: 'auth_verify_email',
  })
  @ApiBody({
    type: VerifyEmailDto,
    description: 'Email verification token',
    examples: {
      verify: {
        summary: 'Verification token',
        value: {
          token: 'abc123def456...',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Email successfully verified',
    schema: {
      example: {
        success: true,
        message: 'Email verified successfully. Your account is now fully activated.',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired verification token',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'Invalid or expired verification token',
      },
    },
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description: `
Returns the complete profile of the currently authenticated user.

**Included Information:**
- Basic profile (id, email, name)
- Role and permissions
- Account status (email verification, active status)
- Account timestamps (created, updated)

**Note:** Sensitive information like password hash is never included.
    `,
    operationId: 'auth_get_profile',
  })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    type: UserProfileResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired access token',
    schema: {
      example: {
        success: false,
        statusCode: 401,
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found (deleted account)',
    schema: {
      example: {
        success: false,
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'User not found',
      },
    },
  })
  async getProfile(@CurrentUser('id') userId: string): Promise<UserProfile> {
    return this.authService.getProfile(userId);
  }
}
