'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FestivalCard } from '@/components/festivals/FestivalCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getFestivals, type Festival, type GetFestivalsParams } from '@/lib/api/festivals';

const GENRES = [
  'Electronic',
  'Rock',
  'Hip-Hop',
  'Jazz',
  'Indie',
  'Pop',
  'Metal',
  'Classical',
  'Folk',
  'Country',
  'R&B',
  'Techno',
  'House',
];

const REGIONS = [
  'Europe',
  'North America',
  'South America',
  'Asia',
  'Africa',
  'Oceania',
];

const SORT_OPTIONS = [
  { value: 'date_asc', label: 'Date (Earliest First)' },
  { value: 'date_desc', label: 'Date (Latest First)' },
  { value: 'price_asc', label: 'Price (Low to High)' },
  { value: 'price_desc', label: 'Price (High to Low)' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'popularity', label: 'Popularity' },
];

const ITEMS_PER_PAGE = 12;

export default function FestivalsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get filter values from URL
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    searchParams.get('genres')?.split(',').filter(Boolean) || []
  );
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get('region') || '');
  const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'date_asc');
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get('page') || '1', 10)
  );

  // Update URL with current filters
  const updateURL = (filters: Record<string, string>) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Apply filters
  const handleApplyFilters = () => {
    const filters: Record<string, string> = {
      search,
      genres: selectedGenres.join(','),
      region: selectedRegion,
      priceMin,
      priceMax,
      dateFrom,
      dateTo,
      sort: sortBy,
      page: '1',
    };
    setCurrentPage(1);
    updateURL(filters);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearch('');
    setSelectedGenres([]);
    setSelectedRegion('');
    setPriceMin('');
    setPriceMax('');
    setDateFrom('');
    setDateTo('');
    setSortBy('date_asc');
    setCurrentPage(1);
    router.push(pathname);
  };

  // Toggle genre selection
  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  // Build API params
  const apiParams: GetFestivalsParams = useMemo(() => {
    const params: GetFestivalsParams = {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      status: 'PUBLISHED',
    };

    if (search) params.search = search;
    if (selectedGenres.length > 0) params.genre = selectedGenres.join(',');
    if (selectedRegion) params.location = selectedRegion;
    if (dateFrom) params.startDateFrom = dateFrom;
    if (dateTo) params.startDateTo = dateTo;

    return params;
  }, [currentPage, search, selectedGenres, selectedRegion, dateFrom, dateTo]);

  // Fetch festivals
  const { data, isLoading, error } = useQuery({
    queryKey: ['festivals', apiParams],
    queryFn: () => getFestivals(apiParams),
  });

  // Client-side filtering and sorting
  const filteredAndSortedFestivals = useMemo(() => {
    if (!data?.data) return [];

    let festivals = [...data.data];

    // Filter by price range
    if (priceMin || priceMax) {
      festivals = festivals.filter((festival) => {
        const price = festival.price?.from || 0;
        const min = priceMin ? parseFloat(priceMin) : 0;
        const max = priceMax ? parseFloat(priceMax) : Infinity;
        return price >= min && price <= max;
      });
    }

    // Sort
    festivals.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'date_desc':
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case 'price_asc':
          return (a.price?.from || 0) - (b.price?.from || 0);
        case 'price_desc':
          return (b.price?.from || 0) - (a.price?.from || 0);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'popularity':
          // Mock popularity - in real app this would come from API
          return 0;
        default:
          return 0;
      }
    });

    return festivals;
  }, [data?.data, priceMin, priceMax, sortBy]);

  const totalPages = data?.meta?.totalPages || 1;
  const totalResults = data?.meta?.total || filteredAndSortedFestivals.length;
  const hasActiveFilters =
    search ||
    selectedGenres.length > 0 ||
    selectedRegion ||
    priceMin ||
    priceMax ||
    dateFrom ||
    dateTo;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        {/* Header */}
        <div className="mb-12">
          <h1 className="section-title mb-4">Discover Festivals</h1>
          <p className="text-white/60 text-lg max-w-2xl">
            Find your perfect festival experience. Filter by genre, location, date, and price.
          </p>
        </div>

        {/* Search Bar */}
        <Card variant="solid" padding="md" className="mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                placeholder="Search festivals by name or location..."
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
            <Button variant="primary" onClick={handleApplyFilters}>
              Search
            </Button>
          </div>
        </Card>

        {/* Filters */}
        <Card variant="solid" padding="md" className="mb-8">
          <div className="space-y-6">
            {/* Genre Filter */}
            <div>
              <label className="block text-white font-semibold mb-3">Genre / Type</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedGenres.includes(genre)
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/50'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range, Region, and Price Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date From */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Region */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Region</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="" className="bg-festival-dark">
                    All Regions
                  </option>
                  {REGIONS.map((region) => (
                    <option key={region} value={region} className="bg-festival-dark">
                      {region}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500 transition-colors appearance-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-festival-dark">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-white font-semibold mb-3">Price Range</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Min Price</label>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Max Price</label>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="1000"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button variant="primary" onClick={handleApplyFilters} className="flex-1">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Apply Filters
              </Button>
              {hasActiveFilters && (
                <Button variant="secondary" onClick={handleClearFilters}>
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mb-6 flex flex-wrap gap-2 items-center">
            <span className="text-white/60 text-sm">Active filters:</span>
            {search && (
              <span className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-sm">
                Search: {search}
              </span>
            )}
            {selectedGenres.map((genre) => (
              <span
                key={genre}
                className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-sm flex items-center gap-2"
              >
                {genre}
                <button onClick={() => toggleGenre(genre)} className="hover:text-white">
                  ×
                </button>
              </span>
            ))}
            {selectedRegion && (
              <span className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-sm">
                Region: {selectedRegion}
              </span>
            )}
            {(priceMin || priceMax) && (
              <span className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-sm">
                Price: {priceMin || '0'} - {priceMax || '∞'}
              </span>
            )}
            {(dateFrom || dateTo) && (
              <span className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-sm">
                Dates: {dateFrom || '...'} to {dateTo || '...'}
              </span>
            )}
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-white/60">
            {isLoading ? (
              'Loading...'
            ) : (
              <>
                Showing <span className="text-white font-semibold">{filteredAndSortedFestivals.length}</span>{' '}
                of <span className="text-white font-semibold">{totalResults}</span> festivals
              </>
            )}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card variant="solid" padding="lg" className="text-center">
            <div className="text-red-400 mb-2">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Error Loading Festivals</h3>
            <p className="text-white/60 mb-4">
              {error instanceof Error ? error.message : 'An error occurred while loading festivals'}
            </p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredAndSortedFestivals.length === 0 && (
          <Card variant="solid" padding="lg" className="text-center">
            <div className="text-white/40 mb-4">
              <svg className="w-20 h-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">No Festivals Found</h3>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              {hasActiveFilters
                ? "We couldn't find any festivals matching your search criteria. Try adjusting your filters."
                : 'No festivals are currently available. Check back soon!'}
            </p>
            {hasActiveFilters && (
              <Button variant="primary" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </Card>
        )}

        {/* Festival Grid */}
        {!isLoading && !error && filteredAndSortedFestivals.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedFestivals.map((festival) => (
                <FestivalCard
                  key={festival.id}
                  festival={{
                    ...festival,
                    imageUrl:
                      festival.imageUrl ||
                      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop',
                    price: festival.price || { from: 0, currency: 'EUR' },
                    genres: festival.genres || [],
                  }}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage(currentPage - 1);
                    updateURL({ ...Object.fromEntries(searchParams), page: String(currentPage - 1) });
                  }}
                >
                  Previous
                </Button>

                <div className="flex gap-2">
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => {
                          setCurrentPage(pageNum);
                          updateURL({ ...Object.fromEntries(searchParams), page: String(pageNum) });
                        }}
                        className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                          currentPage === pageNum
                            ? 'bg-primary-500 text-white'
                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="secondary"
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage(currentPage + 1);
                    updateURL({ ...Object.fromEntries(searchParams), page: String(currentPage + 1) });
                  }}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
