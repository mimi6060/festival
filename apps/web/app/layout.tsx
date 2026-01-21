import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { ThemeProvider, ThemeScript } from '../components/providers/ThemeProvider';
import { DirectionProvider } from '../components/providers/DirectionProvider';
import { SkipLink } from '../components/a11y/SkipLink';
import { AnnouncementProvider } from '../components/a11y/LiveRegion';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { getDirection, isRTL } from '../utils/rtl';
import { defaultLocale } from '../i18n/config';

export const metadata: Metadata = {
  title: 'Festival Platform',
  description: 'Plateforme de gestion de festivals - Billetterie, Cashless, Programme',
};

/**
 * Get the current locale from cookies or headers
 * Falls back to default locale if not found
 */
async function getLocale(): Promise<string> {
  const cookieStore = await cookies();
  const headersList = await headers();

  // Check cookie first (user preference)
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  if (localeCookie) {
    return localeCookie;
  }

  // Check Accept-Language header
  const acceptLanguage = headersList.get('accept-language');
  if (acceptLanguage) {
    // Parse first preferred language (e.g., "ar,en;q=0.9" -> "ar")
    const preferredLang = acceptLanguage.split(',')[0].split('-')[0].trim();
    return preferredLang;
  }

  return defaultLocale;
}

/**
 * Root Layout Component
 *
 * WCAG 2.1 AA Accessibility Features:
 * - Skip link for keyboard users (2.4.1 Bypass Blocks)
 * - Proper language attribute (3.1.1 Language of Page)
 * - Semantic landmarks (main content area)
 * - Announcement provider for status messages (4.1.3 Status Messages)
 * - RTL support for right-to-left languages (Arabic, Hebrew, etc.)
 *
 * Landmarks hierarchy:
 * - <header role="banner"> - Site header/navigation (in Header component)
 * - <main id="main-content"> - Primary content area
 * - <footer role="contentinfo"> - Site footer (in Footer component)
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Get current locale and direction
  const locale = await getLocale();
  const direction = getDirection(locale);
  const isRTLLocale = isRTL(locale);

  // Get appropriate skip link text based on locale
  const skipLinkLabels: Record<string, string> = {
    fr: 'Aller au contenu principal',
    en: 'Skip to main content',
    ar: 'انتقل إلى المحتوى الرئيسي',
    he: 'דלג לתוכן הראשי',
    fa: 'رفتن به محتوای اصلی',
    ur: 'مرکزی مواد پر جائیں',
  };
  const skipLinkLabel = skipLinkLabels[locale] || skipLinkLabels[defaultLocale];

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Add Arabic font for RTL support */}
        {isRTLLocale && (
          <link
            href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
        )}
        {/* Prevent flash of wrong theme */}
        <ThemeScript />
      </head>
      <body
        style={{
          fontFamily: isRTLLocale
            ? "'Noto Sans Arabic', 'Inter', system-ui, sans-serif"
            : "'Inter', system-ui, sans-serif",
        }}
      >
        <ThemeProvider defaultTheme="dark">
          <DirectionProvider locale={locale} direction={direction}>
            <AnnouncementProvider>
              {/* Skip Link - First focusable element for keyboard users */}
              <SkipLink href="#main-content" label={skipLinkLabel} />

              {/*
               * Main Content Area
               *
               * The id="main-content" creates the target for the skip link.
               * The tabIndex={-1} allows the skip link to work properly
               * by making the main element programmatically focusable.
               *
               * Layout structure:
               * - Header: Fixed navigation with festive styling
               * - Main: Primary content area with padding for fixed header
               * - Footer: Site footer with links and newsletter
               */}
              <div className="min-h-screen flex flex-col">
                {/* Site Header - Fixed navigation */}
                <Header />

                {/* Main content with top padding for fixed header */}
                <main
                  id="main-content"
                  tabIndex={-1}
                  className="flex-1 focus:outline-none pt-16 lg:pt-20"
                >
                  {children}
                </main>

                {/* Site Footer */}
                <Footer />
              </div>
            </AnnouncementProvider>
          </DirectionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
