'use client';

import { useState, useEffect } from 'react';

/**
 * useReducedMotion - Hook to detect prefers-reduced-motion
 *
 * Returns true if the user has requested reduced motion in their
 * system preferences. Use this to disable animations and transitions.
 *
 * WCAG 2.1 AA Requirement: 2.3.3 Animation from Interactions
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const prefersReducedMotion = useReducedMotion();
 *
 *   return (
 *     <div
 *       className={prefersReducedMotion
 *         ? 'opacity-100'
 *         : 'animate-fadeIn'
 *       }
 *     >
 *       Content
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * // Using with Framer Motion
 * ```tsx
 * function MotionComponent() {
 *   const prefersReducedMotion = useReducedMotion();
 *
 *   return (
 *     <motion.div
 *       initial={{ opacity: 0, y: 20 }}
 *       animate={{ opacity: 1, y: 0 }}
 *       transition={{
 *         duration: prefersReducedMotion ? 0 : 0.3
 *       }}
 *     >
 *       Content
 *     </motion.div>
 *   );
 * }
 * ```
 */
export function useReducedMotion(): boolean {
  // Default to false during SSR
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if matchMedia is available (not in SSR)
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers support addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * getReducedMotionDuration - Helper to get animation duration based on preference
 *
 * Returns the appropriate duration value based on whether the user
 * prefers reduced motion.
 *
 * @param normalDuration - Duration when animations are allowed
 * @param reducedDuration - Duration when reduced motion is preferred (default: 0)
 */
export function getReducedMotionDuration(
  normalDuration: number,
  reducedDuration = 0
): number {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return normalDuration;
  }

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  return prefersReducedMotion ? reducedDuration : normalDuration;
}

export default useReducedMotion;
