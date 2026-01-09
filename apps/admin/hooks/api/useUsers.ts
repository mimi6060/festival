'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../lib/api';
import type { User } from '../../types';

// Query Keys
export const userQueryKeys = {
  all: ['users'] as const,
  lists: () => [...userQueryKeys.all, 'list'] as const,
  list: (params?: UserListParams) => [...userQueryKeys.lists(), params] as const,
  details: () => [...userQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...userQueryKeys.details(), id] as const,
};

export interface UserListParams {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'admin' | 'organizer' | 'staff' | 'user';
  isActive?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'admin' | 'organizer' | 'staff' | 'user';
  isActive?: boolean;
}

/**
 * Hook to fetch a paginated list of users
 */
export function useUsers(params?: UserListParams) {
  return useQuery({
    queryKey: userQueryKeys.list(params),
    queryFn: () => usersApi.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single user by ID
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: userQueryKeys.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api';
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'An error occurred' }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return response.json() as Promise<User>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
    },
  });
}

/**
 * Hook to update an existing user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) => usersApi.update(id, data),
    onSuccess: (updatedUser) => {
      // Update the specific user in cache
      queryClient.setQueryData(userQueryKeys.detail(updatedUser.id), updatedUser);
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
    },
  });
}

/**
 * Hook to ban a user (set isActive to false)
 */
export function useBanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: (updatedUser) => {
      // Update the specific user in cache
      queryClient.setQueryData(userQueryKeys.detail(updatedUser.id), updatedUser);
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
    },
  });
}

/**
 * Hook to unban a user (set isActive to true)
 * Note: Uses the same toggleActive API as ban
 */
export function useUnbanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: (updatedUser) => {
      // Update the specific user in cache
      queryClient.setQueryData(userQueryKeys.detail(updatedUser.id), updatedUser);
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
    },
  });
}

/**
 * Hook to delete a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: userQueryKeys.detail(id) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
    },
  });
}
