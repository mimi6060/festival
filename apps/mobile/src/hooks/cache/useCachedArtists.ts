/**
 * useCachedArtists - Artists caching hook with prefetch support
 * Optimized for festival artist data with intelligent prefetching
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  getFestivalDataCache,
  getImageCache,
  type ArtistData,
} from '../../services/cache';
import type { Artist, ProgramEvent } from '../../types';

// Hook options
export interface UseCachedArtistsOptions {
  festivalId: string;
  prefetchImages?: boolean;
  prefetchLimit?: number;
}

// Hook result
export interface UseCachedArtistsResult {
  artists: Artist[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getArtistById: (id: string) => Artist | undefined;
  searchArtists: (query: string) => Artist[];
  prefetchArtist: (artistId: string) => Promise<void>;
}

/**
 * Hook for cached artists list
 */
export function useCachedArtists(
  options: UseCachedArtistsOptions
): UseCachedArtistsResult {
  const {
    festivalId,
    prefetchImages = true,
    prefetchLimit = 20,
  } = options;

  // State
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const cacheRef = useRef(getFestivalDataCache());
  const imageCacheRef = useRef(getImageCache());
  const isMountedRef = useRef(true);

  // Initialize caches
  useEffect(() => {
    const init = async () => {
      await cacheRef.current.initialize(festivalId);
      await imageCacheRef.current.initialize();
    };

    init();

    return () => {
      isMountedRef.current = false;
    };
  }, [festivalId]);

  // Fetch artists
  const fetchArtists = useCallback(async () => {
    if (!isMountedRef.current) {return;}

    setIsLoading(true);
    setError(null);

    try {
      const result = await cacheRef.current.getArtists();

      if (!isMountedRef.current) {return;}

      if (result.data) {
        setArtists(result.data);

        // Prefetch artist images
        if (prefetchImages && result.data.length > 0) {
          const imageUrls = result.data
            .slice(0, prefetchLimit)
            .map(artist => artist.image)
            .filter((url): url is string => !!url);

          imageCacheRef.current.prefetch(imageUrls);
        }
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      if (!isMountedRef.current) {return;}

      const error = err instanceof Error ? err : new Error('Failed to fetch artists');
      setError(error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [prefetchImages, prefetchLimit]);

  // Initial fetch
  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  // Get artist by ID
  const getArtistById = useCallback(
    (id: string) => artists.find(artist => artist.id === id),
    [artists]
  );

  // Search artists
  const searchArtists = useCallback(
    (query: string) => {
      if (!query.trim()) {return artists;}

      const lowerQuery = query.toLowerCase();
      return artists.filter(
        artist =>
          artist.name.toLowerCase().includes(lowerQuery) ||
          artist.genre?.toLowerCase().includes(lowerQuery)
      );
    },
    [artists]
  );

  // Prefetch single artist
  const prefetchArtist = useCallback(async (artistId: string) => {
    await cacheRef.current.getArtist(artistId);
  }, []);

  return {
    artists,
    isLoading,
    error,
    refresh: fetchArtists,
    getArtistById,
    searchArtists,
    prefetchArtist,
  };
}

// Single artist hook options
export interface UseCachedArtistOptions {
  artistId: string;
}

// Single artist hook result
export interface UseCachedArtistResult {
  artist: Artist | null;
  performances: ProgramEvent[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for single artist with performances
 */
export function useCachedArtist(
  options: UseCachedArtistOptions
): UseCachedArtistResult {
  const { artistId } = options;

  // State
  const [artistData, setArtistData] = useState<ArtistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const cacheRef = useRef(getFestivalDataCache());
  const imageCacheRef = useRef(getImageCache());
  const isMountedRef = useRef(true);

  // Fetch artist
  const fetchArtist = useCallback(async () => {
    if (!artistId) {
      setArtistData(null);
      setIsLoading(false);
      return;
    }

    if (!isMountedRef.current) {return;}

    setIsLoading(true);
    setError(null);

    try {
      const result = await cacheRef.current.getArtist(artistId);

      if (!isMountedRef.current) {return;}

      if (result.data) {
        setArtistData(result.data);

        // Prefetch artist image
        if (result.data.artist.image) {
          imageCacheRef.current.cacheImage(result.data.artist.image);
        }
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      if (!isMountedRef.current) {return;}

      const error = err instanceof Error ? err : new Error('Failed to fetch artist');
      setError(error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [artistId]);

  // Initial fetch
  useEffect(() => {
    fetchArtist();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchArtist]);

  // Memoized values
  const artist = useMemo(() => artistData?.artist || null, [artistData]);
  const performances = useMemo(() => artistData?.performances || [], [artistData]);

  return {
    artist,
    performances,
    isLoading,
    error,
    refresh: fetchArtist,
  };
}

/**
 * Hook for artists grouped by genre
 */
export function useArtistsByGenre(festivalId: string) {
  const { artists, isLoading, error, refresh } = useCachedArtists({ festivalId });

  const artistsByGenre = useMemo(() => {
    const grouped: Record<string, Artist[]> = {};

    for (const artist of artists) {
      const genre = artist.genre || 'Other';
      if (!grouped[genre]) {
        grouped[genre] = [];
      }
      grouped[genre].push(artist);
    }

    // Sort genres alphabetically
    return Object.keys(grouped)
      .sort()
      .reduce((acc, genre) => {
        const genreArtists = grouped[genre];
        if (genreArtists) {
          acc[genre] = genreArtists.sort((a, b) => a.name.localeCompare(b.name));
        }
        return acc;
      }, {} as Record<string, Artist[]>);
  }, [artists]);

  const genres = useMemo(() => Object.keys(artistsByGenre), [artistsByGenre]);

  return {
    artistsByGenre,
    genres,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for artist search with debounce
 */
export function useArtistSearch(festivalId: string, debounceMs = 300) {
  const { artists, searchArtists } = useCachedArtists({ festivalId });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Handle search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(() => {
      const searchResults = searchArtists(query);
      setResults(searchResults);
      setIsSearching(false);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchArtists, debounceMs]);

  return {
    query,
    setQuery,
    results,
    isSearching,
    hasResults: results.length > 0,
    totalArtists: artists.length,
  };
}

export default useCachedArtists;
