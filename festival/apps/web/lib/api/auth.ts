/**
 * Authentication API
 */

import apiClient, { tokenManager } from '../api-client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ChangePasswordRequest {
  token: string;
  newPassword: string;
}

/**
 * Login user
 */
export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', data);

  // Store tokens
  if (response.data.accessToken && response.data.refreshToken) {
    tokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
  }

  return response.data;
};

/**
 * Register new user
 */
export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/register', data);

  // Store tokens
  if (response.data.accessToken && response.data.refreshToken) {
    tokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
  }

  return response.data;
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    // Always clear tokens, even if API call fails
    tokenManager.clearTokens();
  }
};

/**
 * Get current user
 */
export const getMe = async (): Promise<User> => {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
};

/**
 * Refresh access token
 */
export const refreshToken = async (): Promise<AuthResponse> => {
  const currentRefreshToken = tokenManager.getRefreshToken();

  if (!currentRefreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await apiClient.post<AuthResponse>('/auth/refresh', {
    refreshToken: currentRefreshToken,
  });

  // Store new tokens
  if (response.data.accessToken && response.data.refreshToken) {
    tokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
  }

  return response.data;
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (data: ResetPasswordRequest): Promise<{ message: string }> => {
  const response = await apiClient.post('/auth/forgot-password', data);
  return response.data;
};

/**
 * Reset password with token
 */
export const resetPassword = async (data: ChangePasswordRequest): Promise<{ message: string }> => {
  const response = await apiClient.post('/auth/reset-password', data);
  return response.data;
};

/**
 * Verify email with token
 */
export const verifyEmail = async (token: string): Promise<{ message: string }> => {
  const response = await apiClient.post('/auth/verify-email', { token });
  return response.data;
};

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (): Promise<{ message: string }> => {
  const response = await apiClient.post('/auth/resend-verification');
  return response.data;
};
