import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { ThrottleRecord } from '../interfaces/throttler.interfaces';
import {
  REDIS_KEY_PREFIX,
  VIOLATION_BLOCK_DURATION,
  MAX_VIOLATIONS_BEFORE_BLOCK,
} from '../throttler.constants';

@Injectable()
export class RedisThrottlerStorageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisThrottlerStorageService.name);
  private client: RedisClientType;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            this.logger.error('Max Redis reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis Client Error: ${err.message}`);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis client reconnecting...');
    });

    try {
      await this.client.connect();
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`);
      // Fall back to in-memory storage if Redis is unavailable
    }
  }

  private async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * Get the throttle record for a given key
   */
  async getRecord(key: string): Promise<ThrottleRecord | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const fullKey = `${REDIS_KEY_PREFIX.RATE_LIMIT}${key}`;
      const data = await this.client.get(fullKey);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as ThrottleRecord;
    } catch (error) {
      this.logger.error(`Error getting throttle record: ${error.message}`);
      return null;
    }
  }

  /**
   * Increment the request count for a given key
   */
  async increment(key: string, ttlMs: number): Promise<ThrottleRecord> {
    const fullKey = `${REDIS_KEY_PREFIX.RATE_LIMIT}${key}`;
    const now = Date.now();

    if (!this.isConnected) {
      // Fallback behavior when Redis is not available
      return {
        count: 1,
        expiresAt: now + ttlMs,
        firstRequestAt: now,
      };
    }

    try {
      const existingData = await this.client.get(fullKey);

      let record: ThrottleRecord;

      if (existingData) {
        record = JSON.parse(existingData);
        record.count += 1;
      } else {
        record = {
          count: 1,
          expiresAt: now + ttlMs,
          firstRequestAt: now,
        };
      }

      const ttlSeconds = Math.ceil(ttlMs / 1000);
      await this.client.setEx(fullKey, ttlSeconds, JSON.stringify(record));

      return record;
    } catch (error) {
      this.logger.error(`Error incrementing throttle record: ${error.message}`);
      return {
        count: 1,
        expiresAt: now + ttlMs,
        firstRequestAt: now,
      };
    }
  }

  /**
   * Reset the throttle record for a given key
   */
  async reset(key: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const fullKey = `${REDIS_KEY_PREFIX.RATE_LIMIT}${key}`;
      await this.client.del(fullKey);
    } catch (error) {
      this.logger.error(`Error resetting throttle record: ${error.message}`);
    }
  }

  /**
   * Check if an identifier is blocked
   */
  async isBlocked(identifier: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const blockKey = `${REDIS_KEY_PREFIX.BLOCKED}${identifier}`;
      const blocked = await this.client.exists(blockKey);
      return blocked === 1;
    } catch (error) {
      this.logger.error(`Error checking blocked status: ${error.message}`);
      return false;
    }
  }

  /**
   * Block an identifier for a specified duration
   */
  async block(identifier: string, durationSeconds: number = VIOLATION_BLOCK_DURATION): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const blockKey = `${REDIS_KEY_PREFIX.BLOCKED}${identifier}`;
      await this.client.setEx(blockKey, durationSeconds, 'blocked');
      this.logger.warn(`Blocked identifier: ${identifier} for ${durationSeconds} seconds`);
    } catch (error) {
      this.logger.error(`Error blocking identifier: ${error.message}`);
    }
  }

  /**
   * Record a rate limit violation and potentially block the identifier
   */
  async recordViolation(identifier: string): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const violationKey = `${REDIS_KEY_PREFIX.VIOLATION_COUNT}${identifier}`;
      const count = await this.client.incr(violationKey);

      // Set expiry on first violation
      if (count === 1) {
        await this.client.expire(violationKey, 3600); // 1 hour window
      }

      // Block if too many violations
      if (count >= MAX_VIOLATIONS_BEFORE_BLOCK) {
        await this.block(identifier);
        await this.client.del(violationKey);
      }

      return count;
    } catch (error) {
      this.logger.error(`Error recording violation: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get remaining TTL for a key in seconds
   */
  async getTtl(key: string): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const fullKey = `${REDIS_KEY_PREFIX.RATE_LIMIT}${key}`;
      const ttl = await this.client.ttl(fullKey);
      return ttl > 0 ? ttl : 0;
    } catch (error) {
      this.logger.error(`Error getting TTL: ${error.message}`);
      return 0;
    }
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }
}
