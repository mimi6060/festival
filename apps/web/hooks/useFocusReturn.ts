'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseFocusReturnOptions {
  /** Whether the feature is currently active (e.g., modal is open) */
  isActive: boolean;
  /** Whether to return focus when deactivated (default: true) */
  returnFocus?: boolean;
  /** Specific element to focus on return (overrides stored element) */
  returnTo?: React.RefObject<HTMLElement>;
}

/**
 * useFocusReturn - Hook to return focus after modal/dialog closes
 *
 * Stores the currently focused element when activated and returns
 * focus to it when deactivated. Essential for accessible modals.
 *
 * WCAG 2.1 AA Requirement: 2.4.3 Focus Order
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose, children }) {
 *   useFocusReturn({ isActive: isOpen });
 *
 *   if (!isOpen) return null;
 *
 *   return (
 *     <div role="dialog" aria-modal="true">
 *       {children}
 *       <button onClick={onClose}>Close</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFocusReturn({
  isActive,
  returnFocus = true,
  returnTo,
}: UseFocusReturnOptions) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the active element when becoming active
  useEffect(() => {
    if (isActive) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [isActive]);

  // Return focus when becoming inactive
  useEffect(() => {
    if (!isActive && returnFocus) {
      const elementToFocus = returnTo?.current || previousActiveElement.current;

      if (elementToFocus && typeof elementToFocus.focus === 'function') {
        // Small delay to ensure any transitions complete
        requestAnimationFrame(() => {
          elementToFocus.focus();
        });
      }
    }
  }, [isActive, returnFocus, returnTo]);

  // Expose a method to manually return focus
  const restoreFocus = useCallback(() => {
    const elementToFocus = returnTo?.current || previousActiveElement.current;

    if (elementToFocus && typeof elementToFocus.focus === 'function') {
      elementToFocus.focus();
    }
  }, [returnTo]);

  return {
    /** The element that was focused before activation */
    previousElement: previousActiveElement,
    /** Manually restore focus to the previous element */
    restoreFocus,
  };
}

export default useFocusReturn;
