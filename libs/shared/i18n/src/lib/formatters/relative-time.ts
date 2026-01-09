/**
 * Relative Time Formatter
 *
 * Locale-aware relative time formatting utilities.
 * Supports "ago" and "in X minutes" style formatting.
 */

import { normalizeLocale } from './locale-config';

/**
 * Relative time unit
 */
export type RelativeTimeUnit =
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year';

/**
 * Relative time numeric style
 */
export type RelativeTimeNumeric = 'always' | 'auto';

/**
 * Relative time style
 */
export type RelativeTimeStyle = 'long' | 'short' | 'narrow';

/**
 * Relative time format options
 */
export interface RelativeTimeOptions {
  /** Numeric display: 'always' shows "1 day ago", 'auto' shows "yesterday" */
  numeric?: RelativeTimeNumeric;
  /** Style of the output */
  style?: RelativeTimeStyle;
  /** Custom reference date (default: now) */
  referenceDate?: Date;
}

/**
 * Time unit thresholds in seconds
 */
const TIME_THRESHOLDS = {
  second: 60,
  minute: 60 * 60,
  hour: 60 * 60 * 24,
  day: 60 * 60 * 24 * 7,
  week: 60 * 60 * 24 * 30,
  month: 60 * 60 * 24 * 365,
  year: Infinity,
} as const;

/**
 * Seconds per unit
 */
const SECONDS_PER_UNIT = {
  second: 1,
  minute: 60,
  hour: 60 * 60,
  day: 60 * 60 * 24,
  week: 60 * 60 * 24 * 7,
  month: 60 * 60 * 24 * 30,
  quarter: 60 * 60 * 24 * 90,
  year: 60 * 60 * 24 * 365,
} as const;

/**
 * Convert date to Date object
 */
function toDate(date: Date | string | number): Date {
  if (date instanceof Date) {
    return date;
  }
  return new Date(date);
}

/**
 * Get the difference in seconds between two dates
 */
function getDiffInSeconds(date: Date, referenceDate: Date): number {
  return (referenceDate.getTime() - date.getTime()) / 1000;
}

/**
 * Determine the best time unit for a given difference
 */
function getBestUnit(diffInSeconds: number): RelativeTimeUnit {
  const absDiff = Math.abs(diffInSeconds);

  if (absDiff < TIME_THRESHOLDS.second) {
    return 'second';
  }
  if (absDiff < TIME_THRESHOLDS.minute) {
    return 'minute';
  }
  if (absDiff < TIME_THRESHOLDS.hour) {
    return 'hour';
  }
  if (absDiff < TIME_THRESHOLDS.day) {
    return 'day';
  }
  if (absDiff < TIME_THRESHOLDS.week) {
    return 'week';
  }
  if (absDiff < TIME_THRESHOLDS.month) {
    return 'month';
  }
  return 'year';
}

/**
 * Get the value in a specific unit
 */
function getValueInUnit(diffInSeconds: number, unit: RelativeTimeUnit): number {
  return Math.round(diffInSeconds / SECONDS_PER_UNIT[unit]);
}

/**
 * Format relative time using Intl.RelativeTimeFormat
 *
 * @param date - Date to format relative to reference
 * @param locale - Locale code
 * @param options - Formatting options
 * @returns Formatted relative time string
 *
 * @example
 * // 5 minutes ago
 * formatRelativeTime(new Date(Date.now() - 5 * 60 * 1000), 'en-US')
 * // "5 minutes ago"
 *
 * // Yesterday
 * formatRelativeTime(new Date(Date.now() - 24 * 60 * 60 * 1000), 'en-US', { numeric: 'auto' })
 * // "yesterday"
 *
 * // In French
 * formatRelativeTime(new Date(Date.now() - 5 * 60 * 1000), 'fr-FR')
 * // "il y a 5 minutes"
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: string,
  options: RelativeTimeOptions = {}
): string {
  const dateObj = toDate(date);
  const fullLocale = normalizeLocale(locale);
  const referenceDate = options.referenceDate || new Date();
  const diffInSeconds = getDiffInSeconds(dateObj, referenceDate);

  const rtf = new Intl.RelativeTimeFormat(fullLocale, {
    numeric: options.numeric || 'auto',
    style: options.style || 'long',
  });

  const unit = getBestUnit(diffInSeconds);
  const value = getValueInUnit(diffInSeconds, unit);

  // Negative value means "ago", positive means "in"
  return rtf.format(-value, unit);
}

/**
 * Format relative time with a specific unit
 *
 * @param value - The value (negative for past, positive for future)
 * @param unit - The time unit
 * @param locale - Locale code
 * @param options - Formatting options
 * @returns Formatted relative time string
 *
 * @example
 * formatRelativeTimeUnit(-5, 'minute', 'en-US')
 * // "5 minutes ago"
 *
 * formatRelativeTimeUnit(2, 'day', 'fr-FR')
 * // "dans 2 jours"
 */
export function formatRelativeTimeUnit(
  value: number,
  unit: RelativeTimeUnit,
  locale: string,
  options: Omit<RelativeTimeOptions, 'referenceDate'> = {}
): string {
  const fullLocale = normalizeLocale(locale);

  const rtf = new Intl.RelativeTimeFormat(fullLocale, {
    numeric: options.numeric || 'always',
    style: options.style || 'long',
  });

  return rtf.format(value, unit);
}

/**
 * Format time ago (always past tense)
 *
 * @param date - Date in the past
 * @param locale - Locale code
 * @param options - Formatting options
 * @returns Formatted "ago" string
 *
 * @example
 * formatTimeAgo(new Date(Date.now() - 5 * 60 * 1000), 'en-US')
 * // "5 minutes ago"
 */
export function formatTimeAgo(
  date: Date | string | number,
  locale: string,
  options: Omit<RelativeTimeOptions, 'referenceDate'> = {}
): string {
  const dateObj = toDate(date);
  const now = new Date();

  // Ensure date is in the past
  if (dateObj.getTime() > now.getTime()) {
    return formatRelativeTime(dateObj, locale, { ...options, referenceDate: now });
  }

  return formatRelativeTime(dateObj, locale, { ...options, referenceDate: now });
}

/**
 * Format time until (always future tense)
 *
 * @param date - Date in the future
 * @param locale - Locale code
 * @param options - Formatting options
 * @returns Formatted "in X" string
 *
 * @example
 * formatTimeUntil(new Date(Date.now() + 5 * 60 * 1000), 'en-US')
 * // "in 5 minutes"
 */
export function formatTimeUntil(
  date: Date | string | number,
  locale: string,
  options: Omit<RelativeTimeOptions, 'referenceDate'> = {}
): string {
  const dateObj = toDate(date);
  const now = new Date();

  return formatRelativeTime(dateObj, locale, { ...options, referenceDate: now });
}

/**
 * Get human-readable duration between two dates
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @param locale - Locale code
 * @param options - Formatting options
 * @returns Formatted duration string
 *
 * @example
 * formatDuration(new Date('2024-01-01'), new Date('2024-01-03'), 'en-US')
 * // "2 days"
 */
export function formatDuration(
  startDate: Date | string | number,
  endDate: Date | string | number,
  locale: string,
  options: { style?: RelativeTimeStyle } = {}
): string {
  const start = toDate(startDate);
  const end = toDate(endDate);
  const diffInSeconds = Math.abs(getDiffInSeconds(start, end));

  const fullLocale = normalizeLocale(locale);
  const unit = getBestUnit(diffInSeconds);
  const value = Math.abs(getValueInUnit(diffInSeconds, unit));

  // Use NumberFormat with unit for duration (not RelativeTimeFormat)
  try {
    return new Intl.NumberFormat(fullLocale, {
      style: 'unit',
      unit: unit,
      unitDisplay: options.style || 'long',
    }).format(value);
  } catch {
    // Fallback for unsupported units
    const rtf = new Intl.RelativeTimeFormat(fullLocale, {
      numeric: 'always',
      style: options.style || 'long',
    });
    // Extract just the unit part
    const formatted = rtf.format(value, unit);
    // Remove "in" prefix if present
    return formatted.replace(/^in\s+/i, '').replace(/^dans\s+/i, '');
  }
}

/**
 * Format countdown to a future date
 *
 * @param targetDate - Target date
 * @param locale - Locale code
 * @param includeSeconds - Include seconds in countdown
 * @returns Countdown parts object
 *
 * @example
 * getCountdown(new Date(Date.now() + 3661000), 'en-US')
 * // { days: 0, hours: 1, minutes: 1, seconds: 1, formatted: "1:01:01" }
 */
export function getCountdown(
  targetDate: Date | string | number,
  _locale: string,
  includeSeconds = true
): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isPast: boolean;
  formatted: string;
} {
  const target = toDate(targetDate);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const totalSeconds = Math.abs(Math.floor(diffMs / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Format as HH:MM:SS or D:HH:MM:SS
  let formatted: string;
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (days > 0) {
    formatted = includeSeconds
      ? `${days}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${days}:${pad(hours)}:${pad(minutes)}`;
  } else {
    formatted = includeSeconds
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(hours)}:${pad(minutes)}`;
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds,
    isPast,
    formatted,
  };
}

/**
 * Format a human-readable countdown
 *
 * @param targetDate - Target date
 * @param locale - Locale code
 * @returns Human-readable countdown
 *
 * @example
 * formatHumanCountdown(new Date(Date.now() + 90000), 'en-US')
 * // "1 minute 30 seconds"
 */
export function formatHumanCountdown(targetDate: Date | string | number, locale: string): string {
  const fullLocale = normalizeLocale(locale);
  const countdown = getCountdown(targetDate, locale);

  const parts: string[] = [];

  const formatUnit = (value: number, unit: RelativeTimeUnit) => {
    if (value === 0) {
      return null;
    }
    try {
      return new Intl.NumberFormat(fullLocale, {
        style: 'unit',
        unit,
        unitDisplay: 'long',
      }).format(value);
    } catch {
      return `${value} ${unit}${value !== 1 ? 's' : ''}`;
    }
  };

  if (countdown.days > 0) {
    const formatted = formatUnit(countdown.days, 'day');
    if (formatted) {
      parts.push(formatted);
    }
  }
  if (countdown.hours > 0) {
    const formatted = formatUnit(countdown.hours, 'hour');
    if (formatted) {
      parts.push(formatted);
    }
  }
  if (countdown.minutes > 0 && countdown.days === 0) {
    const formatted = formatUnit(countdown.minutes, 'minute');
    if (formatted) {
      parts.push(formatted);
    }
  }
  if (countdown.seconds > 0 && countdown.days === 0 && countdown.hours === 0) {
    const formatted = formatUnit(countdown.seconds, 'second');
    if (formatted) {
      parts.push(formatted);
    }
  }

  if (parts.length === 0) {
    return formatUnit(0, 'second') || '0 seconds';
  }

  return parts.join(' ');
}

/**
 * Check if a date is within a relative time period
 *
 * @param date - Date to check
 * @param amount - Amount of time
 * @param unit - Time unit
 * @returns true if date is within the period
 *
 * @example
 * isWithin(someDate, 5, 'minute')
 * // true if someDate is within 5 minutes of now
 */
export function isWithin(
  date: Date | string | number,
  amount: number,
  unit: RelativeTimeUnit
): boolean {
  const dateObj = toDate(date);
  const now = new Date();
  const diffInSeconds = Math.abs(getDiffInSeconds(dateObj, now));
  const thresholdInSeconds = amount * SECONDS_PER_UNIT[unit];

  return diffInSeconds <= thresholdInSeconds;
}

/**
 * Check if a date was recently (within last X minutes)
 *
 * @param date - Date to check
 * @param minutes - Minutes threshold (default: 5)
 * @returns true if date is recent
 */
export function isRecent(date: Date | string | number, minutes = 5): boolean {
  const dateObj = toDate(date);
  const now = new Date();

  return dateObj.getTime() <= now.getTime() && isWithin(dateObj, minutes, 'minute');
}

/**
 * Check if a date is upcoming (within next X minutes)
 *
 * @param date - Date to check
 * @param minutes - Minutes threshold (default: 5)
 * @returns true if date is upcoming
 */
export function isUpcoming(date: Date | string | number, minutes = 5): boolean {
  const dateObj = toDate(date);
  const now = new Date();

  return dateObj.getTime() >= now.getTime() && isWithin(dateObj, minutes, 'minute');
}

/**
 * Get smart relative time (uses "just now", "yesterday", etc. when appropriate)
 *
 * @param date - Date to format
 * @param locale - Locale code
 * @returns Smart relative time string
 */
export function formatSmartRelativeTime(date: Date | string | number, locale: string): string {
  const dateObj = toDate(date);
  const now = new Date();
  const diffInSeconds = getDiffInSeconds(dateObj, now);

  // For very recent times (within 10 seconds)
  if (Math.abs(diffInSeconds) < 10) {
    // Return locale-appropriate "just now"
    const justNowMap: Record<string, string> = {
      en: 'just now',
      fr: "a l'instant",
      de: 'gerade eben',
      es: 'ahora mismo',
      it: 'proprio ora',
      ar: 'الان',
      nl: 'zojuist',
    };

    const lang = locale.split('-')[0] ?? 'en';
    return justNowMap[lang] ?? justNowMap['en'] ?? 'just now';
  }

  // Use auto for natural language
  return formatRelativeTime(dateObj, locale, { numeric: 'auto' });
}
