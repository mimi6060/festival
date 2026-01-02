/**
 * LRU (Least Recently Used) Cache Implementation
 *
 * Features:
 * - O(1) get, set, and delete operations
 * - Configurable max size
 * - TTL support per entry
 * - Eviction callbacks
 * - Statistics tracking
 */

export interface LRUCacheOptions {
  /** Maximum number of items in cache */
  maxSize: number;
  /** Default TTL in milliseconds (optional) */
  defaultTtl?: number;
  /** Callback when item is evicted */
  onEvict?: (key: string, value: any, reason: EvictionReason) => void;
  /** Enable access order tracking */
  updateOnGet?: boolean;
}

export enum EvictionReason {
  EXPIRED = 'expired',
  SIZE_LIMIT = 'size_limit',
  MANUAL = 'manual',
  REPLACED = 'replaced',
}

interface CacheEntry<T> {
  value: T;
  expiry: number | null;
  size: number;
  accessCount: number;
  lastAccessed: number;
  createdAt: number;
}

export interface LRUStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  avgAccessCount: number;
  oldestKey: string | null;
  newestKey: string | null;
}

/**
 * Generic LRU Cache with TTL support
 */
export class LRUCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly options: LRUCacheOptions;

  // Statistics
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options: LRUCacheOptions) {
    this.options = {
      updateOnGet: true,
      ...options,
    };
    this.cache = new Map();
  }

  /**
   * Get a value from cache
   * Moves the item to the end (most recently used)
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check expiry
    if (entry.expiry !== null && Date.now() > entry.expiry) {
      this.delete(key, EvictionReason.EXPIRED);
      this.misses++;
      return undefined;
    }

    this.hits++;
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Move to end (most recently used)
    if (this.options.updateOnGet) {
      this.cache.delete(key);
      this.cache.set(key, entry);
    }

    return entry.value;
  }

  /**
   * Set a value in cache
   * If at capacity, evicts the least recently used item
   */
  set(key: string, value: T, ttl?: number): void {
    const existingEntry = this.cache.get(key);

    // If key exists, notify eviction callback
    if (existingEntry && this.options.onEvict) {
      this.options.onEvict(key, existingEntry.value, EvictionReason.REPLACED);
    }

    // Remove existing to reset position
    this.cache.delete(key);

    // Evict if at capacity
    while (this.cache.size >= this.options.maxSize) {
      this.evictLRU();
    }

    const effectiveTtl = ttl ?? this.options.defaultTtl;
    const entry: CacheEntry<T> = {
      value,
      expiry: effectiveTtl ? Date.now() + effectiveTtl : null,
      size: this.estimateSize(value),
      accessCount: 1,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists (without updating access order)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiry
    if (entry.expiry !== null && Date.now() > entry.expiry) {
      this.delete(key, EvictionReason.EXPIRED);
      return false;
    }

    return true;
  }

  /**
   * Peek at a value without affecting LRU order
   */
  peek(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Check expiry
    if (entry.expiry !== null && Date.now() > entry.expiry) {
      this.delete(key, EvictionReason.EXPIRED);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Delete a key from cache
   */
  delete(key: string, reason: EvictionReason = EvictionReason.MANUAL): boolean {
    const entry = this.cache.get(key);

    if (!entry) return false;

    this.cache.delete(key);

    if (reason !== EvictionReason.REPLACED && this.options.onEvict) {
      this.options.onEvict(key, entry.value, reason);
    }

    if (reason === EvictionReason.SIZE_LIMIT || reason === EvictionReason.EXPIRED) {
      this.evictions++;
    }

    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    if (this.options.onEvict) {
      for (const [key, entry] of this.cache.entries()) {
        this.options.onEvict(key, entry.value, EvictionReason.MANUAL);
      }
    }
    this.cache.clear();
    this.resetStats();
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values
   */
  values(): T[] {
    const result: T[] = [];
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry === null || now <= entry.expiry) {
        result.push(entry.value);
      } else {
        this.delete(key, EvictionReason.EXPIRED);
      }
    }

    return result;
  }

  /**
   * Get entries with metadata
   */
  entries(): Array<{ key: string; value: T; metadata: Omit<CacheEntry<T>, 'value'> }> {
    const result: Array<{ key: string; value: T; metadata: Omit<CacheEntry<T>, 'value'> }> = [];
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry === null || now <= entry.expiry) {
        const { value, ...metadata } = entry;
        result.push({ key, value, metadata });
      } else {
        this.delete(key, EvictionReason.EXPIRED);
      }
    }

    return result;
  }

  /**
   * Get current size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): LRUStats {
    const total = this.hits + this.misses;
    let totalAccessCount = 0;
    let oldestKey: string | null = null;
    let newestKey: string | null = null;
    let oldestTime = Infinity;
    let newestTime = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalAccessCount += entry.accessCount;
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
      if (entry.createdAt > newestTime) {
        newestTime = entry.createdAt;
        newestKey = key;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      avgAccessCount: this.cache.size > 0 ? totalAccessCount / this.cache.size : 0,
      oldestKey,
      newestKey,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry !== null && now > entry.expiry) {
        this.delete(key, EvictionReason.EXPIRED);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Resize the cache (evicts if necessary)
   */
  resize(newMaxSize: number): void {
    this.options.maxSize = newMaxSize;

    while (this.cache.size > newMaxSize) {
      this.evictLRU();
    }
  }

  /**
   * Get remaining TTL for a key (in ms)
   */
  getTtl(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry || entry.expiry === null) return null;

    const remaining = entry.expiry - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Update TTL for existing key
   */
  touch(key: string, ttl?: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (ttl !== undefined) {
      entry.expiry = Date.now() + ttl;
    }
    entry.lastAccessed = Date.now();

    // Move to end
    this.cache.delete(key);
    this.cache.set(key, entry);

    return true;
  }

  // Private methods

  private evictLRU(): void {
    // First entry is the least recently used
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.delete(firstKey, EvictionReason.SIZE_LIMIT);
    }
  }

  private estimateSize(value: T): number {
    // Simple size estimation based on JSON stringification
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }
}

/**
 * LRU Cache with additional features for key patterns
 */
export class PatternLRUCache<T = any> extends LRUCache<T> {
  /**
   * Delete all keys matching a pattern (supports * wildcard)
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let deleted = 0;

    for (const key of this.keys()) {
      if (regex.test(key)) {
        if (this.delete(key)) {
          deleted++;
        }
      }
    }

    return deleted;
  }

  /**
   * Get all keys matching a pattern
   */
  keysMatching(pattern: string): string[] {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return this.keys().filter((key) => regex.test(key));
  }

  /**
   * Get all values for keys matching a pattern
   */
  getMatching(pattern: string): T[] {
    const keys = this.keysMatching(pattern);
    const values: T[] = [];

    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) {
        values.push(value);
      }
    }

    return values;
  }
}
