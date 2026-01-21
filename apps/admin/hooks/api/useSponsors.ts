'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sponsorsApi } from '../../lib/api';
import type { CreateSponsorDto, UpdateSponsorDto, SponsorTier } from '../../types';

// =====================
// Query Keys
// =====================

export const sponsorQueryKeys = {
  all: ['sponsors'] as const,
  lists: () => [...sponsorQueryKeys.all, 'list'] as const,
  byFestival: (festivalId: string, tier?: SponsorTier) =>
    [...sponsorQueryKeys.lists(), festivalId, { tier }] as const,
  byTier: (festivalId: string) => [...sponsorQueryKeys.all, 'by-tier', festivalId] as const,
  details: () => [...sponsorQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...sponsorQueryKeys.details(), id] as const,
};

// =====================
// Sponsor Hooks
// =====================

/**
 * Hook to fetch sponsors for a specific festival
 */
export function useSponsors(
  festivalId: string,
  options?: { tier?: SponsorTier; activeOnly?: boolean }
) {
  return useQuery({
    queryKey: sponsorQueryKeys.byFestival(festivalId, options?.tier),
    queryFn: () =>
      sponsorsApi.getByFestival(festivalId, {
        tier: options?.tier,
        activeOnly: options?.activeOnly,
      }),
    enabled: !!festivalId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch sponsors grouped by tier
 */
export function useSponsorsByTier(festivalId: string) {
  return useQuery({
    queryKey: sponsorQueryKeys.byTier(festivalId),
    queryFn: () => sponsorsApi.getByTier(festivalId),
    enabled: !!festivalId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single sponsor by ID
 */
export function useSponsor(id: string) {
  return useQuery({
    queryKey: sponsorQueryKeys.detail(id),
    queryFn: () => sponsorsApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new sponsor
 */
export function useCreateSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ festivalId, data }: { festivalId: string; data: CreateSponsorDto }) =>
      sponsorsApi.create(festivalId, data),
    onSuccess: (_, { festivalId }) => {
      queryClient.invalidateQueries({ queryKey: sponsorQueryKeys.byFestival(festivalId) });
      queryClient.invalidateQueries({ queryKey: sponsorQueryKeys.byTier(festivalId) });
    },
  });
}

/**
 * Hook to update an existing sponsor
 */
export function useUpdateSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSponsorDto }) =>
      sponsorsApi.update(id, data),
    onSuccess: (updatedSponsor) => {
      queryClient.setQueryData(sponsorQueryKeys.detail(updatedSponsor.id), updatedSponsor);
      // Invalidate the festival list to reflect changes
      queryClient.invalidateQueries({ queryKey: sponsorQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sponsorQueryKeys.all });
    },
  });
}

/**
 * Hook to delete a sponsor
 */
export function useDeleteSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sponsorsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: sponsorQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: sponsorQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sponsorQueryKeys.all });
    },
  });
}

/**
 * Hook to toggle sponsor active status
 */
export function useToggleSponsorActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      sponsorsApi.toggleActive(id, isActive),
    onSuccess: (updatedSponsor) => {
      queryClient.setQueryData(sponsorQueryKeys.detail(updatedSponsor.id), updatedSponsor);
      // Invalidate the festival list to reflect changes
      queryClient.invalidateQueries({ queryKey: sponsorQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sponsorQueryKeys.all });
    },
  });
}
