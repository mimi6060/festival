import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * User information included in authentication responses
 */
export class UserInfoDto {
  @ApiProperty({
    description: 'User unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'Jean',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Dupont',
  })
  lastName: string;

  @ApiProperty({
    description: 'User role',
    example: 'USER',
    enum: ['USER', 'ADMIN', 'ORGANIZER', 'STAFF', 'CASHIER', 'SECURITY'],
  })
  role: string;
}

/**
 * Token information returned after authentication
 */
export class TokenInfoDto {
  @ApiProperty({
    description: 'JWT access token for API authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE2MTYyMzkwMjIsImV4cCI6MTYxNjIzOTkyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token for obtaining new access tokens',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2ODQzODIyfQ.4aXfRJLLJHLKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 900,
    minimum: 1,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Token type (always "Bearer")',
    example: 'Bearer',
    default: 'Bearer',
  })
  tokenType: string;
}

/**
 * Login response DTO
 */
export class LoginResponseDto {
  @ApiProperty({
    description: 'Indicates successful login',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Access token for API authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token for obtaining new access tokens',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 900,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Authenticated user information',
    type: UserInfoDto,
  })
  user: UserInfoDto;
}

/**
 * Token refresh response DTO
 */
export class TokenResponseDto {
  @ApiProperty({
    description: 'Indicates successful token refresh',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'New access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'New refresh token (token rotation)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 900,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;
}

/**
 * Register response DTO
 */
export class RegisterResponseDto {
  @ApiProperty({
    description: 'Indicates successful registration',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Registration successful. Please check your email to verify your account.',
  })
  message: string;

  @ApiProperty({
    description: 'Newly created user information',
    type: UserInfoDto,
  })
  user: UserInfoDto;
}

/**
 * User profile response DTO
 */
export class UserProfileResponseDto {
  @ApiProperty({
    description: 'User unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'Jean',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Dupont',
  })
  lastName: string;

  @ApiPropertyOptional({
    description: 'User phone number (E.164 format)',
    example: '+33612345678',
  })
  phone?: string;

  @ApiProperty({
    description: 'User role in the system',
    example: 'USER',
    enum: ['USER', 'ADMIN', 'ORGANIZER', 'STAFF', 'CASHIER', 'SECURITY'],
  })
  role: string;

  @ApiProperty({
    description: 'Whether the email has been verified',
    example: true,
  })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'Whether the account is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-15T10:30:00.000Z',
    format: 'date-time',
  })
  updatedAt: Date;
}

/**
 * Message response DTO for simple acknowledgements
 */
export class MessageResponseDto {
  @ApiProperty({
    description: 'Indicates operation success',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message: string;
}
