/**
 * useFormatNumber Hook
 *
 * React Native hook for locale-aware number formatting.
 * Uses the language setting from the settings store.
 */

import { useCallback, useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';
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
 * Hook for locale-aware number formatting in React Native
 *
 * @returns Number formatting utilities bound to current locale
 *
 * @example
 * ```tsx
 * function StatsDisplay({ stats }) {
 *   const { formatNumber, formatPercent, formatCompact } = useFormatNumber();
 *
 *   return (
 *     <View>
 *       <Text>Tickets sold: {formatCompact(stats.ticketsSold)}</Text>
 *       <Text>Occupancy: {formatPercent(stats.occupancy)}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useFormatNumber(): UseFormatNumberReturn {
  const language = useSettingsStore((state) => state.language);

  const formatNumber = useCallback(
    (value: number, options?: NumberFormatterOptions) => formatNumberFn(value, language, options),
    [language]
  );

  const formatInteger = useCallback(
    (value: number, useGrouping = true) => formatIntegerFn(value, language, useGrouping),
    [language]
  );

  const formatDecimal = useCallback(
    (value: number, decimals = 2) => formatDecimalFn(value, language, decimals),
    [language]
  );

  const formatPercent = useCallback(
    (value: number, options?: PercentFormatterOptions, isAlreadyPercent = false) =>
      formatPercentFn(value, language, options, isAlreadyPercent),
    [language]
  );

  const formatCompact = useCallback(
    (value: number, display: CompactDisplay = 'short') => formatCompactFn(value, language, display),
    [language]
  );

  const formatOrdinal = useCallback(
    (value: number) => formatOrdinalFn(value, language),
    [language]
  );

  const formatFileSize = useCallback(
    (bytes: number, useSI = true) => formatFileSizeFn(bytes, language, useSI),
    [language]
  );

  const formatUnit = useCallback(
    (
      value: number,
      unit: Intl.NumberFormatOptions['unit'],
      style: 'narrow' | 'short' | 'long' = 'short'
    ) => formatUnitFn(value, unit, language, style),
    [language]
  );

  const formatRange = useCallback(
    (start: number, end: number, options?: NumberFormatterOptions) =>
      formatNumberRangeFn(start, end, language, options),
    [language]
  );

  const parseNumber = useCallback((value: string) => parseNumberFn(value, language), [language]);

  const decimalSeparator = useMemo(() => getDecimalSeparatorFn(language), [language]);

  const thousandsSeparator = useMemo(() => getThousandsSeparatorFn(language), [language]);

  return {
    locale: language,
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
