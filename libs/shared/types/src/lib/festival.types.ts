/**
 * Festival Types
 * Types for festival management
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Festival status
 */
export enum FestivalStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

/**
 * Festival visibility
 */
export enum FestivalVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  UNLISTED = 'unlisted',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Geographic coordinates
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
}

/**
 * Festival venue/location
 */
export interface FestivalLocation {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  coordinates?: GeoLocation;
}

/**
 * Festival contact information
 */
export interface FestivalContact {
  email: string;
  phone?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
}

/**
 * Festival settings
 */
export interface FestivalSettings {
  cashlessEnabled: boolean;
  nfcEnabled: boolean;
  qrCodeEnabled: boolean;
  maxTicketsPerUser: number;
  refundPolicy?: string;
  ageRestriction?: number;
  currency: string;
  timezone: string;
}

/**
 * Festival media assets
 */
export interface FestivalMedia {
  logo?: string;
  banner?: string;
  poster?: string;
  gallery?: string[];
}

/**
 * Main Festival interface
 */
export interface Festival {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  status: FestivalStatus;
  visibility: FestivalVisibility;
  startDate: string;
  endDate: string;
  location: FestivalLocation;
  contact: FestivalContact;
  settings: FestivalSettings;
  media: FestivalMedia;
  organizerId: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Festival summary (for listings)
 */
export interface FestivalSummary {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  status: FestivalStatus;
  startDate: string;
  endDate: string;
  location: Pick<FestivalLocation, 'city' | 'country'>;
  media: Pick<FestivalMedia, 'logo' | 'banner'>;
}

/**
 * Festival statistics
 */
export interface FestivalStats {
  festivalId: string;
  ticketsSold: number;
  ticketsAvailable: number;
  revenue: number;
  attendeesCheckedIn: number;
  cashlessTransactions: number;
  cashlessVolume: number;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a festival
 */
export interface CreateFestivalDto {
  name: string;
  description: string;
  shortDescription?: string;
  startDate: string;
  endDate: string;
  location: FestivalLocation;
  contact: FestivalContact;
  settings?: Partial<FestivalSettings>;
  media?: Partial<FestivalMedia>;
  tags?: string[];
  visibility?: FestivalVisibility;
}

/**
 * DTO for updating a festival
 */
export interface UpdateFestivalDto {
  name?: string;
  description?: string;
  shortDescription?: string;
  status?: FestivalStatus;
  visibility?: FestivalVisibility;
  startDate?: string;
  endDate?: string;
  location?: Partial<FestivalLocation>;
  contact?: Partial<FestivalContact>;
  settings?: Partial<FestivalSettings>;
  media?: Partial<FestivalMedia>;
  tags?: string[];
}

/**
 * DTO for publishing a festival
 */
export interface PublishFestivalDto {
  publishDate?: string;
  notifySubscribers?: boolean;
}

/**
 * Festival query filters
 */
export interface FestivalFilters {
  status?: FestivalStatus | FestivalStatus[];
  visibility?: FestivalVisibility;
  startDateFrom?: string;
  startDateTo?: string;
  city?: string;
  country?: string;
  organizerId?: string;
  search?: string;
  tags?: string[];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid FestivalStatus
 */
export function isFestivalStatus(value: unknown): value is FestivalStatus {
  return Object.values(FestivalStatus).includes(value as FestivalStatus);
}

/**
 * Check if value is a valid FestivalVisibility
 */
export function isFestivalVisibility(
  value: unknown
): value is FestivalVisibility {
  return Object.values(FestivalVisibility).includes(
    value as FestivalVisibility
  );
}

/**
 * Check if festival is currently active
 */
export function isFestivalActive(festival: Festival): boolean {
  const now = new Date();
  const start = new Date(festival.startDate);
  const end = new Date(festival.endDate);
  return (
    festival.status === FestivalStatus.PUBLISHED && now >= start && now <= end
  );
}

/**
 * Check if festival is upcoming
 */
export function isFestivalUpcoming(festival: Festival): boolean {
  const now = new Date();
  const start = new Date(festival.startDate);
  return festival.status === FestivalStatus.PUBLISHED && now < start;
}

/**
 * Check if festival is past
 */
export function isFestivalPast(festival: Festival): boolean {
  const now = new Date();
  const end = new Date(festival.endDate);
  return now > end;
}

/**
 * Check if festival is editable
 */
export function isFestivalEditable(festival: Festival): boolean {
  return [FestivalStatus.DRAFT, FestivalStatus.PUBLISHED].includes(
    festival.status
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get festival duration in days
 */
export function getFestivalDuration(festival: Festival): number {
  const start = new Date(festival.startDate);
  const end = new Date(festival.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Generate festival slug from name
 */
export function generateFestivalSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Convert Festival to FestivalSummary
 */
export function toFestivalSummary(festival: Festival): FestivalSummary {
  return {
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    shortDescription: festival.shortDescription,
    status: festival.status,
    startDate: festival.startDate,
    endDate: festival.endDate,
    location: {
      city: festival.location.city,
      country: festival.location.country,
    },
    media: {
      logo: festival.media.logo,
      banner: festival.media.banner,
    },
  };
}
