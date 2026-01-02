import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

/**
 * Cache Strategy Types
 */
export enum CacheStrategy {
  /** Standard TTL-based caching */
  TTL = 'ttl',
  /** Write-through: update cache on write */
  WRITE_THROUGH = 'write-through',
  /** Cache-aside with lazy loading */
  CACHE_ASIDE = 'cache-aside',
  /** Refresh-ahead: proactively refresh before expiry */
  REFRESH_AHEAD = 'refresh-ahead',
}

/**
 * Cache Tags for intelligent invalidation
 */
export enum CacheTag {
  FESTIVAL = 'festival',
  TICKET = 'ticket',
  USER = 'user',
  CASHLESS = 'cashless',
  VENDOR = 'vendor',
  ANALYTICS = 'analytics',
  CONFIG = 'config',
  SESSION = 'session',
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  ttl?: number;
  tags?: CacheTag[];
  strategy?: CacheStrategy;
  refreshThreshold?: number; // Percentage of TTL before refresh (for REFRESH_AHEAD)
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keys: number;
  memory: string;
  connected: boolean;
}

/**
 * Advanced Cache Service with Redis support
 *
 * Features:
 * - Redis integration with fallback to in-memory
 * - Multiple caching strategies
 * - Tag-based invalidation
 * - Cache statistics for monitoring
 * - Distributed locking for cache stampede prevention
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);

  // Redis client
  private redis: RedisClientType | null = null;
  private isRedisConnected = false;

  // Fallback in-memory cache
  private memoryCache = new Map<string, { value: any; expiry: number; tags?: CacheTag[] }>();

  // Tag-to-keys mapping for efficient invalidation
  private tagMap = new Map<CacheTag, Set<string>>();

  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
  };

  // Default configurations
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly REALTIME_TTL = 10; // 10 seconds for real-time data
  private readonly CONFIG_TTL = 86400; // 24 hours for configuration
  private readonly SESSION_TTL = 1800; // 30 minutes for sessions

  // Lock prefix for distributed locking
  private readonly LOCK_PREFIX = 'lock:';
  private readonly LOCK_TTL = 10000; // 10 seconds

  constructor(private readonly configService: ConfigService) {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn('REDIS_URL not configured, using in-memory cache');
      return;
    }

    try {
      this.redis = createClient({ url: redisUrl });

      this.redis.on('error', (err) => {
        this.logger.error(`Redis error: ${err.message}`);
        this.isRedisConnected = false;
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected');
        this.isRedisConnected = true;
      });

      this.redis.on('reconnecting', () => {
        this.logger.log('Redis reconnecting...');
      });

      await this.redis.connect();
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${(error as Error).message}`);
      this.redis = null;
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  // ==================== CORE CACHE OPERATIONS ====================

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isRedisConnected && this.redis) {
        const data = await this.redis.get(key);
        if (data) {
          this.stats.hits++;
          return JSON.parse(data) as T;
        }
        this.stats.misses++;
        return null;
      }

      // Fallback to memory cache
      return this.getFromMemory<T>(key);
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}: ${(error as Error).message}`);
      return this.getFromMemory<T>(key);
    }
  }

  /**
   * Set value in cache with options
   */
  async set(key: string, value: any, options?: CacheOptions | number): Promise<void> {
    const opts = typeof options === 'number' ? { ttl: options } : options || {};
    const ttl = opts.ttl || this.DEFAULT_TTL;

    try {
      const serialized = JSON.stringify(value);

      if (this.isRedisConnected && this.redis) {
        await this.redis.setEx(key, ttl, serialized);

        // Store tags in Redis
        if (opts.tags && opts.tags.length > 0) {
          for (const tag of opts.tags) {
            await this.redis.sAdd(`tag:${tag}`, key);
          }
        }
      } else {
        // Fallback to memory cache
        this.setInMemory(key, value, ttl, opts.tags);
      }
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}: ${(error as Error).message}`);
      this.setInMemory(key, value, ttl, opts.tags);
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.del(key);
      }
      this.memoryCache.delete(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}: ${(error as Error).message}`);
      this.memoryCache.delete(key);
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      }

      // Also delete from memory cache
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      this.logger.error(`Cache deletePattern error for pattern ${pattern}: ${(error as Error).message}`);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.flushDb();
      }
      this.memoryCache.clear();
      this.tagMap.clear();
    } catch (error) {
      this.logger.error(`Cache clear error: ${(error as Error).message}`);
      this.memoryCache.clear();
      this.tagMap.clear();
    }
  }

  // ==================== TAG-BASED INVALIDATION ====================

  /**
   * Invalidate all keys with a specific tag
   */
  async invalidateByTag(tag: CacheTag): Promise<number> {
    let count = 0;

    try {
      if (this.isRedisConnected && this.redis) {
        const keys = await this.redis.sMembers(`tag:${tag}`);
        if (keys.length > 0) {
          count = await this.redis.del(keys);
          await this.redis.del(`tag:${tag}`);
        }
      }

      // Also invalidate from memory cache
      const memoryKeys = this.tagMap.get(tag);
      if (memoryKeys) {
        for (const key of memoryKeys) {
          this.memoryCache.delete(key);
          count++;
        }
        this.tagMap.delete(tag);
      }

      this.logger.log(`Invalidated ${count} keys with tag: ${tag}`);
    } catch (error) {
      this.logger.error(`Cache invalidateByTag error for tag ${tag}: ${(error as Error).message}`);
    }

    return count;
  }

  /**
   * Invalidate cache for a specific festival
   */
  async invalidateFestivalCache(festivalId: string): Promise<void> {
    await this.deletePattern(`festival:${festivalId}:*`);
    await this.deletePattern(`analytics:*:${festivalId}:*`);
    await this.deletePattern(`tickets:festival:${festivalId}:*`);
    await this.deletePattern(`zones:festival:${festivalId}:*`);
    await this.deletePattern(`vendors:festival:${festivalId}:*`);
    this.logger.log(`Invalidated all cache for festival: ${festivalId}`);
  }

  // ==================== CACHING STRATEGIES ====================

  /**
   * Get or set with cache-aside pattern (lazy loading)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Acquire lock to prevent cache stampede
    const lockAcquired = await this.acquireLock(key);

    try {
      // Double-check after acquiring lock
      const recheck = await this.get<T>(key);
      if (recheck !== null) {
        return recheck;
      }

      // Execute factory and cache result
      const value = await factory();
      await this.set(key, value, options);
      return value;
    } finally {
      if (lockAcquired) {
        await this.releaseLock(key);
      }
    }
  }

  /**
   * Write-through caching: update cache immediately on write
   */
  async writeThrough<T>(
    key: string,
    value: T,
    persistFn: (value: T) => Promise<void>,
    options?: CacheOptions,
  ): Promise<void> {
    // Write to persistent storage first
    await persistFn(value);
    // Then update cache
    await this.set(key, value, options);
  }

  /**
   * Refresh-ahead pattern: proactively refresh before expiry
   */
  async getWithRefreshAhead<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions & { refreshThreshold?: number },
  ): Promise<T | null> {
    const ttl = options?.ttl || this.DEFAULT_TTL;
    const refreshThreshold = options?.refreshThreshold || 0.2; // 20% of TTL remaining

    try {
      if (this.isRedisConnected && this.redis) {
        const remainingTtl = await this.redis.ttl(key);
        const threshold = ttl * refreshThreshold;

        // If TTL is below threshold, trigger background refresh
        if (remainingTtl > 0 && remainingTtl < threshold) {
          this.backgroundRefresh(key, factory, options);
        }
      }
    } catch (error) {
      this.logger.debug(`Error checking TTL: ${(error as Error).message}`);
    }

    return this.getOrSet(key, factory, options);
  }

  /**
   * Background refresh without blocking
   */
  private async backgroundRefresh<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<void> {
    // Fire and forget
    setImmediate(async () => {
      try {
        const value = await factory();
        await this.set(key, value, options);
        this.logger.debug(`Background refreshed key: ${key}`);
      } catch (error) {
        this.logger.error(`Background refresh failed for key ${key}: ${(error as Error).message}`);
      }
    });
  }

  // ==================== SPECIALIZED CACHE METHODS ====================

  /**
   * Cache active festivals (long TTL, tagged)
   */
  async cacheActiveFestivals(festivals: any[]): Promise<void> {
    await this.set('festivals:active', festivals, {
      ttl: 300, // 5 minutes
      tags: [CacheTag.FESTIVAL],
    });
  }

  /**
   * Get cached active festivals
   */
  async getActiveFestivals<T>(): Promise<T | null> {
    return this.get<T>('festivals:active');
  }

  /**
   * Cache festival configuration
   */
  async cacheFestivalConfig(festivalId: string, config: any): Promise<void> {
    await this.set(`festival:${festivalId}:config`, config, {
      ttl: this.CONFIG_TTL,
      tags: [CacheTag.FESTIVAL, CacheTag.CONFIG],
    });
  }

  /**
   * Get festival configuration
   */
  async getFestivalConfig<T>(festivalId: string): Promise<T | null> {
    return this.get<T>(`festival:${festivalId}:config`);
  }

  /**
   * Cache user session data
   */
  async cacheSession(userId: string, sessionData: any): Promise<void> {
    await this.set(`session:${userId}`, sessionData, {
      ttl: this.SESSION_TTL,
      tags: [CacheTag.SESSION, CacheTag.USER],
    });
  }

  /**
   * Get user session
   */
  async getSession<T>(userId: string): Promise<T | null> {
    return this.get<T>(`session:${userId}`);
  }

  /**
   * Cache real-time analytics data (short TTL)
   */
  async cacheRealtimeData(festivalId: string, data: any): Promise<void> {
    await this.set(`realtime:${festivalId}`, data, {
      ttl: this.REALTIME_TTL,
      tags: [CacheTag.ANALYTICS, CacheTag.FESTIVAL],
    });
  }

  /**
   * Get real-time analytics
   */
  async getRealtimeData<T>(festivalId: string): Promise<T | null> {
    return this.get<T>(`realtime:${festivalId}`);
  }

  // ==================== DISTRIBUTED LOCKING ====================

  /**
   * Acquire a distributed lock
   */
  async acquireLock(key: string, ttl: number = this.LOCK_TTL): Promise<boolean> {
    const lockKey = `${this.LOCK_PREFIX}${key}`;

    try {
      if (this.isRedisConnected && this.redis) {
        const result = await this.redis.set(lockKey, '1', {
          NX: true,
          PX: ttl,
        });
        return result === 'OK';
      }
      return true; // In memory mode, always succeed
    } catch (error) {
      this.logger.error(`Lock acquire error: ${(error as Error).message}`);
      return true;
    }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = `${this.LOCK_PREFIX}${key}`;

    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.del(lockKey);
      }
    } catch (error) {
      this.logger.error(`Lock release error: ${(error as Error).message}`);
    }
  }

  // ==================== STATISTICS & MONITORING ====================

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    let keys = this.memoryCache.size;
    let memory = 'N/A';

    try {
      if (this.isRedisConnected && this.redis) {
        const dbSize = await this.redis.dbSize();
        keys = dbSize;

        const info = await this.redis.info('memory');
        const memoryMatch = info.match(/used_memory_human:(.+)/);
        if (memoryMatch) {
          memory = memoryMatch[1].trim();
        }
      }
    } catch (error) {
      this.logger.debug(`Error getting Redis stats: ${(error as Error).message}`);
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      keys,
      memory,
      connected: this.isRedisConnected,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private getFromMemory<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (item.expiry < Date.now()) {
      this.memoryCache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value as T;
  }

  private setInMemory(key: string, value: any, ttl: number, tags?: CacheTag[]): void {
    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + ttl * 1000,
      tags,
    });

    // Update tag map
    if (tags) {
      for (const tag of tags) {
        if (!this.tagMap.has(tag)) {
          this.tagMap.set(tag, new Set());
        }
        this.tagMap.get(tag)!.add(key);
      }
    }

    // Cleanup old entries periodically
    if (this.memoryCache.size > 10000) {
      this.cleanupMemoryCache();
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expiry < now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
  }
}
