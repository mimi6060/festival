'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import DataTable from '@/components/tables/DataTable';
import { formatCurrency, formatDateTime, cn } from '@/lib/utils';
import type { TableColumn } from '@/types';

interface CashlessAccount {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  balance: number;
  totalTopUp: number;
  totalSpent: number;
  nfcTagId?: string;
  festivalId: string;
  festivalName: string;
  status: 'active' | 'suspended' | 'closed';
  createdAt: string;
  lastTransaction?: string;
}

interface CashlessTransaction {
  id: string;
  accountId: string;
  userName: string;
  type: 'topup' | 'payment' | 'refund' | 'transfer';
  amount: number;
  vendorName?: string;
  vendorId?: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

// Mock data
const mockAccounts: CashlessAccount[] = [
  {
    id: '1',
    userId: '1',
    userName: 'Sophie Petit',
    userEmail: 'sophie@email.com',
    balance: 85.5,
    totalTopUp: 200,
    totalSpent: 114.5,
    nfcTagId: 'NFC-001234',
    festivalId: '1',
    festivalName: 'Summer Beats Festival',
    status: 'active',
    createdAt: '2025-01-01T10:00:00Z',
    lastTransaction: '2025-01-02T15:30:00Z',
  },
  {
    id: '2',
    userId: '2',
    userName: 'Lucas Moreau',
    userEmail: 'lucas@email.com',
    balance: 150.0,
    totalTopUp: 300,
    totalSpent: 150.0,
    nfcTagId: 'NFC-001235',
    festivalId: '1',
    festivalName: 'Summer Beats Festival',
    status: 'active',
    createdAt: '2025-01-01T11:00:00Z',
    lastTransaction: '2025-01-02T16:00:00Z',
  },
  {
    id: '3',
    userId: '3',
    userName: 'Emma Durand',
    userEmail: 'emma@email.com',
    balance: 0,
    totalTopUp: 100,
    totalSpent: 100,
    nfcTagId: 'NFC-001236',
    festivalId: '1',
    festivalName: 'Summer Beats Festival',
    status: 'active',
    createdAt: '2025-01-01T12:00:00Z',
    lastTransaction: '2025-01-02T14:00:00Z',
  },
  {
    id: '4',
    userId: '4',
    userName: 'Thomas Bernard',
    userEmail: 'thomas@email.com',
    balance: 45.0,
    totalTopUp: 50,
    totalSpent: 5.0,
    festivalId: '1',
    festivalName: 'Summer Beats Festival',
    status: 'suspended',
    createdAt: '2025-01-01T13:00:00Z',
    lastTransaction: '2025-01-02T10:00:00Z',
  },
];

const mockTransactions: CashlessTransaction[] = [
  {
    id: '1',
    accountId: '1',
    userName: 'Sophie Petit',
    type: 'payment',
    amount: -12.5,
    vendorName: 'Bar Central',
    vendorId: 'V001',
    description: '2x Bieres + 1x Cocktail',
    timestamp: '2025-01-02T15:30:00Z',
    status: 'completed',
  },
  {
    id: '2',
    accountId: '2',
    userName: 'Lucas Moreau',
    type: 'topup',
    amount: 50.0,
    description: 'Recharge par carte bancaire',
    timestamp: '2025-01-02T16:00:00Z',
    status: 'completed',
  },
  {
    id: '3',
    accountId: '1',
    userName: 'Sophie Petit',
    type: 'payment',
    amount: -8.0,
    vendorName: 'Food Truck Pizza',
    vendorId: 'V002',
    description: '1x Pizza Margherita',
    timestamp: '2025-01-02T14:45:00Z',
    status: 'completed',
  },
  {
    id: '4',
    accountId: '3',
    userName: 'Emma Durand',
    type: 'refund',
    amount: 15.0,
    description: 'Remboursement solde cloture',
    timestamp: '2025-01-02T18:00:00Z',
    status: 'pending',
  },
  {
    id: '5',
    accountId: '2',
    userName: 'Lucas Moreau',
    type: 'payment',
    amount: -25.0,
    vendorName: 'Merchandise Official',
    vendorId: 'V003',
    description: '1x T-shirt Festival',
    timestamp: '2025-01-02T12:30:00Z',
    status: 'completed',
  },
];

// Generate hourly transaction data for chart
function generateHourlyData() {
  const data = [];
  for (let i = 10; i <= 23; i++) {
    data.push({
      hour: `${i}h`,
      transactions: Math.floor(Math.random() * 200) + 50,
      amount: Math.floor(Math.random() * 5000) + 1000,
    });
  }
  return data;
}

const hourlyData = generateHourlyData();

// Vendor breakdown data
const vendorData = [
  { name: 'Bar Central', value: 12500, color: '#3b82f6' },
  { name: 'Food Truck Pizza', value: 8200, color: '#10b981' },
  { name: 'Merchandise', value: 6800, color: '#f59e0b' },
  { name: 'Bar Scene 2', value: 5400, color: '#6366f1' },
  { name: 'Ice Cream', value: 3200, color: '#ec4899' },
];

export default function CashlessPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'transactions'>('overview');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredAccounts =
    statusFilter === 'all' ? mockAccounts : mockAccounts.filter((a) => a.status === statusFilter);

  const filteredTransactions =
    typeFilter === 'all' ? mockTransactions : mockTransactions.filter((t) => t.type === typeFilter);

  // Calculate stats
  const stats = useMemo(() => {
    const totalBalance = mockAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalTopUp = mockAccounts.reduce((sum, a) => sum + a.totalTopUp, 0);
    const totalSpent = mockAccounts.reduce((sum, a) => sum + a.totalSpent, 0);
    const activeAccounts = mockAccounts.filter((a) => a.status === 'active').length;
    const todayTransactions = mockTransactions.length;
    const todayVolume = mockTransactions
      .filter((t) => t.type === 'payment')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      totalBalance,
      totalTopUp,
      totalSpent,
      activeAccounts,
      todayTransactions,
      todayVolume,
    };
  }, []);

  const statusColors: Record<string, string> = {
    active: 'badge-success',
    suspended: 'badge-warning',
    closed: 'badge-neutral',
  };

  const statusLabels: Record<string, string> = {
    active: 'Actif',
    suspended: 'Suspendu',
    closed: 'Ferme',
  };

  const typeColors: Record<string, string> = {
    topup: 'badge-success',
    payment: 'badge-info',
    refund: 'badge-warning',
    transfer: 'badge-neutral',
  };

  const typeLabels: Record<string, string> = {
    topup: 'Recharge',
    payment: 'Paiement',
    refund: 'Remboursement',
    transfer: 'Transfert',
  };

  const accountColumns: TableColumn<CashlessAccount>[] = [
    {
      key: 'userName',
      label: 'Utilisateur',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.userName}</p>
          <p className="text-sm text-gray-500">{row.userEmail}</p>
        </div>
      ),
    },
    {
      key: 'nfcTagId',
      label: 'Tag NFC',
      render: (value) => (
        <span className="text-sm font-mono text-gray-600">
          {(value as string | undefined) || '-'}
        </span>
      ),
    },
    {
      key: 'balance',
      label: 'Solde',
      sortable: true,
      render: (value) => (
        <span
          className={cn(
            'font-semibold',
            (value as number) > 0 ? 'text-green-600' : 'text-gray-600'
          )}
        >
          {formatCurrency(value as number)}
        </span>
      ),
    },
    {
      key: 'totalTopUp',
      label: 'Total recharge',
      sortable: true,
      render: (value) => <span className="text-gray-600">{formatCurrency(value as number)}</span>,
    },
    {
      key: 'totalSpent',
      label: 'Total depense',
      sortable: true,
      render: (value) => <span className="text-gray-600">{formatCurrency(value as number)}</span>,
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (value) => (
        <span className={cn('badge', statusColors[value as string])}>
          {statusLabels[value as string]}
        </span>
      ),
    },
    {
      key: 'lastTransaction',
      label: 'Derniere transaction',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-500">
          {value ? formatDateTime(value as string) : '-'}
        </span>
      ),
    },
  ];

  const transactionColumns: TableColumn<CashlessTransaction>[] = [
    {
      key: 'timestamp',
      label: 'Date/Heure',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">{formatDateTime(value as string)}</span>
      ),
    },
    {
      key: 'userName',
      label: 'Utilisateur',
      sortable: true,
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (value) => (
        <span className={cn('badge', typeColors[value as string])}>
          {typeLabels[value as string]}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Montant',
      sortable: true,
      render: (value) => (
        <span
          className={cn(
            'font-semibold',
            (value as number) >= 0 ? 'text-green-600' : 'text-red-600'
          )}
        >
          {(value as number) >= 0 ? '+' : ''}
          {formatCurrency(value as number)}
        </span>
      ),
    },
    {
      key: 'vendorName',
      label: 'Vendeur',
      render: (value) => (
        <span className="text-gray-600">{(value as string | undefined) || '-'}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (value) => <span className="text-sm text-gray-500">{value as string}</span>,
    },
    {
      key: 'status',
      label: 'Statut',
      render: (value) => (
        <span
          className={cn(
            'badge',
            value === 'completed'
              ? 'badge-success'
              : value === 'pending'
                ? 'badge-warning'
                : 'badge-danger'
          )}
        >
          {value === 'completed' ? 'Complete' : value === 'pending' ? 'En attente' : 'Echec'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cashless</h1>
          <p className="text-gray-500 mt-1">
            Surveillez les soldes et transactions cashless en temps reel.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => alert('Export functionality coming soon')}
            className="btn-secondary flex items-center gap-2"
          >
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
          <button
            onClick={() => alert('Mass refund functionality coming soon')}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Remboursement masse
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Solde total</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {formatCurrency(stats.totalBalance)}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Total recharges</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {formatCurrency(stats.totalTopUp)}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Total depenses</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(stats.totalSpent)}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Comptes actifs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeAccounts}</p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Transactions (24h)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayTransactions}</p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Volume (24h)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(stats.todayVolume)}
          </p>
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        Donnees en temps reel - Derniere mise a jour: {new Date().toLocaleTimeString('fr-FR')}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={cn(
              'py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'accounts'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Comptes ({mockAccounts.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={cn(
              'py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'transactions'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Transactions
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly transactions chart */}
          <div className="chart-container">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transactions par heure</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip
                    content={(props) => {
                      const { active, payload, label } = props;
                      if (active && payload?.length) {
                        return (
                          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
                            <p className="text-sm font-medium text-gray-900">{label}</p>
                            <p className="text-sm text-gray-600">
                              {payload[0]?.value} transactions
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatCurrency(
                                (payload[0]?.payload as { amount?: number })?.amount || 0
                              )}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="transactions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vendor breakdown */}
          <div className="chart-container">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Repartition par vendeur</h3>
            <div className="flex items-center gap-8">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vendorData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {vendorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {vendorData.map((vendor) => (
                  <div key={vendor.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: vendor.color }}
                      />
                      <span className="text-sm text-gray-600">{vendor.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(vendor.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="lg:col-span-2 chart-container">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transactions recentes</h3>
            <div className="space-y-3">
              {mockTransactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        tx.type === 'topup'
                          ? 'bg-green-100'
                          : tx.type === 'refund'
                            ? 'bg-yellow-100'
                            : 'bg-blue-100'
                      )}
                    >
                      {tx.type === 'topup' ? (
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      ) : tx.type === 'refund' ? (
                        <svg
                          className="w-5 h-5 text-yellow-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tx.userName}</p>
                      <p className="text-sm text-gray-500">{tx.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        'font-semibold',
                        tx.amount >= 0 ? 'text-green-600' : 'text-gray-900'
                      )}
                    >
                      {tx.amount >= 0 ? '+' : ''}
                      {formatCurrency(tx.amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'accounts' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Statut:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Accounts Table */}
          <DataTable
            data={filteredAccounts}
            columns={accountColumns}
            searchPlaceholder="Rechercher un compte..."
            actions={(account) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => alert(`View details for ${account.userName}`)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Voir details"
                >
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() =>
                    alert(
                      account.status === 'active'
                        ? `Suspend account for ${account.userName}`
                        : `Reactivate account for ${account.userName}`
                    )
                  }
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    account.status === 'active' ? 'hover:bg-orange-50' : 'hover:bg-green-50'
                  )}
                  title={account.status === 'active' ? 'Suspendre' : 'Reactiver'}
                >
                  {account.status === 'active' ? (
                    <svg
                      className="w-4 h-4 text-orange-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => alert(`Refund balance for ${account.userName}`)}
                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Rembourser"
                >
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                </button>
              </div>
            )}
          />
        </>
      )}

      {activeTab === 'transactions' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tous les types</option>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Date:</label>
              <input
                type="date"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Transactions Table */}
          <DataTable
            data={filteredTransactions}
            columns={transactionColumns}
            searchPlaceholder="Rechercher une transaction..."
          />
        </>
      )}
    </div>
  );
}
