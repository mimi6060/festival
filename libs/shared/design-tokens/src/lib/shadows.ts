/**
 * Festival Platform - Unified Shadow System
 * @module @festival/shared/design-tokens/shadows
 *
 * Shadow tokens for consistent elevation and depth across all apps.
 */

// ============================================================================
// Box Shadows
// ============================================================================

/**
 * Standard box shadow scale
 * From subtle to dramatic elevation
 */
export const shadows = {
  /** No shadow */
  none: 'none',

  /** Subtle shadow - buttons, inputs */
  sm: '0 1px 2px rgba(0,0,0,0.05)',

  /** Default shadow - cards, dropdowns */
  DEFAULT: '0 2px 4px rgba(0,0,0,0.08)',

  /** Medium shadow - hovering cards, popovers */
  md: '0 4px 6px rgba(0,0,0,0.1)',

  /** Large shadow - modals, dialogs */
  lg: '0 10px 15px rgba(0,0,0,0.1)',

  /** Extra large shadow - floating elements */
  xl: '0 20px 25px rgba(0,0,0,0.15)',

  /** 2XL shadow - prominent floating elements */
  '2xl': '0 25px 50px rgba(0,0,0,0.25)',

  /** Inner shadow - pressed buttons, inset elements */
  inner: 'inset 0 2px 4px rgba(0,0,0,0.05)',
} as const;

// ============================================================================
// Colored Shadows
// ============================================================================

/**
 * Colored shadow variations
 * For emphasis and brand recognition
 */
export const coloredShadows = {
  /** Primary brand glow */
  primary: '0 4px 14px 0 rgba(217, 70, 239, 0.3)',
  primaryLg: '0 8px 24px 0 rgba(217, 70, 239, 0.35)',

  /** Secondary brand glow */
  secondary: '0 4px 14px 0 rgba(236, 72, 153, 0.3)',
  secondaryLg: '0 8px 24px 0 rgba(236, 72, 153, 0.35)',

  /** Accent (sky blue) glow */
  accent: '0 4px 14px 0 rgba(14, 165, 233, 0.3)',
  accentLg: '0 8px 24px 0 rgba(14, 165, 233, 0.35)',

  /** Success glow */
  success: '0 4px 14px 0 rgba(34, 197, 94, 0.3)',
  successLg: '0 8px 24px 0 rgba(34, 197, 94, 0.35)',

  /** Warning glow */
  warning: '0 4px 14px 0 rgba(245, 158, 11, 0.3)',
  warningLg: '0 8px 24px 0 rgba(245, 158, 11, 0.35)',

  /** Error glow */
  error: '0 4px 14px 0 rgba(239, 68, 68, 0.3)',
  errorLg: '0 8px 24px 0 rgba(239, 68, 68, 0.35)',

  /** Info glow */
  info: '0 4px 14px 0 rgba(59, 130, 246, 0.3)',
  infoLg: '0 8px 24px 0 rgba(59, 130, 246, 0.35)',
} as const;

// ============================================================================
// Dark Mode Shadows
// ============================================================================

/**
 * Shadows optimized for dark backgrounds
 * Uses lighter opacity and subtle color shifts
 */
export const darkShadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0,0,0,0.2)',
  DEFAULT: '0 2px 4px rgba(0,0,0,0.25)',
  md: '0 4px 6px rgba(0,0,0,0.3)',
  lg: '0 10px 15px rgba(0,0,0,0.35)',
  xl: '0 20px 25px rgba(0,0,0,0.4)',
  '2xl': '0 25px 50px rgba(0,0,0,0.5)',
  inner: 'inset 0 2px 4px rgba(0,0,0,0.2)',
} as const;

// ============================================================================
// React Native Shadows
// ============================================================================

/**
 * Shadow properties for React Native
 * iOS uses shadowX properties, Android uses elevation
 */
export const mobileShadows = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  DEFAULT: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 12,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 16,
  },
} as const;

// ============================================================================
// Focus Ring Shadows
// ============================================================================

/**
 * Focus ring shadows for accessibility
 */
export const focusRing = {
  /** Default focus ring */
  DEFAULT: '0 0 0 2px rgba(217, 70, 239, 0.5)',

  /** Primary focus ring */
  primary: '0 0 0 2px rgba(217, 70, 239, 0.5)',

  /** Accent focus ring */
  accent: '0 0 0 2px rgba(14, 165, 233, 0.5)',

  /** Error focus ring */
  error: '0 0 0 2px rgba(239, 68, 68, 0.5)',

  /** Offset focus ring (for dark backgrounds) */
  offset: '0 0 0 2px var(--theme-bg, #fff), 0 0 0 4px rgba(217, 70, 239, 0.5)',
} as const;

// ============================================================================
// Exports
// ============================================================================

export type Shadows = typeof shadows;
export type ColoredShadows = typeof coloredShadows;
export type DarkShadows = typeof darkShadows;
export type MobileShadows = typeof mobileShadows;
export type FocusRing = typeof focusRing;
