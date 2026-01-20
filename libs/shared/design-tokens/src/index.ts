/**
 * Festival Platform - Shared Design Tokens
 * @module @festival/shared/design-tokens
 *
 * Unified design system tokens for consistent styling across all apps:
 * - Web (Next.js public site)
 * - Admin (Next.js dashboard)
 * - Mobile (React Native + Expo)
 *
 * @example
 * ```ts
 * import { colors, spacing, typography } from '@festival/shared/design-tokens';
 *
 * // Use color tokens
 * const primaryColor = colors.primary[500];
 *
 * // Use spacing tokens
 * const padding = spacing[4]; // '1rem'
 *
 * // Use typography tokens
 * const headingStyle = typography.textStyles.heading.h1;
 * ```
 */

// ============================================================================
// Core Token Modules
// ============================================================================

// Colors - Unified color palette
export * from './lib/colors';

// Spacing - Unified spacing scale
export * from './lib/spacing';

// Typography - Font families, sizes, weights, and presets
export * from './lib/typography';

// Shadows - Box shadows and elevation
export * from './lib/shadows';

// Borders - Border radius, width, and styles
export * from './lib/borders';

// Animations - Durations, easing, and transitions
export * from './lib/animations';

// Breakpoints - Responsive breakpoints and media queries
export * from './lib/breakpoints';

// ============================================================================
// Re-exports for Convenience
// ============================================================================

import { colors as colorsModule } from './lib/colors';
import {
  spacing as spacingModule,
  spacingPx,
  semanticSpacing,
  componentSpacing,
  gap,
  gapPx,
  unifiedSpacing,
  unifiedSpacingRem,
} from './lib/spacing';
import {
  typography as typographyModule,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  textStyles,
  mobileTextStyles,
} from './lib/typography';
import {
  shadows as shadowsModule,
  coloredShadows,
  darkShadows,
  mobileShadows,
  focusRing,
} from './lib/shadows';
import {
  borders,
  borderRadius,
  borderRadiusPx,
  componentRadius,
  componentRadiusPx,
} from './lib/borders';
import {
  animations,
  duration,
  easing,
  transition,
  mobileAnimation,
  keyframes,
} from './lib/animations';
import {
  breakpoints,
  minWidth,
  maxWidth,
  mediaQuery,
  container,
  containerPx,
} from './lib/breakpoints';

/**
 * Complete design tokens object
 * Contains all tokens organized by category
 */
export const tokens = {
  colors: colorsModule,
  spacing: spacingModule,
  spacingPx,
  semanticSpacing,
  componentSpacing,
  gap,
  gapPx,
  unifiedSpacing,
  unifiedSpacingRem,
  typography: typographyModule,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  textStyles,
  mobileTextStyles,
  shadows: shadowsModule,
  coloredShadows,
  darkShadows,
  mobileShadows,
  focusRing,
  borders,
  borderRadius,
  borderRadiusPx,
  componentRadius,
  componentRadiusPx,
  animations,
  duration,
  easing,
  transition,
  mobileAnimation,
  keyframes,
  breakpoints,
  minWidth,
  maxWidth,
  mediaQuery,
  container,
  containerPx,
} as const;

export type Tokens = typeof tokens;

// ============================================================================
// Theme Presets
// ============================================================================

/**
 * Light theme preset
 * Combines semantic colors for light mode
 */
export const lightTheme = {
  colors: colorsModule.light,
  shadows: shadowsModule,
} as const;

/**
 * Dark theme preset
 * Combines semantic colors for dark mode
 */
export const darkTheme = {
  colors: colorsModule.dark,
  shadows: darkShadows,
} as const;

/**
 * Festival theme preset
 * Dark, immersive theme for festival experience
 */
export const festivalTheme = {
  colors: {
    ...colorsModule.dark,
    background: colorsModule.festival.dark,
    backgroundAlt: colorsModule.festival.darker,
    surface: colorsModule.festival.medium,
    surfaceAlt: colorsModule.festival.light,
  },
  shadows: darkShadows,
  accent: colorsModule.festival.accent,
} as const;

// ============================================================================
// Tailwind CSS Integration
// ============================================================================

/**
 * Tailwind-compatible color configuration
 * Can be spread into tailwind.config.js theme.extend.colors
 */
export const tailwindColors = {
  primary: colorsModule.primary,
  secondary: colorsModule.secondary,
  accent: colorsModule.accent,
  neutral: colorsModule.neutral,
  slate: colorsModule.slate,
  gray: colorsModule.gray,
  success: colorsModule.success,
  warning: colorsModule.warning,
  error: colorsModule.error,
  info: colorsModule.info,
  festival: colorsModule.festival,
  zones: colorsModule.zones,
} as const;

/**
 * Tailwind-compatible spacing configuration
 */
export const tailwindSpacing = spacingModule;

/**
 * Tailwind-compatible border radius configuration
 */
export const tailwindBorderRadius = borderRadius;

/**
 * Tailwind-compatible font family configuration
 */
export const tailwindFontFamily = {
  sans: [fontFamily.sans],
  serif: [fontFamily.serif],
  mono: [fontFamily.mono],
  display: [fontFamily.display],
} as const;
