'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';

export function useAuth() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: storeLogin,
    register: storeRegister,
    logout: storeLogout,
    clearError,
  } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string, redirectTo?: string) => {
      await storeLogin({ email, password });
      router.push(redirectTo || '/account');
    },
    [storeLogin, router]
  );

  const register = useCallback(
    async (
      data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        phone?: string;
      },
      redirectTo?: string
    ) => {
      await storeRegister(data);
      router.push(redirectTo || '/account');
    },
    [storeRegister, router]
  );

  const logout = useCallback(() => {
    storeLogout();
    router.push('/');
  }, [storeLogout, router]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };
}

// Hook to protect routes
export function useRequireAuth(redirectTo = '/auth/login') {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  return { isAuthenticated, isLoading };
}

// Hook for redirect if already authenticated
export function useRedirectIfAuthenticated(redirectTo = '/account') {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  return { isAuthenticated, isLoading };
}
