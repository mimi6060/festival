/**
 * useRelativeTime Hook
 *
 * React Native hook for locale-aware relative time formatting.
 * Supports "ago", "in X minutes", countdowns, and duration formatting.
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
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
 * Hook for locale-aware relative time formatting in React Native
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
 *     return <Text style={styles.urgent}>Starting {formatTimeUntil(eventDate)}</Text>;
 *   }
 *
 *   return <Text>{formatSmartRelativeTime(eventDate)}</Text>;
 * }
 * ```
 */
export function useRelativeTime(): UseRelativeTimeReturn {
  const language = useSettingsStore((state) => state.language);

  const formatRelativeTime = useCallback(
    (date: Date | string | number, options?: RelativeTimeOptions) =>
      formatRelativeTimeFn(date, language, options),
    [language]
  );

  const formatRelativeTimeUnit = useCallback(
    (value: number, unit: RelativeTimeUnit, options?: Omit<RelativeTimeOptions, 'referenceDate'>) =>
      formatRelativeTimeUnitFn(value, unit, language, options),
    [language]
  );

  const formatTimeAgo = useCallback(
    (date: Date | string | number, options?: Omit<RelativeTimeOptions, 'referenceDate'>) =>
      formatTimeAgoFn(date, language, options),
    [language]
  );

  const formatTimeUntil = useCallback(
    (date: Date | string | number, options?: Omit<RelativeTimeOptions, 'referenceDate'>) =>
      formatTimeUntilFn(date, language, options),
    [language]
  );

  const formatDuration = useCallback(
    (
      startDate: Date | string | number,
      endDate: Date | string | number,
      options?: { style?: RelativeTimeStyle }
    ) => formatDurationFn(startDate, endDate, language, options),
    [language]
  );

  const formatHumanCountdown = useCallback(
    (targetDate: Date | string | number) => formatHumanCountdownFn(targetDate, language),
    [language]
  );

  const formatSmartRelativeTime = useCallback(
    (date: Date | string | number) => formatSmartRelativeTimeFn(date, language),
    [language]
  );

  const getCountdown = useCallback(
    (targetDate: Date | string | number, includeSeconds = true) =>
      getCountdownFn(targetDate, language, includeSeconds),
    [language]
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
    locale: language,
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
 * Hook for live-updating relative time display in React Native
 *
 * @param date - Date to format
 * @param updateInterval - Update interval in milliseconds (default: 60000 = 1 minute)
 * @returns Formatted relative time that updates automatically
 *
 * @example
 * ```tsx
 * function LiveTimestamp({ createdAt }) {
 *   const timeAgo = useLiveRelativeTime(createdAt, 30000);
 *   return <Text>{timeAgo}</Text>;
 * }
 * ```
 */
export function useLiveRelativeTime(date: Date | string | number, updateInterval = 60000): string {
  const language = useSettingsStore((state) => state.language);
  const [formatted, setFormatted] = useState(() => formatSmartRelativeTimeFn(date, language));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Update immediately
    setFormatted(formatSmartRelativeTimeFn(date, language));

    // Set up interval for updates
    intervalRef.current = setInterval(() => {
      setFormatted(formatSmartRelativeTimeFn(date, language));
    }, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [date, language, updateInterval]);

  // Handle app state changes (pause when backgrounded)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Update immediately when app comes to foreground
        setFormatted(formatSmartRelativeTimeFn(date, language));
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [date, language]);

  return formatted;
}

/**
 * Hook for live countdown timer in React Native
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
 *     return <Text>Event has started!</Text>;
 *   }
 *
 *   return (
 *     <View style={styles.countdown}>
 *       <Text>{countdown.days}d </Text>
 *       <Text>{countdown.hours}h </Text>
 *       <Text>{countdown.minutes}m </Text>
 *       <Text>{countdown.seconds}s</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useLiveCountdown(
  targetDate: Date | string | number,
  updateInterval = 1000
): CountdownResult {
  const language = useSettingsStore((state) => state.language);
  const [countdown, setCountdown] = useState(() => getCountdownFn(targetDate, language, true));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Update immediately
    setCountdown(getCountdownFn(targetDate, language, true));

    // Set up interval for updates
    intervalRef.current = setInterval(() => {
      // Only update if app is in foreground
      if (appStateRef.current === 'active') {
        setCountdown(getCountdownFn(targetDate, language, true));
      }
    }, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [targetDate, language, updateInterval]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;

      if (nextAppState === 'active') {
        // Update immediately when app comes to foreground
        setCountdown(getCountdownFn(targetDate, language, true));
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [targetDate, language]);

  return countdown;
}

export default useRelativeTime;

// Re-export types for convenience
export type { RelativeTimeOptions, RelativeTimeUnit, RelativeTimeNumeric, RelativeTimeStyle };
