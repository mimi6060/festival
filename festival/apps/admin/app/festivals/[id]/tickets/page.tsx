'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { mockFestivals } from '../../../../lib/mock-data';
import { formatCurrency, formatDate, formatNumber, formatPercentage } from '../../../../lib/utils';
import { useTicketCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../../../../hooks';
import type { TicketCategory } from '../../../../types';

interface TicketsPageProps {
  params: Promise<{ id: string }>;
}

interface CategoryFormData {
  name: string;
  description: string;
  price: number;
  quantity: number;
  maxPerOrder: number;
  salesStart: string;
  salesEnd: string;
  isActive: boolean;
}

export default function TicketsPage({ params }: TicketsPageProps) {
  const { id } = use(params);
  const festival = mockFestivals.find((f) => f.id === id);

  // API hooks
  const { data: categories = [], isLoading, error } = useTicketCategories(id);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TicketCategory | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    price: 0,
    quantity: 100,
    maxPerOrder: 4,
    salesStart: '',
    salesEnd: '',
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      quantity: 100,
      maxPerOrder: 4,
      salesStart: '',
      salesEnd: '',
      isActive: true,
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    resetForm();
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (category: TicketCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      price: category.price,
      quantity: category.quantity,
      maxPerOrder: category.maxPerOrder,
      salesStart: category.salesStart?.split('T')[0] || '',
      salesEnd: category.salesEnd?.split('T')[0] || '',
      isActive: category.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const categoryData = {
      name: formData.name,
      description: formData.description,
      price: formData.price,
      quantity: formData.quantity,
      maxPerOrder: formData.maxPerOrder,
      salesStart: formData.salesStart + 'T00:00:00Z',
      salesEnd: formData.salesEnd + 'T23:59:59Z',
      isActive: formData.isActive,
    };

    try {
      if (editingCategory) {
        // Update existing category
        await updateMutation.mutateAsync({
          festivalId: id,
          categoryId: editingCategory.id,
          data: categoryData,
        });
      } else {
        // Create new category
        await createMutation.mutateAsync({
          festivalId: id,
          data: categoryData,
        });
      }
      closeModal();
    } catch (err) {
      console.error('Failed to save category:', err);
      // Error handling - could show a toast notification here
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (confirm('Etes-vous sur de vouloir supprimer cette categorie ?')) {
      try {
        await deleteMutation.mutateAsync({
          festivalId: id,
          categoryId,
        });
      } catch (err) {
        console.error('Failed to delete category:', err);
        // Error handling - could show a toast notification here
      }
    }
  };

  // Filter categories by status
  const filteredCategories = statusFilter === 'all'
    ? categories
    : statusFilter === 'active'
    ? categories.filter((c) => c.isActive)
    : categories.filter((c) => !c.isActive);

  const statusOptions = [
    { value: 'all', label: 'Toutes les categories' },
    { value: 'active', label: 'Actives' },
    { value: 'inactive', label: 'Inactives' },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement des categories...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-500 mb-4">{error.message || 'Une erreur est survenue'}</p>
          <Link href="/festivals" className="btn-primary inline-block">
            Retour aux festivals
          </Link>
        </div>
      </div>
    );
  }

  if (!festival) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Festival non trouve</h2>
          <Link href="/festivals" className="btn-primary mt-4 inline-block">
            Retour aux festivals
          </Link>
        </div>
      </div>
    );
  }

  const totalSold = categories.reduce((sum, c) => sum + c.sold, 0);
  const totalCapacity = categories.reduce((sum, c) => sum + c.quantity, 0);
  const totalRevenue = categories.reduce((sum, c) => sum + c.sold * c.price, 0);

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/festivals" className="text-gray-500 hover:text-gray-700">
          Festivals
        </Link>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/festivals/${id}`} className="text-gray-500 hover:text-gray-700">
          {festival.name}
        </Link>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">Billets</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des billets</h1>
          <p className="text-gray-500 mt-1">{festival.name}</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={isMutating}
          className="btn-primary flex items-center gap-2 w-fit disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter une categorie
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
        <Link
          href={`/festivals/${id}`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Vue d&apos;ensemble
        </Link>
        <Link
          href={`/festivals/${id}/tickets`}
          className="px-4 py-3 text-sm font-medium text-primary-600 border-b-2 border-primary-600 whitespace-nowrap"
        >
          Billets
        </Link>
        <Link
          href={`/festivals/${id}/lineup`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Lineup
        </Link>
        <Link
          href={`/festivals/${id}/pois`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Points d&apos;interet
        </Link>
        <Link
          href={`/festivals/${id}/vendors`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Vendeurs
        </Link>
        <Link
          href={`/festivals/${id}/stages`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Scenes
        </Link>
        <Link
          href={`/festivals/${id}/camping`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Camping
        </Link>
        <Link
          href={`/festivals/${id}/stats`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Statistiques
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Total vendus</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatNumber(totalSold)} / {formatNumber(totalCapacity)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {totalCapacity > 0 ? formatPercentage((totalSold / totalCapacity) * 100) : '0%'} de remplissage
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Revenus generes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Categories actives</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {categories.filter((c) => c.isActive).length} / {categories.length}
          </p>
        </div>
      </div>

      {/* Filter */}
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
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Categories de billets</h2>
        </div>
        {filteredCategories.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune categorie</h3>
            <p className="text-gray-500 mb-4">Commencez par creer une categorie de billets.</p>
            <button
              onClick={openCreateModal}
              disabled={isMutating}
              className="btn-primary disabled:opacity-50"
            >
              Creer une categorie
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredCategories.map((category) => {
              const soldPercent = category.quantity > 0 ? (category.sold / category.quantity) * 100 : 0;
              const revenue = category.sold * category.price;

              return (
                <div key={category.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        <span className={`badge ${category.isActive ? 'badge-success' : 'badge-neutral'}`}>
                          {category.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{category.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Prix: </span>
                          <span className="font-medium text-gray-900">{formatCurrency(category.price)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Max/commande: </span>
                          <span className="font-medium text-gray-900">{category.maxPerOrder}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Ventes: </span>
                          <span className="font-medium text-gray-900">
                            {formatDate(category.salesStart, { day: 'numeric', month: 'short' })} - {formatDate(category.salesEnd, { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      {category.benefits && category.benefits.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {category.benefits.map((benefit, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                              {benefit}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center gap-4">
                      <div className="min-w-[180px]">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-500">{formatNumber(category.sold)} / {formatNumber(category.quantity)}</span>
                          <span className="font-medium text-gray-900">{formatPercentage(soldPercent)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              soldPercent >= 90 ? 'bg-red-500' : soldPercent >= 70 ? 'bg-orange-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(soldPercent, 100)}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Revenus: {formatCurrency(revenue)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(category)}
                          disabled={isMutating}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Modifier"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          disabled={isMutating}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Modifier la categorie' : 'Nouvelle categorie'}
              </h2>
              <button
                onClick={closeModal}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form id="category-form" onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="form-label">Nom de la categorie *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Pass VIP"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Description de la categorie..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Prix (EUR) *</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    required
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
                <div>
                  <label className="form-label">Quantite *</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="100"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    required
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Max par commande *</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="4"
                  min="1"
                  value={formData.maxPerOrder}
                  onChange={(e) => setFormData({ ...formData, maxPerOrder: parseInt(e.target.value) || 1 })}
                  required
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Debut des ventes *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.salesStart}
                    onChange={(e) => setFormData({ ...formData, salesStart: e.target.value })}
                    required
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
                <div>
                  <label className="form-label">Fin des ventes *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.salesEnd}
                    onChange={(e) => setFormData({ ...formData, salesEnd: e.target.value })}
                    required
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Categorie active (visible et achetable)
                </label>
              </div>

              {/* Error message */}
              {(createMutation.error || updateMutation.error) && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {(createMutation.error as Error)?.message || (updateMutation.error as Error)?.message || 'Une erreur est survenue'}
                </div>
              )}
            </form>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                type="button"
                onClick={closeModal}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-secondary disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="category-form"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary disabled:opacity-50 flex items-center gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {editingCategory ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
