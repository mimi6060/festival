'use client';

import { useCallback, useRef, useEffect } from 'react';

export type AnnouncePoliteness = 'polite' | 'assertive';

interface AnnounceOptions {
  /** How to announce the message (default: 'polite') */
  politeness?: AnnouncePoliteness;
  /** Clear the announcement after this many milliseconds */
  clearAfter?: number;
}

/**
 * useAnnounce - Hook to create screen reader announcements
 *
 * Creates a standalone live region that can be used to announce
 * messages to screen readers without requiring a context provider.
 *
 * WCAG 2.1 AA Requirement: 4.1.3 Status Messages
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const announce = useAnnounce();
 *
 *   const handleSubmit = async () => {
 *     try {
 *       await submitForm();
 *       announce('Form submitted successfully');
 *     } catch (error) {
 *       announce('Error submitting form', { politeness: 'assertive' });
 *     }
 *   };
 *
 *   return <button onClick={handleSubmit}>Submit</button>;
 * }
 * ```
 */
export function useAnnounce() {
  const politeRegionRef = useRef<HTMLDivElement | null>(null);
  const assertiveRegionRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create live regions on mount
  useEffect(() => {
    // Create polite region
    const politeRegion = document.createElement('div');
    politeRegion.setAttribute('role', 'status');
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.className = 'sr-only';
    Object.assign(politeRegion.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    document.body.appendChild(politeRegion);
    politeRegionRef.current = politeRegion;

    // Create assertive region
    const assertiveRegion = document.createElement('div');
    assertiveRegion.setAttribute('role', 'alert');
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.className = 'sr-only';
    Object.assign(assertiveRegion.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    document.body.appendChild(assertiveRegion);
    assertiveRegionRef.current = assertiveRegion;

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      politeRegion.remove();
      assertiveRegion.remove();
    };
  }, []);

  const announce = useCallback((
    message: string,
    options: AnnounceOptions = {}
  ) => {
    const { politeness = 'polite', clearAfter = 5000 } = options;

    const region = politeness === 'assertive'
      ? assertiveRegionRef.current
      : politeRegionRef.current;

    if (!region) {return;}

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Clear and re-set the message to trigger announcement
    region.textContent = '';

    // Use requestAnimationFrame to ensure the DOM update happens
    requestAnimationFrame(() => {
      region.textContent = message;

      // Clear after timeout
      if (clearAfter > 0) {
        timeoutRef.current = setTimeout(() => {
          region.textContent = '';
        }, clearAfter);
      }
    });
  }, []);

  return announce;
}

export default useAnnounce;
