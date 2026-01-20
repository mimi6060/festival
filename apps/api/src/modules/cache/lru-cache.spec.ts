/**
 * LRU Cache Unit Tests
 *
 * Comprehensive tests for LRU (Least Recently Used) cache implementation:
 * - Core operations (get, set, delete, clear)
 * - LRU eviction behavior
 * - TTL expiration
 * - Statistics tracking
 * - Pattern matching (PatternLRUCache)
 * - Edge cases
 */

import {
  LRUCache,
  PatternLRUCache,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  LRUCacheOptions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  LRUStats,
  EvictionReason,
} from './lru-cache';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new LRUCache<string>({ maxSize: 5 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create cache with specified maxSize', () => {
      const c = new LRUCache({ maxSize: 10 });
      expect(c).toBeDefined();
      const stats = c.getStats();
      expect(stats.maxSize).toBe(10);
    });

    it('should use default updateOnGet as true', () => {
      const c = new LRUCache({ maxSize: 5 });
      c.set('a', 'value');
      c.set('b', 'value');
      c.get('a'); // Should move 'a' to most recently used
      c.set('c', 'value');
      c.set('d', 'value');
      c.set('e', 'value');
      c.set('f', 'value'); // Should evict 'b', not 'a'
      expect(c.get('a')).toBe('value');
      expect(c.get('b')).toBeUndefined();
    });

    it('should accept updateOnGet option', () => {
      const c = new LRUCache({ maxSize: 5, updateOnGet: false });
      c.set('a', 'value');
      c.set('b', 'value');
      c.get('a'); // Should NOT move 'a'
      c.set('c', 'value');
      c.set('d', 'value');
      c.set('e', 'value');
      c.set('f', 'value'); // Should evict 'a' since it wasn't moved
      expect(c.get('a')).toBeUndefined();
      expect(c.get('b')).toBe('value');
    });

    it('should accept defaultTtl option', () => {
      const c = new LRUCache({ maxSize: 5, defaultTtl: 1000 }); // 1 second
      c.set('key', 'value');

      expect(c.get('key')).toBe('value');

      jest.advanceTimersByTime(1500);

      expect(c.get('key')).toBeUndefined();
    });

    it('should accept onEvict callback option', () => {
      const onEvict = jest.fn();
      const c = new LRUCache({ maxSize: 2, onEvict });

      c.set('a', 'value-a');
      c.set('b', 'value-b');
      c.set('c', 'value-c'); // Should evict 'a'

      expect(onEvict).toHaveBeenCalledWith('a', 'value-a', EvictionReason.SIZE_LIMIT);
    });
  });

  // ==========================================================================
  // GET Operation Tests
  // ==========================================================================

  describe('get', () => {
    it('should return undefined for non-existent key', () => {
      const result = cache.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should return value for existing key', () => {
      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');
    });

    it('should track cache misses', () => {
      cache.get('miss-1');
      cache.get('miss-2');

      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
    });

    it('should track cache hits', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.get('key');

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });

    it('should return undefined for expired entries', () => {
      cache.set('expiring', 'value', 1000); // 1 second TTL

      expect(cache.get('expiring')).toBe('value');

      jest.advanceTimersByTime(1500);

      expect(cache.get('expiring')).toBeUndefined();
    });

    it('should track miss for expired entry access', () => {
      cache.set('expiring', 'value', 1000);
      jest.advanceTimersByTime(1500);
      cache.get('expiring');

      const stats = cache.getStats();
      expect(stats.misses).toBeGreaterThanOrEqual(1);
    });

    it('should update lastAccessed time on get', () => {
      cache.set('key', 'value');
      const initialTime = Date.now();

      jest.advanceTimersByTime(1000);
      cache.get('key');

      const entries = cache.entries();
      const entry = entries.find((e) => e.key === 'key');
      expect(entry?.metadata.lastAccessed).toBeGreaterThanOrEqual(initialTime + 1000);
    });

    it('should increment accessCount on get', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.get('key');
      cache.get('key');

      const entries = cache.entries();
      const entry = entries.find((e) => e.key === 'key');
      expect(entry?.metadata.accessCount).toBe(4); // 1 from set + 3 from gets
    });

    it('should move accessed item to most recently used position', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.get('a'); // Move 'a' to end

      const keys = cache.keys();
      expect(keys[keys.length - 1]).toBe('a');
    });
  });

  // ==========================================================================
  // SET Operation Tests
  // ==========================================================================

  describe('set', () => {
    it('should store value in cache', () => {
      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');
    });

    it('should accept optional TTL', () => {
      cache.set('with-ttl', 'value', 5000);
      expect(cache.get('with-ttl')).toBe('value');

      jest.advanceTimersByTime(6000);
      expect(cache.get('with-ttl')).toBeUndefined();
    });

    it('should use defaultTtl when no TTL provided', () => {
      const c = new LRUCache({ maxSize: 5, defaultTtl: 2000 });
      c.set('key', 'value');

      jest.advanceTimersByTime(1500);
      expect(c.get('key')).toBe('value');

      jest.advanceTimersByTime(1000);
      expect(c.get('key')).toBeUndefined();
    });

    it('should set null expiry when no TTL and no defaultTtl', () => {
      cache.set('no-expiry', 'value');

      jest.advanceTimersByTime(100000000); // Very long time
      expect(cache.get('no-expiry')).toBe('value');
    });

    it('should overwrite existing value', () => {
      cache.set('key', 'original');
      cache.set('key', 'updated');

      expect(cache.get('key')).toBe('updated');
    });

    it('should notify onEvict callback when replacing value', () => {
      const onEvict = jest.fn();
      const c = new LRUCache({ maxSize: 5, onEvict });

      c.set('key', 'original');
      c.set('key', 'updated');

      expect(onEvict).toHaveBeenCalledWith('key', 'original', EvictionReason.REPLACED);
    });

    it('should evict LRU item when at capacity', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.set('d', '4');
      cache.set('e', '5');
      cache.set('f', '6'); // Should evict 'a'

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('f')).toBe('6');
    });

    it('should call onEvict with SIZE_LIMIT reason when evicting', () => {
      const onEvict = jest.fn();
      const c = new LRUCache({ maxSize: 2, onEvict });

      c.set('a', '1');
      c.set('b', '2');
      c.set('c', '3'); // Evicts 'a'

      expect(onEvict).toHaveBeenCalledWith('a', '1', EvictionReason.SIZE_LIMIT);
    });

    it('should initialize accessCount to 1', () => {
      cache.set('key', 'value');

      const entries = cache.entries();
      const entry = entries.find((e) => e.key === 'key');
      expect(entry?.metadata.accessCount).toBe(1);
    });

    it('should set createdAt timestamp', () => {
      const beforeSet = Date.now();
      cache.set('key', 'value');
      const afterSet = Date.now();

      const entries = cache.entries();
      const entry = entries.find((e) => e.key === 'key');
      expect(entry?.metadata.createdAt).toBeGreaterThanOrEqual(beforeSet);
      expect(entry?.metadata.createdAt).toBeLessThanOrEqual(afterSet);
    });

    it('should estimate size of stored value', () => {
      cache.set('key', 'small value');

      const entries = cache.entries();
      const entry = entries.find((e) => e.key === 'key');
      expect(entry?.metadata.size).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // HAS Operation Tests
  // ==========================================================================

  describe('has', () => {
    it('should return false for non-existent key', () => {
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should return true for existing key', () => {
      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);
    });

    it('should return false for expired key', () => {
      cache.set('expiring', 'value', 1000);

      jest.advanceTimersByTime(1500);

      expect(cache.has('expiring')).toBe(false);
    });

    it('should not update access order', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.has('a'); // Should NOT move 'a'

      const keys = cache.keys();
      expect(keys[0]).toBe('a');
      expect(keys[1]).toBe('b');
    });
  });

  // ==========================================================================
  // PEEK Operation Tests
  // ==========================================================================

  describe('peek', () => {
    it('should return undefined for non-existent key', () => {
      expect(cache.peek('non-existent')).toBeUndefined();
    });

    it('should return value without updating order', () => {
      cache.set('a', '1');
      cache.set('b', '2');

      const value = cache.peek('a');

      expect(value).toBe('1');
      expect(cache.keys()[0]).toBe('a'); // 'a' should still be first
    });

    it('should return undefined for expired key', () => {
      cache.set('expiring', 'value', 1000);

      jest.advanceTimersByTime(1500);

      expect(cache.peek('expiring')).toBeUndefined();
    });

    it('should not increment accessCount', () => {
      cache.set('key', 'value');
      cache.peek('key');
      cache.peek('key');

      // accessCount should still be 1 (from initial set)
      const entries = cache.entries();
      const entry = entries.find((e) => e.key === 'key');
      expect(entry?.metadata.accessCount).toBe(1);
    });
  });

  // ==========================================================================
  // DELETE Operation Tests
  // ==========================================================================

  describe('delete', () => {
    it('should delete existing key', () => {
      cache.set('key', 'value');
      const result = cache.delete('key');

      expect(result).toBe(true);
      expect(cache.get('key')).toBeUndefined();
    });

    it('should return false for non-existent key', () => {
      const result = cache.delete('non-existent');
      expect(result).toBe(false);
    });

    it('should call onEvict with MANUAL reason by default', () => {
      const onEvict = jest.fn();
      const c = new LRUCache({ maxSize: 5, onEvict });

      c.set('key', 'value');
      c.delete('key');

      expect(onEvict).toHaveBeenCalledWith('key', 'value', EvictionReason.MANUAL);
    });

    it('should call onEvict with EXPIRED reason when specified', () => {
      const onEvict = jest.fn();
      const c = new LRUCache({ maxSize: 5, onEvict });

      c.set('key', 'value');
      c.delete('key', EvictionReason.EXPIRED);

      expect(onEvict).toHaveBeenCalledWith('key', 'value', EvictionReason.EXPIRED);
    });

    it('should increment evictions counter for SIZE_LIMIT', () => {
      cache.set('a', '1');
      cache.set('b', '2');

      cache.delete('a', EvictionReason.SIZE_LIMIT);

      const stats = cache.getStats();
      expect(stats.evictions).toBe(1);
    });

    it('should increment evictions counter for EXPIRED', () => {
      cache.set('a', '1');
      cache.delete('a', EvictionReason.EXPIRED);

      const stats = cache.getStats();
      expect(stats.evictions).toBe(1);
    });

    it('should not increment evictions for MANUAL delete', () => {
      cache.set('a', '1');
      cache.delete('a', EvictionReason.MANUAL);

      const stats = cache.getStats();
      expect(stats.evictions).toBe(0);
    });

    it('should not call onEvict for REPLACED reason', () => {
      const onEvict = jest.fn();
      const c = new LRUCache({ maxSize: 5, onEvict });

      c.set('key', 'value');
      c.delete('key', EvictionReason.REPLACED);

      expect(onEvict).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // CLEAR Operation Tests
  // ==========================================================================

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBeUndefined();
    });

    it('should call onEvict for each entry', () => {
      const onEvict = jest.fn();
      const c = new LRUCache({ maxSize: 5, onEvict });

      c.set('a', '1');
      c.set('b', '2');
      c.clear();

      expect(onEvict).toHaveBeenCalledWith('a', '1', EvictionReason.MANUAL);
      expect(onEvict).toHaveBeenCalledWith('b', '2', EvictionReason.MANUAL);
    });

    it('should reset statistics', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.get('missing');

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });

  // ==========================================================================
  // KEYS Operation Tests
  // ==========================================================================

  describe('keys', () => {
    it('should return empty array for empty cache', () => {
      expect(cache.keys()).toEqual([]);
    });

    it('should return all keys', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      const keys = cache.keys();
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
    });

    it('should return keys in LRU order', () => {
      cache.set('first', '1');
      cache.set('second', '2');
      cache.set('third', '3');

      const keys = cache.keys();
      expect(keys).toEqual(['first', 'second', 'third']);
    });
  });

  // ==========================================================================
  // VALUES Operation Tests
  // ==========================================================================

  describe('values', () => {
    it('should return empty array for empty cache', () => {
      expect(cache.values()).toEqual([]);
    });

    it('should return all values', () => {
      cache.set('a', 'value-a');
      cache.set('b', 'value-b');

      const values = cache.values();
      expect(values).toContain('value-a');
      expect(values).toContain('value-b');
    });

    it('should exclude expired entries', () => {
      cache.set('valid', 'valid-value');
      cache.set('expiring', 'expiring-value', 1000);

      jest.advanceTimersByTime(1500);

      const values = cache.values();
      expect(values).toContain('valid-value');
      expect(values).not.toContain('expiring-value');
    });

    it('should delete expired entries when iterating', () => {
      cache.set('expiring', 'value', 1000);

      jest.advanceTimersByTime(1500);

      cache.values();

      expect(cache.size).toBe(0);
    });
  });

  // ==========================================================================
  // ENTRIES Operation Tests
  // ==========================================================================

  describe('entries', () => {
    it('should return empty array for empty cache', () => {
      expect(cache.entries()).toEqual([]);
    });

    it('should return entries with metadata', () => {
      cache.set('key', 'value');

      const entries = cache.entries();
      expect(entries.length).toBe(1);
      expect(entries[0].key).toBe('key');
      expect(entries[0].value).toBe('value');
      expect(entries[0].metadata).toHaveProperty('accessCount');
      expect(entries[0].metadata).toHaveProperty('lastAccessed');
      expect(entries[0].metadata).toHaveProperty('createdAt');
      expect(entries[0].metadata).toHaveProperty('size');
      expect(entries[0].metadata).toHaveProperty('expiry');
    });

    it('should exclude expired entries', () => {
      cache.set('valid', 'valid-value');
      cache.set('expiring', 'expiring-value', 1000);

      jest.advanceTimersByTime(1500);

      const entries = cache.entries();
      expect(entries.length).toBe(1);
      expect(entries[0].key).toBe('valid');
    });
  });

  // ==========================================================================
  // SIZE Property Tests
  // ==========================================================================

  describe('size', () => {
    it('should return 0 for empty cache', () => {
      expect(cache.size).toBe(0);
    });

    it('should return correct count', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      expect(cache.size).toBe(3);
    });

    it('should update after deletion', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.delete('a');

      expect(cache.size).toBe(1);
    });

    it('should not exceed maxSize', () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }

      expect(cache.size).toBe(5); // maxSize is 5
    });
  });

  // ==========================================================================
  // STATS Tests
  // ==========================================================================

  describe('getStats', () => {
    it('should return initial stats', () => {
      const stats = cache.getStats();

      expect(stats).toMatchObject({
        size: 0,
        maxSize: 5,
        hits: 0,
        misses: 0,
        evictions: 0,
        hitRate: 0,
        avgAccessCount: 0,
        oldestKey: null,
        newestKey: null,
      });
    });

    it('should calculate hitRate correctly', () => {
      cache.set('key', 'value');
      cache.get('key'); // hit
      cache.get('key'); // hit
      cache.get('missing'); // miss

      const stats = cache.getStats();
      // 2 hits, 1 miss = 66.67%
      expect(stats.hitRate).toBeCloseTo(66.67, 1);
    });

    it('should track avgAccessCount', () => {
      cache.set('a', '1'); // accessCount = 1
      cache.set('b', '2'); // accessCount = 1
      cache.get('a'); // accessCount = 2
      cache.get('a'); // accessCount = 3

      const stats = cache.getStats();
      // (3 + 1) / 2 = 2
      expect(stats.avgAccessCount).toBe(2);
    });

    it('should identify oldest and newest keys', () => {
      cache.set('first', '1');
      jest.advanceTimersByTime(1000);
      cache.set('second', '2');
      jest.advanceTimersByTime(1000);
      cache.set('third', '3');

      const stats = cache.getStats();
      expect(stats.oldestKey).toBe('first');
      expect(stats.newestKey).toBe('third');
    });

    it('should track evictions', () => {
      for (let i = 0; i < 8; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }

      const stats = cache.getStats();
      expect(stats.evictions).toBe(3); // 8 - 5 = 3 evictions
    });
  });

  // ==========================================================================
  // RESET STATS Tests
  // ==========================================================================

  describe('resetStats', () => {
    it('should reset all counters', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.get('missing');

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });

  // ==========================================================================
  // PRUNE Tests
  // ==========================================================================

  describe('prune', () => {
    it('should remove expired entries', () => {
      cache.set('expiring1', 'value1', 1000);
      cache.set('expiring2', 'value2', 1000);
      cache.set('valid', 'value3', 10000);

      jest.advanceTimersByTime(1500);

      const pruned = cache.prune();

      expect(pruned).toBe(2);
      expect(cache.size).toBe(1);
      expect(cache.get('valid')).toBe('value3');
    });

    it('should return 0 when no expired entries', () => {
      cache.set('a', '1');
      cache.set('b', '2');

      const pruned = cache.prune();
      expect(pruned).toBe(0);
    });

    it('should call onEvict with EXPIRED reason', () => {
      const onEvict = jest.fn();
      const c = new LRUCache({ maxSize: 5, onEvict });

      c.set('expiring', 'value', 1000);
      jest.advanceTimersByTime(1500);
      c.prune();

      expect(onEvict).toHaveBeenCalledWith('expiring', 'value', EvictionReason.EXPIRED);
    });
  });

  // ==========================================================================
  // RESIZE Tests
  // ==========================================================================

  describe('resize', () => {
    it('should update maxSize', () => {
      cache.resize(10);

      const stats = cache.getStats();
      expect(stats.maxSize).toBe(10);
    });

    it('should evict entries when resizing smaller', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.set('d', '4');
      cache.set('e', '5');

      cache.resize(2);

      expect(cache.size).toBe(2);
    });

    it('should evict LRU entries when resizing', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.get('a'); // Make 'a' most recently used

      cache.resize(1);

      expect(cache.get('a')).toBe('1');
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBeUndefined();
    });
  });

  // ==========================================================================
  // GET TTL Tests
  // ==========================================================================

  describe('getTtl', () => {
    it('should return null for non-existent key', () => {
      expect(cache.getTtl('non-existent')).toBeNull();
    });

    it('should return null for entry without TTL', () => {
      cache.set('no-ttl', 'value');
      expect(cache.getTtl('no-ttl')).toBeNull();
    });

    it('should return remaining TTL', () => {
      cache.set('with-ttl', 'value', 5000);

      jest.advanceTimersByTime(2000);

      const ttl = cache.getTtl('with-ttl');
      expect(ttl).toBeGreaterThan(2500);
      expect(ttl).toBeLessThanOrEqual(3000);
    });

    it('should return 0 when TTL has expired', () => {
      cache.set('expired', 'value', 1000);

      jest.advanceTimersByTime(1500);

      expect(cache.getTtl('expired')).toBe(0);
    });
  });

  // ==========================================================================
  // TOUCH Tests
  // ==========================================================================

  describe('touch', () => {
    it('should return false for non-existent key', () => {
      expect(cache.touch('non-existent')).toBe(false);
    });

    it('should update lastAccessed time', () => {
      cache.set('key', 'value');
      const initialTime = Date.now();

      jest.advanceTimersByTime(1000);
      cache.touch('key');

      const entries = cache.entries();
      const entry = entries.find((e) => e.key === 'key');
      expect(entry?.metadata.lastAccessed).toBeGreaterThanOrEqual(initialTime + 1000);
    });

    it('should move entry to most recently used position', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      cache.touch('a');

      const keys = cache.keys();
      expect(keys[keys.length - 1]).toBe('a');
    });

    it('should update TTL when provided', () => {
      cache.set('key', 'value', 5000);

      jest.advanceTimersByTime(3000);
      cache.touch('key', 10000); // Extend TTL

      jest.advanceTimersByTime(7000); // 10 seconds from touch

      expect(cache.get('key')).toBe('value');
    });

    it('should return true on success', () => {
      cache.set('key', 'value');
      expect(cache.touch('key')).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty string key', () => {
      cache.set('', 'empty-key-value');
      expect(cache.get('')).toBe('empty-key-value');
    });

    it('should handle empty string value', () => {
      cache.set('key', '');
      expect(cache.get('key')).toBe('');
    });

    it('should handle special characters in keys', () => {
      const specialKey = 'key:with:colons:and/slashes?query=1&foo=bar';
      cache.set(specialKey, 'value');
      expect(cache.get(specialKey)).toBe('value');
    });

    it('should estimate size of complex objects', () => {
      const c = new LRUCache<object>({ maxSize: 5 });
      c.set('obj', { nested: { deep: { value: 'test' } } });

      const entries = c.entries();
      expect(entries[0].metadata.size).toBeGreaterThan(0);
    });

    it('should handle objects with circular references (size estimation)', () => {
      const c = new LRUCache<any>({ maxSize: 5 });
      const circular: any = { name: 'test' };
      circular.self = circular;

      // Should not throw
      c.set('circular', circular);

      // Size should be 0 since JSON.stringify fails
      const entries = c.entries();
      expect(entries[0].metadata.size).toBe(0);
    });

    it('should handle maxSize of 1', () => {
      const c = new LRUCache({ maxSize: 1 });
      c.set('a', '1');
      c.set('b', '2');

      expect(c.size).toBe(1);
      expect(c.get('a')).toBeUndefined();
      expect(c.get('b')).toBe('2');
    });
  });
});

// =============================================================================
// PatternLRUCache Tests
// =============================================================================

describe('PatternLRUCache', () => {
  let cache: PatternLRUCache<string>;

  beforeEach(() => {
    cache = new PatternLRUCache<string>({ maxSize: 10 });
  });

  // ==========================================================================
  // DELETE PATTERN Tests
  // ==========================================================================

  describe('deletePattern', () => {
    it('should delete all keys matching pattern', () => {
      cache.set('user:1:profile', 'profile1');
      cache.set('user:2:profile', 'profile2');
      cache.set('user:1:settings', 'settings1');
      cache.set('other:key', 'other');

      const deleted = cache.deletePattern('user:*');

      expect(deleted).toBe(3);
      expect(cache.get('user:1:profile')).toBeUndefined();
      expect(cache.get('user:2:profile')).toBeUndefined();
      expect(cache.get('user:1:settings')).toBeUndefined();
      expect(cache.get('other:key')).toBe('other');
    });

    it('should handle pattern with no matches', () => {
      cache.set('key1', 'value1');

      const deleted = cache.deletePattern('nomatch:*');

      expect(deleted).toBe(0);
      expect(cache.get('key1')).toBe('value1');
    });

    it('should support wildcards at end', () => {
      cache.set('prefix:a', '1');
      cache.set('prefix:b', '2');
      cache.set('other', '3');

      const deleted = cache.deletePattern('prefix:*');

      expect(deleted).toBe(2);
    });

    it('should support wildcards at beginning', () => {
      cache.set('a:suffix', '1');
      cache.set('b:suffix', '2');
      cache.set('other', '3');

      const deleted = cache.deletePattern('*:suffix');

      expect(deleted).toBe(2);
    });

    it('should support wildcards in middle', () => {
      cache.set('start:middle:end', '1');
      cache.set('start:other:end', '2');
      cache.set('start:middle:other', '3');

      const deleted = cache.deletePattern('start:*:end');

      expect(deleted).toBe(2);
    });

    it('should support multiple wildcards', () => {
      cache.set('a:1:x', '1');
      cache.set('b:2:y', '2');
      cache.set('c:3:z', '3');

      const deleted = cache.deletePattern('*:*:*');

      expect(deleted).toBe(3);
    });

    it('should handle exact match (no wildcards)', () => {
      cache.set('exact:key', '1');
      cache.set('exact:key:more', '2');

      const deleted = cache.deletePattern('exact:key');

      expect(deleted).toBe(1);
      expect(cache.get('exact:key')).toBeUndefined();
      expect(cache.get('exact:key:more')).toBe('2');
    });
  });

  // ==========================================================================
  // KEYS MATCHING Tests
  // ==========================================================================

  describe('keysMatching', () => {
    it('should return keys matching pattern', () => {
      cache.set('user:1:profile', 'profile1');
      cache.set('user:2:profile', 'profile2');
      cache.set('other:key', 'other');

      const keys = cache.keysMatching('user:*');

      expect(keys).toContain('user:1:profile');
      expect(keys).toContain('user:2:profile');
      expect(keys).not.toContain('other:key');
    });

    it('should return empty array for no matches', () => {
      cache.set('key1', 'value1');

      const keys = cache.keysMatching('nomatch:*');

      expect(keys).toEqual([]);
    });

    it('should support various patterns', () => {
      cache.set('a:b:c', '1');
      cache.set('a:x:c', '2');
      cache.set('a:b:d', '3');

      expect(cache.keysMatching('a:b:*').length).toBe(2);
      expect(cache.keysMatching('a:*:c').length).toBe(2);
      expect(cache.keysMatching('*:b:c').length).toBe(1);
    });
  });

  // ==========================================================================
  // GET MATCHING Tests
  // ==========================================================================

  describe('getMatching', () => {
    it('should return values for matching keys', () => {
      cache.set('user:1', 'user1');
      cache.set('user:2', 'user2');
      cache.set('other', 'other');

      const values = cache.getMatching('user:*');

      expect(values).toContain('user1');
      expect(values).toContain('user2');
      expect(values).not.toContain('other');
    });

    it('should return empty array for no matches', () => {
      cache.set('key', 'value');

      const values = cache.getMatching('nomatch:*');

      expect(values).toEqual([]);
    });

    it('should skip undefined values', () => {
      cache.set('user:1', 'user1');
      cache.set('user:2', 'user2', 1); // Very short TTL

      jest.useFakeTimers();
      jest.advanceTimersByTime(1500);

      const values = cache.getMatching('user:*');

      // Only user1 should remain
      expect(values.length).toBe(1);
      expect(values).toContain('user1');

      jest.useRealTimers();
    });

    it('should update access order when getting values', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      cache.getMatching('a'); // Access 'a'

      const keys = cache.keys();
      expect(keys[keys.length - 1]).toBe('a');
    });
  });

  // ==========================================================================
  // Inheritance Tests
  // ==========================================================================

  describe('inheritance', () => {
    it('should inherit all LRUCache functionality', () => {
      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');
      expect(cache.has('key')).toBe(true);
      expect(cache.size).toBe(1);

      cache.delete('key');
      expect(cache.get('key')).toBeUndefined();
    });

    it('should support LRU eviction', () => {
      const smallCache = new PatternLRUCache<string>({ maxSize: 2 });
      smallCache.set('a', '1');
      smallCache.set('b', '2');
      smallCache.set('c', '3');

      expect(smallCache.get('a')).toBeUndefined();
      expect(smallCache.get('b')).toBe('2');
      expect(smallCache.get('c')).toBe('3');
    });
  });
});

// =============================================================================
// EvictionReason Enum Tests
// =============================================================================

describe('EvictionReason enum', () => {
  it('should have all expected values', () => {
    expect(EvictionReason.EXPIRED).toBe('expired');
    expect(EvictionReason.SIZE_LIMIT).toBe('size_limit');
    expect(EvictionReason.MANUAL).toBe('manual');
    expect(EvictionReason.REPLACED).toBe('replaced');
  });
});
