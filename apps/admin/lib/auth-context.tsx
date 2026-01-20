'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  rememberMe: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setRememberMe: (value: boolean) => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use relative URL to leverage Next.js proxy (avoids cross-origin cookie issues)
const API_BASE_URL = '/api';

// Storage keys
const REMEMBER_ME_KEY = 'festival_admin_remember_me';
const USER_KEY = 'festival_admin_user';

// Token refresh interval (14 minutes - tokens typically expire in 15 min)
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000;

// Dev mode user for testing
const DEV_USER: User = {
  id: 'dev-user-id',
  email: 'admin@festival.fr',
  firstName: 'Admin',
  lastName: 'Dev',
  role: 'ADMIN',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rememberMe, setRememberMeState] = useState(false);
  const router = useRouter();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load remember me preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
      setRememberMeState(savedRememberMe);

      // If remember me was enabled, try to restore user from localStorage
      if (savedRememberMe) {
        const savedUser = localStorage.getItem(USER_KEY);
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
          } catch {
            localStorage.removeItem(USER_KEY);
          }
        }
      }
    }
  }, []);

  const setRememberMe = useCallback((value: boolean) => {
    setRememberMeState(value);
    if (typeof window !== 'undefined') {
      if (value) {
        localStorage.setItem(REMEMBER_ME_KEY, 'true');
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
  }, []);

  // Auto-refresh token function
  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        // Token refresh failed, but don't logout immediately - checkAuth will handle it
        console.warn('Token refresh failed');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }, []);

  // Setup auto-refresh interval
  const setupAutoRefresh = useCallback(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Only setup refresh if remember me is enabled
    if (rememberMe) {
      refreshIntervalRef.current = setInterval(async () => {
        const success = await refreshToken();
        if (!success && user) {
          // Try to re-authenticate
          await checkAuth();
        }
      }, TOKEN_REFRESH_INTERVAL);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [rememberMe, refreshToken, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      // Validate authentication using httpOnly cookies
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        // Try to refresh token first
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry auth check after refresh
          const retryResponse = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            credentials: 'include',
          });

          if (retryResponse.ok) {
            const data = await retryResponse.json();
            const userData = data.user || data;
            const userRole = userData.role?.toLowerCase();
            if (['admin', 'organizer'].includes(userRole)) {
              setUser(userData);
              if (rememberMe && typeof window !== 'undefined') {
                localStorage.setItem(USER_KEY, JSON.stringify(userData));
              }
              setupAutoRefresh();
              setIsLoading(false);
              return;
            }
          }
        }

        // In development, use dev user for testing
        if (process.env.NODE_ENV === 'development') {
          console.warn('Auth API unavailable, using dev user');
          setUser(DEV_USER);
          setIsLoading(false);
          return;
        }
        throw new Error('Invalid or expired session');
      }

      const data = await response.json();
      const userData = data.user || data;

      const userRole = userData.role?.toLowerCase();
      if (!['admin', 'organizer'].includes(userRole)) {
        throw new Error('Unauthorized access');
      }

      setUser(userData);

      // Save user to localStorage if remember me is enabled
      if (rememberMe && typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      }

      // Setup auto-refresh
      setupAutoRefresh();
    } catch (error) {
      console.error('Auth check failed:', error);
      // Dev fallback
      if (process.env.NODE_ENV === 'development') {
        setUser(DEV_USER);
      } else {
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(USER_KEY);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [refreshToken, rememberMe, setupAutoRefresh]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string, remember = false) => {
    setIsLoading(true);
    try {
      // API call for authentication
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Identifiants invalides');
      }

      const data = await response.json();

      // Check if user has admin/organizer role (case-insensitive)
      const userRole = data.user.role?.toLowerCase();
      if (!['admin', 'organizer'].includes(userRole)) {
        throw new Error('Acces non autorise. Vous devez etre administrateur ou organisateur.');
      }

      // Update remember me setting
      setRememberMe(remember);

      // Save user to localStorage if remember me is enabled
      if (remember && typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }

      // Tokens are now stored in httpOnly cookies, we only keep user data in state
      setUser(data.user);

      // Setup auto-refresh if remember me is enabled
      if (remember) {
        setupAutoRefresh();
      }

      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Clear refresh interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    try {
      // Call logout API to clear httpOnly cookies
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors on logout, we'll clear local state anyway
    }

    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_KEY);
      // Keep remember me preference for next login
    }

    setUser(null);
    router.push('/login');
  };

  const updateUser = useCallback(
    (userData: Partial<User>) => {
      setUser((currentUser) => {
        if (!currentUser) {
          return currentUser;
        }
        const updatedUser = { ...currentUser, ...userData };
        // Update localStorage if remember me is enabled
        if (rememberMe && typeof window !== 'undefined') {
          localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        }
        return updatedUser;
      });
    },
    [rememberMe]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        rememberMe,
        login,
        logout,
        checkAuth,
        setRememberMe,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles: string[] = ['admin', 'organizer']
) {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/login');
      } else if (!isLoading && user && !requiredRoles.includes(user.role?.toLowerCase())) {
        router.push('/unauthorized');
      }
    }, [isLoading, isAuthenticated, user, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (!isAuthenticated || !user || !requiredRoles.includes(user.role?.toLowerCase())) {
      return null;
    }

    return <Component {...props} />;
  };
}
