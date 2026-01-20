/**
 * Festival Platform - Unified Color Palette
 * @module @festival/shared/design-tokens/colors
 *
 * This module provides a unified color system used across all apps:
 * - Web (public site)
 * - Admin (dashboard)
 * - Mobile (React Native)
 *
 * Color scales follow Tailwind CSS conventions (50-950)
 */

// ============================================================================
// Brand Colors
// ============================================================================

/**
 * Primary brand color - Indigo
 * Used for primary actions, buttons, links, and brand elements
 * Unified across Web and Admin apps
 */
export const primary = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1', // Main primary color
  600: '#4f46e5', // Hover state
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
  950: '#1e1b4b',
} as const;

/**
 * Secondary brand color - Pink
 * Used for secondary actions and accents
 */
export const secondary = {
  50: '#fdf2f8',
  100: '#fce7f3',
  200: '#fbcfe8',
  300: '#f9a8d4',
  400: '#f472b6',
  500: '#ec4899',
  600: '#db2777',
  700: '#be185d',
  800: '#9d174d',
  900: '#831843',
  950: '#500724',
} as const;

/**
 * Accent color - Indigo (same as primary for unified design)
 * Used for accent highlights across all apps
 */
export const accent = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
  950: '#1e1b4b',
} as const;

// ============================================================================
// Neutral Colors
// ============================================================================

/**
 * Neutral/Gray color scale
 * Used for text, backgrounds, borders, and dividers
 * Unified dark theme palette
 */
export const neutral = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#1a1a1a', // Surface color
  950: '#0a0a0a', // Background dark
} as const;

/**
 * Slate gray - cooler gray tones
 * Alternative neutral for admin interfaces
 */
export const slate = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
} as const;

/**
 * Gray - standard gray tones
 * Used for UI elements and text
 */
export const gray = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
  950: '#030712',
} as const;

// ============================================================================
// Semantic Colors
// ============================================================================

/**
 * Success colors - Green
 * Used for success states, confirmations, positive actions
 */
export const success = {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e',
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
  950: '#052e16',
} as const;

/**
 * Warning colors - Amber/Yellow
 * Used for warnings, cautions, pending states
 */
export const warning = {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b',
  600: '#d97706',
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
  950: '#451a03',
} as const;

/**
 * Error/Danger colors - Red
 * Used for errors, destructive actions, alerts
 */
export const error = {
  50: '#fef2f2',
  100: '#fee2e2',
  200: '#fecaca',
  300: '#fca5a5',
  400: '#f87171',
  500: '#ef4444',
  600: '#dc2626',
  700: '#b91c1c',
  800: '#991b1b',
  900: '#7f1d1d',
  950: '#450a0a',
} as const;

/**
 * Info colors - Blue
 * Used for informational messages, links, help
 */
export const info = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
  950: '#172554',
} as const;

// ============================================================================
// Festival Theme Colors
// ============================================================================

/**
 * Festival-specific theme colors
 * Unified dark palette for all apps
 */
export const festival = {
  /** Main dark background */
  dark: '#0a0a0a',
  /** Darker shade for depth */
  darker: '#000000',
  /** Medium tone for cards/surfaces */
  medium: '#1a1a1a',
  /** Lighter accent areas */
  light: '#262626',
  /** Primary brand accent (indigo) */
  accent: '#6366f1',
} as const;

/**
 * Stage/Zone-specific colors
 * Used to identify different areas of the festival
 */
export const zones = {
  /** Main stage - vibrant purple */
  mainStage: '#8b5cf6',
  /** Electronic stage - neon cyan */
  electronic: '#06b6d4',
  /** Rock stage - bold red */
  rock: '#ef4444',
  /** Jazz stage - warm gold */
  jazz: '#eab308',
  /** Chill zone - calm teal */
  chill: '#14b8a6',
  /** VIP area - luxurious gold */
  vip: '#d4af37',
  /** Food court - appetizing orange */
  food: '#fb923c',
  /** Camping area - nature green */
  camping: '#22c55e',
} as const;

// ============================================================================
// Base Colors
// ============================================================================

/**
 * Pure white and black
 */
export const base = {
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ============================================================================
// Semantic Mapping
// ============================================================================

/**
 * Semantic color tokens for light theme
 * Maps abstract concepts to specific colors
 */
export const semanticLight = {
  // Backgrounds
  background: base.white,
  backgroundAlt: gray[50],
  backgroundMuted: gray[100],
  surface: base.white,
  surfaceAlt: gray[50],
  surfaceHover: gray[100],

  // Text
  text: gray[900],
  textSecondary: gray[600],
  textMuted: gray[400],
  textInverse: base.white,

  // Borders
  border: gray[200],
  borderHover: gray[300],
  borderFocus: primary[500],
  divider: gray[100],

  // Interactive
  link: primary[600],
  linkHover: primary[700],
  focus: primary[500],
  focusRing: `${primary[500]}40`, // 25% opacity

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(255, 255, 255, 0.9)',
} as const;

/**
 * Semantic color tokens for dark theme
 * Unified across Web and Admin apps
 */
export const semanticDark = {
  // Backgrounds - Unified dark palette
  background: '#0a0a0a', // Background dark
  backgroundAlt: '#1a1a1a', // Surface
  backgroundMuted: '#262626',
  surface: '#1a1a1a', // Surface
  surfaceAlt: '#262626',
  surfaceHover: '#333333',

  // Text - Unified text colors
  text: '#ffffff', // Text primary
  textSecondary: 'rgba(255, 255, 255, 0.7)', // Text muted
  textMuted: 'rgba(255, 255, 255, 0.5)',
  textInverse: '#0a0a0a',

  // Borders - Unified border
  border: 'rgba(255, 255, 255, 0.1)', // Border
  borderHover: 'rgba(255, 255, 255, 0.2)',
  borderFocus: primary[500],
  divider: 'rgba(255, 255, 255, 0.1)',

  // Interactive
  link: primary[400],
  linkHover: primary[300],
  focus: primary[500],
  focusRing: `${primary[500]}40`,

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
} as const;

// ============================================================================
// Exports
// ============================================================================

/**
 * Complete color palette
 */
export const colors = {
  // Brand
  primary,
  secondary,
  accent,

  // Neutrals
  neutral,
  slate,
  gray,

  // Semantic
  success,
  warning,
  error,
  info,

  // Festival-specific
  festival,
  zones,

  // Base
  base,

  // Semantic mappings
  light: semanticLight,
  dark: semanticDark,
} as const;

export type Colors = typeof colors;
export type ColorScale = typeof primary;
export type SemanticColors = typeof semanticLight;
