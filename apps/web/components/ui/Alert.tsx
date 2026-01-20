'use client';

import React from 'react';

/**
 * Alert variant types for different semantic meanings
 */
export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

/**
 * Alert size options
 */
export type AlertSize = 'sm' | 'md' | 'lg';

/**
 * Props for the Alert component
 */
export interface AlertProps {
  /** The variant/type of alert - determines color scheme */
  variant?: AlertVariant;
  /** Size of the alert */
  size?: AlertSize;
  /** Title of the alert */
  title?: string;
  /** Content/message of the alert */
  children: React.ReactNode;
  /** Custom icon to display */
  icon?: React.ReactNode;
  /** Whether the alert can be dismissed */
  dismissible?: boolean;
  /** Callback when alert is dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the default icon */
  showIcon?: boolean;
}

const variantStyles: Record<AlertVariant, { container: string; icon: string; title: string }> = {
  info: {
    container: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    icon: 'text-blue-400',
    title: 'text-blue-300',
  },
  success: {
    container: 'bg-green-500/10 border-green-500/20 text-green-400',
    icon: 'text-green-400',
    title: 'text-green-300',
  },
  warning: {
    container: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    icon: 'text-amber-400',
    title: 'text-amber-300',
  },
  error: {
    container: 'bg-red-500/10 border-red-500/20 text-red-400',
    icon: 'text-red-400',
    title: 'text-red-300',
  },
};

const sizeStyles: Record<AlertSize, { container: string; icon: string; text: string }> = {
  sm: {
    container: 'p-3 text-sm',
    icon: 'w-4 h-4',
    text: 'text-sm',
  },
  md: {
    container: 'p-4',
    icon: 'w-5 h-5',
    text: 'text-base',
  },
  lg: {
    container: 'p-5',
    icon: 'w-6 h-6',
    text: 'text-lg',
  },
};

const defaultIcons: Record<AlertVariant, React.ReactNode> = {
  info: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  success: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  warning: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  error: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

/**
 * Alert component for displaying notifications, warnings, errors, and informational messages.
 *
 * @example
 * ```tsx
 * <Alert variant="success" title="Success!">
 *   Your changes have been saved.
 * </Alert>
 * ```
 */
export function Alert({
  variant = 'info',
  size = 'md',
  title,
  children,
  icon,
  dismissible = false,
  onDismiss,
  className = '',
  showIcon = true,
}: AlertProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3
        rounded-lg border
        ${variantStyle.container}
        ${sizeStyle.container}
        ${className}
      `}
    >
      {showIcon && (
        <span className={`flex-shrink-0 ${sizeStyle.icon} ${variantStyle.icon}`}>
          {icon || defaultIcons[variant]}
        </span>
      )}
      <div className="flex-1 min-w-0">
        {title && <h4 className={`font-semibold ${variantStyle.title} mb-1`}>{title}</h4>}
        <div className={sizeStyle.text}>{children}</div>
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className={`
            flex-shrink-0
            p-1
            rounded-lg
            opacity-60 hover:opacity-100
            transition-opacity duration-150
            focus:outline-none focus:ring-2 focus:ring-white/20
          `}
          aria-label="Dismiss alert"
        >
          <svg
            className={sizeStyle.icon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

Alert.displayName = 'Alert';
