/**
 * useRelativeTime Hook
 *
 * React hook for locale-aware relative time formatting in Next.js applications.
 * Supports "ago", "in X minutes", countdowns, and duration formatting.
 */

'use client';

import { useCallback, useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import {
  formatRelativeTime as formatRelativeTimeFn,
  formatRelativeTimeUnit as formatRelativeTimeUnitFn,
  formatTimeAgo as formatTimeAgoFn,
  formatTimeUntil as formatTimeUntilFn,
  formatDuration as formatDurationFn,
  formatHumanCountdown as formatHumanCountdownFn,
  formatSmartRelativeTime as formatSmartRelativeTimeFn,
  getCountdown as getCountdownFn,
  isWithin as isWithinFn,
  isRecent as isRecentFn,
  isUpcoming as isUpcomingFn,
  type RelativeTimeOptions,
  type RelativeTimeUnit,
  type RelativeTimeNumeric,
  type RelativeTimeStyle,
} from '@festival/shared/i18n';

/**
 * Countdown result type
 */
export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isPast: boolean;
  formatted: string;
}

/**
 * Return type for useRelativeTime hook
 */
export interface UseRelativeTimeReturn {
  /** Current locale code */
  locale: string;

  /**
   * Format relative time (auto-selects unit)
   * @example formatRelativeTime(fiveMinutesAgo) // "5 minutes ago"
   */
  formatRelativeTime: (date: Date | string | number, options?: RelativeTimeOptions) => string;

  /**
   * Format with specific unit
   * @example formatRelativeTimeUnit(-5, 'minute') // "5 minutes ago"
   */
  formatRelativeTimeUnit: (
    value: number,
    unit: RelativeTimeUnit,
    options?: Omit<RelativeTimeOptions, 'referenceDate'>
  ) => string;

  /**
   * Format time ago (past tense)
   * @example formatTimeAgo(pastDate) // "2 hours ago"
   */
  formatTimeAgo: (
    date: Date | string | number,
    options?: Omit<RelativeTimeOptions, 'referenceDate'>
  ) => string;

  /**
   * Format time until (future tense)
   * @example formatTimeUntil(futureDate) // "in 3 days"
   */
  formatTimeUntil: (
    date: Date | string | number,
    options?: Omit<RelativeTimeOptions, 'referenceDate'>
  ) => string;

  /**
   * Format duration between two dates
   * @example formatDuration(startDate, endDate) // "2 hours"
   */
  formatDuration: (
    startDate: Date | string | number,
    endDate: Date | string | number,
    options?: { style?: RelativeTimeStyle }
  ) => string;

  /**
   * Format human-readable countdown
   * @example formatHumanCountdown(futureDate) // "1 hour 30 minutes"
   */
  formatHumanCountdown: (targetDate: Date | string | number) => string;

  /**
   * Format smart relative time (uses "just now", "yesterday", etc.)
   * @example formatSmartRelativeTime(recentDate) // "just now"
   */
  formatSmartRelativeTime: (date: Date | string | number) => string;

  /**
   * Get countdown breakdown
   * @returns { days, hours, minutes, seconds, totalSeconds, isPast, formatted }
   */
  getCountdown: (targetDate: Date | string | number, includeSeconds?: boolean) => CountdownResult;

  /**
   * Check if date is within a time period
   * @example isWithin(date, 5, 'minute') // true if within 5 minutes
   */
  isWithin: (date: Date | string | number, amount: number, unit: RelativeTimeUnit) => boolean;

  /**
   * Check if date is recent (within last X minutes)
   * @example isRecent(date, 5) // true if within last 5 minutes
   */
  isRecent: (date: Date | string | number, minutes?: number) => boolean;

  /**
   * Check if date is upcoming (within next X minutes)
   * @example isUpcoming(date, 30) // true if within next 30 minutes
   */
  isUpcoming: (date: Date | string | number, minutes?: number) => boolean;
}

/**
 * Hook for locale-aware relative time formatting
 *
 * @returns Relative time formatting utilities bound to current locale
 *
 * @example
 * ```tsx
 * function EventCountdown({ eventDate }) {
 *   const {
 *     formatTimeUntil,
 *     formatSmartRelativeTime,
 *     isUpcoming
 *   } = useRelativeTime();
 *
 *   if (isUpcoming(eventDate, 30)) {
 *     return <span className="urgent">Starting {formatTimeUntil(eventDate)}</span>;
 *   }
 *
 *   return <span>{formatSmartRelativeTime(eventDate)}</span>;
 * }
 * ```
 */
export function useRelativeTime(): UseRelativeTimeReturn {
  const locale = useLocale();

  const formatRelativeTime = useCallback(
    (date: Date | string | number, options?: RelativeTimeOptions) =>
      formatRelativeTimeFn(date, locale, options),
    [locale]
  );

  const formatRelativeTimeUnit = useCallback(
    (value: number, unit: RelativeTimeUnit, options?: Omit<RelativeTimeOptions, 'referenceDate'>) =>
      formatRelativeTimeUnitFn(value, unit, locale, options),
    [locale]
  );

  const formatTimeAgo = useCallback(
    (date: Date | string | number, options?: Omit<RelativeTimeOptions, 'referenceDate'>) =>
      formatTimeAgoFn(date, locale, options),
    [locale]
  );

  const formatTimeUntil = useCallback(
    (date: Date | string | number, options?: Omit<RelativeTimeOptions, 'referenceDate'>) =>
      formatTimeUntilFn(date, locale, options),
    [locale]
  );

  const formatDuration = useCallback(
    (
      startDate: Date | string | number,
      endDate: Date | string | number,
      options?: { style?: RelativeTimeStyle }
    ) => formatDurationFn(startDate, endDate, locale, options),
    [locale]
  );

  const formatHumanCountdown = useCallback(
    (targetDate: Date | string | number) => formatHumanCountdownFn(targetDate, locale),
    [locale]
  );

  const formatSmartRelativeTime = useCallback(
    (date: Date | string | number) => formatSmartRelativeTimeFn(date, locale),
    [locale]
  );

  const getCountdown = useCallback(
    (targetDate: Date | string | number, includeSeconds = true) =>
      getCountdownFn(targetDate, locale, includeSeconds),
    [locale]
  );

  const isWithin = useCallback(
    (date: Date | string | number, amount: number, unit: RelativeTimeUnit) =>
      isWithinFn(date, amount, unit),
    []
  );

  const isRecent = useCallback(
    (date: Date | string | number, minutes = 5) => isRecentFn(date, minutes),
    []
  );

  const isUpcoming = useCallback(
    (date: Date | string | number, minutes = 5) => isUpcomingFn(date, minutes),
    []
  );

  return {
    locale,
    formatRelativeTime,
    formatRelativeTimeUnit,
    formatTimeAgo,
    formatTimeUntil,
    formatDuration,
    formatHumanCountdown,
    formatSmartRelativeTime,
    getCountdown,
    isWithin,
    isRecent,
    isUpcoming,
  };
}

/**
 * Hook for live-updating relative time display
 *
 * @param date - Date to format
 * @param updateInterval - Update interval in milliseconds (default: 60000 = 1 minute)
 * @param options - Formatting options
 * @returns Formatted relative time that updates automatically
 *
 * @example
 * ```tsx
 * function LiveTimestamp({ createdAt }) {
 *   const timeAgo = useLiveRelativeTime(createdAt, 30000);
 *   return <span>{timeAgo}</span>;
 * }
 * ```
 */
export function useLiveRelativeTime(
  date: Date | string | number,
  updateInterval = 60000,
  _options?: RelativeTimeOptions
): string {
  const locale = useLocale();
  const [formatted, setFormatted] = useState(() => formatSmartRelativeTimeFn(date, locale));

  useEffect(() => {
    // Update immediately
    setFormatted(formatSmartRelativeTimeFn(date, locale));

    // Set up interval for updates
    const interval = setInterval(() => {
      setFormatted(formatSmartRelativeTimeFn(date, locale));
    }, updateInterval);

    return () => clearInterval(interval);
  }, [date, locale, updateInterval]);

  return formatted;
}

/**
 * Hook for live countdown timer
 *
 * @param targetDate - Target date for countdown
 * @param updateInterval - Update interval in milliseconds (default: 1000 = 1 second)
 * @returns Live countdown result that updates automatically
 *
 * @example
 * ```tsx
 * function EventTimer({ eventDate }) {
 *   const countdown = useLiveCountdown(eventDate);
 *
 *   if (countdown.isPast) {
 *     return <span>Event has started!</span>;
 *   }
 *
 *   return (
 *     <div>
 *       <span>{countdown.days}d </span>
 *       <span>{countdown.hours}h </span>
 *       <span>{countdown.minutes}m </span>
 *       <span>{countdown.seconds}s</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useLiveCountdown(
  targetDate: Date | string | number,
  updateInterval = 1000
): CountdownResult {
  const locale = useLocale();
  const [countdown, setCountdown] = useState(() => getCountdownFn(targetDate, locale, true));

  useEffect(() => {
    // Update immediately
    setCountdown(getCountdownFn(targetDate, locale, true));

    // Set up interval for updates
    const interval = setInterval(() => {
      setCountdown(getCountdownFn(targetDate, locale, true));
    }, updateInterval);

    return () => clearInterval(interval);
  }, [targetDate, locale, updateInterval]);

  return countdown;
}

export default useRelativeTime;

// Re-export types for convenience
export type { RelativeTimeOptions, RelativeTimeUnit, RelativeTimeNumeric, RelativeTimeStyle };
