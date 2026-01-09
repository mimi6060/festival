/**
 * Artist Model
 * WatermelonDB model for artist data with offline support
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, children as _children, writer } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

import { TableNames } from '../schema';

/**
 * Artist model for local database
 */
export default class Artist extends Model {
  static table = TableNames.ARTISTS;

  static associations: Associations = {
    [TableNames.PERFORMANCES]: { type: 'has_many', foreignKey: 'artist_id' },
  };

  // Server ID (backend UUID)
  @text('server_id') serverId!: string;

  // Core fields
  @text('name') name!: string;
  @text('genre') genre?: string;
  @text('bio') bio?: string;
  @text('image_url') imageUrl?: string;

  // Social links
  @text('spotify_url') spotifyUrl?: string;
  @text('instagram_url') instagramUrl?: string;
  @text('website_url') websiteUrl?: string;

  // Server timestamps
  @field('server_created_at') serverCreatedAt!: number;
  @field('server_updated_at') serverUpdatedAt!: number;

  // Sync metadata
  @field('is_synced') isSynced!: boolean;
  @field('last_synced_at') lastSyncedAt?: number;
  @field('needs_push') needsPush!: boolean;

  // Local-only fields
  @field('is_favorite') isFavorite!: boolean;

  // Read-only timestamps
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed properties
  get hasSocialLinks(): boolean {
    return !!(this.spotifyUrl || this.instagramUrl || this.websiteUrl);
  }

  get socialLinks(): { type: string; url: string }[] {
    const links: { type: string; url: string }[] = [];
    if (this.spotifyUrl) links.push({ type: 'spotify', url: this.spotifyUrl });
    if (this.instagramUrl) links.push({ type: 'instagram', url: this.instagramUrl });
    if (this.websiteUrl) links.push({ type: 'website', url: this.websiteUrl });
    return links;
  }

  get initials(): string {
    return this.name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  get isPendingSync(): boolean {
    return !this.isSynced || this.needsPush;
  }

  /**
   * Get short bio (truncated)
   */
  getShortBio(maxLength = 150): string {
    if (!this.bio) return '';
    if (this.bio.length <= maxLength) return this.bio;
    return `${this.bio.slice(0, maxLength).trim()}...`;
  }

  /**
   * Convert to plain object for API calls
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.serverId,
      name: this.name,
      genre: this.genre,
      bio: this.bio,
      imageUrl: this.imageUrl,
      spotifyUrl: this.spotifyUrl,
      instagramUrl: this.instagramUrl,
      websiteUrl: this.websiteUrl,
      createdAt: this.serverCreatedAt ? new Date(this.serverCreatedAt).toISOString() : null,
      updatedAt: this.serverUpdatedAt ? new Date(this.serverUpdatedAt).toISOString() : null,
    };
  }

  /**
   * Update artist from server data
   */
  @writer async updateFromServer(data: {
    name?: string;
    genre?: string;
    bio?: string;
    imageUrl?: string;
    spotifyUrl?: string;
    instagramUrl?: string;
    websiteUrl?: string;
    updatedAt?: string;
  }): Promise<void> {
    await this.update((artist) => {
      if (data.name !== undefined) artist.name = data.name;
      if (data.genre !== undefined) artist.genre = data.genre;
      if (data.bio !== undefined) artist.bio = data.bio;
      if (data.imageUrl !== undefined) artist.imageUrl = data.imageUrl;
      if (data.spotifyUrl !== undefined) artist.spotifyUrl = data.spotifyUrl;
      if (data.instagramUrl !== undefined) artist.instagramUrl = data.instagramUrl;
      if (data.websiteUrl !== undefined) artist.websiteUrl = data.websiteUrl;
      if (data.updatedAt) artist.serverUpdatedAt = new Date(data.updatedAt).getTime();
      artist.isSynced = true;
      artist.lastSyncedAt = Date.now();
      artist.needsPush = false;
    });
  }

  /**
   * Toggle favorite status (local only)
   */
  @writer async toggleFavorite(): Promise<boolean> {
    const newValue = !this.isFavorite;
    await this.update((artist) => {
      artist.isFavorite = newValue;
      // Favorites are synced to backend
      artist.isSynced = false;
      artist.needsPush = true;
    });
    return newValue;
  }

  /**
   * Set favorite status
   */
  @writer async setFavorite(isFavorite: boolean): Promise<void> {
    if (this.isFavorite === isFavorite) return;

    await this.update((artist) => {
      artist.isFavorite = isFavorite;
      artist.isSynced = false;
      artist.needsPush = true;
    });
  }

  /**
   * Mark for sync after local changes
   */
  @writer async markForSync(): Promise<void> {
    await this.update((artist) => {
      artist.isSynced = false;
      artist.needsPush = true;
    });
  }
}
