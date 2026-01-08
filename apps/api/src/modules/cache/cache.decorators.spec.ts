/**
 * Cache Decorators Unit Tests
 *
 * Comprehensive tests for cache decorators including:
 * - @Cacheable, @CacheEvict, @CachePut, @InvalidateTags
 * - @MultiLevelCache, @BatchCacheable, @StaleWhileRevalidate
 * - @CacheLock, @ConditionalCache, @CacheConfig
 * - generateCacheKey utility function
 * - Metadata key constants
 */

import 'reflect-metadata';
import {
  Cacheable,
  CacheEvict,
  CachePut,
  InvalidateTags,
  MultiLevelCache,
  BatchCacheable,
  StaleWhileRevalidate,
  CacheLock,
  ConditionalCache,
  CacheConfig,
  InjectCache,
  generateCacheKey,
  CACHE_KEY_METADATA,
  CACHE_OPTIONS_METADATA,
  CACHE_EVICT_METADATA,
  CACHE_PUT_METADATA,
  CACHE_INVALIDATE_TAGS_METADATA,
  CacheKeyOptions,
  CacheableOptions,
  CacheEvictOptions,
  CachePutOptions,
} from './cache.decorators';
import { CacheTag, CacheStrategy } from './cache.service';

// ============================================================================
// Test Classes for Decorator Testing
// ============================================================================

class TestTarget {
  constructor() {}
}

// ============================================================================
// generateCacheKey Function Tests
// ============================================================================

describe('generateCacheKey', () => {
  const mockTarget = {
    constructor: { name: 'TestService' },
  };

  describe('with no key options', () => {
    it('should generate default key with class name, method name, and args hash', () => {
      const key = generateCacheKey(undefined, mockTarget, 'getUser', ['user-123']);

      expect(key).toContain('TestService');
      expect(key).toContain('getUser');
    });

    it('should generate different keys for different args', () => {
      const key1 = generateCacheKey(undefined, mockTarget, 'getUser', ['user-1']);
      const key2 = generateCacheKey(undefined, mockTarget, 'getUser', ['user-2']);

      expect(key1).not.toBe(key2);
    });

    it('should generate same key for same args', () => {
      const key1 = generateCacheKey(undefined, mockTarget, 'getUser', ['user-1']);
      const key2 = generateCacheKey(undefined, mockTarget, 'getUser', ['user-1']);

      expect(key1).toBe(key2);
    });

    it('should handle no args', () => {
      const key = generateCacheKey(undefined, mockTarget, 'getAll', []);

      expect(key).toContain('TestService');
      expect(key).toContain('getAll');
      expect(key).toContain('no-args');
    });
  });

  describe('with string key template', () => {
    it('should resolve ${0} placeholder', () => {
      const key = generateCacheKey('users:${0}', mockTarget, 'getUser', ['user-123']);

      expect(key).toBe('users:user-123');
    });

    it('should resolve multiple placeholders', () => {
      const key = generateCacheKey('${0}:${1}:${2}', mockTarget, 'method', ['a', 'b', 'c']);

      expect(key).toBe('a:b:c');
    });

    it('should handle missing placeholder values', () => {
      const key = generateCacheKey('${0}:${1}', mockTarget, 'method', ['only-one']);

      expect(key).toBe('only-one:');
    });

    it('should handle out of range placeholders', () => {
      const key = generateCacheKey('${0}:${5}', mockTarget, 'method', ['value']);

      expect(key).toBe('value:');
    });

    it('should convert numbers to strings', () => {
      const key = generateCacheKey('item:${0}', mockTarget, 'getItem', [42]);

      expect(key).toBe('item:42');
    });
  });

  describe('with CacheKeyOptions object', () => {
    it('should use prefix', () => {
      const options: CacheKeyOptions = { prefix: 'myprefix' };
      const key = generateCacheKey(options, mockTarget, 'method', ['arg']);

      expect(key).toContain('myprefix');
    });

    it('should include class name when includeClass is true', () => {
      const options: CacheKeyOptions = { includeClass: true };
      const key = generateCacheKey(options, mockTarget, 'method', []);

      expect(key).toContain('TestService');
    });

    it('should include method name when includeMethod is true', () => {
      const options: CacheKeyOptions = { includeMethod: true };
      const key = generateCacheKey(options, mockTarget, 'getUsers', []);

      expect(key).toContain('getUsers');
    });

    it('should use paramIndices to select specific args', () => {
      const options: CacheKeyOptions = {
        prefix: 'test',
        paramIndices: [0, 2],
      };
      const key = generateCacheKey(options, mockTarget, 'method', ['first', 'skip', 'third']);

      expect(key).toContain('first');
      expect(key).toContain('third');
      expect(key).not.toContain('skip');
    });

    it('should use custom keyGenerator', () => {
      const keyGenerator = jest.fn().mockReturnValue('custom-key');
      const options: CacheKeyOptions = { keyGenerator };
      const key = generateCacheKey(options, mockTarget, 'method', ['arg1', 'arg2']);

      expect(keyGenerator).toHaveBeenCalledWith('arg1', 'arg2');
      expect(key).toContain('custom-key');
    });

    it('should combine prefix, class, method, and params', () => {
      const options: CacheKeyOptions = {
        prefix: 'api',
        includeClass: true,
        includeMethod: true,
        paramIndices: [0],
      };
      const key = generateCacheKey(options, mockTarget, 'getById', ['id-123']);

      expect(key).toContain('api');
      expect(key).toContain('TestService');
      expect(key).toContain('getById');
      expect(key).toContain('id-123');
    });

    it('should stringify object params', () => {
      const options: CacheKeyOptions = {
        prefix: 'test',
        paramIndices: [0],
      };
      const key = generateCacheKey(options, mockTarget, 'method', [{ foo: 'bar' }]);

      expect(key).toContain('{"foo":"bar"}');
    });

    it('should filter undefined params', () => {
      const options: CacheKeyOptions = {
        prefix: 'test',
        paramIndices: [0, 1, 5], // 5 is out of range
      };
      const key = generateCacheKey(options, mockTarget, 'method', ['a', 'b']);

      expect(key).not.toContain('undefined');
    });
  });

  describe('hash function', () => {
    it('should handle null arguments', () => {
      const key = generateCacheKey(undefined, mockTarget, 'method', [null]);

      expect(key).toBeDefined();
    });

    it('should handle undefined arguments', () => {
      const key = generateCacheKey(undefined, mockTarget, 'method', [undefined]);

      expect(key).toBeDefined();
    });

    it('should handle object arguments', () => {
      const key = generateCacheKey(undefined, mockTarget, 'method', [{ nested: { value: 1 } }]);

      expect(key).toBeDefined();
    });

    it('should handle circular references gracefully', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      // Should not throw
      expect(() => {
        generateCacheKey(undefined, mockTarget, 'method', [circular]);
      }).not.toThrow();
    });
  });
});

// ============================================================================
// Metadata Key Constants Tests
// ============================================================================

describe('metadata key constants', () => {
  it('should export CACHE_KEY_METADATA', () => {
    expect(CACHE_KEY_METADATA).toBe('cache:key');
  });

  it('should export CACHE_OPTIONS_METADATA', () => {
    expect(CACHE_OPTIONS_METADATA).toBe('cache:options');
  });

  it('should export CACHE_EVICT_METADATA', () => {
    expect(CACHE_EVICT_METADATA).toBe('cache:evict');
  });

  it('should export CACHE_PUT_METADATA', () => {
    expect(CACHE_PUT_METADATA).toBe('cache:put');
  });

  it('should export CACHE_INVALIDATE_TAGS_METADATA', () => {
    expect(CACHE_INVALIDATE_TAGS_METADATA).toBe('cache:invalidate_tags');
  });
});

// ============================================================================
// @Cacheable Decorator Tests
// ============================================================================

describe('@Cacheable decorator', () => {
  it('should set cache key metadata', () => {
    class TestClass {
      @Cacheable({ key: 'test:key' })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_KEY_METADATA, TestClass.prototype.method);
    expect(metadata).toBe('test:key');
  });

  it('should set cache options metadata', () => {
    class TestClass {
      @Cacheable({ ttl: 300, tags: [CacheTag.USER] })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_OPTIONS_METADATA, TestClass.prototype.method);
    expect(metadata).toMatchObject({
      ttl: 300,
      tags: [CacheTag.USER],
    });
  });

  it('should use CACHE_ASIDE strategy by default', () => {
    class TestClass {
      @Cacheable({})
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_OPTIONS_METADATA, TestClass.prototype.method);
    expect(metadata.strategy).toBe(CacheStrategy.CACHE_ASIDE);
  });

  it('should support condition option', () => {
    const condition = (result: any) => result !== null;
    class TestClass {
      @Cacheable({ condition })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_OPTIONS_METADATA, TestClass.prototype.method);
    expect(metadata.condition).toBe(condition);
  });

  it('should support unless option', () => {
    const unless = (result: any) => result === null;
    class TestClass {
      @Cacheable({ unless })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_OPTIONS_METADATA, TestClass.prototype.method);
    expect(metadata.unless).toBe(unless);
  });

  it('should support sync option', () => {
    class TestClass {
      @Cacheable({ sync: true })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_OPTIONS_METADATA, TestClass.prototype.method);
    expect(metadata.sync).toBe(true);
  });

  it('should support CacheKeyOptions for key', () => {
    class TestClass {
      @Cacheable({ key: { prefix: 'users', paramIndices: [0] } })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_KEY_METADATA, TestClass.prototype.method);
    expect(metadata).toMatchObject({ prefix: 'users', paramIndices: [0] });
  });

  it('should handle empty options', () => {
    class TestClass {
      @Cacheable()
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_OPTIONS_METADATA, TestClass.prototype.method);
    expect(metadata).toBeDefined();
  });
});

// ============================================================================
// @CacheEvict Decorator Tests
// ============================================================================

describe('@CacheEvict decorator', () => {
  it('should set evict metadata with key', () => {
    class TestClass {
      @CacheEvict({ key: 'evict:key' })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_EVICT_METADATA, TestClass.prototype.method);
    expect(metadata.key).toBe('evict:key');
  });

  it('should set evict metadata with tags', () => {
    class TestClass {
      @CacheEvict({ tags: [CacheTag.USER, CacheTag.SESSION] })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_EVICT_METADATA, TestClass.prototype.method);
    expect(metadata.tags).toEqual([CacheTag.USER, CacheTag.SESSION]);
  });

  it('should set evict metadata with pattern', () => {
    class TestClass {
      @CacheEvict({ pattern: 'user:*' })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_EVICT_METADATA, TestClass.prototype.method);
    expect(metadata.pattern).toBe('user:*');
  });

  it('should support allEntries option', () => {
    class TestClass {
      @CacheEvict({ allEntries: true })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_EVICT_METADATA, TestClass.prototype.method);
    expect(metadata.allEntries).toBe(true);
  });

  it('should support beforeInvocation option', () => {
    class TestClass {
      @CacheEvict({ key: 'key', beforeInvocation: true })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_EVICT_METADATA, TestClass.prototype.method);
    expect(metadata.beforeInvocation).toBe(true);
  });

  it('should support condition option', () => {
    const condition = () => true;
    class TestClass {
      @CacheEvict({ key: 'key', condition })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_EVICT_METADATA, TestClass.prototype.method);
    expect(metadata.condition).toBe(condition);
  });

  it('should handle empty options', () => {
    class TestClass {
      @CacheEvict()
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_EVICT_METADATA, TestClass.prototype.method);
    expect(metadata).toBeDefined();
  });
});

// ============================================================================
// @CachePut Decorator Tests
// ============================================================================

describe('@CachePut decorator', () => {
  it('should set put metadata with key', () => {
    class TestClass {
      @CachePut({ key: 'put:key' })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_PUT_METADATA, TestClass.prototype.method);
    expect(metadata.key).toBe('put:key');
  });

  it('should set put metadata with ttl', () => {
    class TestClass {
      @CachePut({ key: 'key', ttl: 600 })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_PUT_METADATA, TestClass.prototype.method);
    expect(metadata.ttl).toBe(600);
  });

  it('should set put metadata with tags', () => {
    class TestClass {
      @CachePut({ key: 'key', tags: [CacheTag.FESTIVAL] })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_PUT_METADATA, TestClass.prototype.method);
    expect(metadata.tags).toEqual([CacheTag.FESTIVAL]);
  });

  it('should support condition option', () => {
    const condition = (result: any) => result !== null;
    class TestClass {
      @CachePut({ key: 'key', condition })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_PUT_METADATA, TestClass.prototype.method);
    expect(metadata.condition).toBe(condition);
  });

  it('should support unless option', () => {
    const unless = (result: any) => result === null;
    class TestClass {
      @CachePut({ key: 'key', unless })
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_PUT_METADATA, TestClass.prototype.method);
    expect(metadata.unless).toBe(unless);
  });

  it('should handle empty options', () => {
    class TestClass {
      @CachePut()
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_PUT_METADATA, TestClass.prototype.method);
    expect(metadata).toBeDefined();
  });
});

// ============================================================================
// @InvalidateTags Decorator Tests
// ============================================================================

describe('@InvalidateTags decorator', () => {
  it('should set tags metadata', () => {
    class TestClass {
      @InvalidateTags([CacheTag.TICKET, CacheTag.ANALYTICS])
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_INVALIDATE_TAGS_METADATA, TestClass.prototype.method);
    expect(metadata).toEqual([CacheTag.TICKET, CacheTag.ANALYTICS]);
  });

  it('should handle single tag', () => {
    class TestClass {
      @InvalidateTags([CacheTag.USER])
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_INVALIDATE_TAGS_METADATA, TestClass.prototype.method);
    expect(metadata).toEqual([CacheTag.USER]);
  });

  it('should handle empty tags array', () => {
    class TestClass {
      @InvalidateTags([])
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_INVALIDATE_TAGS_METADATA, TestClass.prototype.method);
    expect(metadata).toEqual([]);
  });

  it('should handle all cache tags', () => {
    const allTags = Object.values(CacheTag) as CacheTag[];
    class TestClass {
      @InvalidateTags(allTags)
      method() {}
    }

    const metadata = Reflect.getMetadata(CACHE_INVALIDATE_TAGS_METADATA, TestClass.prototype.method);
    expect(metadata).toEqual(allTags);
  });
});

// ============================================================================
// @MultiLevelCache Decorator Tests
// ============================================================================

describe('@MultiLevelCache decorator', () => {
  it('should set multi-level cache metadata', () => {
    class TestClass {
      @MultiLevelCache({
        key: 'multi:key',
        l1: { ttl: 60 },
        l2: { ttl: 3600 },
      })
      method() {}
    }

    const metadata = Reflect.getMetadata('cache:multi_level', TestClass.prototype.method);
    expect(metadata).toMatchObject({
      key: 'multi:key',
      l1: { ttl: 60 },
      l2: { ttl: 3600 },
    });
  });

  it('should support L1 maxSize option', () => {
    class TestClass {
      @MultiLevelCache({
        l1: { ttl: 60, maxSize: 100 },
        l2: { ttl: 3600 },
      })
      method() {}
    }

    const metadata = Reflect.getMetadata('cache:multi_level', TestClass.prototype.method);
    expect(metadata.l1.maxSize).toBe(100);
  });

  it('should support L2 tags option', () => {
    class TestClass {
      @MultiLevelCache({
        l1: { ttl: 60 },
        l2: { ttl: 3600, tags: [CacheTag.USER] },
      })
      method() {}
    }

    const metadata = Reflect.getMetadata('cache:multi_level', TestClass.prototype.method);
    expect(metadata.l2.tags).toEqual([CacheTag.USER]);
  });
});

// ============================================================================
// @BatchCacheable Decorator Tests
// ============================================================================

describe('@BatchCacheable decorator', () => {
  it('should set batch cache metadata', () => {
    const idExtractor = (item: any) => item.id;
    class TestClass {
      @BatchCacheable({
        keyPrefix: 'users',
        idExtractor,
        ttl: 300,
      })
      method() {}
    }

    const metadata = Reflect.getMetadata('cache:batch', TestClass.prototype.method);
    expect(metadata).toMatchObject({
      keyPrefix: 'users',
      ttl: 300,
    });
    expect(metadata.idExtractor).toBe(idExtractor);
  });

  it('should support tags option', () => {
    class TestClass {
      @BatchCacheable({
        keyPrefix: 'items',
        idExtractor: (item: any) => item.id,
        tags: [CacheTag.TICKET],
      })
      method() {}
    }

    const metadata = Reflect.getMetadata('cache:batch', TestClass.prototype.method);
    expect(metadata.tags).toEqual([CacheTag.TICKET]);
  });
});

// ============================================================================
// @StaleWhileRevalidate Decorator Tests
// ============================================================================

describe('@StaleWhileRevalidate decorator', () => {
  it('should set SWR metadata', () => {
    class TestClass {
      @StaleWhileRevalidate({
        key: 'stats:${0}',
        staleTime: 60,
        maxAge: 3600,
      })
      method() {}
    }

    const metadata = Reflect.getMetadata('cache:swr', TestClass.prototype.method);
    expect(metadata).toMatchObject({
      key: 'stats:${0}',
      staleTime: 60,
      maxAge: 3600,
    });
  });

  it('should support tags option', () => {
    class TestClass {
      @StaleWhileRevalidate({
        staleTime: 60,
        maxAge: 3600,
        tags: [CacheTag.ANALYTICS],
      })
      method() {}
    }

    const metadata = Reflect.getMetadata('cache:swr', TestClass.prototype.method);
    expect(metadata.tags).toEqual([CacheTag.ANALYTICS]);
  });
});

// ============================================================================
// @CacheLock Decorator Tests
// ============================================================================

describe('@CacheLock decorator', () => {
  it('should set lock metadata', () => {
    class TestClass {
      @CacheLock({ key: 'report:${0}', lockTimeout: 30000 })
      method() {}
    }

    const metadata = Reflect.getMetadata('cache:lock', TestClass.prototype.method);
    expect(metadata).toMatchObject({
      key: 'report:${0}',
      lockTimeout: 30000,
    });
  });

  it('should support waitTimeout option', () => {
    class TestClass {
      @CacheLock({ lockTimeout: 30000, waitTimeout: 10000 })
      method() {}
    }

    const metadata = Reflect.getMetadata('cache:lock', TestClass.prototype.method);
    expect(metadata.waitTimeout).toBe(10000);
  });

  it('should support retryDelay option', () => {
    class TestClass {
      @CacheLock({ lockTimeout: 30000, retryDelay: 100 })
      method() {}
    }

    const metadata = Reflect.getMetadata('cache:lock', TestClass.prototype.method);
    expect(metadata.retryDelay).toBe(100);
  });
});

// ============================================================================
// @ConditionalCache Decorator Tests
// ============================================================================

describe('@ConditionalCache decorator', () => {
  it('should set conditional cache metadata', () => {
    const condition = (ctx: any) => !ctx.user?.isAdmin;
    class TestClass {
      @ConditionalCache({
        condition,
        key: 'public:festivals',
        ttl: 300,
      })
      method() {}
    }

    const metadata = Reflect.getMetadata('cache:conditional', TestClass.prototype.method);
    expect(metadata).toMatchObject({
      key: 'public:festivals',
      ttl: 300,
    });
    expect(metadata.condition).toBe(condition);
  });

  it('should support tags option', () => {
    class TestClass {
      @ConditionalCache({
        condition: () => true,
        tags: [CacheTag.FESTIVAL],
      })
      method() {}
    }

    const metadata = Reflect.getMetadata('cache:conditional', TestClass.prototype.method);
    expect(metadata.tags).toEqual([CacheTag.FESTIVAL]);
  });
});

// ============================================================================
// @CacheConfig Class Decorator Tests
// ============================================================================

describe('@CacheConfig decorator', () => {
  it('should set cache config metadata on class', () => {
    @CacheConfig({ prefix: 'users', ttl: 3600 })
    class TestClass {}

    const metadata = Reflect.getMetadata('cache:config', TestClass);
    expect(metadata).toMatchObject({
      prefix: 'users',
      ttl: 3600,
    });
  });

  it('should support tags option', () => {
    @CacheConfig({ prefix: 'festivals', tags: [CacheTag.FESTIVAL] })
    class TestClass {}

    const metadata = Reflect.getMetadata('cache:config', TestClass);
    expect(metadata.tags).toEqual([CacheTag.FESTIVAL]);
  });

  it('should handle partial options', () => {
    @CacheConfig({ prefix: 'simple' })
    class TestClass {}

    const metadata = Reflect.getMetadata('cache:config', TestClass);
    expect(metadata.prefix).toBe('simple');
    expect(metadata.ttl).toBeUndefined();
  });
});

// ============================================================================
// InjectCache Decorator Tests
// ============================================================================

describe('InjectCache decorator', () => {
  it('should be a function', () => {
    expect(InjectCache).toBeInstanceOf(Function);
  });

  it('should return a decorator function', () => {
    const decorator = InjectCache();
    expect(decorator).toBeInstanceOf(Function);
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('edge cases', () => {
  describe('multiple decorators on same method', () => {
    it('should support @Cacheable and @InvalidateTags together', () => {
      class TestClass {
        @Cacheable({ key: 'test:key' })
        @InvalidateTags([CacheTag.USER])
        method() {}
      }

      const keyMeta = Reflect.getMetadata(CACHE_KEY_METADATA, TestClass.prototype.method);
      const tagsMeta = Reflect.getMetadata(CACHE_INVALIDATE_TAGS_METADATA, TestClass.prototype.method);

      expect(keyMeta).toBe('test:key');
      expect(tagsMeta).toEqual([CacheTag.USER]);
    });
  });

  describe('special characters in keys', () => {
    it('should handle special characters in key template', () => {
      class TestClass {
        @Cacheable({ key: 'key:with:colons:${0}' })
        method() {}
      }

      const metadata = Reflect.getMetadata(CACHE_KEY_METADATA, TestClass.prototype.method);
      expect(metadata).toBe('key:with:colons:${0}');
    });
  });

  describe('complex condition functions', () => {
    it('should handle complex condition functions', () => {
      const condition = (result: any, arg1: string, arg2: number) => {
        return result !== null && arg1.length > 0 && arg2 > 0;
      };

      class TestClass {
        @Cacheable({ condition })
        method() {}
      }

      const metadata = Reflect.getMetadata(CACHE_OPTIONS_METADATA, TestClass.prototype.method);
      expect(metadata.condition).toBe(condition);
    });
  });

  describe('zero values', () => {
    it('should handle zero TTL', () => {
      class TestClass {
        @Cacheable({ ttl: 0 })
        method() {}
      }

      const metadata = Reflect.getMetadata(CACHE_OPTIONS_METADATA, TestClass.prototype.method);
      expect(metadata.ttl).toBe(0);
    });
  });
});
