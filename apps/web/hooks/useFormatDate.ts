/**
 * useFormatDate Hook
 *
 * React hook for locale-aware date formatting in Next.js applications.
 * Uses the current locale from next-intl.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useLocale } from 'next-intl';
import {
  formatDate as formatDateFn,
  formatTime as formatTimeFn,
  formatDateTime as formatDateTimeFn,
  formatDayOfWeek as formatDayOfWeekFn,
  formatMonth as formatMonthFn,
  formatYear as formatYearFn,
  formatDateRange as formatDateRangeFn,
  formatTimeRange as formatTimeRangeFn,
  getFirstDayOfWeek as getFirstDayOfWeekFn,
  is12HourFormat as is12HourFormatFn,
  getWeekDays as getWeekDaysFn,
  getMonths as getMonthsFn,
  parseLocaleDateString as parseLocaleDateStringFn,
  isToday,
  isTomorrow,
  isYesterday,
  type DateFormatterOptions,
  type DateFormatStyle,
  type TimeFormatStyle,
} from '@festival/shared/i18n';

/**
 * Return type for useFormatDate hook
 */
export interface UseFormatDateReturn {
  /** Current locale code */
  locale: string;

  /**
   * Format a date
   * @example formatDate(new Date()) // "January 15, 2024"
   */
  formatDate: (date: Date | string | number, options?: DateFormatterOptions) => string;

  /**
   * Format time only
   * @example formatTime(new Date()) // "2:30 PM" or "14:30"
   */
  formatTime: (
    date: Date | string | number,
    options?: Pick<DateFormatterOptions, 'timeStyle' | 'timeZone' | 'hourCycle'>
  ) => string;

  /**
   * Format date and time together
   * @example formatDateTime(new Date()) // "January 15, 2024 at 2:30 PM"
   */
  formatDateTime: (date: Date | string | number, options?: DateFormatterOptions) => string;

  /**
   * Format day of week
   * @example formatDayOfWeek(new Date(), 'long') // "Monday"
   */
  formatDayOfWeek: (date: Date | string | number, style?: 'narrow' | 'short' | 'long') => string;

  /**
   * Format month name
   * @example formatMonth(1, 'long') // "January"
   */
  formatMonth: (date: Date | string | number, style?: 'narrow' | 'short' | 'long') => string;

  /**
   * Format year
   * @example formatYear(new Date()) // "2024"
   */
  formatYear: (date: Date | string | number, style?: '2-digit' | 'numeric') => string;

  /**
   * Format a date range
   * @example formatDateRange(startDate, endDate) // "Jan 15 - 17, 2024"
   */
  formatDateRange: (
    startDate: Date | string | number,
    endDate: Date | string | number,
    options?: Pick<DateFormatterOptions, 'dateStyle' | 'timeZone'>
  ) => string;

  /**
   * Format a time range
   * @example formatTimeRange(startTime, endTime) // "2:00 PM - 4:00 PM"
   */
  formatTimeRange: (
    startTime: Date | string | number,
    endTime: Date | string | number,
    options?: Pick<DateFormatterOptions, 'timeStyle' | 'timeZone' | 'hourCycle'>
  ) => string;

  /**
   * Get first day of week for current locale (0=Sunday, 1=Monday)
   */
  firstDayOfWeek: number;

  /**
   * Whether locale uses 12-hour time format
   */
  uses12Hour: boolean;

  /**
   * Get ordered week day names for current locale
   * @example getWeekDays('short') // ['Mon', 'Tue', ...]
   */
  getWeekDays: (style?: 'narrow' | 'short' | 'long') => string[];

  /**
   * Get month names for current locale
   * @example getMonths('long') // ['January', 'February', ...]
   */
  getMonths: (style?: 'narrow' | 'short' | 'long') => string[];

  /**
   * Parse a locale-formatted date string
   * @example parseDate("15/01/2024") // Date object
   */
  parseDate: (dateString: string) => Date | null;

  /**
   * Check if date is today
   */
  isToday: (date: Date | string | number) => boolean;

  /**
   * Check if date is tomorrow
   */
  isTomorrow: (date: Date | string | number) => boolean;

  /**
   * Check if date is yesterday
   */
  isYesterday: (date: Date | string | number) => boolean;
}

/**
 * Hook for locale-aware date formatting
 *
 * @returns Date formatting utilities bound to current locale
 *
 * @example
 * ```tsx
 * function EventCard({ event }) {
 *   const { formatDate, formatTime, formatDateRange } = useFormatDate();
 *
 *   return (
 *     <div>
 *       <h2>{event.name}</h2>
 *       <p>Date: {formatDate(event.startDate, { dateStyle: 'long' })}</p>
 *       <p>Time: {formatTime(event.startDate)}</p>
 *       <p>Duration: {formatDateRange(event.startDate, event.endDate)}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFormatDate(): UseFormatDateReturn {
  const locale = useLocale();

  const formatDate = useCallback(
    (date: Date | string | number, options?: DateFormatterOptions) =>
      formatDateFn(date, locale, options),
    [locale]
  );

  const formatTime = useCallback(
    (
      date: Date | string | number,
      options?: Pick<DateFormatterOptions, 'timeStyle' | 'timeZone' | 'hourCycle'>
    ) => formatTimeFn(date, locale, options),
    [locale]
  );

  const formatDateTime = useCallback(
    (date: Date | string | number, options?: DateFormatterOptions) =>
      formatDateTimeFn(date, locale, options),
    [locale]
  );

  const formatDayOfWeek = useCallback(
    (date: Date | string | number, style: 'narrow' | 'short' | 'long' = 'long') =>
      formatDayOfWeekFn(date, locale, style),
    [locale]
  );

  const formatMonth = useCallback(
    (date: Date | string | number, style: 'narrow' | 'short' | 'long' = 'long') =>
      formatMonthFn(date, locale, style),
    [locale]
  );

  const formatYear = useCallback(
    (date: Date | string | number, style: '2-digit' | 'numeric' = 'numeric') =>
      formatYearFn(date, locale, style),
    [locale]
  );

  const formatDateRange = useCallback(
    (
      startDate: Date | string | number,
      endDate: Date | string | number,
      options?: Pick<DateFormatterOptions, 'dateStyle' | 'timeZone'>
    ) => formatDateRangeFn(startDate, endDate, locale, options),
    [locale]
  );

  const formatTimeRange = useCallback(
    (
      startTime: Date | string | number,
      endTime: Date | string | number,
      options?: Pick<DateFormatterOptions, 'timeStyle' | 'timeZone' | 'hourCycle'>
    ) => formatTimeRangeFn(startTime, endTime, locale, options),
    [locale]
  );

  const firstDayOfWeek = useMemo(() => getFirstDayOfWeekFn(locale), [locale]);

  const uses12Hour = useMemo(() => is12HourFormatFn(locale), [locale]);

  const getWeekDays = useCallback(
    (style: 'narrow' | 'short' | 'long' = 'short') => getWeekDaysFn(locale, style),
    [locale]
  );

  const getMonths = useCallback(
    (style: 'narrow' | 'short' | 'long' = 'long') => getMonthsFn(locale, style),
    [locale]
  );

  const parseDate = useCallback(
    (dateString: string) => parseLocaleDateStringFn(dateString, locale),
    [locale]
  );

  return {
    locale,
    formatDate,
    formatTime,
    formatDateTime,
    formatDayOfWeek,
    formatMonth,
    formatYear,
    formatDateRange,
    formatTimeRange,
    firstDayOfWeek,
    uses12Hour,
    getWeekDays,
    getMonths,
    parseDate,
    isToday,
    isTomorrow,
    isYesterday,
  };
}

export default useFormatDate;

// Re-export types for convenience
export type { DateFormatterOptions, DateFormatStyle, TimeFormatStyle };
