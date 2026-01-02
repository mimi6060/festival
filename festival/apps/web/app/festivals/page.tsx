import { Metadata } from 'next';
import { FestivalCard, Festival } from '@/components/festivals/FestivalCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Discover Festivals',
  description: 'Browse and find the perfect music festival for you. Filter by genre, location, and date.',
};

// Mock data - in production this would come from an API
const festivals: Festival[] = [
  {
    id: '1',
    slug: 'electric-dreams-2025',
    name: 'Electric Dreams Festival',
    description: 'Experience the ultimate electronic music festival featuring world-renowned DJs and immersive art installations across 5 stages.',
    location: 'Barcelona, Spain',
    startDate: '2025-07-15',
    endDate: '2025-07-18',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop',
    price: { from: 199, currency: 'EUR' },
    genres: ['Electronic', 'House', 'Techno'],
    isFeatured: true,
  },
  {
    id: '2',
    slug: 'rock-revolution-2025',
    name: 'Rock Revolution',
    description: 'The biggest rock festival in Europe with legendary headliners and emerging artists.',
    location: 'London, UK',
    startDate: '2025-08-22',
    endDate: '2025-08-24',
    imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop',
    price: { from: 149, currency: 'GBP' },
    genres: ['Rock', 'Alternative', 'Metal'],
  },
  {
    id: '3',
    slug: 'summer-beats-2025',
    name: 'Summer Beats Festival',
    description: 'A celebration of hip-hop, R&B, and urban music under the summer sun.',
    location: 'Paris, France',
    startDate: '2025-06-28',
    endDate: '2025-06-30',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
    price: { from: 129, currency: 'EUR' },
    genres: ['Hip-Hop', 'R&B', 'Urban'],
  },
  {
    id: '4',
    slug: 'jazz-nights-2025',
    name: 'Jazz Nights',
    description: 'An intimate jazz experience in the heart of Amsterdam with international artists.',
    location: 'Amsterdam, Netherlands',
    startDate: '2025-09-05',
    endDate: '2025-09-07',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop',
    price: { from: 89, currency: 'EUR' },
    genres: ['Jazz', 'Soul', 'Blues'],
  },
  {
    id: '5',
    slug: 'indie-vibes-2025',
    name: 'Indie Vibes',
    description: 'Discover the best indie and alternative artists in a beautiful coastal setting.',
    location: 'Lisbon, Portugal',
    startDate: '2025-07-01',
    endDate: '2025-07-03',
    imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&h=600&fit=crop',
    price: { from: 99, currency: 'EUR' },
    genres: ['Indie', 'Alternative', 'Folk'],
  },
  {
    id: '6',
    slug: 'tropical-bass-2025',
    name: 'Tropical Bass Festival',
    description: 'Where electronic beats meet tropical vibes. Dance on the beach all day and night.',
    location: 'Ibiza, Spain',
    startDate: '2025-08-10',
    endDate: '2025-08-14',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop',
    price: { from: 249, currency: 'EUR' },
    genres: ['Electronic', 'Tropical', 'Bass'],
  },
];

const genres = [
  'All Genres',
  'Electronic',
  'Rock',
  'Hip-Hop',
  'Jazz',
  'Indie',
  'Pop',
  'Metal',
  'Classical',
];

const countries = [
  'All Countries',
  'Spain',
  'UK',
  'France',
  'Netherlands',
  'Portugal',
  'Germany',
  'Italy',
];

export default function FestivalsPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        {/* Header */}
        <div className="mb-12">
          <h1 className="section-title mb-4">Discover Festivals</h1>
          <p className="text-white/60 text-lg max-w-2xl">
            Find your perfect festival experience from hundreds of events around the world.
          </p>
        </div>

        {/* Filters */}
        <Card variant="solid" padding="md" className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Search festivals..."
                leftIcon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>

            {/* Genre Filter */}
            <div className="w-full lg:w-48">
              <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500 transition-colors appearance-none cursor-pointer">
                {genres.map((genre) => (
                  <option key={genre} value={genre} className="bg-festival-dark">
                    {genre}
                  </option>
                ))}
              </select>
            </div>

            {/* Country Filter */}
            <div className="w-full lg:w-48">
              <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary-500 transition-colors appearance-none cursor-pointer">
                {countries.map((country) => (
                  <option key={country} value={country} className="bg-festival-dark">
                    {country}
                  </option>
                ))}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </Button>
          </div>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-white/60">
            Showing <span className="text-white font-semibold">{festivals.length}</span> festivals
          </p>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Sort by:</span>
            <select className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors appearance-none cursor-pointer">
              <option className="bg-festival-dark">Date</option>
              <option className="bg-festival-dark">Price (Low to High)</option>
              <option className="bg-festival-dark">Price (High to Low)</option>
              <option className="bg-festival-dark">Name</option>
            </select>
          </div>
        </div>

        {/* Festival Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {festivals.map((festival) => (
            <FestivalCard key={festival.id} festival={festival} />
          ))}
        </div>

        {/* Load More */}
        <div className="mt-12 text-center">
          <Button variant="secondary" size="lg">
            Load More Festivals
          </Button>
        </div>
      </div>
    </div>
  );
}
