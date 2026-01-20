'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// Mock artist data - in production this would come from the database
const artists: Record<
  string,
  {
    name: string;
    genre: string;
    bio: string;
    imageUrl: string;
    socialLinks: { platform: string; url: string }[];
    upcomingShows: { festival: string; festivalSlug: string; date: string; stage: string }[];
  }
> = {
  'david-guetta': {
    name: 'David Guetta',
    genre: 'House / EDM',
    bio: 'David Guetta is a French DJ and music producer. He has sold over 50 million records worldwide, making him one of the best-selling music artists of all time. Known for hits like "Titanium", "When Love Takes Over", and "Play Hard".',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop',
    socialLinks: [
      { platform: 'Spotify', url: '#' },
      { platform: 'Instagram', url: '#' },
      { platform: 'Twitter', url: '#' },
    ],
    upcomingShows: [
      {
        festival: 'Electric Dreams Festival',
        festivalSlug: 'electric-dreams-2025',
        date: 'July 17, 2025',
        stage: 'Main Stage',
      },
    ],
  },
  'charlotte-de-witte': {
    name: 'Charlotte de Witte',
    genre: 'Techno',
    bio: 'Charlotte de Witte is a Belgian DJ and producer, known for her dark and driving techno sound. She runs the record label KNTXT and has performed at major festivals worldwide.',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=800&fit=crop',
    socialLinks: [
      { platform: 'Spotify', url: '#' },
      { platform: 'Instagram', url: '#' },
    ],
    upcomingShows: [
      {
        festival: 'Electric Dreams Festival',
        festivalSlug: 'electric-dreams-2025',
        date: 'July 16, 2025',
        stage: 'Techno Arena',
      },
    ],
  },
  'martin-garrix': {
    name: 'Martin Garrix',
    genre: 'EDM / Progressive House',
    bio: 'Martin Garrix is a Dutch DJ and record producer. He gained global recognition with his 2013 hit "Animals". He has been ranked as the number one DJ in the world multiple times by DJ Mag.',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=800&fit=crop',
    socialLinks: [
      { platform: 'Spotify', url: '#' },
      { platform: 'Instagram', url: '#' },
      { platform: 'YouTube', url: '#' },
    ],
    upcomingShows: [
      {
        festival: 'Electric Dreams Festival',
        festivalSlug: 'electric-dreams-2025',
        date: 'July 16, 2025',
        stage: 'Main Stage',
      },
      {
        festival: 'Summer Vibes Festival',
        festivalSlug: 'summer-vibes-2025',
        date: 'July 26, 2025',
        stage: 'Beach Stage',
      },
    ],
  },
  fisher: {
    name: 'Fisher',
    genre: 'House / Tech House',
    bio: 'Fisher (Chris Lake) is an Australian DJ and producer known for his energetic performances and hits like "Losing It" and "You Little Beauty".',
    imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&h=800&fit=crop',
    socialLinks: [
      { platform: 'Spotify', url: '#' },
      { platform: 'Instagram', url: '#' },
    ],
    upcomingShows: [
      {
        festival: 'Electric Dreams Festival',
        festivalSlug: 'electric-dreams-2025',
        date: 'July 17, 2025',
        stage: 'Main Stage',
      },
    ],
  },
  'amelie-lens': {
    name: 'Amelie Lens',
    genre: 'Techno',
    bio: 'Amelie Lens is a Belgian DJ and producer, known for her energetic techno sets and her record label Lenske Records.',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=800&fit=crop',
    socialLinks: [
      { platform: 'Spotify', url: '#' },
      { platform: 'Instagram', url: '#' },
    ],
    upcomingShows: [
      {
        festival: 'Electric Dreams Festival',
        festivalSlug: 'electric-dreams-2025',
        date: 'July 18, 2025',
        stage: 'Techno Arena',
      },
    ],
  },
  'tale-of-us': {
    name: 'Tale Of Us',
    genre: 'Melodic Techno',
    bio: 'Tale Of Us is an Italian DJ duo consisting of Carmine Conte and Matteo Milleri. Known for their melodic and emotional techno sound, they run the record label Afterlife.',
    imageUrl: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&h=800&fit=crop',
    socialLinks: [
      { platform: 'Spotify', url: '#' },
      { platform: 'Instagram', url: '#' },
    ],
    upcomingShows: [
      {
        festival: 'Electric Dreams Festival',
        festivalSlug: 'electric-dreams-2025',
        date: 'July 17, 2025',
        stage: 'Secret Garden',
      },
    ],
  },
  'dua-lipa': {
    name: 'Dua Lipa',
    genre: 'Pop',
    bio: 'Dua Lipa is a British-Albanian singer and songwriter. Known for hits like "New Rules", "Levitating", and "Don\'t Start Now", she has won multiple Grammy Awards.',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=800&fit=crop',
    socialLinks: [
      { platform: 'Spotify', url: '#' },
      { platform: 'Instagram', url: '#' },
      { platform: 'Twitter', url: '#' },
    ],
    upcomingShows: [
      {
        festival: 'Summer Vibes Festival',
        festivalSlug: 'summer-vibes-2025',
        date: 'July 26, 2025',
        stage: 'Main Stage',
      },
    ],
  },
  'the-weeknd': {
    name: 'The Weeknd',
    genre: 'R&B / Pop',
    bio: 'The Weeknd is a Canadian singer-songwriter known for his unique voice and hits like "Blinding Lights", "Starboy", and "Save Your Tears".',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop',
    socialLinks: [
      { platform: 'Spotify', url: '#' },
      { platform: 'Instagram', url: '#' },
    ],
    upcomingShows: [
      {
        festival: 'Summer Vibes Festival',
        festivalSlug: 'summer-vibes-2025',
        date: 'July 27, 2025',
        stage: 'Main Stage',
      },
    ],
  },
  'calvin-harris': {
    name: 'Calvin Harris',
    genre: 'Electronic / House',
    bio: 'Calvin Harris is a Scottish DJ, record producer, and songwriter. He has produced numerous global hits and collaborated with artists like Rihanna, Dua Lipa, and Sam Smith.',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=800&fit=crop',
    socialLinks: [
      { platform: 'Spotify', url: '#' },
      { platform: 'Instagram', url: '#' },
    ],
    upcomingShows: [
      {
        festival: 'Summer Vibes Festival',
        festivalSlug: 'summer-vibes-2025',
        date: 'July 26, 2025',
        stage: 'Beach Stage',
      },
    ],
  },
  'post-malone': {
    name: 'Post Malone',
    genre: 'Hip-Hop / Pop',
    bio: 'Post Malone is an American rapper and singer known for blending hip-hop, pop, and rock. His hits include "Rockstar", "Congratulations", and "Circles".',
    imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&h=800&fit=crop',
    socialLinks: [
      { platform: 'Spotify', url: '#' },
      { platform: 'Instagram', url: '#' },
    ],
    upcomingShows: [
      {
        festival: 'Summer Vibes Festival',
        festivalSlug: 'summer-vibes-2025',
        date: 'July 25, 2025',
        stage: 'Main Stage',
      },
    ],
  },
  kygo: {
    name: 'Kygo',
    genre: 'Tropical House',
    bio: 'Kygo is a Norwegian DJ and producer known for his tropical house style and hits like "Firestone", "It Ain\'t Me", and "Higher Love".',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=800&fit=crop',
    socialLinks: [
      { platform: 'Spotify', url: '#' },
      { platform: 'Instagram', url: '#' },
    ],
    upcomingShows: [
      {
        festival: 'Summer Vibes Festival',
        festivalSlug: 'summer-vibes-2025',
        date: 'July 27, 2025',
        stage: 'Sunset Stage',
      },
    ],
  },
  'billie-eilish': {
    name: 'Billie Eilish',
    genre: 'Pop / Alternative',
    bio: 'Billie Eilish is an American singer-songwriter known for her distinctive style and hits like "Bad Guy", "Everything I Wanted", and "Happier Than Ever".',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=800&fit=crop',
    socialLinks: [
      { platform: 'Spotify', url: '#' },
      { platform: 'Instagram', url: '#' },
    ],
    upcomingShows: [
      {
        festival: 'Summer Vibes Festival',
        festivalSlug: 'summer-vibes-2025',
        date: 'July 26, 2025',
        stage: 'Main Stage',
      },
    ],
  },
};

export default function ArtistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const artist = artists[slug];

  if (!artist) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="container-app">
          <Card variant="solid" padding="lg" className="text-center">
            <div className="py-12">
              <svg
                className="w-16 h-16 mx-auto text-white/30 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <h1 className="text-2xl font-bold text-white mb-2">Artist Not Found</h1>
              <p className="text-white/60 mb-6">
                We couldn&apos;t find the artist you&apos;re looking for.
              </p>
              <Button variant="primary" onClick={() => router.back()}>
                Go Back
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative h-[50vh] min-h-[400px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${artist.imageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-festival-dark via-festival-dark/60 to-transparent" />

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-24 left-4 md:left-8 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 hover:bg-white/20 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Artist Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container-app">
            <span className="inline-block px-3 py-1 rounded-full bg-primary-500/20 text-primary-400 text-sm font-medium mb-4">
              {artist.genre}
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">{artist.name}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-app py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio */}
            <Card variant="solid" padding="lg">
              <h2 className="text-xl font-bold text-white mb-4">About</h2>
              <p className="text-white/70 leading-relaxed">{artist.bio}</p>
            </Card>

            {/* Upcoming Shows */}
            {artist.upcomingShows.length > 0 && (
              <Card variant="solid" padding="lg">
                <h2 className="text-xl font-bold text-white mb-4">Upcoming Shows</h2>
                <div className="space-y-4">
                  {artist.upcomingShows.map((show, index) => (
                    <Link
                      key={index}
                      href={`/festivals/${show.festivalSlug}`}
                      className="block p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors">
                            {show.festival}
                          </h3>
                          <p className="text-white/60 text-sm mt-1">
                            {show.date} - {show.stage}
                          </p>
                        </div>
                        <svg
                          className="w-5 h-5 text-white/40 group-hover:text-primary-400 transition-colors"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Social Links */}
            <Card variant="solid" padding="lg">
              <h3 className="font-semibold text-white mb-4">Follow {artist.name}</h3>
              <div className="space-y-3">
                {artist.socialLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                      <span className="text-primary-400">{link.platform[0]}</span>
                    </div>
                    <span className="text-white group-hover:text-primary-400 transition-colors">
                      {link.platform}
                    </span>
                    <svg
                      className="w-4 h-4 ml-auto text-white/40"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                ))}
              </div>
            </Card>

            {/* Quick Stats */}
            <Card variant="gradient" padding="lg">
              <h3 className="font-semibold text-white mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-xl bg-white/10">
                  <div className="text-2xl font-bold text-white">{artist.upcomingShows.length}</div>
                  <div className="text-white/60 text-sm">Upcoming Shows</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-white/10">
                  <div className="text-2xl font-bold text-white">{artist.socialLinks.length}</div>
                  <div className="text-white/60 text-sm">Social Platforms</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
