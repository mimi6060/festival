'use client';

import React from 'react';

/**
 * Skeleton variant types
 */
export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';

/**
 * Props for the Skeleton component
 */
export interface SkeletonProps {
  /** Shape variant of the skeleton */
  variant?: SkeletonVariant;
  /** Width of the skeleton (can be number for px or string for other units) */
  width?: number | string;
  /** Height of the skeleton (can be number for px or string for other units) */
  height?: number | string;
  /** Whether to animate the skeleton */
  animate?: boolean;
  /** Number of lines for text variant */
  lines?: number;
  /** Additional CSS classes */
  className?: string;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'rounded h-4',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-xl',
};

/**
 * Skeleton loading placeholder component.
 *
 * @example
 * ```tsx
 * <Skeleton variant="text" width={200} />
 * <Skeleton variant="circular" width={48} height={48} />
 * ```
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  animate = true,
  lines = 1,
  className = '',
}: SkeletonProps) {
  const getStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {};
    if (width !== undefined) {
      style.width = typeof width === 'number' ? `${width}px` : width;
    }
    if (height !== undefined) {
      style.height = typeof height === 'number' ? `${height}px` : height;
    }
    return style;
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`
              bg-white/10
              ${variantStyles[variant]}
              ${animate ? 'animate-pulse' : ''}
            `}
            style={{
              ...getStyle(),
              width: index === lines - 1 ? '60%' : width || '100%',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`
        bg-white/10
        ${variantStyles[variant]}
        ${animate ? 'animate-pulse' : ''}
        ${className}
      `}
      style={getStyle()}
    />
  );
}

/**
 * Props for SkeletonCard component
 */
export interface SkeletonCardProps {
  /** Whether to show avatar */
  showAvatar?: boolean;
  /** Number of text lines */
  lines?: number;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Pre-built skeleton card layout for loading states.
 *
 * @example
 * ```tsx
 * <SkeletonCard showAvatar lines={3} />
 * ```
 */
export function SkeletonCard({
  showAvatar = true,
  lines = 3,
  showActions = false,
  className = '',
}: SkeletonCardProps) {
  return (
    <div
      className={`
        bg-white/5
        border border-white/10
        rounded-2xl
        p-6
        ${className}
      `}
    >
      {showAvatar && (
        <div className="flex items-center gap-4 mb-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="25%" height={12} />
          </div>
        </div>
      )}
      <div className="space-y-3">
        <Skeleton variant="text" lines={lines} />
      </div>
      {showActions && (
        <div className="flex gap-3 mt-6">
          <Skeleton variant="rounded" width={80} height={36} />
          <Skeleton variant="rounded" width={80} height={36} />
        </div>
      )}
    </div>
  );
}

/**
 * Props for SkeletonTable component
 */
export interface SkeletonTableProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Whether to show header */
  showHeader?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Pre-built skeleton table layout for loading states.
 *
 * @example
 * ```tsx
 * <SkeletonTable rows={5} columns={4} />
 * ```
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
  className = '',
}: SkeletonTableProps) {
  return (
    <div
      className={`
        bg-white/5
        border border-white/10
        rounded-2xl
        overflow-hidden
        ${className}
      `}
    >
      {showHeader && (
        <div className="flex gap-4 px-6 py-4 border-b border-white/10">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} variant="text" className="flex-1" height={16} />
          ))}
        </div>
      )}
      <div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex gap-4 px-6 py-4 border-b border-white/5 last:border-b-0"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} variant="text" className="flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Props for SkeletonAvatar component
 */
export interface SkeletonAvatarProps {
  /** Size of the avatar */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
}

const avatarSizes: Record<string, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

/**
 * Pre-built skeleton avatar for loading states.
 */
export function SkeletonAvatar({ size = 'md', className = '' }: SkeletonAvatarProps) {
  const dimension = avatarSizes[size];
  return <Skeleton variant="circular" width={dimension} height={dimension} className={className} />;
}

Skeleton.displayName = 'Skeleton';
SkeletonCard.displayName = 'SkeletonCard';
SkeletonTable.displayName = 'SkeletonTable';
SkeletonAvatar.displayName = 'SkeletonAvatar';
