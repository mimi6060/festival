/**
 * Festival Model
 * WatermelonDB model for festival data with offline support
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, children as _children, writer } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

import { TableNames } from '../schema';

// Festival status enum matching backend
export type FestivalStatus = 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

/**
 * Festival model for local database
 */
export default class Festival extends Model {
  static table = TableNames.FESTIVALS;

  static associations: Associations = {
    [TableNames.TICKETS]: { type: 'has_many', foreignKey: 'festival_id' },
    [TableNames.PERFORMANCES]: { type: 'has_many', foreignKey: 'festival_id' },
    [TableNames.CASHLESS_TRANSACTIONS]: { type: 'has_many', foreignKey: 'festival_id' },
    [TableNames.NOTIFICATIONS]: { type: 'has_many', foreignKey: 'festival_id' },
  };

  // Server ID (backend UUID)
  @text('server_id') serverId!: string;

  // Core fields
  @text('organizer_id') organizerId!: string;
  @text('name') name!: string;
  @text('slug') slug!: string;
  @text('description') description?: string;
  @text('location') location!: string;
  @text('address') address?: string;
  @field('start_date') startDate!: number; // Timestamp
  @field('end_date') endDate!: number; // Timestamp
  @text('status') status!: FestivalStatus;
  @field('max_capacity') maxCapacity!: number;
  @field('current_attendees') currentAttendees!: number;

  // Media
  @text('logo_url') logoUrl?: string;
  @text('banner_url') bannerUrl?: string;
  @text('website_url') websiteUrl?: string;
  @text('contact_email') contactEmail?: string;

  // Localization
  @text('timezone') timezone!: string;
  @text('currency') currency!: string;

  // Server timestamps
  @field('server_created_at') serverCreatedAt!: number;
  @field('server_updated_at') serverUpdatedAt!: number;

  // Sync metadata
  @field('is_synced') isSynced!: boolean;
  @field('last_synced_at') lastSyncedAt?: number;
  @field('needs_push') needsPush!: boolean;

  // Read-only timestamps
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed properties
  get startDateTime(): Date {
    return new Date(this.startDate);
  }

  get endDateTime(): Date {
    return new Date(this.endDate);
  }

  get isOngoing(): boolean {
    const now = Date.now();
    return this.startDate <= now && now <= this.endDate;
  }

  get isUpcoming(): boolean {
    return this.startDate > Date.now();
  }

  get isPast(): boolean {
    return this.endDate < Date.now();
  }

  get durationDays(): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.ceil((this.endDate - this.startDate) / msPerDay);
  }

  get availableCapacity(): number {
    return Math.max(0, this.maxCapacity - this.currentAttendees);
  }

  get capacityPercentage(): number {
    if (this.maxCapacity === 0) return 0;
    return Math.round((this.currentAttendees / this.maxCapacity) * 100);
  }

  get isNearCapacity(): boolean {
    return this.capacityPercentage >= 90;
  }

  get isActive(): boolean {
    return this.status === 'PUBLISHED' || this.status === 'ONGOING';
  }

  get isPendingSync(): boolean {
    return !this.isSynced || this.needsPush;
  }

  /**
   * Format date range for display
   */
  getDateRangeFormatted(locale = 'en-US'): string {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };

    const start = this.startDateTime.toLocaleDateString(locale, options);
    const end = this.endDateTime.toLocaleDateString(locale, options);

    return `${start} - ${end}`;
  }

  /**
   * Convert to plain object for API calls
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.serverId,
      organizerId: this.organizerId,
      name: this.name,
      slug: this.slug,
      description: this.description,
      location: this.location,
      address: this.address,
      startDate: new Date(this.startDate).toISOString(),
      endDate: new Date(this.endDate).toISOString(),
      status: this.status,
      maxCapacity: this.maxCapacity,
      currentAttendees: this.currentAttendees,
      logoUrl: this.logoUrl,
      bannerUrl: this.bannerUrl,
      websiteUrl: this.websiteUrl,
      contactEmail: this.contactEmail,
      timezone: this.timezone,
      currency: this.currency,
      createdAt: this.serverCreatedAt ? new Date(this.serverCreatedAt).toISOString() : null,
      updatedAt: this.serverUpdatedAt ? new Date(this.serverUpdatedAt).toISOString() : null,
    };
  }

  /**
   * Update festival from server data
   */
  @writer async updateFromServer(data: {
    name?: string;
    slug?: string;
    description?: string;
    location?: string;
    address?: string;
    startDate?: string;
    endDate?: string;
    status?: FestivalStatus;
    maxCapacity?: number;
    currentAttendees?: number;
    logoUrl?: string;
    bannerUrl?: string;
    websiteUrl?: string;
    contactEmail?: string;
    timezone?: string;
    currency?: string;
    updatedAt?: string;
  }): Promise<void> {
    await this.update((festival) => {
      if (data.name !== undefined) festival.name = data.name;
      if (data.slug !== undefined) festival.slug = data.slug;
      if (data.description !== undefined) festival.description = data.description;
      if (data.location !== undefined) festival.location = data.location;
      if (data.address !== undefined) festival.address = data.address;
      if (data.startDate) festival.startDate = new Date(data.startDate).getTime();
      if (data.endDate) festival.endDate = new Date(data.endDate).getTime();
      if (data.status !== undefined) festival.status = data.status;
      if (data.maxCapacity !== undefined) festival.maxCapacity = data.maxCapacity;
      if (data.currentAttendees !== undefined) festival.currentAttendees = data.currentAttendees;
      if (data.logoUrl !== undefined) festival.logoUrl = data.logoUrl;
      if (data.bannerUrl !== undefined) festival.bannerUrl = data.bannerUrl;
      if (data.websiteUrl !== undefined) festival.websiteUrl = data.websiteUrl;
      if (data.contactEmail !== undefined) festival.contactEmail = data.contactEmail;
      if (data.timezone !== undefined) festival.timezone = data.timezone;
      if (data.currency !== undefined) festival.currency = data.currency;
      if (data.updatedAt) festival.serverUpdatedAt = new Date(data.updatedAt).getTime();
      festival.isSynced = true;
      festival.lastSyncedAt = Date.now();
      festival.needsPush = false;
    });
  }

  /**
   * Mark for sync after local changes
   */
  @writer async markForSync(): Promise<void> {
    await this.update((festival) => {
      festival.isSynced = false;
      festival.needsPush = true;
    });
  }
}
