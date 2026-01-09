/**
 * useFormatCurrency Hook
 *
 * React hook for locale-aware currency formatting in Next.js applications.
 * Uses the current locale from next-intl.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useLocale } from 'next-intl';
import {
  formatCurrency as formatCurrencyFn,
  formatCurrencyNarrow as formatCurrencyNarrowFn,
  formatCurrencyCode as formatCurrencyCodeFn,
  formatCurrencyName as formatCurrencyNameFn,
  formatCurrencyCompact as formatCurrencyCompactFn,
  formatCurrencyRange as formatCurrencyRangeFn,
  formatWithSymbol as formatWithSymbolFn,
  formatAccountingCurrency as formatAccountingCurrencyFn,
  formatPrice as formatPriceFn,
  formatPriceOrFree as formatPriceOrFreeFn,
  parseCurrency as parseCurrencyFn,
  getDefaultCurrency as getDefaultCurrencyFn,
  getCurrencySymbol as getCurrencySymbolFn,
  getCurrencyDecimals as getCurrencyDecimalsFn,
  getCurrencyConfig,
  convertCurrency,
  roundToCurrencyPrecision,
  currencies,
  type CurrencyFormatterOptions,
  type CurrencyDisplay,
  type CurrencySign,
  type CurrencyConfig,
} from '@festival/shared/i18n';

/**
 * Return type for useFormatCurrency hook
 */
export interface UseFormatCurrencyReturn {
  /** Current locale code */
  locale: string;

  /** Default currency for current locale */
  defaultCurrency: string;

  /**
   * Format a currency amount
   * @example formatCurrency(1234.56) // "$1,234.56" (en-US) or "1 234,56 EUR" (fr-FR)
   */
  formatCurrency: (amount: number, options?: CurrencyFormatterOptions) => string;

  /**
   * Format with narrow symbol
   * @example formatNarrow(1234.56, 'USD') // "$1,234.56"
   */
  formatNarrow: (amount: number, currency?: string) => string;

  /**
   * Format with currency code
   * @example formatCode(1234.56, 'EUR') // "1,234.56 EUR"
   */
  formatCode: (amount: number, currency?: string) => string;

  /**
   * Format with currency name
   * @example formatName(1234.56, 'EUR') // "1,234.56 euros"
   */
  formatName: (amount: number, currency?: string) => string;

  /**
   * Format in compact notation
   * @example formatCompact(1234567, 'USD') // "$1.2M"
   */
  formatCompact: (amount: number, currency?: string) => string;

  /**
   * Format a currency range
   * @example formatRange(100, 500, 'EUR') // "100,00 EUR - 500,00 EUR"
   */
  formatRange: (minAmount: number, maxAmount: number, currency?: string) => string;

  /**
   * Format with symbol only (default behavior)
   * @example formatWithSymbol(1234.56, 'USD') // "$1,234.56"
   */
  formatWithSymbol: (amount: number, currency?: string) => string;

  /**
   * Format in accounting style (negatives in parentheses)
   * @example formatAccounting(-1234.56, 'USD') // "($1,234.56)"
   */
  formatAccounting: (amount: number, currency?: string) => string;

  /**
   * Format price (shorthand)
   * @example formatPrice(1234.56) // "$1,234.56"
   */
  formatPrice: (price: number, currency?: string) => string;

  /**
   * Format price or show "Free"
   * @example formatPriceOrFree(0, 'Free') // "Free"
   */
  formatPriceOrFree: (price: number, freeText?: string, currency?: string) => string;

  /**
   * Parse a formatted currency string
   * @example parseCurrency("$1,234.56") // 1234.56
   */
  parseCurrency: (value: string) => number;

  /**
   * Get currency symbol
   * @example getCurrencySymbol('EUR', true) // "\u20AC"
   */
  getCurrencySymbol: (currencyCode: string, narrow?: boolean) => string;

  /**
   * Get decimal places for a currency
   * @example getCurrencyDecimals('JPY') // 0
   */
  getCurrencyDecimals: (currencyCode: string) => number;

  /**
   * Get currency configuration
   */
  getCurrencyConfig: (currencyCode: string) => CurrencyConfig | undefined;

  /**
   * Convert amount between currencies using a rate
   */
  convertCurrency: (amount: number, rate: number, targetCurrency: string) => number;

  /**
   * Round to currency precision
   */
  roundToCurrencyPrecision: (amount: number, currencyCode: string) => number;

  /** Available currency configurations */
  currencies: Record<string, CurrencyConfig>;
}

/**
 * Hook for locale-aware currency formatting
 *
 * @returns Currency formatting utilities bound to current locale
 *
 * @example
 * ```tsx
 * function TicketPrice({ ticket }) {
 *   const {
 *     formatCurrency,
 *     formatPriceOrFree,
 *     formatCompact,
 *     defaultCurrency
 *   } = useFormatCurrency();
 *
 *   return (
 *     <div>
 *       <p>Price: {formatPriceOrFree(ticket.price, 'Free entry')}</p>
 *       <p>Revenue: {formatCompact(ticket.totalRevenue)}</p>
 *       <p>Currency: {defaultCurrency}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFormatCurrency(): UseFormatCurrencyReturn {
  const locale = useLocale();

  const defaultCurrency = useMemo(() => getDefaultCurrencyFn(locale), [locale]);

  const formatCurrency = useCallback(
    (amount: number, options?: CurrencyFormatterOptions) =>
      formatCurrencyFn(amount, locale, options),
    [locale]
  );

  const formatNarrow = useCallback(
    (amount: number, currency?: string) => formatCurrencyNarrowFn(amount, locale, currency),
    [locale]
  );

  const formatCode = useCallback(
    (amount: number, currency?: string) => formatCurrencyCodeFn(amount, locale, currency),
    [locale]
  );

  const formatName = useCallback(
    (amount: number, currency?: string) => formatCurrencyNameFn(amount, locale, currency),
    [locale]
  );

  const formatCompact = useCallback(
    (amount: number, currency?: string) => formatCurrencyCompactFn(amount, locale, currency),
    [locale]
  );

  const formatRange = useCallback(
    (minAmount: number, maxAmount: number, currency?: string) =>
      formatCurrencyRangeFn(minAmount, maxAmount, locale, currency),
    [locale]
  );

  const formatWithSymbol = useCallback(
    (amount: number, currency?: string) => formatWithSymbolFn(amount, locale, currency),
    [locale]
  );

  const formatAccounting = useCallback(
    (amount: number, currency?: string) => formatAccountingCurrencyFn(amount, locale, currency),
    [locale]
  );

  const formatPrice = useCallback(
    (price: number, currency?: string) => formatPriceFn(price, locale, currency),
    [locale]
  );

  const formatPriceOrFree = useCallback(
    (price: number, freeText = 'Free', currency?: string) =>
      formatPriceOrFreeFn(price, locale, freeText, currency),
    [locale]
  );

  const parseCurrency = useCallback((value: string) => parseCurrencyFn(value, locale), [locale]);

  const getCurrencySymbol = useCallback(
    (currencyCode: string, narrow = false) => getCurrencySymbolFn(currencyCode, narrow),
    []
  );

  const getCurrencyDecimals = useCallback(
    (currencyCode: string) => getCurrencyDecimalsFn(currencyCode),
    []
  );

  return {
    locale,
    defaultCurrency,
    formatCurrency,
    formatNarrow,
    formatCode,
    formatName,
    formatCompact,
    formatRange,
    formatWithSymbol,
    formatAccounting,
    formatPrice,
    formatPriceOrFree,
    parseCurrency,
    getCurrencySymbol,
    getCurrencyDecimals,
    getCurrencyConfig,
    convertCurrency,
    roundToCurrencyPrecision,
    currencies,
  };
}

export default useFormatCurrency;

// Re-export types for convenience
export type { CurrencyFormatterOptions, CurrencyDisplay, CurrencySign, CurrencyConfig };
