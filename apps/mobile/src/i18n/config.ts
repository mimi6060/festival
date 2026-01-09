/**
 * i18n Configuration for React Native Mobile App
 * Supports 6 languages: French, English, German, Spanish, Italian, Arabic (RTL)
 */

export type Locale = 'fr' | 'en' | 'de' | 'es' | 'it' | 'ar';

export const locales: Locale[] = ['fr', 'en', 'de', 'es', 'it', 'ar'];
export const defaultLocale: Locale = 'fr';

export interface LocaleConfig {
  locale: Locale;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
  flagEmoji: string;
}

export const localeConfigs: Record<Locale, LocaleConfig> = {
  fr: {
    locale: 'fr',
    name: 'French',
    nativeName: 'Francais',
    flag: 'FR',
    direction: 'ltr',
    flagEmoji: '🇫🇷',
  },
  en: {
    locale: 'en',
    name: 'English',
    nativeName: 'English',
    flag: 'GB',
    direction: 'ltr',
    flagEmoji: '🇬🇧',
  },
  de: {
    locale: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: 'DE',
    direction: 'ltr',
    flagEmoji: '🇩🇪',
  },
  es: {
    locale: 'es',
    name: 'Spanish',
    nativeName: 'Espanol',
    flag: 'ES',
    direction: 'ltr',
    flagEmoji: '🇪🇸',
  },
  it: {
    locale: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: 'IT',
    direction: 'ltr',
    flagEmoji: '🇮🇹',
  },
  ar: {
    locale: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: 'SA',
    direction: 'rtl',
    flagEmoji: '🇸🇦',
  },
};

/**
 * Check if a locale is valid
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get locale config for a given locale
 */
export function getLocaleConfig(locale: Locale): LocaleConfig {
  return localeConfigs[locale];
}

/**
 * Check if a locale is RTL
 */
export function isRTL(locale: Locale): boolean {
  return localeConfigs[locale].direction === 'rtl';
}

/**
 * Get language name in its native form
 */
export function getNativeName(locale: Locale): string {
  return localeConfigs[locale].nativeName;
}

/**
 * Get all available locales with their configs
 */
export function getAllLocales(): LocaleConfig[] {
  return locales.map((locale) => localeConfigs[locale]);
}

/**
 * Storage key for persisting language preference
 */
export const LANGUAGE_STORAGE_KEY = '@festival/language';

/**
 * Fallback language if detection fails
 */
export const FALLBACK_LANGUAGE: Locale = 'fr';

/**
 * Supported language codes that map to our locales
 */
export const languageMapping: Record<string, Locale> = {
  fr: 'fr',
  'fr-FR': 'fr',
  'fr-CA': 'fr',
  'fr-BE': 'fr',
  'fr-CH': 'fr',
  en: 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'en-AU': 'en',
  'en-CA': 'en',
  de: 'de',
  'de-DE': 'de',
  'de-AT': 'de',
  'de-CH': 'de',
  es: 'es',
  'es-ES': 'es',
  'es-MX': 'es',
  'es-AR': 'es',
  'es-CO': 'es',
  it: 'it',
  'it-IT': 'it',
  'it-CH': 'it',
  ar: 'ar',
  'ar-SA': 'ar',
  'ar-AE': 'ar',
  'ar-EG': 'ar',
  'ar-MA': 'ar',
};

/**
 * Map a device language code to our supported locales
 */
export function mapLanguageCode(code: string): Locale {
  // Try exact match first
  if (languageMapping[code]) {
    return languageMapping[code];
  }

  // Try base language code
  const baseCode = code.split('-')[0];
  if (baseCode && languageMapping[baseCode]) {
    return languageMapping[baseCode];
  }

  // Fallback to default
  return FALLBACK_LANGUAGE;
}
