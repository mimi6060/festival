/**
 * Theme Context for React Native Mobile App
 * Provides dynamic theme switching (light/dark/system) with proper color support
 */

import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { useColorScheme, Appearance, ColorSchemeName } from 'react-native';
import { useSettingsStore, Theme } from '../store';

// Light theme colors
export const lightColors = {
  // Primary colors - Festive indigo/purple
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryLight: '#818CF8',

  // Secondary colors - Festive amber/gold
  secondary: '#F59E0B',
  secondaryDark: '#D97706',
  secondaryLight: '#FBBF24',

  // Accent colors - Festive teal/emerald
  accent: '#10B981',
  accentDark: '#059669',
  accentLight: '#34D399',

  // Festival gradient colors
  festivalPink: '#ec4899',
  festivalPurple: '#8b5cf6',
  festivalOrange: '#f97316',
  festivalCyan: '#06b6d4',
  festivalMagenta: '#d946ef',
  festivalYellow: '#fbbf24',

  // Gradient definitions
  gradients: {
    festive: ['#6366f1', '#8b5cf6', '#ec4899'],
    sunset: ['#f97316', '#ec4899', '#8b5cf6'],
    neon: ['#06b6d4', '#8b5cf6', '#ec4899'],
    party: ['#fbbf24', '#f97316', '#ec4899'],
    aurora: ['#22c55e', '#06b6d4', '#8b5cf6'],
  },

  // Neutral colors - Light theme
  background: '#f8fafc',
  backgroundSecondary: '#f1f5f9',
  surface: '#ffffff',
  surfaceLight: '#f1f5f9',
  card: '#ffffff',

  // Text colors - Light theme
  text: '#1e293b',
  textSecondary: 'rgba(30, 41, 59, 0.7)',
  textMuted: 'rgba(30, 41, 59, 0.5)',

  // Status colors
  success: '#22c55e',
  warning: '#F59E0B',
  error: '#ef4444',
  info: '#3B82F6',

  // Misc
  border: 'rgba(99, 102, 241, 0.2)',
  borderFestive: 'rgba(236, 72, 153, 0.25)',
  overlay: 'rgba(248, 250, 252, 0.9)',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',

  // Glow effects
  glowPurple: 'rgba(139, 92, 246, 0.3)',
  glowPink: 'rgba(236, 72, 153, 0.3)',
  glowOrange: 'rgba(249, 115, 22, 0.3)',
};

// Dark theme colors (existing)
export const darkColors = {
  // Primary colors - Festive indigo/purple
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryLight: '#818CF8',

  // Secondary colors - Festive amber/gold
  secondary: '#F59E0B',
  secondaryDark: '#D97706',
  secondaryLight: '#FBBF24',

  // Accent colors - Festive teal/emerald
  accent: '#10B981',
  accentDark: '#059669',
  accentLight: '#34D399',

  // Festival gradient colors
  festivalPink: '#ec4899',
  festivalPurple: '#8b5cf6',
  festivalOrange: '#f97316',
  festivalCyan: '#06b6d4',
  festivalMagenta: '#d946ef',
  festivalYellow: '#fbbf24',

  // Gradient definitions
  gradients: {
    festive: ['#6366f1', '#8b5cf6', '#ec4899'],
    sunset: ['#f97316', '#ec4899', '#8b5cf6'],
    neon: ['#06b6d4', '#8b5cf6', '#ec4899'],
    party: ['#fbbf24', '#f97316', '#ec4899'],
    aurora: ['#22c55e', '#06b6d4', '#8b5cf6'],
  },

  // Neutral colors - Dark theme
  background: '#12121c',
  backgroundSecondary: '#1a1a26',
  surface: '#222230',
  surfaceLight: '#2d2d3c',
  card: '#222230',

  // Text colors - Dark theme
  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',

  // Status colors
  success: '#22c55e',
  warning: '#F59E0B',
  error: '#ef4444',
  info: '#3B82F6',

  // Misc
  border: 'rgba(139, 92, 246, 0.25)',
  borderFestive: 'rgba(236, 72, 153, 0.35)',
  overlay: 'rgba(18, 18, 28, 0.85)',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',

  // Glow effects
  glowPurple: 'rgba(139, 92, 246, 0.5)',
  glowPink: 'rgba(236, 72, 153, 0.5)',
  glowOrange: 'rgba(249, 115, 22, 0.5)',
};

export type ThemeColors = typeof darkColors;

export interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { theme, setTheme } = useSettingsStore();
  const [currentSystemScheme, setCurrentSystemScheme] =
    useState<ColorSchemeName>(systemColorScheme);

  // Listen for system color scheme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setCurrentSystemScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  const isDark = useMemo(() => {
    if (theme === 'system') {
      return currentSystemScheme === 'dark';
    }
    return theme === 'dark';
  }, [theme, currentSystemScheme]);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const value = useMemo(
    () => ({
      colors,
      isDark,
      theme,
      setTheme,
    }),
    [colors, isDark, theme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook to get current colors (can be used without provider for backward compatibility)
export const useThemeColors = (): ThemeColors => {
  const context = useContext(ThemeContext);
  if (context) {
    return context.colors;
  }
  // Fallback to dark colors if no provider
  return darkColors;
};

export default ThemeProvider;
