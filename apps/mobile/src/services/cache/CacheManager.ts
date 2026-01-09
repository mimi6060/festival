/**
 * CacheManager - LRU Cache with TTL support
 * Provides intelligent caching for festival data with priority-based eviction
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState, AppStateStatus } from 'react-native';

// Cache entry with metadata
export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  accessCount: number;
  size: number;
  priority: CachePriority;
  tags: string[];
}

// Priority levels for eviction decisions
export enum CachePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

// Cache configuration
export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of entries
  defaultTTL: number; // Default TTL in milliseconds
  persistToStorage: boolean; // Whether to persist to AsyncStorage
  storageKeyPrefix: string; // Prefix for AsyncStorage keys
  memoryPressureThreshold: number; // Memory usage % to trigger eviction
  enableStatistics: boolean; // Track cache statistics
}

// Cache statistics
export interface CacheStatistics {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
  hitRate: number;
  averageAccessTime: number;
  lastEvictionAt: number | null;
  byPriority: Record<CachePriority, number>;
  byTag: Record<string, number>;
}

// Cache event for subscriptions
export type CacheEvent =
  | { type: 'set'; key: string; size: number }
  | { type: 'get'; key: string; hit: boolean }
  | { type: 'delete'; key: string }
  | { type: 'evict'; keys: string[]; reason: EvictionReason }
  | { type: 'clear' }
  | { type: 'restore'; entryCount: number };

export type EvictionReason = 'size' | 'memory_pressure' | 'ttl_expired' | 'manual';

type CacheEventListener = (event: CacheEvent) => void;

// Default configuration
const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  persistToStorage: true,
  storageKeyPrefix: '@festival_cache_',
  memoryPressureThreshold: 0.8, // 80%
  enableStatistics: true,
};

/**
 * LRU Cache Manager with TTL and priority-based eviction
 */
export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private currentSize: number = 0;
  private listeners: Set<CacheEventListener> = new Set();
  private statistics: CacheStatistics;
  private accessTimes: number[] = [];
  private appStateSubscription: { remove: () => void } | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private initialized: boolean = false;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.statistics = this.createInitialStatistics();
    this.setupAppStateListener();
    this.startCleanupInterval();
  }

  /**
   * Initialize cache from persistent storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.persistToStorage) {
      await this.restoreFromStorage();
    }

    this.initialized = true;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    const entry = this.cache.get(key);

    // Track access time
    if (this.config.enableStatistics) {
      const accessTime = Date.now() - startTime;
      this.accessTimes.push(accessTime);
      if (this.accessTimes.length > 100) {
        this.accessTimes.shift();
      }
    }

    // Cache miss
    if (!entry) {
      this.recordMiss();
      this.emit({ type: 'get', key, hit: false });
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      await this.delete(key);
      this.recordMiss();
      this.emit({ type: 'get', key, hit: false });
      return null;
    }

    // Update access metadata
    entry.lastAccessedAt = Date.now();
    entry.accessCount += 1;

    this.recordHit();
    this.emit({ type: 'get', key, hit: true });

    return entry.data as T;
  }

  /**
   * Set a value in cache
   */
  async set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      priority?: CachePriority;
      tags?: string[];
    } = {}
  ): Promise<void> {
    const {
      ttl = this.config.defaultTTL,
      priority = CachePriority.NORMAL,
      tags = [],
    } = options;

    const size = this.calculateSize(data);
    const now = Date.now();

    // Check if we need to evict entries
    await this.ensureCapacity(size);

    // Remove existing entry if present
    if (this.cache.has(key)) {
      await this.delete(key);
    }

    const entry: CacheEntry<T> = {
      key,
      data,
      createdAt: now,
      expiresAt: now + ttl,
      lastAccessedAt: now,
      accessCount: 0,
      size,
      priority,
      tags,
    };

    this.cache.set(key, entry);
    this.currentSize += size;

    // Update statistics
    if (this.config.enableStatistics) {
      this.statistics.entryCount = this.cache.size;
      this.statistics.totalSize = this.currentSize;
      this.statistics.byPriority[priority] =
        (this.statistics.byPriority[priority] || 0) + 1;
      tags.forEach(tag => {
        this.statistics.byTag[tag] = (this.statistics.byTag[tag] || 0) + 1;
      });
    }

    this.emit({ type: 'set', key, size });

    // Persist to storage if enabled
    if (this.config.persistToStorage) {
      await this.persistEntry(entry);
    }
  }

  /**
   * Delete an entry from cache
   */
  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.currentSize -= entry.size;

    // Update statistics
    if (this.config.enableStatistics) {
      this.statistics.entryCount = this.cache.size;
      this.statistics.totalSize = this.currentSize;
      this.statistics.byPriority[entry.priority] =
        Math.max(0, (this.statistics.byPriority[entry.priority] || 0) - 1);
      entry.tags.forEach(tag => {
        this.statistics.byTag[tag] = Math.max(0, (this.statistics.byTag[tag] || 0) - 1);
      });
    }

    this.emit({ type: 'delete', key });

    // Remove from storage
    if (this.config.persistToStorage) {
      await this.removeFromStorage(key);
    }

    return true;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return !this.isExpired(entry);
  }

  /**
   * Get multiple values
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * Set multiple values
   */
  async setMany<T>(
    entries: Array<{ key: string; data: T; ttl?: number; priority?: CachePriority; tags?: string[] }>
  ): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.data, {
        ttl: entry.ttl,
        priority: entry.priority,
        tags: entry.tags,
      });
    }
  }

  /**
   * Delete entries by tag
   */
  async deleteByTag(tag: string): Promise<number> {
    const keysToDelete: string[] = [];

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
    }

    return keysToDelete.length;
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.currentSize = 0;
    this.statistics = this.createInitialStatistics();

    if (this.config.persistToStorage) {
      await this.clearStorage();
    }

    this.emit({ type: 'clear' });
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get entries by tag
   */
  getByTag<T>(tag: string): Map<string, T> {
    const results = new Map<string, T>();

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.tags.includes(tag) && !this.isExpired(entry)) {
        results.set(key, entry.data as T);
      }
    }

    return results;
  }

  /**
   * Update TTL for an entry
   */
  updateTTL(key: string, ttl: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.expiresAt = Date.now() + ttl;
    return true;
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    return {
      ...this.statistics,
      hitRate: this.calculateHitRate(),
      averageAccessTime: this.calculateAverageAccessTime(),
    };
  }

  /**
   * Get entry metadata (without data)
   */
  getMetadata(key: string): Omit<CacheEntry, 'data'> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const { data: _, ...metadata } = entry;
    return metadata;
  }

  /**
   * Subscribe to cache events
   */
  subscribe(listener: CacheEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Manually trigger eviction
   */
  async evict(reason: EvictionReason = 'manual'): Promise<string[]> {
    const evictedKeys = await this.performEviction(this.config.maxSize * 0.2, reason);
    return evictedKeys;
  }

  /**
   * Handle memory pressure
   */
  async handleMemoryPressure(): Promise<void> {
    const targetSize = this.config.maxSize * (1 - this.config.memoryPressureThreshold);
    await this.performEviction(targetSize, 'memory_pressure');
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.listeners.clear();
  }

  // Private methods

  private createInitialStatistics(): CacheStatistics {
    return {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      entryCount: 0,
      hitRate: 0,
      averageAccessTime: 0,
      lastEvictionAt: null,
      byPriority: {
        [CachePriority.LOW]: 0,
        [CachePriority.NORMAL]: 0,
        [CachePriority.HIGH]: 0,
        [CachePriority.CRITICAL]: 0,
      },
      byTag: {},
    };
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  private calculateSize(data: unknown): number {
    try {
      const json = JSON.stringify(data);
      return new Blob([json]).size;
    } catch {
      // Fallback for non-serializable data
      return 1024; // Assume 1KB
    }
  }

  private async ensureCapacity(requiredSize: number): Promise<void> {
    // Check entry count
    while (this.cache.size >= this.config.maxEntries) {
      await this.evictOne();
    }

    // Check size
    while (this.currentSize + requiredSize > this.config.maxSize) {
      const evicted = await this.evictOne();
      if (!evicted) break; // No more entries to evict
    }
  }

  private async evictOne(): Promise<boolean> {
    // First, try to evict expired entries
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (this.isExpired(entry)) {
        await this.delete(key);
        this.statistics.evictions++;
        this.statistics.lastEvictionAt = Date.now();
        this.emit({ type: 'evict', keys: [key], reason: 'ttl_expired' });
        return true;
      }
    }

    // Then, evict using LRU + priority scoring
    const candidate = this.findEvictionCandidate();
    if (candidate) {
      await this.delete(candidate);
      this.statistics.evictions++;
      this.statistics.lastEvictionAt = Date.now();
      this.emit({ type: 'evict', keys: [candidate], reason: 'size' });
      return true;
    }

    return false;
  }

  private findEvictionCandidate(): string | null {
    let candidate: string | null = null;
    let lowestScore = Infinity;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      // Calculate eviction score (lower = more likely to evict)
      const score = this.calculateEvictionScore(entry);
      if (score < lowestScore) {
        lowestScore = score;
        candidate = key;
      }
    }

    return candidate;
  }

  private calculateEvictionScore(entry: CacheEntry): number {
    const now = Date.now();

    // Factors affecting score (higher = less likely to evict)
    const priorityWeight = entry.priority * 1000;
    const recencyWeight = (now - entry.lastAccessedAt) / 1000; // Convert to seconds
    const frequencyWeight = entry.accessCount * 10;
    const sizeWeight = entry.size / 1024; // Convert to KB
    const ttlWeight = (entry.expiresAt - now) / 1000; // Remaining TTL in seconds

    // Combined score: priority and frequency increase score, recency and size decrease it
    return (
      priorityWeight +
      frequencyWeight +
      ttlWeight -
      recencyWeight -
      sizeWeight
    );
  }

  private async performEviction(targetReduction: number, reason: EvictionReason): Promise<string[]> {
    const evictedKeys: string[] = [];
    let reducedSize = 0;

    // Get entries sorted by eviction score (lowest first)
    const sortedEntries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry, score: this.calculateEvictionScore(entry) }))
      .sort((a, b) => a.score - b.score);

    for (const { key, entry } of sortedEntries) {
      if (reducedSize >= targetReduction) break;

      // Don't evict critical entries unless absolutely necessary
      if (entry.priority === CachePriority.CRITICAL && reducedSize > 0) continue;

      await this.delete(key);
      evictedKeys.push(key);
      reducedSize += entry.size;
    }

    if (evictedKeys.length > 0) {
      this.statistics.evictions += evictedKeys.length;
      this.statistics.lastEvictionAt = Date.now();
      this.emit({ type: 'evict', keys: evictedKeys, reason });
    }

    return evictedKeys;
  }

  private recordHit(): void {
    if (this.config.enableStatistics) {
      this.statistics.hits++;
    }
  }

  private recordMiss(): void {
    if (this.config.enableStatistics) {
      this.statistics.misses++;
    }
  }

  private calculateHitRate(): number {
    const total = this.statistics.hits + this.statistics.misses;
    return total > 0 ? this.statistics.hits / total : 0;
  }

  private calculateAverageAccessTime(): number {
    if (this.accessTimes.length === 0) return 0;
    return this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length;
  }

  private emit(event: CacheEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[CacheManager] Event listener error:', error);
      }
    });
  }

  private setupAppStateListener(): void {
    if (Platform.OS === 'web') return;

    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  private async handleAppStateChange(state: AppStateStatus): Promise<void> {
    if (state === 'background' && this.config.persistToStorage) {
      // Persist cache when app goes to background
      await this.persistAll();
    }
  }

  private startCleanupInterval(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60 * 1000);
  }

  private async cleanupExpired(): Promise<void> {
    const expiredKeys: string[] = [];

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.delete(key);
    }

    if (expiredKeys.length > 0) {
      this.statistics.evictions += expiredKeys.length;
      this.emit({ type: 'evict', keys: expiredKeys, reason: 'ttl_expired' });
    }
  }

  // Storage methods

  private async persistEntry(entry: CacheEntry): Promise<void> {
    try {
      const key = this.config.storageKeyPrefix + entry.key;
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error('[CacheManager] Failed to persist entry:', error);
    }
  }

  private async persistAll(): Promise<void> {
    try {
      const entries = Array.from(this.cache.entries())
        .filter(([_, entry]) => !this.isExpired(entry))
        .map(([key, entry]) => [this.config.storageKeyPrefix + key, JSON.stringify(entry)]);

      await AsyncStorage.multiSet(entries as [string, string][]);
    } catch (error) {
      console.error('[CacheManager] Failed to persist cache:', error);
    }
  }

  private async removeFromStorage(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.config.storageKeyPrefix + key);
    } catch (error) {
      console.error('[CacheManager] Failed to remove from storage:', error);
    }
  }

  private async clearStorage(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.config.storageKeyPrefix));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('[CacheManager] Failed to clear storage:', error);
    }
  }

  private async restoreFromStorage(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.config.storageKeyPrefix));

      if (cacheKeys.length === 0) return;

      const entries = await AsyncStorage.multiGet(cacheKeys);
      let restoredCount = 0;

      for (const [key, value] of entries) {
        if (!value) continue;

        try {
          const entry: CacheEntry = JSON.parse(value);

          // Skip expired entries
          if (this.isExpired(entry)) {
            await AsyncStorage.removeItem(key);
            continue;
          }

          this.cache.set(entry.key, entry);
          this.currentSize += entry.size;
          restoredCount++;
        } catch {
          // Invalid entry, remove it
          await AsyncStorage.removeItem(key);
        }
      }

      // Update statistics
      this.statistics.entryCount = this.cache.size;
      this.statistics.totalSize = this.currentSize;

      this.emit({ type: 'restore', entryCount: restoredCount });
    } catch (error) {
      console.error('[CacheManager] Failed to restore from storage:', error);
    }
  }
}

// Singleton instance for global cache
let globalCacheInstance: CacheManager | null = null;

export function getCacheManager(config?: Partial<CacheConfig>): CacheManager {
  if (!globalCacheInstance) {
    globalCacheInstance = new CacheManager(config);
  }
  return globalCacheInstance;
}

export function resetCacheManager(): void {
  if (globalCacheInstance) {
    globalCacheInstance.destroy();
    globalCacheInstance = null;
  }
}

export default CacheManager;
