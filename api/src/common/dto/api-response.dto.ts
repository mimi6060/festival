import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Standard API response metadata
 */
export class ResponseMetaDto {
  @ApiProperty({
    description: 'Response timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'API endpoint path',
    example: '/api/v1/festivals',
  })
  path: string;

  @ApiProperty({
    description: 'HTTP method used',
    example: 'GET',
  })
  method: string;

  @ApiPropertyOptional({
    description: 'Request correlation ID for tracing',
    example: 'corr-550e8400-e29b-41d4-a716-446655440000',
  })
  correlationId?: string;
}

/**
 * Generic success response wrapper
 * Used for all successful API responses
 */
export class ApiSuccessResponse<T> {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: true;

  @ApiProperty({
    description: 'Response data payload',
  })
  data: T;

  @ApiPropertyOptional({
    description: 'Optional success message',
    example: 'Resource created successfully',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Response metadata',
    type: ResponseMetaDto,
  })
  meta?: ResponseMetaDto;

  constructor(data: T, message?: string) {
    this.success = true;
    this.data = data;
    this.message = message;
  }
}

/**
 * Validation error detail
 */
export class ValidationErrorDto {
  @ApiProperty({
    description: 'Field name with validation error',
    example: 'email',
  })
  field: string;

  @ApiProperty({
    description: 'Validation error message',
    example: 'Invalid email format',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Invalid value that was provided',
    example: 'invalid-email',
  })
  value?: any;

  @ApiPropertyOptional({
    description: 'Validation constraints that failed',
    example: ['isEmail'],
  })
  constraints?: string[];
}

/**
 * Standard API error response
 * Used for all error responses
 */
export class ApiErrorResponse {
  @ApiProperty({
    description: 'Indicates the request failed',
    example: false,
  })
  success: false;

  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error type/code',
    example: 'BAD_REQUEST',
  })
  error: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Validation failed',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Detailed error information (for validation errors)',
    type: [ValidationErrorDto],
  })
  errors?: ValidationErrorDto[];

  @ApiPropertyOptional({
    description: 'Error timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  timestamp?: string;

  @ApiPropertyOptional({
    description: 'Request path that caused the error',
    example: '/api/v1/auth/login',
  })
  path?: string;

  @ApiPropertyOptional({
    description: 'Correlation ID for support/debugging',
    example: 'corr-550e8400-e29b-41d4-a716-446655440000',
  })
  correlationId?: string;

  constructor(statusCode: number, error: string, message: string) {
    this.success = false;
    this.statusCode = statusCode;
    this.error = error;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Pagination metadata
 */
export class PaginationMetaDto {
  @ApiProperty({
    description: 'Total number of items across all pages',
    example: 150,
    minimum: 0,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number (1-based)',
    example: 1,
    minimum: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 15,
    minimum: 0,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPreviousPage: boolean;

  constructor(total: number, page: number, limit: number) {
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
    this.hasNextPage = page < this.totalPages;
    this.hasPreviousPage = page > 1;
  }
}

/**
 * Generic paginated response wrapper
 * Used for all paginated list responses
 */
export class ApiPaginatedResponse<T> {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: true;

  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  pagination: PaginationMetaDto;

  @ApiPropertyOptional({
    description: 'Response metadata',
    type: ResponseMetaDto,
  })
  meta?: ResponseMetaDto;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.success = true;
    this.data = data;
    this.pagination = new PaginationMetaDto(total, page, limit);
  }
}

/**
 * Standard message response (for simple acknowledgements)
 */
export class MessageResponseDto {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message: string;
}

/**
 * Delete confirmation response
 */
export class DeleteResponseDto {
  @ApiProperty({
    description: 'Indicates if the deletion was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'ID of the deleted resource',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  deletedId: string;

  @ApiProperty({
    description: 'Confirmation message',
    example: 'Resource deleted successfully',
  })
  message: string;
}

// Common error response examples for Swagger documentation
export const CommonApiResponses = {
  BadRequest: {
    description: 'Bad Request - Invalid input data',
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
            value: 'invalid-email',
            constraints: ['isEmail'],
          },
        ],
        timestamp: '2025-01-15T10:30:00.000Z',
        path: '/api/v1/auth/register',
      },
    },
  },
  Unauthorized: {
    description: 'Unauthorized - Authentication required',
    schema: {
      example: {
        success: false,
        statusCode: 401,
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        timestamp: '2025-01-15T10:30:00.000Z',
        path: '/api/v1/users/me',
      },
    },
  },
  Forbidden: {
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: {
        success: false,
        statusCode: 403,
        error: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
        timestamp: '2025-01-15T10:30:00.000Z',
        path: '/api/v1/admin/users',
      },
    },
  },
  NotFound: {
    description: 'Not Found - Resource does not exist',
    schema: {
      example: {
        success: false,
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Resource not found',
        timestamp: '2025-01-15T10:30:00.000Z',
        path: '/api/v1/festivals/unknown-id',
      },
    },
  },
  Conflict: {
    description: 'Conflict - Resource already exists',
    schema: {
      example: {
        success: false,
        statusCode: 409,
        error: 'CONFLICT',
        message: 'A resource with this identifier already exists',
        timestamp: '2025-01-15T10:30:00.000Z',
        path: '/api/v1/auth/register',
      },
    },
  },
  TooManyRequests: {
    description: 'Too Many Requests - Rate limit exceeded',
    schema: {
      example: {
        success: false,
        statusCode: 429,
        error: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded. Please try again later.',
        timestamp: '2025-01-15T10:30:00.000Z',
        path: '/api/v1/auth/login',
      },
    },
  },
  InternalServerError: {
    description: 'Internal Server Error',
    schema: {
      example: {
        success: false,
        statusCode: 500,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: '2025-01-15T10:30:00.000Z',
        correlationId: 'corr-550e8400-e29b-41d4-a716-446655440000',
      },
    },
  },
};
