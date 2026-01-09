'use client';

import React, { createContext, useContext, useMemo, useCallback } from 'react';
import {
  type Direction,
  isRTL,
  getDirection as getDirectionFromLocale,
  getDirectionalPositions,
  getMirrorTransform,
  getFlexDirection,
  getDirectionClasses,
  swapDirectionalValues,
} from '../../utils/rtl';

/**
 * Direction context value type
 */
export interface DirectionContextValue {
  /**
   * Current text direction ('ltr' or 'rtl')
   */
  direction: Direction;

  /**
   * Current locale code
   */
  locale: string;

  /**
   * Whether the current direction is RTL
   */
  isRTL: boolean;

  /**
   * Whether the current direction is LTR
   */
  isLTR: boolean;

  /**
   * Get direction-aware position values (start/end -> left/right)
   */
  positions: {
    start: 'left' | 'right';
    end: 'left' | 'right';
  };

  /**
   * Get CSS transform style for mirroring elements in RTL
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
}

/**
 * Direction context with default LTR values
 */
const DirectionContext = createContext<DirectionContextValue>({
  direction: 'ltr',
  locale: 'en',
  isRTL: false,
  isLTR: true,
  positions: { start: 'left', end: 'right' },
  getMirrorStyle: () => ({}),
  getFlexDir: () => 'row',
  getDirClasses: (ltrClasses) => ltrClasses.join(' '),
  swapValues: (left, right) => ({ left, right }),
});

/**
 * Props for DirectionProvider
 */
export interface DirectionProviderProps {
  /**
   * Current locale code (e.g., 'en', 'ar', 'he')
   */
  locale: string;

  /**
   * Text direction (if not provided, will be computed from locale)
   */
  direction?: Direction;

  /**
   * Child components
   */
  children: React.ReactNode;
}

/**
 * DirectionProvider Component
 *
 * Provides direction context to all child components.
 * Automatically determines direction from locale if not explicitly provided.
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <DirectionProvider locale="ar">
 *   <App />
 * </DirectionProvider>
 *
 * // In a child component
 * const { direction, isRTL, getMirrorStyle } = useDirectionContext();
 * ```
 */
export function DirectionProvider({
  locale,
  direction: explicitDirection,
  children,
}: DirectionProviderProps): JSX.Element {
  // Compute direction from locale if not explicitly provided
  const direction = useMemo(
    () => explicitDirection ?? getDirectionFromLocale(locale),
    [explicitDirection, locale]
  );

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
    <T,>(leftValue: T, rightValue: T): { left: T; right: T } => {
      return swapDirectionalValues(direction, leftValue, rightValue);
    },
    [direction]
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<DirectionContextValue>(
    () => ({
      direction,
      locale,
      isRTL: isRTLMode,
      isLTR: isLTRMode,
      positions,
      getMirrorStyle,
      getFlexDir,
      getDirClasses,
      swapValues,
    }),
    [
      direction,
      locale,
      isRTLMode,
      isLTRMode,
      positions,
      getMirrorStyle,
      getFlexDir,
      getDirClasses,
      swapValues,
    ]
  );

  return <DirectionContext.Provider value={contextValue}>{children}</DirectionContext.Provider>;
}

/**
 * Hook to access the direction context
 *
 * @returns Direction context value with direction info and helpers
 * @throws Error if used outside of DirectionProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { direction, isRTL, positions } = useDirectionContext();
 *
 *   return (
 *     <div style={{ textAlign: positions.start }}>
 *       Current direction: {direction}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDirectionContext(): DirectionContextValue {
  const context = useContext(DirectionContext);

  if (!context) {
    throw new Error('useDirectionContext must be used within a DirectionProvider');
  }

  return context;
}

/**
 * HOC to inject direction props into a component
 *
 * @param Component - The component to wrap
 * @returns The wrapped component with direction props
 *
 * @example
 * ```tsx
 * interface MyProps {
 *   title: string;
 *   direction: Direction;
 *   isRTL: boolean;
 * }
 *
 * const MyComponent = ({ title, direction, isRTL }: MyProps) => (
 *   <div dir={direction}>{title}</div>
 * );
 *
 * const MyComponentWithDirection = withDirection(MyComponent);
 * ```
 */
export function withDirection<P extends object>(
  Component: React.ComponentType<P & Pick<DirectionContextValue, 'direction' | 'isRTL' | 'isLTR'>>
): React.FC<Omit<P, 'direction' | 'isRTL' | 'isLTR'>> {
  const WrappedComponent: React.FC<Omit<P, 'direction' | 'isRTL' | 'isLTR'>> = (props) => {
    const { direction, isRTL, isLTR } = useDirectionContext();

    return <Component {...(props as P)} direction={direction} isRTL={isRTL} isLTR={isLTR} />;
  };

  WrappedComponent.displayName = `withDirection(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

export default DirectionProvider;
