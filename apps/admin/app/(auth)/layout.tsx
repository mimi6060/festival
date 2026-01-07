'use client';

import { AuthProvider } from '../../lib/auth-context';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">{children}</div>
    </AuthProvider>
  );
}
