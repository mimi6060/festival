/**
 * Cache Controller Unit Tests
 *
 * Comprehensive tests for cache monitoring controller including:
 * - Dashboard and statistics endpoints
 * - Cache operations (list keys, get/delete key, clear)
 * - Invalidation operations (by tag, pattern, festival, user, entity)
 * - Health monitoring and latency measurement
 * - Configuration endpoints (dependencies, tags)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CacheController } from './cache.controller';
import { CacheService, CacheTag, CacheStats } from './cache.service';
import {
  CacheInvalidationService,
  InvalidationResult,
} from './cache-invalidation.service';

// ============================================================================
// Mock Setup
// ============================================================================

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  deletePattern: jest.fn(),
  clear: jest.fn(),
  invalidateByTag: jest.fn(),
  getStats: jest.fn(),
  resetStats: jest.fn(),
};

const mockInvalidationService = {
  invalidateByTag: jest.fn(),
  invalidateByFestival: jest.fn(),
  invalidateByUser: jest.fn(),
  onEntityChange: jest.fn(),
  getMetrics: jest.fn(),
  resetMetrics: jest.fn(),
  getDependencies: jest.fn(),
};

const mockCacheStats: CacheStats = {
  hits: 100,
  misses: 25,
  hitRate: 80,
  keys: 50,
  memory: '10M',
  connected: true,
};

const mockInvalidationMetrics = {
  totalInvalidations: 10,
  cascadeInvalidations: 2,
  keysInvalidated: 50,
  avgDuration: 5.5,
};

describe('CacheController', () => {
  let controller: CacheController;
  let cacheService: CacheService;
  let invalidationService: CacheInvalidationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup default mock returns
    mockCacheService.getStats.mockResolvedValue(mockCacheStats);
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.delete.mockResolvedValue(undefined);
    mockCacheService.clear.mockResolvedValue(undefined);
    mockCacheService.invalidateByTag.mockResolvedValue(5);

    mockInvalidationService.getMetrics.mockReturnValue(mockInvalidationMetrics);
    mockInvalidationService.getDependencies.mockReturnValue(new Map([
      ['user:*', [{ source: 'user:*', targets: ['session:${id}'] }]],
      ['festival:*', [{ source: 'festival:*', targets: ['tickets:festival:${id}:*'] }]],
    ]));

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheController],
      providers: [
        { provide: CacheService, useValue: mockCacheService },
        { provide: CacheInvalidationService, useValue: mockInvalidationService },
      ],
    }).compile();

    controller = module.get<CacheController>(CacheController);
    cacheService = module.get<CacheService>(CacheService);
    invalidationService = module.get<CacheInvalidationService>(CacheInvalidationService);
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ==========================================================================
  // Dashboard Tests
  // ==========================================================================

  describe('GET /cache/dashboard', () => {
    it('should return dashboard data', async () => {
      const result = await controller.getDashboard();

      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('invalidationMetrics');
      expect(result).toHaveProperty('topKeys');
      expect(result).toHaveProperty('tagDistribution');
      expect(result).toHaveProperty('memoryBreakdown');
      expect(result).toHaveProperty('health');
    });

    it('should include cache stats', async () => {
      const result = await controller.getDashboard();

      expect(result.stats).toEqual(mockCacheStats);
    });

    it('should include invalidation metrics', async () => {
      const result = await controller.getDashboard();

      expect(result.invalidationMetrics).toEqual(mockInvalidationMetrics);
    });

    it('should include health status', async () => {
      mockCacheService.get.mockResolvedValue('test');

      const result = await controller.getDashboard();

      expect(result.health).toHaveProperty('status');
      expect(result.health).toHaveProperty('latency');
      expect(result.health).toHaveProperty('connected');
    });

    it('should include memory breakdown', async () => {
      const result = await controller.getDashboard();

      expect(result.memoryBreakdown).toHaveProperty('total');
      expect(result.memoryBreakdown).toHaveProperty('used');
      expect(result.memoryBreakdown).toHaveProperty('peak');
    });
  });

  // ==========================================================================
  // Statistics Tests
  // ==========================================================================

  describe('GET /cache/stats', () => {
    it('should return cache statistics', async () => {
      const result = await controller.getStats();

      expect(result).toEqual(mockCacheStats);
      expect(mockCacheService.getStats).toHaveBeenCalled();
    });
  });

  describe('GET /cache/stats/detailed', () => {
    it('should return detailed statistics', async () => {
      const result = await controller.getDetailedStats();

      expect(result).toHaveProperty('cache');
      expect(result).toHaveProperty('invalidation');
      expect(result).toHaveProperty('hotKeys');
    });

    it('should include cache stats', async () => {
      const result = await controller.getDetailedStats();

      expect(result.cache).toEqual(mockCacheStats);
    });

    it('should include invalidation metrics', async () => {
      const result = await controller.getDetailedStats();

      expect(result.invalidation).toEqual(mockInvalidationMetrics);
    });

    it('should include hot keys stats', async () => {
      const result = await controller.getDetailedStats();

      expect(result.hotKeys).toHaveProperty('hits');
      expect(result.hotKeys).toHaveProperty('misses');
      expect(result.hotKeys).toHaveProperty('size');
    });
  });

  describe('POST /cache/stats/reset', () => {
    it('should reset all statistics', () => {
      controller.resetStats();

      expect(mockCacheService.resetStats).toHaveBeenCalled();
      expect(mockInvalidationService.resetMetrics).toHaveBeenCalled();
    });

    it('should return void', () => {
      const result = controller.resetStats();

      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // Cache Operations Tests
  // ==========================================================================

  describe('GET /cache/keys', () => {
    it('should list cache keys', async () => {
      const result = await controller.listKeys();

      expect(result).toBeInstanceOf(Array);
    });

    it('should filter keys by pattern', async () => {
      const result = await controller.listKeys('user:*');

      expect(result).toBeInstanceOf(Array);
    });

    it('should limit results', async () => {
      const result = await controller.listKeys(undefined, 10);

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should use default limit of 100', async () => {
      const result = await controller.listKeys();

      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /cache/key/:key', () => {
    it('should return cache entry when exists', async () => {
      mockCacheService.get.mockResolvedValue({ data: 'test' });

      const result = await controller.getKeyDetails('test-key');

      expect(result.exists).toBe(true);
      expect(result.value).toEqual({ data: 'test' });
      expect(result.type).toBe('object');
    });

    it('should indicate when key does not exist', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await controller.getKeyDetails('non-existent');

      expect(result.exists).toBe(false);
      expect(result.value).toBeUndefined();
      expect(result.type).toBeUndefined();
    });

    it('should return correct type for string value', async () => {
      mockCacheService.get.mockResolvedValue('string-value');

      const result = await controller.getKeyDetails('string-key');

      expect(result.type).toBe('string');
    });

    it('should return correct type for number value', async () => {
      mockCacheService.get.mockResolvedValue(42);

      const result = await controller.getKeyDetails('number-key');

      expect(result.type).toBe('number');
    });

    it('should return correct type for boolean value', async () => {
      mockCacheService.get.mockResolvedValue(true);

      const result = await controller.getKeyDetails('bool-key');

      expect(result.type).toBe('boolean');
    });
  });

  describe('DELETE /cache/key/:key', () => {
    it('should delete the specified key', async () => {
      await controller.deleteKey('delete-me');

      expect(mockCacheService.delete).toHaveBeenCalledWith('delete-me');
    });

    it('should return void', async () => {
      const result = await controller.deleteKey('key');

      expect(result).toBeUndefined();
    });
  });

  describe('POST /cache/clear', () => {
    it('should clear all cache entries', async () => {
      await controller.clearCache();

      expect(mockCacheService.clear).toHaveBeenCalled();
    });

    it('should return void', async () => {
      const result = await controller.clearCache();

      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // Invalidation Tests
  // ==========================================================================

  describe('POST /cache/invalidate/tag', () => {
    it('should invalidate by tag', async () => {
      const mockResult: InvalidationResult = {
        keysInvalidated: 10,
        keys: ['key1', 'key2'],
        duration: 5,
        cascaded: false,
      };
      mockInvalidationService.invalidateByTag.mockResolvedValue(mockResult);

      const result = await controller.invalidateByTag({ tag: CacheTag.FESTIVAL });

      expect(mockInvalidationService.invalidateByTag).toHaveBeenCalledWith(CacheTag.FESTIVAL);
      expect(result).toEqual(mockResult);
    });

    it('should support all cache tags', async () => {
      for (const tag of Object.values(CacheTag)) {
        mockInvalidationService.invalidateByTag.mockResolvedValue({
          keysInvalidated: 1,
          keys: [],
          duration: 1,
          cascaded: false,
        });

        const result = await controller.invalidateByTag({ tag: tag as CacheTag });

        expect(mockInvalidationService.invalidateByTag).toHaveBeenCalledWith(tag);
      }
    });
  });

  describe('POST /cache/invalidate/pattern', () => {
    it('should invalidate by pattern', async () => {
      const result = await controller.invalidateByPattern({ pattern: 'user:*' });

      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('user:*');
      expect(result).toEqual({
        pattern: 'user:*',
        invalidated: true,
      });
    });

    it('should handle complex patterns', async () => {
      const pattern = 'analytics:*:fest-123:*';

      const result = await controller.invalidateByPattern({ pattern });

      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(pattern);
      expect(result.pattern).toBe(pattern);
    });
  });

  describe('POST /cache/invalidate/festival', () => {
    it('should invalidate festival cache', async () => {
      const mockResult: InvalidationResult = {
        keysInvalidated: 50,
        keys: ['festival:fest-123:*'],
        duration: 10,
        cascaded: false,
      };
      mockInvalidationService.invalidateByFestival.mockResolvedValue(mockResult);

      const result = await controller.invalidateByFestival({ festivalId: 'fest-123' });

      expect(mockInvalidationService.invalidateByFestival).toHaveBeenCalledWith('fest-123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('POST /cache/invalidate/user', () => {
    it('should invalidate user cache', async () => {
      const mockResult: InvalidationResult = {
        keysInvalidated: 20,
        keys: ['user:user-123:*'],
        duration: 5,
        cascaded: false,
      };
      mockInvalidationService.invalidateByUser.mockResolvedValue(mockResult);

      const result = await controller.invalidateByUser({ userId: 'user-123' });

      expect(mockInvalidationService.invalidateByUser).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('POST /cache/invalidate/entity', () => {
    it('should invalidate entity cache', async () => {
      const mockResult: InvalidationResult = {
        keysInvalidated: 5,
        keys: ['entity:*'],
        duration: 2,
        cascaded: false,
      };
      mockInvalidationService.onEntityChange.mockResolvedValue(mockResult);

      const dto = {
        entityType: 'ticket',
        entityId: 'ticket-123',
        changeType: 'update' as const,
      };

      const result = await controller.invalidateEntity(dto);

      expect(mockInvalidationService.onEntityChange).toHaveBeenCalledWith({
        entityType: 'ticket',
        entityId: 'ticket-123',
        changeType: 'update',
        changedFields: undefined,
        context: undefined,
      });
      expect(result).toEqual(mockResult);
    });

    it('should pass changedFields', async () => {
      mockInvalidationService.onEntityChange.mockResolvedValue({
        keysInvalidated: 1,
        keys: [],
        duration: 1,
        cascaded: false,
      });

      const dto = {
        entityType: 'user',
        entityId: 'user-123',
        changeType: 'update' as const,
        changedFields: ['email', 'role'],
      };

      await controller.invalidateEntity(dto);

      expect(mockInvalidationService.onEntityChange).toHaveBeenCalledWith(
        expect.objectContaining({
          changedFields: ['email', 'role'],
        }),
      );
    });

    it('should pass context', async () => {
      mockInvalidationService.onEntityChange.mockResolvedValue({
        keysInvalidated: 1,
        keys: [],
        duration: 1,
        cascaded: false,
      });

      const dto = {
        entityType: 'ticket',
        entityId: 'ticket-123',
        changeType: 'create' as const,
        context: { festivalId: 'fest-456', userId: 'user-789' },
      };

      await controller.invalidateEntity(dto);

      expect(mockInvalidationService.onEntityChange).toHaveBeenCalledWith(
        expect.objectContaining({
          context: { festivalId: 'fest-456', userId: 'user-789' },
        }),
      );
    });

    it('should handle delete changeType', async () => {
      mockInvalidationService.onEntityChange.mockResolvedValue({
        keysInvalidated: 1,
        keys: [],
        duration: 1,
        cascaded: false,
      });

      const dto = {
        entityType: 'user',
        entityId: 'user-123',
        changeType: 'delete' as const,
      };

      await controller.invalidateEntity(dto);

      expect(mockInvalidationService.onEntityChange).toHaveBeenCalledWith(
        expect.objectContaining({
          changeType: 'delete',
        }),
      );
    });
  });

  // ==========================================================================
  // Health Tests
  // ==========================================================================

  describe('GET /cache/health', () => {
    it('should return health status', async () => {
      mockCacheService.get.mockResolvedValue('test');

      const result = await controller.getHealth();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('latency');
      expect(result).toHaveProperty('connected');
      expect(result).toHaveProperty('details');
    });

    it('should return healthy status when cache is working', async () => {
      mockCacheService.get.mockResolvedValue('test');
      mockCacheService.getStats.mockResolvedValue({
        ...mockCacheStats,
        connected: true,
        hitRate: 80,
      });

      const result = await controller.getHealth();

      expect(result.status).toBe('healthy');
    });

    it('should include details with keys, memory, and hitRate', async () => {
      const result = await controller.getHealth();

      expect(result.details).toHaveProperty('keys');
      expect(result.details).toHaveProperty('memory');
      expect(result.details).toHaveProperty('hitRate');
    });

    it('should handle unhealthy state', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.getStats.mockResolvedValue({
        ...mockCacheStats,
        connected: false,
      });

      const result = await controller.getHealth();

      expect(result.status).toBe('unhealthy');
    });

    it('should handle degraded state with low hit rate', async () => {
      mockCacheService.get.mockResolvedValue('test');
      mockCacheService.getStats.mockResolvedValue({
        ...mockCacheStats,
        connected: true,
        hitRate: 30, // Below 50%
      });

      const result = await controller.getHealth();

      expect(result.status).toBe('degraded');
    });
  });

  describe('GET /cache/health/latency', () => {
    it('should measure cache latency', async () => {
      const result = await controller.measureLatency();

      expect(result).toHaveProperty('read');
      expect(result).toHaveProperty('write');
      expect(result).toHaveProperty('delete');
      expect(result).toHaveProperty('unit');
      expect(result.unit).toBe('ms');
    });

    it('should call cache operations', async () => {
      await controller.measureLatency();

      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockCacheService.delete).toHaveBeenCalled();
    });

    it('should return latency in milliseconds', async () => {
      const result = await controller.measureLatency();

      expect(typeof result.read).toBe('number');
      expect(typeof result.write).toBe('number');
      expect(typeof result.delete).toBe('number');
      expect(result.read).toBeGreaterThanOrEqual(0);
      expect(result.write).toBeGreaterThanOrEqual(0);
      expect(result.delete).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Configuration Tests
  // ==========================================================================

  describe('GET /cache/dependencies', () => {
    it('should return registered dependencies', () => {
      const result = controller.getDependencies();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include source and targets', () => {
      const result = controller.getDependencies();

      result.forEach((dep) => {
        expect(dep).toHaveProperty('source');
        expect(dep).toHaveProperty('targets');
      });
    });

    it('should flatten nested dependencies', () => {
      mockInvalidationService.getDependencies.mockReturnValue(new Map([
        ['source:*', [
          { source: 'source:*', targets: ['target1:*', 'target2:*'] },
          { source: 'source:*', targets: ['target3:*'] },
        ]],
      ]));

      const result = controller.getDependencies();

      expect(result.length).toBe(2); // Two dependency entries
    });
  });

  describe('GET /cache/tags', () => {
    it('should return all available cache tags', () => {
      const result = controller.getTags();

      expect(result).toBeInstanceOf(Array);
      expect(result).toContain(CacheTag.FESTIVAL);
      expect(result).toContain(CacheTag.TICKET);
      expect(result).toContain(CacheTag.USER);
      expect(result).toContain(CacheTag.CASHLESS);
      expect(result).toContain(CacheTag.VENDOR);
      expect(result).toContain(CacheTag.ANALYTICS);
      expect(result).toContain(CacheTag.CONFIG);
      expect(result).toContain(CacheTag.SESSION);
    });

    it('should include all CacheTag enum values', () => {
      const result = controller.getTags();
      const enumValues = Object.values(CacheTag);

      expect(result.length).toBe(enumValues.length);
      enumValues.forEach((tag) => {
        expect(result).toContain(tag);
      });
    });
  });

  // ==========================================================================
  // Edge Cases and Error Handling Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty pattern in listKeys', async () => {
      const result = await controller.listKeys('');

      expect(result).toBeInstanceOf(Array);
    });

    it('should handle special characters in key', async () => {
      const specialKey = 'key:with:colons:and/slashes?query=1';
      mockCacheService.get.mockResolvedValue('value');

      const result = await controller.getKeyDetails(specialKey);

      expect(mockCacheService.get).toHaveBeenCalledWith(specialKey);
    });

    it('should handle very long keys', async () => {
      const longKey = 'k'.repeat(1000);
      mockCacheService.get.mockResolvedValue('value');

      const result = await controller.getKeyDetails(longKey);

      expect(result.exists).toBe(true);
    });

    it('should handle cache errors in health check', async () => {
      mockCacheService.set.mockRejectedValue(new Error('Cache error'));

      const result = await controller.getHealth();

      expect(result.status).toBe('unhealthy');
    });

    it('should handle empty dependencies map', () => {
      mockInvalidationService.getDependencies.mockReturnValue(new Map());

      const result = controller.getDependencies();

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // Pattern Matching Tests
  // ==========================================================================

  describe('pattern matching in listKeys', () => {
    beforeEach(() => {
      // The hot keys cache is empty by default since it's a new instance
    });

    it('should filter keys by simple pattern', async () => {
      const result = await controller.listKeys('user:*');

      expect(result).toBeInstanceOf(Array);
    });

    it('should filter keys by complex pattern', async () => {
      const result = await controller.listKeys('festival:*:tickets:*');

      expect(result).toBeInstanceOf(Array);
    });
  });

  // ==========================================================================
  // Concurrent Operations Tests
  // ==========================================================================

  describe('concurrent operations', () => {
    it('should handle concurrent stats requests', async () => {
      const results = await Promise.all([
        controller.getStats(),
        controller.getStats(),
        controller.getStats(),
      ]);

      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(result).toEqual(mockCacheStats);
      });
    });

    it('should handle concurrent invalidations', async () => {
      mockInvalidationService.invalidateByTag.mockResolvedValue({
        keysInvalidated: 1,
        keys: [],
        duration: 1,
        cascaded: false,
      });

      const tags = [CacheTag.FESTIVAL, CacheTag.USER, CacheTag.TICKET];
      const results = await Promise.all(
        tags.map((tag) => controller.invalidateByTag({ tag }))
      );

      expect(results.length).toBe(3);
    });
  });
});
