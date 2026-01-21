import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  FestivalHero,
  FestivalShare,
  FestivalProgram,
  FestivalMap,
  type Festival,
} from '@/components/festivals';

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
  stages?: {
    id: string;
    name: string;
    capacity: number | null;
  }[];
}

// Fetch festival from API
async function fetchFestival(slug: string): Promise<ApiFestival | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/festivals/by-slug/${slug}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch {
    console.error('Failed to fetch festival from API');
    return null;
  }
}

// Fetch artist count for a festival from API
async function fetchArtistCount(festivalId: string): Promise<number> {
  try {
    const res = await fetch(`${API_BASE_URL}/program/artists?festivalId=${festivalId}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!res.ok) {
      return 0;
    }

    const artists = await res.json();
    return Array.isArray(artists) ? artists.length : 0;
  } catch {
    console.error('Failed to fetch artist count from API');
    return 0;
  }
}

// Transform API festival to component format
function transformApiFestival(apiFestival: ApiFestival): Festival {
  // Get minimum price from ticket categories
  let minPrice = 0;
  if (apiFestival.ticketCategories && apiFestival.ticketCategories.length > 0) {
    const prices = apiFestival.ticketCategories
      .filter((tc) => tc.isActive)
      .map((tc) => parseFloat(tc.price));
    minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  }

  return {
    id: apiFestival.id,
    slug: apiFestival.slug,
    name: apiFestival.name,
    description:
      apiFestival.description || 'Decouvrez ce festival incroyable avec les meilleurs artistes.',
    location: apiFestival.location,
    startDate: apiFestival.startDate,
    endDate: apiFestival.endDate,
    imageUrl:
      apiFestival.bannerUrl ||
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&h=1080&fit=crop',
    price: {
      from: minPrice,
      currency: apiFestival.currency || 'EUR',
    },
    genres: apiFestival.genres || [],
    isFeatured: apiFestival.isFeatured || false,
    isSoldOut: apiFestival.currentAttendees >= apiFestival.maxCapacity,
  };
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // Fetch from API
  const apiFestival = await fetchFestival(slug);
  if (apiFestival) {
    return {
      title: apiFestival.name,
      description: apiFestival.description || `Decouvrez ${apiFestival.name}`,
      openGraph: {
        title: apiFestival.name,
        description: apiFestival.description || `Decouvrez ${apiFestival.name}`,
        images: apiFestival.bannerUrl ? [apiFestival.bannerUrl] : [],
      },
    };
  }

  return {
    title: 'Festival Not Found',
  };
}

export default async function FestivalDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Fetch from API
  const apiFestival = await fetchFestival(slug);

  if (!apiFestival) {
    notFound();
  }

  // Fetch artist count in parallel
  const artistCount = await fetchArtistCount(apiFestival.id);
  const festival = transformApiFestival(apiFestival);

  // Calculate stats from festival data
  const festivalDays =
    Math.ceil(
      (new Date(festival.endDate).getTime() - new Date(festival.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;
  const stageCount = apiFestival.stages?.length || 0;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <FestivalHero festival={festival} />

      {/* Content */}
      <div className="container-app py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* About */}
            <section id="about-section">
              <h2 className="text-2xl font-bold text-white mb-6">About the Festival</h2>
              <Card variant="solid" padding="lg">
                <p className="text-white/70 leading-relaxed">{festival.description}</p>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-xl bg-white/5">
                    <div className="text-2xl font-bold text-primary-400">{stageCount}</div>
                    <div className="text-white/50 text-sm">Stages</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white/5">
                    <div className="text-2xl font-bold text-primary-400">{artistCount}</div>
                    <div className="text-white/50 text-sm">Artists</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white/5">
                    <div className="text-2xl font-bold text-primary-400">{festivalDays}</div>
                    <div className="text-white/50 text-sm">Days</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white/5">
                    <div className="text-2xl font-bold text-primary-400">
                      {Math.round(apiFestival.maxCapacity / 1000)}K
                    </div>
                    <div className="text-white/50 text-sm">Capacity</div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Program - Interactive schedule with filters */}
            <FestivalProgram
              festivalId={apiFestival.id}
              festivalSlug={apiFestival.slug}
              startDate={apiFestival.startDate}
              endDate={apiFestival.endDate}
            />

            {/* Location & Map with POIs */}
            <section id="location-section">
              <h2 className="text-2xl font-bold text-white mb-6">Carte & Points d&apos;interet</h2>
              <FestivalMap festivalId={apiFestival.id} location={festival.location} />
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info - First in sidebar */}
            <Card variant="solid" padding="lg">
              <h3 className="font-semibold text-white mb-4">Quick Info</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-primary-400 mt-0.5"
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
                  <div>
                    <div className="text-white text-sm font-medium">Dates</div>
                    <div className="text-white/60 text-sm">
                      {new Date(festival.startDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                      })}{' '}
                      -{' '}
                      {new Date(festival.endDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-primary-400 mt-0.5"
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
                  <div>
                    <div className="text-white text-sm font-medium">Location</div>
                    <div className="text-white/60 text-sm">{festival.location}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-primary-400 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <div className="text-white text-sm font-medium">Duration</div>
                    <div className="text-white/60 text-sm">{festivalDays} days</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-primary-400 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <div>
                    <div className="text-white text-sm font-medium">Age Restriction</div>
                    <div className="text-white/60 text-sm">18+</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Ticket CTA */}
            <Card variant="gradient" padding="lg">
              <h3 className="text-xl font-bold text-white mb-2">Get Your Tickets</h3>
              <p className="text-white/60 text-sm mb-6">
                Secure your spot at {festival.name}. Limited tickets available!
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">General Admission</span>
                  <span className="text-white font-semibold">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: festival.price.currency,
                      minimumFractionDigits: 0,
                    }).format(festival.price.from)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">VIP Pass</span>
                  <span className="text-white font-semibold">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: festival.price.currency,
                      minimumFractionDigits: 0,
                    }).format(festival.price.from * 2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Premium Experience</span>
                  <span className="text-white font-semibold">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: festival.price.currency,
                      minimumFractionDigits: 0,
                    }).format(festival.price.from * 3)}
                  </span>
                </div>
              </div>

              <Button
                as="link"
                href={`/festivals/${festival.slug}/tickets`}
                variant="accent"
                fullWidth
                size="lg"
              >
                Buy Tickets
              </Button>

              <p className="text-center text-white/40 text-xs mt-4">
                Free cancellation up to 30 days before the event
              </p>
            </Card>

            {/* Share */}
            <FestivalShare festivalName={festival.name} festivalSlug={festival.slug} />
          </div>
        </div>
      </div>
    </div>
  );
}
