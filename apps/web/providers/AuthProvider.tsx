'use client';

import React, { useEffect, createContext, useContext } from 'react';
import { useAuthStore, User } from '../stores/auth.store';
import { LoadingScreen } from '../components/ui/Spinner';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
});

export const useAuthContext = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
  showLoadingScreen?: boolean;
}

export function AuthProvider({ children, showLoadingScreen = false }: AuthProviderProps) {
  const { user, isAuthenticated, isLoading, isInitialized, initialize, checkAuth } = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Set up periodic auth check (tokens are managed via httpOnly cookies)
  useEffect(() => {
    if (!isAuthenticated) {return;}

    // Check auth status every 5 minutes
    const interval = setInterval(() => {
      checkAuth();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, checkAuth]);

  // Show loading screen while initializing
  if (showLoadingScreen && !isInitialized) {
    return <LoadingScreen message="Initializing..." />;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isInitialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
