import { Locale, defaultLocale, isValidLocale } from './types';

/**
 * Replace placeholders in a translation string with provided values
 * @example interpolate("Hello {name}!", { name: "John" }) => "Hello John!"
 */
export function interpolate(
  text: string,
  params: Record<string, string | number>
): string {
  return text.replace(/{(\w+)}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

/**
 * Get a nested value from an object using dot notation
 * @example getNestedValue(obj, "auth.login") => "Se connecter"
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): string | undefined {
  const keys = path.split('.');
  let result: unknown = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof result === 'string' ? result : undefined;
}

/**
 * Format a date according to the locale
 */
export function formatDate(
  date: Date | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return dateObj.toLocaleDateString(locale, options ?? defaultOptions);
}

/**
 * Format a date with time
 */
export function formatDateTime(
  date: Date | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return dateObj.toLocaleString(locale, options ?? defaultOptions);
}

/**
 * Format a currency amount
 */
export function formatCurrency(
  amount: number,
  locale: Locale,
  currency = 'EUR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a number
 */
export function formatNumber(
  num: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(num);
}

/**
 * Format a percentage
 */
export function formatPercent(num: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(
  date: Date | string,
  locale: Locale
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return rtf.format(-diffInMinutes, 'minute');
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return rtf.format(-diffInHours, 'hour');
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return rtf.format(-diffInDays, 'day');
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return rtf.format(-diffInMonths, 'month');
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return rtf.format(-diffInYears, 'year');
}

/**
 * Pluralize a word based on count
 */
export function pluralize(
  count: number,
  singular: string,
  plural: string,
  locale: Locale
): string {
  // French uses singular for 0 and 1
  if (locale === 'fr') {
    return count <= 1 ? singular : plural;
  }
  // Spanish uses singular for 1 only
  if (locale === 'es') {
    return count === 1 ? singular : plural;
  }
  // German uses singular for 1 only
  if (locale === 'de') {
    return count === 1 ? singular : plural;
  }
  // English uses singular only for 1
  return count === 1 ? singular : plural;
}

/**
 * Get browser locale or default
 */
export function getBrowserLocale(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }

  const browserLang = navigator.language?.split('-')[0];
  if (browserLang && isValidLocale(browserLang)) {
    return browserLang;
  }

  return defaultLocale;
}

/**
 * Store locale preference in localStorage
 */
export function setStoredLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale);
  }
}

/**
 * Get stored locale preference from localStorage
 */
export function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem('locale');
  if (stored && isValidLocale(stored)) {
    return stored;
  }

  return null;
}
