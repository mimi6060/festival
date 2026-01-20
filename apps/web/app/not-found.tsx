'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-festival-dark">
      <div className="text-center px-4">
        {/* 404 Visual */}
        <div className="relative mb-8">
          <div className="text-[150px] md:text-[200px] font-bold text-white/5 select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500/20 to-pink-500/20 flex items-center justify-center">
              <svg
                className="w-16 h-16 text-primary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Page Not Found</h1>
        <p className="text-white/60 max-w-md mx-auto mb-8">
          Oops! It looks like this page got lost in the festival crowd. Let&apos;s get you back to
          the main stage.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="primary" size="lg" onClick={() => router.back()}>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Go Back
          </Button>
          <Button as="link" href="/" variant="secondary" size="lg">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Home
          </Button>
        </div>

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-white/40 text-sm mb-4">Looking for something specific?</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/festivals"
              className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
            >
              Browse Festivals
            </Link>
            <span className="text-white/20">•</span>
            <Link
              href="/artists"
              className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
            >
              View Artists
            </Link>
            <span className="text-white/20">•</span>
            <Link
              href="/contact"
              className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
