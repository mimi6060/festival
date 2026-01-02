// Event-related types

import { BaseEntity, DateRange, TimeSlot } from './common.types';

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum EventCategory {
  MUSIC = 'music',
  COMEDY = 'comedy',
  THEATER = 'theater',
  WORKSHOP = 'workshop',
  FOOD = 'food',
  ART = 'art',
  OTHER = 'other',
}

export interface Event extends BaseEntity {
  title: string;
  description: string;
  slug: string;
  status: EventStatus;
  category: EventCategory;
  venueId: string;
  artistIds: string[];
  schedule: EventSchedule;
  capacity: number;
  imageUrl?: string;
  tags: string[];
}

export interface EventSchedule {
  dateRange: DateRange;
  timeSlot: TimeSlot;
  isRecurring: boolean;
  recurrenceRule?: string; // RRULE format
}

export interface CreateEventDto {
  title: string;
  description: string;
  category: EventCategory;
  venueId: string;
  artistIds?: string[];
  schedule: EventSchedule;
  capacity: number;
  imageUrl?: string;
  tags?: string[];
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  category?: EventCategory;
  venueId?: string;
  artistIds?: string[];
  schedule?: Partial<EventSchedule>;
  capacity?: number;
  imageUrl?: string;
  tags?: string[];
  status?: EventStatus;
}

export interface EventFilters {
  status?: EventStatus;
  category?: EventCategory;
  venueId?: string;
  artistId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  search?: string;
}
