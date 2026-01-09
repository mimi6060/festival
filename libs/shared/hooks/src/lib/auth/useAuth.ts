'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthState,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  PasswordResetRequest,
  PasswordResetConfirm,
  UpdatePassword,
  UseAuthOptions,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const STORAGE_KEY = 'festival-auth';

/**
 * Initial auth state
 */
const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

/**
 * Get stored auth state from localStorage
 */
function getStoredAuth(): Partial<AuthState> | null {
  if (typeof window === 'undefined') {return null;}
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

/**
 * Store auth state in localStorage
 */
function storeAuth(state: Partial<AuthState>): void {
  if (typeof window === 'undefined') {return;}
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      })
    );
    // Also store token separately for API client
    if (state.token) {
      localStorage.setItem('auth_token', state.token);
    } else {
      localStorage.removeItem('auth_token');
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear stored auth state
 */
function clearStoredAuth(): void {
  if (typeof window === 'undefined') {return;}
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('auth_token');
  } catch {
    // Ignore storage errors
  }
}

/**
 * useAuth hook - Complete authentication state and actions
 */
export function useAuth(options: UseAuthOptions = {}) {
  const router = useRouter();
  const {
    redirectOnLogin = '/account',
    redirectOnLogout = '/',
    persistSession = true,
  } = options;

  const [state, setState] = useState<AuthState>(() => {
    const stored = persistSession ? getStoredAuth() : null;
    return stored
      ? { ...initialState, ...stored, isLoading: false }
      : initialState;
  });

  // Initialize from storage on mount
  useEffect(() => {
    const stored = persistSession ? getStoredAuth() : null;
    if (stored?.isAuthenticated && stored?.token) {
      setState((prev) => ({
        ...prev,
        ...stored,
        isLoading: false,
      }));
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [persistSession]);

  // API request helper
  const apiRequest = useCallback(
    async <T>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<T> => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (state.token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${state.token}`;
      }

      const response = await fetch(`${API_URL}/v1${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    },
    [state.token]
  );

  // Login
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await apiRequest<AuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        });

        const newState: AuthState = {
          user: response.user,
          token: response.accessToken,
          refreshToken: response.refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        };

        setState(newState);

        if (persistSession) {
          storeAuth(newState);
        }

        if (redirectOnLogin) {
          router.push(redirectOnLogin);
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Login failed',
        }));
        throw error;
      }
    },
    [apiRequest, persistSession, redirectOnLogin, router]
  );

  // Register
  const register = useCallback(
    async (data: RegisterData): Promise<void> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await apiRequest<AuthResponse>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        const newState: AuthState = {
          user: response.user,
          token: response.accessToken,
          refreshToken: response.refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        };

        setState(newState);

        if (persistSession) {
          storeAuth(newState);
        }

        if (redirectOnLogin) {
          router.push(redirectOnLogin);
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Registration failed',
        }));
        throw error;
      }
    },
    [apiRequest, persistSession, redirectOnLogin, router]
  );

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    // Call logout API (fire and forget)
    if (state.token) {
      try {
        await apiRequest('/auth/logout', { method: 'POST' });
      } catch {
        // Ignore logout API errors
      }
    }

    setState({
      ...initialState,
      isLoading: false,
    });

    clearStoredAuth();

    if (redirectOnLogout) {
      router.push(redirectOnLogout);
    }
  }, [state.token, apiRequest, redirectOnLogout, router]);

  // Refresh token
  const refreshAuth = useCallback(async (): Promise<boolean> => {
    if (!state.refreshToken) {
      return false;
    }

    try {
      const response = await apiRequest<AuthResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: state.refreshToken }),
      });

      const newState: AuthState = {
        ...state,
        token: response.accessToken,
        refreshToken: response.refreshToken,
        error: null,
      };

      setState(newState);

      if (persistSession) {
        storeAuth(newState);
      }

      return true;
    } catch {
      // Token refresh failed, logout
      await logout();
      return false;
    }
  }, [state, apiRequest, persistSession, logout]);

  // Request password reset
  const requestPasswordReset = useCallback(
    async (data: PasswordResetRequest): Promise<void> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await apiRequest('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        setState((prev) => ({ ...prev, isLoading: false }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Request failed',
        }));
        throw error;
      }
    },
    [apiRequest]
  );

  // Confirm password reset
  const confirmPasswordReset = useCallback(
    async (data: PasswordResetConfirm): Promise<void> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await apiRequest('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        setState((prev) => ({ ...prev, isLoading: false }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Request failed',
        }));
        throw error;
      }
    },
    [apiRequest]
  );

  // Update password (logged in)
  const updatePassword = useCallback(
    async (data: UpdatePassword): Promise<void> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await apiRequest('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        setState((prev) => ({ ...prev, isLoading: false }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Request failed',
        }));
        throw error;
      }
    },
    [apiRequest]
  );

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Update user data
  const updateUser = useCallback(
    (userData: Partial<AuthState['user']>) => {
      if (!state.user) {return;}

      const newState: AuthState = {
        ...state,
        user: { ...state.user, ...userData } as AuthState['user'],
      };

      setState(newState);

      if (persistSession) {
        storeAuth(newState);
      }
    },
    [state, persistSession]
  );

  return useMemo(
    () => ({
      // State
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      error: state.error,

      // Actions
      login,
      register,
      logout,
      refreshAuth,
      requestPasswordReset,
      confirmPasswordReset,
      updatePassword,
      updateUser,
      clearError,
    }),
    [
      state.user,
      state.token,
      state.isAuthenticated,
      state.isLoading,
      state.error,
      login,
      register,
      logout,
      refreshAuth,
      requestPasswordReset,
      confirmPasswordReset,
      updatePassword,
      updateUser,
      clearError,
    ]
  );
}

export default useAuth;
