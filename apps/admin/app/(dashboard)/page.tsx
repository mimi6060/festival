'use client';

import { useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRealtimeData } from '@/hooks';
import { ConnectionStatusIndicator } from '@/components/dashboard/ConnectionStatusIndicator';
import { RealTimeStatCard } from '@/components/dashboard/RealTimeStatCard';
import { ZoneOccupancyWidget } from '@/components/dashboard/ZoneOccupancyWidget';
import { RecentTransactionsWidget } from '@/components/dashboard/RecentTransactionsWidget';
import RecentActivity from '@/components/dashboard/RecentActivity';
import TopFestivals from '@/components/dashboard/TopFestivals';
import {
  mockDashboardStats,
  mockFestivals,
  generateRevenueChartData,
  generateTicketSalesChartData,
} from '@/lib/mock-data';

const ChartSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
    <div className="animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  </div>
);

const RevenueChart = dynamic(() => import('@/components/dashboard/RevenueChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const TicketSalesChart = dynamic(() => import('@/components/dashboard/TicketSalesChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

export default function DashboardPage() {
  // Use realtime data hook with polling fallback (WebSocket disabled for stability)
  const {
    stats: realtimeStats,
    isConnected,
    connectionState,
    lastUpdate,
    isLoading,
    refresh,
    connect,
  } = useRealtimeData({
    autoConnect: false, // Disable WebSocket, use polling only
    pollingFallback: true,
    pollingInterval: 30000,
  });

  // Merge realtime stats with mock dashboard stats
  const stats = useMemo(
    () => ({
      activeFestivals: mockDashboardStats.activeFestivals,
      ticketsSoldThisMonth:
        realtimeStats.ticketsSoldToday || mockDashboardStats.ticketsSoldThisMonth,
      revenueThisMonth: realtimeStats.revenueToday || mockDashboardStats.revenueThisMonth,
      newUsersThisMonth: mockDashboardStats.newUsersThisMonth,
      currentAttendees: realtimeStats.currentAttendees || 2464,
      cashlessBalance: realtimeStats.cashlessBalance || 120053,
    }),
    [realtimeStats]
  );

  const festivals = mockFestivals.filter((f) => f.status === 'published');
  const revenueData = useMemo(() => generateRevenueChartData(90), []);
  const ticketSalesData = useMemo(() => generateTicketSalesChartData(90), []);

  // Export toast state
  const [exportToast, setExportToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'info';
  } | null>(null);

  // Handle export functionality
  const handleExport = useCallback(() => {
    // Create CSV content from dashboard stats
    const now = new Date().toISOString().split('T')[0];
    const csvContent = [
      'Statistiques du Dashboard - Festival Admin',
      `Date d'export: ${now}`,
      '',
      'Metrique,Valeur',
      `Festivals actifs,${stats.activeFestivals}`,
      `Billets vendus ce mois,${stats.ticketsSoldThisMonth}`,
      `Revenus ce mois,${stats.revenueThisMonth} EUR`,
      `Nouveaux utilisateurs ce mois,${stats.newUsersThisMonth}`,
      `Participants actuels,${stats.currentAttendees}`,
      `Solde cashless total,${stats.cashlessBalance} EUR`,
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-export-${now}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show success toast
    setExportToast({ show: true, message: 'Export CSV telecharge avec succes !', type: 'success' });

    // Auto-hide toast after 3 seconds
    setTimeout(() => setExportToast(null), 3000);
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Bienvenue ! Voici un apercu de votre activite en temps reel.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <ConnectionStatusIndicator
            isConnected={isConnected}
            connectionState={connectionState}
            lastUpdate={lastUpdate}
            onReconnect={connect}
            size="sm"
          />

          {/* Action Buttons */}
          <button onClick={refresh} className="btn-secondary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Actualiser
          </button>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Exporter
          </button>
          <Link href="/festivals/new" className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nouveau festival
          </Link>
        </div>
      </div>

      {/* Real-Time Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 lg:gap-6">
        <RealTimeStatCard
          title="Festivals actifs"
          value={stats.activeFestivals}
          previousValue={2}
          href="/festivals"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
          color="blue"
        />
        <RealTimeStatCard
          title="Billets vendus"
          value={stats.ticketsSoldThisMonth}
          previousValue={10500}
          href="/tickets"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
          }
          color="purple"
          isLive={isConnected}
          lastUpdate={lastUpdate}
        />
        <RealTimeStatCard
          title="Revenus"
          value={stats.revenueThisMonth}
          previousValue={480000}
          type="currency"
          href="/analytics"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          color="green"
          isLive={isConnected}
          lastUpdate={lastUpdate}
        />
        <RealTimeStatCard
          title="Nouveaux utilisateurs"
          value={stats.newUsersThisMonth}
          previousValue={1980}
          href="/users"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
          color="orange"
        />
        <RealTimeStatCard
          title="Participants actuels"
          value={stats.currentAttendees}
          href="/zones"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          }
          color="blue"
          trend="up"
          isLive={isConnected}
          lastUpdate={lastUpdate}
        />
        <RealTimeStatCard
          title="Solde cashless"
          value={stats.cashlessBalance}
          type="currency"
          href="/cashless"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          }
          color="purple"
          trend="stable"
          isLive={isConnected}
          lastUpdate={lastUpdate}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={revenueData} />
        <TicketSalesChart data={ticketSalesData} />
      </div>

      {/* Real-Time Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ZoneOccupancyWidget
          zones={
            Object.keys(realtimeStats.zoneOccupancy).length > 0
              ? realtimeStats.zoneOccupancy
              : {
                  'main-stage': {
                    zoneId: 'main-stage',
                    zoneName: 'Scene Principale',
                    current: 750,
                    capacity: 1000,
                    percentage: 75,
                    status: 'open',
                    trend: 'increasing',
                    entriesLastHour: 150,
                    exitsLastHour: 80,
                  },
                  'vip-area': {
                    zoneId: 'vip-area',
                    zoneName: 'Zone VIP',
                    current: 120,
                    capacity: 200,
                    percentage: 60,
                    status: 'busy',
                    trend: 'stable',
                    entriesLastHour: 30,
                    exitsLastHour: 25,
                  },
                  'food-court': {
                    zoneId: 'food-court',
                    zoneName: 'Espace Restauration',
                    current: 380,
                    capacity: 500,
                    percentage: 76,
                    status: 'near_capacity',
                    trend: 'increasing',
                    entriesLastHour: 200,
                    exitsLastHour: 120,
                  },
                }
          }
          isLive={isConnected}
          loading={isLoading}
        />
        <RecentTransactionsWidget
          transactions={
            realtimeStats.recentTransactions.length > 0
              ? realtimeStats.recentTransactions
              : [
                  {
                    id: 'tx_1',
                    type: 'ticket_sale',
                    amount: 89,
                    timestamp: new Date().toISOString(),
                  },
                  {
                    id: 'tx_2',
                    type: 'cashless_topup',
                    amount: 50,
                    timestamp: new Date(Date.now() - 60000).toISOString(),
                  },
                  {
                    id: 'tx_3',
                    type: 'cashless_payment',
                    amount: 12,
                    timestamp: new Date(Date.now() - 120000).toISOString(),
                  },
                  {
                    id: 'tx_4',
                    type: 'ticket_sale',
                    amount: 149,
                    timestamp: new Date(Date.now() - 180000).toISOString(),
                  },
                  {
                    id: 'tx_5',
                    type: 'refund',
                    amount: 25,
                    timestamp: new Date(Date.now() - 240000).toISOString(),
                  },
                ]
          }
          isLive={isConnected}
          loading={isLoading}
        />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopFestivals festivals={festivals} />
        <RecentActivity />
      </div>

      {/* Export Toast Notification */}
      {exportToast?.show && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
              exportToast.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            {exportToast.type === 'success' ? (
              <svg
                className="w-5 h-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <span className="font-medium">{exportToast.message}</span>
            <button
              onClick={() => setExportToast(null)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
