/**
 * Festival UI - Design Tokens & Theme Configuration
 *
 * This module exports design tokens and theme utilities
 * that can be used across web and admin applications.
 */

// Color palette - Festival brand colors
export const colors = {
  // Primary colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  // Secondary/Accent colors
  secondary: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
  },
  // Neutral colors
  neutral: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
  },
  // Semantic colors
  success: {
    light: '#86efac',
    default: '#22c55e',
    dark: '#15803d',
  },
  warning: {
    light: '#fde047',
    default: '#eab308',
    dark: '#a16207',
  },
  error: {
    light: '#fca5a5',
    default: '#ef4444',
    dark: '#b91c1c',
  },
  info: {
    light: '#93c5fd',
    default: '#3b82f6',
    dark: '#1d4ed8',
  },
} as const;

// Spacing scale
export const spacing = {
  0: '0',
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
} as const;

// Typography
export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, Menlo, Monaco, monospace',
  },
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

// Border radius
export const borderRadius = {
  none: '0',
  sm: '0.125rem', // 2px
  default: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  full: '9999px',
} as const;

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  none: 'none',
} as const;

// Transitions
export const transitions = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  timing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

// Breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Z-index scale
export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50', // Modal/Dialog
  60: '60', // Dropdown
  70: '70', // Sticky header
  80: '80', // Toast notifications
  90: '90', // Tooltips
  100: '100', // Maximum priority
} as const;

/**
 * Toast/Notification Styles
 * Standardized styling for toast notifications and alerts across all apps.
 *
 * Usage with Tailwind CSS:
 * - Border radius: rounded-lg
 * - Padding: p-4
 * - Apply the variant class from toastStyles[variant]
 */
export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export const toastStyles: Record<ToastVariant, { container: string; icon: string; title: string }> =
  {
    success: {
      container: 'bg-green-500/10 border-green-500/20 text-green-400',
      icon: 'text-green-400',
      title: 'text-green-300',
    },
    error: {
      container: 'bg-red-500/10 border-red-500/20 text-red-400',
      icon: 'text-red-400',
      title: 'text-red-300',
    },
    info: {
      container: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      icon: 'text-blue-400',
      title: 'text-blue-300',
    },
    warning: {
      container: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      icon: 'text-amber-400',
      title: 'text-amber-300',
    },
  } as const;

/**
 * Toast container base classes
 * Combine with variant-specific styles from toastStyles
 */
export const toastBaseClasses = 'rounded-lg border p-4' as const;

// Theme type exports
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Typography = typeof typography;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;
export type Transitions = typeof transitions;
export type Breakpoints = typeof breakpoints;
export type ZIndex = typeof zIndex;
export type ToastStyles = typeof toastStyles;

// Complete theme object
export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
  breakpoints,
  zIndex,
  toastStyles,
  toastBaseClasses,
} as const;

export type Theme = typeof theme;
