'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { mockFestivals } from '../../../../lib/mock-data';

interface Artist {
  id: string;
  name: string;
  genre: string;
  day: string;
  time: string;
  stage: string;
  imageUrl?: string;
  isHeadliner: boolean;
}

interface FestivalLineupPageProps {
  params: Promise<{ id: string }>;
}

// Mock artists data
const initialArtists: Artist[] = [
  { id: '1', name: 'David Guetta', genre: 'House', day: 'Samedi', time: '23:00', stage: 'Main Stage', isHeadliner: true },
  { id: '2', name: 'Charlotte de Witte', genre: 'Techno', day: 'Vendredi', time: '22:00', stage: 'Techno Arena', isHeadliner: true },
  { id: '3', name: 'Fisher', genre: 'House', day: 'Samedi', time: '21:00', stage: 'Main Stage', isHeadliner: false },
  { id: '4', name: 'Amelie Lens', genre: 'Techno', day: 'Dimanche', time: '00:00', stage: 'Techno Arena', isHeadliner: false },
];

export default function FestivalLineupPage({ params }: FestivalLineupPageProps) {
  const { id } = use(params);
  const festival = mockFestivals.find((f) => f.id === id);

  const [artists, setArtists] = useState<Artist[]>(initialArtists);
  const [showModal, setShowModal] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    genre: '',
    day: 'Vendredi',
    time: '',
    stage: 'Main Stage',
    isHeadliner: false,
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

  const stages = ['Main Stage', 'Techno Arena', 'Beach Stage', 'Secret Garden', 'Chill Zone'];
  const days = ['Vendredi', 'Samedi', 'Dimanche'];

  const openCreateModal = () => {
    setEditingArtist(null);
    setFormData({
      name: '',
      genre: '',
      day: 'Vendredi',
      time: '',
      stage: 'Main Stage',
      isHeadliner: false,
    });
    setShowModal(true);
  };

  const openEditModal = (artist: Artist) => {
    setEditingArtist(artist);
    setFormData({
      name: artist.name,
      genre: artist.genre,
      day: artist.day,
      time: artist.time,
      stage: artist.stage,
      isHeadliner: artist.isHeadliner,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingArtist) {
      // Update existing artist
      setArtists(prev => prev.map(a =>
        a.id === editingArtist.id
          ? { ...a, ...formData }
          : a
      ));
    } else {
      // Create new artist
      const newArtist: Artist = {
        id: Date.now().toString(),
        ...formData,
      };
      setArtists(prev => [...prev, newArtist]);
    }

    setShowModal(false);
    setEditingArtist(null);
  };

  const handleDelete = (artistId: string) => {
    if (confirm('Etes-vous sur de vouloir supprimer cet artiste?')) {
      setArtists(prev => prev.filter(a => a.id !== artistId));
    }
  };

  const groupedByDay = days.map(day => ({
    day,
    artists: artists.filter(a => a.day === day).sort((a, b) => a.time.localeCompare(b.time)),
  }));

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
        <span className="text-gray-900 font-medium">Lineup</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lineup - {festival.name}</h1>
          <p className="text-gray-500 mt-1">{artists.length} artistes programmes</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          + Ajouter un artiste
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

      {/* Lineup by Day */}
      <div className="space-y-8">
        {groupedByDay.map(({ day, artists: dayArtists }) => (
          <div key={day} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-500 to-pink-500 px-6 py-4">
              <h2 className="text-xl font-bold text-white">{day}</h2>
              <p className="text-white/80 text-sm">{dayArtists.length} artistes</p>
            </div>

            {dayArtists.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Aucun artiste programme pour ce jour
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {dayArtists.map((artist) => (
                  <div key={artist.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-pink-400 flex items-center justify-center text-white font-bold">
                        {artist.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{artist.name}</h3>
                          {artist.isHeadliner && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              Headliner
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{artist.genre}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{artist.time}</p>
                        <p className="text-sm text-gray-500">{artist.stage}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(artist)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Modifier"
                        >
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(artist.id)}
                          className="p-2 hover:bg-red-50 rounded-lg"
                          title="Supprimer"
                        >
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingArtist ? 'Modifier l\'artiste' : 'Ajouter un artiste'}
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
                  Nom de l&apos;artiste *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: David Guetta"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Genre musical *
                </label>
                <input
                  type="text"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: House, Techno, EDM..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jour *
                  </label>
                  <select
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {days.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure *
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scene *
                </label>
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {stages.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isHeadliner"
                  checked={formData.isHeadliner}
                  onChange={(e) => setFormData({ ...formData, isHeadliner: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isHeadliner" className="text-sm text-gray-700">
                  Headliner (tete d&apos;affiche)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingArtist ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
