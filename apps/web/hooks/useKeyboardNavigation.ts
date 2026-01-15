'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

interface UseKeyboardNavigationOptions<T> {
  /** Array of items to navigate */
  items: T[];
  /** Initial selected index (-1 for none) */
  initialIndex?: number;
  /** Callback when item is selected via keyboard */
  onSelect?: (item: T, index: number) => void;
  /** Callback when highlighted index changes */
  onHighlight?: (item: T | null, index: number) => void;
  /** Whether navigation is active */
  enabled?: boolean;
  /** Whether navigation wraps around at ends */
  loop?: boolean;
  /** Orientation of the list (affects arrow key behavior) */
  orientation?: 'vertical' | 'horizontal' | 'both';
  /** Enable type-ahead search by item property */
  typeAheadKey?: keyof T;
}

interface UseKeyboardNavigationReturn<T> {
  /** Currently highlighted index */
  highlightedIndex: number;
  /** Set highlighted index programmatically */
  setHighlightedIndex: (index: number) => void;
  /** Keyboard event handler to attach to container */
  handleKeyDown: (event: React.KeyboardEvent) => void;
  /** Currently highlighted item */
  highlightedItem: T | null;
  /** Reset navigation state */
  reset: () => void;
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLElement>;
}

/**
 * useKeyboardNavigation - Hook for arrow key navigation in lists
 *
 * Provides keyboard navigation for lists, menus, and other
 * navigable components using arrow keys, Home, End, and type-ahead.
 *
 * WCAG 2.1 AA Requirement: 2.1.1 Keyboard
 *
 * @example
 * ```tsx
 * function MenuList({ items, onSelect }) {
 *   const {
 *     highlightedIndex,
 *     handleKeyDown,
 *     containerRef,
 *   } = useKeyboardNavigation({
 *     items,
 *     onSelect: (item) => onSelect(item),
 *     orientation: 'vertical',
 *   });
 *
 *   return (
 *     <ul
 *       ref={containerRef}
 *       role="menu"
 *       onKeyDown={handleKeyDown}
 *       tabIndex={0}
 *     >
 *       {items.map((item, index) => (
 *         <li
 *           key={item.id}
 *           role="menuitem"
 *           aria-selected={index === highlightedIndex}
 *           className={index === highlightedIndex ? 'bg-blue-100' : ''}
 *         >
 *           {item.label}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useKeyboardNavigation<T>({
  items,
  initialIndex = -1,
  onSelect,
  onHighlight,
  enabled = true,
  loop = true,
  orientation = 'vertical',
  typeAheadKey,
}: UseKeyboardNavigationOptions<T>): UseKeyboardNavigationReturn<T> {
  const [highlightedIndex, setHighlightedIndex] = useState(initialIndex);
  const containerRef = useRef<HTMLElement>(null);
  const typeAheadBuffer = useRef('');
  const typeAheadTimeout = useRef<NodeJS.Timeout | null>(null);

  const highlightedItem = highlightedIndex >= 0 ? items[highlightedIndex] : null;

  // Notify when highlight changes
  useEffect(() => {
    onHighlight?.(highlightedItem, highlightedIndex);
  }, [highlightedIndex, highlightedItem, onHighlight]);

  // Clear type-ahead buffer after delay
  const clearTypeAhead = useCallback(() => {
    if (typeAheadTimeout.current) {
      clearTimeout(typeAheadTimeout.current);
    }
    typeAheadTimeout.current = setTimeout(() => {
      typeAheadBuffer.current = '';
    }, 500);
  }, []);

  // Handle type-ahead search
  const handleTypeAhead = useCallback((char: string) => {
    if (!typeAheadKey) {return;}

    typeAheadBuffer.current += char.toLowerCase();
    clearTypeAhead();

    // Find matching item
    const searchString = typeAheadBuffer.current;
    const matchIndex = items.findIndex((item) => {
      const value = item[typeAheadKey];
      if (typeof value === 'string') {
        return value.toLowerCase().startsWith(searchString);
      }
      return false;
    });

    if (matchIndex >= 0) {
      setHighlightedIndex(matchIndex);
    }
  }, [items, typeAheadKey, clearTypeAhead]);

  // Navigate to next/previous item
  const navigate = useCallback((direction: 1 | -1) => {
    setHighlightedIndex((current) => {
      const itemCount = items.length;
      if (itemCount === 0) {return -1;}

      let newIndex: number;

      if (current === -1) {
        // Nothing selected, start at beginning or end
        newIndex = direction === 1 ? 0 : itemCount - 1;
      } else if (loop) {
        // Wrap around
        newIndex = (current + direction + itemCount) % itemCount;
      } else {
        // Clamp to bounds
        newIndex = Math.max(0, Math.min(current + direction, itemCount - 1));
      }

      return newIndex;
    });
  }, [items.length, loop]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!enabled) {return;}

    const { key } = event;

    // Determine which arrow keys to respond to based on orientation
    const isVertical = orientation === 'vertical' || orientation === 'both';
    const isHorizontal = orientation === 'horizontal' || orientation === 'both';

    switch (key) {
      case 'ArrowDown':
        if (isVertical) {
          event.preventDefault();
          navigate(1);
        }
        break;

      case 'ArrowUp':
        if (isVertical) {
          event.preventDefault();
          navigate(-1);
        }
        break;

      case 'ArrowRight':
        if (isHorizontal) {
          event.preventDefault();
          navigate(1);
        }
        break;

      case 'ArrowLeft':
        if (isHorizontal) {
          event.preventDefault();
          navigate(-1);
        }
        break;

      case 'Home':
        event.preventDefault();
        if (items.length > 0) {
          setHighlightedIndex(0);
        }
        break;

      case 'End':
        event.preventDefault();
        if (items.length > 0) {
          setHighlightedIndex(items.length - 1);
        }
        break;

      case 'Enter':
      case ' ':
        if (highlightedIndex >= 0 && highlightedItem) {
          event.preventDefault();
          onSelect?.(highlightedItem, highlightedIndex);
        }
        break;

      default:
        // Handle type-ahead for printable characters
        if (key.length === 1 && key.match(/\S/)) {
          handleTypeAhead(key);
        }
        break;
    }
  }, [
    enabled,
    orientation,
    navigate,
    items.length,
    highlightedIndex,
    highlightedItem,
    onSelect,
    handleTypeAhead,
  ]);

  // Reset navigation state
  const reset = useCallback(() => {
    setHighlightedIndex(initialIndex);
    typeAheadBuffer.current = '';
    if (typeAheadTimeout.current) {
      clearTimeout(typeAheadTimeout.current);
    }
  }, [initialIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeAheadTimeout.current) {
        clearTimeout(typeAheadTimeout.current);
      }
    };
  }, []);

  return {
    highlightedIndex,
    setHighlightedIndex,
    handleKeyDown,
    highlightedItem,
    reset,
    containerRef: containerRef as React.RefObject<HTMLElement>,
  };
}

export default useKeyboardNavigation;
