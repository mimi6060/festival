'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Demo admin user for development
const DEMO_ADMIN: User = {
  id: '1',
  email: 'admin@festival.com',
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'admin',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jean',
  createdAt: '2024-01-15T10:00:00Z',
  lastLogin: new Date().toISOString(),
  isActive: true,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    // Skip on server side
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setUser(null);
        return;
      }

      // In production, validate token with API
      // For now, use demo mode
      const storedUser = localStorage.getItem('admin_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Demo mode: accept specific credentials
      if (email === 'admin@festival.com' && password === 'admin123') {
        // Create a simple JWT-like token for demo (with exp claim)
        const payload = { email, role: 'admin', exp: Math.floor(Date.now() / 1000) + 86400 }; // 24h
        const token = 'header.' + btoa(JSON.stringify(payload)) + '.signature';

        // Store in localStorage
        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_user', JSON.stringify(DEMO_ADMIN));

        // Also set cookie for middleware
        document.cookie = `admin_token=${token}; path=/; max-age=86400; SameSite=Lax`;

        setUser(DEMO_ADMIN);
        router.push('/');
        return;
      }

      // Production API call
      const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Identifiants invalides');
      }

      const data = await response.json();

      // Check if user has admin/organizer role
      if (!['admin', 'organizer'].includes(data.user.role)) {
        throw new Error('Acces non autorise. Vous devez etre administrateur ou organisateur.');
      }

      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
      setUser(data.user);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    // Clear cookie
    document.cookie = 'admin_token=; path=/; max-age=0';
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
      } else if (!isLoading && user && !requiredRoles.includes(user.role)) {
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

    if (!isAuthenticated || !user || !requiredRoles.includes(user.role)) {
      return null;
    }

    return <Component {...props} />;
  };
}
