import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultLocale, locales, Locale } from './config';

export default getRequestConfig(async () => {
  // Get locale from cookie or Accept-Language header
  const cookieStore = await cookies();
  const headerStore = await headers();

  let locale: Locale = defaultLocale;

  // Check cookie first
  const localeCookie = cookieStore.get('locale')?.value as Locale | undefined;
  if (localeCookie && locales.includes(localeCookie)) {
    locale = localeCookie;
  } else {
    // Fall back to Accept-Language header
    const acceptLanguage = headerStore.get('accept-language');
    if (acceptLanguage) {
      const preferredLocale = acceptLanguage
        .split(',')
        .map((lang) => lang.split(';')[0].trim().substring(0, 2))
        .find((lang) => locales.includes(lang as Locale)) as Locale | undefined;

      if (preferredLocale) {
        locale = preferredLocale;
      }
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
