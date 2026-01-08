/**
 * RedisHealthIndicator Unit Tests
 *
 * Tests for the Redis health check indicator including:
 * - Healthy state when Redis is connected
 * - Degraded state when using in-memory fallback
 * - Unhealthy state when Redis check fails
 * - Response time measurement
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RedisHealthIndicator, HealthIndicatorResult } from './redis.health';
import { CacheService, CacheStats } from '../../cache/cache.service';

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;

  const mockCacheService = {
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should be defined', () => {
      expect(indicator).toBeDefined();
    });
  });

  // ==========================================================================
  // isHealthy() - Healthy State Tests
  // ==========================================================================

  describe('isHealthy - healthy state', () => {
    it('should return up status when Redis is connected', async () => {
      // Arrange
      const mockStats: CacheStats = {
        hits: 100,
        misses: 10,
        hitRate: 90.91,
        keys: 50,
        memory: '1.5M',
        connected: true,
      };
      mockCacheService.getStats.mockResolvedValue(mockStats);

      // Act
      const result = await indicator.isHealthy('redis');

      // Assert
      expect(result).toHaveProperty('redis');
      expect(result.redis.status).toBe('up');
      expect(result.redis).toHaveProperty('responseTime');
      expect(typeof result.redis.responseTime).toBe('number');
      expect(result.redis.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should use the provided key in the response', async () => {
      // Arrange
      const mockStats: CacheStats = {
        hits: 100,
        misses: 10,
        hitRate: 90.91,
        keys: 50,
        memory: '1.5M',
        connected: true,
      };
      mockCacheService.getStats.mockResolvedValue(mockStats);

      // Act
      const result = await indicator.isHealthy('customCacheKey');

      // Assert
      expect(result).toHaveProperty('customCacheKey');
      expect(result.customCacheKey.status).toBe('up');
    });

    it('should measure response time correctly', async () => {
      // Arrange
      const mockStats: CacheStats = {
        hits: 100,
        misses: 10,
        hitRate: 90.91,
        keys: 50,
        memory: '1.5M',
        connected: true,
      };
      mockCacheService.getStats.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return mockStats;
      });

      // Act
      const result = await indicator.isHealthy('redis');

      // Assert
      expect(result.redis.responseTime).toBeGreaterThanOrEqual(10);
    });
  });

  // ==========================================================================
  // isHealthy() - Degraded State Tests
  // ==========================================================================

  describe('isHealthy - degraded state', () => {
    it('should return degraded status when Redis is not connected but using fallback', async () => {
      // Arrange
      const mockStats: CacheStats = {
        hits: 50,
        misses: 5,
        hitRate: 90.91,
        keys: 25,
        memory: 'N/A',
        connected: false,
      };
      mockCacheService.getStats.mockResolvedValue(mockStats);

      // Act
      const result = await indicator.isHealthy('redis');

      // Assert
      expect(result.redis.status).toBe('degraded');
      expect(result.redis).toHaveProperty('responseTime');
    });

    it('should still report response time in degraded state', async () => {
      // Arrange
      const mockStats: CacheStats = {
        hits: 50,
        misses: 5,
        hitRate: 90.91,
        keys: 25,
        memory: 'N/A',
        connected: false,
      };
      mockCacheService.getStats.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return mockStats;
      });

      // Act
      const result = await indicator.isHealthy('redis');

      // Assert
      expect(result.redis.status).toBe('degraded');
      expect(result.redis.responseTime).toBeGreaterThanOrEqual(5);
    });
  });

  // ==========================================================================
  // isHealthy() - Unhealthy State Tests
  // ==========================================================================

  describe('isHealthy - unhealthy state', () => {
    it('should return down status when cache service throws an error', async () => {
      // Arrange
      mockCacheService.getStats.mockRejectedValue(new Error('Redis connection lost'));

      // Act
      const result = await indicator.isHealthy('redis');

      // Assert
      expect(result.redis.status).toBe('down');
      expect(result.redis.error).toBe('Redis connection lost');
      expect(result.redis).toHaveProperty('responseTime');
    });

    it('should return down status when Redis times out', async () => {
      // Arrange
      mockCacheService.getStats.mockRejectedValue(new Error('Redis timeout'));

      // Act
      const result = await indicator.isHealthy('redis');

      // Assert
      expect(result.redis.status).toBe('down');
      expect(result.redis.error).toBe('Redis timeout');
    });

    it('should handle unknown error types gracefully', async () => {
      // Arrange
      mockCacheService.getStats.mockRejectedValue('string error');

      // Act
      const result = await indicator.isHealthy('redis');

      // Assert
      expect(result.redis.status).toBe('down');
      expect(result.redis.error).toBe('Unknown error');
    });

    it('should measure response time even on failure', async () => {
      // Arrange
      mockCacheService.getStats.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        throw new Error('Connection failed');
      });

      // Act
      const result = await indicator.isHealthy('redis');

      // Assert
      expect(result.redis.status).toBe('down');
      expect(result.redis.responseTime).toBeGreaterThanOrEqual(5);
    });

    it('should return down status when Redis authentication fails', async () => {
      // Arrange
      mockCacheService.getStats.mockRejectedValue(new Error('NOAUTH Authentication required'));

      // Act
      const result = await indicator.isHealthy('redis');

      // Assert
      expect(result.redis.status).toBe('down');
      expect(result.redis.error).toBe('NOAUTH Authentication required');
    });
  });

  // ==========================================================================
  // Response Structure Tests
  // ==========================================================================

  describe('response structure', () => {
    it('should return HealthIndicatorResult type', async () => {
      // Arrange
      const mockStats: CacheStats = {
        hits: 100,
        misses: 10,
        hitRate: 90.91,
        keys: 50,
        memory: '1.5M',
        connected: true,
      };
      mockCacheService.getStats.mockResolvedValue(mockStats);

      // Act
      const result: HealthIndicatorResult = await indicator.isHealthy('redis');

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should include all required fields in healthy response', async () => {
      // Arrange
      const mockStats: CacheStats = {
        hits: 100,
        misses: 10,
        hitRate: 90.91,
        keys: 50,
        memory: '1.5M',
        connected: true,
      };
      mockCacheService.getStats.mockResolvedValue(mockStats);

      // Act
      const result = await indicator.isHealthy('redis');

      // Assert
      expect(Object.keys(result.redis)).toContain('status');
      expect(Object.keys(result.redis)).toContain('responseTime');
    });

    it('should include all required fields in degraded response', async () => {
      // Arrange
      const mockStats: CacheStats = {
        hits: 50,
        misses: 5,
        hitRate: 90.91,
        keys: 25,
        memory: 'N/A',
        connected: false,
      };
      mockCacheService.getStats.mockResolvedValue(mockStats);

      // Act
      const result = await indicator.isHealthy('redis');

      // Assert
      expect(Object.keys(result.redis)).toContain('status');
      expect(Object.keys(result.redis)).toContain('responseTime');
    });

    it('should include all required fields in unhealthy response', async () => {
      // Arrange
      mockCacheService.getStats.mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await indicator.isHealthy('redis');

      // Assert
      expect(Object.keys(result.redis)).toContain('status');
      expect(Object.keys(result.redis)).toContain('responseTime');
      expect(Object.keys(result.redis)).toContain('error');
    });
  });
});
