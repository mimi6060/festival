'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      // Vérifier si un token existe dans les cookies
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('admin_token='))
        ?.split('=')[1];

      if (!token) {
        setState({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // Décoder le payload du token JWT
      const [, payload] = token.split('.');
      if (payload) {
        const decodedPayload = JSON.parse(atob(payload));

        // Vérifier l'expiration
        if (Date.now() >= decodedPayload.exp * 1000) {
          logout();
          return;
        }

        // Simuler un user depuis le token
        const user: User = {
          id: decodedPayload.sub,
          email: decodedPayload.email,
          firstName: 'Jean',
          lastName: 'Dupont',
          role: decodedPayload.role,
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        setState({ user, isAuthenticated: true, isLoading: false });
      }
    } catch {
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      // En production, utiliser une vraie API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const { token, user } = await response.json();

      // Stocker le token
      const maxAge = rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60;
      document.cookie = `admin_token=${token}; path=/; max-age=${maxAge}; samesite=strict`;

      setState({ user, isAuthenticated: true, isLoading: false });
      return user;
    },
    []
  );

  const logout = useCallback(() => {
    // Supprimer le cookie
    document.cookie = 'admin_token=; path=/; max-age=0';
    setState({ user: null, isAuthenticated: false, isLoading: false });
    router.push('/login');
  }, [router]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...updates } : null,
    }));
  }, []);

  return {
    ...state,
    login,
    logout,
    checkAuth,
    updateUser,
  };
}
