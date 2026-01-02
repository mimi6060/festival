'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, UpdateUserDto, UserPreferences } from '@festival/shared/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Query keys for user data
 */
export const userQueryKeys = {
  profile: ['user', 'profile'] as const,
  preferences: ['user', 'preferences'] as const,
  notifications: ['user', 'notifications'] as const,
};

/**
 * Get auth token from storage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * API request helper
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/v1${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data.data || data;
}

/**
 * useUser hook - Current user data and profile management
 */
export function useUser() {
  const queryClient = useQueryClient();

  // Fetch user profile
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: userQueryKeys.profile,
    queryFn: () => apiRequest<User>('/user/profile'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!getAuthToken(),
    retry: 1,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateUserDto) =>
      apiRequest<User>('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(userQueryKeys.profile, updatedUser);
    },
  });

  // Update avatar mutation
  const updateAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = getAuthToken();
      const response = await fetch(`${API_URL}/v1/user/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Upload failed');
      return data.data;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(userQueryKeys.profile, (old: User | undefined) =>
        old ? { ...old, avatarUrl: result.avatarUrl } : old
      );
    },
  });

  // Delete avatar mutation
  const deleteAvatarMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>('/user/avatar', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.setQueryData(userQueryKeys.profile, (old: User | undefined) =>
        old ? { ...old, avatarUrl: undefined } : old
      );
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (preferences: Partial<UserPreferences>) =>
      apiRequest<UserPreferences>('/user/preferences', {
        method: 'PATCH',
        body: JSON.stringify(preferences),
      }),
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(userQueryKeys.profile, (old: User | undefined) =>
        old ? { ...old, preferences: updatedPreferences } : old
      );
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: (password: string) =>
      apiRequest<void>('/user/account', {
        method: 'DELETE',
        body: JSON.stringify({ password }),
      }),
    onSuccess: () => {
      queryClient.clear();
      // Clear auth storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('festival-auth');
        localStorage.removeItem('auth_token');
      }
    },
  });

  // Helper functions
  const updateProfile = useCallback(
    (data: UpdateUserDto) => updateProfileMutation.mutateAsync(data),
    [updateProfileMutation]
  );

  const updateAvatar = useCallback(
    (file: File) => updateAvatarMutation.mutateAsync(file),
    [updateAvatarMutation]
  );

  const deleteAvatar = useCallback(
    () => deleteAvatarMutation.mutateAsync(),
    [deleteAvatarMutation]
  );

  const updatePreferences = useCallback(
    (preferences: Partial<UserPreferences>) =>
      updatePreferencesMutation.mutateAsync(preferences),
    [updatePreferencesMutation]
  );

  const deleteAccount = useCallback(
    (password: string) => deleteAccountMutation.mutateAsync(password),
    [deleteAccountMutation]
  );

  // Computed values
  const fullName = useMemo(
    () => (user ? `${user.firstName} ${user.lastName}` : ''),
    [user]
  );

  const initials = useMemo(
    () =>
      user
        ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
        : '',
    [user]
  );

  return useMemo(
    () => ({
      // State
      user,
      isLoading,
      error: error instanceof Error ? error.message : null,
      fullName,
      initials,

      // Mutation states
      isUpdating:
        updateProfileMutation.isPending ||
        updateAvatarMutation.isPending ||
        deleteAvatarMutation.isPending ||
        updatePreferencesMutation.isPending,
      isDeleting: deleteAccountMutation.isPending,

      // Actions
      refetch,
      updateProfile,
      updateAvatar,
      deleteAvatar,
      updatePreferences,
      deleteAccount,
    }),
    [
      user,
      isLoading,
      error,
      fullName,
      initials,
      updateProfileMutation.isPending,
      updateAvatarMutation.isPending,
      deleteAvatarMutation.isPending,
      updatePreferencesMutation.isPending,
      deleteAccountMutation.isPending,
      refetch,
      updateProfile,
      updateAvatar,
      deleteAvatar,
      updatePreferences,
      deleteAccount,
    ]
  );
}

export default useUser;
