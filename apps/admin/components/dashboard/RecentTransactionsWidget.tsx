'use client';

import { useMemo } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { RealtimeTransaction } from '@/hooks';

interface RecentTransactionsWidgetProps {
  transactions: RealtimeTransaction[];
  isLive?: boolean;
  loading?: boolean;
  maxItems?: number;
  className?: string;
}

const transactionConfig = {
  ticket_sale: {
    label: 'Vente billet',
    icon: '🎫',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    sign: '+',
  },
  cashless_topup: {
    label: 'Recharge cashless',
    icon: '💳',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    sign: '+',
  },
  cashless_payment: {
    label: 'Paiement cashless',
    icon: '💰',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    sign: '-',
  },
  refund: {
    label: 'Remboursement',
    icon: '↩️',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    sign: '-',
  },
};

function TransactionItem({ transaction, isNew = false }: { transaction: RealtimeTransaction; isNew?: boolean }) {
  const config = transactionConfig[transaction.type];

  const formattedTime = useMemo(() => {
    const date = new Date(transaction.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 60) { return 'a l\'instant'; }
    if (diffMin < 60) { return `il y a ${diffMin} min`; }
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }, [transaction.timestamp]);

  return (
    <div className={cn(
      'flex items-center justify-between py-3 border-b border-gray-50 last:border-0 transition-all duration-300',
      isNew && 'bg-blue-50/50 -mx-2 px-2 rounded-lg animate-pulse'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-lg',
          config.bgColor
        )}>
          {config.icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{config.label}</p>
          <p className="text-xs text-gray-500">{formattedTime}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn('text-sm font-semibold', config.color)}>
          {config.sign}{formatCurrency(transaction.amount)}
        </p>
        {transaction.details && (
          <p className="text-xs text-gray-400 truncate max-w-[120px]">
            {typeof transaction.details === 'object' ? JSON.stringify(transaction.details).slice(0, 20) : String(transaction.details)}
          </p>
        )}
      </div>
    </div>
  );
}

export function RecentTransactionsWidget({
  transactions,
  isLive = false,
  loading = false,
  maxItems = 10,
  className,
}: RecentTransactionsWidgetProps) {
  const displayedTransactions = useMemo(() => {
    return transactions.slice(0, maxItems);
  }, [transactions, maxItems]);

  const stats = useMemo(() => {
    const totalRevenue = transactions.reduce((sum, t) => {
      if (t.type === 'ticket_sale' || t.type === 'cashless_topup') {
        return sum + t.amount;
      }
      if (t.type === 'refund') {
        return sum - t.amount;
      }
      return sum;
    }, 0);

    const counts = {
      ticket_sale: 0,
      cashless_topup: 0,
      cashless_payment: 0,
      refund: 0,
    };

    transactions.forEach((t) => {
      counts[t.type]++;
    });

    return { totalRevenue, counts };
  }, [transactions]);

  if (loading) {
    return (
      <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 p-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Transactions recentes</h3>
          {isLive && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-700">LIVE</span>
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Revenus</p>
          <p className={cn(
            'text-lg font-bold',
            stats.totalRevenue >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {stats.totalRevenue >= 0 ? '+' : ''}{formatCurrency(stats.totalRevenue)}
          </p>
        </div>
      </div>

      {/* Transaction list */}
      {displayedTransactions.length > 0 ? (
        <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
          {displayedTransactions.map((transaction, index) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              isNew={index === 0 && isLive}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>Aucune transaction recente</p>
        </div>
      )}

      {/* Footer stats */}
      {displayedTransactions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <span className="text-green-500">🎫</span>
                {stats.counts.ticket_sale} ventes
              </span>
              <span className="flex items-center gap-1">
                <span className="text-blue-500">💳</span>
                {stats.counts.cashless_topup} recharges
              </span>
            </div>
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <span className="text-purple-500">💰</span>
                {stats.counts.cashless_payment} paiements
              </span>
              <span className="flex items-center gap-1">
                <span className="text-red-500">↩️</span>
                {stats.counts.refund} remb.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecentTransactionsWidget;
