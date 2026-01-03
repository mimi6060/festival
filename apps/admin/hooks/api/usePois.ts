'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { poisApi } from '../../lib/api';
import type { CreatePoiDto, UpdatePoiDto } from '../../types';

// Query Keys
export const poiQueryKeys = {
  all: ['pois'] as const,
  byFestival: (festivalId: string) => [...poiQueryKeys.all, 'festival', festivalId] as const,
  detail: (id: string) => [...poiQueryKeys.all, 'detail', id] as const,
};

// Fetch POIs by festival
export function usePois(festivalId: string) {
  return useQuery({
    queryKey: poiQueryKeys.byFestival(festivalId),
    queryFn: async () => {
      const response = await poisApi.getByFestival(festivalId);
      return response;
    },
    enabled: !!festivalId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch a single POI by ID
export function usePoi(id: string) {
  return useQuery({
    queryKey: poiQueryKeys.detail(id),
    queryFn: async () => {
      const response = await poisApi.getById(id);
      return response;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create POI mutation
export function useCreatePoi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ festivalId, data }: { festivalId: string; data: CreatePoiDto }) => {
      const response = await poisApi.create(festivalId, data);
      return response;
    },
    onSuccess: (newPoi) => {
      // Invalidate POIs list for this festival to refetch
      if (newPoi.festivalId) {
        queryClient.invalidateQueries({ queryKey: poiQueryKeys.byFestival(newPoi.festivalId) });
      }
    },
  });
}

// Update POI mutation
export function useUpdatePoi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePoiDto }) => {
      const response = await poisApi.update(id, data);
      return response;
    },
    onSuccess: (updatedPoi) => {
      // Update the specific POI in cache
      queryClient.setQueryData(poiQueryKeys.detail(updatedPoi.id), updatedPoi);
      // Invalidate POIs list for this festival to refetch
      if (updatedPoi.festivalId) {
        queryClient.invalidateQueries({ queryKey: poiQueryKeys.byFestival(updatedPoi.festivalId) });
      }
    },
  });
}

// Delete POI mutation
export function useDeletePoi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, festivalId }: { id: string; festivalId: string }) => {
      await poisApi.delete(id);
      return { id, festivalId };
    },
    onSuccess: ({ id, festivalId }) => {
      // Remove the specific POI from cache
      queryClient.removeQueries({ queryKey: poiQueryKeys.detail(id) });
      // Invalidate POIs list for this festival to refetch
      queryClient.invalidateQueries({ queryKey: poiQueryKeys.byFestival(festivalId) });
    },
  });
}
