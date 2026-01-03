'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashlessApi } from '../../lib/api';
import { formatCurrency, formatDateTime, cn, debounce } from '../../lib/utils';
import type { CashlessSearchResult, CashlessTransaction } from '../../types';

export default function CashlessPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<CashlessSearchResult | null>(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRecipientQuery, setTransferRecipientQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<CashlessSearchResult | null>(null);

  // Search for accounts
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['cashless-search', searchQuery],
    queryFn: () => cashlessApi.search(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  // Get transactions for selected account
  const { data: transactionsData } = useQuery({
    queryKey: ['cashless-transactions', selectedAccount?.account.id],
    queryFn: () =>
      cashlessApi.getTransactions({
        accountId: selectedAccount?.account.id,
        limit: 50,
      }),
    enabled: !!selectedAccount && showHistoryModal,
  });

  // Search for transfer recipient
  const { data: recipientResults } = useQuery({
    queryKey: ['cashless-recipient-search', transferRecipientQuery],
    queryFn: () => cashlessApi.search(transferRecipientQuery),
    enabled: transferRecipientQuery.length >= 2,
  });

  // Top up mutation
  const topUpMutation = useMutation({
    mutationFn: (data: { accountId: string; amount: number }) =>
      cashlessApi.topUp({
        accountId: data.accountId,
        amount: data.amount,
        description: 'Recharge manuelle par admin',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashless-search'] });
      setShowTopUpModal(false);
      setTopUpAmount('');
      setSelectedAccount(null);
    },
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: (data: { fromAccountId: string; toAccountId: string; amount: number }) =>
      cashlessApi.transfer({
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        amount: data.amount,
        description: 'Transfert manuel par admin',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashless-search'] });
      setShowTransferModal(false);
      setTransferAmount('');
      setTransferRecipientQuery('');
      setSelectedRecipient(null);
      setSelectedAccount(null);
    },
  });

  // Update account status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (data: { accountId: string; status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' }) =>
      cashlessApi.updateAccountStatus(data.accountId, data.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashless-search'] });
    },
  });

  const handleSearch = debounce((query: string) => {
    setSearchQuery(query);
  }, 300);

  const handleTopUp = () => {
    if (!selectedAccount || !topUpAmount) return;
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) return;

    topUpMutation.mutate({
      accountId: selectedAccount.account.id,
      amount,
    });
  };

  const handleTransfer = () => {
    if (!selectedAccount || !selectedRecipient || !transferAmount) return;
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) return;

    transferMutation.mutate({
      fromAccountId: selectedAccount.account.id,
      toAccountId: selectedRecipient.account.id,
      amount,
    });
  };

  const handleToggleStatus = (account: CashlessSearchResult) => {
    const newStatus = account.account.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    updateStatusMutation.mutate({
      accountId: account.account.id,
      status: newStatus,
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      ACTIVE: 'badge-success',
      SUSPENDED: 'badge-warning',
      CLOSED: 'badge-neutral',
    };
    return colors[status as keyof typeof colors] || 'badge-neutral';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      ACTIVE: 'Actif',
      SUSPENDED: 'Suspendu',
      CLOSED: 'Ferme',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      TOPUP: 'badge-success',
      PAYMENT: 'badge-info',
      REFUND: 'badge-warning',
      TRANSFER_IN: 'badge-success',
      TRANSFER_OUT: 'badge-info',
    };
    return colors[type as keyof typeof colors] || 'badge-neutral';
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      TOPUP: 'Recharge',
      PAYMENT: 'Paiement',
      REFUND: 'Remboursement',
      TRANSFER_IN: 'Transfert recu',
      TRANSFER_OUT: 'Transfert envoye',
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion Cashless</h1>
        <p className="text-gray-500 mt-1">
          Recherchez et gerez les comptes cashless des utilisateurs.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rechercher un utilisateur
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Email, nom, prenom ou tag NFC..."
            className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            onChange={(e) => handleSearch(e.target.value)}
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Search Results */}
        {isSearching && (
          <div className="mt-4 text-center text-gray-500">Recherche en cours...</div>
        )}

        {searchResults && searchResults.length > 0 && (
          <div className="mt-4 space-y-3">
            {searchResults.map((result) => (
              <div
                key={result.account.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                {/* User Info */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {result.account.user?.firstName} {result.account.user?.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{result.account.user?.email}</p>
                    {result.account.nfcTagId && (
                      <p className="text-xs font-mono text-gray-400 mt-1">
                        NFC: {result.account.nfcTagId}
                      </p>
                    )}
                  </div>
                  <span className={cn('badge', getStatusColor(result.account.status))}>
                    {getStatusLabel(result.account.status)}
                  </span>
                </div>

                {/* Account Card */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-600 font-medium">Solde actuel</p>
                    <p className="text-xl font-bold text-green-700 mt-1">
                      {formatCurrency(result.account.balance)}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium">Total recharge</p>
                    <p className="text-lg font-semibold text-blue-700 mt-1">
                      {formatCurrency(result.totalTopUp)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 font-medium">Total depense</p>
                    <p className="text-lg font-semibold text-gray-700 mt-1">
                      {formatCurrency(result.totalSpent)}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-purple-600 font-medium">Derniere transaction</p>
                    <p className="text-xs text-purple-700 mt-1">
                      {result.lastTransaction
                        ? formatDateTime(result.lastTransaction.createdAt)
                        : 'Aucune'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedAccount(result);
                      setShowTopUpModal(true);
                    }}
                    className="btn-primary flex items-center gap-2 text-sm"
                    disabled={result.account.status !== 'ACTIVE'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Recharger
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAccount(result);
                      setShowTransferModal(true);
                    }}
                    className="btn-secondary flex items-center gap-2 text-sm"
                    disabled={result.account.status !== 'ACTIVE'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                    Transferer
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAccount(result);
                      setShowHistoryModal(true);
                    }}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Historique
                  </button>
                  <button
                    onClick={() => handleToggleStatus(result)}
                    className={cn(
                      'btn-secondary flex items-center gap-2 text-sm',
                      result.account.status === 'ACTIVE'
                        ? 'text-orange-600 hover:bg-orange-50'
                        : 'text-green-600 hover:bg-green-50'
                    )}
                  >
                    {result.account.status === 'ACTIVE' ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        </svg>
                        Suspendre
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Reactiver
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchResults && searchResults.length === 0 && searchQuery.length >= 2 && (
          <div className="mt-4 text-center text-gray-500">Aucun resultat trouve.</div>
        )}
      </div>

      {/* Top-up Modal */}
      {showTopUpModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Recharger le compte</h2>
              <button
                onClick={() => {
                  setShowTopUpModal(false);
                  setTopUpAmount('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Utilisateur</p>
                <p className="font-medium text-gray-900">
                  {selectedAccount.account.user?.firstName} {selectedAccount.account.user?.lastName}
                </p>
                <p className="text-sm text-gray-500">{selectedAccount.account.user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Solde actuel</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(selectedAccount.account.balance)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant a recharger (EUR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0.00"
                />
              </div>
              {topUpAmount && parseFloat(topUpAmount) > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-600">Nouveau solde</p>
                  <p className="text-xl font-bold text-blue-700">
                    {formatCurrency(selectedAccount.account.balance + parseFloat(topUpAmount))}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowTopUpModal(false);
                  setTopUpAmount('');
                }}
                className="btn-secondary"
                disabled={topUpMutation.isPending}
              >
                Annuler
              </button>
              <button
                onClick={handleTopUp}
                className="btn-primary"
                disabled={!topUpAmount || parseFloat(topUpAmount) <= 0 || topUpMutation.isPending}
              >
                {topUpMutation.isPending ? 'Traitement...' : 'Confirmer la recharge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Transferer des fonds</h2>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferAmount('');
                  setTransferRecipientQuery('');
                  setSelectedRecipient(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">De</p>
                <p className="font-medium text-gray-900">
                  {selectedAccount.account.user?.firstName} {selectedAccount.account.user?.lastName}
                </p>
                <p className="text-sm text-gray-500">
                  Solde: {formatCurrency(selectedAccount.account.balance)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rechercher le destinataire
                </label>
                <input
                  type="text"
                  value={transferRecipientQuery}
                  onChange={(e) => setTransferRecipientQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Email, nom ou tag NFC..."
                />
                {recipientResults && recipientResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    {recipientResults
                      .filter((r) => r.account.id !== selectedAccount.account.id)
                      .map((result) => (
                        <button
                          key={result.account.id}
                          onClick={() => {
                            setSelectedRecipient(result);
                            setTransferRecipientQuery('');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                        >
                          <p className="font-medium text-sm text-gray-900">
                            {result.account.user?.firstName} {result.account.user?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{result.account.user?.email}</p>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {selectedRecipient && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-600">Vers</p>
                  <p className="font-medium text-blue-900">
                    {selectedRecipient.account.user?.firstName} {selectedRecipient.account.user?.lastName}
                  </p>
                  <p className="text-xs text-blue-700">{selectedRecipient.account.user?.email}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant a transferer (EUR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={selectedAccount.account.balance}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferAmount('');
                  setTransferRecipientQuery('');
                  setSelectedRecipient(null);
                }}
                className="btn-secondary"
                disabled={transferMutation.isPending}
              >
                Annuler
              </button>
              <button
                onClick={handleTransfer}
                className="btn-primary"
                disabled={
                  !selectedRecipient ||
                  !transferAmount ||
                  parseFloat(transferAmount) <= 0 ||
                  parseFloat(transferAmount) > selectedAccount.account.balance ||
                  transferMutation.isPending
                }
              >
                {transferMutation.isPending ? 'Traitement...' : 'Confirmer le transfert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Historique des transactions</h2>
                <p className="text-sm text-gray-500">
                  {selectedAccount.account.user?.firstName} {selectedAccount.account.user?.lastName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedAccount(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {transactionsData && transactionsData.data.length > 0 ? (
                <div className="space-y-2">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solde apres</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactionsData.data.map((tx: CashlessTransaction) => (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDateTime(tx.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('badge text-xs', getTypeColor(tx.type))}>
                              {getTypeLabel(tx.type)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {tx.description || '-'}
                            {tx.vendor && (
                              <span className="block text-xs text-gray-400">{tx.vendor.name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span
                              className={cn(
                                'font-semibold',
                                tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                              )}
                            >
                              {tx.amount >= 0 ? '+' : ''}
                              {formatCurrency(tx.amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {formatCurrency(tx.balanceAfter)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={cn(
                                'badge text-xs',
                                tx.status === 'COMPLETED'
                                  ? 'badge-success'
                                  : tx.status === 'PENDING'
                                  ? 'badge-warning'
                                  : 'badge-danger'
                              )}
                            >
                              {tx.status === 'COMPLETED'
                                ? 'Complete'
                                : tx.status === 'PENDING'
                                ? 'En attente'
                                : tx.status === 'FAILED'
                                ? 'Echec'
                                : 'Annule'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">Aucune transaction trouvee.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
