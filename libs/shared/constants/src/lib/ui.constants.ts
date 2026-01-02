/**
 * UI Constants - Design System
 * @module @festival/constants/ui
 */

/**
 * Color palette - Brand colors
 */
export const COLORS = {
  /** Primary brand colors */
  PRIMARY: {
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
  },

  /** Secondary brand colors */
  SECONDARY: {
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
  },

  /** Accent colors */
  ACCENT: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },

  /** Neutral/Gray colors */
  NEUTRAL: {
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
  },

  /** Success colors */
  SUCCESS: {
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
  },

  /** Warning colors */
  WARNING: {
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
  },

  /** Error/Danger colors */
  ERROR: {
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
  },

  /** Info colors */
  INFO: {
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
  },

  /** Festival-specific theme colors */
  FESTIVAL: {
    /** Main stage - vibrant purple */
    MAIN_STAGE: '#8b5cf6',
    /** Electronic stage - neon cyan */
    ELECTRONIC: '#06b6d4',
    /** Rock stage - bold red */
    ROCK: '#ef4444',
    /** Jazz stage - warm gold */
    JAZZ: '#eab308',
    /** Chill zone - calm teal */
    CHILL: '#14b8a6',
    /** VIP - luxurious gold */
    VIP: '#d4af37',
    /** Food court - appetizing orange */
    FOOD: '#fb923c',
    /** Camping - nature green */
    CAMPING: '#22c55e',
  },

  /** Semantic colors */
  SEMANTIC: {
    background: '#ffffff',
    backgroundAlt: '#f9fafb',
    backgroundDark: '#111827',
    surface: '#ffffff',
    surfaceAlt: '#f3f4f6',
    text: '#111827',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',
    textInverse: '#ffffff',
    border: '#e5e7eb',
    borderDark: '#d1d5db',
    divider: '#f3f4f6',
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(255, 255, 255, 0.9)',
  },
} as const;

/**
 * Responsive breakpoints (in pixels)
 * Mobile-first approach: min-width queries
 */
export const BREAKPOINTS = {
  /** Extra small devices (phones) */
  XS: 0,
  /** Small devices (large phones) */
  SM: 640,
  /** Medium devices (tablets) */
  MD: 768,
  /** Large devices (laptops) */
  LG: 1024,
  /** Extra large devices (desktops) */
  XL: 1280,
  /** 2X large devices (large desktops) */
  XXL: 1536,
  /** Ultra wide screens */
  XXXL: 1920,
} as const;

/**
 * Breakpoint media queries for CSS-in-JS
 */
export const MEDIA_QUERIES = {
  SM: `@media (min-width: ${BREAKPOINTS.SM}px)`,
  MD: `@media (min-width: ${BREAKPOINTS.MD}px)`,
  LG: `@media (min-width: ${BREAKPOINTS.LG}px)`,
  XL: `@media (min-width: ${BREAKPOINTS.XL}px)`,
  XXL: `@media (min-width: ${BREAKPOINTS.XXL}px)`,
  /** Mobile only */
  MOBILE: `@media (max-width: ${BREAKPOINTS.MD - 1}px)`,
  /** Tablet only */
  TABLET: `@media (min-width: ${BREAKPOINTS.MD}px) and (max-width: ${BREAKPOINTS.LG - 1}px)`,
  /** Desktop only */
  DESKTOP: `@media (min-width: ${BREAKPOINTS.LG}px)`,
  /** Prefers reduced motion */
  REDUCED_MOTION: '@media (prefers-reduced-motion: reduce)',
  /** Dark mode preference */
  DARK_MODE: '@media (prefers-color-scheme: dark)',
  /** Light mode preference */
  LIGHT_MODE: '@media (prefers-color-scheme: light)',
  /** High contrast */
  HIGH_CONTRAST: '@media (prefers-contrast: high)',
  /** Touch devices */
  TOUCH: '@media (hover: none) and (pointer: coarse)',
  /** Mouse devices */
  MOUSE: '@media (hover: hover) and (pointer: fine)',
} as const;

/**
 * Animation durations (in milliseconds)
 */
export const ANIMATION_DURATION = {
  /** Instant - for micro-interactions */
  INSTANT: 50,
  /** Fast - quick feedback */
  FAST: 150,
  /** Normal - standard transitions */
  NORMAL: 300,
  /** Slow - deliberate animations */
  SLOW: 500,
  /** Slower - attention-drawing */
  SLOWER: 700,
  /** Slowest - dramatic effects */
  SLOWEST: 1000,
} as const;

/**
 * Animation durations as CSS strings
 */
export const ANIMATION_DURATION_CSS = {
  INSTANT: '50ms',
  FAST: '150ms',
  NORMAL: '300ms',
  SLOW: '500ms',
  SLOWER: '700ms',
  SLOWEST: '1000ms',
} as const;

/**
 * Easing functions
 */
export const EASING = {
  /** Linear - constant speed */
  LINEAR: 'linear',
  /** Ease - subtle acceleration/deceleration */
  EASE: 'ease',
  /** Ease in - start slow */
  EASE_IN: 'ease-in',
  /** Ease out - end slow */
  EASE_OUT: 'ease-out',
  /** Ease in out - start and end slow */
  EASE_IN_OUT: 'ease-in-out',
  /** Custom cubic beziers */
  BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  SMOOTH: 'cubic-bezier(0.4, 0, 0.2, 1)',
  SNAPPY: 'cubic-bezier(0.4, 0, 0, 1)',
  SPRING: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

/**
 * Spacing scale (in pixels) - 4px base
 */
export const SPACING = {
  0: 0,
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

/**
 * Typography scale
 */
export const TYPOGRAPHY = {
  /** Font families */
  FONT_FAMILY: {
    SANS: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    SERIF: "'Merriweather', Georgia, 'Times New Roman', serif",
    MONO: "'Fira Code', 'SF Mono', Monaco, Consolas, 'Liberation Mono', monospace",
    DISPLAY: "'Outfit', 'Inter', sans-serif",
  },

  /** Font sizes (in pixels) */
  FONT_SIZE: {
    XS: 12,
    SM: 14,
    BASE: 16,
    LG: 18,
    XL: 20,
    '2XL': 24,
    '3XL': 30,
    '4XL': 36,
    '5XL': 48,
    '6XL': 60,
    '7XL': 72,
    '8XL': 96,
    '9XL': 128,
  },

  /** Font weights */
  FONT_WEIGHT: {
    THIN: 100,
    EXTRALIGHT: 200,
    LIGHT: 300,
    NORMAL: 400,
    MEDIUM: 500,
    SEMIBOLD: 600,
    BOLD: 700,
    EXTRABOLD: 800,
    BLACK: 900,
  },

  /** Line heights */
  LINE_HEIGHT: {
    NONE: 1,
    TIGHT: 1.25,
    SNUG: 1.375,
    NORMAL: 1.5,
    RELAXED: 1.625,
    LOOSE: 2,
  },

  /** Letter spacing */
  LETTER_SPACING: {
    TIGHTER: '-0.05em',
    TIGHT: '-0.025em',
    NORMAL: '0',
    WIDE: '0.025em',
    WIDER: '0.05em',
    WIDEST: '0.1em',
  },
} as const;

/**
 * Border radius values (in pixels)
 */
export const BORDER_RADIUS = {
  NONE: 0,
  SM: 2,
  DEFAULT: 4,
  MD: 6,
  LG: 8,
  XL: 12,
  '2XL': 16,
  '3XL': 24,
  FULL: 9999,
} as const;

/**
 * Shadow definitions
 */
export const SHADOWS = {
  NONE: 'none',
  SM: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  MD: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  LG: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  XL: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2XL': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  INNER: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  /** Colored shadows */
  PRIMARY: '0 4px 14px 0 rgba(14, 165, 233, 0.3)',
  SUCCESS: '0 4px 14px 0 rgba(34, 197, 94, 0.3)',
  ERROR: '0 4px 14px 0 rgba(239, 68, 68, 0.3)',
} as const;

/**
 * Z-index scale
 */
export const Z_INDEX = {
  /** Below everything */
  NEGATIVE: -1,
  /** Default layer */
  DEFAULT: 0,
  /** Elevated content */
  ELEVATED: 10,
  /** Sticky elements */
  STICKY: 20,
  /** Fixed elements (headers) */
  FIXED: 30,
  /** Dropdowns, popovers */
  DROPDOWN: 40,
  /** Overlays, backdrops */
  OVERLAY: 50,
  /** Modals, dialogs */
  MODAL: 60,
  /** Tooltips */
  TOOLTIP: 70,
  /** Notifications, toasts */
  NOTIFICATION: 80,
  /** Maximum - debug, devtools */
  MAX: 9999,
} as const;

/**
 * Container max widths
 */
export const CONTAINER = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536,
  FULL: '100%',
} as const;

/**
 * Icon sizes
 */
export const ICON_SIZE = {
  XS: 12,
  SM: 16,
  MD: 20,
  LG: 24,
  XL: 32,
  '2XL': 40,
  '3XL': 48,
} as const;

/**
 * Button sizes
 */
export const BUTTON_SIZE = {
  XS: { height: 24, paddingX: 8, fontSize: 12 },
  SM: { height: 32, paddingX: 12, fontSize: 14 },
  MD: { height: 40, paddingX: 16, fontSize: 14 },
  LG: { height: 48, paddingX: 20, fontSize: 16 },
  XL: { height: 56, paddingX: 24, fontSize: 18 },
} as const;

/**
 * Input sizes
 */
export const INPUT_SIZE = {
  SM: { height: 32, paddingX: 12, fontSize: 14 },
  MD: { height: 40, paddingX: 14, fontSize: 14 },
  LG: { height: 48, paddingX: 16, fontSize: 16 },
} as const;
