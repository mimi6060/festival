'use client';

import { useState, useCallback } from 'react';
import DataTable from '@/components/tables/DataTable';
import {
  useAllVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
  useToggleVendorOpen,
  useFestivals,
} from '@/hooks';
import { cn } from '@/lib/utils';
import type { Vendor, VendorType, TableColumn } from '@/types';

// Vendor type configuration
const vendorTypeLabels: Record<VendorType, string> = {
  FOOD: 'Nourriture',
  DRINK: 'Boissons',
  BAR: 'Bar',
  MERCHANDISE: 'Merchandising',
};

const vendorTypeColors: Record<VendorType, string> = {
  FOOD: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400',
  DRINK: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400',
  BAR: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400',
  MERCHANDISE: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400',
};

const vendorTypeIcons: Record<VendorType, JSX.Element> = {
  FOOD: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ),
  DRINK: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
      />
    </svg>
  ),
  BAR: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  MERCHANDISE: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
      />
    </svg>
  ),
};

interface VendorFormData {
  name: string;
  type: VendorType;
  description: string;
  location: string;
  isOpen: boolean;
  festivalId: string;
}

const defaultFormData: VendorFormData = {
  name: '',
  type: 'FOOD',
  description: '',
  location: '',
  isOpen: true,
  festivalId: '',
};

export default function VendorsPage() {
  // Filters state
  const [typeFilter, setTypeFilter] = useState<VendorType | 'ALL'>('ALL');
  const [festivalFilter, setFestivalFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<VendorFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Build API params
  const apiParams = {
    ...(festivalFilter && { festivalId: festivalFilter }),
    ...(typeFilter !== 'ALL' && { type: typeFilter }),
    ...(statusFilter !== 'all' && { isOpen: statusFilter === 'open' }),
    limit: 100,
  };

  // API hooks
  const { data: vendorsData, isLoading, error } = useAllVendors(apiParams);
  const { data: festivals = [] } = useFestivals({ limit: 100 });
  const createVendorMutation = useCreateVendor();
  const updateVendorMutation = useUpdateVendor();
  const deleteVendorMutation = useDeleteVendor();
  const toggleVendorOpenMutation = useToggleVendorOpen();

  const vendors = vendorsData?.data ?? [];

  // Modal handlers
  const openCreateModal = useCallback(() => {
    setEditingVendor(null);
    setFormData(defaultFormData);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      type: vendor.type,
      description: vendor.description || '',
      location: vendor.location || '',
      isOpen: vendor.isOpen,
      festivalId: vendor.festivalId,
    });
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingVendor(null);
    setFormData(defaultFormData);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Le nom est requis');
      return;
    }

    if (!formData.festivalId) {
      alert('Le festival est requis');
      return;
    }

    try {
      if (editingVendor) {
        await updateVendorMutation.mutateAsync({
          id: editingVendor.id,
          data: {
            name: formData.name,
            type: formData.type,
            description: formData.description || undefined,
            location: formData.location || undefined,
            isOpen: formData.isOpen,
          },
        });
      } else {
        await createVendorMutation.mutateAsync({
          festivalId: formData.festivalId,
          data: {
            name: formData.name,
            type: formData.type,
            description: formData.description || undefined,
            location: formData.location || undefined,
            isOpen: formData.isOpen,
          },
        });
      }
      closeModal();
    } catch (err) {
      console.error('Error saving vendor:', err);
      alert("Erreur lors de l'enregistrement du vendeur");
    }
  };

  const handleDelete = async (vendorId: string) => {
    try {
      await deleteVendorMutation.mutateAsync(vendorId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error deleting vendor:', err);
      alert('Erreur lors de la suppression du vendeur');
    }
  };

  const toggleVendorStatus = async (vendor: Vendor) => {
    try {
      await toggleVendorOpenMutation.mutateAsync({
        id: vendor.id,
        isOpen: !vendor.isOpen,
      });
    } catch (err) {
      console.error('Error toggling vendor status:', err);
      alert('Erreur lors de la modification du statut');
    }
  };

  // Table columns
  const columns: TableColumn<Vendor>[] = [
    {
      key: 'name',
      label: 'Vendeur',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              row.type === 'FOOD'
                ? 'bg-orange-100 text-orange-600'
                : row.type === 'DRINK'
                  ? 'bg-blue-100 text-blue-600'
                  : row.type === 'BAR'
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-green-100 text-green-600'
            )}
          >
            {vendorTypeIcons[row.type]}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{row.name}</p>
            {row.description && (
              <p className="text-sm text-gray-500 dark:text-white/60 truncate max-w-xs">
                {row.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (value) => (
        <span className={cn('badge', vendorTypeColors[value as VendorType])}>
          {vendorTypeLabels[value as VendorType]}
        </span>
      ),
    },
    {
      key: 'festival',
      label: 'Festival',
      sortable: true,
      render: (_, row) => (
        <span className="text-gray-900 dark:text-white">{row.festival?.name || 'N/A'}</span>
      ),
    },
    {
      key: 'location',
      label: 'Emplacement',
      render: (value) => (
        <span className="text-gray-600 dark:text-white/70">{(value as string) || '-'}</span>
      ),
    },
    {
      key: 'isOpen',
      label: 'Statut',
      sortable: true,
      render: (value, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleVendorStatus(row);
          }}
          disabled={toggleVendorOpenMutation.isPending}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
            value
              ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-400'
              : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400'
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', value ? 'bg-green-500' : 'bg-red-500')} />
          {value ? 'Ouvert' : 'Ferme'}
        </button>
      ),
    },
  ];

  // Stats
  const stats = {
    total: vendors.length,
    open: vendors.filter((v) => v.isOpen).length,
    byType: {
      FOOD: vendors.filter((v) => v.type === 'FOOD').length,
      DRINK: vendors.filter((v) => v.type === 'DRINK').length,
      BAR: vendors.filter((v) => v.type === 'BAR').length,
      MERCHANDISE: vendors.filter((v) => v.type === 'MERCHANDISE').length,
    },
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Erreur</h2>
          <p className="mt-2 text-gray-500">Impossible de charger les vendeurs</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4">
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Vendeurs</h1>
          <p className="text-gray-500 mt-1">
            Gerez les bars, restaurants et boutiques de vos festivals.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 w-fit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau vendeur
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Ouverts</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.open}</p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center text-orange-600">
              {vendorTypeIcons.FOOD}
            </div>
            <p className="text-sm text-gray-500">Nourriture</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.byType.FOOD}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-600">
              {vendorTypeIcons.DRINK}
            </div>
            <p className="text-sm text-gray-500">Boissons</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.byType.DRINK}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center text-purple-600">
              {vendorTypeIcons.BAR}
            </div>
            <p className="text-sm text-gray-500">Bars</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.byType.BAR}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center text-green-600">
              {vendorTypeIcons.MERCHANDISE}
            </div>
            <p className="text-sm text-gray-500">Merch</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.byType.MERCHANDISE}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">Festival:</label>
          <select
            value={festivalFilter}
            onChange={(e) => setFestivalFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Tous les festivals</option>
            {festivals.map((festival) => (
              <option key={festival.id} value={festival.id}>
                {festival.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as VendorType | 'ALL')}
            className="px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">Tous les types</option>
            <option value="FOOD">Nourriture</option>
            <option value="DRINK">Boissons</option>
            <option value="BAR">Bar</option>
            <option value="MERCHANDISE">Merchandising</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">Statut:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'open' | 'closed')}
            className="px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tous</option>
            <option value="open">Ouverts</option>
            <option value="closed">Fermes</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={vendors}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Rechercher un vendeur..."
        emptyMessage="Aucun vendeur trouve"
        onRowClick={(vendor) => openEditModal(vendor)}
        actions={(vendor) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(vendor);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Modifier"
            >
              <svg
                className="w-4 h-4 text-gray-600 dark:text-white/70"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmId(vendor.id);
              }}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              title="Supprimer"
            >
              <svg
                className="w-4 h-4 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      />

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="dark:bg-gray-900 bg-white border dark:border-white/10 border-gray-200 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-white/10 border-gray-200">
              <h2 className="text-lg font-semibold dark:text-white text-gray-900">
                {editingVendor ? 'Modifier le vendeur' : 'Nouveau vendeur'}
              </h2>
              <button
                onClick={closeModal}
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

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium dark:text-white/70 text-gray-700 mb-1">
                  Nom du vendeur *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 dark:bg-white/5 bg-white border dark:border-white/10 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white text-gray-900"
                  placeholder="Ex: Food Truck BBQ"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-white/70 text-gray-700 mb-1">
                  Festival *
                </label>
                <select
                  value={formData.festivalId}
                  onChange={(e) => setFormData({ ...formData, festivalId: e.target.value })}
                  className="w-full px-3 py-2 dark:bg-white/5 bg-white border dark:border-white/10 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white text-gray-900"
                  required
                  disabled={!!editingVendor}
                >
                  <option value="">Selectionner un festival</option>
                  {festivals.map((festival) => (
                    <option key={festival.id} value={festival.id}>
                      {festival.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-white/70 text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as VendorType })}
                  className="w-full px-3 py-2 dark:bg-white/5 bg-white border dark:border-white/10 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white text-gray-900"
                >
                  <option value="FOOD">Nourriture</option>
                  <option value="DRINK">Boissons</option>
                  <option value="BAR">Bar</option>
                  <option value="MERCHANDISE">Merchandising</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-white/70 text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 dark:bg-white/5 bg-white border dark:border-white/10 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white text-gray-900"
                  rows={3}
                  placeholder="Description du vendeur..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-white/70 text-gray-700 mb-1">
                  Emplacement
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 dark:bg-white/5 bg-white border dark:border-white/10 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white text-gray-900"
                  placeholder="Ex: Zone A, Stand 12"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isOpen"
                  checked={formData.isOpen}
                  onChange={(e) => setFormData({ ...formData, isOpen: e.target.checked })}
                  className="w-4 h-4 rounded dark:border-white/20 border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isOpen" className="text-sm dark:text-white/70 text-gray-700">
                  Vendeur ouvert
                </label>
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 px-6 py-4 dark:bg-white/5 bg-gray-50 border-t dark:border-white/10 border-gray-200 rounded-b-xl">
              <button
                type="button"
                onClick={closeModal}
                className="btn-secondary"
                disabled={createVendorMutation.isPending || updateVendorMutation.isPending}
              >
                Annuler
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="btn-primary flex items-center gap-2"
                disabled={createVendorMutation.isPending || updateVendorMutation.isPending}
              >
                {(createVendorMutation.isPending || updateVendorMutation.isPending) && (
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {createVendorMutation.isPending || updateVendorMutation.isPending
                  ? 'Enregistrement...'
                  : editingVendor
                    ? 'Enregistrer'
                    : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="dark:bg-gray-900 bg-white border dark:border-white/10 border-gray-200 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600 dark:text-red-400"
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
                </div>
                <div>
                  <h3 className="text-lg font-semibold dark:text-white text-gray-900">
                    Supprimer le vendeur
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-white/60 mt-1">
                    Cette action est irreversible. Le vendeur sera supprime definitivement.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 dark:bg-white/5 bg-gray-50 border-t dark:border-white/10 border-gray-200 rounded-b-xl">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-secondary"
                disabled={deleteVendorMutation.isPending}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="btn-danger flex items-center gap-2"
                disabled={deleteVendorMutation.isPending}
              >
                {deleteVendorMutation.isPending && (
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {deleteVendorMutation.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
