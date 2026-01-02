// Types
export * from './lib/types';

// Utilities
export * from './lib/utils';

// Locales (JSON imports)
export { default as frLocale } from './lib/locales/fr.json';
export { default as enLocale } from './lib/locales/en.json';
export { default as deLocale } from './lib/locales/de.json';
export { default as esLocale } from './lib/locales/es.json';

// Locale map for dynamic access
import frLocale from './lib/locales/fr.json';
import enLocale from './lib/locales/en.json';
import deLocale from './lib/locales/de.json';
import esLocale from './lib/locales/es.json';
import type { Locale } from './lib/types';

export const localeMessages: Record<Locale, typeof frLocale> = {
  fr: frLocale,
  en: enLocale,
  de: deLocale,
  es: esLocale,
};

/**
 * Get messages for a specific locale
 */
export function getMessages(locale: Locale): typeof frLocale {
  return localeMessages[locale] || localeMessages.fr;
}
