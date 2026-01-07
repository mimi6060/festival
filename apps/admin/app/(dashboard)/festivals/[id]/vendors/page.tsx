'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { mockFestivals } from '../../../../lib/mock-data';
import {
  useVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
  useToggleVendorOpen,
} from '../../../../hooks';
import type { VendorType, Vendor } from '../../../../types';

interface VendorsPageProps {
  params: Promise<{ id: string }>;
}

const vendorTypeLabels: Record<VendorType, string> = {
  FOOD: 'Nourriture',
  DRINK: 'Boissons',
  BAR: 'Bar',
  MERCHANDISE: 'Merchandising',
};

const vendorTypeColors: Record<VendorType, string> = {
  FOOD: 'bg-orange-100 text-orange-800',
  DRINK: 'bg-blue-100 text-blue-800',
  BAR: 'bg-purple-100 text-purple-800',
  MERCHANDISE: 'bg-green-100 text-green-800',
};

const vendorTypeIcons: Record<VendorType, JSX.Element> = {
  FOOD: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  DRINK: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  BAR: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  MERCHANDISE: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
};

export default function VendorsPage({ params }: VendorsPageProps) {
  const { id } = use(params);
  const festival = mockFestivals.find((f) => f.id === id || f.slug === id);

  // API hooks
  const { data: vendors = [], isLoading, error } = useVendors(id);
  const createVendorMutation = useCreateVendor();
  const updateVendorMutation = useUpdateVendor();
  const deleteVendorMutation = useDeleteVendor();
  const toggleVendorOpenMutation = useToggleVendorOpen();

  // Local state
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<{ id: string; name: string; type: VendorType; description?: string; location?: string; isOpen: boolean } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'FOOD' as VendorType,
    description: '',
    location: '',
    isOpen: true,
  });
  const [filterType, setFilterType] = useState<VendorType | 'ALL'>('ALL');

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Chargement des vendeurs...</p>
        </div>
      </div>
    );
  }

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

  const openCreateModal = () => {
    setEditingVendor(null);
    setFormData({
      name: '',
      type: 'FOOD',
      description: '',
      location: '',
      isOpen: true,
    });
    setShowModal(true);
  };

  const openEditModal = (vendor: { id: string; name: string; type: VendorType; description?: string; location?: string; isOpen: boolean }) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      type: vendor.type,
      description: vendor.description || '',
      location: vendor.location || '',
      isOpen: vendor.isOpen,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingVendor) {
        // Update existing vendor
        await updateVendorMutation.mutateAsync({
          id: editingVendor.id,
          data: formData,
        });
      } else {
        // Create new vendor
        await createVendorMutation.mutateAsync({
          festivalId: id,
          data: formData,
        });
      }

      setShowModal(false);
      setEditingVendor(null);
    } catch (error) {
      console.error('Error saving vendor:', error);
      alert('Erreur lors de l\'enregistrement du vendeur');
    }
  };

  const handleDelete = async (vendorId: string) => {
    if (confirm('Etes-vous sur de vouloir supprimer ce vendeur ?')) {
      try {
        await deleteVendorMutation.mutateAsync(vendorId);
      } catch (error) {
        console.error('Error deleting vendor:', error);
        alert('Erreur lors de la suppression du vendeur');
      }
    }
  };

  const toggleVendorStatus = async (vendorId: string, currentStatus: boolean) => {
    try {
      await toggleVendorOpenMutation.mutateAsync({
        id: vendorId,
        isOpen: !currentStatus,
      });
    } catch (error) {
      console.error('Error toggling vendor status:', error);
      alert('Erreur lors de la modification du statut');
    }
  };

  const filteredVendors = filterType === 'ALL'
    ? vendors
    : vendors.filter((v: Vendor) => v.type === filterType);

  const openVendorsCount = vendors.filter((v: Vendor) => v.isOpen).length;
  const vendorsByType = {
    FOOD: vendors.filter((v: Vendor) => v.type === 'FOOD').length,
    DRINK: vendors.filter((v: Vendor) => v.type === 'DRINK').length,
    BAR: vendors.filter((v: Vendor) => v.type === 'BAR').length,
    MERCHANDISE: vendors.filter((v: Vendor) => v.type === 'MERCHANDISE').length,
  };

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
        <span className="text-gray-900 font-medium">Vendeurs</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendeurs - {festival.name}</h1>
          <p className="text-gray-500 mt-1">{vendors.length} vendeurs configures</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un vendeur
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
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
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
          href={`/festivals/${id}/vendors`}
          className="px-4 py-3 text-sm font-medium text-primary-600 border-b-2 border-primary-600 whitespace-nowrap"
        >
          Vendeurs
        </Link>
        <Link
          href={`/festivals/${id}/stats`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Statistiques
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ouverts</p>
              <p className="text-xl font-bold text-gray-900">{openVendorsCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              {vendorTypeIcons.FOOD}
            </div>
            <div>
              <p className="text-sm text-gray-500">Nourriture</p>
              <p className="text-xl font-bold text-gray-900">{vendorsByType.FOOD}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              {vendorTypeIcons.BAR}
            </div>
            <div>
              <p className="text-sm text-gray-500">Bars</p>
              <p className="text-xl font-bold text-gray-900">{vendorsByType.BAR}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              {vendorTypeIcons.DRINK}
            </div>
            <div>
              <p className="text-sm text-gray-500">Boissons</p>
              <p className="text-xl font-bold text-gray-900">{vendorsByType.DRINK}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Filtrer par type:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filterType === 'ALL'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tous
          </button>
          {(['FOOD', 'DRINK', 'BAR', 'MERCHANDISE'] as VendorType[]).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filterType === type
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {vendorTypeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun vendeur</h3>
            <p className="text-gray-500 mb-4">Commencez par ajouter un vendeur.</p>
            <button onClick={openCreateModal} className="btn-primary">
              Ajouter un vendeur
            </button>
          </div>
        ) : (
          filteredVendors.map((vendor: Vendor) => (
            <div
              key={vendor.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  vendor.type === 'FOOD' ? 'bg-orange-100 text-orange-600' :
                  vendor.type === 'DRINK' ? 'bg-blue-100 text-blue-600' :
                  vendor.type === 'BAR' ? 'bg-purple-100 text-purple-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  {vendorTypeIcons[vendor.type]}
                </div>
                <button
                  onClick={() => toggleVendorStatus(vendor.id, vendor.isOpen)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    vendor.isOpen ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={vendor.isOpen}
                  title={vendor.isOpen ? 'Marquer comme ferme' : 'Marquer comme ouvert'}
                  disabled={toggleVendorOpenMutation.isPending}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      vendor.isOpen ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${vendorTypeColors[vendor.type]}`}>
                    {vendorTypeLabels[vendor.type]}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{vendor.description}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {vendor.location}
                </div>
                <div className="flex items-center gap-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    vendor.isOpen
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {vendor.isOpen ? 'Ouvert' : 'Ferme'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => openEditModal(vendor)}
                  className="flex-1 btn-secondary text-sm py-2"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(vendor.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingVendor ? 'Modifier le vendeur' : 'Ajouter un vendeur'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du vendeur *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: Food Truck BBQ"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as VendorType })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="FOOD">Nourriture</option>
                  <option value="DRINK">Boissons</option>
                  <option value="BAR">Bar</option>
                  <option value="MERCHANDISE">Merchandising</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Description du vendeur..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emplacement *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: Zone A, Stand 12"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isOpen"
                  checked={formData.isOpen}
                  onChange={(e) => setFormData({ ...formData, isOpen: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isOpen" className="text-sm text-gray-700">
                  Vendeur ouvert
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                  disabled={createVendorMutation.isPending || updateVendorMutation.isPending}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={createVendorMutation.isPending || updateVendorMutation.isPending}
                >
                  {createVendorMutation.isPending || updateVendorMutation.isPending
                    ? 'Enregistrement...'
                    : editingVendor
                    ? 'Enregistrer'
                    : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
