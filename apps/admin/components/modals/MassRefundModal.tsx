'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, ModalFooter } from './Modal';
import { cn, formatCurrency } from '../../lib/utils';
import { cashlessAdminApi } from '../../lib/api';
import type { CashlessAccount, CashlessMassRefundResponse } from '../../types';

interface MassRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  festivalId: string;
  festivalName: string;
  accounts: CashlessAccount[];
  onRefundComplete: (result: CashlessMassRefundResponse) => void;
}

export default function MassRefundModal({
  isOpen,
  onClose,
  festivalId,
  festivalName,
  accounts,
  onRefundComplete,
}: MassRefundModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<CashlessMassRefundResponse | null>(null);

  // Form state
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [refundAll, setRefundAll] = useState(true);
  const [reason, setReason] = useState('Remboursement fin de festival');
  const [confirmText, setConfirmText] = useState('');

  // Filter accounts with positive balance
  const accountsWithBalance = accounts.filter((a) => a.balance > 0 && a.status === 'active');
  const totalBalance = accountsWithBalance.reduce((sum, a) => sum + a.balance, 0);
  const selectedTotal = refundAll
    ? totalBalance
    : accountsWithBalance
        .filter((a) => selectedAccounts.has(a.id))
        .reduce((sum, a) => sum + a.balance, 0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAccounts(new Set());
      setRefundAll(true);
      setReason('Remboursement fin de festival');
      setConfirmText('');
      setSuccess(false);
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  const toggleAccount = useCallback((accountId: string) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedAccounts(new Set(accountsWithBalance.map((a) => a.id)));
  }, [accountsWithBalance]);

  const deselectAll = useCallback(() => {
    setSelectedAccounts(new Set());
  }, []);

  const handleSubmit = async () => {
    if (confirmText !== 'REMBOURSER') {
      setError('Veuillez taper REMBOURSER pour confirmer');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accountIds = refundAll ? undefined : Array.from(selectedAccounts);

      const refundResult = await cashlessAdminApi.massRefund({
        festivalId,
        accountIds,
        reason,
      });

      setResult(refundResult);
      setSuccess(true);
      onRefundComplete(refundResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du remboursement');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    confirmText === 'REMBOURSER' &&
    reason.trim().length > 0 &&
    (refundAll ? accountsWithBalance.length > 0 : selectedAccounts.size > 0);

  // No-op function for when close should be disabled
  const noop = () => undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? noop : onClose}
      title="Remboursement en masse"
      description={`Festival: ${festivalName}`}
      size="lg"
      closeOnOverlayClick={!loading}
      closeOnEsc={!loading}
    >
      {/* Warning Banner */}
      <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5"
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
          <div>
            <p className="text-sm font-medium text-orange-800 dark:text-orange-400">
              Attention: Cette action est irreversible
            </p>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
              Les soldes seront rembourses sur les moyens de paiement d&apos;origine. Cette
              operation peut prendre plusieurs minutes.
            </p>
          </div>
        </div>
      </div>

      {/* Success state */}
      {success && result && (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-600"
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
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Remboursement termine
            </p>
          </div>

          {/* Results Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{result.successCount}</p>
              <p className="text-sm text-gray-500 dark:text-white/60">Reussis</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{result.failedCount}</p>
              <p className="text-sm text-gray-500 dark:text-white/60">Echecs</p>
            </div>
            <div className="col-span-2 text-center pt-2 border-t border-gray-200 dark:border-white/10">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(result.totalAmountRefunded)}
              </p>
              <p className="text-sm text-gray-500 dark:text-white/60">Total rembourse</p>
            </div>
          </div>

          {/* Failed refunds details */}
          {result.failedCount > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-lg">
              <p className="text-sm font-medium text-red-800 dark:text-red-400 mb-2">
                Echecs de remboursement:
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {result.results
                  .filter((r) => !r.success)
                  .map((r) => (
                    <p key={r.accountId} className="text-xs text-red-700 dark:text-red-300">
                      {r.userName}: {r.error}
                    </p>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {error && !success && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form - only show if not in success state */}
      {!success && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
            <div>
              <p className="text-sm text-gray-500 dark:text-white/60">Comptes avec solde</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {accountsWithBalance.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-white/60">Total a rembourser</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(selectedTotal)}</p>
            </div>
          </div>

          {/* Refund Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              Comptes a rembourser
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="refundScope"
                  checked={refundAll}
                  onChange={() => setRefundAll(true)}
                  className="mr-2 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-white/80">
                  Tous les comptes avec solde ({accountsWithBalance.length} comptes -{' '}
                  {formatCurrency(totalBalance)})
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="refundScope"
                  checked={!refundAll}
                  onChange={() => setRefundAll(false)}
                  className="mr-2 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-white/80">
                  Selection personnalisee ({selectedAccounts.size} selectionnes)
                </span>
              </label>
            </div>
          </div>

          {/* Account Selection (when custom selection) */}
          {!refundAll && (
            <div className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                <span className="text-sm font-medium text-gray-700 dark:text-white/80">
                  Selectionner les comptes
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Tout selectionner
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Tout deselectionner
                  </button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {accountsWithBalance.map((account) => (
                  <label
                    key={account.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedAccounts.has(account.id)}
                        onChange={() => toggleAccount(account.id)}
                        className="text-primary-600 focus:ring-primary-500 rounded"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {account.userName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-white/60">
                          {account.userEmail}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(account.balance)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              Motif du remboursement
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Fin de festival, Annulation..."
              className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Confirmation */}
          <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-lg">
            <label className="block text-sm font-medium text-red-800 dark:text-red-400 mb-2">
              Pour confirmer, tapez REMBOURSER ci-dessous:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="REMBOURSER"
              className={cn(
                'w-full px-4 py-2 border rounded-lg bg-white dark:bg-white/5 focus:outline-none focus:ring-2',
                confirmText === 'REMBOURSER'
                  ? 'border-green-500 focus:ring-green-500 text-green-700 dark:text-green-400'
                  : 'border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-primary-500'
              )}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white font-medium hover:bg-gray-300 dark:hover:bg-white/20 transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {success ? 'Fermer' : 'Annuler'}
        </button>
        {!success && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className={cn(
              'px-4 py-2 rounded-xl font-medium text-white transition-colors min-h-[44px]',
              'bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Traitement...</span>
              </span>
            ) : (
              `Rembourser ${formatCurrency(selectedTotal)}`
            )}
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
}
