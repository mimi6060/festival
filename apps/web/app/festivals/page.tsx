'use client';

import { useState, useEffect, useMemo } from 'react';
import { FestivalCard, Festival as FestivalCardType } from '@/components/festivals/FestivalCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Festival } from '@/lib/api';

const API_URL = '/api';
const ITEMS_PER_PAGE = 9;

// Transform API festival data to FestivalCard expected format
function transformFestival(festival: Festival): FestivalCardType {
  // Get minimum price from ticket categories
  let minPrice = 0;
  if (festival.ticketCategories && festival.ticketCategories.length > 0) {
    const prices = festival.ticketCategories
      .filter((tc) => tc.isActive)
      .map((tc) => parseFloat(tc.price));
    minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  }

  return {
    id: festival.id,
    slug: festival.slug,
    name: festival.name,
    description: festival.description || 'Découvrez ce festival incroyable',
    location: festival.location,
    startDate: festival.startDate,
    endDate: festival.endDate,
    imageUrl:
      festival.bannerUrl ||
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop',
    price: {
      from: minPrice,
      currency: festival.currency || 'EUR',
    },
    genres: [],
    isSoldOut: festival.currentAttendees >= festival.maxCapacity,
    isFeatured: festival.status === 'ONGOING',
  };
}

type SortOption = 'date' | 'price_asc' | 'price_desc' | 'name';

export default function FestivalsPage() {
  const [allFestivals, setAllFestivals] = useState<FestivalCardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Fetch festivals on mount
  useEffect(() => {
    async function fetchFestivals() {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_URL}/festivals`, {
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Failed to fetch festivals');
        }

        const data = await res.json();
        const festivals: Festival[] = Array.isArray(data) ? data : data.data || [];
        setAllFestivals(festivals.map(transformFestival));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchFestivals();
  }, []);

  // Filter and sort festivals
  const filteredFestivals = useMemo(() => {
    let result = [...allFestivals];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.location.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query)
      );
    }

    // Status filter (based on dates)
    if (statusFilter) {
      const now = new Date();
      result = result.filter((f) => {
        const startDate = new Date(f.startDate);
        const endDate = new Date(f.endDate);

        switch (statusFilter) {
          case 'UPCOMING':
            return startDate > now;
          case 'ONGOING':
            return startDate <= now && endDate >= now;
          case 'COMPLETED':
            return endDate < now;
          default:
            return true;
        }
      });
    }

    // Month filter
    if (monthFilter) {
      const [year, month] = monthFilter.split('-').map(Number);
      result = result.filter((f) => {
        const startDate = new Date(f.startDate);
        return startDate.getFullYear() === year && startDate.getMonth() + 1 === month;
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'price_asc':
          return a.price.from - b.price.from;
        case 'price_desc':
          return b.price.from - a.price.from;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [allFestivals, searchQuery, statusFilter, monthFilter, sortBy]);

  const visibleFestivals = filteredFestivals.slice(0, visibleCount);
  const hasMore = visibleCount < filteredFestivals.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setMonthFilter('');
    setSortBy('date');
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const hasActiveFilters = searchQuery || statusFilter || monthFilter;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        {/* Header */}
        <div className="mb-12">
          <h1 className="section-title mb-4">Découvrir les Festivals</h1>
          <p className="text-white/60 text-lg max-w-2xl">
            Trouvez votre expérience festival idéale parmi des centaines d&apos;événements.
          </p>
        </div>

        {/* Filters */}
        <Card variant="solid" padding="md" className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Rechercher des festivals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                }
              />
            </div>

            {/* Status Filter */}
            <div className="w-full lg:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="" className="bg-festival-dark">
                  Tous les statuts
                </option>
                <option value="UPCOMING" className="bg-festival-dark">
                  À venir
                </option>
                <option value="ONGOING" className="bg-festival-dark">
                  En cours
                </option>
                <option value="COMPLETED" className="bg-festival-dark">
                  Terminés
                </option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="w-full lg:w-48">
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={handleClearFilters}>
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Effacer
              </Button>
            )}
          </div>
        </Card>

        {/* Results Count & Sort */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-white/60">
            <span className="text-white font-semibold">{filteredFestivals.length}</span> festival
            {filteredFestivals.length > 1 ? 's' : ''} trouvé
            {filteredFestivals.length > 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Trier par:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="date" className="bg-festival-dark">
                Date
              </option>
              <option value="price_asc" className="bg-festival-dark">
                Prix (croissant)
              </option>
              <option value="price_desc" className="bg-festival-dark">
                Prix (décroissant)
              </option>
              <option value="name" className="bg-festival-dark">
                Nom
              </option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card variant="solid" padding="lg" className="text-center">
            <div className="py-12">
              <svg
                className="w-16 h-16 mx-auto text-red-500/50 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">Erreur de chargement</h3>
              <p className="text-white/60 mb-6">{error}</p>
              <Button variant="primary" onClick={() => window.location.reload()}>
                Réessayer
              </Button>
            </div>
          </Card>
        )}

        {/* Festival Grid */}
        {!isLoading && !error && visibleFestivals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleFestivals.map((festival) => (
              <FestivalCard key={festival.id} festival={festival} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredFestivals.length === 0 && (
          <Card variant="solid" padding="lg" className="text-center">
            <div className="py-12">
              <svg
                className="w-16 h-16 mx-auto text-white/20 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">Aucun festival trouvé</h3>
              <p className="text-white/60 mb-6">
                {hasActiveFilters
                  ? 'Essayez de modifier vos filtres pour trouver des festivals.'
                  : 'Les festivals seront bientôt disponibles. Revenez nous voir !'}
              </p>
              {hasActiveFilters ? (
                <Button variant="secondary" onClick={handleClearFilters}>
                  Effacer les filtres
                </Button>
              ) : (
                <Button as="link" href="/" variant="secondary">
                  Retour à l&apos;accueil
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Load More */}
        {hasMore && !isLoading && (
          <div className="mt-12 text-center">
            <Button variant="secondary" size="lg" onClick={handleLoadMore}>
              Charger plus de festivals ({filteredFestivals.length - visibleCount} restants)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
