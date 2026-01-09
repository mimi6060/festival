'use client';

import React from 'react';

/**
 * Pagination size options
 */
export type PaginationSize = 'sm' | 'md' | 'lg';

/**
 * Pagination variant styles
 */
export type PaginationVariant = 'default' | 'outlined' | 'minimal';

/**
 * Props for the Pagination component
 */
export interface PaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Size of the pagination buttons */
  size?: PaginationSize;
  /** Visual style variant */
  variant?: PaginationVariant;
  /** Whether to show first/last buttons */
  showFirstLast?: boolean;
  /** Whether to show page numbers */
  showNumbers?: boolean;
  /** Number of visible page buttons */
  siblingCount?: number;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeStyles: Record<PaginationSize, { button: string; icon: string }> = {
  sm: {
    button: 'w-8 h-8 text-sm',
    icon: 'w-4 h-4',
  },
  md: {
    button: 'w-10 h-10 text-base',
    icon: 'w-5 h-5',
  },
  lg: {
    button: 'w-12 h-12 text-lg',
    icon: 'w-6 h-6',
  },
};

const variantStyles: Record<PaginationVariant, { base: string; active: string; inactive: string }> = {
  default: {
    base: 'rounded-lg',
    active: 'bg-primary-500 text-white',
    inactive: 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
  },
  outlined: {
    base: 'rounded-lg border',
    active: 'border-primary-500 bg-primary-500/10 text-primary-400',
    inactive: 'border-white/10 text-white/70 hover:border-white/30 hover:text-white',
  },
  minimal: {
    base: 'rounded-lg',
    active: 'text-primary-400 font-bold',
    inactive: 'text-white/50 hover:text-white',
  },
};

/**
 * Generates an array of page numbers with ellipsis
 */
function getPageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | 'ellipsis')[] {
  const totalNumbers = siblingCount * 2 + 3; // siblings + current + first + last
  const totalBlocks = totalNumbers + 2; // + 2 ellipsis

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, 'ellipsis', totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1
    );
    return [1, 'ellipsis', ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  );
  return [1, 'ellipsis', ...middleRange, 'ellipsis', totalPages];
}

/**
 * Pagination component for navigating through pages of content.
 *
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={1}
 *   totalPages={10}
 *   onPageChange={(page) => setPage(page)}
 * />
 * ```
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  size = 'md',
  variant = 'default',
  showFirstLast = true,
  showNumbers = true,
  siblingCount = 1,
  disabled = false,
  className = '',
}: PaginationProps) {
  const sizeStyle = sizeStyles[size];
  const variantStyle = variantStyles[variant];

  const pages = showNumbers ? getPageNumbers(currentPage, totalPages, siblingCount) : [];

  const handlePageChange = (page: number) => {
    if (disabled || page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  const buttonClass = `
    flex items-center justify-center
    ${sizeStyle.button}
    ${variantStyle.base}
    transition-all duration-150
    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  return (
    <nav
      className={`flex items-center gap-1 ${className}`}
      aria-label="Pagination"
    >
      {/* First page button */}
      {showFirstLast && (
        <button
          type="button"
          onClick={() => handlePageChange(1)}
          disabled={disabled || currentPage === 1}
          className={`${buttonClass} ${variantStyle.inactive}`}
          aria-label="Go to first page"
        >
          <svg className={sizeStyle.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Previous button */}
      <button
        type="button"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        className={`${buttonClass} ${variantStyle.inactive}`}
        aria-label="Go to previous page"
      >
        <svg className={sizeStyle.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Page numbers */}
      {showNumbers && pages.map((page, index) => (
        page === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className={`${sizeStyle.button} flex items-center justify-center text-white/40`}
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => handlePageChange(page)}
            disabled={disabled}
            className={`
              ${buttonClass}
              ${currentPage === page ? variantStyle.active : variantStyle.inactive}
            `}
            aria-label={`Go to page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        )
      ))}

      {/* Next button */}
      <button
        type="button"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        className={`${buttonClass} ${variantStyle.inactive}`}
        aria-label="Go to next page"
      >
        <svg className={sizeStyle.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Last page button */}
      {showFirstLast && (
        <button
          type="button"
          onClick={() => handlePageChange(totalPages)}
          disabled={disabled || currentPage === totalPages}
          className={`${buttonClass} ${variantStyle.inactive}`}
          aria-label="Go to last page"
        >
          <svg className={sizeStyle.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </nav>
  );
}

/**
 * Props for PaginationInfo component
 */
export interface PaginationInfoProps {
  /** Current page */
  currentPage: number;
  /** Items per page */
  perPage: number;
  /** Total number of items */
  totalItems: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays pagination info like "Showing 1-10 of 100"
 */
export function PaginationInfo({
  currentPage,
  perPage,
  totalItems,
  className = '',
}: PaginationInfoProps) {
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, totalItems);

  return (
    <p className={`text-sm text-white/60 ${className}`}>
      Showing <span className="font-medium text-white">{start}</span> to{' '}
      <span className="font-medium text-white">{end}</span> of{' '}
      <span className="font-medium text-white">{totalItems}</span> results
    </p>
  );
}

Pagination.displayName = 'Pagination';
PaginationInfo.displayName = 'PaginationInfo';
