import Link from 'next/link';
import {
  FestivalCard,
  type Festival as FestivalCardType,
} from '@/components/festivals/FestivalCard';

export const dynamic = 'force-dynamic';

// API URL for server-side fetching
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

interface ApiFestival {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  location: string;
  address: string | null;
  startDate: string;
  endDate: string;
  status: string;
  maxCapacity: number;
  currentAttendees: number;
  logoUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  timezone: string;
  currency: string;
  genres?: string[];
  isFeatured?: boolean;
  ticketCategories?: {
    id: string;
    name: string;
    price: string;
    isActive: boolean;
  }[];
}

// Fetch featured festivals from API
async function fetchFeaturedFestivals(): Promise<ApiFestival[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/festivals/featured?limit=6`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!res.ok) {
      console.error('Failed to fetch featured festivals:', res.status);
      return [];
    }

    return res.json();
  } catch (error) {
    console.error('Failed to fetch featured festivals from API:', error);
    return [];
  }
}

// Transform API festival to FestivalCard format
function transformFestival(festival: ApiFestival): FestivalCardType {
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
    description: festival.description || 'Decouvrez ce festival incroyable',
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
    genres: festival.genres || [],
    isSoldOut: festival.currentAttendees >= festival.maxCapacity,
    isFeatured: festival.isFeatured || false,
  };
}

export default async function Home() {
  const apiFestivals = await fetchFeaturedFestivals();
  const featuredFestivals = apiFestivals.map(transformFestival);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/20 via-festival-dark to-festival-dark"></div>
        <div className="relative container-app text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
            Festival Platform
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            La plateforme tout-en-un pour decouvrir et vivre les meilleurs festivals
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/festivals"
              className="px-8 py-3 bg-festival-accent hover:bg-pink-600 rounded-full font-semibold transition"
            >
              Decouvrir les festivals
            </Link>
            <Link
              href="/auth/register"
              className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition"
            >
              Creer un compte
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Festivals Section */}
      {featuredFestivals.length > 0 && (
        <section className="py-16 px-4">
          <div className="container-app">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white">Festivals en vedette</h2>
              <Link
                href="/festivals"
                className="text-primary-400 hover:text-primary-300 font-medium transition flex items-center gap-2"
              >
                Voir tous les festivals
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredFestivals.slice(0, 3).map((festival) => (
                <FestivalCard key={festival.id} festival={festival} variant="featured" />
              ))}
            </div>

            {featuredFestivals.length > 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {featuredFestivals.slice(3, 6).map((festival) => (
                  <FestivalCard key={festival.id} festival={festival} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-16 px-4 bg-white/5">
        <div className="container-app">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Nos services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/festivals"
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition cursor-pointer block space-y-3"
            >
              <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center mb-4">
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
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-festival-accent">Billetterie</h3>
              <p className="text-gray-300">Vente de billets en ligne avec QR codes securises</p>
            </Link>

            <Link
              href="/cashless"
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition cursor-pointer block space-y-3"
            >
              <div className="w-12 h-12 bg-secondary-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-secondary-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-festival-accent">Cashless</h3>
              <p className="text-gray-300">Paiements NFC rapides et sans contact</p>
            </Link>

            <Link
              href="/programme"
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition cursor-pointer block space-y-3"
            >
              <div className="w-12 h-12 bg-accent-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-accent-400"
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
              <h3 className="text-2xl font-semibold text-festival-accent">Programme</h3>
              <p className="text-gray-300">Gestion des artistes et des scenes</p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="container-app text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Pret a vivre l'experience festival?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Rejoignez des milliers de festivaliers et decouvrez les meilleurs evenements pres de
            chez vous.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/login"
              className="px-8 py-3 bg-festival-accent hover:bg-pink-600 rounded-full font-semibold transition"
            >
              Se connecter
            </Link>
            <Link
              href="/auth/register"
              className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition"
            >
              Creer un compte
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
