import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard success response
 */
export class SuccessResponseDto {
  @ApiProperty({
    description: 'Indicates the operation was successful',
    example: true,
  })
  success!: boolean;

  @ApiPropertyOptional({
    description: 'Optional success message',
    example: 'Operation completed successfully',
  })
  message?: string;
}

/**
 * Standard error response
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Error message or array of messages',
    example: 'Validation failed',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } },
    ],
  })
  message!: string | string[];

  @ApiProperty({
    description: 'Error type',
    example: 'Bad Request',
  })
  error!: string;

  @ApiProperty({
    description: 'Timestamp of the error',
    example: '2025-01-02T12:00:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Request path that caused the error',
    example: '/api/festivals',
  })
  path!: string;
}

/**
 * Validation error response with field-level details
 */
export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Array of validation error messages',
    example: ['email must be a valid email', 'password must be at least 8 characters'],
    type: [String],
  })
  override message!: string[];

  @ApiPropertyOptional({
    description: 'Detailed validation errors by field',
    example: {
      email: ['must be a valid email address'],
      password: ['must be at least 8 characters', 'must contain a number'],
    },
  })
  errors?: Record<string, string[]>;
}

/**
 * Unauthorized error response
 */
export class UnauthorizedResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 401,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Unauthorized',
  })
  message!: string;

  @ApiProperty({
    description: 'Timestamp of the error',
    example: '2025-01-02T12:00:00.000Z',
  })
  timestamp!: string;
}

/**
 * Forbidden error response
 */
export class ForbiddenResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 403,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Error message',
    example: 'You do not have permission to access this resource',
  })
  message!: string;

  @ApiProperty({
    description: 'Timestamp of the error',
    example: '2025-01-02T12:00:00.000Z',
  })
  timestamp!: string;
}

/**
 * Not found error response
 */
export class NotFoundResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 404,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Resource not found',
  })
  message!: string;

  @ApiProperty({
    description: 'Timestamp of the error',
    example: '2025-01-02T12:00:00.000Z',
  })
  timestamp!: string;
}

/**
 * Conflict error response
 */
export class ConflictResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 409,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Resource already exists',
  })
  message!: string;

  @ApiProperty({
    description: 'Timestamp of the error',
    example: '2025-01-02T12:00:00.000Z',
  })
  timestamp!: string;
}

/**
 * Rate limit error response
 */
export class TooManyRequestsResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 429,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Too many requests. Please try again later.',
  })
  message!: string;

  @ApiProperty({
    description: 'Seconds until rate limit resets',
    example: 60,
  })
  retryAfter!: number;

  @ApiProperty({
    description: 'Timestamp of the error',
    example: '2025-01-02T12:00:00.000Z',
  })
  timestamp!: string;
}
