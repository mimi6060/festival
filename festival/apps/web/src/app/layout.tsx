import './global.css';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'FestivalHub - Discover Amazing Music Festivals',
    template: '%s | FestivalHub',
  },
  description: 'Discover and book tickets to the best music festivals around the world. Find your next unforgettable experience with FestivalHub.',
  keywords: ['music festivals', 'concerts', 'tickets', 'events', 'live music'],
  authors: [{ name: 'FestivalHub' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://festivalhub.com',
    siteName: 'FestivalHub',
    title: 'FestivalHub - Discover Amazing Music Festivals',
    description: 'Discover and book tickets to the best music festivals around the world.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'FestivalHub',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FestivalHub - Discover Amazing Music Festivals',
    description: 'Discover and book tickets to the best music festivals around the world.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-festival-dark text-white font-sans antialiased">
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
