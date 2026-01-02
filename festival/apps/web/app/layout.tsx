import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';

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
    <html lang="fr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
