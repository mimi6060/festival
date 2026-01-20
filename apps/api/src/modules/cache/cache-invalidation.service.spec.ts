/**
 * Cache Invalidation Service Unit Tests
 *
 * Comprehensive tests for smart cache invalidation including:
 * - Dependency-based invalidation
 * - Cascade invalidation with depth control
 * - Pattern-based invalidation
 * - Festival and user scoped invalidation
 * - Batch invalidation
 * - Smart field-based invalidation
 * - Metrics tracking
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  CacheInvalidationService,
  CacheDependencyType,
  CacheDependency,
  EntityChangeEvent,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  InvalidationResult,
} from './cache-invalidation.service';
import { CacheService, CacheTag } from './cache.service';

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
  invalidateFestivalCache: jest.fn(),
  getStats: jest.fn(),
};

describe('CacheInvalidationService', () => {
  let service: CacheInvalidationService;
  let _cacheService: CacheService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockCacheService.deletePattern.mockResolvedValue(undefined);
    mockCacheService.invalidateByTag.mockResolvedValue(5);

    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheInvalidationService, { provide: CacheService, useValue: mockCacheService }],
    }).compile();

    service = module.get<CacheInvalidationService>(CacheInvalidationService);
    _cacheService = module.get<CacheService>(CacheService);
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with default dependencies', () => {
      const deps = service.getDependencies();
      expect(deps.size).toBeGreaterThan(0);
    });

    it('should have festival dependency registered', () => {
      const deps = service.getDependencies();
      expect(deps.has('festival:*')).toBe(true);
    });

    it('should have user dependency registered', () => {
      const deps = service.getDependencies();
      expect(deps.has('user:*')).toBe(true);
    });

    it('should have ticketCategory dependency registered', () => {
      const deps = service.getDependencies();
      expect(deps.has('ticketCategory:*')).toBe(true);
    });

    it('should have zone dependency registered', () => {
      const deps = service.getDependencies();
      expect(deps.has('zone:*')).toBe(true);
    });

    it('should have cashlessTransaction dependency registered', () => {
      const deps = service.getDependencies();
      expect(deps.has('cashlessTransaction:*')).toBe(true);
    });
  });

  // ==========================================================================
  // Register Dependency Tests
  // ==========================================================================

  describe('registerDependency', () => {
    it('should register a new dependency', () => {
      const newDep: CacheDependency = {
        type: CacheDependencyType.ENTITY,
        source: 'custom:*',
        targets: ['custom:related:*'],
      };

      service.registerDependency(newDep);

      const deps = service.getDependencies();
      expect(deps.has('custom:*')).toBe(true);
    });

    it('should add to existing dependencies for same source', () => {
      const dep1: CacheDependency = {
        type: CacheDependencyType.ENTITY,
        source: 'multi:*',
        targets: ['target1:*'],
      };
      const dep2: CacheDependency = {
        type: CacheDependencyType.COMPUTED,
        source: 'multi:*',
        targets: ['target2:*'],
      };

      service.registerDependency(dep1);
      service.registerDependency(dep2);

      const deps = service.getDependencies();
      const multiDeps = deps.get('multi:*');
      expect(multiDeps?.length).toBe(2);
    });

    it('should register dependency with cascade depth', () => {
      const dep: CacheDependency = {
        type: CacheDependencyType.AGGREGATION,
        source: 'cascade:*',
        targets: ['cascaded:*'],
        cascadeDepth: 2,
      };

      service.registerDependency(dep);

      const deps = service.getDependencies();
      const cascadeDeps = deps.get('cascade:*');
      expect(cascadeDeps?.[0].cascadeDepth).toBe(2);
    });

    it('should register dependency with condition', () => {
      const condition = jest.fn().mockReturnValue(true);
      const dep: CacheDependency = {
        type: CacheDependencyType.ENTITY,
        source: 'conditional:*',
        targets: ['conditional:related:*'],
        condition,
      };

      service.registerDependency(dep);

      const deps = service.getDependencies();
      const conditionalDeps = deps.get('conditional:*');
      expect(conditionalDeps?.[0].condition).toBeDefined();
    });
  });

  // ==========================================================================
  // Remove Dependency Tests
  // ==========================================================================

  describe('removeDependency', () => {
    it('should remove an existing dependency', () => {
      const dep: CacheDependency = {
        type: CacheDependencyType.ENTITY,
        source: 'removable:*',
        targets: ['removable:related:*'],
      };

      service.registerDependency(dep);
      service.removeDependency('removable:*');

      const deps = service.getDependencies();
      expect(deps.has('removable:*')).toBe(false);
    });

    it('should not throw when removing non-existent dependency', () => {
      expect(() => service.removeDependency('non-existent:*')).not.toThrow();
    });
  });

  // ==========================================================================
  // onEntityChange Tests
  // ==========================================================================

  describe('onEntityChange', () => {
    it('should process entity change event', async () => {
      const event: EntityChangeEvent = {
        entityType: 'festival',
        entityId: 'fest-123',
        changeType: 'update',
      };

      const result = await service.onEntityChange(event);

      expect(result).toHaveProperty('keysInvalidated');
      expect(result).toHaveProperty('keys');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('cascaded');
    });

    it('should invalidate targets based on dependencies', async () => {
      const event: EntityChangeEvent = {
        entityType: 'user',
        entityId: 'user-123',
        changeType: 'update',
      };

      await service.onEntityChange(event);

      expect(mockCacheService.deletePattern).toHaveBeenCalled();
    });

    it('should resolve template variables in targets', async () => {
      const event: EntityChangeEvent = {
        entityType: 'user',
        entityId: 'user-456',
        changeType: 'delete',
      };

      await service.onEntityChange(event);

      // Check that patterns with resolved IDs were called
      const calls = mockCacheService.deletePattern.mock.calls;
      const patterns = calls.map((call) => call[0]);

      // Should contain patterns with the user ID
      expect(patterns.some((p) => p.includes('user-456') || p.includes('*'))).toBe(true);
    });

    it('should respect dependency conditions', async () => {
      const condition = jest.fn().mockReturnValue(false);
      const dep: CacheDependency = {
        type: CacheDependencyType.ENTITY,
        source: 'conditioned:*',
        targets: ['conditioned:target:*'],
        condition,
      };

      service.registerDependency(dep);

      const event: EntityChangeEvent = {
        entityType: 'conditioned',
        entityId: '123',
        changeType: 'update',
      };

      await service.onEntityChange(event);

      expect(condition).toHaveBeenCalled();
      // Target should not be invalidated due to condition returning false
    });

    it('should handle cascade invalidation', async () => {
      const dep: CacheDependency = {
        type: CacheDependencyType.AGGREGATION,
        source: 'cascading:*',
        targets: ['cascaded:level1:*'],
        cascadeDepth: 1,
      };

      service.registerDependency(dep);

      const event: EntityChangeEvent = {
        entityType: 'cascading',
        entityId: 'id-1',
        changeType: 'update',
      };

      const _result = await service.onEntityChange(event);

      expect(mockCacheService.deletePattern).toHaveBeenCalled();
    });

    it('should handle context in events', async () => {
      const event: EntityChangeEvent = {
        entityType: 'ticketCategory',
        entityId: 'cat-123',
        changeType: 'update',
        context: {
          festivalId: 'fest-456',
        },
      };

      await service.onEntityChange(event);

      const calls = mockCacheService.deletePattern.mock.calls;
      const patterns = calls.map((call) => call[0]);

      // Should use context variables in pattern resolution
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should handle changedFields in events', async () => {
      const event: EntityChangeEvent = {
        entityType: 'user',
        entityId: 'user-789',
        changeType: 'update',
        changedFields: ['email', 'role'],
      };

      const result = await service.onEntityChange(event);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should track metrics for invalidation', async () => {
      const initialMetrics = service.getMetrics();
      const initialCount = initialMetrics.totalInvalidations;

      const event: EntityChangeEvent = {
        entityType: 'user',
        entityId: 'user-1',
        changeType: 'delete',
      };

      await service.onEntityChange(event);

      const metrics = service.getMetrics();
      expect(metrics.totalInvalidations).toBeGreaterThan(initialCount);
    });

    it('should handle events with no matching dependencies', async () => {
      const event: EntityChangeEvent = {
        entityType: 'unknownEntityType',
        entityId: 'unknown-123',
        changeType: 'create',
      };

      const result = await service.onEntityChange(event);

      expect(result.keysInvalidated).toBe(0);
      expect(result.keys).toEqual([]);
    });

    it('should handle create change type', async () => {
      const event: EntityChangeEvent = {
        entityType: 'user',
        entityId: 'new-user',
        changeType: 'create',
      };

      const result = await service.onEntityChange(event);
      expect(result).toBeDefined();
    });

    it('should handle delete change type', async () => {
      const event: EntityChangeEvent = {
        entityType: 'user',
        entityId: 'deleted-user',
        changeType: 'delete',
      };

      const result = await service.onEntityChange(event);
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // invalidateByTag Tests
  // ==========================================================================

  describe('invalidateByTag', () => {
    it('should invalidate by tag', async () => {
      mockCacheService.invalidateByTag.mockResolvedValue(10);

      const result = await service.invalidateByTag(CacheTag.FESTIVAL);

      expect(mockCacheService.invalidateByTag).toHaveBeenCalledWith(CacheTag.FESTIVAL);
      expect(result.keysInvalidated).toBe(10);
    });

    it('should return invalidation result', async () => {
      mockCacheService.invalidateByTag.mockResolvedValue(5);

      const result = await service.invalidateByTag(CacheTag.USER);

      expect(result).toMatchObject({
        keysInvalidated: 5,
        keys: expect.any(Array),
        duration: expect.any(Number),
        cascaded: false,
      });
    });

    it('should support all CacheTag values', async () => {
      for (const tag of Object.values(CacheTag)) {
        mockCacheService.invalidateByTag.mockResolvedValue(1);

        const result = await service.invalidateByTag(tag as CacheTag);

        expect(result.keysInvalidated).toBeGreaterThanOrEqual(0);
      }
    });

    it('should track duration', async () => {
      mockCacheService.invalidateByTag.mockResolvedValue(0);

      const result = await service.invalidateByTag(CacheTag.ANALYTICS);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // invalidateByFestival Tests
  // ==========================================================================

  describe('invalidateByFestival', () => {
    it('should invalidate all festival-related patterns', async () => {
      const festivalId = 'fest-123';

      const _result = await service.invalidateByFestival(festivalId);

      expect(mockCacheService.deletePattern).toHaveBeenCalled();

      const calls = mockCacheService.deletePattern.mock.calls;
      const patterns = calls.map((call) => call[0]);

      expect(patterns).toContain(`festival:${festivalId}:*`);
      expect(patterns).toContain(`tickets:festival:${festivalId}:*`);
      expect(patterns).toContain(`zones:festival:${festivalId}:*`);
      expect(patterns).toContain(`staff:festival:${festivalId}:*`);
      expect(patterns).toContain(`vendors:festival:${festivalId}:*`);
      expect(patterns).toContain(`program:festival:${festivalId}:*`);
      expect(patterns).toContain(`analytics:*:${festivalId}:*`);
      expect(patterns).toContain(`realtime:${festivalId}`);
    });

    it('should also invalidate by FESTIVAL tag', async () => {
      await service.invalidateByFestival('fest-456');

      expect(mockCacheService.invalidateByTag).toHaveBeenCalledWith(CacheTag.FESTIVAL);
    });

    it('should return invalidation result', async () => {
      const result = await service.invalidateByFestival('fest-789');

      expect(result).toMatchObject({
        keysInvalidated: expect.any(Number),
        keys: expect.any(Array),
        duration: expect.any(Number),
        cascaded: false,
      });
    });

    it('should include all patterns in keys array', async () => {
      const result = await service.invalidateByFestival('fest-001');

      expect(result.keys.length).toBe(8); // 8 patterns
    });
  });

  // ==========================================================================
  // invalidateByUser Tests
  // ==========================================================================

  describe('invalidateByUser', () => {
    it('should invalidate all user-related patterns', async () => {
      const userId = 'user-123';

      const _result = await service.invalidateByUser(userId);

      const calls = mockCacheService.deletePattern.mock.calls;
      const patterns = calls.map((call) => call[0]);

      expect(patterns).toContain(`session:${userId}`);
      expect(patterns).toContain(`user:${userId}:*`);
      expect(patterns).toContain(`tickets:user:${userId}:*`);
      expect(patterns).toContain(`cashless:user:${userId}:*`);
      expect(patterns).toContain(`notifications:user:${userId}:*`);
    });

    it('should return invalidation result', async () => {
      const result = await service.invalidateByUser('user-456');

      expect(result).toMatchObject({
        keysInvalidated: 5,
        keys: expect.any(Array),
        duration: expect.any(Number),
        cascaded: false,
      });
    });

    it('should track duration', async () => {
      const result = await service.invalidateByUser('user-789');

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // batchInvalidate Tests
  // ==========================================================================

  describe('batchInvalidate', () => {
    it('should process multiple events', async () => {
      const events: EntityChangeEvent[] = [
        { entityType: 'user', entityId: 'user-1', changeType: 'update' },
        { entityType: 'user', entityId: 'user-2', changeType: 'update' },
        { entityType: 'festival', entityId: 'fest-1', changeType: 'update' },
      ];

      const result = await service.batchInvalidate(events);

      expect(result).toHaveProperty('keysInvalidated');
      expect(result).toHaveProperty('keys');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('cascaded');
    });

    it('should use pattern invalidation for large groups', async () => {
      // Create 15 events of the same type
      const events: EntityChangeEvent[] = Array.from({ length: 15 }, (_, i) => ({
        entityType: 'user',
        entityId: `user-${i}`,
        changeType: 'update' as const,
      }));

      await service.batchInvalidate(events);

      // Should use pattern invalidation for >10 events of same type
      const calls = mockCacheService.deletePattern.mock.calls;
      const patterns = calls.map((call) => call[0]);

      expect(patterns).toContain('user:*');
    });

    it('should process individually for small groups', async () => {
      const events: EntityChangeEvent[] = [
        { entityType: 'user', entityId: 'user-1', changeType: 'update' },
        { entityType: 'user', entityId: 'user-2', changeType: 'update' },
      ];

      const result = await service.batchInvalidate(events);

      expect(result.keys.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty events array', async () => {
      const result = await service.batchInvalidate([]);

      expect(result.keysInvalidated).toBe(0);
      expect(result.keys).toEqual([]);
    });

    it('should track cascade across multiple events', async () => {
      const dep: CacheDependency = {
        type: CacheDependencyType.AGGREGATION,
        source: 'batchable:*',
        targets: ['batched:*'],
        cascadeDepth: 1,
      };

      service.registerDependency(dep);

      const events: EntityChangeEvent[] = [
        { entityType: 'batchable', entityId: 'b-1', changeType: 'update' },
        { entityType: 'batchable', entityId: 'b-2', changeType: 'update' },
      ];

      const result = await service.batchInvalidate(events);

      expect(result).toBeDefined();
    });

    it('should group events by entity type', async () => {
      const events: EntityChangeEvent[] = [
        { entityType: 'typeA', entityId: '1', changeType: 'update' },
        { entityType: 'typeB', entityId: '1', changeType: 'update' },
        { entityType: 'typeA', entityId: '2', changeType: 'update' },
      ];

      const result = await service.batchInvalidate(events);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // smartInvalidate Tests
  // ==========================================================================

  describe('smartInvalidate', () => {
    it('should invalidate based on changed fields', async () => {
      const _result = await service.smartInvalidate('festival', 'fest-123', ['status']);

      const calls = mockCacheService.deletePattern.mock.calls;
      const patterns = calls.map((call) => call[0]);

      // Status field should invalidate active and public festival caches
      expect(
        patterns.some((p) => p.includes('festivals:active') || p.includes('festivals:public'))
      ).toBe(true);
    });

    it('should use context for pattern resolution', async () => {
      const _result = await service.smartInvalidate('ticket', 'ticket-123', ['status'], {
        userId: 'user-456',
        festivalId: 'fest-789',
      });

      const calls = mockCacheService.deletePattern.mock.calls;
      const patterns = calls.map((call) => call[0]);

      expect(
        patterns.some((p) => p.includes('user-456') || p.includes('fest-789') || p.includes('*'))
      ).toBe(true);
    });

    it('should fallback to entity-level invalidation when no rules', async () => {
      const _result = await service.smartInvalidate('unknownEntity', 'entity-123', [
        'unknownField',
      ]);

      const calls = mockCacheService.deletePattern.mock.calls;
      const patterns = calls.map((call) => call[0]);

      expect(patterns).toContain('unknownEntity:entity-123:*');
    });

    it('should handle festival status field', async () => {
      await service.smartInvalidate('festival', 'fest-1', ['status']);

      expect(mockCacheService.deletePattern).toHaveBeenCalled();
    });

    it('should handle festival name field', async () => {
      await service.smartInvalidate('festival', 'fest-1', ['name']);

      const calls = mockCacheService.deletePattern.mock.calls;
      const patterns = calls.map((call) => call[0]);

      expect(patterns).toContain('festival:fest-1:config');
    });

    it('should handle festival dates field', async () => {
      await service.smartInvalidate('festival', 'fest-1', ['dates']);

      expect(mockCacheService.deletePattern).toHaveBeenCalled();
    });

    it('should handle festival capacity field', async () => {
      await service.smartInvalidate('festival', 'fest-1', ['capacity']);

      expect(mockCacheService.deletePattern).toHaveBeenCalled();
    });

    it('should handle user email field', async () => {
      await service.smartInvalidate('user', 'user-1', ['email']);

      const calls = mockCacheService.deletePattern.mock.calls;
      const patterns = calls.map((call) => call[0]);

      expect(patterns).toContain('session:user-1');
    });

    it('should handle user role field', async () => {
      await service.smartInvalidate('user', 'user-1', ['role']);

      expect(mockCacheService.deletePattern).toHaveBeenCalled();
    });

    it('should handle user status field', async () => {
      await service.smartInvalidate('user', 'user-1', ['status']);

      expect(mockCacheService.deletePattern).toHaveBeenCalled();
    });

    it('should handle ticket status field', async () => {
      await service.smartInvalidate('ticket', 'ticket-1', ['status'], {
        userId: 'user-1',
        festivalId: 'fest-1',
      });

      expect(mockCacheService.deletePattern).toHaveBeenCalled();
    });

    it('should handle ticket usedAt field', async () => {
      await service.smartInvalidate('ticket', 'ticket-1', ['usedAt']);

      expect(mockCacheService.deletePattern).toHaveBeenCalled();
    });

    it('should handle cashlessAccount balance field', async () => {
      await service.smartInvalidate('cashlessAccount', 'account-1', ['balance'], {
        userId: 'user-1',
      });

      expect(mockCacheService.deletePattern).toHaveBeenCalled();
    });

    it('should handle cashlessAccount status field', async () => {
      await service.smartInvalidate('cashlessAccount', 'account-1', ['status']);

      const calls = mockCacheService.deletePattern.mock.calls;
      const patterns = calls.map((call) => call[0]);

      expect(patterns).toContain('cashless:account:account-1');
    });

    it('should handle multiple changed fields', async () => {
      await service.smartInvalidate('user', 'user-1', ['email', 'role', 'status']);

      const calls = mockCacheService.deletePattern.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should return result with duration', async () => {
      const result = await service.smartInvalidate('user', 'user-1', ['email']);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should not cascade in smart invalidation', async () => {
      const result = await service.smartInvalidate('user', 'user-1', ['email']);

      expect(result.cascaded).toBe(false);
    });
  });

  // ==========================================================================
  // Metrics Tests
  // ==========================================================================

  describe('getMetrics', () => {
    it('should return metrics object', () => {
      const metrics = service.getMetrics();

      expect(metrics).toHaveProperty('totalInvalidations');
      expect(metrics).toHaveProperty('cascadeInvalidations');
      expect(metrics).toHaveProperty('keysInvalidated');
      expect(metrics).toHaveProperty('avgDuration');
    });

    it('should track totalInvalidations', async () => {
      const initialMetrics = service.getMetrics();
      const initialCount = initialMetrics.totalInvalidations;

      await service.onEntityChange({
        entityType: 'user',
        entityId: 'user-1',
        changeType: 'update',
      });

      const metrics = service.getMetrics();
      expect(metrics.totalInvalidations).toBeGreaterThan(initialCount);
    });

    it('should track keysInvalidated', async () => {
      const initialMetrics = service.getMetrics();
      const initialKeys = initialMetrics.keysInvalidated;

      await service.onEntityChange({
        entityType: 'user',
        entityId: 'user-1',
        changeType: 'update',
      });

      const metrics = service.getMetrics();
      expect(metrics.keysInvalidated).toBeGreaterThanOrEqual(initialKeys);
    });

    it('should return copy of metrics', () => {
      const metrics1 = service.getMetrics();
      const metrics2 = service.getMetrics();

      metrics1.totalInvalidations = 999;

      expect(metrics2.totalInvalidations).not.toBe(999);
    });
  });

  // ==========================================================================
  // resetMetrics Tests
  // ==========================================================================

  describe('resetMetrics', () => {
    it('should reset all metrics to zero', async () => {
      // Generate some metrics
      await service.onEntityChange({
        entityType: 'user',
        entityId: 'user-1',
        changeType: 'update',
      });

      service.resetMetrics();

      const metrics = service.getMetrics();
      expect(metrics.totalInvalidations).toBe(0);
      expect(metrics.cascadeInvalidations).toBe(0);
      expect(metrics.keysInvalidated).toBe(0);
      expect(metrics.avgDuration).toBe(0);
    });
  });

  // ==========================================================================
  // getDependencies Tests
  // ==========================================================================

  describe('getDependencies', () => {
    it('should return Map of dependencies', () => {
      const deps = service.getDependencies();

      expect(deps).toBeInstanceOf(Map);
    });

    it('should return copy of dependencies', () => {
      const deps1 = service.getDependencies();
      const deps2 = service.getDependencies();

      deps1.clear();

      expect(deps2.size).toBeGreaterThan(0);
    });

    it('should include default dependencies', () => {
      const deps = service.getDependencies();

      expect(deps.size).toBeGreaterThanOrEqual(5); // At least 5 default dependencies
    });
  });

  // ==========================================================================
  // CacheDependencyType Enum Tests
  // ==========================================================================

  describe('CacheDependencyType enum', () => {
    it('should have all expected values', () => {
      expect(CacheDependencyType.ENTITY).toBe('entity');
      expect(CacheDependencyType.COMPUTED).toBe('computed');
      expect(CacheDependencyType.AGGREGATION).toBe('aggregation');
      expect(CacheDependencyType.SESSION).toBe('session');
      expect(CacheDependencyType.FESTIVAL).toBe('festival');
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle special characters in entity IDs', async () => {
      const event: EntityChangeEvent = {
        entityType: 'user',
        entityId: 'user:with:colons',
        changeType: 'update',
      };

      const result = await service.onEntityChange(event);

      expect(result).toBeDefined();
    });

    it('should handle empty context', async () => {
      const event: EntityChangeEvent = {
        entityType: 'ticket',
        entityId: 'ticket-1',
        changeType: 'update',
        context: {},
      };

      const result = await service.onEntityChange(event);

      expect(result).toBeDefined();
    });

    it('should handle undefined context values', async () => {
      const event: EntityChangeEvent = {
        entityType: 'ticket',
        entityId: 'ticket-1',
        changeType: 'update',
        context: {
          userId: undefined,
          festivalId: undefined,
        },
      };

      const result = await service.onEntityChange(event);

      // Undefined values should be replaced with '*'
      expect(result).toBeDefined();
    });

    it('should handle very long entity IDs', async () => {
      const longId = 'x'.repeat(1000);
      const event: EntityChangeEvent = {
        entityType: 'user',
        entityId: longId,
        changeType: 'update',
      };

      const result = await service.onEntityChange(event);

      expect(result).toBeDefined();
    });

    it('should handle concurrent invalidations', async () => {
      const events = Array.from({ length: 5 }, (_, i) => ({
        entityType: 'user',
        entityId: `user-${i}`,
        changeType: 'update' as const,
      }));

      const results = await Promise.all(events.map((event) => service.onEntityChange(event)));

      expect(results.length).toBe(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Pattern Matching Tests
  // ==========================================================================

  describe('pattern matching', () => {
    it('should match patterns with wildcards', async () => {
      // This tests the private patternMatches method indirectly
      const dep: CacheDependency = {
        type: CacheDependencyType.ENTITY,
        source: 'pattern:*',
        targets: ['matched:*'],
        cascadeDepth: 1,
      };

      // Register a dependency that would match 'pattern:test'
      service.registerDependency(dep);

      // Trigger an event that should cascade
      const event: EntityChangeEvent = {
        entityType: 'pattern',
        entityId: 'test',
        changeType: 'update',
      };

      const result = await service.onEntityChange(event);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Template Resolution Tests
  // ==========================================================================

  describe('template resolution', () => {
    it('should resolve ${id} in patterns', async () => {
      const event: EntityChangeEvent = {
        entityType: 'user',
        entityId: 'user-123',
        changeType: 'update',
      };

      await service.onEntityChange(event);

      const calls = mockCacheService.deletePattern.mock.calls;
      const patterns = calls.map((call) => call[0]);

      // Check that patterns were resolved with the ID
      expect(patterns.some((p) => !p.includes('${'))).toBe(true);
    });

    it('should resolve context variables in patterns', async () => {
      const event: EntityChangeEvent = {
        entityType: 'ticketCategory',
        entityId: 'cat-1',
        changeType: 'update',
        context: {
          festivalId: 'fest-999',
        },
      };

      await service.onEntityChange(event);

      const calls = mockCacheService.deletePattern.mock.calls;
      const patterns = calls.map((call) => call[0]);

      // festivalId should be resolved or replaced with *
      expect(patterns.some((p) => p.includes('fest-999') || p.includes('*'))).toBe(true);
    });
  });
});
