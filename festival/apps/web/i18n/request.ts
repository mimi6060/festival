import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, locales, Locale } from './config';

export default getRequestConfig(async ({ locale }) => {
  // Validate locale
  const validLocale = locales.includes(locale as Locale) ? locale : defaultLocale;

  return {
    messages: (await import(`../messages/${validLocale}.json`)).default,
  };
});
