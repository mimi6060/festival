'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { api, Festival, TicketType, Ticket, Order, User } from '../lib/api';

// Query Keys
export const queryKeys = {
  festivals: {
    all: ['festivals'] as const,
    list: (params?: { page?: number; limit?: number; genre?: string }) =>
      [...queryKeys.festivals.all, 'list', params] as const,
    detail: (slug: string) => [...queryKeys.festivals.all, 'detail', slug] as const,
    featured: () => [...queryKeys.festivals.all, 'featured'] as const,
    search: (query: string) => [...queryKeys.festivals.all, 'search', query] as const,
  },
  tickets: {
    all: ['tickets'] as const,
    byFestival: (festivalId: string) => [...queryKeys.tickets.all, 'festival', festivalId] as const,
    user: () => [...queryKeys.tickets.all, 'user'] as const,
  },
  orders: {
    all: ['orders'] as const,
    user: () => [...queryKeys.orders.all, 'user'] as const,
    detail: (orderId: string) => [...queryKeys.orders.all, 'detail', orderId] as const,
  },
  user: {
    profile: () => ['user', 'profile'] as const,
  },
};

// Festivals Hooks
export function useFestivals(params?: { page?: number; limit?: number; genre?: string }) {
  return useQuery({
    queryKey: queryKeys.festivals.list(params),
    queryFn: async () => {
      const response = await api.get<Festival[]>('/festivals', params);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useFestival(slug: string) {
  return useQuery({
    queryKey: queryKeys.festivals.detail(slug),
    queryFn: async () => {
      const response = await api.get<Festival>(`/festivals/${slug}`);
      return response.data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeaturedFestivals() {
  return useQuery({
    queryKey: queryKeys.festivals.featured(),
    queryFn: async () => {
      const response = await api.get<Festival[]>('/festivals/featured');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearchFestivals(query: string) {
  return useQuery({
    queryKey: queryKeys.festivals.search(query),
    queryFn: async () => {
      const response = await api.get<Festival[]>('/festivals/search', { q: query });
      return response.data;
    },
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
}

// Tickets Hooks
export function useTicketTypes(festivalId: string) {
  return useQuery({
    queryKey: queryKeys.tickets.byFestival(festivalId),
    queryFn: async () => {
      const response = await api.get<TicketType[]>(`/festivals/${festivalId}/tickets`);
      return response.data;
    },
    enabled: !!festivalId,
    staleTime: 1 * 60 * 1000, // 1 minute (availability changes)
  });
}

export function useUserTickets() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.tickets.user(),
    queryFn: async () => {
      const response = await api.get<Ticket[]>('/user/tickets');
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
}

// Orders Hooks
export function useUserOrders() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.orders.user(),
    queryFn: async () => {
      const response = await api.get<Order[]>('/user/orders');
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrder(orderId: string) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: async () => {
      const response = await api.get<Order>(`/user/orders/${orderId}`);
      return response.data;
    },
    enabled: isAuthenticated && !!orderId,
  });
}

// User Profile Hook
export function useUserProfile() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: async () => {
      const response = await api.get<User>('/user/profile');
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

// Purchase Mutation
interface PurchaseData {
  festivalId: string;
  tickets: { ticketTypeId: string; quantity: number }[];
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  paymentMethodId?: string;
}

export function usePurchaseTickets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PurchaseData) => {
      const response = await api.post<Order>('/orders', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.user() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.user() });
    },
  });
}

// Update Profile Mutation
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await api.patch<User>('/user/profile', data);
      return response.data;
    },
    onSuccess: (updatedUser: User) => {
      setUser(updatedUser as Parameters<typeof setUser>[0]);
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });
}
