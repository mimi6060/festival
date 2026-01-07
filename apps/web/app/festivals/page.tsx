import { Metadata } from 'next';
import { FestivalCard, Festival as FestivalCardType } from '@/components/festivals/FestivalCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Festival } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Découvrir les Festivals',
  description: 'Parcourez et trouvez le festival idéal. Filtrez par genre, lieu et date.',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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
    genres: [], // TODO: Add genres to API
    isSoldOut: festival.currentAttendees >= festival.maxCapacity,
    isFeatured: festival.status === 'ONGOING',
  };
}

async function getFestivals(): Promise<FestivalCardType[]> {
  try {
    const res = await fetch(`${API_URL}/festivals?status=PUBLISHED`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!res.ok) {
      console.error('Failed to fetch festivals:', res.status);
      return [];
    }

    const data = await res.json();

    // Handle both direct array and paginated response
    const festivals: Festival[] = Array.isArray(data) ? data : data.data || [];

    return festivals.map(transformFestival);
  } catch (error) {
    console.error('Error fetching festivals:', error);
    return [];
  }
}

export default async function FestivalsPage() {
  const festivals = await getFestivals();

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
              <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500 transition-colors appearance-none cursor-pointer">
                <option value="" className="bg-festival-dark">
                  Tous les statuts
                </option>
                <option value="PUBLISHED" className="bg-festival-dark">
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
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            <Button variant="primary">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filtrer
            </Button>
          </div>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-white/60">
            <span className="text-white font-semibold">{festivals.length}</span> festival
            {festivals.length > 1 ? 's' : ''} trouvé{festivals.length > 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Trier par:</span>
            <select className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors appearance-none cursor-pointer">
              <option className="bg-festival-dark">Date</option>
              <option className="bg-festival-dark">Prix (croissant)</option>
              <option className="bg-festival-dark">Prix (décroissant)</option>
              <option className="bg-festival-dark">Nom</option>
            </select>
          </div>
        </div>

        {/* Festival Grid */}
        {festivals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {festivals.map((festival) => (
              <FestivalCard key={festival.id} festival={festival} />
            ))}
          </div>
        ) : (
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
                Les festivals seront bientôt disponibles. Revenez nous voir !
              </p>
              <Button as="link" href="/" variant="secondary">
                Retour à l&apos;accueil
              </Button>
            </div>
          </Card>
        )}

        {/* Load More */}
        {festivals.length > 0 && (
          <div className="mt-12 text-center">
            <Button variant="secondary" size="lg">
              Charger plus de festivals
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
