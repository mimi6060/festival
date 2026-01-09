/**
 * Locale-Aware Formatters
 *
 * A comprehensive formatting library for dates, numbers, currencies, and relative time.
 * Supports multiple locales with proper formatting conventions.
 */

// Locale configuration
export {
  type FormatLocale,
  type ShortLocale,
  type DateFormatConfig,
  type NumberFormatConfig,
  type CurrencyFormatConfig,
  type LocaleFormatConfig,
  localeFormatConfigs,
  shortToFullLocale,
  getLocaleConfig,
  normalizeLocale,
  isRTLLocale,
  getSupportedLocales,
  isLocaleSupported,
} from './locale-config';

// Date formatting
export {
  type DateFormatStyle,
  type TimeFormatStyle,
  type DateFormatterOptions,
  formatDate,
  formatTime,
  formatDateTime,
  formatDayOfWeek,
  formatMonth,
  formatYear,
  getFirstDayOfWeek,
  is12HourFormat,
  getWeekDays,
  getMonths,
  formatDateRange,
  formatTimeRange,
  parseLocaleDateString,
  isToday,
  isTomorrow,
  isYesterday,
} from './date-formatter';

// Number formatting
export {
  type NumberFormatterOptions,
  type CompactDisplay,
  type PercentFormatterOptions,
  formatNumber,
  formatInteger,
  formatDecimal,
  formatPercent,
  formatCompact,
  formatOrdinal,
  formatFileSize,
  getDecimalSeparator,
  getThousandsSeparator,
  parseNumber,
  formatUnit,
  formatNumberRange,
  clamp,
  roundTo,
} from './number-formatter';

// Currency formatting
export {
  type CurrencyDisplay,
  type CurrencySign,
  type CurrencyFormatterOptions,
  type CurrencyConfig,
  currencies,
  getDefaultCurrency,
  getCurrencyConfig,
  getCurrencyDecimals,
  formatCurrency,
  formatCurrencyNarrow,
  formatCurrencyCode,
  formatCurrencyName,
  formatCurrencyCompact,
  formatCurrencyRange,
  formatWithSymbol,
  parseCurrency,
  isNegativeAmount,
  formatAccountingCurrency,
  convertCurrency,
  getCurrencySymbol,
  formatPrice,
  formatPriceOrFree,
  roundToCurrencyPrecision,
} from './currency-formatter';

// Relative time formatting
export {
  type RelativeTimeUnit,
  type RelativeTimeNumeric,
  type RelativeTimeStyle,
  type RelativeTimeOptions,
  formatRelativeTime,
  formatRelativeTimeUnit,
  formatTimeAgo,
  formatTimeUntil,
  formatDuration,
  getCountdown,
  formatHumanCountdown,
  isWithin,
  isRecent,
  isUpcoming,
  formatSmartRelativeTime,
} from './relative-time';
