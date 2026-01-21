'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api';

const footerLinks = {
  discover: {
    title: 'Decouvrir',
    links: [
      { label: 'Festivals', href: '/festivals' },
      { label: 'Artistes', href: '/artists' },
      { label: 'Programme', href: '/program' },
      { label: 'Billetterie', href: '/tickets' },
    ],
  },
  company: {
    title: 'Entreprise',
    links: [
      { label: 'A propos', href: '/about' },
      { label: 'Carrieres', href: '/careers' },
      { label: 'Presse', href: '/press' },
      { label: 'Partenaires', href: '/partners' },
    ],
  },
  support: {
    title: 'Support',
    links: [
      { label: "Centre d'aide", href: '/help' },
      { label: 'Contact', href: '/contact' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Remboursements', href: '/refunds' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Confidentialite', href: '/privacy' },
      { label: 'CGV', href: '/terms' },
      { label: 'Mentions legales', href: '/legal' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
};

const socialLinks = [
  {
    name: 'Twitter',
    href: 'https://twitter.com/festivalhub',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    href: 'https://instagram.com/festivalhub',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path
          fillRule="evenodd"
          d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    name: 'Facebook',
    href: 'https://facebook.com/festivalhub',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path
          fillRule="evenodd"
          d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    name: 'YouTube',
    href: 'https://youtube.com/festivalhub',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path
          fillRule="evenodd"
          d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    href: 'https://tiktok.com/@festivalhub',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
];

/**
 * Footer Component - Festival Platform
 *
 * Features:
 * - Tomorrowland-inspired festive design with gradient accents
 * - Newsletter subscription with API integration
 * - Responsive multi-column layout
 * - Social media links with hover effects
 * - Decorative gradient elements
 *
 * WCAG 2.1 AA Compliance:
 * - Proper semantic footer markup
 * - Focus indicators on all interactive elements
 * - High contrast text
 * - Accessible form labels
 */
export function Footer() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email?.includes('@')) {
      setError('Veuillez entrer une adresse email valide');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/contact/newsletter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          language: 'fr',
        }),
      });

      const data = await response.json();

      if (!response.ok && response.status !== 409) {
        throw new Error(data.message || "Echec de l'inscription");
      }

      setIsSubscribed(true);
      setEmail('');
    } catch (err) {
      console.error('Newsletter subscription failed:', err);
      setError(err instanceof Error ? err.message : "Echec de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer role="contentinfo" className="relative bg-festival-darker overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        {/* Radial gradient accents */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative container-app py-16 lg:py-20">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-12 lg:gap-8">
          {/* Brand Column - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            {/* Logo */}
            <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-300" />
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-cyan-500 flex items-center justify-center">
                  <svg
                    className="w-7 h-7 text-white"
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
              <div className="flex flex-col">
                <span className="text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                  Festival
                </span>
                <span className="text-xs font-medium tracking-widest uppercase text-purple-400/80">
                  Platform
                </span>
              </div>
            </Link>

            {/* Description */}
            <p className="text-white/60 text-sm leading-relaxed mb-8 max-w-sm">
              Decouvrez et reservez vos places pour les meilleurs festivals de musique. Votre
              prochaine experience inoubliable commence ici.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-3 rounded-xl text-white/50 hover:text-white transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  aria-label={`Suivez-nous sur ${social.name}`}
                >
                  {/* Hover background */}
                  <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
                  {/* Glow on hover */}
                  <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl" />
                  <span className="relative">{social.icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns - Each takes 1 column */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center text-white/60 hover:text-white text-sm transition-colors duration-300 focus:outline-none focus-visible:text-purple-400"
                    >
                      <span className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-purple-400">
                        &rarr;
                      </span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Section */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="lg:max-w-md">
              <h3 className="text-white font-semibold text-lg mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                Restez connecte
              </h3>
              <p className="text-white/50 text-sm">
                Recevez les dernieres actualites et offres exclusives directement dans votre boite
                mail.
              </p>
            </div>

            {isSubscribed ? (
              <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
                <div className="p-2 rounded-full bg-green-500/20">
                  <svg
                    className="w-5 h-5 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-green-400">
                  Merci pour votre inscription !
                </span>
              </div>
            ) : (
              <div className="w-full lg:w-auto">
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 lg:w-80">
                    <input
                      type="email"
                      placeholder="Votre adresse email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      aria-label="Adresse email pour la newsletter"
                      className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="relative group px-8 py-4 rounded-xl font-semibold text-white overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-festival-darker disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* Gradient background */}
                    <span className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-[length:200%_100%] group-hover:animate-[gradientShift_3s_ease_infinite]" />
                    {/* Glow on hover */}
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 blur-xl" />
                    <span className="relative flex items-center gap-2">
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>Inscription...</span>
                        </>
                      ) : (
                        <>
                          <span>S&apos;inscrire</span>
                          <svg
                            className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>
                </form>
                {error && (
                  <p className="mt-3 text-sm text-red-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} Festival Platform. Tous droits reserves.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/privacy"
              className="text-white/40 hover:text-white transition-colors duration-300 focus:outline-none focus-visible:text-purple-400"
            >
              Confidentialite
            </Link>
            <span className="text-white/20">|</span>
            <Link
              href="/terms"
              className="text-white/40 hover:text-white transition-colors duration-300 focus:outline-none focus-visible:text-purple-400"
            >
              CGV
            </Link>
            <span className="text-white/20">|</span>
            <Link
              href="/cookies"
              className="text-white/40 hover:text-white transition-colors duration-300 focus:outline-none focus-visible:text-purple-400"
            >
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
