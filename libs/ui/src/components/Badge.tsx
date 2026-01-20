import React from 'react';

/**
 * Badge variant types
 * Standardized across all Festival Platform apps
 */
export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'outline';

/**
 * Badge size types
 */
export type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * Badge component props
 */
export interface BadgeProps {
  /** Content to display in the badge */
  children: React.ReactNode;
  /** Visual variant of the badge */
  variant?: BadgeVariant;
  /** Size of the badge */
  size?: BadgeSize;
  /** Additional CSS classes */
  className?: string;
  /** Icon to display before the text */
  icon?: React.ReactNode;
  /** Show a colored dot indicator */
  dot?: boolean;
  /** Whether the badge can be removed */
  removable?: boolean;
  /** Callback when remove button is clicked */
  onRemove?: () => void;
}

/**
 * Standardized badge variant styles
 * Base: px-2 py-1 rounded-full text-xs font-medium
 * Colors use 500/20 background with 400 text for dark mode consistency
 */
const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  primary: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  secondary: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
  success: 'bg-green-500/20 text-green-400 border border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  error: 'bg-red-500/20 text-red-400 border border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  outline: 'bg-transparent border border-gray-400/50 text-gray-400',
};

/**
 * Light mode variant styles for admin/light theme contexts
 */
const variantStylesLight: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400',
  primary: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
  secondary: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400',
  success: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  outline:
    'bg-transparent border border-gray-300 text-gray-600 dark:border-gray-400/50 dark:text-gray-400',
};

/**
 * Dot color styles for status indicators
 */
const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-400',
  primary: 'bg-indigo-400',
  secondary: 'bg-pink-400',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
  outline: 'bg-gray-400',
};

/**
 * Size styles following the standardized base: px-2 py-1 rounded-full text-xs font-medium
 */
const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

/**
 * Badge component
 *
 * A standardized badge/tag component with consistent styling across all Festival Platform apps.
 * Supports multiple variants, sizes, and optional features like dots and remove buttons.
 *
 * Standard styling:
 * - Base: px-2 py-1 rounded-full text-xs font-medium
 * - Primary: bg-indigo-500/20 text-indigo-400
 * - Success: bg-green-500/20 text-green-400
 * - Warning: bg-yellow-500/20 text-yellow-400
 * - Error: bg-red-500/20 text-red-400
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Badge variant="success">Active</Badge>
 *
 * // With dot indicator
 * <Badge variant="warning" dot>Pending</Badge>
 *
 * // Removable badge
 * <Badge variant="primary" removable onRemove={() => handleRemove()}>
 *   Tag
 * </Badge>
 * ```
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      className = '',
      icon,
      dot = false,
      removable = false,
      onRemove,
    },
    ref
  ) => {
    const baseClasses = 'inline-flex items-center gap-1.5 rounded-full font-medium';

    const combinedClasses = [baseClasses, variantStyles[variant], sizeStyles[size], className]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={combinedClasses}>
        {dot && (
          <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} aria-hidden="true" />
        )}
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="flex-shrink-0 ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/20"
            aria-label="Remove"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

/**
 * Badge with light mode support for admin contexts
 * Uses light backgrounds that adapt to dark mode
 */
export const BadgeLight = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      className = '',
      icon,
      dot = false,
      removable = false,
      onRemove,
    },
    ref
  ) => {
    const baseClasses = 'inline-flex items-center gap-1.5 rounded-full font-medium';

    const combinedClasses = [baseClasses, variantStylesLight[variant], sizeStyles[size], className]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={combinedClasses}>
        {dot && (
          <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} aria-hidden="true" />
        )}
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="flex-shrink-0 ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            aria-label="Remove"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

BadgeLight.displayName = 'BadgeLight';

/**
 * Badge Group for displaying multiple badges
 */
export interface BadgeGroupProps {
  /** Badge elements to display */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Maximum number of badges to show */
  max?: number;
}

export function BadgeGroup({ children, className = '', max }: BadgeGroupProps) {
  const childArray = React.Children.toArray(children);
  const displayedChildren = max ? childArray.slice(0, max) : childArray;
  const remaining = max && childArray.length > max ? childArray.length - max : 0;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {displayedChildren}
      {remaining > 0 && (
        <Badge variant="default" size="md">
          +{remaining}
        </Badge>
      )}
    </div>
  );
}

/**
 * Status types for StatusBadge
 */
export type StatusType =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'valid'
  | 'used'
  | 'expired'
  | 'active'
  | 'inactive'
  | 'draft'
  | 'published';

/**
 * StatusBadge props
 */
export interface StatusBadgeProps {
  /** Status to display */
  status: StatusType;
  /** Size of the badge */
  size?: BadgeSize;
  /** Additional CSS classes */
  className?: string;
  /** Use light mode styling */
  light?: boolean;
}

/**
 * Status configuration mapping statuses to variants and labels
 */
const statusConfig: Record<StatusType, { variant: BadgeVariant; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  confirmed: { variant: 'success', label: 'Confirmed' },
  completed: { variant: 'success', label: 'Completed' },
  cancelled: { variant: 'error', label: 'Cancelled' },
  refunded: { variant: 'info', label: 'Refunded' },
  valid: { variant: 'success', label: 'Valid' },
  used: { variant: 'default', label: 'Used' },
  expired: { variant: 'error', label: 'Expired' },
  active: { variant: 'success', label: 'Active' },
  inactive: { variant: 'default', label: 'Inactive' },
  draft: { variant: 'warning', label: 'Draft' },
  published: { variant: 'primary', label: 'Published' },
};

/**
 * StatusBadge component
 *
 * A convenience component for displaying status indicators with predefined styling.
 *
 * @example
 * ```tsx
 * <StatusBadge status="active" />
 * <StatusBadge status="pending" size="sm" />
 * <StatusBadge status="completed" light />
 * ```
 */
export function StatusBadge({
  status,
  size = 'md',
  className = '',
  light = false,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const BadgeComponent = light ? BadgeLight : Badge;

  return (
    <BadgeComponent variant={config.variant} size={size} className={className} dot>
      {config.label}
    </BadgeComponent>
  );
}

export default Badge;
