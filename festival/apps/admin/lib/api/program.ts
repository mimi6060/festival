import { get, post, put, del } from '../api-client';
import type { PaginatedResponse } from './festivals';

// Types
export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  shortBio?: string;
  genres: string[];
  country?: string;
  imageUrl?: string;
  bannerUrl?: string;
  website?: string;
  socialLinks?: {
    spotify?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
    youtube?: string;
    soundcloud?: string;
  };
  isHeadliner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArtistData {
  name: string;
  slug?: string;
  bio?: string;
  shortBio?: string;
  genres?: string[];
  country?: string;
  imageUrl?: string;
  bannerUrl?: string;
  website?: string;
  socialLinks?: Artist['socialLinks'];
  isHeadliner?: boolean;
}

export interface UpdateArtistData extends Partial<CreateArtistData> {}

export interface ArtistQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  genre?: string;
  country?: string;
  isHeadliner?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface Stage {
  id: string;
  festivalId: string;
  name: string;
  description?: string;
  capacity: number;
  location?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  technicalSpecs?: {
    soundSystem?: string;
    lighting?: string;
    stageSize?: string;
  };
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStageData {
  name: string;
  description?: string;
  capacity: number;
  location?: string;
  coordinates?: Stage['coordinates'];
  technicalSpecs?: Stage['technicalSpecs'];
  imageUrl?: string;
  isActive?: boolean;
}

export interface UpdateStageData extends Partial<CreateStageData> {}

export interface Performance {
  id: string;
  festivalId: string;
  artistId: string;
  stageId: string;
  startTime: string;
  endTime: string;
  isCancelled: boolean;
  cancellationReason?: string;
  artist?: Artist;
  stage?: Stage;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePerformanceData {
  artistId: string;
  stageId: string;
  startTime: string;
  endTime: string;
}

export interface UpdatePerformanceData {
  artistId?: string;
  stageId?: string;
  startTime?: string;
  endTime?: string;
}

export interface Lineup {
  performances: Performance[];
  stages: Stage[];
  artists: Artist[];
  days: {
    date: string;
    performances: Performance[];
  }[];
}

export interface LineupQueryParams {
  date?: string;
  stageId?: string;
  artistId?: string;
}

// Artists API Functions

/**
 * Get list of artists with optional filtering and pagination
 */
export async function getArtists(params?: ArtistQueryParams): Promise<PaginatedResponse<Artist>> {
  const queryParams: Record<string, string> = {};

  if (params?.page) queryParams.page = params.page.toString();
  if (params?.limit) queryParams.limit = params.limit.toString();
  if (params?.search) queryParams.search = params.search;
  if (params?.genre) queryParams.genre = params.genre;
  if (params?.country) queryParams.country = params.country;
  if (params?.isHeadliner !== undefined) queryParams.isHeadliner = params.isHeadliner.toString();
  if (params?.sortBy) queryParams.sortBy = params.sortBy;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

  return get<PaginatedResponse<Artist>>('/artists', queryParams);
}

/**
 * Get a single artist by ID
 */
export async function getArtist(id: string): Promise<Artist> {
  return get<Artist>(`/artists/${id}`);
}

/**
 * Create a new artist
 */
export async function createArtist(data: CreateArtistData): Promise<Artist> {
  return post<Artist>('/artists', data);
}

/**
 * Update an existing artist
 */
export async function updateArtist(id: string, data: UpdateArtistData): Promise<Artist> {
  return put<Artist>(`/artists/${id}`, data);
}

/**
 * Delete an artist
 */
export async function deleteArtist(id: string): Promise<void> {
  return del<void>(`/artists/${id}`);
}

/**
 * Get list of unique genres
 */
export async function getGenres(): Promise<string[]> {
  return get<string[]>('/artists/genres');
}

// Stages API Functions

/**
 * Get all stages for a festival
 */
export async function getStages(festivalId: string): Promise<Stage[]> {
  return get<Stage[]>(`/festivals/${festivalId}/stages`);
}

/**
 * Get a single stage by ID
 */
export async function getStage(stageId: string): Promise<Stage> {
  return get<Stage>(`/stages/${stageId}`);
}

/**
 * Create a new stage for a festival
 */
export async function createStage(festivalId: string, data: CreateStageData): Promise<Stage> {
  return post<Stage>(`/festivals/${festivalId}/stages`, data);
}

/**
 * Update an existing stage
 */
export async function updateStage(stageId: string, data: UpdateStageData): Promise<Stage> {
  return put<Stage>(`/stages/${stageId}`, data);
}

/**
 * Delete a stage
 */
export async function deleteStage(stageId: string): Promise<void> {
  return del<void>(`/stages/${stageId}`);
}

// Lineup/Performance API Functions

/**
 * Get the lineup for a festival
 */
export async function getLineup(festivalId: string, params?: LineupQueryParams): Promise<Lineup> {
  const queryParams: Record<string, string> = {};

  if (params?.date) queryParams.date = params.date;
  if (params?.stageId) queryParams.stageId = params.stageId;
  if (params?.artistId) queryParams.artistId = params.artistId;

  return get<Lineup>(`/festivals/${festivalId}/lineup`, queryParams);
}

/**
 * Get artists performing at a festival
 */
export async function getFestivalArtists(festivalId: string): Promise<Artist[]> {
  return get<Artist[]>(`/festivals/${festivalId}/artists`);
}

/**
 * Get a single performance by ID
 */
export async function getPerformance(performanceId: string): Promise<Performance> {
  return get<Performance>(`/performances/${performanceId}`);
}

/**
 * Create a new performance (schedule an artist)
 */
export async function createPerformance(festivalId: string, data: CreatePerformanceData): Promise<Performance> {
  return post<Performance>(`/festivals/${festivalId}/performances`, data);
}

/**
 * Update an existing performance
 */
export async function updatePerformance(performanceId: string, data: UpdatePerformanceData): Promise<Performance> {
  return put<Performance>(`/performances/${performanceId}`, data);
}

/**
 * Delete a performance
 */
export async function deletePerformance(performanceId: string): Promise<void> {
  return del<void>(`/performances/${performanceId}`);
}

/**
 * Cancel a performance (soft delete with reason)
 */
export async function cancelPerformance(performanceId: string, reason?: string): Promise<Performance> {
  return post<Performance>(`/performances/${performanceId}/cancel`, { reason });
}

/**
 * Check for scheduling conflicts
 */
export async function checkConflicts(festivalId: string, data: CreatePerformanceData): Promise<{
  hasConflicts: boolean;
  conflicts: {
    type: 'STAGE_OVERLAP' | 'ARTIST_OVERLAP';
    existingPerformance: Performance;
    message: string;
  }[];
}> {
  return post(`/festivals/${festivalId}/performances/check-conflicts`, data);
}
