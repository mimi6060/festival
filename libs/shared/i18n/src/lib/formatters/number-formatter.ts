/**
 * Number Formatter
 *
 * Locale-aware number formatting utilities.
 * Handles decimal separators, thousands separators, percentages, and compact notation.
 */

import { getLocaleConfig, normalizeLocale } from './locale-config';

/**
 * Number format options
 */
export interface NumberFormatterOptions {
  /** Minimum integer digits */
  minimumIntegerDigits?: number;
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Minimum significant digits */
  minimumSignificantDigits?: number;
  /** Maximum significant digits */
  maximumSignificantDigits?: number;
  /** Use grouping (thousands separators) */
  useGrouping?: boolean;
  /** Sign display mode */
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero';
}

/**
 * Compact notation style
 */
export type CompactDisplay = 'short' | 'long';

/**
 * Percentage format options
 */
export interface PercentFormatterOptions {
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Sign display mode */
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero';
}

/**
 * Format a number according to locale preferences
 *
 * @param value - Number to format
 * @param locale - Locale code
 * @param options - Formatting options
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1234567.89, 'fr-FR')
 * // "1 234 567,89"
 *
 * formatNumber(1234567.89, 'en-US')
 * // "1,234,567.89"
 *
 * formatNumber(1234567.89, 'de-DE')
 * // "1.234.567,89"
 */
export function formatNumber(
  value: number,
  locale: string,
  options: NumberFormatterOptions = {}
): string {
  const fullLocale = normalizeLocale(locale);
  const config = getLocaleConfig(locale);

  const formatOptions: Intl.NumberFormatOptions = {
    minimumIntegerDigits: options.minimumIntegerDigits,
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits ?? config.number.defaultDecimals,
    minimumSignificantDigits: options.minimumSignificantDigits,
    maximumSignificantDigits: options.maximumSignificantDigits,
    useGrouping: options.useGrouping ?? true,
    signDisplay: options.signDisplay,
  };

  // Remove undefined values
  Object.keys(formatOptions).forEach((key) => {
    if (formatOptions[key as keyof Intl.NumberFormatOptions] === undefined) {
      delete formatOptions[key as keyof Intl.NumberFormatOptions];
    }
  });

  return new Intl.NumberFormat(fullLocale, formatOptions).format(value);
}

/**
 * Format an integer (no decimal places)
 *
 * @param value - Number to format
 * @param locale - Locale code
 * @param useGrouping - Whether to use thousands separators
 * @returns Formatted integer string
 *
 * @example
 * formatInteger(1234567, 'fr-FR')
 * // "1 234 567"
 */
export function formatInteger(value: number, locale: string, useGrouping = true): string {
  return formatNumber(Math.round(value), locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping,
  });
}

/**
 * Format a decimal number with specific precision
 *
 * @param value - Number to format
 * @param locale - Locale code
 * @param decimals - Number of decimal places
 * @returns Formatted decimal string
 *
 * @example
 * formatDecimal(1234.5678, 'fr-FR', 2)
 * // "1 234,57"
 */
export function formatDecimal(value: number, locale: string, decimals = 2): string {
  return formatNumber(value, locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a percentage
 *
 * @param value - Value to format (0.5 = 50%, 50 = 50%)
 * @param locale - Locale code
 * @param options - Formatting options
 * @param isAlreadyPercent - If true, value is already a percentage (50 not 0.5)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercent(0.5, 'fr-FR')
 * // "50 %"
 *
 * formatPercent(50, 'en-US', {}, true)
 * // "50%"
 */
export function formatPercent(
  value: number,
  locale: string,
  options: PercentFormatterOptions = {},
  isAlreadyPercent = false
): string {
  const fullLocale = normalizeLocale(locale);

  // Convert to decimal if needed
  const decimalValue = isAlreadyPercent ? value / 100 : value;

  const formatOptions: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    signDisplay: options.signDisplay,
  };

  return new Intl.NumberFormat(fullLocale, formatOptions).format(decimalValue);
}

/**
 * Format a number in compact notation (1K, 1M, etc.)
 *
 * @param value - Number to format
 * @param locale - Locale code
 * @param display - 'short' (1K) or 'long' (1 thousand)
 * @returns Formatted compact number
 *
 * @example
 * formatCompact(1234567, 'en-US', 'short')
 * // "1.2M"
 *
 * formatCompact(1234567, 'fr-FR', 'short')
 * // "1,2 M"
 *
 * formatCompact(1234567, 'en-US', 'long')
 * // "1.2 million"
 */
export function formatCompact(
  value: number,
  locale: string,
  display: CompactDisplay = 'short'
): string {
  const fullLocale = normalizeLocale(locale);

  return new Intl.NumberFormat(fullLocale, {
    notation: 'compact',
    compactDisplay: display,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Format a number as ordinal (1st, 2nd, 3rd, etc.)
 * Note: Limited support in Intl, provides basic implementation for common locales
 *
 * @param value - Number to format
 * @param locale - Locale code
 * @returns Formatted ordinal
 *
 * @example
 * formatOrdinal(1, 'en-US')
 * // "1st"
 *
 * formatOrdinal(1, 'fr-FR')
 * // "1er"
 */
export function formatOrdinal(value: number, locale: string): string {
  const fullLocale = normalizeLocale(locale);
  const num = Math.round(value);

  // Try to use PluralRules for languages that support ordinal
  try {
    const pr = new Intl.PluralRules(fullLocale, { type: 'ordinal' });
    const rule = pr.select(num);

    // Get language code
    const lang = fullLocale.split('-')[0];

    // Ordinal suffixes by language
    const suffixes: Record<string, Record<string, string>> = {
      en: { one: 'st', two: 'nd', few: 'rd', other: 'th' },
      fr: { one: 'er', other: 'e' },
      de: { other: '.' },
      es: { one: '.o', other: '.o' },
      it: { one: '.o', other: '.o' },
      ar: { other: '' },
      nl: { other: 'e' },
    };

    const langSuffixes = lang && suffixes[lang] ? suffixes[lang] : suffixes['en'];
    const suffix = langSuffixes?.[rule] ?? langSuffixes?.['other'] ?? '';

    return `${num}${suffix}`;
  } catch {
    return `${num}`;
  }
}

/**
 * Format a file size
 *
 * @param bytes - Size in bytes
 * @param locale - Locale code
 * @param useSI - Use SI units (1000) instead of binary (1024)
 * @returns Formatted size string
 *
 * @example
 * formatFileSize(1536, 'en-US')
 * // "1.5 KB"
 */
export function formatFileSize(bytes: number, locale: string, useSI = true): string {
  const fullLocale = normalizeLocale(locale);
  const thresh = useSI ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return `${bytes} B`;
  }

  const units = useSI
    ? ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

  let u = -1;
  let size = bytes;

  do {
    size /= thresh;
    ++u;
  } while (Math.abs(size) >= thresh && u < units.length - 1);

  const formatted = new Intl.NumberFormat(fullLocale, {
    maximumFractionDigits: 1,
  }).format(size);

  return `${formatted} ${units[u]}`;
}

/**
 * Get locale-specific decimal separator
 *
 * @param locale - Locale code
 * @returns Decimal separator character
 *
 * @example
 * getDecimalSeparator('fr-FR')
 * // ","
 */
export function getDecimalSeparator(locale: string): string {
  const config = getLocaleConfig(locale);
  return config.number.decimalSeparator;
}

/**
 * Get locale-specific thousands separator
 *
 * @param locale - Locale code
 * @returns Thousands separator character
 *
 * @example
 * getThousandsSeparator('fr-FR')
 * // " " (non-breaking space)
 */
export function getThousandsSeparator(locale: string): string {
  const config = getLocaleConfig(locale);
  return config.number.thousandsSeparator;
}

/**
 * Parse a locale-formatted number string to a number
 *
 * @param value - Formatted number string
 * @param locale - Locale code
 * @returns Parsed number or NaN if invalid
 *
 * @example
 * parseNumber("1 234,56", 'fr-FR')
 * // 1234.56
 */
export function parseNumber(value: string, locale: string): number {
  const config = getLocaleConfig(locale);

  // Remove thousands separators
  let cleaned = value;

  // Handle different thousands separators
  if (config.number.thousandsSeparator === ' ') {
    cleaned = cleaned.replace(/[\s\u00A0]/g, ''); // Regular and non-breaking space
  } else if (config.number.thousandsSeparator === '.') {
    cleaned = cleaned.replace(/\./g, '');
  } else if (config.number.thousandsSeparator === ',') {
    cleaned = cleaned.replace(/,/g, '');
  } else if (config.number.thousandsSeparator === "'") {
    cleaned = cleaned.replace(/'/g, '');
  }

  // Replace decimal separator with dot
  if (config.number.decimalSeparator === ',') {
    cleaned = cleaned.replace(',', '.');
  }

  // Remove any remaining non-numeric characters except dot and minus
  cleaned = cleaned.replace(/[^\d.-]/g, '');

  return parseFloat(cleaned);
}

/**
 * Format a number with unit
 *
 * @param value - Number to format
 * @param unit - Unit type (e.g., 'kilometer', 'kilogram', 'celsius')
 * @param locale - Locale code
 * @param style - 'narrow', 'short', or 'long'
 * @returns Formatted number with unit
 *
 * @example
 * formatUnit(5, 'kilometer', 'fr-FR', 'short')
 * // "5 km"
 */
export function formatUnit(
  value: number,
  unit: Intl.NumberFormatOptions['unit'],
  locale: string,
  style: 'narrow' | 'short' | 'long' = 'short'
): string {
  const fullLocale = normalizeLocale(locale);

  try {
    return new Intl.NumberFormat(fullLocale, {
      style: 'unit',
      unit,
      unitDisplay: style,
    }).format(value);
  } catch {
    // Fallback for unsupported units
    return `${formatNumber(value, locale)} ${unit}`;
  }
}

/**
 * Format a range of numbers
 *
 * @param start - Start of range
 * @param end - End of range
 * @param locale - Locale code
 * @param options - Formatting options
 * @returns Formatted range string
 *
 * @example
 * formatNumberRange(100, 200, 'fr-FR')
 * // "100 - 200"
 */
export function formatNumberRange(
  start: number,
  end: number,
  locale: string,
  options: NumberFormatterOptions = {}
): string {
  const fullLocale = normalizeLocale(locale);

  const formatOptions: Intl.NumberFormatOptions = {
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    useGrouping: options.useGrouping ?? true,
  };

  try {
    const formatter = new Intl.NumberFormat(fullLocale, formatOptions);
    if ('formatRange' in formatter) {
      return (
        formatter as Intl.NumberFormat & {
          formatRange(start: number, end: number): string;
        }
      ).formatRange(start, end);
    }
  } catch {
    // Fall through to manual format
  }

  // Fallback
  const formatter = new Intl.NumberFormat(fullLocale, formatOptions);
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

/**
 * Clamp a number between min and max values
 *
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round a number to specified decimal places
 *
 * @param value - Value to round
 * @param decimals - Number of decimal places
 * @returns Rounded value
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
