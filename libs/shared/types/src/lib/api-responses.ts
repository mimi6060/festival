/**
 * API Response Types
 * Generic response wrappers for consistent API communication
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  timestamp: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Pagination query parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
  };
  timestamp: string;
}

/**
 * Validation error for form/input validation
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    validationErrors: ValidationError[];
  };
  timestamp: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if response is successful
 */
export function isApiSuccess<T>(
  response: ApiResponse<T> | ErrorResponse
): response is ApiResponse<T> {
  return response.success === true;
}

/**
 * Check if response is an error
 */
export function isApiError(
  response: ApiResponse<unknown> | ErrorResponse
): response is ErrorResponse {
  return response.success === false;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(
  response: ErrorResponse | ValidationErrorResponse
): response is ValidationErrorResponse {
  return (
    response.success === false &&
    response.error.code === 'VALIDATION_ERROR' &&
    'validationErrors' in response.error
  );
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a successful API response
 */
export function createApiResponse<T>(
  data: T,
  message?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
