import { StyleSheet, Platform } from 'react-native';

export const colors = {
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

  // Festival gradient colors - for vibrant gradients
  festivalPink: '#ec4899',
  festivalPurple: '#8b5cf6',
  festivalOrange: '#f97316',
  festivalCyan: '#06b6d4',
  festivalMagenta: '#d946ef',
  festivalYellow: '#fbbf24',

  // Gradient definitions (for LinearGradient)
  gradients: {
    festive: ['#6366f1', '#8b5cf6', '#ec4899'],
    sunset: ['#f97316', '#ec4899', '#8b5cf6'],
    neon: ['#06b6d4', '#8b5cf6', '#ec4899'],
    party: ['#fbbf24', '#f97316', '#ec4899'],
    aurora: ['#22c55e', '#06b6d4', '#8b5cf6'],
  },

  // Neutral colors with subtle purple tint for festive feel
  background: '#0a0a12',
  backgroundSecondary: '#12121a',
  surface: '#1a1a24',
  surfaceLight: '#252530',
  card: '#1a1a24',

  // Text colors
  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',

  // Status colors - Vibrant
  success: '#22c55e',
  warning: '#F59E0B',
  error: '#ef4444',
  info: '#3B82F6',

  // Misc
  border: 'rgba(139, 92, 246, 0.2)',
  borderFestive: 'rgba(236, 72, 153, 0.3)',
  overlay: 'rgba(10, 10, 18, 0.8)',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',

  // Glow effects
  glowPurple: 'rgba(139, 92, 246, 0.5)',
  glowPink: 'rgba(236, 72, 153, 0.5)',
  glowOrange: 'rgba(249, 115, 22, 0.5)',
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
