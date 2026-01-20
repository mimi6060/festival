/**
 * Festival Platform - Unified Breakpoint System
 * @module @festival/shared/design-tokens/breakpoints
 *
 * Responsive breakpoints for consistent layouts across all apps.
 * Mobile-first approach: use min-width queries.
 */

// ============================================================================
// Breakpoint Values
// ============================================================================

/**
 * Breakpoint values in pixels
 * Based on common device widths
 */
export const breakpoints = {
  /** Extra small - 0px (mobile portrait) */
  xs: 0,
  /** Small - 640px (mobile landscape, small tablets) */
  sm: 640,
  /** Medium - 768px (tablets) */
  md: 768,
  /** Large - 1024px (laptops, desktops) */
  lg: 1024,
  /** Extra large - 1280px (large desktops) */
  xl: 1280,
  /** 2XL - 1536px (wide screens) */
  '2xl': 1536,
  /** 3XL - 1920px (ultra-wide screens) */
  '3xl': 1920,
} as const;

// ============================================================================
// Media Queries
// ============================================================================

/**
 * Min-width media queries (mobile-first)
 */
export const minWidth = {
  xs: `(min-width: ${breakpoints.xs}px)`,
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  '2xl': `(min-width: ${breakpoints['2xl']}px)`,
  '3xl': `(min-width: ${breakpoints['3xl']}px)`,
} as const;

/**
 * Max-width media queries (desktop-first)
 */
export const maxWidth = {
  xs: `(max-width: ${breakpoints.sm - 1}px)`,
  sm: `(max-width: ${breakpoints.md - 1}px)`,
  md: `(max-width: ${breakpoints.lg - 1}px)`,
  lg: `(max-width: ${breakpoints.xl - 1}px)`,
  xl: `(max-width: ${breakpoints['2xl'] - 1}px)`,
  '2xl': `(max-width: ${breakpoints['3xl'] - 1}px)`,
} as const;

/**
 * Range media queries (between breakpoints)
 */
export const between = {
  /** xs only: 0 - 639px */
  xsOnly: `(max-width: ${breakpoints.sm - 1}px)`,
  /** sm only: 640 - 767px */
  smOnly: `(min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.md - 1}px)`,
  /** md only: 768 - 1023px */
  mdOnly: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  /** lg only: 1024 - 1279px */
  lgOnly: `(min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints.xl - 1}px)`,
  /** xl only: 1280 - 1535px */
  xlOnly: `(min-width: ${breakpoints.xl}px) and (max-width: ${breakpoints['2xl'] - 1}px)`,
  /** 2xl only: 1536 - 1919px */
  '2xlOnly': `(min-width: ${breakpoints['2xl']}px) and (max-width: ${breakpoints['3xl'] - 1}px)`,
  /** sm to md: 640 - 1023px */
  smToMd: `(min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.lg - 1}px)`,
  /** md to lg: 768 - 1279px */
  mdToLg: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.xl - 1}px)`,
  /** sm to lg: 640 - 1279px */
  smToLg: `(min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.xl - 1}px)`,
} as const;

/**
 * Semantic device-based queries
 */
export const device = {
  /** Mobile devices: < 768px */
  mobile: `(max-width: ${breakpoints.md - 1}px)`,
  /** Tablet devices: 768px - 1023px */
  tablet: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  /** Desktop devices: >= 1024px */
  desktop: `(min-width: ${breakpoints.lg}px)`,
  /** Large desktop: >= 1280px */
  largeDesktop: `(min-width: ${breakpoints.xl}px)`,
  /** Touch devices */
  touch: '(hover: none) and (pointer: coarse)',
  /** Mouse/pointer devices */
  mouse: '(hover: hover) and (pointer: fine)',
} as const;

// ============================================================================
// Feature Queries
// ============================================================================

/**
 * User preference media queries
 */
export const preference = {
  /** Prefers dark color scheme */
  darkMode: '(prefers-color-scheme: dark)',
  /** Prefers light color scheme */
  lightMode: '(prefers-color-scheme: light)',
  /** Prefers reduced motion */
  reducedMotion: '(prefers-reduced-motion: reduce)',
  /** No reduced motion preference */
  noReducedMotion: '(prefers-reduced-motion: no-preference)',
  /** Prefers high contrast */
  highContrast: '(prefers-contrast: high)',
  /** Prefers reduced transparency */
  reducedTransparency: '(prefers-reduced-transparency: reduce)',
} as const;

/**
 * Orientation queries
 */
export const orientation = {
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
} as const;

// ============================================================================
// Full Media Query Strings
// ============================================================================

/**
 * Complete media query strings with @media prefix
 */
export const mediaQuery = {
  // Min-width (mobile-first)
  sm: `@media ${minWidth.sm}`,
  md: `@media ${minWidth.md}`,
  lg: `@media ${minWidth.lg}`,
  xl: `@media ${minWidth.xl}`,
  '2xl': `@media ${minWidth['2xl']}`,
  '3xl': `@media ${minWidth['3xl']}`,

  // Max-width (desktop-first)
  maxXs: `@media ${maxWidth.xs}`,
  maxSm: `@media ${maxWidth.sm}`,
  maxMd: `@media ${maxWidth.md}`,
  maxLg: `@media ${maxWidth.lg}`,
  maxXl: `@media ${maxWidth.xl}`,

  // Device types
  mobile: `@media ${device.mobile}`,
  tablet: `@media ${device.tablet}`,
  desktop: `@media ${device.desktop}`,
  touch: `@media ${device.touch}`,

  // Preferences
  dark: `@media ${preference.darkMode}`,
  light: `@media ${preference.lightMode}`,
  reducedMotion: `@media ${preference.reducedMotion}`,
  highContrast: `@media ${preference.highContrast}`,

  // Orientation
  portrait: `@media ${orientation.portrait}`,
  landscape: `@media ${orientation.landscape}`,
} as const;

// ============================================================================
// Container Widths
// ============================================================================

/**
 * Max-width values for container components
 */
export const container = {
  /** Small container - 640px */
  sm: '640px',
  /** Medium container - 768px */
  md: '768px',
  /** Large container - 1024px */
  lg: '1024px',
  /** Extra large container - 1280px */
  xl: '1280px',
  /** 2XL container - 1536px */
  '2xl': '1536px',
  /** Full width */
  full: '100%',
} as const;

/**
 * Container max-widths in pixels
 */
export const containerPx = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a width is within a breakpoint range
 * @param width - Current viewport width
 * @param breakpoint - Breakpoint name
 * @returns boolean
 */
export function isBreakpoint(width: number, breakpoint: keyof typeof breakpoints): boolean {
  const bp = breakpoints[breakpoint];
  const nextBpKey = getNextBreakpoint(breakpoint);
  const nextBp = nextBpKey ? breakpoints[nextBpKey] : Infinity;
  return width >= bp && width < nextBp;
}

/**
 * Get the next breakpoint key
 */
function getNextBreakpoint(current: keyof typeof breakpoints): keyof typeof breakpoints | null {
  const keys = Object.keys(breakpoints) as (keyof typeof breakpoints)[];
  const currentIndex = keys.indexOf(current);
  return currentIndex < keys.length - 1 ? (keys[currentIndex + 1] ?? null) : null;
}

/**
 * Get current breakpoint name from width
 */
export function getCurrentBreakpoint(width: number): keyof typeof breakpoints {
  if (width >= breakpoints['3xl']) {
    return '3xl';
  }
  if (width >= breakpoints['2xl']) {
    return '2xl';
  }
  if (width >= breakpoints.xl) {
    return 'xl';
  }
  if (width >= breakpoints.lg) {
    return 'lg';
  }
  if (width >= breakpoints.md) {
    return 'md';
  }
  if (width >= breakpoints.sm) {
    return 'sm';
  }
  return 'xs';
}

// ============================================================================
// Exports
// ============================================================================

export type Breakpoints = typeof breakpoints;
export type MediaQuery = typeof mediaQuery;
export type Container = typeof container;
