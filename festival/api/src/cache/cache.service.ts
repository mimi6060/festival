import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CACHE_TTL } from './cache.constants';

// Type for the cache manager
interface CacheManagerType {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  stores?: Array<{
    client?: RedisClientType;
    getClient?: () => RedisClientType;
  }>;
}

interface RedisClientType {
  keys: (pattern: string) => Promise<string[]>;
  del: (...keys: string[]) => Promise<number>;
}

/**
 * Cache Service
 *
 * Provides a high-level abstraction over the cache manager with
 * additional features like pattern-based deletion and cache-aside pattern.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: CacheManagerType) {}

  /**
   * Get a value from the cache
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined && value !== null) {
        this.logger.debug(`Cache HIT: ${key}`);
      } else {
        this.logger.debug(`Cache MISS: ${key}`);
      }
      return value ?? undefined;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set a value in the cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (optional, defaults to DEFAULT)
   */
  async set<T>(key: string, value: T, ttl: number = CACHE_TTL.DEFAULT): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl * 1000); // cache-manager uses milliseconds
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  /**
   * Delete a value from the cache
   *
   * @param key - Cache key to delete
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  /**
   * Delete all keys matching a pattern
   *
   * Uses Redis SCAN to find and delete matching keys efficiently.
   *
   * @param pattern - Redis glob pattern (e.g., "festival:*")
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // Access the underlying Redis client through stores
      const stores = this.cacheManager.stores;

      if (stores && stores.length > 0) {
        const store = stores[0];
        const client = store.client || store.getClient?.();

        if (client && typeof client.keys === 'function') {
          const keys = await client.keys(pattern);

          if (keys.length > 0) {
            await client.del(...keys);
            this.logger.debug(`Cache DEL pattern "${pattern}": ${keys.length} keys deleted`);
          } else {
            this.logger.debug(`Cache DEL pattern "${pattern}": no matching keys`);
          }
          return;
        }
      }

      // Fallback: log warning if pattern deletion is not supported
      this.logger.warn(`Pattern deletion not supported by cache store, skipping: ${pattern}`);
    } catch (error) {
      this.logger.error(`Cache DEL pattern error for "${pattern}":`, error);
    }
  }

  /**
   * Delete multiple keys
   *
   * @param keys - Array of cache keys to delete
   */
  async delMany(keys: string[]): Promise<void> {
    try {
      await Promise.all(keys.map((key) => this.del(key)));
      this.logger.debug(`Cache DEL many: ${keys.length} keys`);
    } catch (error) {
      this.logger.error(`Cache DEL many error:`, error);
    }
  }

  /**
   * Cache-aside pattern (wrap)
   *
   * Gets value from cache if available, otherwise executes the function
   * and caches the result.
   *
   * @param key - Cache key
   * @param fn - Function to execute if cache miss
   * @param ttl - Time to live in seconds (optional)
   * @returns Cached or computed value
   *
   * @example
   * const festivals = await cacheService.wrap(
   *   'festival:list',
   *   () => festivalService.findAllFromDb(),
   *   CACHE_TTL.FESTIVAL_LIST
   * );
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = CACHE_TTL.DEFAULT,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Execute the function
    const result = await fn();

    // Cache the result (don't cache null/undefined)
    if (result !== undefined && result !== null) {
      await this.set(key, result, ttl);
    }

    return result;
  }

  /**
   * Check if a key exists in cache
   *
   * @param key - Cache key to check
   * @returns true if key exists
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * Reset (clear) the entire cache
   *
   * Use with caution in production!
   */
  async reset(): Promise<void> {
    try {
      // Use pattern deletion to clear all keys
      await this.delPattern('*');
      this.logger.warn('Cache RESET: all keys cleared');
    } catch (error) {
      this.logger.error('Cache RESET error:', error);
    }
  }

  /**
   * Get or set with conditional TTL
   *
   * Useful when TTL depends on the result (e.g., shorter TTL for error states)
   *
   * @param key - Cache key
   * @param fn - Function that returns { value, ttl }
   */
  async wrapWithDynamicTtl<T>(
    key: string,
    fn: () => Promise<{ value: T; ttl: number }>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const { value, ttl } = await fn();

    if (value !== undefined && value !== null) {
      await this.set(key, value, ttl);
    }

    return value;
  }

  /**
   * Increment a numeric value in cache
   *
   * Useful for counters and rate limiting
   *
   * @param key - Cache key
   * @param delta - Amount to increment (default: 1)
   * @param ttl - TTL for new keys
   * @returns New value after increment
   */
  async increment(key: string, delta: number = 1, ttl?: number): Promise<number> {
    try {
      const current = await this.get<number>(key);
      const newValue = (current ?? 0) + delta;
      await this.set(key, newValue, ttl ?? CACHE_TTL.DEFAULT);
      return newValue;
    } catch (error) {
      this.logger.error(`Cache INCREMENT error for key ${key}:`, error);
      return delta;
    }
  }
}
