'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorsApi } from '../../lib/api';
import type { CreateVendorDto, UpdateVendorDto, VendorType } from '../../types';

// =====================
// Query Keys
// =====================

export interface VendorListParams {
  festivalId?: string;
  type?: VendorType;
  isOpen?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export const vendorQueryKeys = {
  all: ['vendors'] as const,
  lists: () => [...vendorQueryKeys.all, 'list'] as const,
  list: (params?: VendorListParams) => [...vendorQueryKeys.lists(), params] as const,
  byFestival: (festivalId: string) => [...vendorQueryKeys.lists(), 'festival', festivalId] as const,
  details: () => [...vendorQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...vendorQueryKeys.details(), id] as const,
};

// =====================
// Vendor Hooks
// =====================

/**
 * Hook to fetch all vendors with optional filters
 */
export function useAllVendors(params?: VendorListParams) {
  return useQuery({
    queryKey: vendorQueryKeys.list(params),
    queryFn: () => vendorsApi.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch vendors for a specific festival
 */
export function useVendors(festivalId: string) {
  return useQuery({
    queryKey: vendorQueryKeys.byFestival(festivalId),
    queryFn: () => vendorsApi.getByFestival(festivalId),
    enabled: !!festivalId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single vendor by ID
 */
export function useVendor(id: string) {
  return useQuery({
    queryKey: vendorQueryKeys.detail(id),
    queryFn: () => vendorsApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new vendor
 */
export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ festivalId, data }: { festivalId: string; data: CreateVendorDto }) =>
      vendorsApi.create({ ...data, festivalId }),
    onSuccess: (_, { festivalId }) => {
      queryClient.invalidateQueries({ queryKey: vendorQueryKeys.byFestival(festivalId) });
      queryClient.invalidateQueries({ queryKey: vendorQueryKeys.lists() });
    },
  });
}

/**
 * Hook to update an existing vendor
 */
export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVendorDto }) =>
      vendorsApi.update(id, data),
    onSuccess: (updatedVendor) => {
      queryClient.setQueryData(vendorQueryKeys.detail(updatedVendor.id), updatedVendor);
      // Invalidate the festival list to reflect changes
      queryClient.invalidateQueries({ queryKey: vendorQueryKeys.lists() });
    },
  });
}

/**
 * Hook to delete a vendor
 */
export function useDeleteVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vendorsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: vendorQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: vendorQueryKeys.lists() });
    },
  });
}

/**
 * Hook to toggle vendor open/closed status
 */
export function useToggleVendorOpen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isOpen }: { id: string; isOpen: boolean }) =>
      vendorsApi.toggleOpen(id, isOpen),
    onSuccess: (updatedVendor) => {
      queryClient.setQueryData(vendorQueryKeys.detail(updatedVendor.id), updatedVendor);
      // Invalidate the festival list to reflect changes
      queryClient.invalidateQueries({ queryKey: vendorQueryKeys.lists() });
    },
  });
}
