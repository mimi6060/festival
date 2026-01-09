'use client';

import React, { useState, useRef, useEffect } from 'react';

/**
 * Tooltip placement options
 */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

/**
 * Tooltip size options
 */
export type TooltipSize = 'sm' | 'md' | 'lg';

/**
 * Props for the Tooltip component
 */
export interface TooltipProps {
  /** The content to display in the tooltip */
  content: React.ReactNode;
  /** The element that triggers the tooltip */
  children: React.ReactElement;
  /** Placement of the tooltip relative to the trigger */
  placement?: TooltipPlacement;
  /** Size of the tooltip */
  size?: TooltipSize;
  /** Delay in ms before showing tooltip */
  delay?: number;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
  /** Additional CSS classes for the tooltip */
  className?: string;
  /** Whether to show an arrow */
  showArrow?: boolean;
}

const placementStyles: Record<TooltipPlacement, { tooltip: string; arrow: string }> = {
  top: {
    tooltip: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow: 'top-full left-1/2 -translate-x-1/2 border-t-festival-dark border-x-transparent border-b-transparent',
  },
  bottom: {
    tooltip: 'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow: 'bottom-full left-1/2 -translate-x-1/2 border-b-festival-dark border-x-transparent border-t-transparent',
  },
  left: {
    tooltip: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow: 'left-full top-1/2 -translate-y-1/2 border-l-festival-dark border-y-transparent border-r-transparent',
  },
  right: {
    tooltip: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow: 'right-full top-1/2 -translate-y-1/2 border-r-festival-dark border-y-transparent border-l-transparent',
  },
};

const sizeStyles: Record<TooltipSize, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

/**
 * Tooltip component for displaying additional information on hover.
 *
 * @example
 * ```tsx
 * <Tooltip content="This is a tooltip">
 *   <button>Hover me</button>
 * </Tooltip>
 * ```
 */
export function Tooltip({
  content,
  children,
  placement = 'top',
  size = 'md',
  delay = 200,
  disabled = false,
  className = '',
  showArrow = true,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const placementStyle = placementStyles[placement];

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`
            absolute z-50
            ${placementStyle.tooltip}
            bg-festival-dark
            text-white
            rounded-lg
            shadow-xl shadow-black/20
            border border-white/10
            whitespace-nowrap
            animate-in fade-in zoom-in-95 duration-150
            ${sizeStyles[size]}
            ${className}
          `}
        >
          {content}
          {showArrow && (
            <span
              className={`
                absolute
                border-4
                ${placementStyle.arrow}
              `}
            />
          )}
        </div>
      )}
    </div>
  );
}

Tooltip.displayName = 'Tooltip';
