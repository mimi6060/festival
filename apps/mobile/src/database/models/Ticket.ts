/**
 * Ticket Model
 * WatermelonDB model for ticket data with offline support
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation, writer } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

import { TableNames } from '../schema';
import Festival from './Festival';

// Ticket status enum matching backend
export type TicketStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'USED' | 'CANCELLED' | 'REFUNDED';

// Ticket type enum matching backend
export type TicketType = 'STANDARD' | 'VIP' | 'BACKSTAGE' | 'CAMPING' | 'PARKING' | 'COMBO';

/**
 * Ticket model for local database
 */
export default class Ticket extends Model {
  static table = TableNames.TICKETS;

  static associations: Associations = {
    [TableNames.FESTIVALS]: { type: 'belongs_to', key: 'festival_id' },
  };

  // Server ID (backend UUID)
  @text('server_id') serverId!: string;

  // Relations
  @text('festival_id') festivalId!: string;
  @text('category_id') categoryId!: string;
  @text('user_id') userId?: string;

  // @relation decorator for lazy loading
  @relation(TableNames.FESTIVALS, 'festival_id') festival!: Festival;

  // QR Code
  @text('qr_code') qrCode!: string;
  @text('qr_code_data') qrCodeData!: string;

  // Status and price
  @text('status') status!: TicketStatus;
  @field('purchase_price') purchasePrice!: number; // Stored as cents

  // Usage tracking
  @field('used_at') usedAt?: number;
  @text('used_by_staff_id') usedByStaffId?: string;

  // Guest purchase fields
  @field('is_guest') isGuest!: boolean;
  @text('guest_email') guestEmail?: string;
  @text('guest_first_name') guestFirstName?: string;
  @text('guest_last_name') guestLastName?: string;
  @text('guest_phone') guestPhone?: string;

  // Category details (denormalized)
  @text('category_name') categoryName!: string;
  @text('category_type') categoryType!: TicketType;

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
  get purchasePriceFormatted(): string {
    return (this.purchasePrice / 100).toFixed(2);
  }

  get isValid(): boolean {
    return this.status === 'SOLD' || this.status === 'AVAILABLE';
  }

  get isUsed(): boolean {
    return this.status === 'USED';
  }

  get isCancelled(): boolean {
    return this.status === 'CANCELLED' || this.status === 'REFUNDED';
  }

  get usedDateTime(): Date | null {
    return this.usedAt ? new Date(this.usedAt) : null;
  }

  get holderName(): string {
    if (this.isGuest) {
      return `${this.guestFirstName || ''} ${this.guestLastName || ''}`.trim() || 'Guest';
    }
    return 'Account Holder';
  }

  get holderEmail(): string | undefined {
    return this.isGuest ? this.guestEmail : undefined;
  }

  get isVIP(): boolean {
    return this.categoryType === 'VIP' || this.categoryType === 'BACKSTAGE';
  }

  get isPendingSync(): boolean {
    return !this.isSynced || this.needsPush;
  }

  /**
   * Get ticket type display name
   */
  getTypeDisplayName(): string {
    const typeNames: Record<TicketType, string> = {
      STANDARD: 'Standard',
      VIP: 'VIP',
      BACKSTAGE: 'Backstage',
      CAMPING: 'Camping',
      PARKING: 'Parking',
      COMBO: 'Combo Pack',
    };
    return typeNames[this.categoryType] || this.categoryType;
  }

  /**
   * Get status display name
   */
  getStatusDisplayName(): string {
    const statusNames: Record<TicketStatus, string> = {
      AVAILABLE: 'Available',
      RESERVED: 'Reserved',
      SOLD: 'Valid',
      USED: 'Used',
      CANCELLED: 'Cancelled',
      REFUNDED: 'Refunded',
    };
    return statusNames[this.status] || this.status;
  }

  /**
   * Get status color for UI
   */
  getStatusColor(): string {
    const statusColors: Record<TicketStatus, string> = {
      AVAILABLE: '#22c55e', // green
      RESERVED: '#f59e0b', // amber
      SOLD: '#3b82f6', // blue
      USED: '#6b7280', // gray
      CANCELLED: '#ef4444', // red
      REFUNDED: '#f97316', // orange
    };
    return statusColors[this.status] || '#6b7280';
  }

  /**
   * Convert to plain object for API calls
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.serverId,
      festivalId: this.festivalId,
      categoryId: this.categoryId,
      userId: this.userId,
      qrCode: this.qrCode,
      qrCodeData: this.qrCodeData,
      status: this.status,
      purchasePrice: this.purchasePrice / 100, // Convert back to decimal
      usedAt: this.usedAt ? new Date(this.usedAt).toISOString() : null,
      usedByStaffId: this.usedByStaffId,
      isGuest: this.isGuest,
      guestEmail: this.guestEmail,
      guestFirstName: this.guestFirstName,
      guestLastName: this.guestLastName,
      guestPhone: this.guestPhone,
      categoryName: this.categoryName,
      categoryType: this.categoryType,
      createdAt: this.serverCreatedAt ? new Date(this.serverCreatedAt).toISOString() : null,
      updatedAt: this.serverUpdatedAt ? new Date(this.serverUpdatedAt).toISOString() : null,
    };
  }

  /**
   * Update ticket from server data
   */
  @writer async updateFromServer(data: {
    status?: TicketStatus;
    usedAt?: string;
    usedByStaffId?: string;
    updatedAt?: string;
  }): Promise<void> {
    await this.update((ticket) => {
      if (data.status !== undefined) ticket.status = data.status;
      if (data.usedAt) ticket.usedAt = new Date(data.usedAt).getTime();
      if (data.usedByStaffId !== undefined) ticket.usedByStaffId = data.usedByStaffId;
      if (data.updatedAt) ticket.serverUpdatedAt = new Date(data.updatedAt).getTime();
      ticket.isSynced = true;
      ticket.lastSyncedAt = Date.now();
      ticket.needsPush = false;
    });
  }

  /**
   * Mark ticket as used (offline capable)
   */
  @writer async markAsUsed(staffId?: string): Promise<void> {
    await this.update((ticket) => {
      ticket.status = 'USED';
      ticket.usedAt = Date.now();
      ticket.usedByStaffId = staffId;
      ticket.isSynced = false;
      ticket.needsPush = true;
    });
  }

  /**
   * Mark for sync after local changes
   */
  @writer async markForSync(): Promise<void> {
    await this.update((ticket) => {
      ticket.isSynced = false;
      ticket.needsPush = true;
    });
  }
}
