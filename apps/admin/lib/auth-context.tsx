'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use relative URL to leverage Next.js proxy (avoids cross-origin cookie issues)
const API_BASE_URL = '/api';

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
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      // Validate authentication using httpOnly cookies
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
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
    } catch (error) {
      console.error('Auth check failed:', error);
      // Dev fallback
      if (process.env.NODE_ENV === 'development') {
        setUser(DEV_USER);
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
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

      // Tokens are now stored in httpOnly cookies, we only keep user data in state
      setUser(data.user);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout API to clear httpOnly cookies
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors on logout, we'll clear local state anyway
    }

    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        checkAuth,
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
