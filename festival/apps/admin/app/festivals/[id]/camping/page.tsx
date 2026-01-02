'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { mockFestivals } from '../../../../lib/mock-data';
import { formatCurrency, formatNumber, cn } from '../../../../lib/utils';
import ConfirmModal from '../../../../components/modals/ConfirmModal';
import {
  useCampingZones,
  useCreateCampingZone,
  useUpdateCampingZone,
  useDeleteCampingZone,
} from '../../../../hooks';
import type { CampingZone, CreateCampingZoneDto, UpdateCampingZoneDto } from '../../../../types';

interface CampingPageProps {
  params: Promise<{ id: string }>;
}

interface ZoneFormData {
  name: string;
  description: string;
  type: CampingZone['type'];
  capacity: number;
  pricePerNight: number;
  amenities: string[];
  isActive: boolean;
}

const typeLabels: Record<CampingZone['type'], string> = {
  TENT: 'Tente',
  CARAVAN: 'Caravane',
  GLAMPING: 'Glamping',
  CABIN: 'Cabane',
  CAMPERVAN: 'Camping-car',
};

const typeColors: Record<CampingZone['type'], string> = {
  TENT: 'bg-green-100 text-green-700',
  CARAVAN: 'bg-blue-100 text-blue-700',
  GLAMPING: 'bg-purple-100 text-purple-700',
  CABIN: 'bg-amber-100 text-amber-700',
  CAMPERVAN: 'bg-orange-100 text-orange-700',
};

const typeIcons: Record<CampingZone['type'], JSX.Element> = {
  TENT: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3L2 21h20L12 3z" />
    </svg>
  ),
  CARAVAN: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16v-4a4 4 0 014-4h4a4 4 0 014 4v4M4 16h16M8 16a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  ),
  GLAMPING: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  CABIN: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  CAMPERVAN: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  ),
};

const amenityLabels: Record<string, string> = {
  toilets: 'Toilettes',
  showers: 'Douches',
  electricity: 'Electricite',
  water: 'Eau',
  wifi: 'WiFi',
  beds: 'Lits',
  private_toilet: 'Toilettes privees',
  kitchen: 'Cuisine',
  heating: 'Chauffage',
  parking: 'Parking',
};

const allAmenities = Object.keys(amenityLabels);

export default function CampingPage({ params }: CampingPageProps) {
  const { id } = use(params);
  const festival = mockFestivals.find((f) => f.id === id);

  // API Hooks
  const { data: zones = [], isLoading, error } = useCampingZones(id);
  const createZoneMutation = useCreateCampingZone();
  const updateZoneMutation = useUpdateCampingZone();
  const deleteZoneMutation = useDeleteCampingZone();

  // Local state
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<CampingZone | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<CampingZone | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [formData, setFormData] = useState<ZoneFormData>({
    name: '',
    description: '',
    type: 'TENT',
    capacity: 100,
    pricePerNight: 20,
    amenities: [],
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'TENT',
      capacity: 100,
      pricePerNight: 20,
      amenities: [],
      isActive: true,
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingZone(null);
    resetForm();
  };

  const openCreateModal = () => {
    setEditingZone(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (zone: CampingZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description,
      type: zone.type,
      capacity: zone.capacity,
      pricePerNight: zone.pricePerNight,
      amenities: zone.amenities,
      isActive: zone.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingZone) {
        // Update existing zone
        const updateData: UpdateCampingZoneDto = {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          capacity: formData.capacity,
          pricePerNight: formData.pricePerNight,
          amenities: formData.amenities,
          isActive: formData.isActive,
        };
        await updateZoneMutation.mutateAsync({ id: editingZone.id, data: updateData });
      } else {
        // Create new zone
        const createData: CreateCampingZoneDto = {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          capacity: formData.capacity,
          pricePerNight: formData.pricePerNight,
          amenities: formData.amenities,
          isActive: formData.isActive,
        };
        await createZoneMutation.mutateAsync({ festivalId: id, data: createData });
      }

      closeModal();
    } catch (error) {
      console.error('Error saving camping zone:', error);
      // You could add error toast notification here
    }
  };

  const handleDeleteZone = (zone: CampingZone) => {
    setZoneToDelete(zone);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (zoneToDelete) {
      try {
        await deleteZoneMutation.mutateAsync({ id: zoneToDelete.id, festivalId: id });
        setShowDeleteModal(false);
        setZoneToDelete(null);
      } catch (error) {
        console.error('Error deleting camping zone:', error);
        // You could add error toast notification here
      }
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des zones de camping...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Erreur de chargement</h2>
          <p className="mt-2 text-gray-600">Impossible de charger les zones de camping.</p>
          <Link href="/festivals" className="btn-primary mt-4 inline-block">
            Retour aux festivals
          </Link>
        </div>
      </div>
    );
  }

  const filteredZones = typeFilter === 'all' ? zones : zones.filter((z) => z.type === typeFilter);

  // Stats
  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);
  const totalAvailable = zones.reduce((sum, z) => sum + (z.spotsAvailable ?? z.capacity), 0);
  const activeZones = zones.filter((z) => z.isActive).length;
  const avgPricePerNight =
    zones.length > 0 ? zones.reduce((sum, z) => sum + z.pricePerNight, 0) / zones.length : 0;

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
        <span className="text-gray-900 font-medium">Camping</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion du camping</h1>
          <p className="text-gray-500 mt-1">{festival.name}</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 w-fit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle zone
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
          href={`/festivals/${id}/camping`}
          className="px-4 py-3 text-sm font-medium text-primary-600 border-b-2 border-primary-600 whitespace-nowrap"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Capacite totale</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totalCapacity)}</p>
          <p className="text-sm text-gray-500 mt-1">emplacements</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Places disponibles</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatNumber(totalAvailable)}</p>
          <p className="text-sm text-gray-500 mt-1">
            {totalCapacity > 0 ? Math.round((totalAvailable / totalCapacity) * 100) : 0}% libre
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Zones actives</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {activeZones} / {zones.length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Prix moyen / nuit</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(avgPricePerNight)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tous les types</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Zones Grid */}
      {filteredZones.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
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
              d="M12 3L2 21h20L12 3z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune zone de camping</h3>
          <p className="text-gray-500 mb-4">Commencez par creer une zone de camping.</p>
          <button onClick={openCreateModal} className="btn-primary">
            Creer une zone
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredZones.map((zone) => {
            const occupancyPercent =
              zone.capacity > 0
                ? ((zone.capacity - (zone.spotsAvailable ?? zone.capacity)) / zone.capacity) * 100
                : 0;

            return (
              <div
                key={zone.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div
                  className={cn(
                    'p-4 flex items-center gap-3',
                    zone.isActive ? 'bg-gray-50' : 'bg-gray-100'
                  )}
                >
                  <div className={cn('p-2 rounded-lg', typeColors[zone.type])}>
                    {typeIcons[zone.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{zone.name}</h3>
                    <span className={cn('badge text-xs', typeColors[zone.type])}>
                      {typeLabels[zone.type]}
                    </span>
                  </div>
                  <span
                    className={cn('badge', zone.isActive ? 'badge-success' : 'badge-neutral')}
                  >
                    {zone.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-2">{zone.description}</p>

                  {/* Price & Capacity */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Prix/nuit</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(zone.pricePerNight)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Capacite</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatNumber(zone.capacity)}
                      </p>
                    </div>
                  </div>

                  {/* Availability */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Disponibilite</span>
                      <span className="font-medium">
                        {formatNumber(zone.spotsAvailable ?? zone.capacity)} places
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          occupancyPercent >= 90
                            ? 'bg-red-500'
                            : occupancyPercent >= 70
                            ? 'bg-orange-500'
                            : 'bg-green-500'
                        )}
                        style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-1">
                    {zone.amenities.slice(0, 4).map((amenity) => (
                      <span
                        key={amenity}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
                      >
                        {amenityLabels[amenity] || amenity}
                      </span>
                    ))}
                    {zone.amenities.length > 4 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                        +{zone.amenities.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(zone)}
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
                    onClick={() => handleDeleteZone(zone)}
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
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingZone ? 'Modifier la zone' : 'Nouvelle zone de camping'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form id="zone-form" onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="form-label">Nom de la zone *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Zone Tentes Premium"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Description de la zone..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Type *</label>
                  <select
                    className="input-field"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as CampingZone['type'] })
                    }
                    required
                  >
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Capacite *</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="100"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Prix par nuit (EUR) *</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="20"
                  min="0"
                  step="0.01"
                  value={formData.pricePerNight}
                  onChange={(e) =>
                    setFormData({ ...formData, pricePerNight: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>
              <div>
                <label className="form-label">Equipements</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {allAmenities.map((amenity) => (
                    <label
                      key={amenity}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        checked={formData.amenities.includes(amenity)}
                        onChange={() => handleAmenityToggle(amenity)}
                      />
                      {amenityLabels[amenity]}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Zone active (visible et reservable)
                </label>
              </div>
            </form>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button type="button" onClick={closeModal} className="btn-secondary">
                Annuler
              </button>
              <button
                type="submit"
                form="zone-form"
                className="btn-primary"
                disabled={createZoneMutation.isPending || updateZoneMutation.isPending}
              >
                {createZoneMutation.isPending || updateZoneMutation.isPending
                  ? 'Enregistrement...'
                  : editingZone
                  ? 'Enregistrer'
                  : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Supprimer la zone"
        message={`Etes-vous sur de vouloir supprimer la zone "${zoneToDelete?.name}" ? Cette action est irreversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
}
