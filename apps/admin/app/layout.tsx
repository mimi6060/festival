'use client';

import { useState } from 'react';
import './globals.css';
import Sidebar from '../components/layout/Sidebar';
import AdminHeader from '../components/layout/AdminHeader';
import { Providers, themeScript } from '../components/Providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <title>Festival Admin</title>
        <meta name="description" content="Dashboard d'administration Festival" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
              <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
              <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
