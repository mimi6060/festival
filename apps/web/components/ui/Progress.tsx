'use client';

import React from 'react';

/**
 * Progress bar variant types
 */
export type ProgressVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'gradient';

/**
 * Progress bar size options
 */
export type ProgressSize = 'sm' | 'md' | 'lg';

/**
 * Props for the Progress component
 */
export interface ProgressProps {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum value */
  max?: number;
  /** Visual style variant */
  variant?: ProgressVariant;
  /** Size of the progress bar */
  size?: ProgressSize;
  /** Whether to show the percentage label */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Whether to show animation */
  animated?: boolean;
  /** Whether to show striped pattern */
  striped?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const variantStyles: Record<ProgressVariant, string> = {
  default: 'bg-white/60',
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  warning: 'bg-orange-500',
  error: 'bg-red-500',
  gradient: 'bg-gradient-to-r from-primary-500 via-pink-500 to-orange-500',
};

const sizeStyles: Record<ProgressSize, { bar: string; text: string }> = {
  sm: {
    bar: 'h-1.5',
    text: 'text-xs',
  },
  md: {
    bar: 'h-2.5',
    text: 'text-sm',
  },
  lg: {
    bar: 'h-4',
    text: 'text-base',
  },
};

/**
 * Progress bar component for displaying completion status.
 *
 * @example
 * ```tsx
 * <Progress value={75} variant="primary" showLabel />
 * ```
 */
export function Progress({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  label,
  animated = false,
  striped = false,
  className = '',
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const sizeStyle = sizeStyles[size];

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-2">
          <span className={`text-white/80 font-medium ${sizeStyle.text}`}>
            {label || 'Progress'}
          </span>
          {showLabel && (
            <span className={`text-white/60 ${sizeStyle.text}`}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`
          w-full
          bg-white/10
          rounded-full
          overflow-hidden
          ${sizeStyle.bar}
        `}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`
            h-full
            rounded-full
            transition-all duration-500 ease-out
            ${variantStyles[variant]}
            ${striped ? 'bg-stripes' : ''}
            ${animated ? 'animate-progress-stripes' : ''}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Props for CircularProgress component
 */
export interface CircularProgressProps {
  /** Current progress value (0-100) */
  value: number;
  /** Size in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Visual style variant */
  variant?: ProgressVariant;
  /** Whether to show the percentage */
  showValue?: boolean;
  /** Custom label inside the circle */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Circular progress indicator component.
 *
 * @example
 * ```tsx
 * <CircularProgress value={65} showValue />
 * ```
 */
export function CircularProgress({
  value,
  size = 80,
  strokeWidth = 6,
  variant = 'primary',
  showValue = false,
  label,
  className = '',
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const colorMap: Record<ProgressVariant, string> = {
    default: 'stroke-white/60',
    primary: 'stroke-primary-500',
    success: 'stroke-green-500',
    warning: 'stroke-orange-500',
    error: 'stroke-red-500',
    gradient: 'stroke-primary-500', // Gradient not supported for SVG stroke
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-white/10"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={`${colorMap[variant]} transition-all duration-500 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {(showValue || label) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-semibold text-sm">
            {label || `${Math.round(percentage)}%`}
          </span>
        </div>
      )}
    </div>
  );
}

Progress.displayName = 'Progress';
CircularProgress.displayName = 'CircularProgress';
