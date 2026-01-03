'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { festivalsApi } from '../../lib/api';
import type { Festival, PaginatedResponse } from '../../types';

// Query Keys
export const festivalQueryKeys = {
  all: ['festivals'] as const,
  lists: () => [...festivalQueryKeys.all, 'list'] as const,
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    [...festivalQueryKeys.lists(), params] as const,
  details: () => [...festivalQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...festivalQueryKeys.details(), id] as const,
  stats: (id: string) => [...festivalQueryKeys.all, 'stats', id] as const,
};

// Fetch all festivals
export function useFestivals(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: festivalQueryKeys.list(params),
    queryFn: async () => {
      const response = await festivalsApi.getAll(params);
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: PaginatedResponse<Festival>) => data.data,
  });
}

// Fetch a single festival by ID
export function useFestival(id: string) {
  return useQuery({
    queryKey: festivalQueryKeys.detail(id),
    queryFn: async () => {
      const response = await festivalsApi.getById(id);
      return response;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch festival stats
export function useFestivalStats(id: string) {
  return useQuery({
    queryKey: festivalQueryKeys.stats(id),
    queryFn: async () => {
      const response = await festivalsApi.getStats(id);
      return response;
    },
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute (stats change frequently)
  });
}

// Create festival mutation
export function useCreateFestival() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Festival>) => {
      const response = await festivalsApi.create(data);
      return response;
    },
    onSuccess: () => {
      // Invalidate festivals list to refetch
      queryClient.invalidateQueries({ queryKey: festivalQueryKeys.lists() });
    },
  });
}

// Update festival mutation
export function useUpdateFestival() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Festival> }) => {
      const response = await festivalsApi.update(id, data);
      return response;
    },
    onSuccess: (updatedFestival) => {
      // Update the specific festival in cache
      queryClient.setQueryData(festivalQueryKeys.detail(updatedFestival.id), updatedFestival);
      // Invalidate festivals list to refetch
      queryClient.invalidateQueries({ queryKey: festivalQueryKeys.lists() });
    },
  });
}

// Delete festival mutation
export function useDeleteFestival() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await festivalsApi.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove the specific festival from cache
      queryClient.removeQueries({ queryKey: festivalQueryKeys.detail(deletedId) });
      // Invalidate festivals list to refetch
      queryClient.invalidateQueries({ queryKey: festivalQueryKeys.lists() });
    },
  });
}
