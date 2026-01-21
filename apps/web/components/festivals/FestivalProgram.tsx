'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import { SelectComponent } from '@/components/ui/Select';
import { Spinner } from '@festival/ui';

// API URL for client-side fetching
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

// Types matching the API response
interface Artist {
  id: string;
  name: string;
  genre: string | null;
  bio?: string | null;
  imageUrl: string | null;
}

interface Stage {
  id: string;
  name: string;
  description?: string | null;
  capacity: number | null;
  location?: string | null;
}

interface Performance {
  id: string;
  artist: {
    id: string;
    name: string;
    genre: string;
    image: string;
  };
  stage: {
    id: string;
    name: string;
    location: string;
    capacity: number;
  };
  startTime: string;
  endTime: string;
  day: string;
  isFavorite?: boolean;
}

interface FestivalProgramProps {
  festivalId: string;
  festivalSlug: string;
  startDate: string;
  endDate: string;
}

// Generate array of dates between start and end
function generateDateRange(startDate: string, endDate: string): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// Format date for display
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Format date as YYYY-MM-DD for API
function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function FestivalProgram({
  festivalId,
  festivalSlug: _festivalSlug,
  startDate,
  endDate,
}: FestivalProgramProps) {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // Generate date range for day tabs
  const dates = useMemo(() => generateDateRange(startDate, endDate), [startDate, endDate]);

  // Extract unique genres from performances
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    performances.forEach((perf) => {
      if (perf.artist.genre && perf.artist.genre !== 'Unknown') {
        genreSet.add(perf.artist.genre);
      }
    });
    return Array.from(genreSet).sort();
  }, [performances]);

  // Fetch program data
  useEffect(() => {
    async function fetchProgramData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch all data in parallel
        const [programRes, stagesRes, artistsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/program?festivalId=${festivalId}`),
          fetch(`${API_BASE_URL}/program/stages?festivalId=${festivalId}`),
          fetch(`${API_BASE_URL}/program/artists?festivalId=${festivalId}`),
        ]);

        if (!programRes.ok || !stagesRes.ok || !artistsRes.ok) {
          throw new Error('Failed to fetch program data');
        }

        const [programData, stagesData, artistsData] = await Promise.all([
          programRes.json(),
          stagesRes.json(),
          artistsRes.json(),
        ]);

        setPerformances(programData);
        setStages(stagesData);
        setArtists(artistsData);
      } catch (err) {
        console.error('Error fetching program data:', err);
        setError('Failed to load program data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchProgramData();
  }, [festivalId]);

  // Day names in French (index 0 = Sunday)
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  // Filter performances based on selected filters
  const filteredPerformances = useMemo(() => {
    return performances.filter((perf) => {
      // Filter by day
      if (selectedDay !== 'all') {
        // selectedDay is in format YYYY-MM-DD
        // perf.day is the day name in French (e.g., "Jeudi")
        const selectedDate = new Date(selectedDay);
        const selectedDayName = dayNames[selectedDate.getDay()];
        if (perf.day !== selectedDayName) {
          return false;
        }
      }

      // Filter by stage
      if (selectedStage !== 'all' && perf.stage.id !== selectedStage) {
        return false;
      }

      // Filter by genre
      if (selectedGenre !== 'all' && perf.artist.genre !== selectedGenre) {
        return false;
      }

      return true;
    });
  }, [performances, selectedDay, selectedStage, selectedGenre]);

  // Group performances by stage for display
  const performancesByStage = useMemo(() => {
    const grouped: Record<string, Performance[]> = {};
    filteredPerformances.forEach((perf) => {
      if (!grouped[perf.stage.id]) {
        grouped[perf.stage.id] = [];
      }
      grouped[perf.stage.id].push(perf);
    });
    return grouped;
  }, [filteredPerformances]);

  // Build genre options for select
  const genreOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Tous les genres' },
      ...genres.map((genre) => ({ value: genre, label: genre })),
    ];
  }, [genres]);

  // Build stage options for select
  const stageOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Toutes les scenes' },
      ...stages.map((stage) => ({ value: stage.id, label: stage.name })),
    ];
  }, [stages]);

  if (loading) {
    return (
      <section id="program-section" className="py-8">
        <h2 className="text-2xl font-bold text-white mb-6">Programme</h2>
        <Card variant="solid" padding="lg">
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
            <span className="ml-4 text-white/60">Chargement du programme...</span>
          </div>
        </Card>
      </section>
    );
  }

  if (error) {
    return (
      <section id="program-section" className="py-8">
        <h2 className="text-2xl font-bold text-white mb-6">Programme</h2>
        <Card variant="solid" padding="lg">
          <div className="text-center py-12">
            <p className="text-red-400">{error}</p>
          </div>
        </Card>
      </section>
    );
  }

  if (performances.length === 0) {
    return (
      <section id="program-section" className="py-8">
        <h2 className="text-2xl font-bold text-white mb-6">Programme</h2>
        <Card variant="solid" padding="lg">
          <div className="text-center py-12">
            <p className="text-white/60">Le programme sera bientot disponible.</p>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section id="program-section" className="py-8">
      <h2 className="text-2xl font-bold text-white mb-6">Programme</h2>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Genre Filter */}
        <div className="flex-1 max-w-xs">
          <SelectComponent
            options={genreOptions}
            value={selectedGenre}
            onChange={setSelectedGenre}
            placeholder="Tous les genres"
            size="md"
          />
        </div>

        {/* Stage Filter */}
        <div className="flex-1 max-w-xs">
          <SelectComponent
            options={stageOptions}
            value={selectedStage}
            onChange={setSelectedStage}
            placeholder="Toutes les scenes"
            size="md"
          />
        </div>
      </div>

      {/* Day Tabs */}
      <Tabs value={selectedDay} onChange={setSelectedDay} variant="pills">
        <TabList aria-label="Festival days" className="flex-wrap mb-6">
          <Tab value="all">Tous les jours</Tab>
          {dates.map((date) => (
            <Tab key={formatDateForApi(date)} value={formatDateForApi(date)}>
              {formatDate(date)}
            </Tab>
          ))}
        </TabList>

        {/* Content - show all days or filtered */}
        <TabPanel value={selectedDay} className="mt-0">
          {filteredPerformances.length === 0 ? (
            <Card variant="solid" padding="lg">
              <div className="text-center py-8">
                <p className="text-white/60">
                  Aucune performance ne correspond aux filtres selectionnes.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Group by stage */}
              {Object.entries(performancesByStage).map(([stageId, stagePerformances]) => {
                const stage = stages.find((s) => s.id === stageId) || stagePerformances[0]?.stage;
                if (!stage) {
                  return null;
                }

                return (
                  <div key={stageId}>
                    {/* Stage Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                        <h3 className="text-xl font-semibold text-white">{stage.name}</h3>
                      </div>
                      {stage.capacity && (
                        <span className="text-sm text-white/50">
                          Capacite: {stage.capacity.toLocaleString()} personnes
                        </span>
                      )}
                    </div>

                    {/* Performances Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stagePerformances.map((perf) => (
                        <Link
                          key={perf.id}
                          href={`/artists/${perf.artist.id}`}
                          className="block group"
                        >
                          <Card
                            variant="glow"
                            padding="md"
                            className="group-hover:border-primary-500/50 transition-colors h-full"
                          >
                            <div className="flex items-center gap-4">
                              {/* Artist Avatar */}
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg group-hover:scale-105 transition-transform flex-shrink-0">
                                {perf.artist.image ? (
                                  <img
                                    src={perf.artist.image}
                                    alt={perf.artist.name}
                                    className="w-full h-full object-cover rounded-xl"
                                  />
                                ) : (
                                  perf.artist.name.charAt(0)
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-white group-hover:text-primary-400 transition-colors truncate">
                                  {perf.artist.name}
                                </h4>
                                <p className="text-sm text-white/60 truncate">
                                  {perf.artist.genre}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-white/50">
                                  <span>{perf.day}</span>
                                  <span>-</span>
                                  <span>
                                    {perf.startTime} - {perf.endTime}
                                  </span>
                                </div>
                              </div>

                              {/* Arrow */}
                              <svg
                                className="w-5 h-5 text-white/30 group-hover:text-primary-400 transition-colors flex-shrink-0"
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
                  </div>
                );
              })}
            </div>
          )}
        </TabPanel>
      </Tabs>

      {/* Artists Count Summary */}
      <div className="mt-8 text-center">
        <p className="text-white/50 text-sm">
          {artists.length} artistes - {stages.length} scenes - {performances.length} performances
        </p>
      </div>
    </section>
  );
}
