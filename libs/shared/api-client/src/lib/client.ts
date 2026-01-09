/**
 * API Client
 * Axios-based HTTP client with interceptors, retry logic, and token management
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

import { DEFAULT_CONFIG, HTTP_STATUS } from './config';
import {
  ApiClientConfig,
  ApiClientEvent,
  ApiClientEventListener,
  ApiError,
  ApiErrorCode,
  ApiErrorResponse,
  ApiResponse,
  PaginatedApiResponse,
  RequestConfig,
  TokenPair,
  TokenStorage,
} from './types';

// ============================================================================
// Token Storage Implementation
// ============================================================================

/**
 * Default token storage using localStorage (browser) or memory (Node.js)
 */
class DefaultTokenStorage implements TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private readonly isBrowser = typeof window !== 'undefined';
  private readonly ACCESS_TOKEN_KEY = 'festival_access_token';
  private readonly REFRESH_TOKEN_KEY = 'festival_refresh_token';

  getAccessToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return this.accessToken;
  }

  setAccessToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    }
    this.accessToken = token;
  }

  getRefreshToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return this.refreshToken;
  }

  setRefreshToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    }
    this.refreshToken = token;
  }

  clearTokens(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
    this.accessToken = null;
    this.refreshToken = null;
  }
}

// ============================================================================
// Request Queue for Token Refresh
// ============================================================================

interface QueuedRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

// ============================================================================
// API Client Class
// ============================================================================

/**
 * Festival API Client
 *
 * Features:
 * - Automatic token refresh
 * - Request retry with exponential backoff
 * - Request/Response interceptors
 * - Error normalization
 * - Event system for monitoring
 */
export class FestivalApiClient {
  private readonly axios: AxiosInstance;
  private readonly config: Required<ApiClientConfig>;
  private readonly tokenStorage: TokenStorage;
  private readonly eventListeners = new Set<ApiClientEventListener>();

  // Token refresh state
  private isRefreshing = false;
  private refreshQueue: QueuedRequest[] = [];

  // Retry state
  private retryCount = new Map<string, number>();

  constructor(
    config: Partial<ApiClientConfig> = {},
    tokenStorage?: TokenStorage
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tokenStorage = tokenStorage || new DefaultTokenStorage();

    this.axios = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: this.config.headers,
    });

    this.setupInterceptors();
  }

  // ============================================================================
  // Interceptors Setup
  // ============================================================================

  private setupInterceptors(): void {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.tokenStorage.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add correlation ID for request tracking
        config.headers['X-Correlation-ID'] =
          config.headers['X-Correlation-ID'] || this.generateCorrelationId();

        this.emit({ type: 'request', config: config as unknown as RequestConfig });
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(this.normalizeError(error));
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response: AxiosResponse) => {
        this.emit({
          type: 'response',
          data: response.data,
          status: response.status,
        });
        return response;
      },
      async (error: AxiosError<ApiErrorResponse>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
          _retryCount?: number;
        };

        // Handle token refresh
        if (
          error.response?.status === HTTP_STATUS.UNAUTHORIZED &&
          !originalRequest._retry
        ) {
          return this.handleTokenRefresh(error, originalRequest);
        }

        // Handle retry for network errors
        if (this.shouldRetry(error, originalRequest)) {
          return this.retryRequest(error, originalRequest);
        }

        const normalizedError = this.normalizeError(error);
        this.emit({ type: 'error', error: normalizedError });
        return Promise.reject(normalizedError);
      }
    );
  }

  // ============================================================================
  // Token Refresh Logic
  // ============================================================================

  private async handleTokenRefresh(
    error: AxiosError<ApiErrorResponse>,
    originalRequest: InternalAxiosRequestConfig & { _retry?: boolean }
  ): Promise<AxiosResponse> {
    if (this.isRefreshing) {
      // Queue the request until refresh is complete
      return new Promise((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return this.axios(originalRequest);
      });
    }

    originalRequest._retry = true;
    this.isRefreshing = true;

    try {
      const refreshToken = this.tokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new ApiError({
          code: ApiErrorCode.REFRESH_FAILED,
          message: 'No refresh token available',
          status: HTTP_STATUS.UNAUTHORIZED,
        });
      }

      const response = await this.axios.post<ApiResponse<TokenPair>>(
        '/auth/refresh',
        { refreshToken },
        { headers: { Authorization: '' } } // Don't send expired token
      );

      const { accessToken, refreshToken: newRefreshToken } = response.data.data;

      this.tokenStorage.setAccessToken(accessToken);
      this.tokenStorage.setRefreshToken(newRefreshToken);

      this.emit({ type: 'tokenRefresh', success: true });

      // Process queued requests
      this.refreshQueue.forEach(({ resolve }) => resolve(accessToken));
      this.refreshQueue = [];

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return this.axios(originalRequest);
    } catch (refreshError) {
      this.emit({ type: 'tokenRefresh', success: false });
      this.emit({ type: 'logout', reason: 'Token refresh failed' });

      // Reject all queued requests
      this.refreshQueue.forEach(({ reject }) =>
        reject(this.normalizeError(refreshError as AxiosError))
      );
      this.refreshQueue = [];

      // Clear tokens on refresh failure
      this.tokenStorage.clearTokens();

      throw this.normalizeError(error);
    } finally {
      this.isRefreshing = false;
    }
  }

  // ============================================================================
  // Retry Logic
  // ============================================================================

  private shouldRetry(
    error: AxiosError,
    request: InternalAxiosRequestConfig & { _retryCount?: number }
  ): boolean {
    const retryCount = request._retryCount || 0;

    // Don't retry if max attempts reached
    if (retryCount >= this.config.retryAttempts) {
      return false;
    }

    // Retry on network errors
    if (!error.response) {
      return true;
    }

    // Retry on specific status codes
    const retryableStatuses = [
      HTTP_STATUS.TOO_MANY_REQUESTS,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      HTTP_STATUS.BAD_GATEWAY,
      HTTP_STATUS.GATEWAY_TIMEOUT,
    ];

    return retryableStatuses.includes(error.response.status);
  }

  private async retryRequest(
    error: AxiosError<ApiErrorResponse>,
    request: InternalAxiosRequestConfig & { _retryCount?: number }
  ): Promise<AxiosResponse> {
    request._retryCount = (request._retryCount || 0) + 1;
    const delay = this.config.retryDelay * Math.pow(2, request._retryCount - 1);

    const normalizedError = this.normalizeError(error);
    this.emit({
      type: 'retry',
      attempt: request._retryCount,
      error: normalizedError,
    });

    await this.sleep(delay);
    return this.axios(request);
  }

  // ============================================================================
  // Error Normalization
  // ============================================================================

  private normalizeError(error: AxiosError<ApiErrorResponse> | unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (!axios.isAxiosError(error)) {
      return new ApiError({
        code: ApiErrorCode.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      });
    }

    const axiosError = error as AxiosError<ApiErrorResponse>;

    // Request cancelled
    if (axios.isCancel(error)) {
      return new ApiError({
        code: ApiErrorCode.CANCELLED,
        message: 'Request was cancelled',
        status: 0,
      });
    }

    // Network error (no response)
    if (!axiosError.response) {
      if (axiosError.code === 'ECONNABORTED') {
        return new ApiError({
          code: ApiErrorCode.TIMEOUT,
          message: 'Request timed out',
          status: 0,
        });
      }
      return new ApiError({
        code: ApiErrorCode.NETWORK_ERROR,
        message: axiosError.message || 'Network error',
        status: 0,
      });
    }

    // Server responded with error
    const { status, data } = axiosError.response;
    const errorData = data?.error;

    const codeMap: Record<number, ApiErrorCode> = {
      [HTTP_STATUS.BAD_REQUEST]: ApiErrorCode.BAD_REQUEST,
      [HTTP_STATUS.UNAUTHORIZED]: ApiErrorCode.UNAUTHORIZED,
      [HTTP_STATUS.FORBIDDEN]: ApiErrorCode.FORBIDDEN,
      [HTTP_STATUS.NOT_FOUND]: ApiErrorCode.NOT_FOUND,
      [HTTP_STATUS.CONFLICT]: ApiErrorCode.CONFLICT,
      [HTTP_STATUS.UNPROCESSABLE_ENTITY]: ApiErrorCode.VALIDATION_ERROR,
      [HTTP_STATUS.TOO_MANY_REQUESTS]: ApiErrorCode.TOO_MANY_REQUESTS,
      [HTTP_STATUS.INTERNAL_SERVER_ERROR]: ApiErrorCode.INTERNAL_ERROR,
      [HTTP_STATUS.SERVICE_UNAVAILABLE]: ApiErrorCode.SERVICE_UNAVAILABLE,
    };

    return new ApiError({
      code: codeMap[status] || ApiErrorCode.INTERNAL_ERROR,
      message: errorData?.message || axiosError.message || 'Request failed',
      status,
      details: errorData?.details,
      validationErrors: errorData?.validationErrors,
      timestamp: data?.timestamp,
    });
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to API client events
   */
  on(listener: ApiClientEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private emit(event: ApiClientEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in API client event listener:', e);
      }
    });
  }

  // ============================================================================
  // Public HTTP Methods
  // ============================================================================

  /**
   * GET request
   */
  async get<T>(
    url: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axios.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  /**
   * GET request with pagination
   */
  async getList<T>(
    url: string,
    config?: RequestConfig
  ): Promise<PaginatedApiResponse<T>> {
    const response = await this.axios.get<PaginatedApiResponse<T>>(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  async post<T, D = unknown>(
    url: string,
    data?: D,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axios.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T, D = unknown>(
    url: string,
    data?: D,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axios.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T, D = unknown>(
    url: string,
    data?: D,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axios.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(
    url: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axios.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  /**
   * Upload file with multipart/form-data
   */
  async upload<T>(
    url: string,
    formData: FormData,
    config?: RequestConfig & { onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void }
  ): Promise<ApiResponse<T>> {
    const response = await this.axios.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  /**
   * Set authentication tokens
   */
  setTokens(tokens: TokenPair): void {
    this.tokenStorage.setAccessToken(tokens.accessToken);
    this.tokenStorage.setRefreshToken(tokens.refreshToken);
  }

  /**
   * Clear authentication tokens
   */
  clearTokens(): void {
    this.tokenStorage.clearTokens();
  }

  /**
   * Check if user has valid tokens
   */
  hasTokens(): boolean {
    return !!this.tokenStorage.getAccessToken();
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.tokenStorage.getAccessToken();
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Update base URL
   */
  setBaseURL(baseURL: string): void {
    this.axios.defaults.baseURL = baseURL;
  }

  /**
   * Set default header
   */
  setHeader(name: string, value: string): void {
    this.axios.defaults.headers.common[name] = value;
  }

  /**
   * Remove default header
   */
  removeHeader(name: string): void {
    delete this.axios.defaults.headers.common[name];
  }

  /**
   * Get Axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.axios;
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let apiClientInstance: FestivalApiClient | null = null;

/**
 * Get the singleton API client instance
 */
export function getApiClient(
  config?: Partial<ApiClientConfig>,
  tokenStorage?: TokenStorage
): FestivalApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new FestivalApiClient(config, tokenStorage);
  }
  return apiClientInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetApiClient(): void {
  apiClientInstance = null;
}

/**
 * Create a new API client instance (non-singleton)
 */
export function createApiClient(
  config?: Partial<ApiClientConfig>,
  tokenStorage?: TokenStorage
): FestivalApiClient {
  return new FestivalApiClient(config, tokenStorage);
}

// Default export
export default getApiClient;
