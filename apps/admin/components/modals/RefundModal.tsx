'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, ModalFooter } from './Modal';
import { cn, formatCurrency } from '../../lib/utils';
import { paymentsApi } from '../../lib/api';
import type { Payment, RefundEligibility, RefundReason, RefundResponse } from '../../types';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  onRefundComplete: (refund: RefundResponse) => void;
}

const REFUND_REASONS: { value: RefundReason; label: string }[] = [
  { value: 'requested_by_customer', label: 'Demande client' },
  { value: 'event_cancelled', label: 'Evenement annule' },
  { value: 'event_postponed', label: 'Evenement reporte' },
  { value: 'duplicate', label: 'Paiement en double' },
  { value: 'fraudulent', label: 'Fraude' },
  { value: 'quality_issue', label: 'Probleme de qualite' },
  { value: 'partial_attendance', label: 'Participation partielle' },
  { value: 'other', label: 'Autre' },
];

export default function RefundModal({
  isOpen,
  onClose,
  payment,
  onRefundComplete,
}: RefundModalProps) {
  const [loading, setLoading] = useState(false);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibility, setEligibility] = useState<RefundEligibility | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [reason, setReason] = useState<RefundReason>('requested_by_customer');
  const [explanation, setExplanation] = useState('');

  // Check refund eligibility when modal opens
  const checkEligibility = useCallback(async () => {
    if (!payment) {
      return;
    }

    setEligibilityLoading(true);
    setError(null);

    try {
      const result = await paymentsApi.checkRefundEligibility(payment.id);
      setEligibility(result);

      if (!result.eligible) {
        setError(result.ineligibilityReason || 'Ce paiement ne peut pas etre rembourse');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la verification');
    } finally {
      setEligibilityLoading(false);
    }
  }, [payment]);

  useEffect(() => {
    if (isOpen && payment) {
      checkEligibility();
      // Reset form state
      setRefundType('full');
      setCustomAmount('');
      setReason('requested_by_customer');
      setExplanation('');
      setSuccess(false);
    }
  }, [isOpen, payment, checkEligibility]);

  const handleSubmit = async () => {
    if (!payment || !eligibility) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let refundAmount: number | undefined;

      if (refundType === 'partial') {
        const amountInCents = Math.round(parseFloat(customAmount) * 100);
        if (isNaN(amountInCents) || amountInCents <= 0) {
          throw new Error('Veuillez entrer un montant valide');
        }
        if (amountInCents > eligibility.maxRefundAmount) {
          throw new Error(
            `Le montant maximum remboursable est ${formatCurrency(eligibility.maxRefundAmount / 100, payment.currency)}`
          );
        }
        refundAmount = amountInCents;
      }

      const refund = await paymentsApi.createRefund({
        paymentId: payment.id,
        amount: refundAmount,
        reason,
        explanation: explanation || undefined,
      });

      setSuccess(true);
      onRefundComplete(refund);

      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du remboursement');
    } finally {
      setLoading(false);
    }
  };

  if (!payment) {
    return null;
  }

  const amountInEuros = payment.amount / 100;
  const maxRefundInEuros = eligibility ? eligibility.maxRefundAmount / 100 : amountInEuros;

  // No-op function for when close should be disabled
  const noop = () => undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? noop : onClose}
      title="Rembourser le paiement"
      size="md"
      closeOnOverlayClick={!loading}
      closeOnEsc={!loading}
    >
      {/* Payment Summary */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500 dark:text-white/60">Transaction</span>
          <span className="font-mono text-sm text-gray-900 dark:text-white">
            {payment.providerTransactionId}
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500 dark:text-white/60">Montant original</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(amountInEuros, payment.currency)}
          </span>
        </div>
        {eligibility && eligibility.refundedAmount > 0 && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-white/60">Deja rembourse</span>
            <span className="font-semibold text-orange-600">
              {formatCurrency(eligibility.refundedAmount / 100, payment.currency)}
            </span>
          </div>
        )}
        {eligibility && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/10">
            <span className="text-sm text-gray-500 dark:text-white/60">Maximum remboursable</span>
            <span className="font-semibold text-green-600">
              {formatCurrency(maxRefundInEuros, payment.currency)}
            </span>
          </div>
        )}
      </div>

      {/* Loading state for eligibility check */}
      {eligibilityLoading && (
        <div className="flex items-center justify-center py-8">
          <svg
            className="animate-spin h-8 w-8 text-primary-500"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
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
          <span className="ml-3 text-gray-600 dark:text-white/60">
            Verification de l&apos;eligibilite...
          </span>
        </div>
      )}

      {/* Success state */}
      {success && (
        <div className="flex flex-col items-center justify-center py-8">
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
            Remboursement effectue
          </p>
          <p className="text-sm text-gray-500 dark:text-white/60 mt-1">
            Le remboursement a ete traite avec succes.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !eligibilityLoading && !success && (
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

      {/* Form - only show if eligible and not in success/loading state */}
      {eligibility?.eligible && !eligibilityLoading && !success && (
        <div className="space-y-4">
          {/* Refund Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              Type de remboursement
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="refundType"
                  value="full"
                  checked={refundType === 'full'}
                  onChange={() => setRefundType('full')}
                  className="mr-2 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-white/80">
                  Remboursement complet ({formatCurrency(maxRefundInEuros, payment.currency)})
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="refundType"
                  value="partial"
                  checked={refundType === 'partial'}
                  onChange={() => setRefundType('partial')}
                  className="mr-2 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-white/80">
                  Remboursement partiel
                </span>
              </label>
            </div>
          </div>

          {/* Custom Amount (for partial refund) */}
          {refundType === 'partial' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                Montant a rembourser ({payment.currency.toUpperCase()})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.50"
                  max={maxRefundInEuros}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={`Max: ${maxRefundInEuros.toFixed(2)}`}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              Motif du remboursement
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as RefundReason)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {REFUND_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              Explication (optionnel)
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Ajouter des details supplementaires..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
              {explanation.length}/500 caracteres
            </p>
          </div>

          {/* Policy Info */}
          {eligibility.policy && (
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Politique de remboursement</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                <li>Pourcentage disponible: {eligibility.refundPercentage}%</li>
                <li>Delai de traitement: {eligibility.policy.processingTimeDays} jours</li>
                {eligibility.daysUntilEvent !== undefined && (
                  <li>Jours avant l&apos;evenement: {eligibility.daysUntilEvent}</li>
                )}
              </ul>
            </div>
          )}
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
        {eligibility?.eligible && !success && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || (refundType === 'partial' && !customAmount)}
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
              `Rembourser ${refundType === 'full' ? formatCurrency(maxRefundInEuros, payment.currency) : formatCurrency(parseFloat(customAmount) || 0, payment.currency)}`
            )}
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
}
