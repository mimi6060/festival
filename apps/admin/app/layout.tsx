import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers, themeScript } from '../components/Providers';

export const metadata: Metadata = {
  title: 'Festival Admin',
  description: "Dashboard d'administration Festival",
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
