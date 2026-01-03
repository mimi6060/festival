'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketCategoriesApi } from '../../lib/api';
import type { TicketCategory } from '../../types';

// Query Keys
export const ticketCategoryQueryKeys = {
  all: ['ticketCategories'] as const,
  lists: () => [...ticketCategoryQueryKeys.all, 'list'] as const,
  list: (festivalId: string) => [...ticketCategoryQueryKeys.lists(), festivalId] as const,
  details: () => [...ticketCategoryQueryKeys.all, 'detail'] as const,
  detail: (festivalId: string, categoryId: string) =>
    [...ticketCategoryQueryKeys.details(), festivalId, categoryId] as const,
};

/**
 * Hook to fetch ticket categories for a festival
 */
export function useTicketCategories(festivalId: string) {
  return useQuery({
    queryKey: ticketCategoryQueryKeys.list(festivalId),
    queryFn: () => ticketCategoriesApi.getByFestival(festivalId),
    enabled: !!festivalId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new ticket category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      festivalId,
      data,
    }: {
      festivalId: string;
      data: Partial<TicketCategory>;
    }) => ticketCategoriesApi.create(festivalId, data),
    onSuccess: (_, { festivalId }) => {
      // Invalidate the categories list for this festival
      queryClient.invalidateQueries({
        queryKey: ticketCategoryQueryKeys.list(festivalId),
      });
    },
  });
}

/**
 * Hook to update an existing ticket category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      festivalId,
      categoryId,
      data,
    }: {
      festivalId: string;
      categoryId: string;
      data: Partial<TicketCategory>;
    }) => ticketCategoriesApi.update(festivalId, categoryId, data),
    onSuccess: (updatedCategory, { festivalId }) => {
      // Update the cache with the new data
      queryClient.setQueryData(
        ticketCategoryQueryKeys.detail(festivalId, updatedCategory.id),
        updatedCategory
      );
      // Invalidate the list to reflect changes
      queryClient.invalidateQueries({
        queryKey: ticketCategoryQueryKeys.list(festivalId),
      });
    },
  });
}

/**
 * Hook to delete a ticket category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      festivalId,
      categoryId,
    }: {
      festivalId: string;
      categoryId: string;
    }) => ticketCategoriesApi.delete(festivalId, categoryId),
    onSuccess: (_, { festivalId, categoryId }) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: ticketCategoryQueryKeys.detail(festivalId, categoryId),
      });
      // Invalidate the list
      queryClient.invalidateQueries({
        queryKey: ticketCategoryQueryKeys.list(festivalId),
      });
    },
  });
}
