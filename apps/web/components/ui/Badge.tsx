'use client';

import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  icon?: React.ReactNode;
  dot?: boolean;
  removable?: boolean;
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

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon,
  dot = false,
  removable = false,
  onRemove,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="
            flex-shrink-0 ml-0.5 -mr-1
            p-0.5 rounded-full
            hover:bg-white/10
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-white/20
          "
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

// Badge Group for displaying multiple badges
interface BadgeGroupProps {
  children: React.ReactNode;
  className?: string;
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

// Status Badge for orders/tickets
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

interface StatusBadgeProps {
  status: StatusType;
  size?: BadgeSize;
  className?: string;
}

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

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size={size} className={className} dot>
      {config.label}
    </Badge>
  );
}
