import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { FestivalHero, Festival } from '../../../components/festivals/FestivalCard';

// Mock data - in production this would come from an API
const festivals: Record<string, Festival & { lineup: { name: string; genre: string; time: string; stage: string }[]; schedule: { date: string; events: { time: string; title: string; stage: string }[] }[] }> = {
  'electric-dreams-2025': {
    id: '1',
    slug: 'electric-dreams-2025',
    name: 'Electric Dreams Festival',
    description: 'Experience the ultimate electronic music festival featuring world-renowned DJs and immersive art installations across 5 stages. Join us for 4 days of non-stop music, art, and unforgettable memories in the heart of Barcelona.',
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
      { name: 'Tale Of Us', genre: 'Melodic Techno', time: 'Saturday 02:00', stage: 'Secret Garden' },
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
                <p className="text-white/70 leading-relaxed">
                  {festival.description}
                </p>
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
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Lineup</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {festival.lineup.map((artist) => (
                  <Card key={artist.name} variant="glow" padding="md">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                        {artist.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{artist.name}</h3>
                        <p className="text-white/60 text-sm">{artist.genre}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-white/50">
                          <span>{artist.time}</span>
                          <span>-</span>
                          <span>{artist.stage}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Button variant="secondary">View Full Lineup</Button>
              </div>
            </section>

            {/* Location */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Location</h2>
              <Card variant="solid" padding="none" className="overflow-hidden">
                <div className="h-64 bg-white/5 flex items-center justify-center">
                  <div className="text-center text-white/50">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p>Interactive map coming soon</p>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-white mb-2">{festival.location}</h3>
                  <p className="text-white/60 text-sm">
                    The festival grounds are located 30 minutes from Barcelona city center.
                    Shuttle buses will run regularly from Placa Catalunya.
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
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: festival.price.currency, minimumFractionDigits: 0 }).format(festival.price.from)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">VIP Pass</span>
                  <span className="text-white font-semibold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: festival.price.currency, minimumFractionDigits: 0 }).format(festival.price.from * 2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Premium Experience</span>
                  <span className="text-white font-semibold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: festival.price.currency, minimumFractionDigits: 0 }).format(festival.price.from * 3)}
                  </span>
                </div>
              </div>

              <Button as="link" href={`/festivals/${festival.slug}/tickets`} variant="accent" fullWidth size="lg">
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
                  <svg className="w-5 h-5 text-primary-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="text-white text-sm font-medium">Dates</div>
                    <div className="text-white/60 text-sm">
                      {new Date(festival.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {new Date(festival.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-primary-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <div className="text-white text-sm font-medium">Location</div>
                    <div className="text-white/60 text-sm">{festival.location}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-primary-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="text-white text-sm font-medium">Duration</div>
                    <div className="text-white/60 text-sm">4 days</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-primary-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <div className="text-white text-sm font-medium">Age Restriction</div>
                    <div className="text-white/60 text-sm">18+</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Share */}
            <Card variant="solid" padding="md">
              <h3 className="font-semibold text-white mb-3 text-sm">Share this festival</h3>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                  <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </button>
                <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                  <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                  </svg>
                </button>
                <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                  <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
