// Artist-related types

import { BaseEntity } from './common.types';

export enum ArtistStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface Artist extends BaseEntity {
  name: string;
  slug: string;
  bio: string;
  genre: string[];
  status: ArtistStatus;
  imageUrl?: string;
  socialLinks?: SocialLinks;
  technicalRider?: string;
  managementContact?: ContactInfo;
}

export interface SocialLinks {
  website?: string;
  instagram?: string;
  twitter?: string;
  facebook?: string;
  spotify?: string;
  youtube?: string;
  soundcloud?: string;
}

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
}

export interface CreateArtistDto {
  name: string;
  bio: string;
  genre: string[];
  imageUrl?: string;
  socialLinks?: SocialLinks;
  technicalRider?: string;
  managementContact?: ContactInfo;
}

export interface UpdateArtistDto {
  name?: string;
  bio?: string;
  genre?: string[];
  status?: ArtistStatus;
  imageUrl?: string;
  socialLinks?: SocialLinks;
  technicalRider?: string;
  managementContact?: ContactInfo;
}

export interface ArtistFilters {
  genre?: string;
  status?: ArtistStatus;
  search?: string;
}
