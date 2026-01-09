/** @type {import('tailwindcss').Config} */
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
        'theme': 'color, background-color, border-color, box-shadow, opacity',
      },
    },
  },
  plugins: [],
};
