/**
 * Festival Platform - Shared Tailwind CSS Preset
 * @module @festival/ui/tailwind.preset
 *
 * This preset provides shared Tailwind configuration for web and admin apps.
 * It uses CSS custom properties from libs/ui/src/styles/tokens.css.
 *
 * Usage in your tailwind.config.js:
 * ```js
 * const festivalPreset = require('@festival/ui/tailwind.preset');
 * module.exports = {
 *   presets: [festivalPreset],
 *   // ... your app-specific config
 * };
 * ```
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand colors using CSS variables
        primary: {
          50: 'var(--festival-color-primary-50)',
          100: 'var(--festival-color-primary-100)',
          200: 'var(--festival-color-primary-200)',
          300: 'var(--festival-color-primary-300)',
          400: 'var(--festival-color-primary-400)',
          500: 'var(--festival-color-primary-500)',
          600: 'var(--festival-color-primary-600)',
          700: 'var(--festival-color-primary-700)',
          800: 'var(--festival-color-primary-800)',
          900: 'var(--festival-color-primary-900)',
          950: 'var(--festival-color-primary-950)',
          DEFAULT: 'var(--festival-color-primary-500)',
        },
        secondary: {
          50: 'var(--festival-color-secondary-50)',
          100: 'var(--festival-color-secondary-100)',
          200: 'var(--festival-color-secondary-200)',
          300: 'var(--festival-color-secondary-300)',
          400: 'var(--festival-color-secondary-400)',
          500: 'var(--festival-color-secondary-500)',
          600: 'var(--festival-color-secondary-600)',
          700: 'var(--festival-color-secondary-700)',
          800: 'var(--festival-color-secondary-800)',
          900: 'var(--festival-color-secondary-900)',
          950: 'var(--festival-color-secondary-950)',
          DEFAULT: 'var(--festival-color-secondary-500)',
        },
        accent: {
          50: 'var(--festival-color-accent-50)',
          100: 'var(--festival-color-accent-100)',
          200: 'var(--festival-color-accent-200)',
          300: 'var(--festival-color-accent-300)',
          400: 'var(--festival-color-accent-400)',
          500: 'var(--festival-color-accent-500)',
          600: 'var(--festival-color-accent-600)',
          700: 'var(--festival-color-accent-700)',
          800: 'var(--festival-color-accent-800)',
          900: 'var(--festival-color-accent-900)',
          950: 'var(--festival-color-accent-950)',
          DEFAULT: 'var(--festival-color-accent-500)',
        },
        // Semantic colors
        success: {
          50: 'var(--festival-color-success-50)',
          100: 'var(--festival-color-success-100)',
          200: 'var(--festival-color-success-200)',
          300: 'var(--festival-color-success-300)',
          400: 'var(--festival-color-success-400)',
          500: 'var(--festival-color-success-500)',
          600: 'var(--festival-color-success-600)',
          700: 'var(--festival-color-success-700)',
          DEFAULT: 'var(--festival-color-success-500)',
        },
        warning: {
          50: 'var(--festival-color-warning-50)',
          100: 'var(--festival-color-warning-100)',
          200: 'var(--festival-color-warning-200)',
          300: 'var(--festival-color-warning-300)',
          400: 'var(--festival-color-warning-400)',
          500: 'var(--festival-color-warning-500)',
          600: 'var(--festival-color-warning-600)',
          700: 'var(--festival-color-warning-700)',
          DEFAULT: 'var(--festival-color-warning-500)',
        },
        error: {
          50: 'var(--festival-color-error-50)',
          100: 'var(--festival-color-error-100)',
          200: 'var(--festival-color-error-200)',
          300: 'var(--festival-color-error-300)',
          400: 'var(--festival-color-error-400)',
          500: 'var(--festival-color-error-500)',
          600: 'var(--festival-color-error-600)',
          700: 'var(--festival-color-error-700)',
          DEFAULT: 'var(--festival-color-error-500)',
        },
        info: {
          50: 'var(--festival-color-info-50)',
          100: 'var(--festival-color-info-100)',
          200: 'var(--festival-color-info-200)',
          300: 'var(--festival-color-info-300)',
          400: 'var(--festival-color-info-400)',
          500: 'var(--festival-color-info-500)',
          600: 'var(--festival-color-info-600)',
          700: 'var(--festival-color-info-700)',
          DEFAULT: 'var(--festival-color-info-500)',
        },
        // Festival theme colors
        festival: {
          dark: 'var(--festival-color-festival-dark)',
          darker: 'var(--festival-color-festival-darker)',
          medium: 'var(--festival-color-festival-medium)',
          light: 'var(--festival-color-festival-light)',
          accent: 'var(--festival-color-festival-accent)',
        },
        // Theme-aware semantic colors
        theme: {
          bg: 'var(--festival-bg)',
          'bg-secondary': 'var(--festival-bg-secondary)',
          'bg-tertiary': 'var(--festival-bg-tertiary)',
          'bg-elevated': 'var(--festival-bg-elevated)',
          'bg-hover': 'var(--festival-bg-hover)',
          surface: 'var(--festival-surface)',
          'surface-hover': 'var(--festival-surface-hover)',
          'surface-active': 'var(--festival-surface-active)',
          'card-bg': 'var(--festival-card-bg)',
          'card-border': 'var(--festival-card-border)',
          'input-bg': 'var(--festival-input-bg)',
          'input-border': 'var(--festival-input-border)',
          'input-placeholder': 'var(--festival-input-placeholder)',
        },
        'theme-text': {
          primary: 'var(--festival-text-primary)',
          secondary: 'var(--festival-text-secondary)',
          tertiary: 'var(--festival-text-tertiary)',
          muted: 'var(--festival-text-muted)',
        },
        'theme-border': {
          DEFAULT: 'var(--festival-border)',
          hover: 'var(--festival-border-hover)',
          focus: 'var(--festival-border-focus)',
        },
      },
      backgroundColor: {
        theme: {
          DEFAULT: 'var(--festival-bg)',
          primary: 'var(--festival-bg)',
          secondary: 'var(--festival-bg-secondary)',
          tertiary: 'var(--festival-bg-tertiary)',
          elevated: 'var(--festival-bg-elevated)',
          hover: 'var(--festival-bg-hover)',
          surface: 'var(--festival-surface)',
          'surface-hover': 'var(--festival-surface-hover)',
          'surface-active': 'var(--festival-surface-active)',
          card: 'var(--festival-card-bg)',
          input: 'var(--festival-input-bg)',
        },
      },
      textColor: {
        theme: {
          DEFAULT: 'var(--festival-text-primary)',
          primary: 'var(--festival-text-primary)',
          secondary: 'var(--festival-text-secondary)',
          tertiary: 'var(--festival-text-tertiary)',
          muted: 'var(--festival-text-muted)',
        },
      },
      borderColor: {
        theme: {
          DEFAULT: 'var(--festival-border)',
          hover: 'var(--festival-border-hover)',
          focus: 'var(--festival-border-focus)',
        },
      },
      fontFamily: {
        sans: ['var(--festival-font-sans)'],
        mono: ['var(--festival-font-mono)'],
        display: ['var(--festival-font-display)'],
      },
      fontSize: {
        xs: 'var(--festival-text-xs)',
        sm: 'var(--festival-text-sm)',
        base: 'var(--festival-text-base)',
        lg: 'var(--festival-text-lg)',
        xl: 'var(--festival-text-xl)',
        '2xl': 'var(--festival-text-2xl)',
        '3xl': 'var(--festival-text-3xl)',
        '4xl': 'var(--festival-text-4xl)',
        '5xl': 'var(--festival-text-5xl)',
        '6xl': 'var(--festival-text-6xl)',
      },
      borderRadius: {
        none: 'var(--festival-radius-none)',
        sm: 'var(--festival-radius-sm)',
        md: 'var(--festival-radius-md)',
        lg: 'var(--festival-radius-lg)',
        xl: 'var(--festival-radius-xl)',
        '2xl': 'var(--festival-radius-2xl)',
        '3xl': 'var(--festival-radius-3xl)',
        full: 'var(--festival-radius-full)',
      },
      boxShadow: {
        sm: 'var(--festival-shadow-sm)',
        md: 'var(--festival-shadow-md)',
        lg: 'var(--festival-shadow-lg)',
        xl: 'var(--festival-shadow-xl)',
        '2xl': 'var(--festival-shadow-2xl)',
        inner: 'var(--festival-shadow-inner)',
        'glow-primary': 'var(--festival-shadow-glow-primary)',
        'glow-secondary': 'var(--festival-shadow-glow-secondary)',
        'glow-accent': 'var(--festival-shadow-glow-accent)',
        'glow-success': 'var(--festival-shadow-glow-success)',
        'glow-error': 'var(--festival-shadow-glow-error)',
      },
      transitionDuration: {
        75: 'var(--festival-duration-75)',
        100: 'var(--festival-duration-100)',
        150: 'var(--festival-duration-150)',
        200: 'var(--festival-duration-200)',
        300: 'var(--festival-duration-300)',
        500: 'var(--festival-duration-500)',
        700: 'var(--festival-duration-700)',
        1000: 'var(--festival-duration-1000)',
      },
      transitionTimingFunction: {
        linear: 'var(--festival-ease-linear)',
        in: 'var(--festival-ease-in)',
        out: 'var(--festival-ease-out)',
        'in-out': 'var(--festival-ease-in-out)',
        bounce: 'var(--festival-ease-bounce)',
      },
      zIndex: {
        dropdown: 'var(--festival-z-dropdown)',
        sticky: 'var(--festival-z-sticky)',
        modal: 'var(--festival-z-modal)',
        popover: 'var(--festival-z-popover)',
        tooltip: 'var(--festival-z-tooltip)',
        toast: 'var(--festival-z-toast)',
      },
    },
  },
  plugins: [],
};
