'use client';

import { AuthProvider } from '../../lib/auth-context';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">{children}</div>
    </AuthProvider>
  );
}
