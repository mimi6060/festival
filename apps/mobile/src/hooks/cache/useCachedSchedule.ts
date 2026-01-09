/**
 * useCachedSchedule - Schedule caching hook with smart refresh
 * Provides optimized schedule data with filtering and grouping capabilities
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  getFestivalDataCache,
  CacheTTL,
  type ScheduleData,
} from '../../services/cache';
import type { ProgramEvent, Stage } from '../../types';

// Hook options
export interface UseCachedScheduleOptions {
  festivalId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Schedule filters
export interface ScheduleFilters {
  day?: string;
  stageId?: string;
  artistId?: string;
  startTime?: Date;
  endTime?: Date;
  isFavoriteOnly?: boolean;
  searchQuery?: string;
}

// Grouped schedule type
export interface GroupedSchedule {
  byDay: Record<string, ProgramEvent[]>;
  byStage: Record<string, ProgramEvent[]>;
  byTimeSlot: Record<string, ProgramEvent[]>;
}

// Hook result
export interface UseCachedScheduleResult {
  // Data
  schedule: ScheduleData | null;
  events: ProgramEvent[];
  stages: Stage[];
  days: string[];

  // State
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  lastUpdatedAt: number | null;

  // Actions
  refresh: () => Promise<void>;

  // Filtering
  filteredEvents: ProgramEvent[];
  filters: ScheduleFilters;
  setFilters: (filters: ScheduleFilters) => void;
  clearFilters: () => void;

  // Grouping
  groupedSchedule: GroupedSchedule;

  // Utilities
  getEventById: (id: string) => ProgramEvent | undefined;
  getEventsByStage: (stageId: string) => ProgramEvent[];
  getEventsByArtist: (artistId: string) => ProgramEvent[];
  getEventsByDay: (day: string) => ProgramEvent[];
  getCurrentEvents: () => ProgramEvent[];
  getUpcomingEvents: (limit?: number) => ProgramEvent[];
}

/**
 * Main schedule caching hook
 */
export function useCachedSchedule(
  options: UseCachedScheduleOptions
): UseCachedScheduleResult {
  const {
    festivalId,
    autoRefresh = true,
    refreshInterval = CacheTTL.SCHEDULE,
  } = options;

  // State
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [filters, setFilters] = useState<ScheduleFilters>({});

  // Refs
  const cacheRef = useRef(getFestivalDataCache());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Initialize cache
  useEffect(() => {
    cacheRef.current.initialize(festivalId);

    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [festivalId]);

  // Fetch schedule
  const fetchSchedule = useCallback(async (isRefresh: boolean = false) => {
    if (!isMountedRef.current) return;

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await cacheRef.current.getSchedule(isRefresh);

      if (!isMountedRef.current) return;

      if (result.data) {
        setSchedule(result.data);
        setLastUpdatedAt(result.data.lastUpdated);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error('Failed to fetch schedule');
      setError(error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    refreshIntervalRef.current = setInterval(() => {
      fetchSchedule(true);
    }, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchSchedule]);

  // Extracted events
  const events = useMemo(() => schedule?.events || [], [schedule]);

  // Extract unique stages
  const stages = useMemo(() => {
    const stageMap = new Map<string, Stage>();
    for (const event of events) {
      if (event.stage && !stageMap.has(event.stage.id)) {
        stageMap.set(event.stage.id, event.stage);
      }
    }
    return Array.from(stageMap.values());
  }, [events]);

  // Extract unique days
  const days = useMemo(() => {
    const daySet = new Set<string>();
    for (const event of events) {
      if (event.day) {
        daySet.add(event.day);
      }
    }
    return Array.from(daySet).sort();
  }, [events]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let result = [...events];

    if (filters.day) {
      result = result.filter(event => event.day === filters.day);
    }

    if (filters.stageId) {
      result = result.filter(event => event.stage?.id === filters.stageId);
    }

    if (filters.artistId) {
      result = result.filter(event => event.artist?.id === filters.artistId);
    }

    if (filters.startTime) {
      result = result.filter(
        event => new Date(event.startTime) >= filters.startTime!
      );
    }

    if (filters.endTime) {
      result = result.filter(
        event => new Date(event.endTime) <= filters.endTime!
      );
    }

    if (filters.isFavoriteOnly) {
      result = result.filter(event => event.isFavorite);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        event =>
          event.artist?.name.toLowerCase().includes(query) ||
          event.stage?.name.toLowerCase().includes(query)
      );
    }

    // Sort by start time
    return result.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [events, filters]);

  // Grouped schedule
  const groupedSchedule = useMemo((): GroupedSchedule => {
    const byDay: Record<string, ProgramEvent[]> = {};
    const byStage: Record<string, ProgramEvent[]> = {};
    const byTimeSlot: Record<string, ProgramEvent[]> = {};

    for (const event of events) {
      // Group by day
      const day = event.day || 'Unknown';
      if (!byDay[day]) {
        byDay[day] = [];
      }
      byDay[day].push(event);

      // Group by stage
      const stageId = event.stage?.id || 'Unknown';
      if (!byStage[stageId]) {
        byStage[stageId] = [];
      }
      byStage[stageId].push(event);

      // Group by time slot (hourly)
      const startHour = new Date(event.startTime).getHours();
      const timeSlot = `${startHour.toString().padStart(2, '0')}:00`;
      if (!byTimeSlot[timeSlot]) {
        byTimeSlot[timeSlot] = [];
      }
      byTimeSlot[timeSlot].push(event);
    }

    // Sort events within each group
    Object.values(byDay).forEach(events =>
      events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    );
    Object.values(byStage).forEach(events =>
      events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    );
    Object.values(byTimeSlot).forEach(events =>
      events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    );

    return { byDay, byStage, byTimeSlot };
  }, [events]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Utility functions
  const getEventById = useCallback(
    (id: string) => events.find(event => event.id === id),
    [events]
  );

  const getEventsByStage = useCallback(
    (stageId: string) =>
      events
        .filter(event => event.stage?.id === stageId)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [events]
  );

  const getEventsByArtist = useCallback(
    (artistId: string) =>
      events
        .filter(event => event.artist?.id === artistId)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [events]
  );

  const getEventsByDay = useCallback(
    (day: string) =>
      events
        .filter(event => event.day === day)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [events]
  );

  const getCurrentEvents = useCallback(() => {
    const now = new Date();
    return events.filter(event => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      return start <= now && end >= now;
    });
  }, [events]);

  const getUpcomingEvents = useCallback(
    (limit: number = 10) => {
      const now = new Date();
      return events
        .filter(event => new Date(event.startTime) > now)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, limit);
    },
    [events]
  );

  const refresh = useCallback(async () => {
    await fetchSchedule(true);
  }, [fetchSchedule]);

  return {
    schedule,
    events,
    stages,
    days,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    refresh,
    filteredEvents,
    filters,
    setFilters,
    clearFilters,
    groupedSchedule,
    getEventById,
    getEventsByStage,
    getEventsByArtist,
    getEventsByDay,
    getCurrentEvents,
    getUpcomingEvents,
  };
}

/**
 * Hook for schedule by specific day
 */
export function useScheduleByDay(festivalId: string, day: string) {
  const { getEventsByDay, isLoading, error, refresh } = useCachedSchedule({
    festivalId,
  });

  const events = useMemo(() => getEventsByDay(day), [getEventsByDay, day]);

  // Group by time slot
  const eventsByTimeSlot = useMemo(() => {
    const grouped: Record<string, ProgramEvent[]> = {};

    for (const event of events) {
      const hour = new Date(event.startTime).getHours();
      const slot = `${hour.toString().padStart(2, '0')}:00`;

      if (!grouped[slot]) {
        grouped[slot] = [];
      }
      grouped[slot].push(event);
    }

    return grouped;
  }, [events]);

  const timeSlots = useMemo(
    () => Object.keys(eventsByTimeSlot).sort(),
    [eventsByTimeSlot]
  );

  return {
    events,
    eventsByTimeSlot,
    timeSlots,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for schedule by specific stage
 */
export function useScheduleByStage(festivalId: string, stageId: string) {
  const { getEventsByStage, stages, isLoading, error, refresh } = useCachedSchedule({
    festivalId,
  });

  const events = useMemo(() => getEventsByStage(stageId), [getEventsByStage, stageId]);

  const stage = useMemo(
    () => stages.find(s => s.id === stageId),
    [stages, stageId]
  );

  // Group by day
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, ProgramEvent[]> = {};

    for (const event of events) {
      const day = event.day || 'Unknown';
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(event);
    }

    return grouped;
  }, [events]);

  return {
    stage,
    events,
    eventsByDay,
    days: Object.keys(eventsByDay).sort(),
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for currently playing events
 */
export function useCurrentlyPlaying(festivalId: string, refreshInterval: number = 30000) {
  const { getCurrentEvents, isLoading, error } = useCachedSchedule({ festivalId });
  const [currentEvents, setCurrentEvents] = useState<ProgramEvent[]>([]);

  // Update current events
  useEffect(() => {
    const updateCurrent = () => {
      setCurrentEvents(getCurrentEvents());
    };

    updateCurrent();

    const interval = setInterval(updateCurrent, refreshInterval);
    return () => clearInterval(interval);
  }, [getCurrentEvents, refreshInterval]);

  return {
    currentEvents,
    isLoading,
    error,
    hasCurrentEvents: currentEvents.length > 0,
  };
}

/**
 * Hook for smart schedule refresh based on proximity to next event
 */
export function useSmartScheduleRefresh(festivalId: string) {
  const { getUpcomingEvents, refresh } = useCachedSchedule({ festivalId });
  const lastRefreshRef = useRef<number>(Date.now());

  useEffect(() => {
    const checkRefresh = () => {
      const upcoming = getUpcomingEvents(1);

      if (upcoming.length === 0) {
        // No upcoming events, refresh every 5 minutes
        if (Date.now() - lastRefreshRef.current > 5 * 60 * 1000) {
          refresh();
          lastRefreshRef.current = Date.now();
        }
        return;
      }

      const nextEvent = upcoming[0];
      if (!nextEvent) return;
      const timeUntilNext = new Date(nextEvent.startTime).getTime() - Date.now();

      // Refresh more frequently as we approach the next event
      let refreshThreshold: number;

      if (timeUntilNext < 5 * 60 * 1000) {
        // Less than 5 minutes - refresh every 30 seconds
        refreshThreshold = 30 * 1000;
      } else if (timeUntilNext < 30 * 60 * 1000) {
        // Less than 30 minutes - refresh every 2 minutes
        refreshThreshold = 2 * 60 * 1000;
      } else {
        // More than 30 minutes - refresh every 5 minutes
        refreshThreshold = 5 * 60 * 1000;
      }

      if (Date.now() - lastRefreshRef.current > refreshThreshold) {
        refresh();
        lastRefreshRef.current = Date.now();
      }
    };

    // Check every 10 seconds
    const interval = setInterval(checkRefresh, 10 * 1000);
    checkRefresh(); // Initial check

    return () => clearInterval(interval);
  }, [getUpcomingEvents, refresh]);
}

export default useCachedSchedule;
