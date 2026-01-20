'use client';

import { useState, useCallback } from 'react';
import DataTable from '@/components/tables/DataTable';
import ExportButton from '@/components/export/ExportButton';
import RefundModal from '@/components/modals/RefundModal';
import { mockPayments, mockOrders } from '@/lib/mock-data';
import { paymentExportColumns } from '@/lib/export';
import { formatCurrency, formatDateTime, cn, getStatusColor, getStatusLabel } from '@/lib/utils';
import type { Payment, TableColumn, RefundResponse } from '@/types';

export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [_dateRange, _setDateRange] = useState<string>('30d');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);
  const [payments, setPayments] = useState(mockPayments);

  const enrichedPayments = payments.map((p) => ({
    ...p,
    order: mockOrders.find((o) => o.id === p.orderId),
  }));

  // Handle refund completion - update payment status in UI
  const handleRefundComplete = useCallback((refund: RefundResponse) => {
    // Update the payment status in our local state
    setPayments((prev) =>
      prev.map((p) => (p.id === refund.paymentId ? { ...p, status: 'refunded' as const } : p))
    );
    // Close the detail modal if it was open
    setSelectedPayment(null);
  }, []);

  const filteredPayments =
    statusFilter === 'all'
      ? enrichedPayments
      : enrichedPayments.filter((p) => p.status === statusFilter);

  const totalRevenue = enrichedPayments
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = enrichedPayments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const refundedAmount = enrichedPayments
    .filter((p) => p.status === 'refunded')
    .reduce((sum, p) => sum + p.amount, 0);

  const columns: TableColumn<Payment>[] = [
    {
      key: 'providerTransactionId',
      label: 'Transaction',
      sortable: true,
      render: (value) => <span className="font-mono text-sm text-gray-900">{value as string}</span>,
    },
    {
      key: 'order',
      label: 'Commande',
      render: (_, row) => (
        <div className="text-sm">
          <p className="text-gray-900">{row.order?.orderNumber || '-'}</p>
          {row.order?.user && <p className="text-gray-500">Client #{row.order.userId}</p>}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Montant',
      sortable: true,
      render: (value, row) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(value as number, row.currency)}
        </span>
      ),
    },
    {
      key: 'provider',
      label: 'Methode',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          {value === 'stripe' ? (
            <svg className="w-5 h-5 text-[#635BFF]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[#003087]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.645h5.778c2.727 0 4.753.588 6.023 1.747 1.205 1.1 1.66 2.693 1.352 4.738-.018.122-.04.252-.065.39a9.832 9.832 0 0 1-.145.741c-.679 2.858-2.314 4.666-4.868 5.375-.737.204-1.564.306-2.461.306H8.935a.769.769 0 0 0-.759.645l-.93 5.612a.64.64 0 0 1-.632.549h-.538z" />
            </svg>
          )}
          <span className="text-sm text-gray-600 capitalize">{value as string}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (value) => (
        <span className={cn('badge', getStatusColor(value as string))}>
          {getStatusLabel(value as string)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      render: (value) => <span className="text-gray-600">{formatDateTime(value as string)}</span>,
    },
  ];

  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'pending', label: 'En attente' },
    { value: 'succeeded', label: 'Reussi' },
    { value: 'failed', label: 'Echoue' },
    { value: 'refunded', label: 'Rembourse' },
  ];

  const dateRangeOptions = [
    { value: '7d', label: '7 derniers jours' },
    { value: '30d', label: '30 derniers jours' },
    { value: '90d', label: '90 derniers jours' },
    { value: 'all', label: 'Toutes les dates' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
          <p className="text-gray-500 mt-1">Suivez et gerez toutes les transactions de paiement.</p>
        </div>
        <ExportButton
          data={filteredPayments as unknown as Record<string, unknown>[]}
          columns={paymentExportColumns}
          filename="paiements"
          formats={['csv', 'excel']}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Revenus totaux</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">En attente</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(pendingAmount)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rembourses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(refundedAmount)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600"
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
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{enrichedPayments.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Statut:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Periode:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {dateRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={filteredPayments}
        columns={columns}
        searchPlaceholder="Rechercher une transaction..."
        onRowClick={(payment) => setSelectedPayment(payment)}
        actions={(payment) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPayment(payment);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
            {payment.status === 'succeeded' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRefundPayment(payment);
                }}
                className="p-2 hover:bg-orange-50 rounded-lg transition-colors"
                title="Rembourser"
              >
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
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      />

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="dark:bg-gray-900 bg-white border dark:border-white/10 border-gray-200 rounded-xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b dark:border-white/10 border-gray-200">
              <h2 className="text-lg font-semibold dark:text-white text-gray-900">
                Detail du paiement
              </h2>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-2 dark:text-white/50 text-gray-400 hover:dark:text-white hover:text-gray-600 hover:dark:bg-white/5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between py-3 border-b dark:border-white/10 border-gray-100">
                <span className="dark:text-white/60 text-gray-500">ID Transaction</span>
                <span className="font-mono dark:text-white text-gray-900">
                  {selectedPayment.providerTransactionId}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b dark:border-white/10 border-gray-100">
                <span className="dark:text-white/60 text-gray-500">Montant</span>
                <span className="text-xl font-bold dark:text-white text-gray-900">
                  {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b dark:border-white/10 border-gray-100">
                <span className="dark:text-white/60 text-gray-500">Statut</span>
                <span className={cn('badge', getStatusColor(selectedPayment.status))}>
                  {getStatusLabel(selectedPayment.status)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b dark:border-white/10 border-gray-100">
                <span className="dark:text-white/60 text-gray-500">Methode</span>
                <span className="dark:text-white text-gray-900 capitalize">
                  {selectedPayment.provider}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b dark:border-white/10 border-gray-100">
                <span className="dark:text-white/60 text-gray-500">Commande</span>
                <span className="dark:text-white text-gray-900">
                  {selectedPayment.order?.orderNumber || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b dark:border-white/10 border-gray-100">
                <span className="dark:text-white/60 text-gray-500">Date de creation</span>
                <span className="dark:text-white text-gray-900">
                  {formatDateTime(selectedPayment.createdAt)}
                </span>
              </div>
              {selectedPayment.completedAt && (
                <div className="flex items-center justify-between py-3">
                  <span className="dark:text-white/60 text-gray-500">Date de completion</span>
                  <span className="dark:text-white text-gray-900">
                    {formatDateTime(selectedPayment.completedAt)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 dark:bg-white/5 bg-gray-50 border-t dark:border-white/10 border-gray-200 rounded-b-xl">
              <button onClick={() => setSelectedPayment(null)} className="btn-secondary">
                Fermer
              </button>
              {selectedPayment.status === 'succeeded' && (
                <button
                  onClick={() => {
                    setRefundPayment(selectedPayment);
                  }}
                  className="btn-danger"
                >
                  Rembourser
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      <RefundModal
        isOpen={!!refundPayment}
        onClose={() => setRefundPayment(null)}
        payment={refundPayment}
        onRefundComplete={handleRefundComplete}
      />
    </div>
  );
}
