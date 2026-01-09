/**
 * Type-safe useTranslation hook for React Native
 * Provides translation functions with TypeScript support
 */

import { useCallback } from 'react';
import {
  useTranslation as useI18nTranslation,
  UseTranslationOptions,
  TFunction,
} from 'react-i18next';
import i18n from '../i18n';
import {
  Locale,
  isValidLocale,
  isRTL,
  getLocaleConfig,
  getAllLocales,
  LocaleConfig,
} from '../i18n/config';
import { storeLanguage } from '../i18n/languageDetector';

// Import French translations for type inference
import type fr from '../i18n/locales/fr.json';

/**
 * Type for translation keys based on French translations
 * This provides autocomplete and type checking for translation keys
 */
export type TranslationKeys = typeof fr;

/**
 * Flatten nested object keys to dot notation
 * e.g., { common: { welcome: 'Hello' } } => 'common.welcome'
 */
type FlattenKeys<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? FlattenKeys<T[K], `${Prefix}${K}.`>
          : `${Prefix}${K}`
        : never;
    }[keyof T]
  : never;

/**
 * All possible translation key paths
 */
export type TranslationKey = FlattenKeys<TranslationKeys>;

/**
 * Return type for the useTranslation hook
 */
export interface UseTranslationReturn {
  /** Translate a key */
  t: TFunction<'translation', undefined>;
  /** Current language */
  language: Locale;
  /** Change the current language */
  changeLanguage: (language: Locale) => Promise<void>;
  /** Check if current language is RTL */
  isRTL: boolean;
  /** Get all available locales */
  locales: LocaleConfig[];
  /** Get current locale config */
  currentLocale: LocaleConfig;
  /** Check if i18n is ready */
  ready: boolean;
}

/**
 * Type-safe translation hook
 *
 * @example
 * const { t, language, changeLanguage, isRTL } = useTranslation();
 *
 * // Basic usage
 * t('common.welcome')
 *
 * // With interpolation
 * t('home.welcomeBack', { name: 'John' })
 *
 * // With count for pluralization
 * t('home.daysUntil', { count: 5 })
 *
 * // Change language
 * await changeLanguage('en');
 */
export function useTranslation(options?: UseTranslationOptions<undefined>): UseTranslationReturn {
  const { t, i18n: i18nInstance, ready } = useI18nTranslation('translation', options);

  // Get current language, ensuring it's a valid locale
  const currentLang = i18nInstance.language;
  const language: Locale = isValidLocale(currentLang) ? currentLang : 'fr';

  // Get current locale config
  const currentLocale = getLocaleConfig(language);

  // Get all available locales
  const locales = getAllLocales();

  // Check if current language is RTL
  const rtl = isRTL(language);

  /**
   * Change the current language and persist preference
   */
  const changeLanguage = useCallback(
    async (newLanguage: Locale): Promise<void> => {
      if (!isValidLocale(newLanguage)) {
        console.warn(`Invalid locale: ${newLanguage}`);
        return;
      }

      try {
        // Change i18next language
        await i18nInstance.changeLanguage(newLanguage);

        // Persist the preference
        await storeLanguage(newLanguage);
      } catch (error) {
        console.error('Failed to change language:', error);
        throw error;
      }
    },
    [i18nInstance]
  );

  return {
    t,
    language,
    changeLanguage,
    isRTL: rtl,
    locales,
    currentLocale,
    ready,
  };
}

/**
 * Get the current language without React hooks
 * Useful for non-component code
 */
export function getCurrentLanguage(): Locale {
  const lang = i18n.language;
  return isValidLocale(lang) ? lang : 'fr';
}

/**
 * Translate a key without React hooks
 * Useful for non-component code
 */
export function translate(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

/**
 * Change language without React hooks
 * Useful for non-component code
 */
export async function setLanguage(language: Locale): Promise<void> {
  if (!isValidLocale(language)) {
    throw new Error(`Invalid locale: ${language}`);
  }

  await i18n.changeLanguage(language);
  await storeLanguage(language);
}

export default useTranslation;
