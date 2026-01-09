/**
 * Date Formatter
 *
 * Locale-aware date and time formatting utilities.
 * Supports multiple date formats, time formats, and locale-specific conventions.
 */

import { getLocaleConfig, normalizeLocale } from './locale-config';

/**
 * Date format options
 */
export type DateFormatStyle = 'short' | 'medium' | 'long' | 'full';

/**
 * Time format options
 */
export type TimeFormatStyle = 'short' | 'medium' | 'long';

/**
 * Date formatter options
 */
export interface DateFormatterOptions {
  /** Date style */
  dateStyle?: DateFormatStyle;
  /** Include time */
  includeTime?: boolean;
  /** Time style (when includeTime is true) */
  timeStyle?: TimeFormatStyle;
  /** Timezone (default: local) */
  timeZone?: string;
  /** Force 12h or 24h format (overrides locale default) */
  hourCycle?: 'h12' | 'h23';
}

/**
 * Convert date string or Date to Date object
 */
function toDate(date: Date | string | number): Date {
  if (date instanceof Date) {
    return date;
  }
  return new Date(date);
}

/**
 * Get Intl.DateTimeFormatOptions based on DateFormatterOptions
 */
function getDateTimeFormatOptions(
  locale: string,
  options: DateFormatterOptions
): Intl.DateTimeFormatOptions {
  const config = getLocaleConfig(locale);
  const result: Intl.DateTimeFormatOptions = {};

  // Set timezone
  if (options.timeZone) {
    result.timeZone = options.timeZone;
  }

  // Set hour cycle based on locale or override
  if (options.hourCycle) {
    result.hourCycle = options.hourCycle;
  } else if (config.date.timeFormat === '12h') {
    result.hourCycle = 'h12';
  } else {
    result.hourCycle = 'h23';
  }

  // Date style mapping
  switch (options.dateStyle) {
    case 'short':
      result.year = '2-digit';
      result.month = '2-digit';
      result.day = '2-digit';
      break;
    case 'medium':
      result.year = 'numeric';
      result.month = 'short';
      result.day = 'numeric';
      break;
    case 'long':
      result.year = 'numeric';
      result.month = 'long';
      result.day = 'numeric';
      break;
    case 'full':
      result.year = 'numeric';
      result.month = 'long';
      result.day = 'numeric';
      result.weekday = 'long';
      break;
    default:
      result.year = 'numeric';
      result.month = 'long';
      result.day = 'numeric';
  }

  // Time style mapping
  if (options.includeTime) {
    switch (options.timeStyle) {
      case 'short':
        result.hour = '2-digit';
        result.minute = '2-digit';
        break;
      case 'medium':
        result.hour = '2-digit';
        result.minute = '2-digit';
        result.second = '2-digit';
        break;
      case 'long':
        result.hour = '2-digit';
        result.minute = '2-digit';
        result.second = '2-digit';
        result.timeZoneName = 'short';
        break;
      default:
        result.hour = '2-digit';
        result.minute = '2-digit';
    }
  }

  return result;
}

/**
 * Format a date according to locale preferences
 *
 * @param date - Date to format
 * @param locale - Locale code (e.g., 'fr', 'en-US')
 * @param options - Formatting options
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date(), 'fr-FR', { dateStyle: 'long' })
 * // "15 janvier 2024"
 *
 * formatDate(new Date(), 'en-US', { dateStyle: 'long' })
 * // "January 15, 2024"
 */
export function formatDate(
  date: Date | string | number,
  locale: string,
  options: DateFormatterOptions = {}
): string {
  const dateObj = toDate(date);
  const fullLocale = normalizeLocale(locale);
  const formatOptions = getDateTimeFormatOptions(locale, {
    dateStyle: options.dateStyle || 'long',
    ...options,
    includeTime: false,
  });

  return new Intl.DateTimeFormat(fullLocale, formatOptions).format(dateObj);
}

/**
 * Format time only according to locale preferences
 *
 * @param date - Date to format
 * @param locale - Locale code
 * @param options - Formatting options
 * @returns Formatted time string
 *
 * @example
 * formatTime(new Date(), 'fr-FR')
 * // "14:30"
 *
 * formatTime(new Date(), 'en-US')
 * // "2:30 PM"
 */
export function formatTime(
  date: Date | string | number,
  locale: string,
  options: Pick<DateFormatterOptions, 'timeStyle' | 'timeZone' | 'hourCycle'> = {}
): string {
  const dateObj = toDate(date);
  const fullLocale = normalizeLocale(locale);
  const config = getLocaleConfig(locale);

  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: options.timeZone,
    hourCycle: options.hourCycle || (config.date.timeFormat === '12h' ? 'h12' : 'h23'),
  };

  switch (options.timeStyle) {
    case 'short':
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
      break;
    case 'medium':
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
      formatOptions.second = '2-digit';
      break;
    case 'long':
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
      formatOptions.second = '2-digit';
      formatOptions.timeZoneName = 'short';
      break;
    default:
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
  }

  return new Intl.DateTimeFormat(fullLocale, formatOptions).format(dateObj);
}

/**
 * Format date and time according to locale preferences
 *
 * @param date - Date to format
 * @param locale - Locale code
 * @param options - Formatting options
 * @returns Formatted date/time string
 *
 * @example
 * formatDateTime(new Date(), 'fr-FR', { dateStyle: 'long', timeStyle: 'short' })
 * // "15 janvier 2024 a 14:30"
 */
export function formatDateTime(
  date: Date | string | number,
  locale: string,
  options: DateFormatterOptions = {}
): string {
  const dateObj = toDate(date);
  const fullLocale = normalizeLocale(locale);
  const formatOptions = getDateTimeFormatOptions(locale, {
    dateStyle: options.dateStyle || 'long',
    timeStyle: options.timeStyle || 'short',
    ...options,
    includeTime: true,
  });

  return new Intl.DateTimeFormat(fullLocale, formatOptions).format(dateObj);
}

/**
 * Format day of week
 *
 * @param date - Date to get day of week from
 * @param locale - Locale code
 * @param style - 'narrow' (M), 'short' (Mon), or 'long' (Monday)
 * @returns Formatted day of week
 *
 * @example
 * formatDayOfWeek(new Date(), 'fr-FR', 'long')
 * // "lundi"
 */
export function formatDayOfWeek(
  date: Date | string | number,
  locale: string,
  style: 'narrow' | 'short' | 'long' = 'long'
): string {
  const dateObj = toDate(date);
  const fullLocale = normalizeLocale(locale);

  return new Intl.DateTimeFormat(fullLocale, { weekday: style }).format(dateObj);
}

/**
 * Format month name
 *
 * @param date - Date or month number (1-12)
 * @param locale - Locale code
 * @param style - 'narrow' (J), 'short' (Jan), or 'long' (January)
 * @returns Formatted month name
 *
 * @example
 * formatMonth(1, 'fr-FR', 'long')
 * // "janvier"
 */
export function formatMonth(
  date: Date | string | number,
  locale: string,
  style: 'narrow' | 'short' | 'long' = 'long'
): string {
  let dateObj: Date;

  if (typeof date === 'number' && date >= 1 && date <= 12) {
    // Month number (1-12)
    dateObj = new Date(2024, date - 1, 1);
  } else {
    dateObj = toDate(date);
  }

  const fullLocale = normalizeLocale(locale);
  return new Intl.DateTimeFormat(fullLocale, { month: style }).format(dateObj);
}

/**
 * Format year
 *
 * @param date - Date to get year from
 * @param locale - Locale code
 * @param style - '2-digit' (24) or 'numeric' (2024)
 * @returns Formatted year
 */
export function formatYear(
  date: Date | string | number,
  locale: string,
  style: '2-digit' | 'numeric' = 'numeric'
): string {
  const dateObj = toDate(date);
  const fullLocale = normalizeLocale(locale);

  return new Intl.DateTimeFormat(fullLocale, { year: style }).format(dateObj);
}

/**
 * Get the first day of week for a locale (0 = Sunday, 1 = Monday, 6 = Saturday)
 *
 * @param locale - Locale code
 * @returns Day number (0-6)
 */
export function getFirstDayOfWeek(locale: string): number {
  const config = getLocaleConfig(locale);
  return config.date.firstDayOfWeek;
}

/**
 * Get whether the locale uses 12-hour time format
 *
 * @param locale - Locale code
 * @returns true if 12h, false if 24h
 */
export function is12HourFormat(locale: string): boolean {
  const config = getLocaleConfig(locale);
  return config.date.timeFormat === '12h';
}

/**
 * Get ordered days of week for a locale
 *
 * @param locale - Locale code
 * @param style - Day name style
 * @returns Array of day names starting from locale's first day
 *
 * @example
 * getWeekDays('fr-FR', 'short')
 * // ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']
 */
export function getWeekDays(
  locale: string,
  style: 'narrow' | 'short' | 'long' = 'short'
): string[] {
  const config = getLocaleConfig(locale);
  const fullLocale = normalizeLocale(locale);
  const firstDay = config.date.firstDayOfWeek;

  // Generate days starting from Sunday (0)
  const allDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(2024, 0, 7 + i); // Jan 7, 2024 is a Sunday
    allDays.push(new Intl.DateTimeFormat(fullLocale, { weekday: style }).format(date));
  }

  // Reorder to start from locale's first day
  return [...allDays.slice(firstDay), ...allDays.slice(0, firstDay)];
}

/**
 * Get all month names for a locale
 *
 * @param locale - Locale code
 * @param style - Month name style
 * @returns Array of month names (January to December)
 *
 * @example
 * getMonths('fr-FR', 'long')
 * // ['janvier', 'fevrier', ..., 'decembre']
 */
export function getMonths(locale: string, style: 'narrow' | 'short' | 'long' = 'long'): string[] {
  const fullLocale = normalizeLocale(locale);
  const months: string[] = [];

  for (let i = 0; i < 12; i++) {
    const date = new Date(2024, i, 1);
    months.push(new Intl.DateTimeFormat(fullLocale, { month: style }).format(date));
  }

  return months;
}

/**
 * Format a date range
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @param locale - Locale code
 * @param options - Formatting options
 * @returns Formatted date range
 *
 * @example
 * formatDateRange(new Date('2024-01-15'), new Date('2024-01-17'), 'fr-FR')
 * // "15 - 17 janvier 2024"
 */
export function formatDateRange(
  startDate: Date | string | number,
  endDate: Date | string | number,
  locale: string,
  options: Pick<DateFormatterOptions, 'dateStyle' | 'timeZone'> = {}
): string {
  const startObj = toDate(startDate);
  const endObj = toDate(endDate);
  const fullLocale = normalizeLocale(locale);
  const formatOptions = getDateTimeFormatOptions(locale, {
    dateStyle: options.dateStyle || 'long',
    timeZone: options.timeZone,
    includeTime: false,
  });

  try {
    // Use formatRange if available
    const formatter = new Intl.DateTimeFormat(fullLocale, formatOptions);
    if ('formatRange' in formatter) {
      return (
        formatter as Intl.DateTimeFormat & {
          formatRange(start: Date, end: Date): string;
        }
      ).formatRange(startObj, endObj);
    }
  } catch {
    // Fall through to manual format
  }

  // Fallback: format as "start - end"
  const formatter = new Intl.DateTimeFormat(fullLocale, formatOptions);
  return `${formatter.format(startObj)} - ${formatter.format(endObj)}`;
}

/**
 * Format a time range
 *
 * @param startTime - Start time
 * @param endTime - End time
 * @param locale - Locale code
 * @param options - Formatting options
 * @returns Formatted time range
 *
 * @example
 * formatTimeRange(new Date('2024-01-15T14:00'), new Date('2024-01-15T16:00'), 'fr-FR')
 * // "14:00 - 16:00"
 */
export function formatTimeRange(
  startTime: Date | string | number,
  endTime: Date | string | number,
  locale: string,
  options: Pick<DateFormatterOptions, 'timeStyle' | 'timeZone' | 'hourCycle'> = {}
): string {
  const startFormatted = formatTime(startTime, locale, options);
  const endFormatted = formatTime(endTime, locale, options);

  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Parse a date string according to locale
 * Note: This is a best-effort parser for common formats
 *
 * @param dateString - Date string to parse
 * @param locale - Locale code (used to determine date order)
 * @returns Parsed Date or null if parsing fails
 */
export function parseLocaleDateString(dateString: string, locale: string): Date | null {
  const config = getLocaleConfig(locale);

  // Remove common separators and split
  const parts = dateString.split(/[/\-.\s]+/).filter(Boolean);

  if (parts.length < 3) {
    // Try native Date parsing
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  let year = 0;
  let month = 0;
  let day = 0;

  const nums = parts.slice(0, 3).map((p) => parseInt(p, 10));
  const [num1, num2, num3] = nums;

  if (num1 === undefined || num2 === undefined || num3 === undefined) {
    return null;
  }

  switch (config.date.dateOrder) {
    case 'DMY':
      day = num1;
      month = num2;
      year = num3;
      break;
    case 'MDY':
      month = num1;
      day = num2;
      year = num3;
      break;
    case 'YMD':
      year = num1;
      month = num2;
      day = num3;
      break;
    default:
      day = num1;
      month = num2;
      year = num3;
  }

  // Handle 2-digit years
  if (year < 100) {
    year += year < 50 ? 2000 : 1900;
  }

  // Validate
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return new Date(year, month - 1, day);
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string | number): boolean {
  const dateObj = toDate(date);
  const today = new Date();

  return (
    dateObj.getFullYear() === today.getFullYear() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getDate() === today.getDate()
  );
}

/**
 * Check if a date is tomorrow
 */
export function isTomorrow(date: Date | string | number): boolean {
  const dateObj = toDate(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    dateObj.getFullYear() === tomorrow.getFullYear() &&
    dateObj.getMonth() === tomorrow.getMonth() &&
    dateObj.getDate() === tomorrow.getDate()
  );
}

/**
 * Check if a date is yesterday
 */
export function isYesterday(date: Date | string | number): boolean {
  const dateObj = toDate(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    dateObj.getFullYear() === yesterday.getFullYear() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getDate() === yesterday.getDate()
  );
}
