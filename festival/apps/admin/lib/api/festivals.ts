import { get, post, put, del } from '../api-client';

// Types
export interface Festival {
  id: string;
  name: string;
  slug: string;
  description?: string;
  location: string;
  address?: string;
  startDate: string;
  endDate: string;
  status: FestivalStatus;
  capacity: number;
  organizerId: string;
  coverImage?: string;
  logoImage?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: Record<string, string>;
  settings?: FestivalSettings;
  createdAt: string;
  updatedAt: string;
}

export type FestivalStatus = 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface FestivalSettings {
  timezone?: string;
  currency?: string;
  language?: string;
  ticketingEnabled?: boolean;
  cashlessEnabled?: boolean;
  maxTicketsPerUser?: number;
}

export interface CreateFestivalData {
  name: string;
  slug?: string;
  description?: string;
  location: string;
  address?: string;
  startDate: string;
  endDate: string;
  capacity: number;
  coverImage?: string;
  logoImage?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  settings?: FestivalSettings;
}

export interface UpdateFestivalData extends Partial<CreateFestivalData> {
  status?: FestivalStatus;
}

export interface FestivalQueryParams {
  page?: number;
  limit?: number;
  status?: FestivalStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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

export interface FestivalStats {
  ticketsSold: number;
  revenue: number;
  capacity: number;
  checkIns: number;
  cashlessBalance: number;
  totalOrders: number;
}

// API Functions

/**
 * Get list of festivals with optional filtering and pagination
 */
export async function getFestivals(params?: FestivalQueryParams): Promise<PaginatedResponse<Festival>> {
  const queryParams: Record<string, string> = {};

  if (params?.page) queryParams.page = params.page.toString();
  if (params?.limit) queryParams.limit = params.limit.toString();
  if (params?.status) queryParams.status = params.status;
  if (params?.search) queryParams.search = params.search;
  if (params?.sortBy) queryParams.sortBy = params.sortBy;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

  return get<PaginatedResponse<Festival>>('/festivals', queryParams);
}

/**
 * Get a single festival by ID
 */
export async function getFestival(id: string): Promise<Festival> {
  return get<Festival>(`/festivals/${id}`);
}

/**
 * Get festival by slug
 */
export async function getFestivalBySlug(slug: string): Promise<Festival> {
  return get<Festival>(`/festivals/slug/${slug}`);
}

/**
 * Create a new festival
 */
export async function createFestival(data: CreateFestivalData): Promise<Festival> {
  return post<Festival>('/festivals', data);
}

/**
 * Update an existing festival
 */
export async function updateFestival(id: string, data: UpdateFestivalData): Promise<Festival> {
  return put<Festival>(`/festivals/${id}`, data);
}

/**
 * Delete a festival
 */
export async function deleteFestival(id: string): Promise<void> {
  return del<void>(`/festivals/${id}`);
}

/**
 * Publish a festival (change status to PUBLISHED)
 */
export async function publishFestival(id: string): Promise<Festival> {
  return post<Festival>(`/festivals/${id}/publish`);
}

/**
 * Cancel a festival
 */
export async function cancelFestival(id: string, reason?: string): Promise<Festival> {
  return post<Festival>(`/festivals/${id}/cancel`, { reason });
}

/**
 * Get festival statistics
 */
export async function getFestivalStats(id: string): Promise<FestivalStats> {
  return get<FestivalStats>(`/festivals/${id}/stats`);
}

/**
 * Duplicate a festival (create a copy with new dates)
 */
export async function duplicateFestival(id: string, newName: string, newDates: { startDate: string; endDate: string }): Promise<Festival> {
  return post<Festival>(`/festivals/${id}/duplicate`, { name: newName, ...newDates });
}
