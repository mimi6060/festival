/**
 * Rate Limiting Service for Festival Platform API
 *
 * Centralized service for rate limit management with:
 * - Redis-based distributed rate limiting
 * - Multiple algorithm support (sliding window, token bucket)
 * - Dynamic rate limit adjustments
 * - Rate limit analytics and metrics
 *
 * @module RateLimitService
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Rate limit bucket for token bucket algorithm
 */
export interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number;
}

/**
 * Rate limit entry for sliding window
 */
export interface SlidingWindowEntry {
  timestamps: number[];
  windowStart: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfter?: number;
  currentCount: number;
}

/**
 * Rate limit metrics
 */
export interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  uniqueKeys: number;
  averageUsage: number;
  topConsumers: { key: string; count: number }[];
}

/**
 * Algorithm type for rate limiting
 */
export type RateLimitAlgorithm = 'sliding_window' | 'token_bucket' | 'fixed_window' | 'leaky_bucket';

/**
 * Rate limit options
 */
export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
  algorithm?: RateLimitAlgorithm;
  cost?: number;
  burstLimit?: number;
}

// ============================================================================
// In-Memory Storage
// ============================================================================

interface InMemoryStore {
  slidingWindow: Map<string, number[]>;
  tokenBucket: Map<string, TokenBucket>;
  fixedWindow: Map<string, { count: number; resetAt: number }>;
  leakyBucket: Map<string, { queue: number[]; lastLeak: number }>;
}

// ============================================================================
// Rate Limit Service
// ============================================================================

@Injectable()
export class RateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private redis: any = null;
  private store: InMemoryStore;
  private metrics: {
    totalRequests: number;
    blockedRequests: number;
    keyUsage: Map<string, number>;
  };
  private cleanupInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {
    this.store = {
      slidingWindow: new Map(),
      tokenBucket: new Map(),
      fixedWindow: new Map(),
      leakyBucket: new Map(),
    };
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      keyUsage: new Map(),
    };
  }

  async onModuleInit(): Promise<void> {
    // Try to connect to Redis
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        const Redis = await import('ioredis');
        this.redis = new Redis.default(redisUrl);
        this.logger.log('Connected to Redis for rate limiting');
      } catch {
        this.logger.warn('Failed to connect to Redis, using in-memory rate limiting');
      }
    } else {
      this.logger.warn('No REDIS_URL configured, using in-memory rate limiting');
    }

    // Setup cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);

    // Setup metrics collection interval
    this.metricsInterval = setInterval(() => this.collectMetrics(), 300000);
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.redis) {
      this.redis.disconnect();
    }
  }

  // ==========================================================================
  // Main Rate Limiting Methods
  // ==========================================================================

  /**
   * Check if a request should be allowed
   */
  async checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
    const { algorithm = 'sliding_window' } = options;
    this.metrics.totalRequests++;

    let result: RateLimitResult;

    switch (algorithm) {
      case 'sliding_window':
        result = await this.slidingWindowCheck(options);
        break;
      case 'token_bucket':
        result = await this.tokenBucketCheck(options);
        break;
      case 'fixed_window':
        result = await this.fixedWindowCheck(options);
        break;
      case 'leaky_bucket':
        result = await this.leakyBucketCheck(options);
        break;
      default:
        result = await this.slidingWindowCheck(options);
    }

    if (!result.allowed) {
      this.metrics.blockedRequests++;
    }

    // Track key usage
    const currentUsage = this.metrics.keyUsage.get(options.key) || 0;
    this.metrics.keyUsage.set(options.key, currentUsage + 1);

    return result;
  }

  /**
   * Consume tokens without checking (for batch operations)
   */
  async consume(key: string, tokens = 1): Promise<boolean> {
    return this.checkRateLimit({
      key,
      limit: tokens,
      windowSeconds: 1,
      cost: tokens,
    }).then((r) => r.allowed);
  }

  /**
   * Get current rate limit status without consuming
   */
  async getStatus(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    if (this.redis) {
      return this.getRedisStatus(key, limit, windowSeconds);
    }
    return this.getInMemoryStatus(key, limit, windowSeconds);
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(`ratelimit:${key}`);
    }
    this.store.slidingWindow.delete(key);
    this.store.tokenBucket.delete(key);
    this.store.fixedWindow.delete(key);
    this.store.leakyBucket.delete(key);
    this.logger.debug(`Reset rate limit for key: ${key}`);
  }

  /**
   * Get rate limit metrics
   */
  getMetrics(): RateLimitMetrics {
    const topConsumers = Array.from(this.metrics.keyUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }));

    const totalUsage = Array.from(this.metrics.keyUsage.values()).reduce((a, b) => a + b, 0);
    const uniqueKeys = this.metrics.keyUsage.size;

    return {
      totalRequests: this.metrics.totalRequests,
      blockedRequests: this.metrics.blockedRequests,
      uniqueKeys,
      averageUsage: uniqueKeys > 0 ? totalUsage / uniqueKeys : 0,
      topConsumers,
    };
  }

  // ==========================================================================
  // Sliding Window Algorithm
  // ==========================================================================

  private async slidingWindowCheck(options: RateLimitOptions): Promise<RateLimitResult> {
    const { key, limit, windowSeconds, cost = 1 } = options;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;

    if (this.redis) {
      return this.redisSlidingWindow(key, limit, windowSeconds, cost);
    }

    // In-memory sliding window
    let timestamps = this.store.slidingWindow.get(key) || [];

    // Remove expired timestamps
    timestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if limit exceeded
    const currentCount = timestamps.length;
    const allowed = currentCount + cost <= limit;

    if (allowed) {
      // Add new timestamps
      for (let i = 0; i < cost; i++) {
        timestamps.push(now);
      }
      this.store.slidingWindow.set(key, timestamps);
    }

    const remaining = Math.max(0, limit - timestamps.length);
    const resetAt = now + windowSeconds;

    return {
      allowed,
      remaining,
      limit,
      resetAt,
      retryAfter: allowed ? undefined : windowSeconds,
      currentCount: timestamps.length,
    };
  }

  private async redisSlidingWindow(
    key: string,
    limit: number,
    windowSeconds: number,
    cost: number,
  ): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;
    const fullKey = `ratelimit:sw:${key}`;

    try {
      const pipeline = this.redis.pipeline();

      // Remove expired entries
      pipeline.zremrangebyscore(fullKey, 0, windowStart);

      // Count current entries
      pipeline.zcard(fullKey);

      const [, [, currentCount]] = await pipeline.exec();

      const allowed = currentCount + cost <= limit;

      if (allowed) {
        // Add new entries
        const addPipeline = this.redis.pipeline();
        for (let i = 0; i < cost; i++) {
          addPipeline.zadd(fullKey, now, `${now}:${Math.random()}`);
        }
        addPipeline.expire(fullKey, windowSeconds + 1);
        await addPipeline.exec();
      }

      const newCount = allowed ? currentCount + cost : currentCount;
      const remaining = Math.max(0, limit - newCount);

      return {
        allowed,
        remaining,
        limit,
        resetAt: now + windowSeconds,
        retryAfter: allowed ? undefined : windowSeconds,
        currentCount: newCount,
      };
    } catch (error) {
      this.logger.error('Redis sliding window error', error);
      return { allowed: true, remaining: limit, limit, resetAt: now + windowSeconds, currentCount: 0 };
    }
  }

  // ==========================================================================
  // Token Bucket Algorithm
  // ==========================================================================

  private async tokenBucketCheck(options: RateLimitOptions): Promise<RateLimitResult> {
    const { key, limit, windowSeconds, cost = 1, burstLimit } = options;
    const now = Date.now();
    const capacity = burstLimit || limit;
    const refillRate = limit / windowSeconds;

    if (this.redis) {
      return this.redisTokenBucket(key, capacity, refillRate, cost);
    }

    // In-memory token bucket
    let bucket = this.store.tokenBucket.get(key);

    if (!bucket) {
      bucket = {
        tokens: capacity,
        lastRefill: now,
        capacity,
        refillRate,
      };
    }

    // Calculate tokens to add based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * refillRate;
    bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if enough tokens
    const allowed = bucket.tokens >= cost;

    if (allowed) {
      bucket.tokens -= cost;
    }

    this.store.tokenBucket.set(key, bucket);

    const remaining = Math.floor(bucket.tokens);
    const timeToRefill = cost > bucket.tokens ? (cost - bucket.tokens) / refillRate : 0;

    return {
      allowed,
      remaining,
      limit: capacity,
      resetAt: Math.floor(now / 1000 + timeToRefill),
      retryAfter: allowed ? undefined : Math.ceil(timeToRefill),
      currentCount: capacity - remaining,
    };
  }

  private async redisTokenBucket(
    key: string,
    capacity: number,
    refillRate: number,
    cost: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const fullKey = `ratelimit:tb:${key}`;

    try {
      // Lua script for atomic token bucket operation
      const script = `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refillRate = tonumber(ARGV[2])
        local cost = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])

        local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
        local tokens = tonumber(data[1]) or capacity
        local lastRefill = tonumber(data[2]) or now

        local elapsed = (now - lastRefill) / 1000
        tokens = math.min(capacity, tokens + elapsed * refillRate)

        local allowed = tokens >= cost
        if allowed then
          tokens = tokens - cost
        end

        redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
        redis.call('EXPIRE', key, 3600)

        return {allowed and 1 or 0, math.floor(tokens), capacity}
      `;

      const result = await this.redis.eval(script, 1, fullKey, capacity, refillRate, cost, now);
      const [allowed, remaining, limit] = result;

      return {
        allowed: allowed === 1,
        remaining,
        limit,
        resetAt: Math.floor(now / 1000 + (cost - remaining) / refillRate),
        currentCount: limit - remaining,
      };
    } catch (error) {
      this.logger.error('Redis token bucket error', error);
      return { allowed: true, remaining: capacity, limit: capacity, resetAt: 0, currentCount: 0 };
    }
  }

  // ==========================================================================
  // Fixed Window Algorithm
  // ==========================================================================

  private async fixedWindowCheck(options: RateLimitOptions): Promise<RateLimitResult> {
    const { key, limit, windowSeconds, cost = 1 } = options;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
    const resetAt = windowStart + windowSeconds;

    if (this.redis) {
      return this.redisFixedWindow(key, limit, windowSeconds, cost, windowStart, resetAt);
    }

    // In-memory fixed window
    const entry = this.store.fixedWindow.get(key);

    if (!entry || entry.resetAt <= now) {
      // New window
      if (cost <= limit) {
        this.store.fixedWindow.set(key, { count: cost, resetAt });
        return { allowed: true, remaining: limit - cost, limit, resetAt, currentCount: cost };
      }
      return { allowed: false, remaining: 0, limit, resetAt, retryAfter: resetAt - now, currentCount: 0 };
    }

    // Existing window
    const newCount = entry.count + cost;
    const allowed = newCount <= limit;

    if (allowed) {
      entry.count = newCount;
      this.store.fixedWindow.set(key, entry);
    }

    return {
      allowed,
      remaining: Math.max(0, limit - entry.count),
      limit,
      resetAt: entry.resetAt,
      retryAfter: allowed ? undefined : entry.resetAt - now,
      currentCount: entry.count,
    };
  }

  private async redisFixedWindow(
    key: string,
    limit: number,
    windowSeconds: number,
    cost: number,
    windowStart: number,
    resetAt: number,
  ): Promise<RateLimitResult> {
    const fullKey = `ratelimit:fw:${key}:${windowStart}`;

    try {
      const pipeline = this.redis.pipeline();
      pipeline.incrby(fullKey, cost);
      pipeline.expire(fullKey, windowSeconds + 1);
      const [[, count]] = await pipeline.exec();

      const allowed = count <= limit;
      const remaining = Math.max(0, limit - count);

      return {
        allowed,
        remaining,
        limit,
        resetAt,
        retryAfter: allowed ? undefined : resetAt - Math.floor(Date.now() / 1000),
        currentCount: count,
      };
    } catch (error) {
      this.logger.error('Redis fixed window error', error);
      return { allowed: true, remaining: limit, limit, resetAt, currentCount: 0 };
    }
  }

  // ==========================================================================
  // Leaky Bucket Algorithm
  // ==========================================================================

  private async leakyBucketCheck(options: RateLimitOptions): Promise<RateLimitResult> {
    const { key, limit, windowSeconds, cost = 1 } = options;
    const now = Date.now();
    const leakRate = limit / (windowSeconds * 1000); // requests per millisecond

    if (this.redis) {
      return this.redisLeakyBucket(key, limit, leakRate, cost);
    }

    // In-memory leaky bucket
    let bucket = this.store.leakyBucket.get(key);

    if (!bucket) {
      bucket = { queue: [], lastLeak: now };
    }

    // Leak water (process requests)
    const elapsed = now - bucket.lastLeak;
    const leaked = Math.floor(elapsed * leakRate);
    bucket.queue = bucket.queue.slice(leaked);
    bucket.lastLeak = now;

    // Check capacity
    const allowed = bucket.queue.length + cost <= limit;

    if (allowed) {
      for (let i = 0; i < cost; i++) {
        bucket.queue.push(now);
      }
    }

    this.store.leakyBucket.set(key, bucket);

    const remaining = limit - bucket.queue.length;
    const timeToEmpty = bucket.queue.length / leakRate;

    return {
      allowed,
      remaining: Math.max(0, remaining),
      limit,
      resetAt: Math.floor((now + timeToEmpty) / 1000),
      retryAfter: allowed ? undefined : Math.ceil(1 / leakRate / 1000),
      currentCount: bucket.queue.length,
    };
  }

  private async redisLeakyBucket(
    key: string,
    capacity: number,
    leakRate: number,
    cost: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const fullKey = `ratelimit:lb:${key}`;

    try {
      const script = `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local leakRate = tonumber(ARGV[2])
        local cost = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])

        local data = redis.call('HMGET', key, 'water', 'lastLeak')
        local water = tonumber(data[1]) or 0
        local lastLeak = tonumber(data[2]) or now

        local elapsed = now - lastLeak
        local leaked = elapsed * leakRate
        water = math.max(0, water - leaked)

        local allowed = water + cost <= capacity
        if allowed then
          water = water + cost
        end

        redis.call('HMSET', key, 'water', water, 'lastLeak', now)
        redis.call('EXPIRE', key, 3600)

        return {allowed and 1 or 0, math.floor(capacity - water), capacity, math.floor(water)}
      `;

      const result = await this.redis.eval(script, 1, fullKey, capacity, leakRate, cost, now);
      const [allowed, remaining, limit, currentCount] = result;

      return {
        allowed: allowed === 1,
        remaining,
        limit,
        resetAt: Math.floor(now / 1000 + currentCount / leakRate / 1000),
        currentCount,
      };
    } catch (error) {
      this.logger.error('Redis leaky bucket error', error);
      return { allowed: true, remaining: capacity, limit: capacity, resetAt: 0, currentCount: 0 };
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async getRedisStatus(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;
    const fullKey = `ratelimit:sw:${key}`;

    try {
      const count = await this.redis.zcount(fullKey, windowStart, '+inf');
      const remaining = Math.max(0, limit - count);

      return {
        allowed: count < limit,
        remaining,
        limit,
        resetAt: now + windowSeconds,
        currentCount: count,
      };
    } catch (error) {
      this.logger.error('Redis status check error', error);
      return { allowed: true, remaining: limit, limit, resetAt: now + windowSeconds, currentCount: 0 };
    }
  }

  private getInMemoryStatus(key: string, limit: number, windowSeconds: number): RateLimitResult {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;
    const timestamps = this.store.slidingWindow.get(key) || [];
    const validTimestamps = timestamps.filter((ts) => ts > windowStart);
    const count = validTimestamps.length;

    return {
      allowed: count < limit,
      remaining: Math.max(0, limit - count),
      limit,
      resetAt: now + windowSeconds,
      currentCount: count,
    };
  }

  private cleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    let cleaned = 0;

    // Cleanup sliding window
    for (const [key, timestamps] of this.store.slidingWindow.entries()) {
      const valid = timestamps.filter((ts) => ts > now - 3600);
      if (valid.length === 0) {
        this.store.slidingWindow.delete(key);
        cleaned++;
      } else if (valid.length !== timestamps.length) {
        this.store.slidingWindow.set(key, valid);
      }
    }

    // Cleanup fixed window
    for (const [key, entry] of this.store.fixedWindow.entries()) {
      if (entry.resetAt <= now) {
        this.store.fixedWindow.delete(key);
        cleaned++;
      }
    }

    // Cleanup token bucket (remove stale entries)
    const tokenBucketExpiry = Date.now() - 3600000;
    for (const [key, bucket] of this.store.tokenBucket.entries()) {
      if (bucket.lastRefill < tokenBucketExpiry) {
        this.store.tokenBucket.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  private collectMetrics(): void {
    const metrics = this.getMetrics();
    this.logger.debug('Rate limit metrics', {
      totalRequests: metrics.totalRequests,
      blockedRequests: metrics.blockedRequests,
      blockRate: ((metrics.blockedRequests / metrics.totalRequests) * 100).toFixed(2) + '%',
      uniqueKeys: metrics.uniqueKeys,
    });

    // Reset periodic metrics
    this.metrics.totalRequests = 0;
    this.metrics.blockedRequests = 0;
    this.metrics.keyUsage.clear();
  }
}
