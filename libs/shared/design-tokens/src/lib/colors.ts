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
 * Primary brand color - Purple/Fuchsia
 * Used for primary actions, buttons, links, and brand elements
 */
export const primary = {
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
  950: '#4a044e',
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
 * Accent color - Sky Blue
 * Used in admin dashboard as primary, and as accent elsewhere
 */
export const accent = {
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
  950: '#082f49',
} as const;

// ============================================================================
// Neutral Colors
// ============================================================================

/**
 * Neutral/Gray color scale
 * Used for text, backgrounds, borders, and dividers
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
  900: '#171717',
  950: '#0a0a0a',
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
 * Dark, immersive palette for festival experience
 */
export const festival = {
  /** Main dark background */
  dark: '#1a1a2e',
  /** Darker shade for depth */
  darker: '#12121f',
  /** Medium tone for cards */
  medium: '#16213e',
  /** Lighter accent areas */
  light: '#0f3460',
  /** Vibrant accent (red/pink) */
  accent: '#e94560',
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
 */
export const semanticDark = {
  // Backgrounds
  background: gray[950],
  backgroundAlt: gray[900],
  backgroundMuted: gray[800],
  surface: gray[900],
  surfaceAlt: gray[800],
  surfaceHover: gray[700],

  // Text
  text: gray[50],
  textSecondary: gray[400],
  textMuted: gray[500],
  textInverse: gray[900],

  // Borders
  border: gray[800],
  borderHover: gray[700],
  borderFocus: primary[400],
  divider: gray[800],

  // Interactive
  link: primary[400],
  linkHover: primary[300],
  focus: primary[400],
  focusRing: `${primary[400]}40`,

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
