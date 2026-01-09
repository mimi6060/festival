export const locales = ['fr', 'en', 'it', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

export const localeNames: Record<Locale, string> = {
  fr: 'Francais',
  en: 'English',
  it: 'Italiano',
  ar: 'العربية',
};

export const localeFlags: Record<Locale, string> = {
  fr: 'FR',
  en: 'GB',
  it: 'IT',
  ar: 'SA',
};

/**
 * RTL locale codes
 * Locales that use right-to-left text direction
 */
export const rtlLocales: readonly Locale[] = ['ar'] as const;

/**
 * Check if a locale uses RTL direction
 */
export function isRTLLocale(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

/**
 * Get the text direction for a locale
 */
export function getLocaleDirection(locale: Locale): 'ltr' | 'rtl' {
  return isRTLLocale(locale) ? 'rtl' : 'ltr';
}
