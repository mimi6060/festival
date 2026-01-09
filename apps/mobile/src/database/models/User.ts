/**
 * User Model
 * WatermelonDB model for user data with offline support
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, children as _children, json as _json, writer } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

import { TableNames } from '../schema';

// User role enum matching backend
export type UserRole = 'ADMIN' | 'ORGANIZER' | 'STAFF' | 'CASHIER' | 'SECURITY' | 'USER';

// User status enum matching backend
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'PENDING_VERIFICATION';

/**
 * User model for local database
 */
export default class User extends Model {
  static table = TableNames.USERS;

  static associations: Associations = {
    [TableNames.TICKETS]: { type: 'has_many', foreignKey: 'user_id' },
    [TableNames.CASHLESS_ACCOUNTS]: { type: 'has_many', foreignKey: 'user_id' },
    [TableNames.NOTIFICATIONS]: { type: 'has_many', foreignKey: 'user_id' },
  };

  // Server ID (backend UUID)
  @text('server_id') serverId!: string;

  // Core fields
  @text('email') email!: string;
  @text('first_name') firstName!: string;
  @text('last_name') lastName!: string;
  @text('phone') phone?: string;
  @text('avatar_url') avatarUrl?: string;
  @text('role') role!: UserRole;
  @text('status') status!: UserStatus;
  @field('email_verified') emailVerified!: boolean;

  // Timestamps
  @field('last_login_at') lastLoginAt?: number;
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
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  get initials(): string {
    const first = this.firstName?.charAt(0) || '';
    const last = this.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  }

  get isAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  get isOrganizer(): boolean {
    return this.role === 'ORGANIZER' || this.role === 'ADMIN';
  }

  get isStaff(): boolean {
    return ['ADMIN', 'ORGANIZER', 'STAFF', 'CASHIER', 'SECURITY'].includes(this.role);
  }

  get isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  get isPendingSync(): boolean {
    return !this.isSynced || this.needsPush;
  }

  /**
   * Convert to plain object for API calls
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.serverId,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      avatarUrl: this.avatarUrl,
      role: this.role,
      status: this.status,
      emailVerified: this.emailVerified,
      lastLoginAt: this.lastLoginAt ? new Date(this.lastLoginAt).toISOString() : null,
      createdAt: this.serverCreatedAt ? new Date(this.serverCreatedAt).toISOString() : null,
      updatedAt: this.serverUpdatedAt ? new Date(this.serverUpdatedAt).toISOString() : null,
    };
  }

  /**
   * Update user from server data
   */
  @writer async updateFromServer(data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
    role?: UserRole;
    status?: UserStatus;
    emailVerified?: boolean;
    lastLoginAt?: string;
    updatedAt?: string;
  }): Promise<void> {
    await this.update((user) => {
      if (data.email !== undefined) user.email = data.email;
      if (data.firstName !== undefined) user.firstName = data.firstName;
      if (data.lastName !== undefined) user.lastName = data.lastName;
      if (data.phone !== undefined) user.phone = data.phone;
      if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
      if (data.role !== undefined) user.role = data.role;
      if (data.status !== undefined) user.status = data.status;
      if (data.emailVerified !== undefined) user.emailVerified = data.emailVerified;
      if (data.lastLoginAt) user.lastLoginAt = new Date(data.lastLoginAt).getTime();
      if (data.updatedAt) user.serverUpdatedAt = new Date(data.updatedAt).getTime();
      user.isSynced = true;
      user.lastSyncedAt = Date.now();
      user.needsPush = false;
    });
  }

  /**
   * Mark for sync after local changes
   */
  @writer async markForSync(): Promise<void> {
    await this.update((user) => {
      user.isSynced = false;
      user.needsPush = true;
    });
  }
}
