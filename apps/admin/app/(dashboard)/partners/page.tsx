'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import DataTable from '@/components/tables/DataTable';
import { mockFestivals } from '@/lib/mock-data';
import { partnersApi, festivalsApi } from '@/lib/api';
import { formatDateTime, cn } from '@/lib/utils';
import type { Partner, PartnerType, TableColumn, Festival } from '@/types';

interface PartnerFormData {
  name: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
  type: PartnerType;
  displayOrder: number;
  isActive: boolean;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  servicesProvided: string;
  notes: string;
  festivalId: string;
}

const emptyFormData: PartnerFormData = {
  name: '',
  description: '',
  logoUrl: '',
  websiteUrl: '',
  type: 'OTHER',
  displayOrder: 0,
  isActive: true,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  servicesProvided: '',
  notes: '',
  festivalId: '',
};

const partnerTypes: { value: PartnerType; label: string }[] = [
  { value: 'MEDIA', label: 'Media' },
  { value: 'TECHNOLOGY', label: 'Technologie' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'ACCOMMODATION', label: 'Hebergement' },
  { value: 'FOOD_BEVERAGE', label: 'Restauration' },
  { value: 'SECURITY', label: 'Securite' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'ARTIST_AGENCY', label: 'Agence artistique' },
  { value: 'OTHER', label: 'Autre' },
];

const typeColors: Record<PartnerType, string> = {
  MEDIA: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  TECHNOLOGY: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  TRANSPORT: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  ACCOMMODATION: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  FOOD_BEVERAGE: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  SECURITY: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  MEDICAL: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400',
  ARTIST_AGENCY: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400',
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [festivalFilter, setFestivalFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState<PartnerFormData>(emptyFormData);

  // Load festivals on mount
  useEffect(() => {
    const loadFestivals = async () => {
      try {
        const response = await festivalsApi.getAll({ limit: 100 });
        setFestivals(response.data || []);
        // Set default festival filter to first festival
        if (response.data && response.data.length > 0) {
          setFestivalFilter(response.data[0].id);
        }
      } catch {
        // Fallback to mock data if API fails
        setFestivals(mockFestivals);
        if (mockFestivals.length > 0) {
          setFestivalFilter(mockFestivals[0].id);
        }
      }
    };
    loadFestivals();
  }, []);

  // Load partners when festival filter changes
  useEffect(() => {
    const loadPartners = async () => {
      if (!festivalFilter) {
        setPartners([]);
        setIsPageLoading(false);
        return;
      }

      setIsPageLoading(true);
      try {
        const data = await partnersApi.getByFestival(festivalFilter, {
          activeOnly: false,
        });
        setPartners(data || []);
      } catch {
        // Set empty array on error
        setPartners([]);
      } finally {
        setIsPageLoading(false);
      }
    };
    loadPartners();
  }, [festivalFilter]);

  const resetForm = useCallback(
    (partner: Partner | null) => {
      if (partner) {
        setFormData({
          name: partner.name,
          description: partner.description || '',
          logoUrl: partner.logoUrl || '',
          websiteUrl: partner.websiteUrl || '',
          type: partner.type,
          displayOrder: partner.displayOrder,
          isActive: partner.isActive,
          contactName: partner.contactName || '',
          contactEmail: partner.contactEmail || '',
          contactPhone: partner.contactPhone || '',
          servicesProvided: partner.servicesProvided || '',
          notes: partner.notes || '',
          festivalId: partner.festivalId,
        });
      } else {
        setFormData({
          ...emptyFormData,
          festivalId: festivalFilter,
        });
      }
      setSaveError(null);
      setSaveSuccess(false);
    },
    [festivalFilter]
  );

  const handleOpenModal = useCallback(
    (partner: Partner | null) => {
      setSelectedPartner(partner);
      resetForm(partner);
      setShowModal(true);
    },
    [resetForm]
  );

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedPartner(null);
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      setSaveError('Le nom du partenaire est requis');
      return;
    }
    if (!formData.festivalId) {
      setSaveError('Veuillez selectionner un festival');
      return;
    }

    setIsLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const partnerData = {
        name: formData.name,
        description: formData.description || undefined,
        logoUrl: formData.logoUrl || undefined,
        websiteUrl: formData.websiteUrl || undefined,
        type: formData.type,
        displayOrder: formData.displayOrder,
        isActive: formData.isActive,
        contactName: formData.contactName || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        servicesProvided: formData.servicesProvided || undefined,
        notes: formData.notes || undefined,
      };

      if (selectedPartner) {
        // Update existing partner
        const updatedPartner = await partnersApi.update(selectedPartner.id, partnerData);
        setPartners((prev) => prev.map((p) => (p.id === selectedPartner.id ? updatedPartner : p)));
      } else {
        // Create new partner
        const newPartner = await partnersApi.create(formData.festivalId, partnerData);
        setPartners((prev) => [...prev, newPartner]);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        handleCloseModal();
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      setSaveError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [formData, selectedPartner, handleCloseModal]);

  const handleDelete = useCallback((partner: Partner) => {
    setPartnerToDelete(partner);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!partnerToDelete) return;

    setIsLoading(true);
    try {
      await partnersApi.delete(partnerToDelete.id);
      setPartners((prev) => prev.filter((p) => p.id !== partnerToDelete.id));
      setShowDeleteConfirm(false);
      setPartnerToDelete(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression';
      setSaveError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [partnerToDelete]);

  const handleToggleActive = useCallback(async (partner: Partner) => {
    try {
      const updatedPartner = await partnersApi.toggleActive(partner.id, !partner.isActive);
      setPartners((prev) => prev.map((p) => (p.id === partner.id ? updatedPartner : p)));
    } catch (error) {
      console.error('Error toggling partner status:', error);
    }
  }, []);

  // Filter partners
  const filteredPartners = partners.filter((p) => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    return true;
  });

  // Sort by displayOrder
  const sortedPartners = [...filteredPartners].sort((a, b) => a.displayOrder - b.displayOrder);

  const columns: TableColumn<Partner>[] = [
    {
      key: 'name',
      label: 'Partenaire',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/10 flex-shrink-0">
            {row.logoUrl ? (
              <Image src={row.logoUrl} alt={row.name} fill className="object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{row.name}</p>
            {row.websiteUrl && (
              <a
                href={row.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {row.websiteUrl.replace(/^https?:\/\//, '').slice(0, 30)}
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (value) => {
        const typeValue = value as PartnerType;
        const typeLabel = partnerTypes.find((t) => t.value === typeValue)?.label || typeValue;
        return <span className={cn('badge', typeColors[typeValue])}>{typeLabel}</span>;
      },
    },
    {
      key: 'contactName',
      label: 'Contact',
      render: (_, row) => (
        <div className="text-sm">
          {row.contactName && <p className="text-gray-900 dark:text-white">{row.contactName}</p>}
          {row.contactEmail && <p className="text-gray-500">{row.contactEmail}</p>}
        </div>
      ),
    },
    {
      key: 'displayOrder',
      label: 'Ordre',
      sortable: true,
      render: (value) => (
        <span className="text-gray-600 dark:text-gray-300">{value as number}</span>
      ),
    },
    {
      key: 'isActive',
      label: 'Statut',
      sortable: true,
      render: (value, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleActive(row);
          }}
          className={cn(
            'badge cursor-pointer transition-colors',
            value
              ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-200'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400 hover:bg-gray-200'
          )}
        >
          {value ? 'Actif' : 'Inactif'}
        </button>
      ),
    },
    {
      key: 'createdAt',
      label: 'Cree le',
      sortable: true,
      render: (value) => (
        <span className="text-gray-600 dark:text-gray-300">{formatDateTime(value as string)}</span>
      ),
    },
  ];

  const typeFilterOptions = [{ value: 'all', label: 'Tous les types' }, ...partnerTypes];

  // Stats
  const stats = {
    total: partners.length,
    active: partners.filter((p) => p.isActive).length,
    byType: partnerTypes.reduce(
      (acc, type) => {
        acc[type.value] = partners.filter((p) => p.type === type.value).length;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Partenaires</h1>
          <p className="text-gray-500 mt-1">Gerez les partenaires de vos festivals.</p>
        </div>
        <button
          onClick={() => handleOpenModal(null)}
          className="btn-primary flex items-center gap-2 w-fit"
          disabled={!festivalFilter}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un partenaire
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Total partenaires</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Actifs</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {stats.active}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Media</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {stats.byType.MEDIA || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500">Technologie</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {stats.byType.TECHNOLOGY || 0}
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
            <option value="">Selectionner un festival</option>
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
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {typeFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={sortedPartners}
        columns={columns}
        loading={isPageLoading}
        searchPlaceholder="Rechercher un partenaire..."
        onRowClick={(partner) => handleOpenModal(partner)}
        emptyMessage={!festivalFilter ? 'Selectionnez un festival' : 'Aucun partenaire'}
        actions={(partner) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModal(partner);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Modifier"
            >
              <svg
                className="w-4 h-4 text-gray-600 dark:text-gray-300"
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
                handleDelete(partner);
              }}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              title="Supprimer"
            >
              <svg
                className="w-4 h-4 text-red-600"
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

      {/* Partner Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="dark:bg-gray-900 bg-white border dark:border-white/10 border-gray-200 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-white/10 border-gray-200">
              <h2 className="text-lg font-semibold dark:text-white text-gray-900">
                {selectedPartner ? 'Modifier le partenaire' : 'Ajouter un partenaire'}
              </h2>
              <button
                onClick={handleCloseModal}
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
            <form className="p-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
              {/* Error message */}
              {saveError && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
                </div>
              )}

              {/* Success message */}
              {saveSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {selectedPartner
                      ? 'Partenaire mis a jour avec succes!'
                      : 'Partenaire cree avec succes!'}
                  </p>
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Nom *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={isLoading}
                    placeholder="Nom du partenaire"
                  />
                </div>
                <div>
                  <label className="form-label">Type</label>
                  <select
                    className="input-field"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, type: e.target.value as PartnerType }))
                    }
                    disabled={isLoading}
                  >
                    {partnerTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  disabled={isLoading}
                  placeholder="Description du partenariat"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">URL du logo</label>
                  <input
                    type="url"
                    className="input-field"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, logoUrl: e.target.value }))}
                    disabled={isLoading}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="form-label">Site web</label>
                  <input
                    type="url"
                    className="input-field"
                    value={formData.websiteUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, websiteUrl: e.target.value }))
                    }
                    disabled={isLoading}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="pt-4 border-t dark:border-white/10 border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Nom du contact</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.contactName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, contactName: e.target.value }))
                      }
                      disabled={isLoading}
                      placeholder="Nom complet"
                    />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="input-field"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))
                      }
                      disabled={isLoading}
                      placeholder="email@exemple.com"
                    />
                  </div>
                  <div>
                    <label className="form-label">Telephone</label>
                    <input
                      type="tel"
                      className="input-field"
                      value={formData.contactPhone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))
                      }
                      disabled={isLoading}
                      placeholder="+33..."
                    />
                  </div>
                </div>
              </div>

              {/* Services */}
              <div>
                <label className="form-label">Services fournis</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={formData.servicesProvided}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, servicesProvided: e.target.value }))
                  }
                  disabled={isLoading}
                  placeholder="Description des services..."
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="form-label">Notes internes</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  disabled={isLoading}
                  placeholder="Notes visibles uniquement par l'equipe..."
                />
              </div>

              {/* Display Order & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t dark:border-white/10 border-gray-200">
                <div>
                  <label className="form-label">Ordre d&apos;affichage</label>
                  <input
                    type="number"
                    className="input-field"
                    min={0}
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        displayOrder: parseInt(e.target.value) || 0,
                      }))
                    }
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">Plus petit = affiche en premier</p>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded dark:border-white/20 border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                      disabled={isLoading}
                    />
                    <span className="text-sm dark:text-white/70 text-gray-700">
                      Partenaire actif (visible publiquement)
                    </span>
                  </label>
                </div>
              </div>

              {/* Festival (for new partners) */}
              {!selectedPartner && (
                <div>
                  <label className="form-label">Festival *</label>
                  <select
                    className="input-field"
                    value={formData.festivalId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, festivalId: e.target.value }))
                    }
                    disabled={isLoading}
                  >
                    <option value="">Selectionner un festival</option>
                    {festivals.map((festival) => (
                      <option key={festival.id} value={festival.id}>
                        {festival.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </form>
            <div className="flex items-center justify-end gap-3 px-6 py-4 dark:bg-white/5 bg-gray-50 border-t dark:border-white/10 border-gray-200 rounded-b-xl">
              <button onClick={handleCloseModal} className="btn-secondary" disabled={isLoading}>
                Annuler
              </button>
              <button
                type="submit"
                onClick={handleSave}
                className="btn-primary flex items-center gap-2"
                disabled={isLoading || saveSuccess}
              >
                {isLoading && (
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
                {isLoading
                  ? 'Enregistrement...'
                  : saveSuccess
                    ? 'Enregistre!'
                    : selectedPartner
                      ? 'Enregistrer'
                      : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && partnerToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="dark:bg-gray-900 bg-white border dark:border-white/10 border-gray-200 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
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
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Supprimer le partenaire
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Etes-vous sur de vouloir supprimer <strong>{partnerToDelete.name}</strong> ?
                    Cette action est irreversible.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 dark:bg-white/5 bg-gray-50 border-t dark:border-white/10 border-gray-200 rounded-b-xl">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPartnerToDelete(null);
                }}
                className="btn-secondary"
                disabled={isLoading}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="btn-danger flex items-center gap-2"
                disabled={isLoading}
              >
                {isLoading && (
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
                {isLoading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
