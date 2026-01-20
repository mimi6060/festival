import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

/**
 * Spinner size configuration
 * - sm: 16px (small)
 * - md: 24px (medium - default)
 * - lg: 32px (large)
 * - xl: 48px (extra large)
 */
export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Spinner color variants
 * - primary: Indigo (#6366F1) - main brand color
 * - white: White - for use on dark backgrounds
 * - current: Uses secondary text color
 */
export type SpinnerColor = 'primary' | 'white' | 'current';

export interface SpinnerProps {
  /** Size of the spinner: sm (16px), md (24px), lg (32px), xl (48px) */
  size?: SpinnerSize;
  /** Color variant */
  color?: SpinnerColor;
  /** Additional container style */
  style?: ViewStyle;
}

// Map size names to ActivityIndicator sizes
const sizeMap: Record<SpinnerSize, 'small' | 'large'> = {
  sm: 'small',
  md: 'small',
  lg: 'large',
  xl: 'large',
};

// Size scale factors for manual scaling (ActivityIndicator only has small/large)
const sizeScale: Record<SpinnerSize, number> = {
  sm: 0.8, // 16px
  md: 1.0, // 24px (default small)
  lg: 1.0, // 32px (default large)
  xl: 1.3, // 48px
};

// Color mappings - primary uses indigo (#6366F1)
const colorMap: Record<SpinnerColor, string> = {
  primary: '#6366F1', // Indigo 500 - standardized primary color
  white: colors.white,
  current: colors.textSecondary,
};

/**
 * Spinner component for loading states
 *
 * Standardized across all Festival Platform apps with consistent:
 * - Color: #6366F1 (Indigo 500) as primary
 * - Sizes: sm (16px), md (24px), lg (32px), xl (48px)
 * - Animation: Native ActivityIndicator spin
 *
 * @example
 * ```tsx
 * <Spinner size="md" color="primary" />
 * <Spinner size="sm" color="white" />
 * ```
 */
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'primary', style }) => {
  const indicatorSize = sizeMap[size];
  const indicatorColor = colorMap[color];
  const scale = sizeScale[size];

  return (
    <View style={[{ transform: [{ scale }] }, style]}>
      <ActivityIndicator size={indicatorSize} color={indicatorColor} accessibilityLabel="Loading" />
    </View>
  );
};

// ============================================================================
// Loading Screen Component
// ============================================================================

export interface LoadingScreenProps {
  /** Loading message to display */
  message?: string;
  /** Spinner size */
  size?: SpinnerSize;
}

/**
 * Full-screen loading overlay with centered spinner
 *
 * @example
 * ```tsx
 * <LoadingScreen message="Loading your data..." />
 * ```
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  size = 'xl',
}) => {
  return (
    <View style={styles.loadingScreen}>
      <Spinner size={size} color="primary" />
      <Text style={styles.loadingMessage}>{message}</Text>
    </View>
  );
};

// ============================================================================
// Loading Inline Component
// ============================================================================

export interface LoadingInlineProps {
  /** Loading message to display */
  message?: string;
  /** Spinner size */
  size?: SpinnerSize;
  /** Additional container style */
  style?: ViewStyle;
}

/**
 * Inline loading indicator for use within content
 *
 * @example
 * ```tsx
 * <LoadingInline message="Fetching results..." />
 * ```
 */
export const LoadingInline: React.FC<LoadingInlineProps> = ({ message, size = 'sm', style }) => {
  return (
    <View style={[styles.loadingInline, style]}>
      <Spinner size={size} color="current" />
      {message && <Text style={styles.inlineMessage}>{message}</Text>}
    </View>
  );
};

// ============================================================================
// Loading Overlay Component
// ============================================================================

export interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  visible?: boolean;
  /** Loading message */
  message?: string;
  /** Spinner size */
  size?: SpinnerSize;
}

/**
 * Semi-transparent overlay with spinner for loading states
 *
 * @example
 * ```tsx
 * {isLoading && <LoadingOverlay message="Saving..." />}
 * ```
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible = true,
  message,
  size = 'lg',
}) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <Spinner size={size} color="primary" />
      {message && <Text style={styles.overlayMessage}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  // LoadingScreen styles
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingMessage: {
    marginTop: spacing.md,
    ...typography.small,
    color: colors.textMuted,
  },

  // LoadingInline styles
  loadingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineMessage: {
    ...typography.small,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },

  // LoadingOverlay styles
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 35, 0.85)',
    zIndex: 100,
  },
  overlayMessage: {
    marginTop: spacing.md,
    ...typography.small,
    color: colors.textSecondary,
  },
});

export default Spinner;
