'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PromoCode, CreatePromoCodeDto, PromoCodeStats } from '@/types';

const ITEMS_PER_PAGE = 10;

export default function PromoCodesPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [selectedFestival, setSelectedFestival] = useState<string>('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  // Fetch promo codes with pagination
  const { data: promoCodes, isLoading } = useQuery({
    queryKey: ['promo-codes', selectedFestival, filterActive, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedFestival) {
        params.append('festivalId', selectedFestival);
      }
      if (filterActive !== null) {
        params.append('isActive', String(filterActive));
      }
      params.append('page', String(currentPage));
      params.append('limit', String(ITEMS_PER_PAGE));

      const response = await api.get<{
        data: PromoCode[];
        meta?: { page: number; totalPages: number; total: number };
      }>(`/promo-codes?${params.toString()}`);
      return response.data;
    },
  });

  // Reset to page 1 when filters change
  const handleFestivalChange = (value: string) => {
    setSelectedFestival(value);
    setCurrentPage(1);
  };

  const handleFilterActiveChange = (value: boolean | null) => {
    setFilterActive(value);
    setCurrentPage(1);
  };

  // Fetch festivals for dropdown
  const { data: festivals } = useQuery({
    queryKey: ['festivals'],
    queryFn: async () => {
      const response = await api.get<{ data: { id: string; name: string }[] }>('/festivals');
      return response.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreatePromoCodeDto) => {
      const response = await api.post<PromoCode>('/promo-codes', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      setIsCreating(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreatePromoCodeDto> }) => {
      const response = await api.patch<PromoCode>(`/promo-codes/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      setEditingCode(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/promo-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
    },
  });

  // Stats query
  const [statsCodeId, setStatsCodeId] = useState<string | null>(null);
  const { data: stats } = useQuery<PromoCodeStats>({
    queryKey: ['promo-code-stats', statsCodeId],
    queryFn: async (): Promise<PromoCodeStats> => {
      if (!statsCodeId) {
        throw new Error('No code ID');
      }
      const response = await api.get<PromoCodeStats>(`/promo-codes/${statsCodeId}/stats`);
      return response.data;
    },
    enabled: !!statsCodeId,
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: CreatePromoCodeDto = {
      code: formData.get('code') as string,
      discountType: formData.get('discountType') as 'PERCENTAGE' | 'FIXED_AMOUNT',
      discountValue: parseFloat(formData.get('discountValue') as string),
      maxUses: formData.get('maxUses') ? parseInt(formData.get('maxUses') as string) : undefined,
      minAmount: formData.get('minAmount')
        ? parseFloat(formData.get('minAmount') as string)
        : undefined,
      expiresAt: (formData.get('expiresAt') as string) || undefined,
      isActive: formData.get('isActive') === 'on',
      festivalId: (formData.get('festivalId') as string) || undefined,
    };

    if (editingCode) {
      updateMutation.mutate({ id: editingCode.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getDiscountDisplay = (code: PromoCode) => {
    if (code.discountType === 'PERCENTAGE') {
      return `${code.discountValue}%`;
    }
    return `${code.discountValue}€`;
  };

  const getUsageDisplay = (code: PromoCode) => {
    if (code.maxUses === null) {
      return `${code.currentUses} (illimité)`;
    }
    return `${code.currentUses} / ${code.maxUses}`;
  };

  const isExpired = (code: PromoCode) => {
    if (!code.expiresAt) {
      return false;
    }
    return new Date(code.expiresAt) < new Date();
  };

  const isExhausted = (code: PromoCode) => {
    if (code.maxUses === null) {
      return false;
    }
    return code.currentUses >= code.maxUses;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Codes Promo</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gérez les codes de réduction pour vos festivals
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Nouveau Code
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Festival
            </label>
            <select
              value={selectedFestival}
              onChange={(e) => handleFestivalChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Tous les festivals</option>
              <option value="null">Codes globaux</option>
              {festivals?.data?.map((festival: { id: string; name: string }) => (
                <option key={festival.id} value={festival.id}>
                  {festival.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Statut
            </label>
            <select
              value={filterActive === null ? '' : String(filterActive)}
              onChange={(e) =>
                handleFilterActiveChange(e.target.value === '' ? null : e.target.value === 'true')
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Tous</option>
              <option value="true">Actifs</option>
              <option value="false">Inactifs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {(isCreating || editingCode) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="dark:bg-gray-900 bg-white border dark:border-white/10 border-gray-200 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-white/10 border-gray-200">
              <h2 className="text-xl font-bold dark:text-white text-gray-900">
                {editingCode ? 'Modifier le code promo' : 'Créer un code promo'}
              </h2>
            </div>
            <div className="p-6">
              <form id="promo-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Code *
                    </label>
                    <input
                      type="text"
                      name="code"
                      defaultValue={editingCode?.code}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase"
                      placeholder="SUMMER2026"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type de réduction *
                    </label>
                    <select
                      name="discountType"
                      defaultValue={editingCode?.discountType || 'PERCENTAGE'}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="PERCENTAGE">Pourcentage</option>
                      <option value="FIXED_AMOUNT">Montant fixe</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Valeur de réduction *
                    </label>
                    <input
                      type="number"
                      name="discountValue"
                      defaultValue={editingCode?.discountValue}
                      required
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Utilisations max
                    </label>
                    <input
                      type="number"
                      name="maxUses"
                      defaultValue={editingCode?.maxUses || ''}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Illimité"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Montant minimum
                    </label>
                    <input
                      type="number"
                      name="minAmount"
                      defaultValue={editingCode?.minAmount || ''}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Aucun minimum"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date d'expiration
                    </label>
                    <input
                      type="datetime-local"
                      name="expiresAt"
                      defaultValue={
                        editingCode?.expiresAt
                          ? new Date(editingCode.expiresAt).toISOString().slice(0, 16)
                          : ''
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Festival
                    </label>
                    <select
                      name="festivalId"
                      defaultValue={editingCode?.festivalId || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Tous les festivals</option>
                      {festivals?.data?.map((festival: { id: string; name: string }) => (
                        <option key={festival.id} value={festival.id}>
                          {festival.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={editingCode?.isActive ?? true}
                      id="isActive"
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label
                      htmlFor="isActive"
                      className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      Code actif
                    </label>
                  </div>
                </div>
              </form>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 dark:bg-white/5 bg-gray-50 border-t dark:border-white/10 border-gray-200 rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingCode(null);
                }}
                className="px-4 py-2 dark:bg-white/10 bg-white border dark:border-white/10 border-gray-300 dark:text-white text-gray-700 rounded-xl hover:dark:bg-white/20 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="promo-form"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {editingCode ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {statsCodeId && stats && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="dark:bg-gray-900 bg-white border dark:border-white/10 border-gray-200 rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b dark:border-white/10 border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold dark:text-white text-gray-900">
                  Statistiques - {stats.code}
                </h2>
                <button
                  onClick={() => setStatsCodeId(null)}
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
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Utilisations</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.currentUses} {stats.maxUses !== null && `/ ${stats.maxUses}`}
                  </div>
                </div>

                {stats.maxUses !== null && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Taux d'utilisation
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.usageRate.toFixed(1)}%
                    </div>
                  </div>
                )}

                {stats.remainingUses !== null && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Restant</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.remainingUses}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Statut</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {stats.isActive && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Actif
                      </span>
                    )}
                    {stats.isExpired && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                        Expiré
                      </span>
                    )}
                    {stats.isExhausted && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                        Épuisé
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 dark:bg-white/5 bg-gray-50 border-t dark:border-white/10 border-gray-200 rounded-b-xl">
              <button
                onClick={() => setStatsCodeId(null)}
                className="px-4 py-2 dark:bg-white/10 bg-white border dark:border-white/10 border-gray-300 dark:text-white text-gray-700 rounded-xl hover:dark:bg-white/20 hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promo Codes List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : !promoCodes?.data || promoCodes.data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun code promo trouvé</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Réduction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Utilisations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Festival
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Expire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {promoCodes.data.map((code: PromoCode) => (
                  <tr
                    key={code.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-gray-900 dark:text-white">
                        {code.code}
                      </span>
                      {code.minAmount && (
                        <div className="text-xs text-gray-500">Min: {code.minAmount}€</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                        {getDiscountDisplay(code)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {getUsageDisplay(code)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {code.festival?.name || <span className="text-gray-500">Global</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {code.expiresAt ? (
                        <span className={isExpired(code) ? 'text-red-600' : ''}>
                          {new Date(code.expiresAt).toLocaleDateString('fr-FR')}
                        </span>
                      ) : (
                        <span className="text-gray-500">Jamais</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {code.isActive ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            Actif
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                            Inactif
                          </span>
                        )}
                        {isExpired(code) && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                            Expiré
                          </span>
                        )}
                        {isExhausted(code) && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                            Épuisé
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setStatsCodeId(code.id)}
                        className="text-indigo-600 hover:text-indigo-900 dark:hover:text-indigo-400 mr-3"
                      >
                        Stats
                      </button>
                      <button
                        onClick={() => setEditingCode(code)}
                        className="text-indigo-600 hover:text-indigo-900 dark:hover:text-indigo-400 mr-3"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer le code ${code.code} ?`)) {
                            deleteMutation.mutate(code.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {promoCodes?.meta && promoCodes.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between px-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} sur {promoCodes.meta.totalPages}
            {promoCodes.meta.total !== undefined && (
              <span className="ml-2">({promoCodes.meta.total} resultats)</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Previous button */}
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Page numbers */}
            {(() => {
              const totalPages = promoCodes.meta?.totalPages || 1;
              const pages: (number | string)[] = [];

              if (totalPages <= 7) {
                // Show all pages if 7 or fewer
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Always show first page
                pages.push(1);

                if (currentPage > 3) {
                  pages.push('...');
                }

                // Show pages around current
                const start = Math.max(2, currentPage - 1);
                const end = Math.min(totalPages - 1, currentPage + 1);

                for (let i = start; i <= end; i++) {
                  pages.push(i);
                }

                if (currentPage < totalPages - 2) {
                  pages.push('...');
                }

                // Always show last page
                pages.push(totalPages);
              }

              return pages.map((page, index) =>
                typeof page === 'string' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                    {page}
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded ${
                      page === currentPage
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {page}
                  </button>
                )
              );
            })()}

            {/* Next button */}
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === promoCodes.meta?.totalPages}
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
