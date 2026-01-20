'use client';

import React from 'react';

/**
 * Spinner size configuration
 * - sm: 16px (w-4 h-4)
 * - md: 24px (w-6 h-6)
 * - lg: 32px (w-8 h-8)
 * - xl: 48px (w-12 h-12)
 */
export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Spinner color variants
 * - primary: Indigo (#6366f1) - main brand color
 * - white: White - for use on dark backgrounds
 * - current: Inherits from parent text color
 */
export type SpinnerColor = 'primary' | 'white' | 'current';

export interface SpinnerProps {
  /** Size of the spinner: sm (16px), md (24px), lg (32px), xl (48px) */
  size?: SpinnerSize;
  /** Color variant */
  color?: SpinnerColor;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for screen readers */
  'aria-label'?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4', // 16px
  md: 'w-6 h-6', // 24px
  lg: 'w-8 h-8', // 32px
  xl: 'w-12 h-12', // 48px
};

const colorStyles: Record<SpinnerColor, string> = {
  primary: 'text-indigo-500', // #6366f1
  white: 'text-white',
  current: 'text-current',
};

/**
 * Spinner component for loading states
 *
 * Standardized across all Festival Platform apps with consistent:
 * - Color: #6366f1 (Indigo 500) as primary
 * - Sizes: sm (16px), md (24px), lg (32px), xl (48px)
 * - Animation: CSS spin animation
 *
 * @example
 * ```tsx
 * <Spinner size="md" color="primary" />
 * <Spinner size="sm" color="white" />
 * ```
 */
export function Spinner({
  size = 'md',
  color = 'primary',
  className = '',
  'aria-label': ariaLabel = 'Loading',
}: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${sizeStyles[size]} ${colorStyles[color]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label={ariaLabel}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

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
 * <LoadingOverlay visible={isLoading} message="Saving..." />
 * ```
 */
export function LoadingOverlay({ visible = true, message, size = 'lg' }: LoadingOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <Spinner size={size} color="primary" />
      {message && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{message}</p>}
    </div>
  );
}

// ============================================================================
// Loading Inline Component
// ============================================================================

export interface LoadingInlineProps {
  /** Loading message to display */
  message?: string;
  /** Spinner size */
  size?: SpinnerSize;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Inline loading indicator for use within content
 *
 * @example
 * ```tsx
 * <LoadingInline message="Fetching results..." />
 * ```
 */
export function LoadingInline({ message, size = 'sm', className = '' }: LoadingInlineProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Spinner size={size} color="current" />
      {message && <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>}
    </div>
  );
}

export default Spinner;
