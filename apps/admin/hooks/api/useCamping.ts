'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campingApi } from '../../lib/api';
import type { CreateCampingZoneDto, UpdateCampingZoneDto } from '../../types';

// Query Keys
export const campingQueryKeys = {
  all: ['camping'] as const,
  zones: (festivalId: string) => [...campingQueryKeys.all, 'zones', festivalId] as const,
  zone: (id: string) => [...campingQueryKeys.all, 'zone', id] as const,
};

// Fetch all camping zones for a festival
export function useCampingZones(festivalId: string) {
  return useQuery({
    queryKey: campingQueryKeys.zones(festivalId),
    queryFn: () => campingApi.getByFestival(festivalId),
    enabled: !!festivalId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Fetch a single camping zone by ID
export function useCampingZone(id: string) {
  return useQuery({
    queryKey: campingQueryKeys.zone(id),
    queryFn: () => campingApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create camping zone mutation
export function useCreateCampingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ festivalId, data }: { festivalId: string; data: CreateCampingZoneDto }) =>
      campingApi.create(festivalId, data),
    onSuccess: (newZone) => {
      queryClient.invalidateQueries({ queryKey: campingQueryKeys.zones(newZone.festivalId) });
    },
  });
}

// Update camping zone mutation
export function useUpdateCampingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCampingZoneDto }) =>
      campingApi.update(id, data),
    onSuccess: (updatedZone) => {
      queryClient.setQueryData(campingQueryKeys.zone(updatedZone.id), updatedZone);
      queryClient.invalidateQueries({ queryKey: campingQueryKeys.zones(updatedZone.festivalId) });
    },
  });
}

// Delete camping zone mutation
export function useDeleteCampingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, festivalId }: { id: string; festivalId: string }) => {
      await campingApi.delete(id);
      return { id, festivalId };
    },
    onSuccess: ({ id, festivalId }) => {
      queryClient.removeQueries({ queryKey: campingQueryKeys.zone(id) });
      queryClient.invalidateQueries({ queryKey: campingQueryKeys.zones(festivalId) });
    },
  });
}
