'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';
import { ThemeToggle } from './ui/ThemeToggle';

export default function Header() {
  const t = useTranslations('navigation');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-theme-bg/80 backdrop-blur-md border-b border-theme">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-theme-primary">Festival</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-theme-secondary hover:text-theme-primary transition-colors"
            >
              {t('home')}
            </Link>
            <Link
              href="/festivals"
              className="text-theme-secondary hover:text-theme-primary transition-colors"
            >
              {t('festivals')}
            </Link>
            <Link
              href="/program"
              className="text-theme-secondary hover:text-theme-primary transition-colors"
            >
              {t('program')}
            </Link>
            <Link
              href="/faq"
              className="text-theme-secondary hover:text-theme-primary transition-colors"
            >
              {t('faq')}
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ThemeToggle variant="dropdown" />
            <LanguageSwitcher />
            <Link
              href="/login"
              className="hidden sm:inline-block px-4 py-2 text-theme-secondary hover:text-theme-primary transition-colors"
            >
              {t('profile')}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
