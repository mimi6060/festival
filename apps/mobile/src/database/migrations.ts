/**
 * WatermelonDB Migrations
 * Handles database schema versioning and migrations
 */

import {
  schemaMigrations,
  createTable,
  addColumns,
} from '@nozbe/watermelondb/Schema/migrations';

/**
 * Migration definitions
 * Each migration should be backward compatible and handle data transformation
 */
export const migrations = schemaMigrations({
  migrations: [
    // Version 1: Initial schema (base version, no migration needed)
    // Future migrations will be added here as the schema evolves

    // Example of future migration (Version 2):
    // {
    //   toVersion: 2,
    //   steps: [
    //     addColumns({
    //       table: 'users',
    //       columns: [
    //         { name: 'new_field', type: 'string', isOptional: true },
    //       ],
    //     }),
    //     createTable({
    //       name: 'new_table',
    //       columns: [
    //         { name: 'field1', type: 'string' },
    //         { name: 'field2', type: 'number' },
    //       ],
    //     }),
    //   ],
    // },
  ],
});

/**
 * Migration helpers for common operations
 */
export const MigrationHelpers = {
  /**
   * Add a new column to an existing table
   */
  addColumn: (
    tableName: string,
    columnName: string,
    columnType: 'string' | 'number' | 'boolean',
    isOptional = false
  ) => {
    return addColumns({
      table: tableName,
      columns: [{ name: columnName, type: columnType, isOptional }],
    });
  },

  /**
   * Create a new table with standard sync columns
   */
  createTableWithSync: (
    tableName: string,
    columns: { name: string; type: 'string' | 'number' | 'boolean'; isOptional?: boolean }[]
  ) => {
    const syncColumns = [
      { name: 'server_id', type: 'string' as const },
      { name: 'is_synced', type: 'boolean' as const },
      { name: 'last_synced_at', type: 'number' as const, isOptional: true },
      { name: 'needs_push', type: 'boolean' as const },
      { name: 'server_created_at', type: 'number' as const },
      { name: 'server_updated_at', type: 'number' as const },
    ];

    return createTable({
      name: tableName,
      columns: [...columns, ...syncColumns],
    });
  },
};

/**
 * Version history for documentation
 */
export const VERSION_HISTORY = [
  {
    version: 1,
    date: '2026-01-09',
    description: 'Initial schema with core models: User, Festival, Ticket, Artist, Performance, CashlessAccount, CashlessTransaction, Notification',
    changes: [
      'Created users table with authentication fields',
      'Created festivals table for multi-tenant support',
      'Created tickets table with QR code support',
      'Created artists table with social links',
      'Created performances table with scheduling',
      'Created cashless_accounts table for digital wallet',
      'Created cashless_transactions table for payment history',
      'Created notifications table for push/in-app notifications',
      'Created sync_metadata table for sync state tracking',
      'Created sync_queue table for offline mutation queue',
    ],
  },
];

/**
 * Get the current schema version
 */
export function getCurrentVersion(): number {
  return VERSION_HISTORY[VERSION_HISTORY.length - 1].version;
}

/**
 * Validate migration consistency
 */
export function validateMigrations(): boolean {
  // Ensure migrations array length matches version history
  // Version 1 has no migration step (base version)
  const expectedMigrations = VERSION_HISTORY.length - 1;
  const actualMigrations = migrations.migrations.length;

  if (actualMigrations !== expectedMigrations) {
    console.warn(
      `[Migrations] Version mismatch: expected ${expectedMigrations} migrations, found ${actualMigrations}`
    );
    return false;
  }

  return true;
}
