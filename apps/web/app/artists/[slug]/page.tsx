'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api';

// Fetch all artists from all festivals to find one by ID
async function fetchArtistById(artistId: string): Promise<Artist | null> {
  try {
    // Get all festivals first
    const festivalsRes = await fetch(`${API_URL}/festivals`);
    if (!festivalsRes.ok) return null;

    const festivalsData = await festivalsRes.json();
    const festivals = festivalsData.data || festivalsData;

    // Search for artist in each festival
    for (const festival of festivals) {
      const artistsRes = await fetch(`${API_URL}/program/artists?festivalId=${festival.id}`);
      if (!artistsRes.ok) continue;

      const artists = await artistsRes.json();
      const artist = artists.find((a: { id: string }) => a.id === artistId);

      if (artist) {
        // Also get performances for this artist
        const programRes = await fetch(`${API_URL}/program?festivalId=${festival.id}`);
        const performances = programRes.ok ? await programRes.json() : [];
        const artistPerformances = performances.filter(
          (p: { artist: { id: string } }) => p.artist?.id === artistId
        );

        return {
          id: artist.id,
          name: artist.name,
          slug: artist.id,
          genre: artist.genre || 'Music',
          bio: artist.bio || 'Biographie non disponible.',
          imageUrl:
            artist.imageUrl ||
            'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop',
          socialLinks: [],
          upcomingShows: artistPerformances.map(
            (perf: { stage?: { name: string }; day?: string; startTime?: string }) => ({
              festival: festival.name,
              festivalSlug: festival.slug,
              date: perf.day || 'Date TBA',
              stage: perf.stage?.name || 'Stage TBA',
            })
          ),
        };
      }
    }

    return null;
  } catch (err) {
    console.error('Error fetching artist:', err);
    return null;
  }
}

interface SocialLink {
  platform: string;
  url: string;
}

interface UpcomingShow {
  festival: string;
  festivalSlug: string;
  date: string;
  stage: string;
}

interface Artist {
  id: string;
  name: string;
  slug: string;
  genre: string;
  bio: string;
  imageUrl: string;
  socialLinks: SocialLink[];
  upcomingShows: UpcomingShow[];
}

export default function ArtistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadArtist() {
      if (!slug) return;

      setIsLoading(true);
      setError(null);

      try {
        const foundArtist = await fetchArtistById(slug);
        setArtist(foundArtist);
      } catch (err) {
        console.error('Error fetching artist:', err);
        setError("Impossible de charger les informations de l'artiste.");
      } finally {
        setIsLoading(false);
      }
    }

    loadArtist();
  }, [slug]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="container-app">
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
              <h1 className="text-2xl font-bold text-white mb-2">Error Loading Artist</h1>
              <p className="text-white/60 mb-6">{error}</p>
              <Button variant="primary" onClick={() => router.back()}>
                Go Back
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Artist not found state
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
                      href={show.festivalSlug ? `/festivals/${show.festivalSlug}` : '#'}
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
            {artist.socialLinks.length > 0 && (
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
            )}

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
