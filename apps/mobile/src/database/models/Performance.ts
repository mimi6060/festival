/**
 * Performance Model
 * WatermelonDB model for performance/schedule data with offline support
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation, writer } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

import { TableNames } from '../schema';
import Artist from './Artist';
import Festival from './Festival';

/**
 * Performance model for local database
 */
export default class Performance extends Model {
  static table = TableNames.PERFORMANCES;

  static associations: Associations = {
    [TableNames.ARTISTS]: { type: 'belongs_to', key: 'artist_id' },
    [TableNames.FESTIVALS]: { type: 'belongs_to', key: 'festival_id' },
  };

  // Server ID (backend UUID)
  @text('server_id') serverId!: string;

  // Relations
  @text('artist_id') artistId!: string;
  @text('stage_id') stageId!: string;
  @text('festival_id') festivalId!: string;

  // Lazy loading relations
  @relation(TableNames.ARTISTS, 'artist_id') artist!: Artist;

  // Schedule
  @field('start_time') startTime!: number; // Timestamp
  @field('end_time') endTime!: number; // Timestamp
  @text('description') description?: string;
  @field('is_cancelled') isCancelled!: boolean;

  // Denormalized data for offline access
  @text('artist_name') artistName!: string;
  @text('stage_name') stageName!: string;

  // Server timestamps
  @field('server_created_at') serverCreatedAt!: number;
  @field('server_updated_at') serverUpdatedAt!: number;

  // Sync metadata
  @field('is_synced') isSynced!: boolean;
  @field('last_synced_at') lastSyncedAt?: number;
  @field('needs_push') needsPush!: boolean;

  // Local-only fields
  @field('has_reminder') hasReminder!: boolean;
  @field('reminder_time') reminderTime?: number; // Timestamp for reminder

  // Read-only timestamps
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed properties
  get startDateTime(): Date {
    return new Date(this.startTime);
  }

  get endDateTime(): Date {
    return new Date(this.endTime);
  }

  get durationMinutes(): number {
    return Math.round((this.endTime - this.startTime) / (1000 * 60));
  }

  get durationFormatted(): string {
    const minutes = this.durationMinutes;
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }

  get isOngoing(): boolean {
    const now = Date.now();
    return this.startTime <= now && now <= this.endTime && !this.isCancelled;
  }

  get isUpcoming(): boolean {
    return this.startTime > Date.now() && !this.isCancelled;
  }

  get isPast(): boolean {
    return this.endTime < Date.now();
  }

  get timeUntilStart(): number {
    return Math.max(0, this.startTime - Date.now());
  }

  get timeUntilStartFormatted(): string {
    const ms = this.timeUntilStart;
    if (ms === 0) return 'Now';

    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }

  get progressPercentage(): number {
    if (!this.isOngoing) return this.isPast ? 100 : 0;
    const total = this.endTime - this.startTime;
    const elapsed = Date.now() - this.startTime;
    return Math.round((elapsed / total) * 100);
  }

  get isPendingSync(): boolean {
    return !this.isSynced || this.needsPush;
  }

  /**
   * Format time range for display
   */
  getTimeRangeFormatted(locale = 'en-US'): string {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    const start = this.startDateTime.toLocaleTimeString(locale, options);
    const end = this.endDateTime.toLocaleTimeString(locale, options);

    return `${start} - ${end}`;
  }

  /**
   * Format date for display
   */
  getDateFormatted(locale = 'en-US'): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };

    return this.startDateTime.toLocaleDateString(locale, options);
  }

  /**
   * Check if performance conflicts with another
   */
  conflictsWith(other: Performance): boolean {
    if (this.id === other.id) return false;
    return this.startTime < other.endTime && this.endTime > other.startTime;
  }

  /**
   * Convert to plain object for API calls
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.serverId,
      artistId: this.artistId,
      stageId: this.stageId,
      festivalId: this.festivalId,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(this.endTime).toISOString(),
      description: this.description,
      isCancelled: this.isCancelled,
      artistName: this.artistName,
      stageName: this.stageName,
      createdAt: this.serverCreatedAt ? new Date(this.serverCreatedAt).toISOString() : null,
      updatedAt: this.serverUpdatedAt ? new Date(this.serverUpdatedAt).toISOString() : null,
    };
  }

  /**
   * Update performance from server data
   */
  @writer async updateFromServer(data: {
    startTime?: string;
    endTime?: string;
    description?: string;
    isCancelled?: boolean;
    artistName?: string;
    stageName?: string;
    updatedAt?: string;
  }): Promise<void> {
    await this.update((performance) => {
      if (data.startTime) performance.startTime = new Date(data.startTime).getTime();
      if (data.endTime) performance.endTime = new Date(data.endTime).getTime();
      if (data.description !== undefined) performance.description = data.description;
      if (data.isCancelled !== undefined) performance.isCancelled = data.isCancelled;
      if (data.artistName !== undefined) performance.artistName = data.artistName;
      if (data.stageName !== undefined) performance.stageName = data.stageName;
      if (data.updatedAt) performance.serverUpdatedAt = new Date(data.updatedAt).getTime();
      performance.isSynced = true;
      performance.lastSyncedAt = Date.now();
      performance.needsPush = false;
    });
  }

  /**
   * Set reminder for performance
   */
  @writer async setReminder(minutesBefore = 15): Promise<void> {
    await this.update((performance) => {
      performance.hasReminder = true;
      performance.reminderTime = performance.startTime - minutesBefore * 60 * 1000;
      // Reminders are local-only, no sync needed
    });
  }

  /**
   * Remove reminder
   */
  @writer async removeReminder(): Promise<void> {
    await this.update((performance) => {
      performance.hasReminder = false;
      performance.reminderTime = undefined;
    });
  }

  /**
   * Toggle reminder
   */
  @writer async toggleReminder(minutesBefore = 15): Promise<boolean> {
    const willHaveReminder = !this.hasReminder;

    await this.update((performance) => {
      performance.hasReminder = willHaveReminder;
      performance.reminderTime = willHaveReminder
        ? performance.startTime - minutesBefore * 60 * 1000
        : undefined;
    });

    return willHaveReminder;
  }

  /**
   * Mark for sync after local changes
   */
  @writer async markForSync(): Promise<void> {
    await this.update((performance) => {
      performance.isSynced = false;
      performance.needsPush = true;
    });
  }
}
