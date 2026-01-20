/**
 * Festival Platform - Unified Typography System
 * @module @festival/shared/design-tokens/typography
 *
 * Typography tokens for consistent text styling across all apps.
 * Includes font families, sizes, weights, line heights, and letter spacing.
 */

// ============================================================================
// Font Families
// ============================================================================

/**
 * Font family definitions
 */
export const fontFamily = {
  /** Primary sans-serif font stack */
  sans: "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",

  /** Monospace font stack for code */
  mono: "'Fira Code', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",

  /** Serif font stack for editorial content */
  serif: "'Merriweather', Georgia, Cambria, 'Times New Roman', Times, serif",

  /** Display font for headings and hero text */
  display: "'Outfit', 'Inter', ui-sans-serif, system-ui, sans-serif",
} as const;

/**
 * Font family as array (for React Native)
 */
export const fontFamilyArray = {
  sans: ['Inter', 'System'],
  mono: ['Fira Code', 'monospace'],
  serif: ['Merriweather', 'serif'],
  display: ['Outfit', 'Inter', 'System'],
} as const;

// ============================================================================
// Font Sizes
// ============================================================================

/**
 * Font size scale in rem
 * Based on 16px root size
 */
export const fontSize = {
  /** 12px - Extra small text, captions */
  xs: '0.75rem',
  /** 14px - Small text, labels */
  sm: '0.875rem',
  /** 16px - Base/body text */
  base: '1rem',
  /** 18px - Large body text */
  lg: '1.125rem',
  /** 20px - Small headings */
  xl: '1.25rem',
  /** 24px - Section headings */
  '2xl': '1.5rem',
  /** 30px - Page titles */
  '3xl': '1.875rem',
  /** 36px - Large titles */
  '4xl': '2.25rem',
  /** 48px - Hero text */
  '5xl': '3rem',
  /** 60px - Display text */
  '6xl': '3.75rem',
  /** 72px - Massive display */
  '7xl': '4.5rem',
  /** 96px - Ultra display */
  '8xl': '6rem',
  /** 128px - Maximum display */
  '9xl': '8rem',
} as const;

/**
 * Font sizes in pixels (for React Native and calculations)
 */
export const fontSizePx = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
  '8xl': 96,
  '9xl': 128,
} as const;

// ============================================================================
// Font Weights
// ============================================================================

/**
 * Font weight scale
 */
export const fontWeight = {
  /** 100 - Hairline */
  thin: 100,
  /** 200 - Ultra light */
  extralight: 200,
  /** 300 - Light */
  light: 300,
  /** 400 - Regular/Normal */
  normal: 400,
  /** 500 - Medium */
  medium: 500,
  /** 600 - Semi bold */
  semibold: 600,
  /** 700 - Bold */
  bold: 700,
  /** 800 - Extra bold */
  extrabold: 800,
  /** 900 - Black */
  black: 900,
} as const;

// ============================================================================
// Line Heights
// ============================================================================

/**
 * Line height scale
 */
export const lineHeight = {
  /** 1 - No extra spacing (display text) */
  none: 1,
  /** 1.25 - Very tight (large headings) */
  tight: 1.25,
  /** 1.375 - Slightly tight (headings) */
  snug: 1.375,
  /** 1.5 - Normal (body text) */
  normal: 1.5,
  /** 1.625 - Slightly loose (prose) */
  relaxed: 1.625,
  /** 2 - Very loose (wide spacing) */
  loose: 2,
} as const;

/**
 * Line height with corresponding font sizes (em values)
 */
export const lineHeightEm = {
  xs: '1rem', // 16px when font is 12px
  sm: '1.25rem', // 20px when font is 14px
  base: '1.5rem', // 24px when font is 16px
  lg: '1.75rem', // 28px when font is 18px
  xl: '1.75rem', // 28px when font is 20px
  '2xl': '2rem', // 32px when font is 24px
  '3xl': '2.25rem', // 36px when font is 30px
  '4xl': '2.5rem', // 40px when font is 36px
  '5xl': '1', // 48px when font is 48px (tight)
  '6xl': '1', // 60px when font is 60px (tight)
  '7xl': '1', // 72px when font is 72px (tight)
  '8xl': '1', // 96px when font is 96px (tight)
  '9xl': '1', // 128px when font is 128px (tight)
} as const;

// ============================================================================
// Letter Spacing
// ============================================================================

/**
 * Letter spacing (tracking) scale
 */
export const letterSpacing = {
  /** -0.05em - Very tight (large display text) */
  tighter: '-0.05em',
  /** -0.025em - Slightly tight (headings) */
  tight: '-0.025em',
  /** 0 - Normal */
  normal: '0',
  /** 0.025em - Slightly wide */
  wide: '0.025em',
  /** 0.05em - Wide (buttons, labels) */
  wider: '0.05em',
  /** 0.1em - Very wide (all caps) */
  widest: '0.1em',
} as const;

// ============================================================================
// Typography Presets
// ============================================================================

/**
 * Pre-configured typography styles for common use cases
 * Combines font size, weight, line height, and letter spacing
 */
export const textStyles = {
  /** Display text - Hero headings */
  display: {
    lg: {
      fontFamily: fontFamily.display,
      fontSize: fontSize['6xl'],
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.none,
      letterSpacing: letterSpacing.tight,
    },
    md: {
      fontFamily: fontFamily.display,
      fontSize: fontSize['5xl'],
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.none,
      letterSpacing: letterSpacing.tight,
    },
    sm: {
      fontFamily: fontFamily.display,
      fontSize: fontSize['4xl'],
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.tight,
      letterSpacing: letterSpacing.tight,
    },
  },

  /** Headings */
  heading: {
    h1: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize['3xl'],
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.tight,
      letterSpacing: letterSpacing.tight,
    },
    h2: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.tight,
      letterSpacing: letterSpacing.tight,
    },
    h3: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.snug,
      letterSpacing: letterSpacing.normal,
    },
    h4: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.snug,
      letterSpacing: letterSpacing.normal,
    },
    h5: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.normal,
    },
    h6: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.wide,
    },
  },

  /** Body text */
  body: {
    lg: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.normal,
      lineHeight: lineHeight.relaxed,
      letterSpacing: letterSpacing.normal,
    },
    md: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.base,
      fontWeight: fontWeight.normal,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.normal,
    },
    sm: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.normal,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.normal,
    },
  },

  /** Caption and small text */
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },

  /** Labels */
  label: {
    lg: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.normal,
    },
    md: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.wide,
    },
    sm: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      lineHeight: lineHeight.none,
      letterSpacing: letterSpacing.wider,
    },
  },

  /** Button text */
  button: {
    lg: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.none,
      letterSpacing: letterSpacing.wide,
    },
    md: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.none,
      letterSpacing: letterSpacing.wide,
    },
    sm: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.none,
      letterSpacing: letterSpacing.wide,
    },
    xs: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.none,
      letterSpacing: letterSpacing.wider,
    },
  },

  /** Code/monospace */
  code: {
    inline: {
      fontFamily: fontFamily.mono,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.normal,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.normal,
    },
    block: {
      fontFamily: fontFamily.mono,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.normal,
      lineHeight: lineHeight.relaxed,
      letterSpacing: letterSpacing.normal,
    },
  },

  /** Overline text (all caps labels) */
  overline: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.widest,
    textTransform: 'uppercase' as const,
  },
} as const;

// ============================================================================
// Mobile-specific Typography (React Native)
// ============================================================================

/**
 * Typography presets for React Native (using pixel values)
 */
export const mobileTextStyles = {
  display: {
    lg: { fontSize: 60, fontWeight: '700' as const, lineHeight: 60 },
    md: { fontSize: 48, fontWeight: '700' as const, lineHeight: 48 },
    sm: { fontSize: 36, fontWeight: '700' as const, lineHeight: 40 },
  },
  heading: {
    h1: { fontSize: 30, fontWeight: '700' as const, lineHeight: 36 },
    h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 30 },
    h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26 },
    h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
    h5: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
    h6: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  },
  body: {
    lg: { fontSize: 18, fontWeight: '400' as const, lineHeight: 28 },
    md: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
    sm: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  label: {
    lg: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
    md: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
    sm: { fontSize: 12, fontWeight: '500' as const, lineHeight: 12 },
  },
  button: {
    lg: { fontSize: 18, fontWeight: '600' as const, lineHeight: 18 },
    md: { fontSize: 16, fontWeight: '600' as const, lineHeight: 16 },
    sm: { fontSize: 14, fontWeight: '600' as const, lineHeight: 14 },
    xs: { fontSize: 12, fontWeight: '600' as const, lineHeight: 12 },
  },
} as const;

// ============================================================================
// Typography Utilities
// ============================================================================

/**
 * Typography configuration object
 * Combines all typography tokens
 */
export const typography = {
  fontFamily,
  fontFamilyArray,
  fontSize,
  fontSizePx,
  fontWeight,
  lineHeight,
  lineHeightEm,
  letterSpacing,
  textStyles,
  mobileTextStyles,
} as const;

export type Typography = typeof typography;
export type FontFamily = typeof fontFamily;
export type FontSize = typeof fontSize;
export type FontWeight = typeof fontWeight;
export type LineHeight = typeof lineHeight;
export type LetterSpacing = typeof letterSpacing;
export type TextStyles = typeof textStyles;
