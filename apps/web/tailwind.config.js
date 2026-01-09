/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Logical properties for RTL support
      margin: {
        'inline-start-auto': 'auto',
        'inline-end-auto': 'auto',
      },
      padding: {
        'inline-start-auto': 'auto',
        'inline-end-auto': 'auto',
      },
      inset: {
        'inline-start-0': '0',
        'inline-end-0': '0',
      },
      colors: {
        // Brand colors
        primary: {
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
        // Festival theme colors
        festival: {
          dark: '#1a1a2e',
          darker: '#12121f',
          medium: '#16213e',
          light: '#0f3460',
          accent: '#e94560',
        },
        // Theme-aware colors using CSS variables
        theme: {
          bg: 'var(--theme-bg)',
          'bg-secondary': 'var(--theme-bg-secondary)',
          'bg-tertiary': 'var(--theme-bg-tertiary)',
          'bg-elevated': 'var(--theme-bg-elevated)',
          'bg-hover': 'var(--theme-bg-hover)',
          surface: 'var(--theme-surface)',
          'surface-hover': 'var(--theme-surface-hover)',
          'surface-active': 'var(--theme-surface-active)',
          'card-bg': 'var(--theme-card-bg)',
          'card-border': 'var(--theme-card-border)',
          'input-bg': 'var(--theme-input-bg)',
          'input-border': 'var(--theme-input-border)',
          'input-placeholder': 'var(--theme-input-placeholder)',
        },
        // Theme text colors
        'theme-text': {
          primary: 'var(--theme-text-primary)',
          secondary: 'var(--theme-text-secondary)',
          tertiary: 'var(--theme-text-tertiary)',
          muted: 'var(--theme-text-muted)',
        },
        // Theme border colors
        'theme-border': {
          DEFAULT: 'var(--theme-border)',
          hover: 'var(--theme-border-hover)',
          focus: 'var(--theme-border-focus)',
        },
      },
      backgroundColor: {
        theme: {
          DEFAULT: 'var(--theme-bg)',
          primary: 'var(--theme-bg)',
          secondary: 'var(--theme-bg-secondary)',
          tertiary: 'var(--theme-bg-tertiary)',
          elevated: 'var(--theme-bg-elevated)',
          hover: 'var(--theme-bg-hover)',
          surface: 'var(--theme-surface)',
          'surface-hover': 'var(--theme-surface-hover)',
          'surface-active': 'var(--theme-surface-active)',
          card: 'var(--theme-card-bg)',
          input: 'var(--theme-input-bg)',
        },
      },
      textColor: {
        theme: {
          DEFAULT: 'var(--theme-text-primary)',
          primary: 'var(--theme-text-primary)',
          secondary: 'var(--theme-text-secondary)',
          tertiary: 'var(--theme-text-tertiary)',
          muted: 'var(--theme-text-muted)',
        },
      },
      borderColor: {
        theme: {
          DEFAULT: 'var(--theme-border)',
          hover: 'var(--theme-border-hover)',
          focus: 'var(--theme-border-focus)',
        },
      },
      boxShadow: {
        'theme-sm': 'var(--theme-shadow-sm)',
        'theme-md': 'var(--theme-shadow-md)',
        'theme-lg': 'var(--theme-shadow-lg)',
        'theme-glow': 'var(--theme-shadow-glow)',
      },
      transitionProperty: {
        theme: 'color, background-color, border-color, box-shadow, opacity',
      },
    },
  },
  plugins: [
    // RTL variant plugin
    plugin(function ({ addVariant, e }) {
      // Add RTL variant (applies when dir="rtl" is set on html/body)
      addVariant('rtl', '[dir="rtl"] &');
      // Add LTR variant (applies when dir="ltr" is set on html/body)
      addVariant('ltr', '[dir="ltr"] &');
    }),
    // Logical properties plugin for RTL support
    plugin(function ({ addUtilities, theme, e }) {
      const spacing = theme('spacing');

      // Margin inline utilities
      const marginInlineUtilities = Object.entries(spacing).reduce((acc, [key, value]) => {
        acc[`.${e(`ms-${key}`)}`] = { 'margin-inline-start': value };
        acc[`.${e(`me-${key}`)}`] = { 'margin-inline-end': value };
        return acc;
      }, {});

      // Padding inline utilities
      const paddingInlineUtilities = Object.entries(spacing).reduce((acc, [key, value]) => {
        acc[`.${e(`ps-${key}`)}`] = { 'padding-inline-start': value };
        acc[`.${e(`pe-${key}`)}`] = { 'padding-inline-end': value };
        return acc;
      }, {});

      // Inset inline utilities (position)
      const insetInlineUtilities = Object.entries(spacing).reduce((acc, [key, value]) => {
        acc[`.${e(`start-${key}`)}`] = { 'inset-inline-start': value };
        acc[`.${e(`end-${key}`)}`] = { 'inset-inline-end': value };
        return acc;
      }, {});

      // Border inline width utilities
      const borderWidths = { 0: '0px', '': '1px', 2: '2px', 4: '4px', 8: '8px' };
      const borderInlineUtilities = Object.entries(borderWidths).reduce((acc, [key, value]) => {
        const suffix = key === '' ? '' : `-${key}`;
        acc[`.${e(`border-s${suffix}`)}`] = { 'border-inline-start-width': value };
        acc[`.${e(`border-e${suffix}`)}`] = { 'border-inline-end-width': value };
        return acc;
      }, {});

      // Border radius logical utilities
      const borderRadius = theme('borderRadius');
      const borderRadiusLogicalUtilities = Object.entries(borderRadius).reduce(
        (acc, [key, value]) => {
          const suffix = key === 'DEFAULT' ? '' : `-${key}`;
          acc[`.${e(`rounded-s${suffix}`)}`] = {
            'border-start-start-radius': value,
            'border-end-start-radius': value,
          };
          acc[`.${e(`rounded-e${suffix}`)}`] = {
            'border-start-end-radius': value,
            'border-end-end-radius': value,
          };
          acc[`.${e(`rounded-ss${suffix}`)}`] = { 'border-start-start-radius': value };
          acc[`.${e(`rounded-se${suffix}`)}`] = { 'border-start-end-radius': value };
          acc[`.${e(`rounded-es${suffix}`)}`] = { 'border-end-start-radius': value };
          acc[`.${e(`rounded-ee${suffix}`)}`] = { 'border-end-end-radius': value };
          return acc;
        },
        {}
      );

      // Text alignment logical utilities
      const textAlignUtilities = {
        '.text-start': { 'text-align': 'start' },
        '.text-end': { 'text-align': 'end' },
      };

      // Float logical utilities
      const floatUtilities = {
        '.float-start': { float: 'inline-start' },
        '.float-end': { float: 'inline-end' },
      };

      // Clear logical utilities
      const clearUtilities = {
        '.clear-start': { clear: 'inline-start' },
        '.clear-end': { clear: 'inline-end' },
      };

      // Scroll margin/padding utilities
      const scrollMarginUtilities = Object.entries(spacing).reduce((acc, [key, value]) => {
        acc[`.${e(`scroll-ms-${key}`)}`] = { 'scroll-margin-inline-start': value };
        acc[`.${e(`scroll-me-${key}`)}`] = { 'scroll-margin-inline-end': value };
        acc[`.${e(`scroll-ps-${key}`)}`] = { 'scroll-padding-inline-start': value };
        acc[`.${e(`scroll-pe-${key}`)}`] = { 'scroll-padding-inline-end': value };
        return acc;
      }, {});

      addUtilities(marginInlineUtilities);
      addUtilities(paddingInlineUtilities);
      addUtilities(insetInlineUtilities);
      addUtilities(borderInlineUtilities);
      addUtilities(borderRadiusLogicalUtilities);
      addUtilities(textAlignUtilities);
      addUtilities(floatUtilities);
      addUtilities(clearUtilities);
      addUtilities(scrollMarginUtilities);
    }),
    // RTL-specific utilities plugin
    plugin(function ({ addUtilities }) {
      addUtilities({
        // Mirror transform for icons
        '.rtl-mirror': {
          '[dir="rtl"] &': {
            transform: 'scaleX(-1)',
          },
        },
        // Space reverse in RTL
        '.space-x-reverse-rtl': {
          '[dir="rtl"] &': {
            '--tw-space-x-reverse': '1',
          },
        },
        // Force LTR (for numbers, URLs, code)
        '.force-ltr': {
          direction: 'ltr',
          'unicode-bidi': 'embed',
        },
        // Force RTL
        '.force-rtl': {
          direction: 'rtl',
          'unicode-bidi': 'embed',
        },
        // Bidirectional isolation
        '.bidi-isolate': {
          'unicode-bidi': 'isolate',
        },
        '.bidi-override': {
          'unicode-bidi': 'bidi-override',
        },
      });
    }),
  ],
};
