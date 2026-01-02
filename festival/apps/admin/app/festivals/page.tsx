'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import DataTable from '../../components/tables/DataTable';
import FestivalForm from '../../components/forms/FestivalForm';
import { mockFestivals } from '../../lib/mock-data';
import { formatCurrency, formatDate, formatNumber, getStatusColor, getStatusLabel } from '../../lib/utils';
import type { Festival, TableColumn } from '../../types';

// Modal component for create/edit
function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        {/* Modal content */}
        <div className="relative bg-gray-50 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Delete confirmation dialog
function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  festivalName,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  festivalName: string;
  loading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Supprimer le festival</h3>
              <p className="text-sm text-gray-500 mt-1">
                Etes-vous sur de vouloir supprimer <strong>{festivalName}</strong> ? Cette action est irreversible.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              disabled={loading}
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FestivalsPage() {
  const router = useRouter();

  // Local state for festivals - initialized from mock data
  const [festivals, setFestivals] = useState<Festival[]>(() => [...mockFestivals]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFestival, setSelectedFestival] = useState<Festival | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter festivals based on status
  const filteredFestivals = statusFilter === 'all'
    ? festivals
    : festivals.filter((f) => f.status === statusFilter);

  // Generate unique ID for new festivals
  const generateId = useCallback(() => {
    const maxId = festivals.reduce((max, f) => {
      const id = parseInt(f.id, 10);
      return isNaN(id) ? max : Math.max(max, id);
    }, 0);
    return String(maxId + 1);
  }, [festivals]);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + new Date().getFullYear();
  };

  // Handle create festival
  const handleCreate = async (data: Partial<Festival>) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newFestival: Festival = {
        id: generateId(),
        name: data.name || '',
        slug: generateSlug(data.name || ''),
        description: data.description || '',
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        location: data.location || { name: '', address: '', city: '', country: '' },
        status: data.status || 'draft',
        coverImage: data.coverImage,
        organizerId: '1', // Default organizer
        capacity: data.capacity || 0,
        ticketsSold: 0,
        revenue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setFestivals((prev) => [newFestival, ...prev]);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating festival:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit festival
  const handleEdit = async (data: Partial<Festival>) => {
    if (!selectedFestival) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setFestivals((prev) =>
        prev.map((f) =>
          f.id === selectedFestival.id
            ? {
                ...f,
                ...data,
                slug: data.name !== f.name ? generateSlug(data.name || f.name) : f.slug,
                updatedAt: new Date().toISOString(),
              }
            : f
        )
      );
      setIsEditModalOpen(false);
      setSelectedFestival(null);
    } catch (error) {
      console.error('Error updating festival:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete festival
  const handleDelete = async () => {
    if (!selectedFestival) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setFestivals((prev) => prev.filter((f) => f.id !== selectedFestival.id));
      setIsDeleteDialogOpen(false);
      setSelectedFestival(null);
    } catch (error) {
      console.error('Error deleting festival:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (festival: Festival) => {
    setSelectedFestival(festival);
    setIsEditModalOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (festival: Festival) => {
    setSelectedFestival(festival);
    setIsDeleteDialogOpen(true);
  };

  const columns: TableColumn<Festival>[] = [
    {
      key: 'name',
      label: 'Festival',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {row.coverImage ? (
              <Image
                src={row.coverImage}
                alt={row.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-sm text-gray-500">{row.location.city}, {row.location.country}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'startDate',
      label: 'Dates',
      sortable: true,
      render: (_, row) => (
        <div className="text-sm">
          <p className="text-gray-900">{formatDate(row.startDate, { day: 'numeric', month: 'short' })}</p>
          <p className="text-gray-500">au {formatDate(row.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (value) => (
        <span className={`badge ${getStatusColor(value as string)}`}>
          {getStatusLabel(value as string)}
        </span>
      ),
    },
    {
      key: 'ticketsSold',
      label: 'Billets',
      sortable: true,
      render: (_, row) => (
        <div className="text-sm">
          <p className="text-gray-900 font-medium">{formatNumber(row.ticketsSold)}</p>
          <p className="text-gray-500">/ {formatNumber(row.capacity)}</p>
        </div>
      ),
    },
    {
      key: 'revenue',
      label: 'Revenus',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(value as number)}
        </span>
      ),
    },
  ];

  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'published', label: 'Publie' },
    { value: 'completed', label: 'Termine' },
    { value: 'cancelled', label: 'Annule' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Festivals</h1>
          <p className="text-gray-500 mt-1">
            Gerez vos festivals et suivez leurs performances.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary flex items-center gap-2 w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau festival
        </button>
      </div>

      {/* Filters */}
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
        <div className="flex-1" />
        <Link href="/exports" className="btn-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter
        </Link>
      </div>

      {/* Table */}
      <DataTable
        data={filteredFestivals}
        columns={columns}
        searchPlaceholder="Rechercher un festival..."
        onRowClick={(festival) => {
          router.push(`/festivals/${festival.id}`);
        }}
        actions={(festival) => (
          <div className="flex items-center gap-1">
            <Link
              href={`/festivals/${festival.id}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </Link>
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(festival);
              }}
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                openDeleteDialog(festival);
              }}
            >
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      />

      {/* Create Festival Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Creer un nouveau festival"
      >
        <FestivalForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
          loading={loading}
        />
      </Modal>

      {/* Edit Festival Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedFestival(null);
        }}
        title="Modifier le festival"
      >
        {selectedFestival && (
          <FestivalForm
            festival={selectedFestival}
            onSubmit={handleEdit}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedFestival(null);
            }}
            loading={loading}
          />
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedFestival(null);
        }}
        onConfirm={handleDelete}
        festivalName={selectedFestival?.name || ''}
        loading={loading}
      />
    </div>
  );
}
