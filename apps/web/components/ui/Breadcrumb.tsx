'use client';

import React from 'react';

/**
 * Breadcrumb size options
 */
export type BreadcrumbSize = 'sm' | 'md' | 'lg';

/**
 * Props for individual breadcrumb item
 */
export interface BreadcrumbItemData {
  /** Label to display */
  label: string;
  /** URL to navigate to */
  href?: string;
  /** Icon to display before label */
  icon?: React.ReactNode;
}

/**
 * Props for the Breadcrumb component
 */
export interface BreadcrumbProps {
  /** Array of breadcrumb items */
  items: BreadcrumbItemData[];
  /** Size of the breadcrumb */
  size?: BreadcrumbSize;
  /** Custom separator element */
  separator?: React.ReactNode;
  /** Maximum number of items to show (collapses middle items) */
  maxItems?: number;
  /** Whether to show home icon for first item */
  showHomeIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeStyles: Record<BreadcrumbSize, { text: string; icon: string; separator: string }> = {
  sm: {
    text: 'text-xs',
    icon: 'w-3 h-3',
    separator: 'w-3 h-3',
  },
  md: {
    text: 'text-sm',
    icon: 'w-4 h-4',
    separator: 'w-4 h-4',
  },
  lg: {
    text: 'text-base',
    icon: 'w-5 h-5',
    separator: 'w-5 h-5',
  },
};

const defaultSeparator = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const homeIcon = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

/**
 * Breadcrumb navigation component.
 *
 * @example
 * ```tsx
 * <Breadcrumb
 *   items={[
 *     { label: 'Home', href: '/' },
 *     { label: 'Festivals', href: '/festivals' },
 *     { label: 'Current Festival' }
 *   ]}
 * />
 * ```
 */
export function Breadcrumb({
  items,
  size = 'md',
  separator = defaultSeparator,
  maxItems,
  showHomeIcon = true,
  className = '',
}: BreadcrumbProps) {
  const sizeStyle = sizeStyles[size];

  // Handle collapsing if maxItems is set
  const displayItems = React.useMemo(() => {
    if (!maxItems || items.length <= maxItems) {
      return items;
    }

    const firstItem = items[0];
    const lastItems = items.slice(-Math.floor(maxItems / 2));
    const ellipsisItem: BreadcrumbItemData = { label: '...' };

    return [firstItem, ellipsisItem, ...lastItems];
  }, [items, maxItems]);

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center flex-wrap gap-2">
        {displayItems.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === '...';

          return (
            <li key={index} className="flex items-center gap-2">
              {/* Separator (not for first item) */}
              {!isFirst && (
                <span className={`${sizeStyle.separator} text-white/30 flex-shrink-0`}>
                  {separator}
                </span>
              )}

              {/* Breadcrumb item */}
              {isEllipsis ? (
                <span className={`${sizeStyle.text} text-white/40`}>...</span>
              ) : item.href && !isLast ? (
                <a
                  href={item.href}
                  className={`
                    flex items-center gap-1.5
                    ${sizeStyle.text}
                    text-white/60 hover:text-white
                    transition-colors duration-150
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:rounded
                  `}
                >
                  {isFirst && showHomeIcon ? (
                    <span className={sizeStyle.icon}>{homeIcon}</span>
                  ) : item.icon ? (
                    <span className={sizeStyle.icon}>{item.icon}</span>
                  ) : null}
                  <span>{item.label}</span>
                </a>
              ) : (
                <span
                  className={`
                    flex items-center gap-1.5
                    ${sizeStyle.text}
                    ${isLast ? 'text-white font-medium' : 'text-white/60'}
                  `}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <span className={sizeStyle.icon}>{item.icon}</span>}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Props for BreadcrumbItem component (for composition pattern)
 */
export interface BreadcrumbItemProps {
  /** Content of the breadcrumb item */
  children: React.ReactNode;
  /** URL to navigate to */
  href?: string;
  /** Whether this is the current/active page */
  isCurrent?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Individual breadcrumb item for composition pattern
 */
export function BreadcrumbItem({
  children,
  href,
  isCurrent = false,
  className = '',
}: BreadcrumbItemProps) {
  if (href && !isCurrent) {
    return (
      <a
        href={href}
        className={`
          text-white/60 hover:text-white
          transition-colors duration-150
          ${className}
        `}
      >
        {children}
      </a>
    );
  }

  return (
    <span
      className={`
        ${isCurrent ? 'text-white font-medium' : 'text-white/60'}
        ${className}
      `}
      aria-current={isCurrent ? 'page' : undefined}
    >
      {children}
    </span>
  );
}

/**
 * Breadcrumb separator component for composition pattern
 */
export function BreadcrumbSeparator({ className = '' }: { className?: string }) {
  return (
    <span className={`text-white/30 ${className}`} aria-hidden="true">
      {defaultSeparator}
    </span>
  );
}

Breadcrumb.displayName = 'Breadcrumb';
BreadcrumbItem.displayName = 'BreadcrumbItem';
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';
