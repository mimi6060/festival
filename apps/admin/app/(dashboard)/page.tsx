'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
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
  // Real-time data hook with WebSocket connection
  const {
    stats: realtimeStats,
    isConnected,
    connectionState,
    lastUpdate,
    isLoading,
    connect,
    refresh,
  } = useRealtimeData({
    autoConnect: true,
    pollingFallback: true,
    pollingInterval: 30000, // Fallback to 30s polling if WebSocket unavailable
  });

  // Combine real-time stats with mock data for complete display
  const stats = useMemo(() => ({
    activeFestivals: mockDashboardStats.activeFestivals,
    ticketsSoldThisMonth: realtimeStats.ticketsSoldToday > 0 ? realtimeStats.ticketsSoldToday : mockDashboardStats.ticketsSoldThisMonth,
    revenueThisMonth: realtimeStats.revenueToday > 0 ? realtimeStats.revenueToday : mockDashboardStats.revenueThisMonth,
    newUsersThisMonth: mockDashboardStats.newUsersThisMonth,
    currentAttendees: realtimeStats.currentAttendees,
    cashlessBalance: realtimeStats.cashlessBalance,
  }), [realtimeStats, mockDashboardStats]);

  const festivals = mockFestivals.filter((f) => f.status === 'published');
  const revenueData = useMemo(() => generateRevenueChartData(90), []);
  const ticketSalesData = useMemo(() => generateTicketSalesChartData(90), []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Bienvenue ! Voici un apercu de votre activite en temps reel.</p>
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
          <button className="btn-secondary flex items-center gap-2">
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
          <button className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nouveau festival
          </button>
        </div>
      </div>

      {/* Real-Time Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <RealTimeStatCard
          title="Festivals actifs"
          value={stats.activeFestivals}
          previousValue={2}
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
          zones={realtimeStats.zoneOccupancy}
          isLive={isConnected}
          loading={isLoading}
        />
        <RecentTransactionsWidget
          transactions={realtimeStats.recentTransactions}
          isLive={isConnected}
          loading={isLoading}
        />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopFestivals festivals={festivals} />
        <RecentActivity />
      </div>
    </div>
  );
}
