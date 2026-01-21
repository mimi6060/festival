'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import DataTable from '@/components/tables/DataTable';
import { Modal, ModalFooter } from '@/components/modals/Modal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import {
  useSponsors,
  useCreateSponsor,
  useUpdateSponsor,
  useDeleteSponsor,
  useToggleSponsorActive,
  useFestivals,
} from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Sponsor, SponsorTier, TableColumn, CreateSponsorDto } from '@/types';

// Tier configuration
const tierConfig: Record<SponsorTier, { label: string; color: string; bgColor: string }> = {
  PLATINUM: {
    label: 'Platinum',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-500/20',
  },
  GOLD: {
    label: 'Gold',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-500/20',
  },
  SILVER: {
    label: 'Silver',
    color: 'text-gray-700 dark:text-gray-400',
    bgColor: 'bg-gray-200 dark:bg-gray-500/20',
  },
  BRONZE: {
    label: 'Bronze',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-500/20',
  },
  PARTNER: {
    label: 'Partner',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-500/20',
  },
};

const tierOrder: SponsorTier[] = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'PARTNER'];

interface SponsorFormData {
  name: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
  tier: SponsorTier;
  displayOrder: number;
  isActive: boolean;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  startDate: string;
  endDate: string;
  sponsorshipAmount: string;
  benefits: string;
  notes: string;
}

const initialFormData: SponsorFormData = {
  name: '',
  description: '',
  logoUrl: '',
  websiteUrl: '',
  tier: 'PARTNER',
  displayOrder: 0,
  isActive: true,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  startDate: '',
  endDate: '',
  sponsorshipAmount: '',
  benefits: '',
  notes: '',
};

export default function SponsorsPage() {
  // Festival selection
  const { data: festivals = [], isLoading: festivalsLoading } = useFestivals();
  const [selectedFestivalId, setSelectedFestivalId] = useState<string>('');

  // Filters
  const [tierFilter, setTierFilter] = useState<SponsorTier | 'ALL'>('ALL');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [formData, setFormData] = useState<SponsorFormData>(initialFormData);

  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sponsorToDelete, setSponsorToDelete] = useState<Sponsor | null>(null);

  // API hooks
  const {
    data: sponsors = [],
    isLoading: sponsorsLoading,
    error: sponsorsError,
  } = useSponsors(selectedFestivalId);
  const createSponsorMutation = useCreateSponsor();
  const updateSponsorMutation = useUpdateSponsor();
  const deleteSponsorMutation = useDeleteSponsor();
  const toggleActiveMutation = useToggleSponsorActive();

  // Set first festival as default when loaded
  useMemo(() => {
    if (festivals.length > 0 && !selectedFestivalId) {
      setSelectedFestivalId(festivals[0].id);
    }
  }, [festivals, selectedFestivalId]);

  // Filter and sort sponsors
  const filteredSponsors = useMemo(() => {
    let result = [...sponsors];

    // Filter by tier
    if (tierFilter !== 'ALL') {
      result = result.filter((s) => s.tier === tierFilter);
    }

    // Sort by tier order, then by displayOrder
    result.sort((a, b) => {
      const tierDiff = tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
      if (tierDiff !== 0) return tierDiff;
      return a.displayOrder - b.displayOrder;
    });

    return result;
  }, [sponsors, tierFilter]);

  // Open modal for creating
  const openCreateModal = () => {
    setEditingSponsor(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  // Open modal for editing
  const openEditModal = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setFormData({
      name: sponsor.name,
      description: sponsor.description || '',
      logoUrl: sponsor.logoUrl || '',
      websiteUrl: sponsor.websiteUrl || '',
      tier: sponsor.tier,
      displayOrder: sponsor.displayOrder,
      isActive: sponsor.isActive,
      contactName: sponsor.contactName || '',
      contactEmail: sponsor.contactEmail || '',
      contactPhone: sponsor.contactPhone || '',
      startDate: sponsor.startDate ? sponsor.startDate.split('T')[0] : '',
      endDate: sponsor.endDate ? sponsor.endDate.split('T')[0] : '',
      sponsorshipAmount: sponsor.sponsorshipAmount?.toString() || '',
      benefits: sponsor.benefits || '',
      notes: sponsor.notes || '',
    });
    setShowModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData: CreateSponsorDto = {
      name: formData.name,
      description: formData.description || undefined,
      logoUrl: formData.logoUrl || undefined,
      websiteUrl: formData.websiteUrl || undefined,
      tier: formData.tier,
      displayOrder: formData.displayOrder,
      isActive: formData.isActive,
      contactName: formData.contactName || undefined,
      contactEmail: formData.contactEmail || undefined,
      contactPhone: formData.contactPhone || undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      sponsorshipAmount: formData.sponsorshipAmount
        ? parseFloat(formData.sponsorshipAmount)
        : undefined,
      benefits: formData.benefits || undefined,
      notes: formData.notes || undefined,
    };

    try {
      if (editingSponsor) {
        await updateSponsorMutation.mutateAsync({
          id: editingSponsor.id,
          data: submitData,
        });
      } else {
        await createSponsorMutation.mutateAsync({
          festivalId: selectedFestivalId,
          data: submitData,
        });
      }
      setShowModal(false);
      setEditingSponsor(null);
    } catch (error) {
      console.error('Error saving sponsor:', error);
    }
  };

  // Handle delete
  const handleDeleteClick = (sponsor: Sponsor) => {
    setSponsorToDelete(sponsor);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (sponsorToDelete) {
      try {
        await deleteSponsorMutation.mutateAsync(sponsorToDelete.id);
        setDeleteModalOpen(false);
        setSponsorToDelete(null);
      } catch (error) {
        console.error('Error deleting sponsor:', error);
      }
    }
  };

  // Toggle active status
  const handleToggleActive = async (sponsor: Sponsor) => {
    try {
      await toggleActiveMutation.mutateAsync({
        id: sponsor.id,
        isActive: !sponsor.isActive,
      });
    } catch (error) {
      console.error('Error toggling sponsor status:', error);
    }
  };

  // Table columns
  const columns: TableColumn<Sponsor>[] = [
    {
      key: 'name',
      label: 'Sponsor',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/10 flex-shrink-0">
            {row.logoUrl ? (
              <Image src={row.logoUrl} alt={row.name} fill className="object-contain p-1" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-white/40">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="text-xs text-primary-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {row.websiteUrl.replace(/^https?:\/\//, '').split('/')[0]}
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'tier',
      label: 'Niveau',
      sortable: true,
      render: (value) => {
        const tier = value as SponsorTier;
        const config = tierConfig[tier];
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'sponsorshipAmount',
      label: 'Montant',
      sortable: true,
      render: (value) =>
        value ? (
          <span className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(value as number)}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-white/40">-</span>
        ),
    },
    {
      key: 'startDate',
      label: 'Periode',
      sortable: true,
      render: (_, row) => (
        <div className="text-sm">
          {row.startDate ? (
            <>
              <p className="text-gray-900 dark:text-white">
                {formatDate(row.startDate, { day: 'numeric', month: 'short' })}
              </p>
              {row.endDate && (
                <p className="text-gray-500 dark:text-white/60">
                  au {formatDate(row.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </>
          ) : (
            <span className="text-gray-400 dark:text-white/40">Non defini</span>
          )}
        </div>
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
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            value ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
          }`}
          role="switch"
          aria-checked={value as boolean}
          disabled={toggleActiveMutation.isPending}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              value ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      ),
    },
    {
      key: 'displayOrder',
      label: 'Ordre',
      sortable: true,
      render: (value) => (
        <span className="text-gray-600 dark:text-white/70">{value as number}</span>
      ),
    },
  ];

  // Stats
  const stats = useMemo(() => {
    const byTier = tierOrder.reduce(
      (acc, tier) => {
        acc[tier] = sponsors.filter((s) => s.tier === tier).length;
        return acc;
      },
      {} as Record<SponsorTier, number>
    );
    const activeCount = sponsors.filter((s) => s.isActive).length;
    const totalAmount = sponsors.reduce((sum, s) => sum + (s.sponsorshipAmount || 0), 0);
    return { byTier, activeCount, totalAmount };
  }, [sponsors]);

  const isLoading = festivalsLoading || sponsorsLoading;
  const isSaving = createSponsorMutation.isPending || updateSponsorMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sponsors</h1>
          <p className="text-gray-500 dark:text-white/60 mt-1">
            Gerez les sponsors et partenaires de vos festivals.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!selectedFestivalId}
          className="btn-primary flex items-center gap-2 w-fit disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau sponsor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-white/70">Festival:</label>
          <select
            value={selectedFestivalId}
            onChange={(e) => setSelectedFestivalId(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {festivals.map((festival) => (
              <option key={festival.id} value={festival.id}>
                {festival.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-white/70">Niveau:</label>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as SponsorTier | 'ALL')}
            className="px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">Tous les niveaux</option>
            {tierOrder.map((tier) => (
              <option key={tier} value={tier}>
                {tierConfig[tier].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {tierOrder.map((tier) => (
          <div
            key={tier}
            className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${tierConfig[tier].bgColor}`}
              >
                <span className={`text-lg font-bold ${tierConfig[tier].color}`}>
                  {stats.byTier[tier]}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-white/60">{tierConfig[tier].label}</p>
              </div>
            </div>
          </div>
        ))}
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
              <span className="text-lg font-bold text-green-700 dark:text-green-400">
                {stats.activeCount}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-white/60">Actifs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Total Amount */}
      {stats.totalAmount > 0 && (
        <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl p-4 text-white">
          <p className="text-sm opacity-80">Total des sponsorisations</p>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
        </div>
      )}

      {/* Error State */}
      {sponsorsError && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
          <p className="text-red-700 dark:text-red-400">
            Erreur lors du chargement des sponsors. Veuillez reessayer.
          </p>
        </div>
      )}

      {/* Table */}
      <DataTable
        data={filteredSponsors}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Rechercher un sponsor..."
        emptyMessage={
          !selectedFestivalId
            ? 'Selectionnez un festival pour voir les sponsors'
            : 'Aucun sponsor trouve'
        }
        onRowClick={(sponsor) => openEditModal(sponsor)}
        actions={(sponsor) => (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(sponsor);
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
                handleDeleteClick(sponsor);
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
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSponsor ? 'Modifier le sponsor' : 'Nouveau sponsor'}
        size="xl"
      >
        <form id="sponsor-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                Nom du sponsor *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: Acme Corporation"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                Niveau de sponsoring *
              </label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value as SponsorTier })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {tierOrder.map((tier) => (
                  <option key={tier} value={tier}>
                    {tierConfig[tier].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                Montant du sponsoring
              </label>
              <input
                type="number"
                value={formData.sponsorshipAmount}
                onChange={(e) => setFormData({ ...formData, sponsorshipAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="10000"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                URL du logo
              </label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                Site web
              </label>
              <input
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                Ordre d&apos;affichage
              </label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                min="0"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-white/70">
                Sponsor actif
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
              placeholder="Description du sponsor..."
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                Date de debut
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Informations de contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                  Nom du contact
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="contact@sponsor.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                  Telephone
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
            </div>
          </div>

          {/* Benefits & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                Avantages offerts
              </label>
              <textarea
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="Logo sur scene principale, 10 pass VIP..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                Notes internes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="Notes privees..."
              />
            </div>
          </div>
        </form>

        <ModalFooter>
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white font-medium hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
            disabled={isSaving}
          >
            Annuler
          </button>
          <button
            type="submit"
            form="sponsor-form"
            className="px-4 py-2 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? 'Enregistrement...' : editingSponsor ? 'Enregistrer' : 'Creer'}
          </button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le sponsor"
        message={`Etes-vous sur de vouloir supprimer "${sponsorToDelete?.name}" ? Cette action est irreversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        loading={deleteSponsorMutation.isPending}
      />
    </div>
  );
}
