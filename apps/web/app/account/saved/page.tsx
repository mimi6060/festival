'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore, selectIsAuthenticated, selectIsLoading } from '@/stores/auth.store';

interface SavedFestival {
  id: string;
  name: string;
  slug: string;
  location: string;
  startDate: string;
  endDate: string;
  coverImage: string | null;
  minPrice: number | null;
}

export default function SavedFestivalsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isAuthLoading = useAuthStore(selectIsLoading);
  const initialize = useAuthStore((state) => state.initialize);

  const [savedFestivals, setSavedFestivals] = useState<SavedFestival[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/account/saved');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Fetch saved festivals
  useEffect(() => {
    async function fetchSavedFestivals() {
      if (!isAuthenticated) return;

      setIsLoadingData(true);
      try {
        const response = await fetch('/api/users/favorites', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setSavedFestivals(Array.isArray(data) ? data : data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch saved festivals:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    fetchSavedFestivals();
  }, [isAuthenticated]);

  const handleRemoveFavorite = async (festivalId: string) => {
    setRemovingId(festivalId);

    try {
      const response = await fetch(`/api/users/favorites/${festivalId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setSavedFestivals((prev) => prev.filter((f) => f.id !== festivalId));
      }
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}-${end.toLocaleDateString('fr-FR', options)} ${end.getFullYear()}`;
    }
    return `${start.toLocaleDateString('fr-FR', options)} - ${end.toLocaleDateString('fr-FR', options)} ${end.getFullYear()}`;
  };

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-white/50 text-sm mb-4">
              <Link href="/account" className="hover:text-white transition-colors">
                Mon compte
              </Link>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-white">Mes favoris</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white">Mes favoris</h1>
                <p className="text-white/60 mt-1">
                  {savedFestivals.length > 0
                    ? `${savedFestivals.length} festival${savedFestivals.length > 1 ? 's' : ''} enregistre${savedFestivals.length > 1 ? 's' : ''}`
                    : 'Aucun festival enregistre'}
                </p>
              </div>
              <Button as="link" href="/festivals" variant="secondary">
                Explorer les festivals
              </Button>
            </div>
          </div>

          {/* Content */}
          {isLoadingData ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} variant="solid" padding="none" className="animate-pulse">
                  <div className="aspect-[16/9] bg-white/10"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-white/10 rounded w-3/4"></div>
                    <div className="h-4 bg-white/10 rounded w-1/2"></div>
                  </div>
                </Card>
              ))}
            </div>
          ) : savedFestivals.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedFestivals.map((festival) => (
                <Card
                  key={festival.id}
                  variant="glow"
                  padding="none"
                  className="overflow-hidden group"
                >
                  {/* Image */}
                  <div className="aspect-[16/9] relative overflow-hidden bg-white/5">
                    {festival.coverImage ? (
                      <img
                        src={festival.coverImage}
                        alt={festival.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/20 to-pink-500/20">
                        <svg
                          className="w-12 h-12 text-white/20"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                          />
                        </svg>
                      </div>
                    )}
                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemoveFavorite(festival.id);
                      }}
                      disabled={removingId === festival.id}
                      className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                      title="Retirer des favoris"
                    >
                      {removingId === festival.id ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <Link href={`/festivals/${festival.slug}`}>
                      <h3 className="font-semibold text-white text-lg mb-2 hover:text-primary-400 transition-colors">
                        {festival.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-4 text-sm text-white/60 mb-3">
                      <span className="flex items-center gap-1.5">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {formatDate(festival.startDate, festival.endDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-white/60 mb-4">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
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
                      {festival.location}
                    </div>

                    <div className="flex items-center justify-between">
                      {festival.minPrice !== null && (
                        <span className="text-white font-semibold">
                          A partir de {festival.minPrice}EUR
                        </span>
                      )}
                      <Button
                        as="link"
                        href={`/festivals/${festival.slug}/tickets`}
                        variant="primary"
                        size="sm"
                      >
                        Voir les billets
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* Empty State */
            <Card variant="solid" padding="lg" className="text-center">
              <div className="max-w-md mx-auto py-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-white/30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Aucun festival enregistre</h2>
                <p className="text-white/60 mb-8">
                  Explorez notre catalogue de festivals et ajoutez vos favoris pour les retrouver
                  facilement. Cliquez sur le coeur pour sauvegarder un festival.
                </p>
                <Button as="link" href="/festivals" variant="primary" size="lg">
                  Decouvrir les festivals
                </Button>
              </div>
            </Card>
          )}

          {/* Help Section */}
          {savedFestivals.length > 0 && (
            <div className="mt-12">
              <Card variant="gradient" padding="md">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-primary-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        Vous ne savez pas quel festival choisir ?
                      </h3>
                      <p className="text-white/60 text-sm">
                        Consultez notre guide pour trouver le festival ideal.
                      </p>
                    </div>
                  </div>
                  <Button as="link" href="/help" variant="secondary" size="sm">
                    Voir le guide
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
