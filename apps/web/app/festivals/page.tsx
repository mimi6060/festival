'use client';

import { useState, useEffect, useMemo } from 'react';
import { FestivalCard, Festival as FestivalCardType } from '@/components/festivals/FestivalCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, EmptyStateIcons } from '@/components/ui/EmptyState';
import { Festival } from '@/lib/api';

const API_URL = '/api';
const ITEMS_PER_PAGE = 9;

// Mock data for when API is unavailable
const MOCK_FESTIVALS: FestivalCardType[] = [
  {
    id: '1',
    slug: 'summer-vibes-2026',
    name: 'Summer Vibes 2026',
    description:
      "Le plus grand festival de musique électronique de l'été. 3 jours de fête non-stop avec les meilleurs DJs internationaux.",
    location: 'Marseille, France',
    startDate: '2026-07-15',
    endDate: '2026-07-17',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop',
    price: { from: 89, currency: 'EUR' },
    genres: ['Electronic', 'House', 'Techno'],
    isSoldOut: false,
    isFeatured: true,
  },
  {
    id: '2',
    slug: 'rock-en-seine-2026',
    name: 'Rock en Seine 2026',
    description:
      'Le festival rock incontournable de la rentrée. Découvrez les plus grands groupes de rock et indie.',
    location: 'Paris, France',
    startDate: '2026-08-22',
    endDate: '2026-08-24',
    imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop',
    price: { from: 75, currency: 'EUR' },
    genres: ['Rock', 'Indie', 'Alternative'],
    isSoldOut: false,
    isFeatured: true,
  },
  {
    id: '3',
    slug: 'jazz-a-vienne-2026',
    name: 'Jazz à Vienne 2026',
    description:
      'Festival de jazz de renommée mondiale dans le cadre unique du théâtre antique de Vienne.',
    location: 'Vienne, France',
    startDate: '2026-06-28',
    endDate: '2026-07-13',
    imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&h=600&fit=crop',
    price: { from: 45, currency: 'EUR' },
    genres: ['Jazz', 'Blues', 'Soul'],
    isSoldOut: false,
    isFeatured: false,
  },
  {
    id: '4',
    slug: 'hellfest-2026',
    name: 'Hellfest 2026',
    description:
      'Le plus grand festival de metal en France. Une expérience unique pour les fans de musique extrême.',
    location: 'Clisson, France',
    startDate: '2026-06-19',
    endDate: '2026-06-22',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
    price: { from: 199, currency: 'EUR' },
    genres: ['Metal', 'Hard Rock', 'Punk'],
    isSoldOut: true,
    isFeatured: true,
  },
  {
    id: '5',
    slug: 'les-vieilles-charrues-2026',
    name: 'Les Vieilles Charrues 2026',
    description:
      'Le plus grand festival de France en termes de fréquentation. Un programme éclectique pour tous les goûts.',
    location: 'Carhaix, France',
    startDate: '2026-07-16',
    endDate: '2026-07-19',
    imageUrl: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&h=600&fit=crop',
    price: { from: 119, currency: 'EUR' },
    genres: ['Pop', 'Rock', 'Electro', 'World'],
    isSoldOut: false,
    isFeatured: false,
  },
  {
    id: '6',
    slug: 'solidays-2026',
    name: 'Solidays 2026',
    description:
      "Festival engagé contre le SIDA. Musique, solidarité et bonne humeur à l'hippodrome de Longchamp.",
    location: 'Paris, France',
    startDate: '2026-06-26',
    endDate: '2026-06-28',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop',
    price: { from: 69, currency: 'EUR' },
    genres: ['Electro', 'Hip-Hop', 'Pop'],
    isSoldOut: false,
    isFeatured: false,
  },
];

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

// All available genres from mock data
const ALL_GENRES = [
  'Electronic',
  'House',
  'Techno',
  'Rock',
  'Indie',
  'Alternative',
  'Jazz',
  'Blues',
  'Soul',
  'Metal',
  'Hard Rock',
  'Punk',
  'Pop',
  'Electro',
  'World',
  'Hip-Hop',
];

export default function FestivalsPage() {
  const [allFestivals, setAllFestivals] = useState<FestivalCardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
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
      } catch {
        // Use mock data when API is unavailable
        setAllFestivals(MOCK_FESTIVALS);
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

    // Genre filter
    if (genreFilter) {
      result = result.filter((f) =>
        f.genres.some((g) => g.toLowerCase() === genreFilter.toLowerCase())
      );
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
  }, [allFestivals, searchQuery, statusFilter, monthFilter, genreFilter, sortBy]);

  const visibleFestivals = filteredFestivals.slice(0, visibleCount);
  const hasMore = visibleCount < filteredFestivals.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setMonthFilter('');
    setGenreFilter('');
    setSortBy('date');
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const hasActiveFilters = searchQuery || statusFilter || monthFilter || genreFilter;

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

            {/* Genre Filter */}
            <div className="w-full lg:w-48">
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="" className="bg-festival-dark">
                  Tous les genres
                </option>
                {ALL_GENRES.map((genre) => (
                  <option key={genre} value={genre} className="bg-festival-dark">
                    {genre}
                  </option>
                ))}
              </select>
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
          <Card variant="solid" padding="lg">
            <EmptyState
              icon={EmptyStateIcons.noData}
              title="Aucun festival trouvé"
              description={
                hasActiveFilters
                  ? 'Essayez de modifier vos filtres pour trouver des festivals.'
                  : 'Les festivals seront bientôt disponibles. Revenez nous voir !'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="secondary" onClick={handleClearFilters}>
                    Effacer les filtres
                  </Button>
                ) : (
                  <Button as="link" href="/" variant="secondary">
                    Retour à l&apos;accueil
                  </Button>
                )
              }
            />
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
