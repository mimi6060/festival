/**
 * Festival Platform - Unified Border System
 * @module @festival/shared/design-tokens/borders
 *
 * Border tokens including radius, width, and styles.
 */

// ============================================================================
// Border Radius
// ============================================================================

/**
 * Border radius scale in rem
 */
export const borderRadius = {
  /** No radius */
  none: '0',
  /** 2px - Very subtle */
  sm: '0.125rem',
  /** 4px - Default subtle */
  DEFAULT: '0.25rem',
  /** 6px - Medium */
  md: '0.375rem',
  /** 8px - Noticeable */
  lg: '0.5rem',
  /** 12px - Prominent */
  xl: '0.75rem',
  /** 16px - Large */
  '2xl': '1rem',
  /** 24px - Extra large */
  '3xl': '1.5rem',
  /** Full circle/pill */
  full: '9999px',
} as const;

/**
 * Border radius in pixels (for React Native and calculations)
 */
export const borderRadiusPx = {
  none: 0,
  sm: 2,
  DEFAULT: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
} as const;

// ============================================================================
// Border Width
// ============================================================================

/**
 * Border width scale
 */
export const borderWidth = {
  /** No border */
  0: '0px',
  /** 1px - Default */
  DEFAULT: '1px',
  /** 2px - Emphasized */
  2: '2px',
  /** 4px - Strong */
  4: '4px',
  /** 8px - Very strong */
  8: '8px',
} as const;

/**
 * Border width in pixels
 */
export const borderWidthPx = {
  0: 0,
  DEFAULT: 1,
  2: 2,
  4: 4,
  8: 8,
} as const;

// ============================================================================
// Border Styles
// ============================================================================

/**
 * Border style values
 */
export const borderStyle = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
  double: 'double',
  none: 'none',
} as const;

// ============================================================================
// Component-Specific Border Radius
// ============================================================================

/**
 * Pre-defined border radius for common components
 */
export const componentRadius = {
  /** Button radius variations */
  button: {
    sm: borderRadius.md,
    md: borderRadius.lg,
    lg: borderRadius.xl,
    pill: borderRadius.full,
  },

  /** Card radius */
  card: {
    sm: borderRadius.lg,
    md: borderRadius.xl,
    lg: borderRadius['2xl'],
  },

  /** Input field radius */
  input: {
    sm: borderRadius.md,
    md: borderRadius.lg,
    lg: borderRadius.xl,
  },

  /** Modal/Dialog radius */
  modal: {
    sm: borderRadius.xl,
    md: borderRadius['2xl'],
    lg: borderRadius['3xl'],
  },

  /** Badge radius */
  badge: borderRadius.full,

  /** Avatar radius */
  avatar: borderRadius.full,

  /** Chip/Tag radius */
  chip: borderRadius.full,

  /** Tooltip radius */
  tooltip: borderRadius.md,

  /** Dropdown/Menu radius */
  dropdown: borderRadius.lg,

  /** Image radius */
  image: {
    sm: borderRadius.md,
    md: borderRadius.lg,
    lg: borderRadius.xl,
  },
} as const;

/**
 * Component radius in pixels (for React Native)
 */
export const componentRadiusPx = {
  button: {
    sm: 6,
    md: 8,
    lg: 12,
    pill: 9999,
  },
  card: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  input: {
    sm: 6,
    md: 8,
    lg: 12,
  },
  modal: {
    sm: 12,
    md: 16,
    lg: 24,
  },
  badge: 9999,
  avatar: 9999,
  chip: 9999,
  tooltip: 6,
  dropdown: 8,
  image: {
    sm: 6,
    md: 8,
    lg: 12,
  },
} as const;

// ============================================================================
// Outline
// ============================================================================

/**
 * Outline styles for focus states
 */
export const outline = {
  /** No outline */
  none: 'none',

  /** Default outline */
  DEFAULT: '2px solid',

  /** Offset for accessibility */
  offset: {
    0: '0px',
    1: '1px',
    2: '2px',
    4: '4px',
    8: '8px',
  },
} as const;

// ============================================================================
// Exports
// ============================================================================

export const borders = {
  radius: borderRadius,
  radiusPx: borderRadiusPx,
  width: borderWidth,
  widthPx: borderWidthPx,
  style: borderStyle,
  componentRadius,
  componentRadiusPx,
  outline,
} as const;

export type BorderRadius = typeof borderRadius;
export type BorderWidth = typeof borderWidth;
export type BorderStyle = typeof borderStyle;
export type ComponentRadius = typeof componentRadius;
