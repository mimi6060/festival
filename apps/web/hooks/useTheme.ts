'use client';

import { useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const THEME_KEY = 'festival-theme';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
}

/**
 * Custom hook for theme management.
 *
 * This hook can work standalone or with the ThemeProvider context.
 * When used with ThemeProvider, it will use the shared context state.
 * When used standalone, it manages its own state.
 */
export function useTheme(): ThemeContextValue {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = useCallback((): ResolvedTheme => {
    if (typeof window === 'undefined') {
      return 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Apply theme to document
  const applyTheme = useCallback((newTheme: ResolvedTheme) => {
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    // Add new theme class
    root.classList.add(newTheme);
    root.setAttribute('data-theme', newTheme);
    root.style.colorScheme = newTheme;

    setResolvedTheme(newTheme);
  }, []);

  // Set theme
  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(THEME_KEY, newTheme);
        } catch {
          // localStorage might not be available
        }
      }

      const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
      applyTheme(resolved);
    },
    [applyTheme, getSystemTheme]
  );

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);

    try {
      const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
      const initialTheme = savedTheme || 'dark';

      setThemeState(initialTheme);
      const resolved = initialTheme === 'system' ? getSystemTheme() : initialTheme;
      applyTheme(resolved);
    } catch {
      // localStorage might not be available
      applyTheme('dark');
    }
  }, [applyTheme, getSystemTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || theme !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme, mounted]);

  // Listen for storage changes (sync across tabs)
  useEffect(() => {
    if (!mounted) {return;}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY && e.newValue) {
        const newTheme = e.newValue as Theme;
        setThemeState(newTheme);
        const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
        applyTheme(resolved);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [applyTheme, getSystemTheme, mounted]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
  };
}
