'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { mockFestivals } from '@/lib/mock-data';
import { usePois, useCreatePoi, useUpdatePoi, useDeletePoi } from '@/hooks';
import type { Poi, PoiType, CreatePoiDto, UpdatePoiDto } from '@/types';

interface PoisPageProps {
  params: Promise<{ id: string }>;
}

// POI Types configuration with labels and icons
const POI_TYPES: { type: PoiType; label: string; icon: string; color: string }[] = [
  {
    type: 'STAGE',
    label: 'Scene',
    icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3',
    color: 'text-purple-600 bg-purple-50',
  },
  {
    type: 'FOOD',
    label: 'Restauration',
    icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
    color: 'text-orange-600 bg-orange-50',
  },
  {
    type: 'DRINK',
    label: 'Boissons',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    type: 'TOILET',
    label: 'Toilettes',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    color: 'text-cyan-600 bg-cyan-50',
  },
  {
    type: 'MEDICAL',
    label: 'Medical',
    icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    color: 'text-red-600 bg-red-50',
  },
  {
    type: 'INFO',
    label: 'Information',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'text-indigo-600 bg-indigo-50',
  },
  {
    type: 'ATM',
    label: 'Distributeur',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    color: 'text-green-600 bg-green-50',
  },
  {
    type: 'PARKING',
    label: 'Parking',
    icon: 'M8 7h4a4 4 0 014 4 4 4 0 01-4 4H8V7zm0 0v10',
    color: 'text-slate-600 bg-slate-50',
  },
  {
    type: 'CAMPING',
    label: 'Camping',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    type: 'ENTRANCE',
    label: 'Entree',
    icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1',
    color: 'text-teal-600 bg-teal-50',
  },
  {
    type: 'EXIT',
    label: 'Sortie',
    icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
    color: 'text-rose-600 bg-rose-50',
  },
  {
    type: 'CHARGING',
    label: 'Recharge',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    color: 'text-yellow-600 bg-yellow-50',
  },
  {
    type: 'LOCKER',
    label: 'Consigne',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    color: 'text-amber-600 bg-amber-50',
  },
];

interface PoiFormData {
  name: string;
  type: PoiType;
  description: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

function getPoiTypeConfig(type: PoiType) {
  return POI_TYPES.find((t) => t.type === type) || POI_TYPES[0];
}

export default function PoisPage({ params }: PoisPageProps) {
  const { id } = use(params);
  const festival = mockFestivals.find((f) => f.id === id || f.slug === id);

  // Fetch POIs using the hook
  const { data: pois = [], isLoading, error } = usePois(id);

  // Mutations
  const createPoiMutation = useCreatePoi();
  const updatePoiMutation = useUpdatePoi();
  const deletePoiMutation = useDeletePoi();

  const [showModal, setShowModal] = useState(false);
  const [editingPoi, setEditingPoi] = useState<Poi | null>(null);
  const [filterType, setFilterType] = useState<PoiType | 'all'>('all');
  const [formData, setFormData] = useState<PoiFormData>({
    name: '',
    type: 'INFO',
    description: '',
    latitude: 48.8566,
    longitude: 2.3522,
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'INFO',
      description: '',
      latitude: 48.8566,
      longitude: 2.3522,
      isActive: true,
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPoi(null);
    resetForm();
  };

  const openCreateModal = () => {
    setEditingPoi(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (poi: Poi) => {
    setEditingPoi(poi);
    setFormData({
      name: poi.name,
      type: poi.type,
      description: poi.description || '',
      latitude: poi.latitude,
      longitude: poi.longitude,
      isActive: poi.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPoi) {
        // Update existing POI
        const updateData: UpdatePoiDto = {
          name: formData.name,
          type: formData.type,
          description: formData.description || undefined,
          latitude: formData.latitude,
          longitude: formData.longitude,
          isActive: formData.isActive,
        };
        await updatePoiMutation.mutateAsync({ id: editingPoi.id, data: updateData });
      } else {
        // Create new POI
        const createData: CreatePoiDto = {
          name: formData.name,
          type: formData.type,
          description: formData.description || undefined,
          latitude: formData.latitude,
          longitude: formData.longitude,
          isActive: formData.isActive,
        };
        await createPoiMutation.mutateAsync({ festivalId: id, data: createData });
      }

      closeModal();
    } catch (error) {
      console.error('Error saving POI:', error);
      alert("Une erreur est survenue lors de l'enregistrement du point d'interet.");
    }
  };

  const handleDelete = async (poiId: string) => {
    if (confirm("Etes-vous sur de vouloir supprimer ce point d'interet ?")) {
      try {
        await deletePoiMutation.mutateAsync({ id: poiId, festivalId: id });
      } catch (error) {
        console.error('Error deleting POI:', error);
        alert("Une erreur est survenue lors de la suppression du point d'interet.");
      }
    }
  };

  const toggleActive = async (poiId: string) => {
    const poi = pois.find((p: Poi) => p.id === poiId);
    if (!poi) {
      return;
    }

    try {
      await updatePoiMutation.mutateAsync({
        id: poiId,
        data: { isActive: !poi.isActive },
      });
    } catch (error) {
      console.error('Error toggling POI active status:', error);
      alert("Une erreur est survenue lors de la modification du statut du point d'interet.");
    }
  };

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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement des points d&apos;interet...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Erreur</h2>
          <p className="text-gray-500 mt-2">Impossible de charger les points d&apos;interet.</p>
          <p className="text-sm text-gray-400 mt-1">
            {error instanceof Error ? error.message : 'Erreur inconnue'}
          </p>
        </div>
      </div>
    );
  }

  // Filter POIs by type
  const filteredPois =
    filterType === 'all' ? pois : pois.filter((poi: Poi) => poi.type === filterType);

  // Group POIs by type
  const groupedPois = POI_TYPES.reduce(
    (acc, { type }) => {
      const poisOfType = filteredPois.filter((poi: Poi) => poi.type === type);
      if (poisOfType.length > 0) {
        acc[type] = poisOfType;
      }
      return acc;
    },
    {} as Record<PoiType, Poi[]>
  );

  const totalActive = pois.filter((p: Poi) => p.isActive).length;
  const totalPois = pois.length;
  const typesUsed = new Set(pois.map((p: Poi) => p.type)).size;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/festivals" className="text-gray-500 hover:text-gray-700">
          Festivals
        </Link>
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/festivals/${id}`} className="text-gray-500 hover:text-gray-700">
          {festival.name}
        </Link>
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">Points d&apos;interet</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Points d&apos;interet</h1>
          <p className="text-gray-500 mt-1">{festival.name}</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 w-fit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un point
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
          href={`/festivals/${id}/pois`}
          className="px-4 py-3 text-sm font-medium text-primary-600 border-b-2 border-primary-600 whitespace-nowrap"
        >
          Points d&apos;interet
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
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
          <p className="text-sm text-gray-500">Total points</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalPois}</p>
          <p className="text-sm text-gray-500 mt-1">{totalActive} actifs</p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
          <p className="text-sm text-gray-500">Types utilises</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {typesUsed} / {POI_TYPES.length}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
          <p className="text-sm text-gray-500">Points inactifs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalPois - totalActive}</p>
        </div>
      </div>

      {/* Filter by Type */}
      <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Filtrer par type:</span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filterType === 'all'
                ? 'bg-primary-100 text-primary-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tous
          </button>
          {POI_TYPES.map(({ type, label }) => {
            const count = pois.filter((p: Poi) => p.type === type).length;
            if (count === 0) {
              return null;
            }
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filterType === type
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* POIs List Grouped by Type */}
      {Object.entries(groupedPois).length === 0 ? (
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-12 text-center">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun point d&apos;interet</h3>
          <p className="text-gray-500 mb-4">
            Commencez par ajouter des points d&apos;interet sur la carte.
          </p>
          <button onClick={openCreateModal} className="btn-primary">
            Ajouter un point
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPois).map(([type, pois]) => {
            const config = getPoiTypeConfig(type as PoiType);
            return (
              <div
                key={type}
                className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={config.icon}
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{config.label}</h2>
                    <p className="text-sm text-gray-500">
                      {pois.length} point{pois.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {pois.map((poi) => (
                    <div key={poi.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-gray-900">{poi.name}</h3>
                            <span
                              className={`badge ${poi.isActive ? 'badge-success' : 'badge-neutral'}`}
                            >
                              {poi.isActive ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                          {poi.description && (
                            <p className="text-sm text-gray-500 mb-2">{poi.description}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            Coordonnees: {poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleActive(poi.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              poi.isActive
                                ? 'hover:bg-yellow-50 text-yellow-600'
                                : 'hover:bg-green-50 text-green-600'
                            }`}
                            title={poi.isActive ? 'Desactiver' : 'Activer'}
                          >
                            {poi.isActive ? (
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => openEditModal(poi)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <svg
                              className="w-5 h-5 text-gray-600"
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
                            onClick={() => handleDelete(poi.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <svg
                              className="w-5 h-5 text-red-600"
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="dark:bg-gray-900 bg-white border dark:border-white/10 border-gray-200 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-white/10 border-gray-200">
              <h2 className="text-lg font-semibold dark:text-white text-gray-900">
                {editingPoi ? "Modifier le point d'interet" : "Nouveau point d'interet"}
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
            <form id="poi-form" onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="form-label">Nom du point *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Toilettes Zone Nord"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">Type *</label>
                <select
                  className="input-field"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as PoiType })}
                  required
                >
                  {POI_TYPES.map(({ type, label }) => (
                    <option key={type} value={type}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Description du point d'interet..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Latitude *</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="48.8566"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Longitude *</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="2.3522"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  className="w-4 h-4 rounded dark:border-white/20 border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <label htmlFor="isActive" className="text-sm dark:text-white/70 text-gray-700">
                  Point actif (visible sur la carte)
                </label>
              </div>
            </form>
            <div className="flex items-center justify-end gap-3 px-6 py-4 dark:bg-white/5 bg-gray-50 border-t dark:border-white/10 border-gray-200 rounded-b-xl">
              <button
                type="button"
                onClick={closeModal}
                className="btn-secondary"
                disabled={createPoiMutation.isPending || updatePoiMutation.isPending}
              >
                Annuler
              </button>
              <button
                type="submit"
                form="poi-form"
                className="btn-primary"
                disabled={createPoiMutation.isPending || updatePoiMutation.isPending}
              >
                {createPoiMutation.isPending || updatePoiMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Enregistrement...
                  </span>
                ) : editingPoi ? (
                  'Enregistrer'
                ) : (
                  'Creer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
