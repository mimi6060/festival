/**
 * i18n Initialization for React Native Mobile App
 * Uses i18next with react-i18next for translations
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import 'intl-pluralrules';

import { defaultLocale, locales } from './config';
import languageDetector from './languageDetector';

// Import translation resources
import fr from './locales/fr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import it from './locales/it.json';
import ar from './locales/ar.json';

// Define resources type for type safety
export const resources = {
  fr: { translation: fr },
  en: { translation: en },
  de: { translation: de },
  es: { translation: es },
  it: { translation: it },
  ar: { translation: ar },
} as const;

// Initialize i18next
i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: defaultLocale,
    supportedLngs: locales,

    // Interpolation settings
    interpolation: {
      escapeValue: false, // React Native handles escaping
    },

    // React settings
    react: {
      useSuspense: false, // Disable suspense for React Native compatibility
    },

    // Namespace settings
    defaultNS: 'translation',
    ns: ['translation'],

    // Debug settings (disable in production)
    debug: __DEV__,

    // Missing key handling
    saveMissing: __DEV__,
    missingKeyHandler: __DEV__
      ? (lngs, ns, key) => {
          console.warn(`Missing translation key: ${key} for languages: ${lngs.join(', ')}`);
        }
      : undefined,

    // Compatibility settings
    compatibilityJSON: 'v3',

    // Return null for missing keys in production
    returnNull: false,
    returnEmptyString: false,
  });

export default i18n;

// Re-export everything from config for convenience
export * from './config';
export * from './languageDetector';
