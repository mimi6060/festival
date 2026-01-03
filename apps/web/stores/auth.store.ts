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

// Note: Tokens are now stored in httpOnly cookies for security
// We no longer store them in localStorage or the Zustand store
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
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  // Actions
  setUser: (user: User | null) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  clearError: () => void;
  initialize: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

// ============================================================================
// Constants
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const STORE_NAME = 'festival-auth';

// ============================================================================
// Store
// ============================================================================

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        user: null as User | null,
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
              credentials: 'include', // Important: send and receive cookies
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.message || 'Login failed');
            }

            // Store only user data, tokens are in httpOnly cookies
            set((state) => {
              state.user = data.user;
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
              credentials: 'include', // Important: send and receive cookies
            });

            const result = await response.json();

            if (!response.ok) {
              throw new Error(result.message || 'Registration failed');
            }

            // Store only user data, tokens are in httpOnly cookies
            set((state) => {
              state.user = result.user;
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
          try {
            // Call logout API to clear httpOnly cookies
            await fetch(`${API_URL}/v1/auth/logout`, {
              method: 'POST',
              credentials: 'include',
            });
          } catch {
            // Ignore errors on logout, we'll clear local state anyway
          }

          set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.error = null;
          });
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
          // Check authentication status by calling /auth/me
          await get().checkAuth();

          set((state) => {
            state.isInitialized = true;
          });
        },

        checkAuth: async () => {
          try {
            const response = await fetch(`${API_URL}/v1/auth/me`, {
              method: 'GET',
              credentials: 'include', // Send cookies with request
            });

            if (response.ok) {
              const userData = await response.json();
              set((state) => {
                state.user = userData;
                state.isAuthenticated = true;
              });
            } else {
              // Not authenticated or token expired
              set((state) => {
                state.user = null;
                state.isAuthenticated = false;
              });
            }
          } catch {
            // Network error or other issue
            set((state) => {
              state.user = null;
              state.isAuthenticated = false;
            });
          }
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
            setItem: () => {
              /* No-op for server-side */
            },
            removeItem: () => {
              /* No-op for server-side */
            },
          };
        }),
        // Only persist user data, not tokens
        partialize: (state) => ({
          user: state.user,
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
