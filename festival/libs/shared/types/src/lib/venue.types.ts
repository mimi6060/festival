// Venue-related types

import { Address, BaseEntity, Coordinates } from './common.types';

export enum VenueType {
  MAIN_STAGE = 'main_stage',
  SECONDARY_STAGE = 'secondary_stage',
  TENT = 'tent',
  INDOOR = 'indoor',
  OUTDOOR = 'outdoor',
  LOUNGE = 'lounge',
}

export enum VenueStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

export interface Venue extends BaseEntity {
  name: string;
  slug: string;
  type: VenueType;
  status: VenueStatus;
  capacity: number;
  address: Address;
  coordinates: Coordinates;
  description?: string;
  imageUrl?: string;
  facilities?: VenueFacilities;
  technicalSpecs?: TechnicalSpecs;
}

export interface VenueFacilities {
  hasParking: boolean;
  hasAccessibility: boolean;
  hasFood: boolean;
  hasDrinks: boolean;
  hasRestrooms: boolean;
  hasFirstAid: boolean;
}

export interface TechnicalSpecs {
  stageWidth?: number;
  stageDepth?: number;
  stageHeight?: number;
  powerCapacity?: string;
  soundSystem?: string;
  lightingSystem?: string;
}

export interface CreateVenueDto {
  name: string;
  type: VenueType;
  capacity: number;
  address: Address;
  coordinates: Coordinates;
  description?: string;
  imageUrl?: string;
  facilities?: VenueFacilities;
  technicalSpecs?: TechnicalSpecs;
}

export interface UpdateVenueDto {
  name?: string;
  type?: VenueType;
  status?: VenueStatus;
  capacity?: number;
  address?: Partial<Address>;
  coordinates?: Coordinates;
  description?: string;
  imageUrl?: string;
  facilities?: Partial<VenueFacilities>;
  technicalSpecs?: Partial<TechnicalSpecs>;
}

export interface VenueFilters {
  type?: VenueType;
  status?: VenueStatus;
  minCapacity?: number;
  maxCapacity?: number;
  search?: string;
}
