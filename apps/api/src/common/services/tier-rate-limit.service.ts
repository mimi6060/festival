/**
 * Tier-Based Rate Limiting Service
 *
 * Provides comprehensive rate limiting by client tier with:
 * - Multi-window rate limiting (minute, hour, day)
 * - Redis-based distributed rate limiting
 * - Sliding window algorithm for accurate rate limiting
 * - Tier-specific quotas and limits
 * - Rate limit metrics and analytics
 *
 * @module TierRateLimitService
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientTier,
  RateLimitWindow,
  TierRateLimitResult,
  getWindowLimit,
  isUnlimited,
  createTierRateLimitKey,
  getResetTimestamp,
  SECONDS_PER_MINUTE,
  SECONDS_PER_HOUR,
  SECONDS_PER_DAY,
  UNLIMITED,
} from '../rate-limit/rate-limit-tiers';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Options for checking tier-based rate limits
 */
export interface TierRateLimitOptions {
  /** Unique identifier (user ID, API key, or IP address) */
  identifier: string;
  /** Client tier level */
  tier: ClientTier;
  /** Request cost (default: 1) */
  cost?: number;
  /** Skip specific windows (for partial checks) */
  skipWindows?: RateLimitWindow[];
}

/**
 * Internal rate limit state for a single window
 */
interface WindowState {
  count: number;
  resetAt: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
}

/**
 * Rate limit metrics per tier
 */
export interface TierMetrics {
  tier: ClientTier;
  totalRequests: number;
  blockedRequests: number;
  uniqueClients: number;
  averageUsage: {
    minute: number;
    hour: number;
    day: number;
  };
}

/**
 * In-memory store structure
 */
interface InMemoryWindowStore {
  timestamps: number[];
  lastCleanup: number;
}

// ============================================================================
// Tier Rate Limit Service
// ============================================================================

@Injectable()
export class TierRateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TierRateLimitService.name);
  private redis: any = null;
  private useRedis = false;

  // In-memory stores for each window type
  private minuteStore: Map<string, InMemoryWindowStore> = new Map();
  private hourStore: Map<string, InMemoryWindowStore> = new Map();
  private dayStore: Map<string, InMemoryWindowStore> = new Map();

  // Metrics tracking
  private metrics: Map<ClientTier, {
    totalRequests: number;
    blockedRequests: number;
    clients: Set<string>;
  }> = new Map();

  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {
    // Initialize metrics for all tiers
    Object.values(ClientTier).forEach((tier) => {
      this.metrics.set(tier, {
        totalRequests: 0,
        blockedRequests: 0,
        clients: new Set(),
      });
    });
  }

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      try {
        const Redis = await import('ioredis');
        this.redis = new Redis.default(redisUrl);
        this.useRedis = true;
        this.logger.log('TierRateLimitService: Connected to Redis for distributed rate limiting');
      } catch (error) {
        this.logger.warn('TierRateLimitService: Failed to connect to Redis, using in-memory store');
        this.useRedis = false;
      }
    } else {
      this.logger.warn('TierRateLimitService: No REDIS_URL configured, using in-memory store');
    }

    // Start cleanup interval for in-memory stores
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.redis) {
      this.redis.disconnect();
    }
  }

  // ==========================================================================
  // Main Rate Limiting Methods
  // ==========================================================================

  /**
   * Check rate limits for all windows and consume quota if allowed
   */
  async checkRateLimit(options: TierRateLimitOptions): Promise<TierRateLimitResult> {
    const { identifier, tier, cost = 1, skipWindows = [] } = options;

    // Track metrics
    const tierMetrics = this.metrics.get(tier);
    if (tierMetrics) {
      tierMetrics.totalRequests++;
      tierMetrics.clients.add(identifier);
    }

    // Check all windows
    const windowsToCheck = [
      RateLimitWindow.MINUTE,
      RateLimitWindow.HOUR,
      RateLimitWindow.DAY,
    ].filter((w) => !skipWindows.includes(w));

    const windowStates: Record<RateLimitWindow, WindowState> = {
      [RateLimitWindow.MINUTE]: await this.getWindowState(identifier, tier, RateLimitWindow.MINUTE),
      [RateLimitWindow.HOUR]: await this.getWindowState(identifier, tier, RateLimitWindow.HOUR),
      [RateLimitWindow.DAY]: await this.getWindowState(identifier, tier, RateLimitWindow.DAY),
    };

    // Check if any window would be exceeded
    let limitedBy: RateLimitWindow | undefined;

    for (const window of windowsToCheck) {
      const state = windowStates[window];
      if (!state.unlimited && state.count + cost > state.limit) {
        limitedBy = window;
        break;
      }
    }

    // If not limited, increment counters
    if (!limitedBy) {
      await this.incrementCounters(identifier, tier, cost, skipWindows);

      // Update states after increment
      for (const window of windowsToCheck) {
        windowStates[window].count += cost;
        windowStates[window].remaining = Math.max(
          0,
          windowStates[window].limit - windowStates[window].count,
        );
      }
    } else {
      // Track blocked request
      if (tierMetrics) {
        tierMetrics.blockedRequests++;
      }
    }

    // Build result
    const result: TierRateLimitResult = {
      allowed: !limitedBy,
      tier,
      limitedBy,
      remaining: {
        minute: windowStates[RateLimitWindow.MINUTE].remaining,
        hour: windowStates[RateLimitWindow.HOUR].remaining,
        day: windowStates[RateLimitWindow.DAY].remaining,
      },
      resetAt: {
        minute: windowStates[RateLimitWindow.MINUTE].resetAt,
        hour: windowStates[RateLimitWindow.HOUR].resetAt,
        day: windowStates[RateLimitWindow.DAY].resetAt,
      },
      limits: {
        minute: windowStates[RateLimitWindow.MINUTE].limit,
        hour: windowStates[RateLimitWindow.HOUR].limit,
        day: windowStates[RateLimitWindow.DAY].limit,
      },
    };

    // Calculate retry-after if limited
    if (limitedBy) {
      const now = Math.floor(Date.now() / 1000);
      result.retryAfter = windowStates[limitedBy].resetAt - now;
    }

    return result;
  }

  /**
   * Get current rate limit status without consuming quota
   */
  async getStatus(identifier: string, tier: ClientTier): Promise<TierRateLimitResult> {
    const windowStates = {
      [RateLimitWindow.MINUTE]: await this.getWindowState(identifier, tier, RateLimitWindow.MINUTE),
      [RateLimitWindow.HOUR]: await this.getWindowState(identifier, tier, RateLimitWindow.HOUR),
      [RateLimitWindow.DAY]: await this.getWindowState(identifier, tier, RateLimitWindow.DAY),
    };

    return {
      allowed: true,
      tier,
      remaining: {
        minute: windowStates[RateLimitWindow.MINUTE].remaining,
        hour: windowStates[RateLimitWindow.HOUR].remaining,
        day: windowStates[RateLimitWindow.DAY].remaining,
      },
      resetAt: {
        minute: windowStates[RateLimitWindow.MINUTE].resetAt,
        hour: windowStates[RateLimitWindow.HOUR].resetAt,
        day: windowStates[RateLimitWindow.DAY].resetAt,
      },
      limits: {
        minute: windowStates[RateLimitWindow.MINUTE].limit,
        hour: windowStates[RateLimitWindow.HOUR].limit,
        day: windowStates[RateLimitWindow.DAY].limit,
      },
    };
  }

  /**
   * Reset rate limits for an identifier
   */
  async reset(identifier: string, tier: ClientTier): Promise<void> {
    const windows = [RateLimitWindow.MINUTE, RateLimitWindow.HOUR, RateLimitWindow.DAY];

    for (const window of windows) {
      const key = createTierRateLimitKey(identifier, tier, window);

      if (this.useRedis) {
        await this.redis.del(key);
      } else {
        this.getStoreForWindow(window).delete(key);
      }
    }

    this.logger.debug(`Reset rate limits for ${identifier} (tier: ${tier})`);
  }

  /**
   * Get metrics for a specific tier
   */
  getMetrics(tier: ClientTier): TierMetrics {
    const metrics = this.metrics.get(tier);

    if (!metrics) {
      return {
        tier,
        totalRequests: 0,
        blockedRequests: 0,
        uniqueClients: 0,
        averageUsage: { minute: 0, hour: 0, day: 0 },
      };
    }

    return {
      tier,
      totalRequests: metrics.totalRequests,
      blockedRequests: metrics.blockedRequests,
      uniqueClients: metrics.clients.size,
      averageUsage: {
        minute: metrics.clients.size > 0 ? metrics.totalRequests / metrics.clients.size : 0,
        hour: 0,
        day: 0,
      },
    };
  }

  /**
   * Get all tier metrics
   */
  getAllMetrics(): TierMetrics[] {
    return Object.values(ClientTier).map((tier) => this.getMetrics(tier));
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Get current state for a specific window
   */
  private async getWindowState(
    identifier: string,
    tier: ClientTier,
    window: RateLimitWindow,
  ): Promise<WindowState> {
    const windowLimit = getWindowLimit(tier, window);
    const key = createTierRateLimitKey(identifier, tier, window);
    const resetAt = getResetTimestamp(window);
    const windowSeconds = this.getWindowSeconds(window);

    if (windowLimit.unlimited) {
      return {
        count: 0,
        resetAt,
        limit: UNLIMITED,
        remaining: UNLIMITED,
        unlimited: true,
      };
    }

    let count: number;

    if (this.useRedis) {
      count = await this.getRedisCount(key, windowSeconds);
    } else {
      count = this.getInMemoryCount(key, window);
    }

    const remaining = Math.max(0, windowLimit.limit - count);

    return {
      count,
      resetAt,
      limit: windowLimit.limit,
      remaining,
      unlimited: false,
    };
  }

  /**
   * Increment counters for all windows
   */
  private async incrementCounters(
    identifier: string,
    tier: ClientTier,
    cost: number,
    skipWindows: RateLimitWindow[],
  ): Promise<void> {
    const windows = [
      RateLimitWindow.MINUTE,
      RateLimitWindow.HOUR,
      RateLimitWindow.DAY,
    ].filter((w) => !skipWindows.includes(w));

    for (const window of windows) {
      if (isUnlimited(tier, window)) {
        continue;
      }

      const key = createTierRateLimitKey(identifier, tier, window);
      const windowSeconds = this.getWindowSeconds(window);

      if (this.useRedis) {
        await this.redisIncrement(key, windowSeconds, cost);
      } else {
        this.inMemoryIncrement(key, window, cost);
      }
    }
  }

  /**
   * Get window seconds for a window type
   */
  private getWindowSeconds(window: RateLimitWindow): number {
    switch (window) {
      case RateLimitWindow.MINUTE:
        return SECONDS_PER_MINUTE;
      case RateLimitWindow.HOUR:
        return SECONDS_PER_HOUR;
      case RateLimitWindow.DAY:
        return SECONDS_PER_DAY;
      default:
        return SECONDS_PER_MINUTE;
    }
  }

  /**
   * Get the in-memory store for a window type
   */
  private getStoreForWindow(window: RateLimitWindow): Map<string, InMemoryWindowStore> {
    switch (window) {
      case RateLimitWindow.MINUTE:
        return this.minuteStore;
      case RateLimitWindow.HOUR:
        return this.hourStore;
      case RateLimitWindow.DAY:
        return this.dayStore;
      default:
        return this.minuteStore;
    }
  }

  // ==========================================================================
  // Redis Operations
  // ==========================================================================

  /**
   * Get count from Redis using sliding window
   */
  private async getRedisCount(key: string, windowSeconds: number): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;

    try {
      const count = await this.redis.zcount(key, windowStart, '+inf');
      return count || 0;
    } catch (error) {
      this.logger.error(`Redis getCount error for ${key}:`, error);
      return 0;
    }
  }

  /**
   * Increment counter in Redis using sliding window
   */
  private async redisIncrement(key: string, windowSeconds: number, cost: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;

    try {
      const pipeline = this.redis.pipeline();

      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Add new entries for the cost
      for (let i = 0; i < cost; i++) {
        pipeline.zadd(key, now, `${now}:${Math.random()}`);
      }

      // Set expiry
      pipeline.expire(key, windowSeconds + 1);

      await pipeline.exec();
    } catch (error) {
      this.logger.error(`Redis increment error for ${key}:`, error);
    }
  }

  // ==========================================================================
  // In-Memory Operations
  // ==========================================================================

  /**
   * Get count from in-memory store
   */
  private getInMemoryCount(key: string, window: RateLimitWindow): number {
    const store = this.getStoreForWindow(window);
    const entry = store.get(key);
    const windowSeconds = this.getWindowSeconds(window);
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;

    if (!entry) {
      return 0;
    }

    // Filter expired timestamps
    const validTimestamps = entry.timestamps.filter((ts) => ts > windowStart);
    return validTimestamps.length;
  }

  /**
   * Increment counter in in-memory store
   */
  private inMemoryIncrement(key: string, window: RateLimitWindow, cost: number): void {
    const store = this.getStoreForWindow(window);
    const windowSeconds = this.getWindowSeconds(window);
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;

    let entry = store.get(key);

    if (!entry) {
      entry = {
        timestamps: [],
        lastCleanup: now,
      };
    }

    // Clean up old timestamps
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    // Add new timestamps
    for (let i = 0; i < cost; i++) {
      entry.timestamps.push(now);
    }

    store.set(key, entry);
  }

  /**
   * Cleanup expired entries from all stores
   */
  private cleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    let cleaned = 0;

    // Cleanup each store
    [
      { store: this.minuteStore, window: RateLimitWindow.MINUTE },
      { store: this.hourStore, window: RateLimitWindow.HOUR },
      { store: this.dayStore, window: RateLimitWindow.DAY },
    ].forEach(({ store, window }) => {
      const windowSeconds = this.getWindowSeconds(window);
      const windowStart = now - windowSeconds;

      for (const [key, entry] of store.entries()) {
        const validTimestamps = entry.timestamps.filter((ts) => ts > windowStart);

        if (validTimestamps.length === 0) {
          store.delete(key);
          cleaned++;
        } else if (validTimestamps.length !== entry.timestamps.length) {
          entry.timestamps = validTimestamps;
          entry.lastCleanup = now;
        }
      }
    });

    if (cleaned > 0) {
      this.logger.debug(`TierRateLimitService: Cleaned ${cleaned} expired entries`);
    }
  }
}
