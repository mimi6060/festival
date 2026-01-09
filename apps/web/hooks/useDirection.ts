/**
 * useDirection Hook
 *
 * A React hook for handling text direction (LTR/RTL) in components.
 * Provides the current direction and helpers for direction-aware styling.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useLocale } from 'next-intl';
import {
  Direction,
  isRTL,
  getDirection,
  getDirectionalPositions,
  getMirrorTransform,
  getFlexDirection,
  getDirectionClasses,
  swapDirectionalValues,
} from '../utils/rtl';

/**
 * Return type for the useDirection hook
 */
export interface UseDirectionReturn {
  /**
   * Current text direction ('ltr' or 'rtl')
   */
  direction: Direction;

  /**
   * Whether the current locale is RTL
   */
  isRTL: boolean;

  /**
   * Whether the current locale is LTR
   */
  isLTR: boolean;

  /**
   * Current locale code
   */
  locale: string;

  /**
   * Get direction-aware position values (start/end -> left/right)
   */
  positions: {
    start: 'left' | 'right';
    end: 'left' | 'right';
  };

  /**
   * Get CSS transform for mirroring elements in RTL
   * @param shouldMirror - Whether the element should be mirrored
   */
  getMirrorStyle: (shouldMirror?: boolean) => { transform?: string };

  /**
   * Get direction-aware flex direction
   * @param baseDirection - The base flex direction
   */
  getFlexDir: (baseDirection?: 'row' | 'row-reverse') => 'row' | 'row-reverse';

  /**
   * Get direction-aware CSS classes
   * @param ltrClasses - Classes to use in LTR mode
   * @param rtlClasses - Classes to use in RTL mode
   */
  getDirClasses: (ltrClasses: string[], rtlClasses: string[]) => string;

  /**
   * Swap values based on direction
   * @param leftValue - Value for left (LTR) / right (RTL)
   * @param rightValue - Value for right (LTR) / left (RTL)
   */
  swapValues: <T>(leftValue: T, rightValue: T) => { left: T; right: T };

  /**
   * Get the logical start position based on direction
   */
  startPosition: 'left' | 'right';

  /**
   * Get the logical end position based on direction
   */
  endPosition: 'left' | 'right';
}

/**
 * Hook for handling text direction in components
 *
 * @returns Direction utilities and current direction state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { direction, isRTL, positions, getMirrorStyle } = useDirection();
 *
 *   return (
 *     <div style={{ textAlign: positions.start }}>
 *       <span>Text aligned to start</span>
 *       <Icon style={getMirrorStyle()} /> // Mirrors in RTL
 *     </div>
 *   );
 * }
 * ```
 */
export function useDirection(): UseDirectionReturn {
  // Get current locale from next-intl
  const locale = useLocale();

  // Compute direction based on locale
  const direction = useMemo(() => getDirection(locale), [locale]);

  // Compute boolean helpers
  const isRTLMode = useMemo(() => isRTL(locale), [locale]);
  const isLTRMode = useMemo(() => !isRTLMode, [isRTLMode]);

  // Get directional positions
  const positions = useMemo(() => getDirectionalPositions(direction), [direction]);

  // Helper to get mirror style for icons
  const getMirrorStyle = useCallback(
    (shouldMirror = true): { transform?: string } => {
      const transform = getMirrorTransform(direction, shouldMirror);
      return transform ? { transform } : {};
    },
    [direction]
  );

  // Helper to get flex direction
  const getFlexDir = useCallback(
    (baseDirection: 'row' | 'row-reverse' = 'row'): 'row' | 'row-reverse' => {
      return getFlexDirection(direction, baseDirection);
    },
    [direction]
  );

  // Helper to get direction-aware classes
  const getDirClasses = useCallback(
    (ltrClasses: string[], rtlClasses: string[]): string => {
      return getDirectionClasses(direction, { ltr: ltrClasses, rtl: rtlClasses });
    },
    [direction]
  );

  // Helper to swap directional values
  const swapValues = useCallback(
    <T>(leftValue: T, rightValue: T): { left: T; right: T } => {
      return swapDirectionalValues(direction, leftValue, rightValue);
    },
    [direction]
  );

  return {
    direction,
    isRTL: isRTLMode,
    isLTR: isLTRMode,
    locale,
    positions,
    getMirrorStyle,
    getFlexDir,
    getDirClasses,
    swapValues,
    startPosition: positions.start,
    endPosition: positions.end,
  };
}

/**
 * Hook for handling direction without next-intl dependency
 * Use this when you have the locale from a different source
 *
 * @param locale - The locale to get direction for
 * @returns Direction utilities and current direction state
 */
export function useDirectionWithLocale(
  locale: string
): Omit<UseDirectionReturn, 'locale'> & { locale: string } {
  // Compute direction based on provided locale
  const direction = useMemo(() => getDirection(locale), [locale]);

  // Compute boolean helpers
  const isRTLMode = useMemo(() => isRTL(locale), [locale]);
  const isLTRMode = useMemo(() => !isRTLMode, [isRTLMode]);

  // Get directional positions
  const positions = useMemo(() => getDirectionalPositions(direction), [direction]);

  // Helper to get mirror style for icons
  const getMirrorStyle = useCallback(
    (shouldMirror = true): { transform?: string } => {
      const transform = getMirrorTransform(direction, shouldMirror);
      return transform ? { transform } : {};
    },
    [direction]
  );

  // Helper to get flex direction
  const getFlexDir = useCallback(
    (baseDirection: 'row' | 'row-reverse' = 'row'): 'row' | 'row-reverse' => {
      return getFlexDirection(direction, baseDirection);
    },
    [direction]
  );

  // Helper to get direction-aware classes
  const getDirClasses = useCallback(
    (ltrClasses: string[], rtlClasses: string[]): string => {
      return getDirectionClasses(direction, { ltr: ltrClasses, rtl: rtlClasses });
    },
    [direction]
  );

  // Helper to swap directional values
  const swapValues = useCallback(
    <T>(leftValue: T, rightValue: T): { left: T; right: T } => {
      return swapDirectionalValues(direction, leftValue, rightValue);
    },
    [direction]
  );

  return {
    direction,
    isRTL: isRTLMode,
    isLTR: isLTRMode,
    locale,
    positions,
    getMirrorStyle,
    getFlexDir,
    getDirClasses,
    swapValues,
    startPosition: positions.start,
    endPosition: positions.end,
  };
}

export default useDirection;
