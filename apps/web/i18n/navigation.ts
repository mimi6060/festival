'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { Locale } from './config';

export function useLocale(): Locale {
  // Get locale from cookie on client side
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    const locale = match?.[1];
    if (locale === 'fr' || locale === 'en') {
      return locale;
    }
  }
  return 'fr';
}

export function useChangeLocale() {
  const router = useRouter();

  const changeLocale = useCallback(
    (newLocale: Locale) => {
      // Set cookie
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;

      // Refresh the page to apply new locale
      router.refresh();
    },
    [router]
  );

  return changeLocale;
}
