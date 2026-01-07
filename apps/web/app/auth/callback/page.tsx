'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

/**
 * OAuth Callback Page
 *
 * This page handles the redirect after OAuth authentication.
 * The backend has already set httpOnly cookies with the tokens,
 * so we just need to check auth status and redirect.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const success = searchParams.get('success');
      const error = searchParams.get('error');

      if (error) {
        // OAuth failed, redirect to login with error
        router.push(`/auth/login?error=${encodeURIComponent(error)}`);
        return;
      }

      if (success === 'true') {
        // OAuth succeeded, cookies are set, check auth and redirect
        await checkAuth();
      }
    };

    handleCallback();
  }, [searchParams, checkAuth, router]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/account');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/60">Completing authentication...</p>
      </div>
    </div>
  );
}
