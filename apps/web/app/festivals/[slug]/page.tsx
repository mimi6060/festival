import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FestivalHero, FestivalLineup, FestivalShare, type Festival } from '@/components/festivals';

export const dynamic = 'force-dynamic';

// Mock data - in production this would come from an API
const festivals: Record<
  string,
  Festival & {
    lineup: { name: string; genre: string; time: string; stage: string }[];
    schedule: { date: string; events: { time: string; title: string; stage: string }[] }[];
  }
> = {
  'electric-dreams-2025': {
    id: '1',
    slug: 'electric-dreams-2025',
    name: 'Electric Dreams Festival',
    description:
      'Experience the ultimate electronic music festival featuring world-renowned DJs and immersive art installations across 5 stages. Join us for 4 days of non-stop music, art, and unforgettable memories in the heart of Barcelona.',
    location: 'Barcelona, Spain',
    startDate: '2025-07-15',
    endDate: '2025-07-18',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&h=1080&fit=crop',
    price: { from: 199, currency: 'EUR' },
    genres: ['Electronic', 'House', 'Techno', 'Trance'],
    isFeatured: true,
    lineup: [
      { name: 'David Guetta', genre: 'House', time: 'Saturday 23:00', stage: 'Main Stage' },
      { name: 'Charlotte de Witte', genre: 'Techno', time: 'Friday 22:00', stage: 'Techno Arena' },
      { name: 'Fisher', genre: 'House', time: 'Saturday 21:00', stage: 'Main Stage' },
      { name: 'Amelie Lens', genre: 'Techno', time: 'Sunday 00:00', stage: 'Techno Arena' },
      { name: 'Martin Garrix', genre: 'EDM', time: 'Friday 23:30', stage: 'Main Stage' },
      {
        name: 'Tale Of Us',
        genre: 'Melodic Techno',
        time: 'Saturday 02:00',
        stage: 'Secret Garden',
      },
    ],
    schedule: [
      {
        date: '2025-07-15',
        events: [
          { time: '16:00', title: 'Gates Open', stage: 'All Stages' },
          { time: '18:00', title: 'Opening Ceremony', stage: 'Main Stage' },
          { time: '20:00', title: 'Local DJs Showcase', stage: 'Beach Stage' },
        ],
      },
      {
        date: '2025-07-16',
        events: [
          { time: '14:00', title: 'Yoga Session', stage: 'Wellness Area' },
          { time: '16:00', title: 'Afternoon Beats', stage: 'Beach Stage' },
          { time: '22:00', title: 'Charlotte de Witte', stage: 'Techno Arena' },
          { time: '23:30', title: 'Martin Garrix', stage: 'Main Stage' },
        ],
      },
    ],
  },
  'rock-revolution-2025': {
    id: '2',
    slug: 'rock-revolution-2025',
    name: 'Rock Revolution',
    description:
      'The biggest rock festival in Europe with legendary headliners and emerging artists. Three days of pure rock energy featuring multiple stages and unforgettable performances.',
    location: 'London, UK',
    startDate: '2025-08-22',
    endDate: '2025-08-24',
    imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1920&h=1080&fit=crop',
    price: { from: 149, currency: 'GBP' },
    genres: ['Rock', 'Alternative', 'Metal'],
    lineup: [
      { name: 'Foo Fighters', genre: 'Rock', time: 'Saturday 22:00', stage: 'Main Stage' },
      { name: 'Arctic Monkeys', genre: 'Indie Rock', time: 'Sunday 21:00', stage: 'Main Stage' },
      { name: 'Royal Blood', genre: 'Rock', time: 'Friday 20:00', stage: 'Rock Arena' },
      {
        name: 'Bring Me The Horizon',
        genre: 'Metal',
        time: 'Saturday 19:00',
        stage: 'Heavy Stage',
      },
    ],
    schedule: [
      {
        date: '2025-08-22',
        events: [
          { time: '14:00', title: 'Gates Open', stage: 'All Stages' },
          { time: '16:00', title: 'Local Bands', stage: 'Discovery Stage' },
          { time: '20:00', title: 'Royal Blood', stage: 'Rock Arena' },
        ],
      },
    ],
  },
  'summer-beats-2025': {
    id: '3',
    slug: 'summer-beats-2025',
    name: 'Summer Beats Festival',
    description:
      'A celebration of hip-hop, R&B, and urban music under the summer sun. Join us in Paris for three days of the hottest urban acts.',
    location: 'Paris, France',
    startDate: '2025-06-28',
    endDate: '2025-06-30',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop',
    price: { from: 129, currency: 'EUR' },
    genres: ['Hip-Hop', 'R&B', 'Urban'],
    lineup: [
      { name: 'Kendrick Lamar', genre: 'Hip-Hop', time: 'Saturday 23:00', stage: 'Main Stage' },
      { name: 'SZA', genre: 'R&B', time: 'Sunday 21:00', stage: 'Main Stage' },
      { name: 'Tyler, The Creator', genre: 'Hip-Hop', time: 'Friday 22:00', stage: 'Urban Arena' },
      { name: 'Doja Cat', genre: 'Pop/R&B', time: 'Saturday 20:00', stage: 'Main Stage' },
    ],
    schedule: [
      {
        date: '2025-06-28',
        events: [
          { time: '15:00', title: 'Gates Open', stage: 'All Stages' },
          { time: '18:00', title: 'DJ Sets', stage: 'Beach Stage' },
          { time: '22:00', title: 'Tyler, The Creator', stage: 'Urban Arena' },
        ],
      },
    ],
  },
  'jazz-nights-2025': {
    id: '4',
    slug: 'jazz-nights-2025',
    name: 'Jazz Nights',
    description:
      'An intimate jazz experience in the heart of Amsterdam with international artists. Three nights of smooth jazz, soul, and blues.',
    location: 'Amsterdam, Netherlands',
    startDate: '2025-09-05',
    endDate: '2025-09-07',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&h=1080&fit=crop',
    price: { from: 89, currency: 'EUR' },
    genres: ['Jazz', 'Soul', 'Blues'],
    lineup: [
      { name: 'Kamasi Washington', genre: 'Jazz', time: 'Saturday 21:00', stage: 'Main Stage' },
      { name: 'Gregory Porter', genre: 'Jazz/Soul', time: 'Friday 20:00', stage: 'Main Stage' },
      { name: 'Snarky Puppy', genre: 'Jazz Fusion', time: 'Sunday 19:00', stage: 'Club Stage' },
      { name: 'Robert Glasper', genre: 'Jazz', time: 'Saturday 18:00', stage: 'Intimate Stage' },
    ],
    schedule: [
      {
        date: '2025-09-05',
        events: [
          { time: '17:00', title: 'Doors Open', stage: 'All Venues' },
          { time: '19:00', title: 'Opening Act', stage: 'Club Stage' },
          { time: '20:00', title: 'Gregory Porter', stage: 'Main Stage' },
        ],
      },
    ],
  },
  'indie-vibes-2025': {
    id: '5',
    slug: 'indie-vibes-2025',
    name: 'Indie Vibes',
    description:
      'Discover the best indie and alternative artists in a beautiful coastal setting. Three days of unique sounds and ocean views in Lisbon.',
    location: 'Lisbon, Portugal',
    startDate: '2025-07-01',
    endDate: '2025-07-03',
    imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1920&h=1080&fit=crop',
    price: { from: 99, currency: 'EUR' },
    genres: ['Indie', 'Alternative', 'Folk'],
    lineup: [
      { name: 'Tame Impala', genre: 'Psychedelic', time: 'Saturday 22:00', stage: 'Ocean Stage' },
      { name: 'Bon Iver', genre: 'Indie Folk', time: 'Sunday 21:00', stage: 'Forest Stage' },
      { name: 'Mac DeMarco', genre: 'Indie Rock', time: 'Friday 20:00', stage: 'Beach Stage' },
      { name: 'Phoebe Bridgers', genre: 'Indie', time: 'Saturday 19:00', stage: 'Ocean Stage' },
    ],
    schedule: [
      {
        date: '2025-07-01',
        events: [
          { time: '14:00', title: 'Festival Opens', stage: 'All Stages' },
          { time: '17:00', title: 'Sunset Session', stage: 'Beach Stage' },
          { time: '20:00', title: 'Mac DeMarco', stage: 'Beach Stage' },
        ],
      },
    ],
  },
  'tropical-bass-2025': {
    id: '6',
    slug: 'tropical-bass-2025',
    name: 'Tropical Bass Festival',
    description:
      'Where electronic beats meet tropical vibes. Dance on the beach all day and night in the world capital of electronic music - Ibiza.',
    location: 'Ibiza, Spain',
    startDate: '2025-08-10',
    endDate: '2025-08-14',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1920&h=1080&fit=crop',
    price: { from: 249, currency: 'EUR' },
    genres: ['Electronic', 'Tropical', 'Bass'],
    isFeatured: true,
    lineup: [
      { name: 'Diplo', genre: 'Electronic', time: 'Saturday 23:00', stage: 'Beach Stage' },
      { name: 'Major Lazer', genre: 'Electronic', time: 'Sunday 22:00', stage: 'Main Stage' },
      { name: 'Kaytranada', genre: 'Electronic/R&B', time: 'Friday 21:00', stage: 'Sunset Stage' },
      { name: 'Disclosure', genre: 'House', time: 'Saturday 20:00', stage: 'Pool Stage' },
      { name: 'Jamie xx', genre: 'Electronic', time: 'Sunday 00:00', stage: 'Club Stage' },
      { name: 'Four Tet', genre: 'Electronic', time: 'Monday 02:00', stage: 'Secret Stage' },
    ],
    schedule: [
      {
        date: '2025-08-10',
        events: [
          { time: '12:00', title: 'Beach Party Starts', stage: 'Beach Stage' },
          { time: '16:00', title: 'Pool Party', stage: 'Pool Stage' },
          { time: '21:00', title: 'Kaytranada', stage: 'Sunset Stage' },
        ],
      },
      {
        date: '2025-08-11',
        events: [
          { time: '14:00', title: 'Day Party', stage: 'Beach Stage' },
          { time: '20:00', title: 'Disclosure', stage: 'Pool Stage' },
          { time: '23:00', title: 'Diplo', stage: 'Beach Stage' },
        ],
      },
    ],
  },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const festival = festivals[slug];

  if (!festival) {
    return {
      title: 'Festival Not Found',
    };
  }

  return {
    title: festival.name,
    description: festival.description,
    openGraph: {
      title: festival.name,
      description: festival.description,
      images: [festival.imageUrl],
    },
  };
}

export default async function FestivalDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const festival = festivals[slug];

  if (!festival) {
    notFound();
  }

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
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">About the Festival</h2>
              <Card variant="solid" padding="lg">
                <p className="text-white/70 leading-relaxed">{festival.description}</p>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-xl bg-white/5">
                    <div className="text-2xl font-bold text-primary-400">5</div>
                    <div className="text-white/50 text-sm">Stages</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white/5">
                    <div className="text-2xl font-bold text-primary-400">100+</div>
                    <div className="text-white/50 text-sm">Artists</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white/5">
                    <div className="text-2xl font-bold text-primary-400">4</div>
                    <div className="text-white/50 text-sm">Days</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white/5">
                    <div className="text-2xl font-bold text-primary-400">50K</div>
                    <div className="text-white/50 text-sm">Capacity</div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Lineup */}
            <FestivalLineup artists={festival.lineup} initialCount={4} />

            {/* Location */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Location</h2>
              <Card variant="solid" padding="none" className="overflow-hidden">
                <div className="h-64 bg-white/5 flex items-center justify-center">
                  <div className="text-center text-white/50">
                    <svg
                      className="w-16 h-16 mx-auto mb-4"
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
                    <p>Interactive map coming soon</p>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-white mb-2">{festival.location}</h3>
                  <p className="text-white/60 text-sm">
                    The festival grounds are located 30 minutes from Barcelona city center. Shuttle
                    buses will run regularly from Placa Catalunya.
                  </p>
                </div>
              </Card>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket CTA */}
            <Card variant="gradient" padding="lg" className="sticky top-24">
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

            {/* Quick Info */}
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
                    <div className="text-white/60 text-sm">4 days</div>
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

            {/* Share */}
            <FestivalShare festivalName={festival.name} festivalSlug={festival.slug} />
          </div>
        </div>
      </div>
    </div>
  );
}
