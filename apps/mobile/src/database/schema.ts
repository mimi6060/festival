/**
 * WatermelonDB Schema Definition
 * Defines the local database structure for offline-first functionality
 */

import { appSchema, tableSchema, ColumnSchema } from '@nozbe/watermelondb';

// Current schema version - increment when making breaking changes
export const SCHEMA_VERSION = 1;

// Column type helpers for type safety
const column = {
  string: (name: string, isOptional = false): ColumnSchema => ({
    name,
    type: 'string',
    isOptional,
  }),
  number: (name: string, isOptional = false): ColumnSchema => ({
    name,
    type: 'number',
    isOptional,
  }),
  boolean: (name: string, isOptional = false): ColumnSchema => ({
    name,
    type: 'boolean',
    isOptional,
  }),
};

/**
 * Main application schema
 * Maps to backend Prisma models for sync compatibility
 */
export const schema = appSchema({
  version: SCHEMA_VERSION,
  tables: [
    // User table - stores current user and related users
    tableSchema({
      name: 'users',
      columns: [
        column.string('server_id'), // Backend UUID
        column.string('email'),
        column.string('first_name'),
        column.string('last_name'),
        column.string('phone', true),
        column.string('avatar_url', true),
        column.string('role'), // UserRole enum
        column.string('status'), // UserStatus enum
        column.boolean('email_verified'),
        column.number('last_login_at', true), // Timestamp
        column.number('server_created_at'),
        column.number('server_updated_at'),
        // Sync metadata
        column.boolean('is_synced'),
        column.number('last_synced_at', true),
        column.boolean('needs_push'),
      ],
    }),

    // Festival table
    tableSchema({
      name: 'festivals',
      columns: [
        column.string('server_id'),
        column.string('organizer_id'),
        column.string('name'),
        column.string('slug'),
        column.string('description', true),
        column.string('location'),
        column.string('address', true),
        column.number('start_date'), // Timestamp
        column.number('end_date'), // Timestamp
        column.string('status'), // FestivalStatus enum
        column.number('max_capacity'),
        column.number('current_attendees'),
        column.string('logo_url', true),
        column.string('banner_url', true),
        column.string('website_url', true),
        column.string('contact_email', true),
        column.string('timezone'),
        column.string('currency'),
        column.number('server_created_at'),
        column.number('server_updated_at'),
        // Sync metadata
        column.boolean('is_synced'),
        column.number('last_synced_at', true),
        column.boolean('needs_push'),
      ],
    }),

    // Ticket table
    tableSchema({
      name: 'tickets',
      columns: [
        column.string('server_id'),
        column.string('festival_id'), // WatermelonDB relation
        column.string('category_id'),
        column.string('user_id', true),
        column.string('qr_code'),
        column.string('qr_code_data'),
        column.string('status'), // TicketStatus enum
        column.number('purchase_price'),
        column.number('used_at', true), // Timestamp
        column.string('used_by_staff_id', true),
        // Guest purchase fields
        column.boolean('is_guest'),
        column.string('guest_email', true),
        column.string('guest_first_name', true),
        column.string('guest_last_name', true),
        column.string('guest_phone', true),
        // Category details (denormalized for offline access)
        column.string('category_name'),
        column.string('category_type'),
        column.number('server_created_at'),
        column.number('server_updated_at'),
        // Sync metadata
        column.boolean('is_synced'),
        column.number('last_synced_at', true),
        column.boolean('needs_push'),
      ],
    }),

    // Artist table
    tableSchema({
      name: 'artists',
      columns: [
        column.string('server_id'),
        column.string('name'),
        column.string('genre', true),
        column.string('bio', true),
        column.string('image_url', true),
        column.string('spotify_url', true),
        column.string('instagram_url', true),
        column.string('website_url', true),
        column.number('server_created_at'),
        column.number('server_updated_at'),
        // Sync metadata
        column.boolean('is_synced'),
        column.number('last_synced_at', true),
        column.boolean('needs_push'),
        // Local-only fields
        column.boolean('is_favorite'),
      ],
    }),

    // Performance table
    tableSchema({
      name: 'performances',
      columns: [
        column.string('server_id'),
        column.string('artist_id'), // WatermelonDB relation
        column.string('stage_id'),
        column.string('festival_id'), // Denormalized for filtering
        column.number('start_time'), // Timestamp
        column.number('end_time'), // Timestamp
        column.string('description', true),
        column.boolean('is_cancelled'),
        // Denormalized data for offline access
        column.string('artist_name'),
        column.string('stage_name'),
        column.number('server_created_at'),
        column.number('server_updated_at'),
        // Sync metadata
        column.boolean('is_synced'),
        column.number('last_synced_at', true),
        column.boolean('needs_push'),
        // Local-only fields
        column.boolean('has_reminder'),
        column.number('reminder_time', true),
      ],
    }),

    // Cashless Account table
    tableSchema({
      name: 'cashless_accounts',
      columns: [
        column.string('server_id'),
        column.string('user_id'),
        column.number('balance'), // Stored as cents/integer for precision
        column.string('nfc_tag_id', true),
        column.boolean('is_active'),
        column.number('server_created_at'),
        column.number('server_updated_at'),
        // Sync metadata
        column.boolean('is_synced'),
        column.number('last_synced_at', true),
        column.boolean('needs_push'),
        // Offline transaction tracking
        column.number('pending_balance_change'),
      ],
    }),

    // Cashless Transaction table
    tableSchema({
      name: 'cashless_transactions',
      columns: [
        column.string('server_id', true), // Can be null for offline transactions
        column.string('account_id'), // WatermelonDB relation
        column.string('festival_id'),
        column.string('type'), // TransactionType enum
        column.number('amount'), // Stored as cents/integer
        column.number('balance_before'),
        column.number('balance_after'),
        column.string('description', true),
        column.string('metadata', true), // JSON string
        column.string('payment_id', true),
        column.string('performed_by_id', true),
        column.number('server_created_at'),
        // Sync metadata
        column.boolean('is_synced'),
        column.number('last_synced_at', true),
        column.boolean('needs_push'),
        // Offline transaction tracking
        column.boolean('is_offline_transaction'),
        column.string('offline_id', true), // Local UUID for offline transactions
      ],
    }),

    // Notification table
    tableSchema({
      name: 'notifications',
      columns: [
        column.string('server_id'),
        column.string('user_id'),
        column.string('festival_id', true),
        column.string('title'),
        column.string('body'),
        column.string('type'), // NotificationType enum
        column.string('data', true), // JSON string
        column.string('image_url', true),
        column.string('action_url', true),
        column.boolean('is_read'),
        column.number('read_at', true), // Timestamp
        column.number('sent_at', true), // Timestamp
        column.number('server_created_at'),
        // Sync metadata
        column.boolean('is_synced'),
        column.number('last_synced_at', true),
        column.boolean('needs_push'),
      ],
    }),

    // Sync metadata table - tracks overall sync state
    tableSchema({
      name: 'sync_metadata',
      columns: [
        column.string('entity_type'), // Table name
        column.number('last_pulled_at', true),
        column.number('last_pushed_at', true),
        column.string('last_sync_token', true),
        column.number('pending_changes_count'),
        column.boolean('is_initial_sync_complete'),
      ],
    }),

    // Pending sync queue - stores mutations made offline
    tableSchema({
      name: 'sync_queue',
      columns: [
        column.string('entity_type'), // Table name
        column.string('entity_id'), // WatermelonDB record ID
        column.string('operation'), // 'create', 'update', 'delete'
        column.string('payload'), // JSON string of changes
        column.number('created_at'),
        column.number('retry_count'),
        column.string('last_error', true),
        column.string('priority'), // 'high', 'normal', 'low'
        column.string('status'), // 'pending', 'processing', 'failed', 'completed'
      ],
    }),
  ],
});

// Table names as constants for type safety
export const TableNames = {
  USERS: 'users',
  FESTIVALS: 'festivals',
  TICKETS: 'tickets',
  ARTISTS: 'artists',
  PERFORMANCES: 'performances',
  CASHLESS_ACCOUNTS: 'cashless_accounts',
  CASHLESS_TRANSACTIONS: 'cashless_transactions',
  NOTIFICATIONS: 'notifications',
  SYNC_METADATA: 'sync_metadata',
  SYNC_QUEUE: 'sync_queue',
} as const;

export type TableName = (typeof TableNames)[keyof typeof TableNames];
