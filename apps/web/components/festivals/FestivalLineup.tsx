'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Artist {
  name: string;
  genre: string;
  time: string;
  stage: string;
}

interface FestivalLineupProps {
  artists: Artist[];
  initialCount?: number;
}

export function FestivalLineup({ artists, initialCount = 4 }: FestivalLineupProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleArtists = showAll ? artists : artists.slice(0, initialCount);
  const hasMore = artists.length > initialCount;

  // Generate a slug from artist name
  const getArtistSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <section id="lineup-section">
      <h2 className="text-2xl font-bold text-white mb-6">Lineup</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleArtists.map((artist) => (
          <Link
            key={artist.name}
            href={`/artists/${getArtistSlug(artist.name)}`}
            className="block group"
          >
            <Card
              variant="glow"
              padding="md"
              className="group-hover:border-primary-500/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform">
                  {artist.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors">
                    {artist.name}
                  </h3>
                  <p className="text-white/60 text-sm">{artist.genre}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-white/50">
                    <span>{artist.time}</span>
                    <span>-</span>
                    <span>{artist.stage}</span>
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-white/30 group-hover:text-primary-400 transition-colors"
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
            </Card>
          </Link>
        ))}
      </div>
      {hasMore && (
        <div className="mt-6 text-center">
          <Button variant="secondary" onClick={() => setShowAll(!showAll)}>
            {showAll ? (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
                Show Less
              </>
            ) : (
              <>
                View Full Lineup ({artists.length} artists)
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
