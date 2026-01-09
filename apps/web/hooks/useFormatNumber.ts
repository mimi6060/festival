/**
 * useFormatNumber Hook
 *
 * React hook for locale-aware number formatting in Next.js applications.
 * Uses the current locale from next-intl.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useLocale } from 'next-intl';
import {
  formatNumber as formatNumberFn,
  formatInteger as formatIntegerFn,
  formatDecimal as formatDecimalFn,
  formatPercent as formatPercentFn,
  formatCompact as formatCompactFn,
  formatOrdinal as formatOrdinalFn,
  formatFileSize as formatFileSizeFn,
  formatUnit as formatUnitFn,
  formatNumberRange as formatNumberRangeFn,
  parseNumber as parseNumberFn,
  getDecimalSeparator as getDecimalSeparatorFn,
  getThousandsSeparator as getThousandsSeparatorFn,
  clamp,
  roundTo,
  type NumberFormatterOptions,
  type CompactDisplay,
  type PercentFormatterOptions,
} from '@festival/shared/i18n';

/**
 * Return type for useFormatNumber hook
 */
export interface UseFormatNumberReturn {
  /** Current locale code */
  locale: string;

  /**
   * Format a number with locale conventions
   * @example formatNumber(1234567.89) // "1,234,567.89" (en-US) or "1 234 567,89" (fr-FR)
   */
  formatNumber: (value: number, options?: NumberFormatterOptions) => string;

  /**
   * Format an integer (no decimal places)
   * @example formatInteger(1234567) // "1,234,567"
   */
  formatInteger: (value: number, useGrouping?: boolean) => string;

  /**
   * Format a decimal with specific precision
   * @example formatDecimal(1234.5678, 2) // "1,234.57"
   */
  formatDecimal: (value: number, decimals?: number) => string;

  /**
   * Format a percentage
   * @example formatPercent(0.5) // "50%"
   */
  formatPercent: (
    value: number,
    options?: PercentFormatterOptions,
    isAlreadyPercent?: boolean
  ) => string;

  /**
   * Format in compact notation
   * @example formatCompact(1234567) // "1.2M"
   */
  formatCompact: (value: number, display?: CompactDisplay) => string;

  /**
   * Format as ordinal
   * @example formatOrdinal(1) // "1st"
   */
  formatOrdinal: (value: number) => string;

  /**
   * Format file size
   * @example formatFileSize(1536) // "1.5 KB"
   */
  formatFileSize: (bytes: number, useSI?: boolean) => string;

  /**
   * Format number with unit
   * @example formatUnit(5, 'kilometer') // "5 km"
   */
  formatUnit: (
    value: number,
    unit: Intl.NumberFormatOptions['unit'],
    style?: 'narrow' | 'short' | 'long'
  ) => string;

  /**
   * Format a range of numbers
   * @example formatRange(100, 200) // "100-200"
   */
  formatRange: (start: number, end: number, options?: NumberFormatterOptions) => string;

  /**
   * Parse a locale-formatted number string
   * @example parseNumber("1 234,56") // 1234.56 (for fr-FR)
   */
  parseNumber: (value: string) => number;

  /** Decimal separator for current locale */
  decimalSeparator: string;

  /** Thousands separator for current locale */
  thousandsSeparator: string;

  /** Clamp a number between min and max */
  clamp: (value: number, min: number, max: number) => number;

  /** Round to specific decimal places */
  roundTo: (value: number, decimals: number) => number;
}

/**
 * Hook for locale-aware number formatting
 *
 * @returns Number formatting utilities bound to current locale
 *
 * @example
 * ```tsx
 * function PriceDisplay({ price, discount }) {
 *   const { formatNumber, formatPercent, formatCompact } = useFormatNumber();
 *
 *   return (
 *     <div>
 *       <p>Price: {formatNumber(price)}</p>
 *       <p>Discount: {formatPercent(discount)}</p>
 *       <p>Total sold: {formatCompact(1234567)}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFormatNumber(): UseFormatNumberReturn {
  const locale = useLocale();

  const formatNumber = useCallback(
    (value: number, options?: NumberFormatterOptions) => formatNumberFn(value, locale, options),
    [locale]
  );

  const formatInteger = useCallback(
    (value: number, useGrouping = true) => formatIntegerFn(value, locale, useGrouping),
    [locale]
  );

  const formatDecimal = useCallback(
    (value: number, decimals = 2) => formatDecimalFn(value, locale, decimals),
    [locale]
  );

  const formatPercent = useCallback(
    (value: number, options?: PercentFormatterOptions, isAlreadyPercent = false) =>
      formatPercentFn(value, locale, options, isAlreadyPercent),
    [locale]
  );

  const formatCompact = useCallback(
    (value: number, display: CompactDisplay = 'short') => formatCompactFn(value, locale, display),
    [locale]
  );

  const formatOrdinal = useCallback((value: number) => formatOrdinalFn(value, locale), [locale]);

  const formatFileSize = useCallback(
    (bytes: number, useSI = true) => formatFileSizeFn(bytes, locale, useSI),
    [locale]
  );

  const formatUnit = useCallback(
    (
      value: number,
      unit: Intl.NumberFormatOptions['unit'],
      style: 'narrow' | 'short' | 'long' = 'short'
    ) => formatUnitFn(value, unit, locale, style),
    [locale]
  );

  const formatRange = useCallback(
    (start: number, end: number, options?: NumberFormatterOptions) =>
      formatNumberRangeFn(start, end, locale, options),
    [locale]
  );

  const parseNumber = useCallback((value: string) => parseNumberFn(value, locale), [locale]);

  const decimalSeparator = useMemo(() => getDecimalSeparatorFn(locale), [locale]);

  const thousandsSeparator = useMemo(() => getThousandsSeparatorFn(locale), [locale]);

  return {
    locale,
    formatNumber,
    formatInteger,
    formatDecimal,
    formatPercent,
    formatCompact,
    formatOrdinal,
    formatFileSize,
    formatUnit,
    formatRange,
    parseNumber,
    decimalSeparator,
    thousandsSeparator,
    clamp,
    roundTo,
  };
}

export default useFormatNumber;

// Re-export types for convenience
export type { NumberFormatterOptions, CompactDisplay, PercentFormatterOptions };
