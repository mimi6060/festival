'use client';

import React from 'react';

export interface VisuallyHiddenProps {
  /** Content to be hidden visually but accessible to screen readers */
  children: React.ReactNode;
  /** Whether to render as a span (inline) or div (block) */
  as?: 'span' | 'div';
  /** Additional CSS classes */
  className?: string;
  /** HTML id attribute */
  id?: string;
}

/**
 * VisuallyHidden - Screen reader only content
 *
 * This component hides content visually while keeping it accessible
 * to assistive technologies like screen readers. Use this for:
 * - Icon button labels
 * - Additional context for screen reader users
 * - Form field descriptions
 * - Skip link targets
 *
 * WCAG 2.1 AA Requirement: 1.1.1 Non-text Content, 2.4.4 Link Purpose
 *
 * @example
 * ```tsx
 * <button>
 *   <SearchIcon />
 *   <VisuallyHidden>Search the festival program</VisuallyHidden>
 * </button>
 *
 * // For landmark descriptions
 * <nav aria-labelledby="nav-label">
 *   <VisuallyHidden id="nav-label" as="div">Main navigation</VisuallyHidden>
 *   ...
 * </nav>
 * ```
 */
export function VisuallyHidden({
  children,
  as: Component = 'span',
  className = '',
  id,
}: VisuallyHiddenProps) {
  return (
    <Component
      id={id}
      className={`sr-only ${className}`.trim()}
      // Inline styles as fallback in case sr-only class is not available
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </Component>
  );
}

VisuallyHidden.displayName = 'VisuallyHidden';

export default VisuallyHidden;
