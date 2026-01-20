/**
 * Festival Platform - Unified Animation System
 * @module @festival/shared/design-tokens/animations
 *
 * Animation tokens including durations, easing functions, and transitions.
 */

// ============================================================================
// Duration
// ============================================================================

/**
 * Animation duration scale in milliseconds
 */
export const duration = {
  /** 0ms - Instant */
  0: 0,
  /** 50ms - Micro interactions */
  50: 50,
  /** 75ms - Very fast */
  75: 75,
  /** 100ms - Fast feedback */
  100: 100,
  /** 150ms - Default fast */
  150: 150,
  /** 200ms - Quick */
  200: 200,
  /** 300ms - Normal */
  300: 300,
  /** 500ms - Deliberate */
  500: 500,
  /** 700ms - Slow */
  700: 700,
  /** 1000ms - Very slow */
  1000: 1000,
} as const;

/**
 * Duration in CSS format
 */
export const durationCSS = {
  0: '0ms',
  50: '50ms',
  75: '75ms',
  100: '100ms',
  150: '150ms',
  200: '200ms',
  300: '300ms',
  500: '500ms',
  700: '700ms',
  1000: '1000ms',
} as const;

/**
 * Semantic duration names
 */
export const semanticDuration = {
  /** Instant feedback */
  instant: duration[50],
  /** Fast transitions */
  fast: duration[150],
  /** Normal animations */
  normal: duration[300],
  /** Deliberate, attention-drawing */
  slow: duration[500],
  /** Dramatic effects */
  slower: duration[700],
  /** Maximum duration */
  slowest: duration[1000],
} as const;

// ============================================================================
// Easing Functions
// ============================================================================

/**
 * CSS easing functions (cubic-bezier)
 */
export const easing = {
  /** Linear - constant speed */
  linear: 'linear',

  /** Ease - subtle acceleration/deceleration */
  ease: 'ease',

  /** Ease in - starts slow, accelerates */
  easeIn: 'ease-in',

  /** Ease out - starts fast, decelerates */
  easeOut: 'ease-out',

  /** Ease in-out - slow start and end */
  easeInOut: 'ease-in-out',

  // Custom cubic-beziers

  /** Material Design standard easing */
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',

  /** Deceleration curve - for entering elements */
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',

  /** Acceleration curve - for exiting elements */
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',

  /** Sharp curve - for elements that may return */
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',

  /** Bounce - playful overshoot */
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  /** Spring - natural spring motion */
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',

  /** Smooth - gentle, natural feel */
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',

  /** Snappy - quick, responsive */
  snappy: 'cubic-bezier(0.4, 0, 0, 1)',

  /** Back - slight overshoot at end */
  back: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  /** Elastic - bouncy spring effect */
  elastic: 'cubic-bezier(0.5, 1.5, 0.5, 1)',
} as const;

// ============================================================================
// Transition Presets
// ============================================================================

/**
 * Pre-configured CSS transition properties
 */
export const transition = {
  /** No transition */
  none: 'none',

  /** All properties */
  all: `all ${durationCSS[150]} ${easing.standard}`,

  /** Colors only (background, border, text) */
  colors: `color ${durationCSS[150]} ${easing.standard}, background-color ${durationCSS[150]} ${easing.standard}, border-color ${durationCSS[150]} ${easing.standard}`,

  /** Opacity only */
  opacity: `opacity ${durationCSS[150]} ${easing.standard}`,

  /** Shadow only */
  shadow: `box-shadow ${durationCSS[150]} ${easing.standard}`,

  /** Transform only */
  transform: `transform ${durationCSS[150]} ${easing.standard}`,

  /** Default - common properties */
  DEFAULT: `color ${durationCSS[150]} ${easing.standard}, background-color ${durationCSS[150]} ${easing.standard}, border-color ${durationCSS[150]} ${easing.standard}, box-shadow ${durationCSS[150]} ${easing.standard}, opacity ${durationCSS[150]} ${easing.standard}, transform ${durationCSS[150]} ${easing.standard}`,
} as const;

/**
 * Transition properties list (for Tailwind extend)
 */
export const transitionProperty = {
  none: 'none',
  all: 'all',
  DEFAULT:
    'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
  colors: 'color, background-color, border-color, text-decoration-color, fill, stroke',
  opacity: 'opacity',
  shadow: 'box-shadow',
  transform: 'transform',
  width: 'width',
  height: 'height',
  spacing: 'margin, padding',
} as const;

// ============================================================================
// React Native Animation Config
// ============================================================================

/**
 * Animation configuration for React Native Animated/Reanimated
 */
export const mobileAnimation = {
  /** Spring configuration */
  spring: {
    /** Gentle spring */
    gentle: {
      damping: 20,
      mass: 1,
      stiffness: 100,
    },
    /** Default spring */
    DEFAULT: {
      damping: 15,
      mass: 1,
      stiffness: 150,
    },
    /** Bouncy spring */
    bouncy: {
      damping: 10,
      mass: 1,
      stiffness: 200,
    },
    /** Stiff spring */
    stiff: {
      damping: 20,
      mass: 1,
      stiffness: 300,
    },
  },

  /** Timing configuration */
  timing: {
    fast: {
      duration: 150,
    },
    normal: {
      duration: 300,
    },
    slow: {
      duration: 500,
    },
  },
} as const;

// ============================================================================
// Keyframe Animations
// ============================================================================

/**
 * Common keyframe animation definitions
 * Can be used with CSS @keyframes or animation libraries
 */
export const keyframes = {
  /** Fade in */
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },

  /** Fade out */
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },

  /** Slide up */
  slideUp: {
    from: { transform: 'translateY(100%)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },

  /** Slide down */
  slideDown: {
    from: { transform: 'translateY(-100%)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },

  /** Slide in from left */
  slideLeft: {
    from: { transform: 'translateX(-100%)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
  },

  /** Slide in from right */
  slideRight: {
    from: { transform: 'translateX(100%)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
  },

  /** Scale up */
  scaleUp: {
    from: { transform: 'scale(0.95)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
  },

  /** Scale down */
  scaleDown: {
    from: { transform: 'scale(1.05)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
  },

  /** Spin/rotate */
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },

  /** Pulse */
  pulse: {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 },
  },

  /** Bounce */
  bounce: {
    '0%, 100%': {
      transform: 'translateY(-25%)',
      animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
    },
    '50%': {
      transform: 'translateY(0)',
      animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
    },
  },

  /** Shake */
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
  },
} as const;

// ============================================================================
// Exports
// ============================================================================

export const animations = {
  duration,
  durationCSS,
  semanticDuration,
  easing,
  transition,
  transitionProperty,
  mobileAnimation,
  keyframes,
} as const;

export type Duration = typeof duration;
export type Easing = typeof easing;
export type Transition = typeof transition;
export type MobileAnimation = typeof mobileAnimation;
export type Keyframes = typeof keyframes;
