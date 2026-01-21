'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import DataTable from '@/components/tables/DataTable';
import { Modal, ModalFooter } from '@/components/modals/Modal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { Badge } from '@/components/ui/Badge';
import {
  useArtists,
  useArtistGenres,
  useCreateArtist,
  useUpdateArtist,
  useDeleteArtist,
} from '@/hooks';
import type { Artist, TableColumn, CreateArtistDto } from '@/types';

interface ArtistFormData {
  name: string;
  genre: string;
  bio: string;
  imageUrl: string;
  country: string;
  spotifyUrl: string;
  instagramUrl: string;
  websiteUrl: string;
}

const initialFormData: ArtistFormData = {
  name: '',
  genre: '',
  bio: '',
  imageUrl: '',
  country: '',
  spotifyUrl: '',
  instagramUrl: '',
  websiteUrl: '',
};

export default function ArtistsPage() {
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [formData, setFormData] = useState<ArtistFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ArtistFormData, string>>>({});

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [artistToDelete, setArtistToDelete] = useState<Artist | null>(null);

  // API hooks
  const {
    data: artistsData,
    isLoading,
    error,
  } = useArtists({
    page,
    limit,
    search: searchTerm || undefined,
    genre: genreFilter !== 'all' ? genreFilter : undefined,
  });

  const { data: genres = [] } = useArtistGenres();
  const createArtistMutation = useCreateArtist();
  const updateArtistMutation = useUpdateArtist();
  const deleteArtistMutation = useDeleteArtist();

  // Extract artists from paginated response
  const artists = useMemo(() => {
    if (!artistsData) return [];
    return 'data' in artistsData ? artistsData.data : [];
  }, [artistsData]);

  const totalArtists = useMemo(() => {
    if (!artistsData) return 0;
    return 'meta' in artistsData ? artistsData.meta.total : artists.length;
  }, [artistsData, artists.length]);

  // Table columns
  const columns: TableColumn<Artist>[] = [
    {
      key: 'name',
      label: 'Artiste',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary-400 to-pink-400 flex-shrink-0">
            {row.imageUrl ? (
              <Image src={row.imageUrl} alt={row.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                {row.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{row.name}</p>
            {row.country && (
              <p className="text-sm text-gray-500 dark:text-white/60">{row.country}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'genre',
      label: 'Genre',
      sortable: true,
      render: (value) =>
        value ? (
          <Badge variant="primary" size="sm">
            {value as string}
          </Badge>
        ) : (
          <span className="text-gray-400 dark:text-white/40">-</span>
        ),
    },
    {
      key: 'bio',
      label: 'Bio',
      render: (value) => (
        <p className="text-sm text-gray-600 dark:text-white/70 line-clamp-2 max-w-xs">
          {(value as string) || '-'}
        </p>
      ),
    },
    {
      key: '_count',
      label: 'Performances',
      sortable: false,
      render: (_, row) => (
        <span className="text-gray-900 dark:text-white font-medium">
          {row._count?.performances ?? 0}
        </span>
      ),
    },
    {
      key: 'socialLinks',
      label: 'Liens',
      render: (_, row) => {
        const hasSocialLinks = row.spotifyUrl || row.instagramUrl || row.websiteUrl;
        if (!hasSocialLinks) {
          return <span className="text-gray-400 dark:text-white/40">-</span>;
        }
        return (
          <div className="flex items-center gap-2">
            {row.spotifyUrl && (
              <a
                href={row.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                title="Spotify"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </a>
            )}
            {row.instagramUrl && (
              <a
                href={row.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors"
                title="Instagram"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            )}
            {row.websiteUrl && (
              <a
                href={row.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                title="Site web"
                onClick={(e) => e.stopPropagation()}
              >
                <svg
                  className="w-4 h-4 text-gray-500 dark:text-white/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </a>
            )}
          </div>
        );
      },
    },
  ];

  // Form handlers
  const openCreateModal = () => {
    setEditingArtist(null);
    setFormData(initialFormData);
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (artist: Artist) => {
    setEditingArtist(artist);
    setFormData({
      name: artist.name,
      genre: artist.genre || '',
      bio: artist.bio || '',
      imageUrl: artist.imageUrl || '',
      country: artist.country || '',
      spotifyUrl: artist.spotifyUrl || '',
      instagramUrl: artist.instagramUrl || '',
      websiteUrl: artist.websiteUrl || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openDeleteModal = (artist: Artist) => {
    setArtistToDelete(artist);
    setShowDeleteModal(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ArtistFormData, string>> = {};

    if (!formData.name.trim()) {
      errors.name = 'Le nom est requis';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Le nom doit contenir au moins 2 caracteres';
    }

    // Validate URLs
    const urlFields: (keyof ArtistFormData)[] = [
      'imageUrl',
      'spotifyUrl',
      'instagramUrl',
      'websiteUrl',
    ];
    urlFields.forEach((field) => {
      const value = formData[field];
      if (value && !isValidUrl(value)) {
        errors[field] = 'URL invalide';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const artistData: CreateArtistDto = {
      name: formData.name.trim(),
      genre: formData.genre.trim() || undefined,
      bio: formData.bio.trim() || undefined,
      imageUrl: formData.imageUrl.trim() || undefined,
      country: formData.country.trim() || undefined,
      spotifyUrl: formData.spotifyUrl.trim() || undefined,
      instagramUrl: formData.instagramUrl.trim() || undefined,
      websiteUrl: formData.websiteUrl.trim() || undefined,
    };

    try {
      if (editingArtist) {
        await updateArtistMutation.mutateAsync({
          id: editingArtist.id,
          data: artistData,
        });
      } else {
        await createArtistMutation.mutateAsync(artistData);
      }
      setShowModal(false);
      setEditingArtist(null);
      setFormData(initialFormData);
    } catch (err) {
      // Error is handled by React Query
      console.error('Failed to save artist:', err);
    }
  };

  const handleDelete = async () => {
    if (!artistToDelete) return;

    try {
      await deleteArtistMutation.mutateAsync(artistToDelete.id);
      setShowDeleteModal(false);
      setArtistToDelete(null);
    } catch (err) {
      console.error('Failed to delete artist:', err);
    }
  };

  const handleInputChange = (field: keyof ArtistFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const isMutating =
    createArtistMutation.isPending ||
    updateArtistMutation.isPending ||
    deleteArtistMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Artistes</h1>
          <p className="text-gray-500 dark:text-white/60 mt-1">
            Gerez les artistes et musiciens de vos festivals.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 w-fit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvel artiste
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-white/50"
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
          <input
            type="text"
            placeholder="Rechercher un artiste..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-white/40"
          />
        </div>

        {/* Genre Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-white/70">Genre:</label>
          <select
            value={genreFilter}
            onChange={(e) => {
              setGenreFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tous les genres</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="flex-1 text-right">
          <span className="text-sm text-gray-500 dark:text-white/60">
            {totalArtists} artiste{totalArtists !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-700 dark:text-red-400">
              Erreur lors du chargement des artistes. Veuillez reessayer.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10">
        <DataTable
          data={artists}
          columns={columns}
          loading={isLoading}
          searchable={false}
          pageSize={limit}
          emptyMessage="Aucun artiste trouve"
          onRowClick={openEditModal}
          actions={(artist) => (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(artist);
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
                  openDeleteModal(artist);
                }}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                title="Supprimer"
                disabled={isMutating}
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
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingArtist ? "Modifier l'artiste" : 'Nouvel artiste'}
        description={
          editingArtist
            ? "Modifiez les informations de l'artiste."
            : 'Ajoutez un nouvel artiste a votre plateforme.'
        }
        size="lg"
      >
        <form id="artist-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border ${
                formErrors.name
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-200 dark:border-white/20'
              } bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500`}
              placeholder="Nom de l'artiste"
              required
            />
            {formErrors.name && <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>}
          </div>

          {/* Genre & Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                Genre
              </label>
              <input
                type="text"
                value={formData.genre}
                onChange={(e) => handleInputChange('genre', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: EDM, Rock, Jazz..."
                list="genre-suggestions"
              />
              <datalist id="genre-suggestions">
                {genres.map((genre) => (
                  <option key={genre} value={genre} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                Pays
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: France, USA, UK..."
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
              Biographie
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Description de l'artiste..."
              rows={3}
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => handleInputChange('imageUrl', e.target.value)}
              className={`w-full px-3 py-2 border ${
                formErrors.imageUrl
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-200 dark:border-white/20'
              } bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500`}
              placeholder="https://example.com/image.jpg"
            />
            {formErrors.imageUrl && (
              <p className="mt-1 text-sm text-red-500">{formErrors.imageUrl}</p>
            )}
          </div>

          {/* Social Links */}
          <div className="border-t border-gray-200 dark:border-white/10 pt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-white/70 mb-3">
              Liens sociaux
            </h4>
            <div className="space-y-3">
              {/* Spotify */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-white/50 mb-1">
                  Spotify
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  <input
                    type="url"
                    value={formData.spotifyUrl}
                    onChange={(e) => handleInputChange('spotifyUrl', e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border ${
                      formErrors.spotifyUrl
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-200 dark:border-white/20'
                    } bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    placeholder="https://open.spotify.com/artist/..."
                  />
                </div>
                {formErrors.spotifyUrl && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.spotifyUrl}</p>
                )}
              </div>

              {/* Instagram */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-white/50 mb-1">
                  Instagram
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  </div>
                  <input
                    type="url"
                    value={formData.instagramUrl}
                    onChange={(e) => handleInputChange('instagramUrl', e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border ${
                      formErrors.instagramUrl
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-200 dark:border-white/20'
                    } bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    placeholder="https://instagram.com/..."
                  />
                </div>
                {formErrors.instagramUrl && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.instagramUrl}</p>
                )}
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-white/50 mb-1">
                  Site web
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-white/60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                  </div>
                  <input
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border ${
                      formErrors.websiteUrl
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-200 dark:border-white/20'
                    } bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    placeholder="https://..."
                  />
                </div>
                {formErrors.websiteUrl && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.websiteUrl}</p>
                )}
              </div>
            </div>
          </div>
        </form>

        <ModalFooter>
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white font-medium hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
            disabled={isMutating}
          >
            Annuler
          </button>
          <button
            type="submit"
            form="artist-form"
            className="px-4 py-2 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            disabled={isMutating}
          >
            {isMutating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Enregistrement...
              </span>
            ) : editingArtist ? (
              'Enregistrer'
            ) : (
              'Creer'
            )}
          </button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Supprimer l'artiste"
        message={`Etes-vous sur de vouloir supprimer "${artistToDelete?.name}" ? Cette action est irreversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        loading={deleteArtistMutation.isPending}
      />
    </div>
  );
}
