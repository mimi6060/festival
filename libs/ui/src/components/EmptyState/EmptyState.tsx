'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

/**
 * Variant options for EmptyState styling
 */
export type EmptyStateVariant = 'default' | 'card' | 'page' | 'compact';

/**
 * Icon size options for EmptyState
 */
export type EmptyStateIconSize = 'sm' | 'md' | 'lg';

/**
 * EmptyState component props
 */
export interface EmptyStateProps {
  /** Icon to display - can be a React node (SVG), component, or null */
  icon?: React.ReactNode;
  /** Custom illustration component (takes precedence over icon) */
  illustration?: React.ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Optional action button or link */
  action?: React.ReactNode;
  /** Secondary action (e.g., help link) */
  secondaryAction?: React.ReactNode;
  /** Visual variant */
  variant?: EmptyStateVariant;
  /** Icon size */
  iconSize?: EmptyStateIconSize;
  /** Additional CSS classes for the container */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * Variant styles configuration
 */
const variantStyles: Record<EmptyStateVariant, string> = {
  default: 'py-12',
  card: 'py-8 px-6',
  page: 'py-16 md:py-24',
  compact: 'py-6',
};

/**
 * Icon size styles configuration
 */
const iconSizeStyles: Record<EmptyStateIconSize, { container: string; icon: string }> = {
  sm: {
    container: 'w-10 h-10 mb-3',
    icon: '[&>svg]:w-10 [&>svg]:h-10',
  },
  md: {
    container: 'w-16 h-16 mb-4',
    icon: '[&>svg]:w-16 [&>svg]:h-16',
  },
  lg: {
    container: 'w-24 h-24 mb-6',
    icon: '[&>svg]:w-24 [&>svg]:h-24',
  },
};

/**
 * Title size by variant
 */
const titleSizeStyles: Record<EmptyStateVariant, string> = {
  default: 'text-xl',
  card: 'text-lg',
  page: 'text-2xl md:text-3xl',
  compact: 'text-base',
};

/**
 * Standardized EmptyState component for consistent empty state styling across applications.
 *
 * Supports multiple visual variants, custom icons/illustrations, and actions.
 * Designed to work with both light and dark themes.
 *
 * @example Basic usage
 * ```tsx
 * <EmptyState
 *   icon={<SearchIcon />}
 *   title="No results found"
 *   description="Try different search terms"
 *   action={<Button onClick={onClear}>Clear filters</Button>}
 * />
 * ```
 *
 * @example With custom illustration
 * ```tsx
 * <EmptyState
 *   illustration={<CustomIllustration />}
 *   title="Welcome to your dashboard"
 *   description="Start by creating your first project"
 *   action={<Button>Create Project</Button>}
 *   variant="page"
 * />
 * ```
 *
 * @example Compact variant for tables
 * ```tsx
 * <EmptyState
 *   icon={<TableIcon />}
 *   title="No data available"
 *   variant="compact"
 * />
 * ```
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon,
      illustration,
      title,
      description,
      action,
      secondaryAction,
      variant = 'default',
      iconSize = 'md',
      className,
      testId,
    },
    ref
  ) => {
    const sizeStyles = iconSizeStyles[iconSize];

    return (
      <div
        ref={ref}
        data-testid={testId}
        className={cn('flex flex-col items-center text-center', variantStyles[variant], className)}
      >
        {/* Illustration (custom component) */}
        {illustration && <div className="mb-6">{illustration}</div>}

        {/* Icon (with wrapper for sizing and color) */}
        {!illustration && icon && (
          <div
            className={cn(
              'flex items-center justify-center',
              'text-gray-400 dark:text-white/20',
              sizeStyles.container,
              sizeStyles.icon
            )}
          >
            {icon}
          </div>
        )}

        {/* Title */}
        <h3
          className={cn(
            'font-semibold',
            'text-gray-700 dark:text-white/70',
            titleSizeStyles[variant],
            (description || action) && 'mb-2'
          )}
        >
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p
            className={cn(
              'text-gray-500 dark:text-white/50',
              'max-w-md',
              variant === 'compact' ? 'text-sm' : 'text-base'
            )}
          >
            {description}
          </p>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            {action}
            {secondaryAction}
          </div>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

/**
 * Common icons for empty states - reusable SVG icons with proper sizing.
 * Icons inherit their size from the parent EmptyState iconSize prop.
 */
export const EmptyStateIcons = {
  /** Search/magnifying glass icon */
  search: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  /** Sad face icon for "no data" states */
  noData: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  /** Inbox icon for "empty inbox" states */
  inbox: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  ),
  /** Folder icon for "empty folder" states */
  folder: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  ),
  /** Calendar icon for "no events" states */
  calendar: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  /** Ticket icon for "no tickets" states */
  ticket: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
      />
    </svg>
  ),
  /** Users icon for "no users/members" states */
  users: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  /** Bell icon for "no notifications" states */
  bell: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  ),
  /** Warning/error icon */
  error: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  /** Table icon for "no table data" states */
  table: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  ),
  /** Chart icon for "no analytics/data" states */
  chart: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  /** Plus icon for "add new" empty states */
  plus: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
    </svg>
  ),
  /** Document icon for "no documents" states */
  document: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  /** Image icon for "no images" states */
  image: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  /** Music icon for "no music/performances" states */
  music: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
      />
    </svg>
  ),
  /** Shopping bag icon for "no orders/purchases" states */
  shoppingBag: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
      />
    </svg>
  ),
  /** Credit card icon for "no payments" states */
  creditCard: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  ),
};
