'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import { mockFestivals } from '@/lib/mock-data';
import {
  useLineup,
  useStages,
  useArtists,
  useCreatePerformance,
  useUpdatePerformance,
  useDeletePerformance,
} from '@/hooks';
import type { Performance, CreatePerformanceDto, Artist, Stage } from '@/types';

interface FestivalLineupPageProps {
  params: Promise<{ id: string }>;
}

export default function FestivalLineupPage({ params }: FestivalLineupPageProps) {
  const { id } = use(params);
  const festival = mockFestivals.find((f) => f.id === id || f.slug === id);

  // Fetch lineup and stages from API
  const { data: lineupData, isLoading: lineupLoading } = useLineup(id, { limit: 100 });
  const { data: stagesData = [], isLoading: stagesLoading } = useStages(id);
  const { data: artistsData, isLoading: artistsLoading } = useArtists({ limit: 100 });

  // Mutations
  const createPerformanceMutation = useCreatePerformance();
  const updatePerformanceMutation = useUpdatePerformance();
  const deletePerformanceMutation = useDeletePerformance();

  const [showModal, setShowModal] = useState(false);
  const [editingPerformance, setEditingPerformance] = useState<Performance | null>(null);
  const [formData, setFormData] = useState({
    artistId: '',
    stageId: '',
    date: '',
    startTime: '',
    endTime: '',
    description: '',
  });

  const performances = lineupData || [];
  const stages = stagesData || [];
  // artistsData is PaginatedResponse<Artist>, extract the data array
  const artists = (artistsData && 'data' in artistsData ? artistsData.data : artistsData) || [];

  // Group performances by day
  const groupedByDay = useMemo(() => {
    const groups: Record<string, Performance[]> = {};

    performances.forEach((performance: Performance) => {
      const date = new Date(performance.startTime);
      const dayKey = date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(performance);
    });

    // Sort performances within each day by start time
    Object.keys(groups).forEach((day) => {
      groups[day].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });

    // Sort days chronologically
    const sortedEntries = Object.entries(groups).sort(([, a], [, b]) => {
      const dateA = new Date(a[0]?.startTime || 0);
      const dateB = new Date(b[0]?.startTime || 0);
      return dateA.getTime() - dateB.getTime();
    });

    return sortedEntries.map(([day, dayPerformances]) => ({
      day,
      performances: dayPerformances,
    }));
  }, [performances]);

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

  const isLoading = lineupLoading || stagesLoading || artistsLoading;

  const openCreateModal = () => {
    setEditingPerformance(null);
    setFormData({
      artistId: artists[0]?.id || '',
      stageId: stages[0]?.id || '',
      date: '',
      startTime: '',
      endTime: '',
      description: '',
    });
    setShowModal(true);
  };

  const openEditModal = (performance: Performance) => {
    setEditingPerformance(performance);
    const startDate = new Date(performance.startTime);
    const endDate = new Date(performance.endTime);

    setFormData({
      artistId: performance.artistId,
      stageId: performance.stageId,
      date: startDate.toISOString().split('T')[0] || '',
      startTime: startDate.toTimeString().slice(0, 5),
      endTime: endDate.toTimeString().slice(0, 5),
      description: performance.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Construct ISO datetime strings
    const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
    const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

    if (editingPerformance) {
      // Update existing performance
      await updatePerformanceMutation.mutateAsync({
        id: editingPerformance.id,
        data: {
          artistId: formData.artistId,
          stageId: formData.stageId,
          startTime: startDateTime,
          endTime: endDateTime,
          description: formData.description || undefined,
        },
      });
    } else {
      // Create new performance
      const newPerformance: CreatePerformanceDto = {
        artistId: formData.artistId,
        stageId: formData.stageId,
        startTime: startDateTime,
        endTime: endDateTime,
        description: formData.description || undefined,
      };
      await createPerformanceMutation.mutateAsync({ festivalId: id, data: newPerformance });
    }

    setShowModal(false);
    setEditingPerformance(null);
  };

  const handleDelete = async (performanceId: string) => {
    if (confirm('Etes-vous sur de vouloir supprimer cette performance?')) {
      await deletePerformanceMutation.mutateAsync(performanceId);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
        <span className="text-gray-900 font-medium">Lineup</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lineup - {festival.name}</h1>
          <p className="text-gray-500 mt-1">{performances.length} performances programmees</p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary"
          disabled={stages.length === 0 || artists.length === 0}
        >
          + Ajouter une performance
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
          className="px-4 py-3 text-sm font-medium text-primary-600 border-b-2 border-primary-600 whitespace-nowrap"
        >
          Lineup
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

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500">Chargement du lineup...</p>
          </div>
        </div>
      )}

      {/* Warning if no stages or artists */}
      {!isLoading && (stages.length === 0 || artists.length === 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-yellow-500"
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
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Configuration requise</h3>
          {stages.length === 0 && (
            <p className="text-yellow-700 mb-2">
              Veuillez d&apos;abord{' '}
              <Link href={`/festivals/${id}/stages`} className="underline font-medium">
                creer des scenes
              </Link>{' '}
              avant d&apos;ajouter des performances.
            </p>
          )}
          {artists.length === 0 && (
            <p className="text-yellow-700">
              Aucun artiste disponible. Veuillez d&apos;abord creer des artistes dans le systeme.
            </p>
          )}
        </div>
      )}

      {/* Lineup by Day */}
      {!isLoading && (
        <div className="space-y-8">
          {groupedByDay.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
              <p className="text-gray-500 mb-4">Aucune performance programmee pour ce festival</p>
              {stages.length > 0 && artists.length > 0 && (
                <button onClick={openCreateModal} className="btn-primary">
                  Ajouter votre premiere performance
                </button>
              )}
            </div>
          ) : (
            groupedByDay.map(({ day, performances: dayPerformances }) => (
              <div
                key={day}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-primary-500 to-pink-500 px-6 py-4">
                  <h2 className="text-xl font-bold text-white capitalize">{day}</h2>
                  <p className="text-white/80 text-sm">{dayPerformances.length} performances</p>
                </div>

                <div className="divide-y divide-gray-100">
                  {dayPerformances.map((performance) => (
                    <div
                      key={performance.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-pink-400 flex items-center justify-center text-white font-bold">
                          {performance.artist.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {performance.artist.name}
                            </h3>
                            {performance.isCancelled && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                Annule
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {performance.artist.genre || 'Genre non specifie'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatTime(performance.startTime)} - {formatTime(performance.endTime)}
                          </p>
                          <p className="text-sm text-gray-500">{performance.stage.name}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(performance)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                            title="Modifier"
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
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(performance.id)}
                            className="p-2 hover:bg-red-50 rounded-lg"
                            title="Supprimer"
                            disabled={deletePerformanceMutation.isPending}
                          >
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
            ))
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingPerformance ? 'Modifier la performance' : 'Ajouter une performance'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
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
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Artiste *</label>
                <select
                  value={formData.artistId}
                  onChange={(e) => setFormData({ ...formData, artistId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Selectionner un artiste</option>
                  {artists.map((artist: Artist) => (
                    <option key={artist.id} value={artist.id}>
                      {artist.name} {artist.genre ? `(${artist.genre})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scene *</label>
                <select
                  value={formData.stageId}
                  onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Selectionner une scene</option>
                  {stages.map((stage: Stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure de debut *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure de fin *
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optionnel)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Notes sur la performance..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={
                    createPerformanceMutation.isPending || updatePerformanceMutation.isPending
                  }
                >
                  {createPerformanceMutation.isPending || updatePerformanceMutation.isPending
                    ? 'Enregistrement...'
                    : editingPerformance
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
