export type Locale = 'fr' | 'en';

export const locales: Locale[] = ['fr', 'en'];
export const defaultLocale: Locale = 'fr';

export interface LocaleConfig {
  locale: Locale;
  name: string;
  flag: string;
  direction: 'ltr' | 'rtl';
}

export const localeConfigs: Record<Locale, LocaleConfig> = {
  fr: {
    locale: 'fr',
    name: 'Francais',
    flag: 'FR',
    direction: 'ltr',
  },
  en: {
    locale: 'en',
    name: 'English',
    flag: 'GB',
    direction: 'ltr',
  },
};

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function getLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, priority = '1'] = lang.trim().split(';q=');
      return {
        code: code?.split('-')[0]?.toLowerCase() ?? '',
        priority: parseFloat(priority),
      };
    })
    .sort((a, b) => b.priority - a.priority);

  for (const lang of languages) {
    if (isValidLocale(lang.code)) {
      return lang.code;
    }
  }

  return defaultLocale;
}

export function getLocaleFromCookie(cookie: string | null): Locale | null {
  if (!cookie) return null;

  const match = cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  const locale = match?.[1];

  if (locale && isValidLocale(locale)) {
    return locale;
  }

  return null;
}
