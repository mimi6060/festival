/**
 * Festivals API
 */

import apiClient from '../api-client';

export interface Festival {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  imageUrl?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  capacity?: number;
  price?: {
    from: number;
    currency: string;
  };
  genres?: string[];
  organizerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FestivalStats {
  totalTicketsSold: number;
  totalRevenue: number;
  totalAttendees: number;
  capacity: number;
  occupancyRate: number;
}

export interface TicketCategory {
  id: string;
  festivalId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  quantity: number;
  sold: number;
  maxPerOrder: number;
  salesStartDate?: string;
  salesEndDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetFestivalsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  genre?: string;
  location?: string;
  startDateFrom?: string;
  startDateTo?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Get all festivals with optional filters
 */
export const getFestivals = async (params?: GetFestivalsParams): Promise<PaginatedResponse<Festival>> => {
  const response = await apiClient.get('/festivals', { params });

  // Handle both paginated and non-paginated responses
  if (Array.isArray(response.data)) {
    return {
      data: response.data,
      meta: {
        total: response.data.length,
        page: params?.page || 1,
        limit: params?.limit || 10,
        totalPages: 1,
      },
    };
  }

  return response.data;
};

/**
 * Get festival by slug
 */
export const getFestival = async (slug: string): Promise<Festival> => {
  const response = await apiClient.get(`/festivals/by-slug/${slug}`);
  return response.data;
};

/**
 * Get festival by ID
 */
export const getFestivalById = async (id: string): Promise<Festival> => {
  const response = await apiClient.get(`/festivals/${id}`);
  return response.data;
};

/**
 * Get festival ticket categories
 */
export const getFestivalTicketCategories = async (festivalId: string): Promise<TicketCategory[]> => {
  const response = await apiClient.get(`/festivals/${festivalId}/ticket-categories`);
  return response.data;
};

/**
 * Get festival statistics
 */
export const getFestivalStats = async (festivalId: string): Promise<FestivalStats> => {
  const response = await apiClient.get(`/festivals/${festivalId}/stats`);
  return response.data;
};

/**
 * Get featured festivals
 */
export const getFeaturedFestivals = async (): Promise<Festival[]> => {
  const response = await apiClient.get('/festivals', {
    params: { status: 'PUBLISHED', limit: 10 },
  });
  return response.data;
};
