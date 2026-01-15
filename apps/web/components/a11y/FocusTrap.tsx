'use client';

import React, { useEffect, useRef, useCallback } from 'react';

export interface FocusTrapProps {
  /** Whether the focus trap is active */
  active?: boolean;
  /** Content to trap focus within */
  children: React.ReactNode;
  /** Callback when escape key is pressed */
  onEscape?: () => void;
  /** Whether to return focus to the trigger element on deactivation */
  returnFocus?: boolean;
  /** Initial element to focus (query selector or ref) */
  initialFocus?: string | React.RefObject<HTMLElement>;
  /** Element to focus when trap is deactivated */
  finalFocus?: React.RefObject<HTMLElement>;
  /** Additional CSS classes */
  className?: string;
  /** Whether to lock scrolling on the body when active */
  lockScroll?: boolean;
}

// Focusable element selector
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * FocusTrap - Traps keyboard focus within a container
 *
 * Use this component for modals, dialogs, and other overlay elements
 * to ensure keyboard users can't accidentally tab outside.
 *
 * WCAG 2.1 AA Requirement: 2.4.3 Focus Order, 2.1.2 No Keyboard Trap
 * (Note: No Keyboard Trap requires that users CAN escape, which is
 * handled by the onEscape prop)
 *
 * @example
 * ```tsx
 * <FocusTrap active={isModalOpen} onEscape={() => setIsModalOpen(false)}>
 *   <div className="modal">
 *     <h2>Modal Title</h2>
 *     <button onClick={() => setIsModalOpen(false)}>Close</button>
 *   </div>
 * </FocusTrap>
 * ```
 */
export function FocusTrap({
  active = true,
  children,
  onEscape,
  returnFocus = true,
  initialFocus,
  finalFocus,
  className = '',
  lockScroll = true,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) {return [];}
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => {
      // Filter out elements with display: none or visibility: hidden
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  // Handle initial focus when trap activates
  useEffect(() => {
    if (!active) {return;}

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Lock body scroll
    if (lockScroll) {
      document.body.style.overflow = 'hidden';
    }

    // Set initial focus
    const setInitialFocus = () => {
      if (initialFocus) {
        if (typeof initialFocus === 'string') {
          const element = containerRef.current?.querySelector<HTMLElement>(initialFocus);
          if (element) {
            element.focus();
            return;
          }
        } else if (initialFocus.current) {
          initialFocus.current.focus();
          return;
        }
      }

      // Default: focus the first focusable element
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        // If no focusable elements, focus the container itself
        containerRef.current?.focus();
      }
    };

    // Small delay to ensure content is rendered
    const timeoutId = setTimeout(setInitialFocus, 10);

    return () => {
      clearTimeout(timeoutId);

      // Restore body scroll
      if (lockScroll) {
        document.body.style.overflow = '';
      }

      // Return focus to the previously focused element
      if (returnFocus) {
        const elementToFocus = finalFocus?.current || previousActiveElement.current;
        if (elementToFocus && typeof elementToFocus.focus === 'function') {
          elementToFocus.focus();
        }
      }
    };
  }, [active, initialFocus, finalFocus, returnFocus, lockScroll, getFocusableElements]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!active) {return;}

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
        return;
      }

      // Handle Tab key for focus trapping
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        // Shift + Tab on first element -> focus last element
        if (event.shiftKey && activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
          return;
        }

        // Tab on last element -> focus first element
        if (!event.shiftKey && activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
          return;
        }

        // If focus is outside the trap, bring it back
        if (!containerRef.current?.contains(activeElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, onEscape, getFocusableElements]);

  // Handle click outside (optional - refocus if clicked outside)
  useEffect(() => {
    if (!active) {return;}

    const handleFocusIn = (event: FocusEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        // Focus moved outside, bring it back
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          event.preventDefault();
          focusableElements[0].focus();
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [active, getFocusableElements]);

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      tabIndex={-1}
      // Make the container programmatically focusable but not in tab order
    >
      {children}
    </div>
  );
}

FocusTrap.displayName = 'FocusTrap';

export default FocusTrap;
