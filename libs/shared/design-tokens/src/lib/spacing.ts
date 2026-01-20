/**
 * Festival Platform - Unified Spacing Scale
 * @module @festival/shared/design-tokens/spacing
 *
 * Spacing system based on a 4px base unit.
 * Follows Tailwind CSS conventions for familiarity.
 *
 * Usage:
 * - Import individual scales: spacing.md, spacing.lg
 * - Use semantic spacing: componentSpacing.card, componentSpacing.button
 * - Access pixel values: spacingPx[4] = 16
 */

// ============================================================================
// Core Spacing Scale (rem values)
// ============================================================================

/**
 * Base spacing scale in rem units
 * Based on 4px increments (1rem = 16px)
 */
export const spacing = {
  /** 0px */
  0: '0',
  /** 1px */
  px: '1px',
  /** 2px */
  '0.5': '0.125rem',
  /** 4px */
  1: '0.25rem',
  /** 6px */
  '1.5': '0.375rem',
  /** 8px */
  2: '0.5rem',
  /** 10px */
  '2.5': '0.625rem',
  /** 12px */
  3: '0.75rem',
  /** 14px */
  '3.5': '0.875rem',
  /** 16px */
  4: '1rem',
  /** 20px */
  5: '1.25rem',
  /** 24px */
  6: '1.5rem',
  /** 28px */
  7: '1.75rem',
  /** 32px */
  8: '2rem',
  /** 36px */
  9: '2.25rem',
  /** 40px */
  10: '2.5rem',
  /** 44px */
  11: '2.75rem',
  /** 48px */
  12: '3rem',
  /** 56px */
  14: '3.5rem',
  /** 64px */
  16: '4rem',
  /** 80px */
  20: '5rem',
  /** 96px */
  24: '6rem',
  /** 112px */
  28: '7rem',
  /** 128px */
  32: '8rem',
  /** 144px */
  36: '9rem',
  /** 160px */
  40: '10rem',
  /** 176px */
  44: '11rem',
  /** 192px */
  48: '12rem',
  /** 208px */
  52: '13rem',
  /** 224px */
  56: '14rem',
  /** 240px */
  60: '15rem',
  /** 256px */
  64: '16rem',
  /** 288px */
  72: '18rem',
  /** 320px */
  80: '20rem',
  /** 384px */
  96: '24rem',
} as const;

// ============================================================================
// Pixel Values (for JS calculations)
// ============================================================================

/**
 * Spacing scale in pixel values
 * Useful for React Native and JS calculations
 */
export const spacingPx = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
} as const;

// ============================================================================
// Semantic Spacing (named scales)
// ============================================================================

/**
 * Semantic spacing tokens
 * Named sizes for easier use in components
 */
export const semanticSpacing = {
  /** Extra small - 4px */
  xs: spacing[1],
  /** Small - 8px */
  sm: spacing[2],
  /** Medium - 16px */
  md: spacing[4],
  /** Large - 24px */
  lg: spacing[6],
  /** Extra large - 32px */
  xl: spacing[8],
  /** 2X large - 48px */
  '2xl': spacing[12],
  /** 3X large - 64px */
  '3xl': spacing[16],
  /** 4X large - 96px */
  '4xl': spacing[24],
} as const;

/**
 * Semantic spacing in pixels
 */
export const semanticSpacingPx = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
} as const;

// ============================================================================
// Component-Specific Spacing
// ============================================================================

/**
 * Component-specific spacing tokens
 * Pre-defined padding/margin values for UI components
 */
export const componentSpacing = {
  /** Button padding */
  button: {
    xs: { x: spacing[2], y: spacing[1] }, // 8px x 4px
    sm: { x: spacing[3], y: spacing['1.5'] }, // 12px x 6px
    md: { x: spacing[4], y: spacing[2] }, // 16px x 8px
    lg: { x: spacing[5], y: spacing['2.5'] }, // 20px x 10px
    xl: { x: spacing[6], y: spacing[3] }, // 24px x 12px
  },

  /** Card padding */
  card: {
    sm: spacing[3], // 12px
    md: spacing[4], // 16px
    lg: spacing[6], // 24px
    xl: spacing[8], // 32px
  },

  /** Input padding */
  input: {
    sm: { x: spacing[3], y: spacing[2] }, // 12px x 8px
    md: { x: spacing[4], y: spacing['2.5'] }, // 16px x 10px
    lg: { x: spacing[4], y: spacing[3] }, // 16px x 12px
  },

  /** Modal padding */
  modal: {
    sm: spacing[4], // 16px
    md: spacing[6], // 24px
    lg: spacing[8], // 32px
  },

  /** Section spacing */
  section: {
    sm: spacing[8], // 32px
    md: spacing[12], // 48px
    lg: spacing[16], // 64px
    xl: spacing[24], // 96px
  },

  /** Page padding */
  page: {
    x: spacing[4], // 16px horizontal
    y: spacing[6], // 24px vertical
    xLg: spacing[6], // 24px horizontal on larger screens
    yLg: spacing[8], // 32px vertical on larger screens
  },

  /** Stack spacing (between stacked elements) */
  stack: {
    xs: spacing[1], // 4px
    sm: spacing[2], // 8px
    md: spacing[4], // 16px
    lg: spacing[6], // 24px
    xl: spacing[8], // 32px
  },

  /** Inline spacing (between inline elements) */
  inline: {
    xs: spacing[1], // 4px
    sm: spacing[2], // 8px
    md: spacing[3], // 12px
    lg: spacing[4], // 16px
  },

  /** Badge padding */
  badge: {
    sm: { x: spacing[2], y: spacing['0.5'] }, // 8px x 2px
    md: { x: spacing['2.5'], y: spacing[1] }, // 10px x 4px
    lg: { x: spacing[3], y: spacing['1.5'] }, // 12px x 6px
  },
} as const;

/**
 * Component spacing in pixels (for React Native)
 */
export const componentSpacingPx = {
  button: {
    xs: { x: 8, y: 4 },
    sm: { x: 12, y: 6 },
    md: { x: 16, y: 8 },
    lg: { x: 20, y: 10 },
    xl: { x: 24, y: 12 },
  },
  card: {
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
  input: {
    sm: { x: 12, y: 8 },
    md: { x: 16, y: 10 },
    lg: { x: 16, y: 12 },
  },
  modal: {
    sm: 16,
    md: 24,
    lg: 32,
  },
  section: {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  },
  page: {
    x: 16,
    y: 24,
    xLg: 24,
    yLg: 32,
  },
  stack: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  inline: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
  },
  badge: {
    sm: { x: 8, y: 2 },
    md: { x: 10, y: 4 },
    lg: { x: 12, y: 6 },
  },
} as const;

// ============================================================================
// Gap Utilities
// ============================================================================

/**
 * Common gap values for flex/grid layouts
 */
export const gap = {
  /** No gap */
  none: spacing[0],
  /** 4px */
  xs: spacing[1],
  /** 8px */
  sm: spacing[2],
  /** 16px */
  md: spacing[4],
  /** 24px */
  lg: spacing[6],
  /** 32px */
  xl: spacing[8],
  /** 48px */
  '2xl': spacing[12],
} as const;

/**
 * Gap in pixels
 */
export const gapPx = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

// ============================================================================
// Unified Spacing Scale (Primary API)
// ============================================================================

/**
 * Unified spacing scale for consistent spacing across all apps
 * Use this as the primary spacing API for component development
 *
 * Values (in pixels):
 * - xs: 4px   - Tight spacing (icons, badges)
 * - sm: 8px   - Compact spacing (inline elements)
 * - md: 16px  - Default spacing (padding, margins)
 * - lg: 24px  - Comfortable spacing (sections)
 * - xl: 32px  - Generous spacing (large sections)
 * - 2xl: 48px - Maximum spacing (page sections)
 */
export const unifiedSpacing = {
  /** 4px - Extra small spacing */
  xs: 4,
  /** 8px - Small spacing */
  sm: 8,
  /** 16px - Medium spacing (default) */
  md: 16,
  /** 24px - Large spacing */
  lg: 24,
  /** 32px - Extra large spacing */
  xl: 32,
  /** 48px - 2X large spacing */
  '2xl': 48,
} as const;

/**
 * Unified spacing scale in rem units (for CSS)
 * Based on 16px base font size
 */
export const unifiedSpacingRem = {
  /** 0.25rem (4px) */
  xs: '0.25rem',
  /** 0.5rem (8px) */
  sm: '0.5rem',
  /** 1rem (16px) */
  md: '1rem',
  /** 1.5rem (24px) */
  lg: '1.5rem',
  /** 2rem (32px) */
  xl: '2rem',
  /** 3rem (48px) */
  '2xl': '3rem',
} as const;

// ============================================================================
// Exports
// ============================================================================

export type Spacing = typeof spacing;
export type SpacingPx = typeof spacingPx;
export type SemanticSpacing = typeof semanticSpacing;
export type ComponentSpacing = typeof componentSpacing;
export type Gap = typeof gap;
export type UnifiedSpacing = typeof unifiedSpacing;
export type UnifiedSpacingRem = typeof unifiedSpacingRem;
