'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  preferences?: UserPreferences;
  createdAt: string;
}

export type UserRole = 'attendee' | 'staff' | 'organizer' | 'admin';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

export interface UserPreferences {
  language: 'fr' | 'en';
  timezone: string;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// ============================================================================
// State Interface
// ============================================================================

interface AuthState {
  // State
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  updateProfile: (data: Partial<User>) => void;
  clearError: () => void;
  initialize: () => Promise<void>;
  isTokenExpired: () => boolean;
}

export type AuthStore = AuthState & AuthActions;

// ============================================================================
// Constants
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const STORE_NAME = 'festival-auth';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

// ============================================================================
// Store
// ============================================================================

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        user: null as User | null,
        tokens: null as AuthTokens | null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: false,
        error: null as string | null,

        // Actions
        setUser: (user: User | null) => {
          set((state) => {
            state.user = user;
            state.isAuthenticated = !!user;
          });
        },

        setTokens: (tokens: AuthTokens | null) => {
          set((state) => {
            state.tokens = tokens;
          });
        },

        login: async (credentials: LoginCredentials) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const response = await fetch(`${API_URL}/v1/auth/login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(credentials),
              credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.message || 'Login failed');
            }

            set((state) => {
              state.user = data.user;
              state.tokens = {
                accessToken: data.accessToken || data.token,
                refreshToken: data.refreshToken,
                expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
              };
              state.isAuthenticated = true;
              state.isLoading = false;
              state.error = null;
            });
          } catch (error) {
            set((state) => {
              state.isLoading = false;
              state.error = error instanceof Error ? error.message : 'Login failed';
            });
            throw error;
          }
        },

        register: async (registerData: RegisterData) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const response = await fetch(`${API_URL}/v1/auth/register`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(registerData),
              credentials: 'include',
            });

            const result = await response.json();

            if (!response.ok) {
              throw new Error(result.message || 'Registration failed');
            }

            set((state) => {
              state.user = result.user;
              state.tokens = {
                accessToken: result.accessToken || result.token,
                refreshToken: result.refreshToken,
                expiresAt: Date.now() + (result.expiresIn || 3600) * 1000,
              };
              state.isAuthenticated = true;
              state.isLoading = false;
              state.error = null;
            });
          } catch (error) {
            set((state) => {
              state.isLoading = false;
              state.error = error instanceof Error ? error.message : 'Registration failed';
            });
            throw error;
          }
        },

        logout: async () => {
          const tokens = get().tokens;

          // Call logout API (fire and forget)
          if (tokens?.accessToken) {
            try {
              await fetch(`${API_URL}/v1/auth/logout`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${tokens.accessToken}`,
                },
                credentials: 'include',
              });
            } catch {
              // Ignore errors on logout
            }
          }

          set((state) => {
            state.user = null;
            state.tokens = null;
            state.isAuthenticated = false;
            state.error = null;
          });
        },

        refreshToken: async () => {
          const currentTokens = get().tokens;

          if (!currentTokens?.refreshToken) {
            await get().logout();
            return false;
          }

          try {
            const response = await fetch(`${API_URL}/v1/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken: currentTokens.refreshToken }),
              credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error('Token refresh failed');
            }

            set((state) => {
              state.tokens = {
                accessToken: data.accessToken || data.token,
                refreshToken: data.refreshToken,
                expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
              };
            });

            return true;
          } catch {
            await get().logout();
            return false;
          }
        },

        updateProfile: (profileData: Partial<User>) => {
          set((state) => {
            if (state.user) {
              state.user = { ...state.user, ...profileData };
            }
          });
        },

        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },

        initialize: async () => {
          const { tokens, isTokenExpired, refreshToken } = get();

          // Check if we need to refresh the token
          if (tokens && isTokenExpired()) {
            await refreshToken();
          }

          set((state) => {
            state.isInitialized = true;
          });
        },

        isTokenExpired: () => {
          const tokens = get().tokens;
          if (!tokens?.expiresAt) {return true;}
          return Date.now() > tokens.expiresAt - TOKEN_REFRESH_THRESHOLD;
        },
      })),
      {
        name: STORE_NAME,
        storage: createJSONStorage(() => {
          if (typeof window !== 'undefined') {
            return localStorage;
          }
          return {
            getItem: () => null,
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            setItem: () => {},
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            removeItem: () => {},
          };
        }),
        partialize: (state) => ({
          user: state.user,
          tokens: state.tokens,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'AuthStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export const selectUser = (state: AuthStore) => state.user;
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;
export const selectIsLoading = (state: AuthStore) => state.isLoading;
export const selectAuthError = (state: AuthStore) => state.error;
export const selectUserRole = (state: AuthStore) => state.user?.role;
