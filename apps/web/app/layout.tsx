import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider, ThemeScript } from '../components/providers/ThemeProvider';

export const metadata: Metadata = {
  title: 'Festival Platform',
  description: 'Plateforme de gestion de festivals - Billetterie, Cashless, Programme',
};

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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
