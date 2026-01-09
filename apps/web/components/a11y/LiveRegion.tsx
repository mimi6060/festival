'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';

export type LiveRegionPoliteness = 'polite' | 'assertive' | 'off';

export interface LiveRegionProps {
  /** Content to announce (can be controlled externally) */
  children?: React.ReactNode;
  /** The announcement politeness level */
  politeness?: LiveRegionPoliteness;
  /** Whether to clear the announcement after a delay */
  clearAfter?: number;
  /** Unique identifier for the region */
  id?: string;
  /** Whether changes should be announced atomically (as a whole) */
  atomic?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * LiveRegion - ARIA live announcements for screen readers
 *
 * This component creates an ARIA live region that announces dynamic
 * content changes to screen reader users. Use this for:
 * - Form submission success/error messages
 * - Loading state changes
 * - Real-time updates (notifications, alerts)
 * - Search result counts
 *
 * WCAG 2.1 AA Requirement: 4.1.3 Status Messages
 *
 * @example
 * ```tsx
 * // Polite announcement (doesn't interrupt current speech)
 * <LiveRegion politeness="polite">
 *   {searchResults.length} results found
 * </LiveRegion>
 *
 * // Assertive announcement (interrupts current speech)
 * <LiveRegion politeness="assertive">
 *   {errorMessage}
 * </LiveRegion>
 *
 * // Using the hook
 * const announce = useAnnounce();
 * announce('Form submitted successfully', 'polite');
 * ```
 */
export function LiveRegion({
  children,
  politeness = 'polite',
  clearAfter,
  id,
  atomic = true,
  className = '',
}: LiveRegionProps) {
  const [announcement, setAnnouncement] = useState<React.ReactNode>(children);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setAnnouncement(children);

    if (clearAfter && children) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setAnnouncement(null);
      }, clearAfter);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [children, clearAfter]);

  return (
    <div
      id={id}
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className={`sr-only ${className}`.trim()}
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {announcement}
    </div>
  );
}

LiveRegion.displayName = 'LiveRegion';

// Context for global announcements
interface AnnouncementContextValue {
  announce: (message: string, politeness?: LiveRegionPoliteness) => void;
}

const AnnouncementContext = React.createContext<AnnouncementContextValue | null>(null);

export interface AnnouncementProviderProps {
  children: React.ReactNode;
}

/**
 * AnnouncementProvider - Provides global announcement capability
 *
 * Wrap your app with this provider to enable global screen reader
 * announcements via the useAnnounce hook.
 *
 * @example
 * ```tsx
 * // In your root layout
 * <AnnouncementProvider>
 *   <App />
 * </AnnouncementProvider>
 *
 * // In any component
 * const announce = useAnnounce();
 * announce('Item added to cart', 'polite');
 * ```
 */
export function AnnouncementProvider({ children }: AnnouncementProviderProps) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, politeness: LiveRegionPoliteness = 'polite') => {
    if (politeness === 'assertive') {
      // Force re-announcement by clearing first
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 50);
    }
  }, []);

  return (
    <AnnouncementContext.Provider value={{ announce }}>
      {children}
      <LiveRegion politeness="polite" clearAfter={5000}>
        {politeMessage}
      </LiveRegion>
      <LiveRegion politeness="assertive" clearAfter={5000}>
        {assertiveMessage}
      </LiveRegion>
    </AnnouncementContext.Provider>
  );
}

AnnouncementProvider.displayName = 'AnnouncementProvider';

/**
 * useAnnounce - Hook to trigger screen reader announcements
 *
 * Must be used within an AnnouncementProvider.
 * Returns a function to announce messages to screen readers.
 *
 * @example
 * ```tsx
 * const announce = useAnnounce();
 *
 * const handleSubmit = async () => {
 *   try {
 *     await submitForm();
 *     announce('Form submitted successfully', 'polite');
 *   } catch (error) {
 *     announce('Error submitting form. Please try again.', 'assertive');
 *   }
 * };
 * ```
 */
export function useAnnounce() {
  const context = React.useContext(AnnouncementContext);

  if (!context) {
    // Return a no-op function if used outside provider
    // This allows components to work without the provider
    return (_message: string, _politeness?: LiveRegionPoliteness) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('useAnnounce: No AnnouncementProvider found. Announcement will not be made.');
      }
    };
  }

  return context.announce;
}

export default LiveRegion;
