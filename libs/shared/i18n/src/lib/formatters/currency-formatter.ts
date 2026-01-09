/**
 * Currency Formatter
 *
 * Locale-aware currency formatting utilities.
 * Handles symbol position, decimal places, and display styles.
 */

import { getLocaleConfig, normalizeLocale } from './locale-config';

/**
 * Currency display style
 */
export type CurrencyDisplay = 'symbol' | 'narrowSymbol' | 'code' | 'name';

/**
 * Currency sign display mode
 */
export type CurrencySign = 'standard' | 'accounting';

/**
 * Currency format options
 */
export interface CurrencyFormatterOptions {
  /** Currency code (e.g., 'EUR', 'USD') */
  currency?: string;
  /** Display style */
  display?: CurrencyDisplay;
  /** Sign mode for negative values */
  sign?: CurrencySign;
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Use grouping (thousands separators) */
  useGrouping?: boolean;
}

/**
 * Common currency configurations
 */
export interface CurrencyConfig {
  /** Currency code (ISO 4217) */
  code: string;
  /** Currency symbol */
  symbol: string;
  /** Narrow symbol (shorter version) */
  narrowSymbol: string;
  /** Standard decimal places */
  decimals: number;
  /** Currency name in English */
  name: string;
}

/**
 * Common currency definitions
 */
export const currencies: Record<string, CurrencyConfig> = {
  EUR: {
    code: 'EUR',
    symbol: '\u20AC',
    narrowSymbol: '\u20AC',
    decimals: 2,
    name: 'Euro',
  },
  USD: {
    code: 'USD',
    symbol: 'US$',
    narrowSymbol: '$',
    decimals: 2,
    name: 'US Dollar',
  },
  GBP: {
    code: 'GBP',
    symbol: '\u00A3',
    narrowSymbol: '\u00A3',
    decimals: 2,
    name: 'British Pound',
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    narrowSymbol: 'CHF',
    decimals: 2,
    name: 'Swiss Franc',
  },
  JPY: {
    code: 'JPY',
    symbol: '\u00A5',
    narrowSymbol: '\u00A5',
    decimals: 0,
    name: 'Japanese Yen',
  },
  SAR: {
    code: 'SAR',
    symbol: 'SAR',
    narrowSymbol: '\uFDFC',
    decimals: 2,
    name: 'Saudi Riyal',
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    narrowSymbol: '$',
    decimals: 2,
    name: 'Canadian Dollar',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    narrowSymbol: '$',
    decimals: 2,
    name: 'Australian Dollar',
  },
  CNY: {
    code: 'CNY',
    symbol: 'CN\u00A5',
    narrowSymbol: '\u00A5',
    decimals: 2,
    name: 'Chinese Yuan',
  },
  INR: {
    code: 'INR',
    symbol: '\u20B9',
    narrowSymbol: '\u20B9',
    decimals: 2,
    name: 'Indian Rupee',
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    narrowSymbol: 'R$',
    decimals: 2,
    name: 'Brazilian Real',
  },
  MXN: {
    code: 'MXN',
    symbol: 'MX$',
    narrowSymbol: '$',
    decimals: 2,
    name: 'Mexican Peso',
  },
};

/**
 * Get default currency for a locale
 *
 * @param locale - Locale code
 * @returns Default currency code
 */
export function getDefaultCurrency(locale: string): string {
  const config = getLocaleConfig(locale);
  return config.currency.defaultCurrency;
}

/**
 * Get currency configuration
 *
 * @param currencyCode - Currency code (e.g., 'EUR')
 * @returns Currency configuration or undefined
 */
export function getCurrencyConfig(currencyCode: string): CurrencyConfig | undefined {
  return currencies[currencyCode.toUpperCase()];
}

/**
 * Get decimal places for a currency
 *
 * @param currencyCode - Currency code
 * @returns Number of decimal places
 */
export function getCurrencyDecimals(currencyCode: string): number {
  const config = getCurrencyConfig(currencyCode);
  return config?.decimals ?? 2;
}

/**
 * Format a currency amount
 *
 * @param amount - Amount to format
 * @param locale - Locale code
 * @param options - Formatting options
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56, 'fr-FR')
 * // "1 234,56 EUR"
 *
 * formatCurrency(1234.56, 'en-US', { currency: 'USD' })
 * // "$1,234.56"
 *
 * formatCurrency(1234.56, 'de-DE', { currency: 'EUR', display: 'code' })
 * // "1.234,56 EUR"
 */
export function formatCurrency(
  amount: number,
  locale: string,
  options: CurrencyFormatterOptions = {}
): string {
  const fullLocale = normalizeLocale(locale);
  const localeConfig = getLocaleConfig(locale);
  const currency = options.currency || localeConfig.currency.defaultCurrency;
  const currencyConfig = getCurrencyConfig(currency);

  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    currencyDisplay: options.display || 'symbol',
    currencySign: options.sign || 'standard',
    minimumFractionDigits: options.minimumFractionDigits ?? currencyConfig?.decimals ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? currencyConfig?.decimals ?? 2,
    useGrouping: options.useGrouping ?? true,
  };

  return new Intl.NumberFormat(fullLocale, formatOptions).format(amount);
}

/**
 * Format a currency amount with narrow symbol
 *
 * @param amount - Amount to format
 * @param locale - Locale code
 * @param currency - Currency code
 * @returns Formatted currency string with narrow symbol
 *
 * @example
 * formatCurrencyNarrow(1234.56, 'en-US', 'USD')
 * // "$1,234.56"
 */
export function formatCurrencyNarrow(amount: number, locale: string, currency?: string): string {
  return formatCurrency(amount, locale, {
    currency,
    display: 'narrowSymbol',
  });
}

/**
 * Format a currency amount with currency code
 *
 * @param amount - Amount to format
 * @param locale - Locale code
 * @param currency - Currency code
 * @returns Formatted currency string with code
 *
 * @example
 * formatCurrencyCode(1234.56, 'fr-FR', 'EUR')
 * // "1 234,56 EUR"
 */
export function formatCurrencyCode(amount: number, locale: string, currency?: string): string {
  return formatCurrency(amount, locale, {
    currency,
    display: 'code',
  });
}

/**
 * Format a currency amount with full name
 *
 * @param amount - Amount to format
 * @param locale - Locale code
 * @param currency - Currency code
 * @returns Formatted currency string with full name
 *
 * @example
 * formatCurrencyName(1234.56, 'fr-FR', 'EUR')
 * // "1 234,56 euros"
 */
export function formatCurrencyName(amount: number, locale: string, currency?: string): string {
  return formatCurrency(amount, locale, {
    currency,
    display: 'name',
  });
}

/**
 * Format a currency amount in compact notation
 *
 * @param amount - Amount to format
 * @param locale - Locale code
 * @param currency - Currency code
 * @returns Formatted compact currency string
 *
 * @example
 * formatCurrencyCompact(1234567, 'en-US', 'USD')
 * // "$1.2M"
 */
export function formatCurrencyCompact(amount: number, locale: string, currency?: string): string {
  const fullLocale = normalizeLocale(locale);
  const localeConfig = getLocaleConfig(locale);
  const curr = currency || localeConfig.currency.defaultCurrency;

  return new Intl.NumberFormat(fullLocale, {
    style: 'currency',
    currency: curr,
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * Format a currency range
 *
 * @param minAmount - Minimum amount
 * @param maxAmount - Maximum amount
 * @param locale - Locale code
 * @param currency - Currency code
 * @returns Formatted currency range
 *
 * @example
 * formatCurrencyRange(100, 500, 'fr-FR', 'EUR')
 * // "100,00 EUR - 500,00 EUR"
 */
export function formatCurrencyRange(
  minAmount: number,
  maxAmount: number,
  locale: string,
  currency?: string
): string {
  const fullLocale = normalizeLocale(locale);
  const localeConfig = getLocaleConfig(locale);
  const curr = currency || localeConfig.currency.defaultCurrency;
  const currencyConfig = getCurrencyConfig(curr);

  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: currencyConfig?.decimals ?? 2,
    maximumFractionDigits: currencyConfig?.decimals ?? 2,
  };

  try {
    const formatter = new Intl.NumberFormat(fullLocale, formatOptions);
    if ('formatRange' in formatter) {
      return (
        formatter as Intl.NumberFormat & {
          formatRange(start: number, end: number): string;
        }
      ).formatRange(minAmount, maxAmount);
    }
  } catch {
    // Fall through to manual format
  }

  // Fallback
  const formatter = new Intl.NumberFormat(fullLocale, formatOptions);
  return `${formatter.format(minAmount)} - ${formatter.format(maxAmount)}`;
}

/**
 * Format amount with currency symbol only (no code)
 *
 * @param amount - Amount to format
 * @param locale - Locale code
 * @param currency - Currency code
 * @returns Formatted string with symbol
 */
export function formatWithSymbol(amount: number, locale: string, currency?: string): string {
  return formatCurrency(amount, locale, {
    currency,
    display: 'symbol',
  });
}

/**
 * Parse a currency string to number
 *
 * @param value - Formatted currency string
 * @param locale - Locale code
 * @returns Parsed amount or NaN if invalid
 *
 * @example
 * parseCurrency("1 234,56 EUR", 'fr-FR')
 * // 1234.56
 */
export function parseCurrency(value: string, locale: string): number {
  const config = getLocaleConfig(locale);

  // Remove currency symbols and codes
  let cleaned = value.replace(/[A-Z]{3}/g, ''); // Remove currency codes
  cleaned = cleaned.replace(/[$\u00A3\u20AC\u00A5\uFDFC\u20B9]/g, ''); // Remove common symbols
  cleaned = cleaned.trim();

  // Remove thousands separators
  if (config.number.thousandsSeparator === ' ') {
    cleaned = cleaned.replace(/[\s\u00A0]/g, '');
  } else if (config.number.thousandsSeparator === '.') {
    cleaned = cleaned.replace(/\./g, '');
  } else if (config.number.thousandsSeparator === ',') {
    // Only remove commas if decimal separator is different
    if (config.number.decimalSeparator !== ',') {
      cleaned = cleaned.replace(/,/g, '');
    }
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
 * Check if an amount is negative
 */
export function isNegativeAmount(amount: number): boolean {
  return amount < 0;
}

/**
 * Format accounting style (negative in parentheses)
 *
 * @param amount - Amount to format
 * @param locale - Locale code
 * @param currency - Currency code
 * @returns Formatted amount in accounting style
 *
 * @example
 * formatAccountingCurrency(-1234.56, 'en-US', 'USD')
 * // "($1,234.56)"
 */
export function formatAccountingCurrency(
  amount: number,
  locale: string,
  currency?: string
): string {
  return formatCurrency(amount, locale, {
    currency,
    sign: 'accounting',
  });
}

/**
 * Convert amount between currencies (using a rate)
 * Note: This is a simple converter, use a real exchange rate API for production
 *
 * @param amount - Amount to convert
 * @param rate - Exchange rate (target/source)
 * @param targetCurrency - Target currency code
 * @returns Converted amount rounded to currency decimals
 */
export function convertCurrency(amount: number, rate: number, targetCurrency: string): number {
  const decimals = getCurrencyDecimals(targetCurrency);
  const converted = amount * rate;
  const factor = Math.pow(10, decimals);
  return Math.round(converted * factor) / factor;
}

/**
 * Get currency symbol
 *
 * @param currencyCode - Currency code
 * @param narrow - Use narrow symbol
 * @returns Currency symbol
 */
export function getCurrencySymbol(currencyCode: string, narrow = false): string {
  const config = getCurrencyConfig(currencyCode);
  if (!config) {
    return currencyCode;
  }
  return narrow ? config.narrowSymbol : config.symbol;
}

/**
 * Format price for display (shorthand for common use case)
 *
 * @param price - Price to format
 * @param locale - Locale code
 * @param currency - Currency code
 * @returns Formatted price string
 */
export function formatPrice(price: number, locale: string, currency?: string): string {
  return formatCurrency(price, locale, { currency });
}

/**
 * Format free price (shows "Free" or equivalent)
 *
 * @param price - Price to check
 * @param locale - Locale code
 * @param freeText - Text to show for free items
 * @param currency - Currency code
 * @returns "Free" text or formatted price
 */
export function formatPriceOrFree(
  price: number,
  locale: string,
  freeText = 'Free',
  currency?: string
): string {
  if (price === 0) {
    return freeText;
  }
  return formatCurrency(price, locale, { currency });
}

/**
 * Round to currency precision
 *
 * @param amount - Amount to round
 * @param currencyCode - Currency code
 * @returns Rounded amount
 */
export function roundToCurrencyPrecision(amount: number, currencyCode: string): number {
  const decimals = getCurrencyDecimals(currencyCode);
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}
