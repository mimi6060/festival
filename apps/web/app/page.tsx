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
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section - Tomorrowland Inspired */}
      <section className="hero-festive min-h-[90vh] py-20 px-4">
        {/* Decorative orbs */}
        <div className="orb orb-purple w-[600px] h-[600px] -top-[200px] -left-[200px] animate-float-slow" />
        <div className="orb orb-pink w-[400px] h-[400px] top-[20%] right-[-100px] animate-float" />
        <div className="orb orb-cyan w-[300px] h-[300px] bottom-[10%] left-[10%] animate-float-slow" />

        {/* Content */}
        <div className="hero-content container-app text-center">
          {/* Badge */}
          <div className="inline-flex items-center mb-8">
            <span className="badge-gradient animate-pulse-glow-slow">
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              L'experience festival ultime
            </span>
          </div>

          {/* Main title with glow */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight">
            <span className="text-gradient-animated animate-text-glow">Festival</span>
            <br />
            <span className="text-white">Platform</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-gray-300/90 mb-10 max-w-3xl mx-auto leading-relaxed">
            Decouvrez les meilleurs festivals, achetez vos billets et vivez des moments inoubliables
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/festivals"
              className="btn-festive-gradient text-lg px-8 py-4 min-w-[220px]"
            >
              Decouvrir les festivals
              <svg
                className="inline-block w-5 h-5 ml-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <Link
              href="/auth/register"
              className="btn-festive-outline text-lg px-8 py-4 min-w-[220px]"
            >
              Creer un compte
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gradient-festive">50+</div>
              <div className="text-sm text-gray-400 mt-1">Festivals</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gradient-festive">100K+</div>
              <div className="text-sm text-gray-400 mt-1">Festivaliers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gradient-festive">500+</div>
              <div className="text-sm text-gray-400 mt-1">Artistes</div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg
            className="w-6 h-6 text-white/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </section>

      {/* Featured Festivals Section */}
      {featuredFestivals.length > 0 && (
        <section className="section-festive py-20 px-4">
          <div className="container-app">
            {/* Section header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Festivals en vedette
                </h2>
                <p className="text-gray-400">Les evenements les plus attendus du moment</p>
              </div>
              <Link
                href="/festivals"
                className="group flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                Voir tous les festivals
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>

            {/* Festival cards grid */}
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

      {/* Divider */}
      <div className="divider-festive mx-auto max-w-4xl" />

      {/* Features Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent pointer-events-none" />

        <div className="container-app relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Une plateforme <span className="text-gradient-festive">complete</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Tous les outils pour vivre une experience festival exceptionnelle
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Billetterie Card */}
            <Link href="/festivals" className="glass-card-festive p-8 group hover-lift">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6 group-hover:glow-purple transition-all">
                <svg
                  className="w-7 h-7 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3 group-hover:text-purple-300 transition-colors">
                Billetterie
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Achetez vos billets en ligne avec des QR codes securises et un acces instantane
              </p>
            </Link>

            {/* Cashless Card */}
            <Link href="/cashless" className="glass-card-festive p-8 group hover-lift">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center mb-6 group-hover:glow-pink transition-all">
                <svg
                  className="w-7 h-7 text-pink-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3 group-hover:text-pink-300 transition-colors">
                Cashless
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Paiements NFC ultra-rapides et sans contact pour profiter sans attendre
              </p>
            </Link>

            {/* Programme Card */}
            <Link href="/programme" className="glass-card-festive p-8 group hover-lift">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mb-6 group-hover:glow-cyan transition-all">
                <svg
                  className="w-7 h-7 text-cyan-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3 group-hover:text-cyan-300 transition-colors">
                Programme
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Consultez les horaires, scenes et artistes pour planifier votre festival
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-purple-950/20 to-[#0a0a0a]" />
          <div className="orb orb-purple w-[500px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />
        </div>

        <div className="container-app relative text-center">
          {/* Glass card CTA */}
          <div className="glass-card-strong p-12 md:p-16 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Pret a vivre <span className="text-gradient-festive">l'experience</span>?
            </h2>
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Rejoignez des milliers de festivaliers et decouvrez les meilleurs evenements pres de
              chez vous
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/login" className="btn-festive-gradient text-lg px-10 py-4">
                Se connecter
              </Link>
              <Link href="/auth/register" className="btn-festive-glow text-lg px-10 py-4">
                Creer un compte gratuit
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
