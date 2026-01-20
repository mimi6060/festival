'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { ExportButton } from '@/components/export';
import {
  userExportColumns,
  festivalExportColumns,
  orderExportColumns,
  cashlessExportColumns,
  staffExportColumns,
} from '@/lib/export';
import { mockUsers, mockFestivals, mockOrders, mockStaff } from '@/lib/mock-data';
import { formatDateTime, cn } from '@/lib/utils';
import { usersApi, festivalsApi, ordersApi, cashlessApi, staffApi } from '@/lib/api';

// Types for export configurations
interface ExportConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'sales' | 'users' | 'operations' | 'finance';
  columns: typeof userExportColumns;
  getData: () => Record<string, unknown>[];
  recordCount: number;
}

// Mock cashless transactions data
const mockCashlessTransactions = [
  {
    id: '1',
    type: 'topup',
    amount: 50,
    balanceBefore: 0,
    balanceAfter: 50,
    createdAt: '2025-01-02T10:30:00Z',
    account: { user: { email: 'user1@example.com' } },
    festival: { name: 'Summer Beats Festival' },
  },
  {
    id: '2',
    type: 'payment',
    amount: 15,
    balanceBefore: 50,
    balanceAfter: 35,
    createdAt: '2025-01-02T11:00:00Z',
    account: { user: { email: 'user1@example.com' } },
    festival: { name: 'Summer Beats Festival' },
  },
  {
    id: '3',
    type: 'topup',
    amount: 100,
    balanceBefore: 0,
    balanceAfter: 100,
    createdAt: '2025-01-02T11:30:00Z',
    account: { user: { email: 'user2@example.com' } },
    festival: { name: 'Summer Beats Festival' },
  },
];

export default function ExportsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [exportHistory, setExportHistory] = useState<
    { name: string; format: string; date: Date }[]
  >([]);

  // State for API data
  const [users, setUsers] = useState<Record<string, unknown>[]>(
    mockUsers as unknown as Record<string, unknown>[]
  );
  const [festivals, setFestivals] = useState<Record<string, unknown>[]>(
    mockFestivals as unknown as Record<string, unknown>[]
  );
  const [orders, setOrders] = useState<Record<string, unknown>[]>(
    mockOrders as unknown as Record<string, unknown>[]
  );
  const [cashlessTransactions, setCashlessTransactions] = useState<Record<string, unknown>[]>(
    mockCashlessTransactions as unknown as Record<string, unknown>[]
  );
  const [staff, setStaff] = useState<Record<string, unknown>[]>(
    mockStaff as unknown as Record<string, unknown>[]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data for exports
  const fetchData = useCallback(async () => {
    try {
      const [usersRes, festivalsRes, ordersRes, cashlessRes, staffRes] = await Promise.allSettled([
        usersApi.getAll({ limit: 1000 }),
        festivalsApi.getAll({ limit: 100 }),
        ordersApi.getAll({ limit: 1000 }),
        cashlessApi.getTransactions({ limit: 1000 }),
        staffApi.getAll({ limit: 500 }),
      ]);

      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.data as unknown as Record<string, unknown>[]);
      }
      if (festivalsRes.status === 'fulfilled') {
        setFestivals(festivalsRes.value.data as unknown as Record<string, unknown>[]);
      }
      if (ordersRes.status === 'fulfilled') {
        setOrders(ordersRes.value.data as unknown as Record<string, unknown>[]);
      }
      if (cashlessRes.status === 'fulfilled') {
        setCashlessTransactions(cashlessRes.value.data as unknown as Record<string, unknown>[]);
      }
      if (staffRes.status === 'fulfilled') {
        setStaff(staffRes.value.data as unknown as Record<string, unknown>[]);
      }

      setError(null);
    } catch (err) {
      console.error('Failed to fetch export data:', err);
      setError('Failed to load some data. Using cached data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Export configurations
  const exportConfigs: ExportConfig[] = useMemo(
    () => [
      {
        id: 'users',
        name: 'Utilisateurs',
        description: 'Liste complete des utilisateurs avec leurs informations',
        icon: '👥',
        category: 'users',
        columns: userExportColumns,
        getData: () => users,
        recordCount: users.length,
      },
      {
        id: 'festivals',
        name: 'Festivals',
        description: 'Tous les festivals avec statistiques',
        icon: '🎪',
        category: 'operations',
        columns: festivalExportColumns,
        getData: () => festivals,
        recordCount: festivals.length,
      },
      {
        id: 'orders',
        name: 'Commandes',
        description: 'Historique complet des commandes',
        icon: '🛒',
        category: 'sales',
        columns: orderExportColumns,
        getData: () => orders,
        recordCount: orders.length,
      },
      {
        id: 'cashless',
        name: 'Transactions Cashless',
        description: 'Toutes les transactions cashless (recharges, paiements)',
        icon: '💳',
        category: 'finance',
        columns: cashlessExportColumns,
        getData: () => cashlessTransactions,
        recordCount: cashlessTransactions.length,
      },
      {
        id: 'staff',
        name: 'Staff',
        description: 'Liste du personnel et leurs assignations',
        icon: '👔',
        category: 'operations',
        columns: staffExportColumns,
        getData: () => staff,
        recordCount: staff.length,
      },
    ],
    [users, festivals, orders, cashlessTransactions, staff]
  );

  // Filter by category
  const filteredConfigs = useMemo(() => {
    if (selectedCategory === 'all') {
      return exportConfigs;
    }
    return exportConfigs.filter((config) => config.category === selectedCategory);
  }, [exportConfigs, selectedCategory]);

  // Categories
  const categories = [
    { id: 'all', name: 'Tous', icon: '📁' },
    { id: 'sales', name: 'Ventes', icon: '💰' },
    { id: 'users', name: 'Utilisateurs', icon: '👥' },
    { id: 'operations', name: 'Operations', icon: '⚙️' },
    { id: 'finance', name: 'Finance', icon: '📊' },
  ];

  // Handle export complete
  const handleExportComplete = (configName: string, format: string) => {
    setExportHistory((prev) => [
      { name: configName, format, date: new Date() },
      ...prev.slice(0, 9), // Keep last 10 exports
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centre d'Export</h1>
          <p className="text-gray-500 mt-1">Exportez vos donnees en CSV, Excel ou JSON</p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-yellow-800">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading export data...</span>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {category.icon} {category.name}
          </button>
        ))}
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredConfigs.map((config) => (
          <div
            key={config.id}
            className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">
                  {config.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{config.name}</h3>
                  <p className="text-sm text-gray-500">
                    {config.recordCount} enregistrement
                    {config.recordCount > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{config.description}</p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-400 uppercase">
                {categories.find((c) => c.id === config.category)?.name}
              </span>
              <ExportButton
                data={config.getData()}
                columns={config.columns}
                filename={config.id}
                onExportComplete={(format) => handleExportComplete(config.name, format)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{exportConfigs.length}</p>
              <p className="text-sm text-gray-500">Types d'export</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{exportHistory.length}</p>
              <p className="text-sm text-gray-500">Exports cette session</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {exportConfigs.reduce((sum, c) => sum + c.recordCount, 0)}
              </p>
              <p className="text-sm text-gray-500">Total enregistrements</p>
            </div>
          </div>
        </div>
      </div>

      {/* Export History */}
      {exportHistory.length > 0 && (
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Historique des exports</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {exportHistory.map((item, index) => (
              <div key={index} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Format: {item.format.toUpperCase()}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{formatDateTime(item.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Aide a l'export</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div>
            <p className="font-medium mb-1">CSV</p>
            <p className="text-blue-600">
              Format universel compatible avec Excel, Google Sheets et la plupart des logiciels.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Excel</p>
            <p className="text-blue-600">
              Format natif Microsoft Excel avec mise en forme automatique des en-tetes.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">JSON</p>
            <p className="text-blue-600">
              Format technique pour integration avec d'autres systemes et APIs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
