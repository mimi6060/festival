'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useRealtimeData, RealtimeTransaction, RealtimeAlert } from '../../hooks';
import { formatCurrency, formatNumber, formatDateTime, cn } from '../../lib/utils';

// Connection status indicator
function ConnectionStatus({
  isConnected,
  connectionState,
}: {
  isConnected: boolean;
  connectionState: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'w-3 h-3 rounded-full',
          isConnected
            ? 'bg-green-500 animate-pulse'
            : connectionState === 'connecting'
            ? 'bg-yellow-500 animate-pulse'
            : 'bg-red-500'
        )}
      />
      <span className="text-sm text-gray-600">
        {isConnected
          ? 'Connecte en temps reel'
          : connectionState === 'connecting'
          ? 'Connexion...'
          : 'Deconnecte'}
      </span>
    </div>
  );
}

// Real-time stat card
function RealtimeStat({
  title,
  value,
  format = 'number',
  icon,
  trend,
}: {
  title: string;
  value: number;
  format?: 'number' | 'currency' | 'percentage';
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
}) {
  const formattedValue = useMemo(() => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return formatNumber(value);
    }
  }, [value, format]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
          {icon}
        </div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                ? 'text-red-600'
                : 'text-gray-500'
            )}
          >
            {trend === 'up' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
            {trend === 'down' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {trend === 'stable' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
              </svg>
            )}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{formattedValue}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
    </div>
  );
}

// Transaction item component
function TransactionItem({ transaction }: { transaction: RealtimeTransaction }) {
  const typeConfig = {
    ticket_sale: { label: 'Vente billet', color: 'text-green-600', bg: 'bg-green-50', icon: '🎫' },
    cashless_topup: { label: 'Recharge', color: 'text-blue-600', bg: 'bg-blue-50', icon: '💳' },
    cashless_payment: { label: 'Paiement', color: 'text-purple-600', bg: 'bg-purple-50', icon: '💰' },
    refund: { label: 'Remboursement', color: 'text-red-600', bg: 'bg-red-50', icon: '↩️' },
  };

  const config = typeConfig[transaction.type];

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm', config.bg)}>
          {config.icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{config.label}</p>
          <p className="text-xs text-gray-500">
            {new Date(transaction.timestamp).toLocaleTimeString('fr-FR')}
          </p>
        </div>
      </div>
      <p className={cn('text-sm font-semibold', config.color)}>
        {transaction.type === 'refund' ? '-' : '+'}
        {formatCurrency(transaction.amount)}
      </p>
    </div>
  );
}

// Alert item component
function AlertItem({
  alert,
  onAcknowledge,
}: {
  alert: RealtimeAlert;
  onAcknowledge: (id: string) => void;
}) {
  const typeConfig = {
    warning: { color: 'bg-yellow-50 border-yellow-200', icon: '⚠️', textColor: 'text-yellow-800' },
    error: { color: 'bg-red-50 border-red-200', icon: '🚨', textColor: 'text-red-800' },
    info: { color: 'bg-blue-50 border-blue-200', icon: 'ℹ️', textColor: 'text-blue-800' },
    success: { color: 'bg-green-50 border-green-200', icon: '✅', textColor: 'text-green-800' },
  };

  const config = typeConfig[alert.type];

  if (alert.acknowledged) return null;

  return (
    <div className={cn('p-4 rounded-lg border', config.color)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="text-lg">{config.icon}</span>
          <div>
            <p className={cn('text-sm font-medium', config.textColor)}>{alert.message}</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(alert.timestamp).toLocaleTimeString('fr-FR')}
            </p>
          </div>
        </div>
        <button
          onClick={() => onAcknowledge(alert.id)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Zone occupancy bar
function ZoneOccupancyBar({
  name,
  current,
  capacity,
}: {
  name: string;
  current: number;
  capacity: number;
}) {
  const percentage = (current / capacity) * 100;
  const barColor =
    percentage > 90
      ? 'bg-red-500'
      : percentage > 70
      ? 'bg-yellow-500'
      : 'bg-green-500';

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 capitalize">
          {name.replace(/-/g, ' ')}
        </span>
        <span className="text-sm text-gray-500">
          {formatNumber(current)} / {formatNumber(capacity)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={cn('h-2.5 rounded-full transition-all duration-500', barColor)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1 text-right">{percentage.toFixed(1)}%</p>
    </div>
  );
}

export default function RealtimeDashboardPage() {
  const {
    stats,
    isConnected,
    connectionState,
    lastUpdate,
    refresh,
    acknowledgeAlert,
  } = useRealtimeData({
    autoConnect: true,
    pollingFallback: true,
    pollingInterval: 5000,
  });

  // Generate mock chart data from stats
  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => ({
      time: new Date(now.getTime() - (11 - i) * 5 * 60000).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      transactions: Math.floor(Math.random() * 50) + 20,
      revenue: Math.floor(Math.random() * 5000) + 1000,
    }));
  }, [lastUpdate]);

  const unacknowledgedAlerts = stats.alerts.filter((a) => !a.acknowledged);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Temps Reel</h1>
          <div className="flex items-center gap-4 mt-2">
            <ConnectionStatus isConnected={isConnected} connectionState={connectionState} />
            {lastUpdate && (
              <span className="text-sm text-gray-500">
                Derniere MAJ: {formatDateTime(lastUpdate)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={refresh}
          className="btn-secondary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualiser
        </button>
      </div>

      {/* Alerts */}
      {unacknowledgedAlerts.length > 0 && (
        <div className="space-y-2">
          {unacknowledgedAlerts.map((alert) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onAcknowledge={acknowledgeAlert}
            />
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <RealtimeStat
          title="Connexions actives"
          value={stats.activeConnections}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          trend="up"
        />
        <RealtimeStat
          title="Billets vendus aujourd'hui"
          value={stats.ticketsSoldToday}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          }
          trend="up"
        />
        <RealtimeStat
          title="Revenus aujourd'hui"
          value={stats.revenueToday}
          format="currency"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend="up"
        />
        <RealtimeStat
          title="Solde cashless total"
          value={stats.cashlessBalance}
          format="currency"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
          trend="stable"
        />
        <RealtimeStat
          title="Participants actuels"
          value={stats.currentAttendees}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          trend="up"
        />
      </div>

      {/* Charts and Live Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Activite en temps reel (derniere heure)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTransactions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="transactions"
                  name="Transactions"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTransactions)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Transactions recentes
            </h3>
            <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full animate-pulse">
              LIVE
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentTransactions.length > 0 ? (
              stats.recentTransactions.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">
                Aucune transaction recente
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Zone Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Occupation des zones
          </h3>
          {Object.entries(stats.zoneOccupancy).map(([name, data]) => (
            <ZoneOccupancyBar
              key={name}
              name={name}
              current={data.current}
              capacity={data.capacity}
            />
          ))}
        </div>

        {/* Revenue Distribution Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenus par heure
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="revenue"
                  name="Revenus"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
