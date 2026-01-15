/**
 * ConflictResolver.ts
 * Handles conflict resolution between local and server data
 * Supports multiple strategies: last-write-wins, merge, manual, server-wins, client-wins
 */

import { Logger } from '../../utils/Logger';

export type ConflictStrategy =
  | 'last-write-wins'
  | 'server-wins'
  | 'client-wins'
  | 'merge'
  | 'manual';

export interface CachedItem<T> {
  data: T;
  timestamp: number;
  version: number;
  expiresAt: number | null;
  checksum?: string;
}

export interface ConflictResult<T> {
  resolved: boolean;
  data: T;
  strategy: ConflictStrategy;
  requiresManualResolution: boolean;
  conflicts?: ConflictField[];
}

export interface ConflictField {
  path: string;
  localValue: unknown;
  serverValue: unknown;
  resolution?: 'local' | 'server' | 'merged';
}

export interface MergeRule {
  path: string;
  strategy: 'local' | 'server' | 'newer' | 'concat' | 'sum' | 'custom';
  customResolver?: (local: unknown, server: unknown) => unknown;
}

export interface PendingConflict<T> {
  id: string;
  localData: CachedItem<T>;
  serverData: T;
  serverTimestamp: number;
  conflicts: ConflictField[];
  createdAt: number;
}

class ConflictResolver {
  private strategy: ConflictStrategy;
  private mergeRules: MergeRule[] = [];
  private pendingConflicts = new Map<string, PendingConflict<unknown>>();
  private conflictListeners = new Set<(conflict: PendingConflict<unknown>) => void>();

  constructor(strategy: ConflictStrategy = 'last-write-wins') {
    this.strategy = strategy;
    this.initializeDefaultMergeRules();
  }

  /**
   * Initialize default merge rules for common data types
   */
  private initializeDefaultMergeRules(): void {
    this.mergeRules = [
      // User preferences: always use server
      { path: 'user.email', strategy: 'server' },
      { path: 'user.role', strategy: 'server' },
      // Wallet balance: always use server (source of truth)
      { path: 'wallet.balance', strategy: 'server' },
      // Favorites: merge both lists
      { path: 'favorites', strategy: 'concat' },
      // Notifications: use server
      { path: 'notifications', strategy: 'server' },
      // Local preferences: keep local
      { path: 'settings.theme', strategy: 'local' },
      { path: 'settings.language', strategy: 'local' },
      { path: 'settings.notifications', strategy: 'local' },
    ];
  }

  /**
   * Set the conflict resolution strategy
   */
  public setStrategy(strategy: ConflictStrategy): void {
    this.strategy = strategy;
    Logger.info(`[ConflictResolver] Strategy set to: ${strategy}`);
  }

  /**
   * Get current strategy
   */
  public getStrategy(): ConflictStrategy {
    return this.strategy;
  }

  /**
   * Add a custom merge rule
   */
  public addMergeRule(rule: MergeRule): void {
    // Remove existing rule for same path
    this.mergeRules = this.mergeRules.filter((r) => r.path !== rule.path);
    this.mergeRules.push(rule);
    Logger.debug(`[ConflictResolver] Added merge rule for path: ${rule.path}`);
  }

  /**
   * Remove a merge rule
   */
  public removeMergeRule(path: string): void {
    this.mergeRules = this.mergeRules.filter((r) => r.path !== path);
  }

  /**
   * Main resolve function
   */
  public async resolve<T>(
    localData: CachedItem<T>,
    serverData: T,
    serverTimestamp: number
  ): Promise<T> {
    const result = await this.resolveWithDetails(localData, serverData, serverTimestamp);
    return result.data;
  }

  /**
   * Resolve with full conflict details
   */
  public async resolveWithDetails<T>(
    localData: CachedItem<T>,
    serverData: T,
    serverTimestamp: number
  ): Promise<ConflictResult<T>> {
    Logger.debug(`[ConflictResolver] Resolving conflict with strategy: ${this.strategy}`);

    // Check if there's actually a conflict
    if (this.areEqual(localData.data, serverData)) {
      return {
        resolved: true,
        data: serverData,
        strategy: this.strategy,
        requiresManualResolution: false,
      };
    }

    switch (this.strategy) {
      case 'server-wins':
        return this.resolveServerWins(localData, serverData, serverTimestamp);

      case 'client-wins':
        return this.resolveClientWins(localData, serverData, serverTimestamp);

      case 'last-write-wins':
        return this.resolveLastWriteWins(localData, serverData, serverTimestamp);

      case 'merge':
        return this.resolveMerge(localData, serverData, serverTimestamp);

      case 'manual':
        return this.resolveManual(localData, serverData, serverTimestamp);

      default:
        return this.resolveLastWriteWins(localData, serverData, serverTimestamp);
    }
  }

  /**
   * Server always wins strategy
   */
  private resolveServerWins<T>(
    localData: CachedItem<T>,
    serverData: T,
    _serverTimestamp: number
  ): ConflictResult<T> {
    Logger.debug('[ConflictResolver] Using server-wins strategy');
    return {
      resolved: true,
      data: serverData,
      strategy: 'server-wins',
      requiresManualResolution: false,
    };
  }

  /**
   * Client always wins strategy
   */
  private resolveClientWins<T>(
    localData: CachedItem<T>,
    _serverData: T,
    _serverTimestamp: number
  ): ConflictResult<T> {
    Logger.debug('[ConflictResolver] Using client-wins strategy');
    return {
      resolved: true,
      data: localData.data,
      strategy: 'client-wins',
      requiresManualResolution: false,
    };
  }

  /**
   * Last write wins strategy (based on timestamp)
   */
  private resolveLastWriteWins<T>(
    localData: CachedItem<T>,
    serverData: T,
    serverTimestamp: number
  ): ConflictResult<T> {
    Logger.debug('[ConflictResolver] Using last-write-wins strategy');

    const localIsNewer = localData.timestamp > serverTimestamp;

    return {
      resolved: true,
      data: localIsNewer ? localData.data : serverData,
      strategy: 'last-write-wins',
      requiresManualResolution: false,
    };
  }

  /**
   * Merge strategy - attempts to merge non-conflicting fields
   */
  private resolveMerge<T>(
    localData: CachedItem<T>,
    serverData: T,
    serverTimestamp: number
  ): ConflictResult<T> {
    Logger.debug('[ConflictResolver] Using merge strategy');

    const conflicts: ConflictField[] = [];
    const merged = this.deepMerge(
      localData.data as Record<string, unknown>,
      serverData as Record<string, unknown>,
      localData.timestamp,
      serverTimestamp,
      '',
      conflicts
    ) as T;

    const hasUnresolvedConflicts = conflicts.some((c) => !c.resolution);

    return {
      resolved: !hasUnresolvedConflicts,
      data: merged,
      strategy: 'merge',
      requiresManualResolution: hasUnresolvedConflicts,
      conflicts,
    };
  }

  /**
   * Manual resolution strategy - stores conflict for user resolution
   */
  private resolveManual<T>(
    localData: CachedItem<T>,
    serverData: T,
    serverTimestamp: number
  ): ConflictResult<T> {
    Logger.debug('[ConflictResolver] Using manual strategy');

    const conflicts = this.findConflicts(
      localData.data as Record<string, unknown>,
      serverData as Record<string, unknown>,
      ''
    );

    const conflictId = `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const pendingConflict: PendingConflict<T> = {
      id: conflictId,
      localData,
      serverData,
      serverTimestamp,
      conflicts,
      createdAt: Date.now(),
    };

    this.pendingConflicts.set(conflictId, pendingConflict as PendingConflict<unknown>);
    this.notifyConflictListeners(pendingConflict as PendingConflict<unknown>);

    // For now, return server data as temporary resolution
    return {
      resolved: false,
      data: serverData,
      strategy: 'manual',
      requiresManualResolution: true,
      conflicts,
    };
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(
    local: Record<string, unknown>,
    server: Record<string, unknown>,
    localTimestamp: number,
    serverTimestamp: number,
    path: string,
    conflicts: ConflictField[]
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const localValue = local[key];
      const serverValue = server[key];

      // Check for merge rule
      const rule = this.mergeRules.find((r) => this.matchPath(currentPath, r.path));

      if (rule) {
        result[key] = this.applyMergeRule(rule, localValue, serverValue);
        conflicts.push({
          path: currentPath,
          localValue,
          serverValue,
          resolution: rule.strategy === 'local' ? 'local' : 'server',
        });
        continue;
      }

      // Both have the value
      if (localValue !== undefined && serverValue !== undefined) {
        if (this.areEqual(localValue, serverValue)) {
          result[key] = serverValue;
        } else if (this.isObject(localValue) && this.isObject(serverValue)) {
          result[key] = this.deepMerge(
            localValue as Record<string, unknown>,
            serverValue as Record<string, unknown>,
            localTimestamp,
            serverTimestamp,
            currentPath,
            conflicts
          );
        } else if (Array.isArray(localValue) && Array.isArray(serverValue)) {
          // For arrays, use server by default unless it's a favorites-type array
          result[key] = this.mergeArrays(localValue, serverValue);
          conflicts.push({
            path: currentPath,
            localValue,
            serverValue,
            resolution: 'merged',
          });
        } else {
          // Scalar conflict - use timestamp to decide
          if (localTimestamp > serverTimestamp) {
            result[key] = localValue;
            conflicts.push({
              path: currentPath,
              localValue,
              serverValue,
              resolution: 'local',
            });
          } else {
            result[key] = serverValue;
            conflicts.push({
              path: currentPath,
              localValue,
              serverValue,
              resolution: 'server',
            });
          }
        }
      } else if (localValue !== undefined) {
        result[key] = localValue;
      } else {
        result[key] = serverValue;
      }
    }

    return result;
  }

  /**
   * Apply a merge rule to values
   */
  private applyMergeRule(
    rule: MergeRule,
    localValue: unknown,
    serverValue: unknown
  ): unknown {
    switch (rule.strategy) {
      case 'local':
        return localValue;
      case 'server':
        return serverValue;
      case 'newer':
        // This should use timestamps but we don't have them here
        return serverValue;
      case 'concat':
        if (Array.isArray(localValue) && Array.isArray(serverValue)) {
          return this.mergeArrays(localValue, serverValue);
        }
        return serverValue;
      case 'sum':
        if (typeof localValue === 'number' && typeof serverValue === 'number') {
          return localValue + serverValue;
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
   * Merge two arrays, removing duplicates
   */
  private mergeArrays(local: unknown[], server: unknown[]): unknown[] {
    const seen = new Set<string>();
    const result: unknown[] = [];

    const addUnique = (item: unknown) => {
      const key = JSON.stringify(item);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    };

    // Add all server items first (higher priority)
    server.forEach(addUnique);
    // Then add local items that aren't duplicates
    local.forEach(addUnique);

    return result;
  }

  /**
   * Find all conflicts between two objects
   */
  private findConflicts(
    local: Record<string, unknown>,
    server: Record<string, unknown>,
    path: string
  ): ConflictField[] {
    const conflicts: ConflictField[] = [];
    const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const localValue = local[key];
      const serverValue = server[key];

      if (localValue === undefined || serverValue === undefined) {
        continue;
      }

      if (!this.areEqual(localValue, serverValue)) {
        if (this.isObject(localValue) && this.isObject(serverValue)) {
          conflicts.push(
            ...this.findConflicts(
              localValue as Record<string, unknown>,
              serverValue as Record<string, unknown>,
              currentPath
            )
          );
        } else {
          conflicts.push({
            path: currentPath,
            localValue,
            serverValue,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if a path matches a rule path (supports wildcards)
   */
  private matchPath(path: string, rulePath: string): boolean {
    if (rulePath.includes('*')) {
      const regex = new RegExp('^' + rulePath.replace(/\*/g, '.*') + '$');
      return regex.test(path);
    }
    return path === rulePath;
  }

  /**
   * Check if two values are equal
   */
  private areEqual(a: unknown, b: unknown): boolean {
    if (a === b) {return true;}
    if (typeof a !== typeof b) {return false;}
    if (a === null || b === null) {return a === b;}
    if (typeof a !== 'object') {return a === b;}
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /**
   * Check if value is a plain object
   */
  private isObject(value: unknown): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Add a conflict listener
   */
  public addConflictListener(
    listener: (conflict: PendingConflict<unknown>) => void
  ): () => void {
    this.conflictListeners.add(listener);
    return () => this.conflictListeners.delete(listener);
  }

  /**
   * Notify all conflict listeners
   */
  private notifyConflictListeners(conflict: PendingConflict<unknown>): void {
    this.conflictListeners.forEach((listener) => {
      try {
        listener(conflict);
      } catch (error) {
        Logger.error('[ConflictResolver] Listener error:', error);
      }
    });
  }

  /**
   * Get pending conflicts
   */
  public getPendingConflicts(): PendingConflict<unknown>[] {
    return Array.from(this.pendingConflicts.values());
  }

  /**
   * Get a specific pending conflict
   */
  public getPendingConflict(id: string): PendingConflict<unknown> | undefined {
    return this.pendingConflicts.get(id);
  }

  /**
   * Resolve a pending conflict manually
   */
  public resolveManualConflict<T>(
    conflictId: string,
    resolutions: Record<string, 'local' | 'server'>
  ): T | null {
    const conflict = this.pendingConflicts.get(conflictId) as PendingConflict<T> | undefined;
    if (!conflict) {
      Logger.warn(`[ConflictResolver] Conflict not found: ${conflictId}`);
      return null;
    }

    const result = this.applyManualResolutions(
      conflict.localData.data as Record<string, unknown>,
      conflict.serverData as Record<string, unknown>,
      resolutions
    ) as T;

    this.pendingConflicts.delete(conflictId);
    Logger.info(`[ConflictResolver] Resolved manual conflict: ${conflictId}`);

    return result;
  }

  /**
   * Apply manual resolutions to merge data
   */
  private applyManualResolutions(
    local: Record<string, unknown>,
    server: Record<string, unknown>,
    resolutions: Record<string, 'local' | 'server'>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...server };

    for (const [path, choice] of Object.entries(resolutions)) {
      const value = choice === 'local'
        ? this.getValueByPath(local, path)
        : this.getValueByPath(server, path);
      this.setValueByPath(result, path, value);
    }

    return result;
  }

  /**
   * Get value by dot-notation path
   */
  private getValueByPath(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Set value by dot-notation path
   */
  private setValueByPath(
    obj: Record<string, unknown>,
    path: string,
    value: unknown
  ): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object') {
        if (!(key in (current as Record<string, unknown>))) {
          (current as Record<string, unknown>)[key] = {};
        }
        return (current as Record<string, unknown>)[key];
      }
      return current;
    }, obj) as Record<string, unknown>;

    if (target && typeof target === 'object') {
      target[lastKey] = value;
    }
  }

  /**
   * Clear all pending conflicts
   */
  public clearPendingConflicts(): void {
    this.pendingConflicts.clear();
    Logger.info('[ConflictResolver] Cleared all pending conflicts');
  }

  /**
   * Get conflict count
   */
  public getPendingConflictCount(): number {
    return this.pendingConflicts.size;
  }
}

export { ConflictResolver };
export default ConflictResolver;
