/**
 * Program Types
 * Types for festival programming (artists, stages, performances)
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Artist status
 */
export enum ArtistStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

/**
 * Performance status
 */
export enum PerformanceStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DELAYED = 'delayed',
}

/**
 * Stage type
 */
export enum StageType {
  MAIN = 'main',
  SECONDARY = 'secondary',
  ACOUSTIC = 'acoustic',
  DJ = 'dj',
  TENT = 'tent',
  OUTDOOR = 'outdoor',
  INDOOR = 'indoor',
}

/**
 * Music genre
 */
export enum MusicGenre {
  ROCK = 'rock',
  POP = 'pop',
  ELECTRONIC = 'electronic',
  HIP_HOP = 'hip_hop',
  JAZZ = 'jazz',
  CLASSICAL = 'classical',
  FOLK = 'folk',
  METAL = 'metal',
  REGGAE = 'reggae',
  WORLD = 'world',
  INDIE = 'indie',
  RNB = 'rnb',
  COUNTRY = 'country',
  BLUES = 'blues',
  LATIN = 'latin',
  OTHER = 'other',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Artist social media links
 */
export interface ArtistSocialLinks {
  website?: string;
  spotify?: string;
  appleMusic?: string;
  youtube?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  soundcloud?: string;
  bandcamp?: string;
}

/**
 * Artist
 */
export interface Artist {
  id: string;
  festivalId: string;
  name: string;
  slug: string;
  description?: string;
  shortBio?: string;
  country?: string;
  genres: MusicGenre[];
  status: ArtistStatus;
  image?: string;
  bannerImage?: string;
  socialLinks?: ArtistSocialLinks;
  spotifyId?: string;
  isHeadliner: boolean;
  sortOrder: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Artist with performances
 */
export interface ArtistWithPerformances extends Artist {
  performances: Performance[];
}

/**
 * Stage
 */
export interface Stage {
  id: string;
  festivalId: string;
  name: string;
  slug: string;
  description?: string;
  type: StageType;
  capacity?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  mapPoiId?: string;
  image?: string;
  color?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Stage with performances
 */
export interface StageWithPerformances extends Stage {
  performances: Performance[];
}

/**
 * Performance (time slot for an artist on a stage)
 */
export interface Performance {
  id: string;
  festivalId: string;
  artistId: string;
  stageId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: PerformanceStatus;
  isSpecialGuest: boolean;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Performance with artist and stage details
 */
export interface PerformanceWithDetails extends Performance {
  artist: Artist;
  stage: Stage;
}

/**
 * Day schedule
 */
export interface DaySchedule {
  date: string;
  dayName: string;
  stages: StageSchedule[];
}

/**
 * Stage schedule for a specific day
 */
export interface StageSchedule {
  stage: Stage;
  performances: PerformanceWithDetails[];
}

/**
 * Festival program (complete schedule)
 */
export interface FestivalProgram {
  festivalId: string;
  schedule: DaySchedule[];
  artists: Artist[];
  stages: Stage[];
  updatedAt: string;
}

/**
 * Time slot conflict
 */
export interface TimeSlotConflict {
  stageId: string;
  date: string;
  existingPerformance: Performance;
  conflictingSlot: { startTime: string; endTime: string };
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating an artist
 */
export interface CreateArtistDto {
  name: string;
  description?: string;
  shortBio?: string;
  country?: string;
  genres: MusicGenre[];
  image?: string;
  bannerImage?: string;
  socialLinks?: ArtistSocialLinks;
  spotifyId?: string;
  isHeadliner?: boolean;
}

/**
 * DTO for updating an artist
 */
export interface UpdateArtistDto {
  name?: string;
  description?: string;
  shortBio?: string;
  country?: string;
  genres?: MusicGenre[];
  status?: ArtistStatus;
  image?: string;
  bannerImage?: string;
  socialLinks?: ArtistSocialLinks;
  spotifyId?: string;
  isHeadliner?: boolean;
  sortOrder?: number;
}

/**
 * DTO for creating a stage
 */
export interface CreateStageDto {
  name: string;
  description?: string;
  type: StageType;
  capacity?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  image?: string;
  color?: string;
}

/**
 * DTO for updating a stage
 */
export interface UpdateStageDto {
  name?: string;
  description?: string;
  type?: StageType;
  capacity?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  image?: string;
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
}

/**
 * DTO for creating a performance
 */
export interface CreatePerformanceDto {
  artistId: string;
  stageId: string;
  date: string;
  startTime: string;
  endTime: string;
  isSpecialGuest?: boolean;
  notes?: string;
}

/**
 * DTO for updating a performance
 */
export interface UpdatePerformanceDto {
  artistId?: string;
  stageId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: PerformanceStatus;
  isSpecialGuest?: boolean;
  notes?: string;
}

/**
 * DTO for bulk creating performances
 */
export interface BulkCreatePerformancesDto {
  performances: CreatePerformanceDto[];
}

/**
 * Program query filters
 */
export interface ProgramFilters {
  festivalId?: string;
  date?: string;
  stageId?: string;
  artistId?: string;
  genre?: MusicGenre | MusicGenre[];
  status?: PerformanceStatus | PerformanceStatus[];
  isHeadliner?: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid ArtistStatus
 */
export function isArtistStatus(value: unknown): value is ArtistStatus {
  return Object.values(ArtistStatus).includes(value as ArtistStatus);
}

/**
 * Check if value is a valid PerformanceStatus
 */
export function isPerformanceStatus(
  value: unknown
): value is PerformanceStatus {
  return Object.values(PerformanceStatus).includes(value as PerformanceStatus);
}

/**
 * Check if value is a valid StageType
 */
export function isStageType(value: unknown): value is StageType {
  return Object.values(StageType).includes(value as StageType);
}

/**
 * Check if value is a valid MusicGenre
 */
export function isMusicGenre(value: unknown): value is MusicGenre {
  return Object.values(MusicGenre).includes(value as MusicGenre);
}

/**
 * Check if performance is currently live
 */
export function isPerformanceLive(performance: Performance): boolean {
  if (performance.status !== PerformanceStatus.LIVE) return false;

  const now = new Date();
  const performanceDate = new Date(performance.date);
  const [startHour, startMin] = performance.startTime.split(':').map(Number);
  const [endHour, endMin] = performance.endTime.split(':').map(Number);

  const start = new Date(performanceDate);
  start.setHours(startHour, startMin, 0);

  const end = new Date(performanceDate);
  end.setHours(endHour, endMin, 0);

  return now >= start && now <= end;
}

/**
 * Check if performance is upcoming
 */
export function isPerformanceUpcoming(performance: Performance): boolean {
  if (performance.status !== PerformanceStatus.SCHEDULED) return false;

  const now = new Date();
  const performanceDate = new Date(performance.date);
  const [startHour, startMin] = performance.startTime.split(':').map(Number);

  const start = new Date(performanceDate);
  start.setHours(startHour, startMin, 0);

  return now < start;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get performance duration in minutes
 */
export function getPerformanceDuration(performance: Performance): number {
  const [startHour, startMin] = performance.startTime.split(':').map(Number);
  const [endHour, endMin] = performance.endTime.split(':').map(Number);

  let duration = (endHour - startHour) * 60 + (endMin - startMin);
  if (duration < 0) {
    duration += 24 * 60; // Handle overnight performances
  }
  return duration;
}

/**
 * Format performance time range
 */
export function formatPerformanceTime(performance: Performance): string {
  return `${performance.startTime} - ${performance.endTime}`;
}

/**
 * Check for time slot conflicts
 */
export function hasTimeConflict(
  existing: Performance[],
  newPerformance: { stageId: string; date: string; startTime: string; endTime: string }
): TimeSlotConflict | null {
  const sameDayStagePerformances = existing.filter(
    (p) => p.stageId === newPerformance.stageId && p.date === newPerformance.date
  );

  for (const perf of sameDayStagePerformances) {
    if (
      (newPerformance.startTime >= perf.startTime &&
        newPerformance.startTime < perf.endTime) ||
      (newPerformance.endTime > perf.startTime &&
        newPerformance.endTime <= perf.endTime) ||
      (newPerformance.startTime <= perf.startTime &&
        newPerformance.endTime >= perf.endTime)
    ) {
      return {
        stageId: newPerformance.stageId,
        date: newPerformance.date,
        existingPerformance: perf,
        conflictingSlot: {
          startTime: newPerformance.startTime,
          endTime: newPerformance.endTime,
        },
      };
    }
  }
  return null;
}

/**
 * Generate artist slug from name
 */
export function generateArtistSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Sort performances by time
 */
export function sortPerformancesByTime(
  performances: Performance[]
): Performance[] {
  return [...performances].sort((a, b) => {
    const dateCompare =
      new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });
}

/**
 * Group performances by date
 */
export function groupPerformancesByDate(
  performances: PerformanceWithDetails[]
): Map<string, PerformanceWithDetails[]> {
  const grouped = new Map<string, PerformanceWithDetails[]>();

  for (const perf of performances) {
    const existing = grouped.get(perf.date) || [];
    existing.push(perf);
    grouped.set(perf.date, existing);
  }

  return grouped;
}

/**
 * Get genre display name
 */
export function getGenreDisplayName(genre: MusicGenre): string {
  const names: Record<MusicGenre, string> = {
    [MusicGenre.ROCK]: 'Rock',
    [MusicGenre.POP]: 'Pop',
    [MusicGenre.ELECTRONIC]: 'Electronique',
    [MusicGenre.HIP_HOP]: 'Hip-Hop',
    [MusicGenre.JAZZ]: 'Jazz',
    [MusicGenre.CLASSICAL]: 'Classique',
    [MusicGenre.FOLK]: 'Folk',
    [MusicGenre.METAL]: 'Metal',
    [MusicGenre.REGGAE]: 'Reggae',
    [MusicGenre.WORLD]: 'World Music',
    [MusicGenre.INDIE]: 'Indie',
    [MusicGenre.RNB]: 'R&B',
    [MusicGenre.COUNTRY]: 'Country',
    [MusicGenre.BLUES]: 'Blues',
    [MusicGenre.LATIN]: 'Latin',
    [MusicGenre.OTHER]: 'Autre',
  };
  return names[genre];
}
