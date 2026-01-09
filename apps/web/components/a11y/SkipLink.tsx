'use client';

import React from 'react';

export interface SkipLinkProps {
  /** The ID of the main content element to skip to */
  href?: string;
  /** Custom label for the skip link */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * SkipLink - Allows keyboard users to skip repetitive navigation
 *
 * This component renders a link that is visually hidden until focused,
 * allowing keyboard users to quickly skip to the main content area.
 *
 * WCAG 2.1 AA Requirement: 2.4.1 Bypass Blocks
 *
 * @example
 * ```tsx
 * // In your layout.tsx
 * <SkipLink href="#main-content" />
 *
 * // Then in your main content area
 * <main id="main-content">...</main>
 * ```
 */
export function SkipLink({
  href = '#main-content',
  label = 'Skip to main content',
  className = '',
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={`
        skip-link
        fixed top-0 left-0 z-[9999]
        px-4 py-3
        bg-primary-500 text-white
        font-semibold text-base
        rounded-br-lg
        transform -translate-y-full
        focus:translate-y-0
        transition-transform duration-200
        focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-500
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {label}
    </a>
  );
}

SkipLink.displayName = 'SkipLink';

export default SkipLink;
