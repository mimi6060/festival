'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuthStore } from '@/stores/auth.store';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: 'Accueil',
    href: '/',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: 'Festivals',
    href: '/festivals',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
        />
      </svg>
    ),
  },
  {
    label: 'Programme',
    href: '/program',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    label: 'Artistes',
    href: '/artists',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </svg>
    ),
  },
  {
    label: 'Contact',
    href: '/contact',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

interface HeaderProps {
  isAuthenticated?: boolean;
  user?: {
    name: string;
    email: string;
  };
}

/**
 * Header Component - Festival Platform Navigation
 *
 * Features:
 * - Tomorrowland-inspired festive design with gradient accents
 * - Semi-transparent backdrop with blur effect
 * - Responsive mobile menu with smooth animations
 * - Theme toggle support
 * - Active link highlighting
 *
 * WCAG 2.1 AA Compliance:
 * - Proper heading hierarchy
 * - Focus management for mobile menu
 * - High contrast text and focus indicators
 * - Semantic navigation markup
 */
export function Header({ isAuthenticated = false, user }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const handleSignOut = async () => {
    await logout();
    router.push('/');
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Track scroll position for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <header
      role="banner"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-festival-darker/95 backdrop-blur-xl shadow-lg shadow-purple-500/10'
          : 'bg-gradient-to-b from-festival-darker/90 via-festival-darker/70 to-transparent backdrop-blur-md'
      }`}
    >
      {/* Decorative top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60" />

      <nav className="container-app" role="navigation" aria-label="Navigation principale">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-festival-darker rounded-xl"
          >
            {/* Animated logo container */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
              {/* Logo icon */}
              <div className="relative w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-cyan-500 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-lg">
                <svg
                  className="w-6 h-6 lg:w-7 lg:h-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
            </div>
            {/* Brand name with gradient */}
            <div className="hidden sm:flex flex-col">
              <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                Festival
              </span>
              <span className="text-[10px] lg:text-xs font-medium tracking-widest uppercase text-purple-400/80">
                Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 group
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-festival-darker
                    ${isActive ? 'text-white' : 'text-white/70 hover:text-white'}`}
                >
                  {/* Active background glow */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 border border-purple-500/30" />
                  )}
                  {/* Hover background */}
                  <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
                  {/* Icon */}
                  <span
                    className={`relative transition-colors duration-300 ${
                      isActive ? 'text-purple-400' : 'text-white/50 group-hover:text-purple-400'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {/* Label */}
                  <span className="relative">{item.label}</span>
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle variant="dropdown" />

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/account"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/5 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  {/* Avatar with gradient border */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 blur-sm opacity-60" />
                    <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-[2px]">
                      <div className="w-full h-full rounded-full bg-festival-darker flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-medium">{user?.name || 'Mon compte'}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Deconnexion
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button as="link" href="/auth/login" variant="ghost" size="sm">
                  Connexion
                </Button>
                {/* CTA Button with festive gradient */}
                <Link
                  href="/auth/register"
                  className="relative group px-5 py-2.5 rounded-xl font-semibold text-sm text-white overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-festival-darker"
                >
                  {/* Animated gradient background */}
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 bg-[length:200%_100%] animate-[gradientShift_3s_ease_infinite]" />
                  {/* Glow effect on hover */}
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 blur-xl" />
                  <span className="relative">Commencer</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle variant="button" />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="relative p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <div className="w-6 h-6 relative">
                {/* Hamburger to X animation */}
                <span
                  className={`absolute left-0 block w-6 h-0.5 bg-current transform transition-all duration-300 ${
                    isMobileMenuOpen ? 'top-[11px] rotate-45' : 'top-1'
                  }`}
                />
                <span
                  className={`absolute left-0 top-[11px] block w-6 h-0.5 bg-current transition-all duration-300 ${
                    isMobileMenuOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
                  }`}
                />
                <span
                  className={`absolute left-0 block w-6 h-0.5 bg-current transform transition-all duration-300 ${
                    isMobileMenuOpen ? 'top-[11px] -rotate-45' : 'top-[19px]'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          id="mobile-menu"
          className={`lg:hidden fixed inset-x-0 top-16 bottom-0 bg-festival-darker/98 backdrop-blur-xl transform transition-all duration-300 ease-out ${
            isMobileMenuOpen
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
        >
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent pointer-events-none" />

          <div className="relative container-app py-6 flex flex-col h-full">
            {/* Navigation Links */}
            <nav className="flex flex-col gap-1">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 transform
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-purple-500/20 via-pink-500/10 to-transparent text-white border-l-2 border-purple-500'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }
                      ${isMobileMenuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
                    `}
                    style={{ transitionDelay: isMobileMenuOpen ? `${index * 50}ms` : '0ms' }}
                  >
                    <span
                      className={`p-2 rounded-xl ${
                        isActive ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/50'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="text-lg font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Divider with gradient */}
            <div className="my-6 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

            {/* Auth Section */}
            <div className="flex flex-col gap-3 mt-auto pb-8">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/account"
                    className="flex items-center gap-4 px-4 py-4 rounded-2xl text-white/80 hover:text-white hover:bg-white/5 transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-[2px]">
                      <div className="w-full h-full rounded-xl bg-festival-darker flex items-center justify-center">
                        <span className="text-base font-semibold text-white">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-base font-medium text-white">
                        {user?.name || 'Mon compte'}
                      </div>
                      <div className="text-sm text-white/50">{user?.email || 'Voir le profil'}</div>
                    </div>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-4 rounded-2xl text-left text-white/70 hover:text-white hover:bg-white/5 transition-all duration-300 flex items-center gap-4"
                  >
                    <span className="p-2 rounded-xl bg-white/5">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                    </span>
                    <span className="text-lg font-medium">Deconnexion</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="w-full px-6 py-4 rounded-2xl text-center text-white/80 font-medium border border-white/10 hover:border-purple-500/50 hover:bg-white/5 transition-all duration-300"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/auth/register"
                    className="relative w-full px-6 py-4 rounded-2xl text-center font-semibold text-white overflow-hidden group"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500" />
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-purple-500 via-pink-400 to-cyan-400" />
                    <span className="relative">Creer un compte</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
