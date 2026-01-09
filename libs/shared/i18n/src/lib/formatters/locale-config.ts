/**
 * Locale Configuration for Formatting
 *
 * Defines format preferences per locale for dates, numbers, and currencies.
 * Supports: fr-FR, en-US, en-GB, de-DE, es-ES, it-IT, ar-SA
 */

/**
 * Supported locale codes with regional variants
 */
export type FormatLocale =
  | 'fr-FR'
  | 'en-US'
  | 'en-GB'
  | 'de-DE'
  | 'es-ES'
  | 'it-IT'
  | 'ar-SA'
  | 'nl-NL';

/**
 * Short locale codes (without region)
 */
export type ShortLocale = 'fr' | 'en' | 'de' | 'es' | 'it' | 'ar' | 'nl';

/**
 * Date format configuration
 */
export interface DateFormatConfig {
  /** Short date format pattern description */
  shortDate: string;
  /** Long date format pattern description */
  longDate: string;
  /** Time format (12h or 24h) */
  timeFormat: '12h' | '24h';
  /** First day of week (0 = Sunday, 1 = Monday) */
  firstDayOfWeek: 0 | 1 | 6;
  /** Date order preference */
  dateOrder: 'DMY' | 'MDY' | 'YMD';
  /** Date separator */
  dateSeparator: '/' | '.' | '-';
}

/**
 * Number format configuration
 */
export interface NumberFormatConfig {
  /** Decimal separator */
  decimalSeparator: '.' | ',';
  /** Thousands separator */
  thousandsSeparator: ',' | '.' | ' ' | "'";
  /** Decimal places for general numbers */
  defaultDecimals: number;
}

/**
 * Currency format configuration
 */
export interface CurrencyFormatConfig {
  /** Default currency code */
  defaultCurrency: string;
  /** Symbol position relative to amount */
  symbolPosition: 'before' | 'after';
  /** Space between symbol and amount */
  symbolSpace: boolean;
  /** Decimal places for currency */
  currencyDecimals: number;
  /** Negative format style */
  negativeFormat: 'minus' | 'parentheses';
}

/**
 * Complete locale format configuration
 */
export interface LocaleFormatConfig {
  /** Full locale code (e.g., 'fr-FR') */
  locale: FormatLocale;
  /** Short locale code (e.g., 'fr') */
  shortLocale: ShortLocale;
  /** Text direction */
  direction: 'ltr' | 'rtl';
  /** Native name of the language */
  nativeName: string;
  /** Date formatting preferences */
  date: DateFormatConfig;
  /** Number formatting preferences */
  number: NumberFormatConfig;
  /** Currency formatting preferences */
  currency: CurrencyFormatConfig;
}

/**
 * Format configurations for each supported locale
 */
export const localeFormatConfigs: Record<FormatLocale, LocaleFormatConfig> = {
  'fr-FR': {
    locale: 'fr-FR',
    shortLocale: 'fr',
    direction: 'ltr',
    nativeName: 'Francais',
    date: {
      shortDate: 'DD/MM/YYYY',
      longDate: 'D MMMM YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      dateOrder: 'DMY',
      dateSeparator: '/',
    },
    number: {
      decimalSeparator: ',',
      thousandsSeparator: ' ',
      defaultDecimals: 2,
    },
    currency: {
      defaultCurrency: 'EUR',
      symbolPosition: 'after',
      symbolSpace: true,
      currencyDecimals: 2,
      negativeFormat: 'minus',
    },
  },

  'en-US': {
    locale: 'en-US',
    shortLocale: 'en',
    direction: 'ltr',
    nativeName: 'English (US)',
    date: {
      shortDate: 'MM/DD/YYYY',
      longDate: 'MMMM D, YYYY',
      timeFormat: '12h',
      firstDayOfWeek: 0,
      dateOrder: 'MDY',
      dateSeparator: '/',
    },
    number: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      defaultDecimals: 2,
    },
    currency: {
      defaultCurrency: 'USD',
      symbolPosition: 'before',
      symbolSpace: false,
      currencyDecimals: 2,
      negativeFormat: 'minus',
    },
  },

  'en-GB': {
    locale: 'en-GB',
    shortLocale: 'en',
    direction: 'ltr',
    nativeName: 'English (UK)',
    date: {
      shortDate: 'DD/MM/YYYY',
      longDate: 'D MMMM YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      dateOrder: 'DMY',
      dateSeparator: '/',
    },
    number: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      defaultDecimals: 2,
    },
    currency: {
      defaultCurrency: 'GBP',
      symbolPosition: 'before',
      symbolSpace: false,
      currencyDecimals: 2,
      negativeFormat: 'minus',
    },
  },

  'de-DE': {
    locale: 'de-DE',
    shortLocale: 'de',
    direction: 'ltr',
    nativeName: 'Deutsch',
    date: {
      shortDate: 'DD.MM.YYYY',
      longDate: 'D. MMMM YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      dateOrder: 'DMY',
      dateSeparator: '.',
    },
    number: {
      decimalSeparator: ',',
      thousandsSeparator: '.',
      defaultDecimals: 2,
    },
    currency: {
      defaultCurrency: 'EUR',
      symbolPosition: 'after',
      symbolSpace: true,
      currencyDecimals: 2,
      negativeFormat: 'minus',
    },
  },

  'es-ES': {
    locale: 'es-ES',
    shortLocale: 'es',
    direction: 'ltr',
    nativeName: 'Espanol',
    date: {
      shortDate: 'DD/MM/YYYY',
      longDate: 'D de MMMM de YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      dateOrder: 'DMY',
      dateSeparator: '/',
    },
    number: {
      decimalSeparator: ',',
      thousandsSeparator: '.',
      defaultDecimals: 2,
    },
    currency: {
      defaultCurrency: 'EUR',
      symbolPosition: 'after',
      symbolSpace: true,
      currencyDecimals: 2,
      negativeFormat: 'minus',
    },
  },

  'it-IT': {
    locale: 'it-IT',
    shortLocale: 'it',
    direction: 'ltr',
    nativeName: 'Italiano',
    date: {
      shortDate: 'DD/MM/YYYY',
      longDate: 'D MMMM YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      dateOrder: 'DMY',
      dateSeparator: '/',
    },
    number: {
      decimalSeparator: ',',
      thousandsSeparator: '.',
      defaultDecimals: 2,
    },
    currency: {
      defaultCurrency: 'EUR',
      symbolPosition: 'after',
      symbolSpace: true,
      currencyDecimals: 2,
      negativeFormat: 'minus',
    },
  },

  'ar-SA': {
    locale: 'ar-SA',
    shortLocale: 'ar',
    direction: 'rtl',
    nativeName: 'العربية',
    date: {
      shortDate: 'DD/MM/YYYY',
      longDate: 'D MMMM YYYY',
      timeFormat: '12h',
      firstDayOfWeek: 6,
      dateOrder: 'DMY',
      dateSeparator: '/',
    },
    number: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      defaultDecimals: 2,
    },
    currency: {
      defaultCurrency: 'SAR',
      symbolPosition: 'after',
      symbolSpace: true,
      currencyDecimals: 2,
      negativeFormat: 'minus',
    },
  },

  'nl-NL': {
    locale: 'nl-NL',
    shortLocale: 'nl',
    direction: 'ltr',
    nativeName: 'Nederlands',
    date: {
      shortDate: 'DD-MM-YYYY',
      longDate: 'D MMMM YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      dateOrder: 'DMY',
      dateSeparator: '-',
    },
    number: {
      decimalSeparator: ',',
      thousandsSeparator: '.',
      defaultDecimals: 2,
    },
    currency: {
      defaultCurrency: 'EUR',
      symbolPosition: 'before',
      symbolSpace: true,
      currencyDecimals: 2,
      negativeFormat: 'minus',
    },
  },
};

/**
 * Map short locale codes to full locale codes
 */
export const shortToFullLocale: Record<ShortLocale, FormatLocale> = {
  fr: 'fr-FR',
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  it: 'it-IT',
  ar: 'ar-SA',
  nl: 'nl-NL',
};

/**
 * Get locale config from short or full locale code
 */
export function getLocaleConfig(locale: string): LocaleFormatConfig {
  // Check if it's already a full locale
  if (locale in localeFormatConfigs) {
    return localeFormatConfigs[locale as FormatLocale];
  }

  // Try to map from short locale
  const shortLocale = locale.split('-')[0] as ShortLocale;
  if (shortLocale in shortToFullLocale) {
    return localeFormatConfigs[shortToFullLocale[shortLocale]];
  }

  // Default to en-US if not found
  return localeFormatConfigs['en-US'];
}

/**
 * Get the full locale code from any locale string
 */
export function normalizeLocale(locale: string): FormatLocale {
  if (locale in localeFormatConfigs) {
    return locale as FormatLocale;
  }

  const shortLocale = locale.split('-')[0] as ShortLocale;
  if (shortLocale in shortToFullLocale) {
    return shortToFullLocale[shortLocale];
  }

  return 'en-US';
}

/**
 * Check if a locale is RTL
 */
export function isRTLLocale(locale: string): boolean {
  return getLocaleConfig(locale).direction === 'rtl';
}

/**
 * Get all supported locales
 */
export function getSupportedLocales(): FormatLocale[] {
  return Object.keys(localeFormatConfigs) as FormatLocale[];
}

/**
 * Check if a locale is supported
 */
export function isLocaleSupported(locale: string): boolean {
  const fullLocale = normalizeLocale(locale);
  return fullLocale in localeFormatConfigs;
}
