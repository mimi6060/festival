'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campingApi } from '../../lib/api';
import type { CampingZone, CreateCampingZoneDto, UpdateCampingZoneDto } from '../../types';

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
    queryFn: async () => {
      const response = await campingApi.getZones(festivalId);
      return response;
    },
    enabled: !!festivalId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Fetch a single camping zone by ID
export function useCampingZone(id: string) {
  return useQuery({
    queryKey: campingQueryKeys.zone(id),
    queryFn: async () => {
      const response = await campingApi.getZone(id);
      return response;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create camping zone mutation
export function useCreateCampingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ festivalId, data }: { festivalId: string; data: CreateCampingZoneDto }) => {
      const response = await campingApi.createZone(festivalId, data);
      return response;
    },
    onSuccess: (newZone) => {
      // Invalidate camping zones list to refetch
      queryClient.invalidateQueries({ queryKey: campingQueryKeys.zones(newZone.festivalId) });
    },
  });
}

// Update camping zone mutation
export function useUpdateCampingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCampingZoneDto }) => {
      const response = await campingApi.updateZone(id, data);
      return response;
    },
    onSuccess: (updatedZone) => {
      // Update the specific zone in cache
      queryClient.setQueryData(campingQueryKeys.zone(updatedZone.id), updatedZone);
      // Invalidate camping zones list to refetch
      queryClient.invalidateQueries({ queryKey: campingQueryKeys.zones(updatedZone.festivalId) });
    },
  });
}

// Delete camping zone mutation
export function useDeleteCampingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, festivalId }: { id: string; festivalId: string }) => {
      await campingApi.deleteZone(id);
      return { id, festivalId };
    },
    onSuccess: ({ id, festivalId }) => {
      // Remove the specific zone from cache
      queryClient.removeQueries({ queryKey: campingQueryKeys.zone(id) });
      // Invalidate camping zones list to refetch
      queryClient.invalidateQueries({ queryKey: campingQueryKeys.zones(festivalId) });
    },
  });
}
