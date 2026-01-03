'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { artistsApi, stagesApi, lineupApi } from '../../lib/api';
import type { CreatePerformanceDto, UpdatePerformanceDto } from '../../types';

// =====================
// Query Keys
// =====================

export const artistQueryKeys = {
  all: ['artists'] as const,
  lists: () => [...artistQueryKeys.all, 'list'] as const,
  list: (params?: ArtistListParams) => [...artistQueryKeys.lists(), params] as const,
  details: () => [...artistQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...artistQueryKeys.details(), id] as const,
  byFestival: (festivalId: string) => [...artistQueryKeys.all, 'festival', festivalId] as const,
  genres: () => [...artistQueryKeys.all, 'genres'] as const,
};

export const stageQueryKeys = {
  all: ['stages'] as const,
  lists: () => [...stageQueryKeys.all, 'list'] as const,
  byFestival: (festivalId: string) => [...stageQueryKeys.lists(), festivalId] as const,
  details: () => [...stageQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...stageQueryKeys.details(), id] as const,
};

export const lineupQueryKeys = {
  all: ['lineup'] as const,
  lists: () => [...lineupQueryKeys.all, 'list'] as const,
  byFestival: (festivalId: string, params?: LineupParams) =>
    [...lineupQueryKeys.lists(), festivalId, params] as const,
  details: () => [...lineupQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...lineupQueryKeys.details(), id] as const,
};

// =====================
// Types
// =====================

export interface ArtistListParams {
  page?: number;
  limit?: number;
  search?: string;
  genre?: string;
}

export interface LineupParams {
  stageId?: string;
  date?: string;
  includeCancelled?: boolean;
  page?: number;
  limit?: number;
}

// =====================
// Artist Hooks
// =====================

/**
 * Hook to fetch a paginated list of all artists
 */
export function useArtists(params?: ArtistListParams) {
  return useQuery({
    queryKey: artistQueryKeys.list(params),
    queryFn: () => artistsApi.getAll(params),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch artists for a specific festival
 */
export function useArtistsByFestival(festivalId: string) {
  return useQuery({
    queryKey: artistQueryKeys.byFestival(festivalId),
    queryFn: () => artistsApi.getByFestival(festivalId),
    enabled: !!festivalId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single artist by ID
 */
export function useArtist(id: string) {
  return useQuery({
    queryKey: artistQueryKeys.detail(id),
    queryFn: () => artistsApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch all unique genres
 */
export function useArtistGenres() {
  return useQuery({
    queryKey: artistQueryKeys.genres(),
    queryFn: () => artistsApi.getGenres(),
    staleTime: 30 * 60 * 1000, // Genres rarely change
  });
}

/**
 * Hook to create a new artist
 */
export function useCreateArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Artist>) => artistsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artistQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: artistQueryKeys.genres() });
    },
  });
}

/**
 * Hook to update an existing artist
 */
export function useUpdateArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Artist> }) =>
      artistsApi.update(id, data),
    onSuccess: (updatedArtist) => {
      queryClient.setQueryData(artistQueryKeys.detail(updatedArtist.id), updatedArtist);
      queryClient.invalidateQueries({ queryKey: artistQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: artistQueryKeys.genres() });
    },
  });
}

/**
 * Hook to delete an artist
 */
export function useDeleteArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => artistsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: artistQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: artistQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: artistQueryKeys.genres() });
    },
  });
}

// =====================
// Stage Hooks
// =====================

/**
 * Hook to fetch stages for a festival
 */
export function useStages(festivalId: string) {
  return useQuery({
    queryKey: stageQueryKeys.byFestival(festivalId),
    queryFn: () => stagesApi.getByFestival(festivalId),
    enabled: !!festivalId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single stage by ID
 */
export function useStage(id: string) {
  return useQuery({
    queryKey: stageQueryKeys.detail(id),
    queryFn: () => stagesApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new stage
 */
export function useCreateStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ festivalId, data }: { festivalId: string; data: Partial<Stage> }) =>
      stagesApi.create(festivalId, data),
    onSuccess: (_, { festivalId }) => {
      queryClient.invalidateQueries({ queryKey: stageQueryKeys.byFestival(festivalId) });
    },
  });
}

/**
 * Hook to update an existing stage
 */
export function useUpdateStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Stage> }) => stagesApi.update(id, data),
    onSuccess: (updatedStage) => {
      queryClient.setQueryData(stageQueryKeys.detail(updatedStage.id), updatedStage);
      // We need to invalidate all festival stage lists since we don't know which festival
      queryClient.invalidateQueries({ queryKey: stageQueryKeys.lists() });
    },
  });
}

/**
 * Hook to delete a stage
 */
export function useDeleteStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => stagesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: stageQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: stageQueryKeys.lists() });
      // Also invalidate lineup since performances may be affected
      queryClient.invalidateQueries({ queryKey: lineupQueryKeys.all });
    },
  });
}

// =====================
// Lineup / Performance Hooks
// =====================

/**
 * Hook to fetch the lineup for a festival
 */
export function useLineup(festivalId: string, params?: LineupParams) {
  return useQuery({
    queryKey: lineupQueryKeys.byFestival(festivalId, params),
    queryFn: () => lineupApi.getByFestival(festivalId, params),
    enabled: !!festivalId,
    staleTime: 2 * 60 * 1000, // 2 minutes - lineup changes more frequently
  });
}

/**
 * Hook to fetch a single performance by ID
 */
export function usePerformance(id: string) {
  return useQuery({
    queryKey: lineupQueryKeys.detail(id),
    queryFn: () => lineupApi.getPerformanceById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new performance
 */
export function useCreatePerformance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ festivalId, data }: { festivalId: string; data: CreatePerformanceDto }) =>
      lineupApi.createPerformance(festivalId, data),
    onSuccess: (_, { festivalId }) => {
      // Invalidate the lineup for this festival
      queryClient.invalidateQueries({
        queryKey: lineupQueryKeys.byFestival(festivalId),
      });
      // Also invalidate artist performance counts
      queryClient.invalidateQueries({ queryKey: artistQueryKeys.all });
    },
  });
}

/**
 * Hook to update an existing performance
 */
export function useUpdatePerformance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UpdatePerformanceDto> }) =>
      lineupApi.updatePerformance(id, data),
    onSuccess: (updatedPerformance) => {
      queryClient.setQueryData(lineupQueryKeys.detail(updatedPerformance.id), updatedPerformance);
      // Invalidate all lineup lists since we don't know the festival ID
      queryClient.invalidateQueries({ queryKey: lineupQueryKeys.lists() });
    },
  });
}

/**
 * Hook to delete a performance
 */
export function useDeletePerformance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => lineupApi.deletePerformance(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: lineupQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: lineupQueryKeys.lists() });
      // Also invalidate artist performance counts
      queryClient.invalidateQueries({ queryKey: artistQueryKeys.all });
    },
  });
}

/**
 * Hook to cancel a performance (soft delete)
 */
export function useCancelPerformance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => lineupApi.cancelPerformance(id),
    onSuccess: (updatedPerformance) => {
      queryClient.setQueryData(lineupQueryKeys.detail(updatedPerformance.id), updatedPerformance);
      queryClient.invalidateQueries({ queryKey: lineupQueryKeys.lists() });
    },
  });
}
