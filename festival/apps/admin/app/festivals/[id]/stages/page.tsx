'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { mockFestivals } from '../../../../lib/mock-data';
import { useStages, useCreateStage, useUpdateStage, useDeleteStage } from '../../../../hooks/api/useProgram';
import type { Stage } from '../../../../types';

interface FestivalStagesPageProps {
  params: Promise<{ id: string }>;
}

export default function FestivalStagesPage({ params }: FestivalStagesPageProps) {
  const { id } = use(params);
  const festival = mockFestivals.find((f) => f.id === id);

  // API hooks
  const { data: stages = [], isLoading, error } = useStages(id);
  const createMutation = useCreateStage();
  const updateMutation = useUpdateStage();
  const deleteMutation = useDeleteStage();

  const [showModal, setShowModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: 1000,
    location: '',
  });

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

  const totalCapacity = stages.reduce((acc, stage) => acc + stage.capacity, 0);

  const openCreateModal = () => {
    setEditingStage(null);
    setFormData({
      name: '',
      description: '',
      capacity: 1000,
      location: '',
    });
    setShowModal(true);
  };

  const openEditModal = (stage: Stage) => {
    setEditingStage(stage);
    setFormData({
      name: stage.name,
      description: stage.description || '',
      capacity: stage.capacity,
      location: stage.location || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingStage) {
        // Update existing stage
        await updateMutation.mutateAsync({
          id: editingStage.id,
          data: formData,
        });
      } else {
        // Create new stage
        await createMutation.mutateAsync({
          festivalId: id,
          data: formData,
        });
      }

      setShowModal(false);
      setEditingStage(null);
    } catch (error) {
      console.error('Error saving stage:', error);
      // Error handling can be expanded here (e.g., show toast notification)
    }
  };

  const handleDelete = async (stageId: string) => {
    if (confirm('Etes-vous sur de vouloir supprimer cette scene?')) {
      try {
        await deleteMutation.mutateAsync(stageId);
      } catch (error) {
        console.error('Error deleting stage:', error);
        // Error handling can be expanded here (e.g., show toast notification)
      }
    }
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
        <span className="text-gray-900 font-medium">Scenes</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scenes - {festival.name}</h1>
          <p className="text-gray-500 mt-1">{stages.length} scenes - Capacite totale: {totalCapacity.toLocaleString()} personnes</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          + Ajouter une scene
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
          href={`/festivals/${id}/stages`}
          className="px-4 py-3 text-sm font-medium text-primary-600 border-b-2 border-primary-600 whitespace-nowrap"
        >
          Scenes
        </Link>
        <Link
          href={`/festivals/${id}/stats`}
          className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Statistiques
        </Link>
      </div>

      {/* Stages List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-500 to-pink-500 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Liste des scenes</h2>
          <p className="text-white/80 text-sm">Gerez les differentes scenes du festival</p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-gray-500">Chargement des scenes...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600 font-medium">Erreur lors du chargement des scenes</p>
            <p className="text-gray-500 text-sm mt-2">{error instanceof Error ? error.message : 'Une erreur est survenue'}</p>
          </div>
        ) : stages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>Aucune scene configuree pour ce festival</p>
            <button onClick={openCreateModal} className="btn-primary mt-4">
              Ajouter votre premiere scene
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stages.map((stage) => (
              <div key={stage.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-pink-400 flex items-center justify-center text-white font-bold">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                    <p className="text-sm text-gray-500">{stage.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{stage.capacity.toLocaleString()} pers.</p>
                    <p className="text-sm text-gray-500">{stage.location}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(stage)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Modifier"
                      disabled={deleteMutation.isPending}
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(stage.id)}
                      className="p-2 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Supprimer"
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                      ) : (
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Capacity Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Repartition de la capacite</h3>
        <div className="space-y-3">
          {stages.map((stage) => {
            const percentage = totalCapacity > 0 ? (stage.capacity / totalCapacity) * 100 : 0;
            return (
              <div key={stage.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{stage.name}</span>
                  <span className="text-gray-900 font-medium">{stage.capacity.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-400 to-pink-400 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">Capacite totale</span>
            <span className="text-gray-900 font-bold">{totalCapacity.toLocaleString()} personnes</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingStage ? 'Modifier la scene' : 'Ajouter une scene'}
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
                  Nom de la scene *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: Main Stage"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Description de la scene..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacite (personnes) *
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: 5000"
                  min={1}
                  required
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
                  placeholder="Ex: Zone A - Entree principale"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enregistrement...
                    </span>
                  ) : (
                    editingStage ? 'Enregistrer' : 'Ajouter'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
