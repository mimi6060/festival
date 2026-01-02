/**
 * useMediaQuery Hook
 * Responsive design utilities using CSS media queries
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface Breakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

export interface UseBreakpointResult {
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  is2xl: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  currentBreakpoint: keyof Breakpoints;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_BREAKPOINTS: Breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// ============================================================================
// useMediaQuery Hook
// ============================================================================

/**
 * Listen to a CSS media query
 * @param query - The media query string (e.g., "(min-width: 768px)")
 * @returns Whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = useCallback((mediaQuery: string): boolean => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(mediaQuery).matches;
  }, []);

  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);

    // Update state
    const handleChange = () => {
      setMatches(getMatches(query));
    };

    // Initial check
    handleChange();

    // Listen for changes
    // Use addEventListener for modern browsers
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQueryList.addListener(handleChange);
    }

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleChange);
      } else {
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, [query, getMatches]);

  return matches;
}

// ============================================================================
// useBreakpoint Hook
// ============================================================================

/**
 * Get current breakpoint information
 * @param breakpoints - Custom breakpoints (optional)
 * @returns Breakpoint information
 */
export function useBreakpoint(
  breakpoints: Breakpoints = DEFAULT_BREAKPOINTS
): UseBreakpointResult {
  const isXs = useMediaQuery(`(max-width: ${breakpoints.sm - 1}px)`);
  const isSm = useMediaQuery(
    `(min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.md - 1}px)`
  );
  const isMd = useMediaQuery(
    `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`
  );
  const isLg = useMediaQuery(
    `(min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints.xl - 1}px)`
  );
  const isXl = useMediaQuery(
    `(min-width: ${breakpoints.xl}px) and (max-width: ${breakpoints['2xl'] - 1}px)`
  );
  const is2xl = useMediaQuery(`(min-width: ${breakpoints['2xl']}px)`);

  // Convenience helpers
  const isMobile = isXs || isSm;
  const isTablet = isMd;
  const isDesktop = isLg || isXl || is2xl;

  // Determine current breakpoint
  let currentBreakpoint: keyof Breakpoints = 'xs';
  if (is2xl) currentBreakpoint = '2xl';
  else if (isXl) currentBreakpoint = 'xl';
  else if (isLg) currentBreakpoint = 'lg';
  else if (isMd) currentBreakpoint = 'md';
  else if (isSm) currentBreakpoint = 'sm';

  return {
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,
    isMobile,
    isTablet,
    isDesktop,
    currentBreakpoint,
  };
}

// ============================================================================
// useBreakpointValue Hook
// ============================================================================

/**
 * Get value based on current breakpoint
 * @param values - Object with values for each breakpoint
 * @param breakpoints - Custom breakpoints (optional)
 * @returns The value for current breakpoint
 */
export function useBreakpointValue<T>(
  values: Partial<Record<keyof Breakpoints, T>>,
  breakpoints: Breakpoints = DEFAULT_BREAKPOINTS
): T | undefined {
  const { currentBreakpoint } = useBreakpoint(breakpoints);

  // Find the value for current or closest smaller breakpoint
  const breakpointOrder: (keyof Breakpoints)[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }

  return undefined;
}

// ============================================================================
// Specific Media Query Hooks
// ============================================================================

/**
 * Check if device prefers dark mode
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/**
 * Check if device prefers light mode
 */
export function usePrefersLightMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: light)');
}

/**
 * Check if device prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Check if device prefers reduced data usage
 */
export function usePrefersReducedData(): boolean {
  return useMediaQuery('(prefers-reduced-data: reduce)');
}

/**
 * Check if device prefers high contrast
 */
export function usePrefersHighContrast(): boolean {
  return useMediaQuery('(prefers-contrast: high)');
}

/**
 * Check if device is in portrait orientation
 */
export function useIsPortrait(): boolean {
  return useMediaQuery('(orientation: portrait)');
}

/**
 * Check if device is in landscape orientation
 */
export function useIsLandscape(): boolean {
  return useMediaQuery('(orientation: landscape)');
}

/**
 * Check if device has hover capability
 */
export function useCanHover(): boolean {
  return useMediaQuery('(hover: hover)');
}

/**
 * Check if device has touch capability
 */
export function useIsTouchDevice(): boolean {
  return useMediaQuery('(pointer: coarse)');
}

/**
 * Check if device uses a fine pointer (mouse)
 */
export function useHasFinePointer(): boolean {
  return useMediaQuery('(pointer: fine)');
}

// ============================================================================
// useWindowSize Hook
// ============================================================================

export interface WindowSize {
  width: number;
  height: number;
}

/**
 * Get current window dimensions
 */
export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>(() => {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    // Initial call
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowSize;
}

// ============================================================================
// useScreenOrientation Hook
// ============================================================================

export interface ScreenOrientation {
  angle: number;
  type: 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary' | string;
  isPortrait: boolean;
  isLandscape: boolean;
}

/**
 * Get screen orientation information
 */
export function useScreenOrientation(): ScreenOrientation {
  const [orientation, setOrientation] = useState<ScreenOrientation>(() => {
    if (typeof window === 'undefined' || !window.screen?.orientation) {
      return {
        angle: 0,
        type: 'portrait-primary',
        isPortrait: true,
        isLandscape: false,
      };
    }

    const { angle, type } = window.screen.orientation;
    return {
      angle,
      type,
      isPortrait: type.includes('portrait'),
      isLandscape: type.includes('landscape'),
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.screen?.orientation) {
      return;
    }

    const handleOrientationChange = () => {
      const { angle, type } = window.screen.orientation;
      setOrientation({
        angle,
        type,
        isPortrait: type.includes('portrait'),
        isLandscape: type.includes('landscape'),
      });
    };

    window.screen.orientation.addEventListener('change', handleOrientationChange);

    return () => {
      window.screen.orientation.removeEventListener('change', handleOrientationChange);
    };
  }, []);

  return orientation;
}

export default useMediaQuery;
