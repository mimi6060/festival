/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * ConflictResolver Service
 * Handles sync conflicts between local and server data
 */

import { TableNames } from '../../database';

// Conflict resolution strategies
export type ConflictStrategy = 'server-wins' | 'client-wins' | 'latest-wins' | 'merge' | 'manual';

// Conflict result
export interface ConflictResult {
  useServer: boolean;
  merged?: Record<string, unknown>;
  requiresManualResolution?: boolean;
  conflictDetails?: ConflictDetail[];
}

// Individual field conflict
export interface ConflictDetail {
  field: string;
  localValue: unknown;
  serverValue: unknown;
  resolvedValue: unknown;
  resolution: 'server' | 'client' | 'merged';
}

// Pending conflict for manual resolution
export interface PendingConflict {
  id: string;
  entityType: string;
  entityId: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  conflictFields: string[];
  createdAt: Date;
}

// Merge rules for specific fields
export interface MergeRule {
  field: string;
  strategy: 'server' | 'client' | 'latest' | 'max' | 'min' | 'concat' | 'custom';
  customResolver?: (local: unknown, server: unknown) => unknown;
}

// Entity-specific conflict configuration
export interface EntityConflictConfig {
  strategy: ConflictStrategy;
  mergeRules?: MergeRule[];
  nonMergeableFields?: string[]; // Fields that cannot be auto-merged
  serverWinsFields?: string[]; // Fields where server always wins
  clientWinsFields?: string[]; // Fields where client always wins
}

// Default configurations per entity type
const DEFAULT_ENTITY_CONFIGS: Record<string, EntityConflictConfig> = {
  [TableNames.USERS]: {
    strategy: 'server-wins',
    serverWinsFields: ['email', 'role', 'status', 'emailVerified'],
    clientWinsFields: ['avatarUrl'],
  },
  [TableNames.FESTIVALS]: {
    strategy: 'server-wins',
    // Festivals are managed by organizers, server always wins
  },
  [TableNames.TICKETS]: {
    strategy: 'server-wins',
    // Ticket status must be authoritative from server
    serverWinsFields: ['status', 'usedAt', 'usedByStaffId'],
  },
  [TableNames.ARTISTS]: {
    strategy: 'server-wins',
    clientWinsFields: ['isFavorite'], // Local favorites preserved
  },
  [TableNames.PERFORMANCES]: {
    strategy: 'server-wins',
    clientWinsFields: ['hasReminder', 'reminderTime'], // Local reminders preserved
  },
  [TableNames.CASHLESS_ACCOUNTS]: {
    strategy: 'server-wins',
    // Balance must come from server (authoritative)
    serverWinsFields: ['balance', 'isActive'],
    clientWinsFields: ['pendingBalanceChange'], // Local pending changes preserved
  },
  [TableNames.CASHLESS_TRANSACTIONS]: {
    strategy: 'server-wins',
    // Transactions are immutable, server is authoritative
  },
  [TableNames.NOTIFICATIONS]: {
    strategy: 'merge',
    mergeRules: [
      // Read status: if either has read it, mark as read
      {
        field: 'isRead',
        strategy: 'custom',
        customResolver: (local, server) => (local as boolean) || (server as boolean),
      },
      // Use the later read time
      {
        field: 'readAt',
        strategy: 'max',
      },
    ],
    serverWinsFields: ['title', 'body', 'type', 'data'],
  },
};

/**
 * Conflict Resolver Service
 */
class ConflictResolver {
  private static instance: ConflictResolver;
  private configs = new Map<string, EntityConflictConfig>();
  private pendingConflicts = new Map<string, PendingConflict>();
  private defaultStrategy: ConflictStrategy = 'server-wins';

  private constructor() {
    // Load default configurations
    Object.entries(DEFAULT_ENTITY_CONFIGS).forEach(([entity, config]) => {
      this.configs.set(entity, config);
    });
  }

  static getInstance(): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver();
    }
    return ConflictResolver.instance;
  }

  /**
   * Set configuration for entity type
   */
  setConfig(entityType: string, config: EntityConflictConfig): void {
    this.configs.set(entityType, config);
  }

  /**
   * Get configuration for entity type
   */
  getConfig(entityType: string): EntityConflictConfig {
    return (
      this.configs.get(entityType) || {
        strategy: this.defaultStrategy,
      }
    );
  }

  /**
   * Set default strategy
   */
  setDefaultStrategy(strategy: ConflictStrategy): void {
    this.defaultStrategy = strategy;
  }

  /**
   * Resolve conflict between local and server data
   */
  resolve(
    entityType: string,
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): ConflictResult {
    const config = this.getConfig(entityType);

    switch (config.strategy) {
      case 'server-wins':
        return this.resolveServerWins(config, localData, serverData);

      case 'client-wins':
        return this.resolveClientWins(config, localData, serverData);

      case 'latest-wins':
        return this.resolveLatestWins(localData, serverData);

      case 'merge':
        return this.resolveMerge(config, localData, serverData);

      case 'manual':
        return this.flagForManualResolution(entityType, localData, serverData);

      default:
        return { useServer: true };
    }
  }

  /**
   * Server wins resolution
   */
  private resolveServerWins(
    config: EntityConflictConfig,
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): ConflictResult {
    // Preserve client-wins fields
    if (config.clientWinsFields && config.clientWinsFields.length > 0) {
      const merged = { ...serverData };
      const conflictDetails: ConflictDetail[] = [];

      for (const field of config.clientWinsFields) {
        if (field in localData) {
          merged[field] = localData[field];
          conflictDetails.push({
            field,
            localValue: localData[field],
            serverValue: serverData[field],
            resolvedValue: localData[field],
            resolution: 'client',
          });
        }
      }

      return {
        useServer: true,
        merged,
        conflictDetails,
      };
    }

    return { useServer: true };
  }

  /**
   * Client wins resolution
   */
  private resolveClientWins(
    config: EntityConflictConfig,
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): ConflictResult {
    // Preserve server-wins fields
    if (config.serverWinsFields && config.serverWinsFields.length > 0) {
      const merged = { ...localData };
      const conflictDetails: ConflictDetail[] = [];

      for (const field of config.serverWinsFields) {
        if (field in serverData) {
          merged[field] = serverData[field];
          conflictDetails.push({
            field,
            localValue: localData[field],
            serverValue: serverData[field],
            resolvedValue: serverData[field],
            resolution: 'server',
          });
        }
      }

      return {
        useServer: false,
        merged,
        conflictDetails,
      };
    }

    return { useServer: false };
  }

  /**
   * Latest wins resolution (based on timestamps)
   */
  private resolveLatestWins(
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): ConflictResult {
    const localTimestamp = this.getTimestamp(localData);
    const serverTimestamp = this.getTimestamp(serverData);

    const useServer = serverTimestamp >= localTimestamp;

    return {
      useServer,
      conflictDetails: [
        {
          field: 'timestamp',
          localValue: localTimestamp,
          serverValue: serverTimestamp,
          resolvedValue: useServer ? serverTimestamp : localTimestamp,
          resolution: useServer ? 'server' : 'client',
        },
      ],
    };
  }

  /**
   * Merge resolution with field-level rules
   */
  private resolveMerge(
    config: EntityConflictConfig,
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): ConflictResult {
    const merged: Record<string, unknown> = { ...serverData };
    const conflictDetails: ConflictDetail[] = [];

    // Apply merge rules
    if (config.mergeRules) {
      for (const rule of config.mergeRules) {
        const localValue = localData[rule.field];
        const serverValue = serverData[rule.field];

        if (localValue !== serverValue) {
          const resolvedValue = this.applyMergeRule(rule, localValue, serverValue);
          merged[rule.field] = resolvedValue;

          conflictDetails.push({
            field: rule.field,
            localValue,
            serverValue,
            resolvedValue,
            resolution: 'merged',
          });
        }
      }
    }

    // Apply server-wins fields
    if (config.serverWinsFields) {
      for (const field of config.serverWinsFields) {
        if (field in serverData) {
          merged[field] = serverData[field];
        }
      }
    }

    // Apply client-wins fields
    if (config.clientWinsFields) {
      for (const field of config.clientWinsFields) {
        if (field in localData) {
          merged[field] = localData[field];
        }
      }
    }

    return {
      useServer: true,
      merged,
      conflictDetails,
    };
  }

  /**
   * Apply a merge rule to resolve field conflict
   */
  private applyMergeRule(rule: MergeRule, localValue: unknown, serverValue: unknown): unknown {
    switch (rule.strategy) {
      case 'server':
        return serverValue;

      case 'client':
        return localValue;

      case 'latest':
        // Assumes values are timestamps
        return Math.max(Number(localValue) || 0, Number(serverValue) || 0);

      case 'max':
        return Math.max(Number(localValue) || 0, Number(serverValue) || 0);

      case 'min':
        return Math.min(Number(localValue) || 0, Number(serverValue) || 0);

      case 'concat':
        if (Array.isArray(localValue) && Array.isArray(serverValue)) {
          return [...new Set([...localValue, ...serverValue])];
        }
        return serverValue;

      case 'custom':
        if (rule.customResolver) {
          return rule.customResolver(localValue, serverValue);
        }
        return serverValue;

      default:
        return serverValue;
    }
  }

  /**
   * Flag conflict for manual resolution
   */
  private flagForManualResolution(
    entityType: string,
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): ConflictResult {
    const conflictId = `${entityType}-${localData.id || localData.serverId}`;
    const conflictFields = this.findConflictingFields(localData, serverData);

    const pendingConflict: PendingConflict = {
      id: conflictId,
      entityType,
      entityId: String(localData.id || localData.serverId),
      localData,
      serverData,
      conflictFields,
      createdAt: new Date(),
    };

    this.pendingConflicts.set(conflictId, pendingConflict);

    return {
      useServer: false, // Don't apply changes yet
      requiresManualResolution: true,
      conflictDetails: conflictFields.map((field) => ({
        field,
        localValue: localData[field],
        serverValue: serverData[field],
        resolvedValue: undefined,
        resolution: 'client', // Keep local until resolved
      })),
    };
  }

  /**
   * Find fields with conflicting values
   */
  private findConflictingFields(
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): string[] {
    const conflicts: string[] = [];
    const allFields = new Set([...Object.keys(localData), ...Object.keys(serverData)]);

    for (const field of allFields) {
      // Skip metadata fields
      if (this.isMetadataField(field)) {
        continue;
      }

      if (!this.deepEqual(localData[field], serverData[field])) {
        conflicts.push(field);
      }
    }

    return conflicts;
  }

  /**
   * Check if field is metadata (not user data)
   */
  private isMetadataField(field: string): boolean {
    const metadataFields = [
      'id',
      'serverId',
      'server_id',
      'createdAt',
      'updatedAt',
      'created_at',
      'updated_at',
      'serverCreatedAt',
      'serverUpdatedAt',
      'server_created_at',
      'server_updated_at',
      'isSynced',
      'is_synced',
      'lastSyncedAt',
      'last_synced_at',
      'needsPush',
      'needs_push',
    ];

    return metadataFields.includes(field);
  }

  /**
   * Get timestamp from data
   */
  private getTimestamp(data: Record<string, unknown>): number {
    const timestamp =
      data.serverUpdatedAt || data.server_updated_at || data.updatedAt || data.updated_at;

    if (typeof timestamp === 'number') {
      return timestamp;
    }

    if (typeof timestamp === 'string') {
      return new Date(timestamp).getTime();
    }

    return 0;
  }

  /**
   * Deep equality check
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) {
      return true;
    }

    if (typeof a !== typeof b) {
      return false;
    }

    if (a === null || b === null) {
      return a === b;
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;

      const aKeys = Object.keys(aObj);
      const bKeys = Object.keys(bObj);

      if (aKeys.length !== bKeys.length) {
        return false;
      }

      return aKeys.every((key) => this.deepEqual(aObj[key], bObj[key]));
    }

    return false;
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts(): PendingConflict[] {
    return Array.from(this.pendingConflicts.values());
  }

  /**
   * Resolve pending conflict manually
   */
  resolvePendingConflict(conflictId: string, resolvedData: Record<string, unknown>): void {
    this.pendingConflicts.delete(conflictId);
    // The resolved data should be applied to the local database
    // This would be handled by the calling code
  }

  /**
   * Discard pending conflict (accept server version)
   */
  discardPendingConflict(conflictId: string): Record<string, unknown> | null {
    const conflict = this.pendingConflicts.get(conflictId);
    this.pendingConflicts.delete(conflictId);
    return conflict?.serverData || null;
  }

  /**
   * Clear all pending conflicts
   */
  clearPendingConflicts(): void {
    this.pendingConflicts.clear();
  }

  /**
   * Resolve conflict for WatermelonDB sync
   * Used as callback in synchronize()
   */
  resolveWatermelonConflict(
    table: string,
    local: Record<string, unknown>,
    remote: Record<string, unknown>
  ): Record<string, unknown> {
    const result = this.resolve(table, local, remote);

    if (result.merged) {
      return result.merged;
    }

    return result.useServer ? remote : local;
  }
}

// Export singleton instance
export const conflictResolver = ConflictResolver.getInstance();
export { ConflictResolver };
export default ConflictResolver;
