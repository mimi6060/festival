import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider, ThemeScript } from '../components/providers/ThemeProvider';
import { SkipLink } from '../components/a11y/SkipLink';
import { AnnouncementProvider } from '../components/a11y/LiveRegion';

export const metadata: Metadata = {
  title: 'Festival Platform',
  description: 'Plateforme de gestion de festivals - Billetterie, Cashless, Programme',
};

/**
 * Root Layout Component
 *
 * WCAG 2.1 AA Accessibility Features:
 * - Skip link for keyboard users (2.4.1 Bypass Blocks)
 * - Proper language attribute (3.1.1 Language of Page)
 * - Semantic landmarks (main content area)
 * - Announcement provider for status messages (4.1.3 Status Messages)
 *
 * Landmarks hierarchy:
 * - <header role="banner"> - Site header/navigation (in Header component)
 * - <main id="main-content"> - Primary content area
 * - <footer role="contentinfo"> - Site footer (in Footer component)
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Prevent flash of wrong theme */}
        <ThemeScript />
      </head>
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <ThemeProvider defaultTheme="dark">
          <AnnouncementProvider>
            {/* Skip Link - First focusable element for keyboard users */}
            <SkipLink href="#main-content" label="Aller au contenu principal" />

            {/*
             * Main Content Area
             *
             * The id="main-content" creates the target for the skip link.
             * The tabIndex={-1} allows the skip link to work properly
             * by making the main element programmatically focusable.
             *
             * Child pages should render their own header and footer components.
             * The main landmark will contain the primary page content.
             */}
            <div className="min-h-screen flex flex-col">
              <main
                id="main-content"
                tabIndex={-1}
                className="flex-1 focus:outline-none"
              >
                {children}
              </main>
            </div>
          </AnnouncementProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
