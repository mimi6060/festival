import { StyleSheet, Platform } from 'react-native';

export const colors = {
  // Primary colors (matches Web/Admin design system)
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryLight: '#818CF8',

  // Secondary colors
  secondary: '#F59E0B',
  secondaryDark: '#D97706',
  secondaryLight: '#FBBF24',

  // Accent colors
  accent: '#10B981',
  accentDark: '#059669',
  accentLight: '#34D399',

  // Neutral colors (matches Web/Admin design system)
  background: '#0a0a0a',
  backgroundSecondary: '#1a1a1a',
  surface: '#1a1a1a',
  surfaceLight: '#2a2a2a',
  card: '#1a1a1a',

  // Text colors (matches Web/Admin design system)
  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',

  // Status colors (matches Web/Admin design system)
  success: '#22c55e',
  warning: '#F59E0B',
  error: '#ef4444',
  info: '#3B82F6',

  // Misc (matches Web/Admin design system)
  border: 'rgba(255,255,255,0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
};

// Platform-specific shadow styles
const createShadow = (offsetY: number, blur: number, opacity: number) => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0px ${offsetY}px ${blur}px rgba(0, 0, 0, ${opacity})`,
    };
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation: blur,
  };
};

export const shadows = {
  sm: createShadow(1, 2, 0.2),
  md: createShadow(2, 4, 0.25),
  lg: createShadow(4, 8, 0.3),
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenPadding: {
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
});

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  globalStyles,
};
