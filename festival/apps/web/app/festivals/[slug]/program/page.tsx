'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/components/ui/Dropdown';

// Types
interface Artist {
  id: string;
  name: string;
  genre: string;
  bio: string;
  photo: string;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    spotify?: string;
    website?: string;
  };
}

interface Performance {
  id: string;
  artistId: string;
  artist: Artist;
  stage: string;
  startTime: string;
  endTime: string;
  date: string;
}

interface ProgramData {
  festivalName: string;
  festivalSlug: string;
  startDate: string;
  endDate: string;
  performances: Performance[];
  stages: string[];
}

// Mock data - will be replaced by API call
const mockProgramData: ProgramData = {
  festivalName: 'Electric Dreams Festival',
  festivalSlug: 'electric-dreams-2025',
  startDate: '2025-07-15',
  endDate: '2025-07-18',
  stages: ['Main Stage', 'Electronic Arena', 'Indie Garden', 'Techno Dome', 'Sunset Terrace'],
  performances: [
    // Day 1 - July 15
    {
      id: '1',
      artistId: 'a1',
      artist: {
        id: 'a1',
        name: 'Aurora Dreams',
        genre: 'Electronic / Ambient',
        bio: 'Aurora Dreams is an electronic music producer known for ethereal soundscapes and mesmerizing live performances. With over 5 million streams worldwide, they have become a festival favorite.',
        photo: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
        socialLinks: {
          instagram: 'https://instagram.com/auroradreams',
          spotify: 'https://open.spotify.com/artist/auroradreams',
          website: 'https://auroradreams.com',
        },
      },
      stage: 'Electronic Arena',
      startTime: '18:00',
      endTime: '19:30',
      date: '2025-07-15',
    },
    {
      id: '2',
      artistId: 'a2',
      artist: {
        id: 'a2',
        name: 'The Midnight Riders',
        genre: 'Rock / Indie',
        bio: 'The Midnight Riders bring raw energy and authentic rock & roll to every stage. Their latest album topped charts across Europe.',
        photo: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
        socialLinks: {
          instagram: 'https://instagram.com/midnightriders',
          facebook: 'https://facebook.com/midnightriders',
          spotify: 'https://open.spotify.com/artist/midnightriders',
        },
      },
      stage: 'Main Stage',
      startTime: '20:00',
      endTime: '21:30',
      date: '2025-07-15',
    },
    {
      id: '3',
      artistId: 'a3',
      artist: {
        id: 'a3',
        name: 'DJ Synthwave',
        genre: 'Techno / House',
        bio: 'DJ Synthwave is a pioneer in the modern techno scene, blending classic synth sounds with cutting-edge production techniques.',
        photo: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400',
        socialLinks: {
          instagram: 'https://instagram.com/djsynthwave',
          spotify: 'https://open.spotify.com/artist/djsynthwave',
        },
      },
      stage: 'Techno Dome',
      startTime: '22:00',
      endTime: '00:00',
      date: '2025-07-15',
    },
    // Day 2 - July 16
    {
      id: '4',
      artistId: 'a4',
      artist: {
        id: 'a4',
        name: 'Luna & The Cosmos',
        genre: 'Pop / Electronic',
        bio: 'Luna brings cosmic energy to electronic pop, creating anthems that resonate with audiences worldwide. Grammy-nominated artist.',
        photo: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400',
        socialLinks: {
          instagram: 'https://instagram.com/lunaandthecosmos',
          spotify: 'https://open.spotify.com/artist/lunaandthecosmos',
          website: 'https://lunaandthecosmos.com',
        },
      },
      stage: 'Main Stage',
      startTime: '19:00',
      endTime: '20:30',
      date: '2025-07-16',
    },
    {
      id: '5',
      artistId: 'a5',
      artist: {
        id: 'a5',
        name: 'Neon Collective',
        genre: 'Indie / Alternative',
        bio: 'Neon Collective is a four-piece indie band known for their introspective lyrics and atmospheric soundscapes.',
        photo: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=400',
        socialLinks: {
          instagram: 'https://instagram.com/neoncollective',
          facebook: 'https://facebook.com/neoncollective',
          spotify: 'https://open.spotify.com/artist/neoncollective',
        },
      },
      stage: 'Indie Garden',
      startTime: '17:00',
      endTime: '18:00',
      date: '2025-07-16',
    },
    {
      id: '6',
      artistId: 'a6',
      artist: {
        id: 'a6',
        name: 'Bass Revolution',
        genre: 'Drum & Bass',
        bio: 'Bass Revolution delivers high-energy drum & bass sets that keep crowds moving until dawn. Festival circuit veterans.',
        photo: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
        socialLinks: {
          spotify: 'https://open.spotify.com/artist/bassrevolution',
        },
      },
      stage: 'Electronic Arena',
      startTime: '21:00',
      endTime: '22:30',
      date: '2025-07-16',
    },
    // Day 3 - July 17
    {
      id: '7',
      artistId: 'a7',
      artist: {
        id: 'a7',
        name: 'Sunset Symphony',
        genre: 'Chill / Downtempo',
        bio: 'Sunset Symphony creates the perfect soundtrack for golden hour, blending organic instruments with electronic production.',
        photo: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400',
        socialLinks: {
          instagram: 'https://instagram.com/sunsetsymphony',
          spotify: 'https://open.spotify.com/artist/sunsetsymphony',
          website: 'https://sunsetsymphony.com',
        },
      },
      stage: 'Sunset Terrace',
      startTime: '16:00',
      endTime: '17:30',
      date: '2025-07-17',
    },
    {
      id: '8',
      artistId: 'a8',
      artist: {
        id: 'a8',
        name: 'Electric Pulse',
        genre: 'EDM / Progressive House',
        bio: 'Electric Pulse is one of the biggest names in EDM, headlining major festivals worldwide with explosive live shows.',
        photo: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
        socialLinks: {
          instagram: 'https://instagram.com/electricpulse',
          facebook: 'https://facebook.com/electricpulse',
          spotify: 'https://open.spotify.com/artist/electricpulse',
          website: 'https://electricpulse.com',
        },
      },
      stage: 'Main Stage',
      startTime: '22:00',
      endTime: '00:00',
      date: '2025-07-17',
    },
    // Day 4 - July 18
    {
      id: '9',
      artistId: 'a9',
      artist: {
        id: 'a9',
        name: 'Velvet Underground Revival',
        genre: 'Alternative / Psychedelic',
        bio: 'Inspired by the legends, this band brings a modern twist to psychedelic rock with captivating stage presence.',
        photo: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400',
        socialLinks: {
          instagram: 'https://instagram.com/velvetundergroundrevival',
          spotify: 'https://open.spotify.com/artist/velvetundergroundrevival',
        },
      },
      stage: 'Indie Garden',
      startTime: '18:00',
      endTime: '19:30',
      date: '2025-07-18',
    },
    {
      id: '10',
      artistId: 'a10',
      artist: {
        id: 'a10',
        name: 'Crystal Waves',
        genre: 'Trance / Progressive',
        bio: 'Crystal Waves takes listeners on a journey through euphoric trance melodies and uplifting progressive beats.',
        photo: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400',
        socialLinks: {
          instagram: 'https://instagram.com/crystalwaves',
          spotify: 'https://open.spotify.com/artist/crystalwaves',
          website: 'https://crystalwaves.com',
        },
      },
      stage: 'Techno Dome',
      startTime: '20:00',
      endTime: '22:00',
      date: '2025-07-18',
    },
  ],
};

export default function ProgramPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';

  const [programData, setProgramData] = useState<ProgramData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch program data
  useEffect(() => {
    const fetchProgramData = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/festivals/${slug}/program`);
        // const data = await response.json();
        // setProgramData(data);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgramData(mockProgramData);
        setSelectedDate(mockProgramData.startDate);
      } catch (error) {
        console.error('Failed to fetch program data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgramData();
  }, [slug]);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`favorites_${slug}`);
    if (saved) {
      setFavorites(new Set(JSON.parse(saved)));
    }
  }, [slug]);

  // Generate festival days
  const festivalDays = useMemo(() => {
    if (!programData) return [];

    const days: string[] = [];
    const start = new Date(programData.startDate);
    const end = new Date(programData.endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d).toISOString().split('T')[0]);
    }

    return days;
  }, [programData]);

  // Filter performances
  const filteredPerformances = useMemo(() => {
    if (!programData) return [];

    return programData.performances
      .filter(p => p.date === selectedDate)
      .filter(p => selectedStage === 'all' || p.stage === selectedStage)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [programData, selectedDate, selectedStage]);

  // Toggle favorite
  const toggleFavorite = (artistId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(artistId)) {
      newFavorites.delete(artistId);
    } else {
      newFavorites.add(artistId);
    }
    setFavorites(newFavorites);
    localStorage.setItem(`favorites_${slug}`, JSON.stringify(Array.from(newFavorites)));
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Format day name
  const formatDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4"></div>
          <p className="text-white/60">Loading program...</p>
        </div>
      </div>
    );
  }

  if (!programData) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60">Failed to load program data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-festival-darker pt-24 pb-16">
      <div className="container-app max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-8">
          <Link href="/festivals" className="text-white/50 hover:text-white transition-colors">
            Festivals
          </Link>
          <span className="text-white/30">/</span>
          <Link
            href={`/festivals/${slug}`}
            className="text-white/50 hover:text-white transition-colors"
          >
            {programData.festivalName}
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white">Program</span>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-primary-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Festival Program
          </h1>
          <p className="text-white/60 text-lg">
            Discover all performances and artists for {programData.festivalName}
          </p>
        </div>

        {/* Day Selector Tabs */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max md:min-w-0">
            {festivalDays.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDate(day)}
                className={`
                  flex-shrink-0 px-6 py-3 rounded-xl font-medium transition-all duration-300
                  ${
                    selectedDate === day
                      ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/25'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                  }
                `}
              >
                <div className="text-sm">{formatDayName(day)}</div>
                <div className="text-xs opacity-75 mt-1">{formatDate(day)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Stage Filter */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Dropdown>
            <DropdownTrigger className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all">
              <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>
                {selectedStage === 'all' ? 'All Stages' : selectedStage}
              </span>
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </DropdownTrigger>
            <DropdownMenu minWidth="min-w-64">
              <DropdownItem onClick={() => setSelectedStage('all')}>
                All Stages
              </DropdownItem>
              {programData.stages.map((stage) => (
                <DropdownItem key={stage} onClick={() => setSelectedStage(stage)}>
                  {stage}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>

          <div className="text-white/60 text-sm">
            {filteredPerformances.length} performance{filteredPerformances.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Timeline View */}
        {filteredPerformances.length === 0 ? (
          <Card variant="solid" padding="lg" className="text-center">
            <p className="text-white/60">No performances scheduled for this selection.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPerformances.map((performance) => (
              <Card
                key={performance.id}
                variant="glow"
                padding="none"
                className="overflow-hidden hover:scale-[1.01] transition-transform duration-300"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Time & Stage */}
                  <div className="md:w-48 bg-gradient-to-br from-primary-900/40 to-pink-900/40 p-6 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/10">
                    <div className="text-2xl font-bold text-white mb-1">
                      {performance.startTime}
                    </div>
                    <div className="text-sm text-white/60 mb-3">
                      to {performance.endTime}
                    </div>
                    <div className="inline-flex items-center gap-2 text-xs font-medium text-primary-300 bg-primary-500/20 px-3 py-1 rounded-full w-fit">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                      </svg>
                      {performance.stage}
                    </div>
                  </div>

                  {/* Artist Photo */}
                  <div className="md:w-40 h-40 md:h-auto flex-shrink-0">
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${performance.artist.photo})` }}
                    />
                  </div>

                  {/* Artist Info */}
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-2xl font-bold text-white">
                          {performance.artist.name}
                        </h3>
                        <button
                          onClick={() => toggleFavorite(performance.artistId)}
                          className="flex-shrink-0 p-2 -m-2 hover:scale-110 transition-transform"
                          aria-label={favorites.has(performance.artistId) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {favorites.has(performance.artistId) ? (
                            <svg className="w-6 h-6 text-red-500 fill-current" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-white/40 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="text-sm text-white/60 mb-3">{performance.artist.genre}</div>
                      <p className="text-white/70 text-sm line-clamp-2">
                        {performance.artist.bio}
                      </p>
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={() => setSelectedArtist(performance.artist)}
                        className="text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center gap-2 transition-colors group"
                      >
                        View Artist Details
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Artist Details Modal */}
      <Modal
        isOpen={selectedArtist !== null}
        onClose={() => setSelectedArtist(null)}
        size="xl"
        title={selectedArtist?.name}
      >
        {selectedArtist && (
          <div className="space-y-6">
            {/* Artist Photo */}
            <div className="w-full h-64 rounded-xl overflow-hidden">
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${selectedArtist.photo})` }}
              />
            </div>

            {/* Genre */}
            <div>
              <h4 className="text-sm font-medium text-white/60 mb-2">Genre</h4>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-primary-300 bg-primary-500/20 px-4 py-2 rounded-full">
                {selectedArtist.genre}
              </div>
            </div>

            {/* Biography */}
            <div>
              <h4 className="text-sm font-medium text-white/60 mb-2">Biography</h4>
              <p className="text-white/80 leading-relaxed">{selectedArtist.bio}</p>
            </div>

            {/* Social Links */}
            {Object.keys(selectedArtist.socialLinks).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white/60 mb-3">Follow</h4>
                <div className="flex flex-wrap gap-3">
                  {selectedArtist.socialLinks.instagram && (
                    <a
                      href={selectedArtist.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      Instagram
                    </a>
                  )}
                  {selectedArtist.socialLinks.facebook && (
                    <a
                      href={selectedArtist.socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </a>
                  )}
                  {selectedArtist.socialLinks.spotify && (
                    <a
                      href={selectedArtist.socialLinks.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Spotify
                    </a>
                  )}
                  {selectedArtist.socialLinks.website && (
                    <a
                      href={selectedArtist.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all border border-white/20"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                      </svg>
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Favorite Button */}
            <div className="pt-4 border-t border-white/10">
              <button
                onClick={() => toggleFavorite(selectedArtist.id)}
                className={`
                  w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                  ${
                    favorites.has(selectedArtist.id)
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                      : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                  }
                `}
              >
                {favorites.has(selectedArtist.id) ? (
                  <>
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                    </svg>
                    Remove from Favorites
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                    Add to Favorites
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
