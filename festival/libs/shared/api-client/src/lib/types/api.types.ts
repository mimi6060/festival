/**
 * API Client Types
 * Core types for API communication
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * API Client configuration options
 */
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

/**
 * Request configuration for individual requests
 */
export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  timeout?: number;
  signal?: AbortSignal;
  withCredentials?: boolean;
}

// ============================================================================
// Response Types
// ============================================================================

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
 * Paginated API response
 */
export interface PaginatedApiResponse<T> {
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

// ============================================================================
// Error Types
// ============================================================================

/**
 * API Error codes
 */
export enum ApiErrorCode {
  // Client errors
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',

  // Auth errors
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  REFRESH_FAILED = 'REFRESH_FAILED',
}

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * API Error response from server
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    validationErrors?: ValidationErrorDetail[];
    stack?: string;
  };
  timestamp: string;
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;
  public readonly validationErrors?: ValidationErrorDetail[];
  public readonly timestamp: string;
  public readonly isRetryable: boolean;

  constructor(params: {
    code: ApiErrorCode;
    message: string;
    status: number;
    details?: Record<string, unknown>;
    validationErrors?: ValidationErrorDetail[];
    timestamp?: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
    this.validationErrors = params.validationErrors;
    this.timestamp = params.timestamp || new Date().toISOString();
    this.isRetryable = this.determineRetryable();

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  private determineRetryable(): boolean {
    const retryableCodes: ApiErrorCode[] = [
      ApiErrorCode.NETWORK_ERROR,
      ApiErrorCode.TIMEOUT,
      ApiErrorCode.SERVICE_UNAVAILABLE,
      ApiErrorCode.TOO_MANY_REQUESTS,
    ];
    return retryableCodes.includes(this.code);
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(): boolean {
    return [
      ApiErrorCode.UNAUTHORIZED,
      ApiErrorCode.TOKEN_EXPIRED,
      ApiErrorCode.INVALID_TOKEN,
    ].includes(this.code);
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(): boolean {
    return this.code === ApiErrorCode.VALIDATION_ERROR;
  }

  /**
   * Get validation error for a specific field
   */
  getFieldError(field: string): ValidationErrorDetail | undefined {
    return this.validationErrors?.find((e) => e.field === field);
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details,
      validationErrors: this.validationErrors,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
    };
  }
}

// ============================================================================
// Token Types
// ============================================================================

/**
 * Token pair for authentication
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * Token storage interface for custom implementations
 */
export interface TokenStorage {
  getAccessToken(): string | null;
  setAccessToken(token: string): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  clearTokens(): void;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * API Client events
 */
export type ApiClientEvent =
  | { type: 'request'; config: RequestConfig }
  | { type: 'response'; data: unknown; status: number }
  | { type: 'error'; error: ApiError }
  | { type: 'retry'; attempt: number; error: ApiError }
  | { type: 'tokenRefresh'; success: boolean }
  | { type: 'logout'; reason: string };

/**
 * Event listener type
 */
export type ApiClientEventListener = (event: ApiClientEvent) => void;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract data type from API response
 */
export type ExtractData<T> = T extends ApiResponse<infer D> ? D : never;

/**
 * Extract array item type from paginated response
 */
export type ExtractPaginatedItem<T> = T extends PaginatedApiResponse<infer D>
  ? D
  : never;

/**
 * Make all properties optional and nullable
 */
export type PartialNullable<T> = {
  [P in keyof T]?: T[P] | null;
};

/**
 * Request state for UI tracking
 */
export interface RequestState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  isSuccess: boolean;
}
