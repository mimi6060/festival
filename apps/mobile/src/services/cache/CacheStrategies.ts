/**
 * CacheStrategies - Different caching strategies for various use cases
 * Provides flexible data fetching patterns with cache management
 */

import { CacheManager, getCacheManager, CachePriority } from './CacheManager';

// Fetch function type
export type FetchFunction<T> = () => Promise<T>;

// Strategy options
export interface StrategyOptions {
  cacheKey: string;
  ttl?: number;
  priority?: CachePriority;
  tags?: string[];
  onCacheHit?: (data: unknown) => void;
  onCacheMiss?: () => void;
  onNetworkError?: (error: Error) => void;
  onBackgroundUpdate?: (data: unknown) => void;
}

// Strategy result
export interface StrategyResult<T> {
  data: T | null;
  source: 'cache' | 'network' | 'stale';
  isStale: boolean;
  error: Error | null;
  fromCache: boolean;
}

/**
 * Base strategy class
 */
abstract class BaseStrategy {
  protected cacheManager: CacheManager;

  constructor(cacheManager?: CacheManager) {
    this.cacheManager = cacheManager || getCacheManager();
  }

  abstract execute<T>(
    fetch: FetchFunction<T>,
    options: StrategyOptions
  ): Promise<StrategyResult<T>>;

  protected createResult<T>(
    data: T | null,
    source: 'cache' | 'network' | 'stale',
    error: Error | null = null,
    isStale = false
  ): StrategyResult<T> {
    return {
      data,
      source,
      isStale,
      error,
      fromCache: source === 'cache' || source === 'stale',
    };
  }
}

/**
 * CacheFirst Strategy
 * Returns cached data immediately, then fetches from network in background
 * Best for: Data that can be slightly outdated (artist info, venue details)
 */
export class CacheFirstStrategy extends BaseStrategy {
  async execute<T>(
    fetch: FetchFunction<T>,
    options: StrategyOptions
  ): Promise<StrategyResult<T>> {
    const { cacheKey, ttl, priority, tags, onCacheHit, onBackgroundUpdate, onNetworkError } = options;

    // Try cache first
    const cachedData = await this.cacheManager.get<T>(cacheKey);

    if (cachedData !== null) {
      onCacheHit?.(cachedData);

      // Fetch in background to update cache
      this.fetchInBackground(fetch, { cacheKey, ttl, priority, tags }, onBackgroundUpdate, onNetworkError);

      return this.createResult(cachedData, 'cache', null, false);
    }

    // Cache miss - fetch from network
    try {
      const data = await fetch();

      await this.cacheManager.set(cacheKey, data, { ttl, priority, tags });

      return this.createResult(data, 'network', null, false);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Network request failed');
      onNetworkError?.(err);
      return this.createResult<T>(null, 'network', err, false);
    }
  }

  private async fetchInBackground<T>(
    fetch: FetchFunction<T>,
    cacheOptions: { cacheKey: string; ttl?: number; priority?: CachePriority; tags?: string[] },
    onBackgroundUpdate?: (data: unknown) => void,
    onNetworkError?: (error: Error) => void
  ): Promise<void> {
    try {
      const data = await fetch();
      await this.cacheManager.set(cacheOptions.cacheKey, data, {
        ttl: cacheOptions.ttl,
        priority: cacheOptions.priority,
        tags: cacheOptions.tags,
      });
      onBackgroundUpdate?.(data);
    } catch (error) {
      // Silent failure for background updates
      const err = error instanceof Error ? error : new Error('Background fetch failed');
      onNetworkError?.(err);
    }
  }
}

/**
 * NetworkFirst Strategy
 * Tries network first, falls back to cache on failure
 * Best for: Critical data that needs to be fresh (user tickets, wallet balance)
 */
export class NetworkFirstStrategy extends BaseStrategy {
  private timeout: number;

  constructor(cacheManager?: CacheManager, timeout = 10000) {
    super(cacheManager);
    this.timeout = timeout;
  }

  async execute<T>(
    fetch: FetchFunction<T>,
    options: StrategyOptions
  ): Promise<StrategyResult<T>> {
    const { cacheKey, ttl, priority, tags, onCacheHit, onCacheMiss, onNetworkError } = options;

    // Try network first with timeout
    try {
      const data = await this.fetchWithTimeout(fetch);

      // Update cache with fresh data
      await this.cacheManager.set(cacheKey, data, { ttl, priority, tags });

      return this.createResult(data, 'network', null, false);
    } catch (networkError) {
      // Network failed - try cache
      const err = networkError instanceof Error ? networkError : new Error('Network request failed');
      onNetworkError?.(err);

      const cachedData = await this.cacheManager.get<T>(cacheKey);

      if (cachedData !== null) {
        onCacheHit?.(cachedData);
        return this.createResult(cachedData, 'stale', err, true);
      }

      onCacheMiss?.();
      return this.createResult<T>(null, 'network', err, false);
    }
  }

  private async fetchWithTimeout<T>(fetch: FetchFunction<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, this.timeout);

      fetch()
        .then(data => {
          clearTimeout(timeoutId);
          resolve(data);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
}

/**
 * StaleWhileRevalidate Strategy
 * Returns stale data immediately while fetching fresh data in background
 * Best for: Frequently updated data where showing something is better than nothing
 */
export class StaleWhileRevalidateStrategy extends BaseStrategy {
  private staleThreshold: number;

  constructor(cacheManager?: CacheManager, staleThreshold = 60000) {
    super(cacheManager);
    this.staleThreshold = staleThreshold; // Time in ms after which data is considered stale
  }

  async execute<T>(
    fetch: FetchFunction<T>,
    options: StrategyOptions
  ): Promise<StrategyResult<T>> {
    const { cacheKey, ttl, priority, tags, onCacheHit, onCacheMiss, onBackgroundUpdate, onNetworkError } = options;

    const cachedData = await this.cacheManager.get<T>(cacheKey);
    const metadata = this.cacheManager.getMetadata(cacheKey);

    if (cachedData !== null && metadata) {
      const isStale = Date.now() - metadata.lastAccessedAt > this.staleThreshold;
      onCacheHit?.(cachedData);

      // Always revalidate in background if stale
      if (isStale) {
        this.revalidate(fetch, { cacheKey, ttl, priority, tags }, onBackgroundUpdate, onNetworkError);
      }

      return this.createResult(cachedData, isStale ? 'stale' : 'cache', null, isStale);
    }

    // No cached data - fetch from network
    onCacheMiss?.();

    try {
      const data = await fetch();
      await this.cacheManager.set(cacheKey, data, { ttl, priority, tags });
      return this.createResult(data, 'network', null, false);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Network request failed');
      onNetworkError?.(err);
      return this.createResult<T>(null, 'network', err, false);
    }
  }

  private async revalidate<T>(
    fetch: FetchFunction<T>,
    cacheOptions: { cacheKey: string; ttl?: number; priority?: CachePriority; tags?: string[] },
    onBackgroundUpdate?: (data: unknown) => void,
    onNetworkError?: (error: Error) => void
  ): Promise<void> {
    try {
      const data = await fetch();
      await this.cacheManager.set(cacheOptions.cacheKey, data, {
        ttl: cacheOptions.ttl,
        priority: cacheOptions.priority,
        tags: cacheOptions.tags,
      });
      onBackgroundUpdate?.(data);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Revalidation failed');
      onNetworkError?.(err);
    }
  }
}

/**
 * NetworkOnly Strategy
 * Always fetches from network, never uses cache
 * Best for: Real-time data that must be fresh (payment processing, live updates)
 */
export class NetworkOnlyStrategy extends BaseStrategy {
  async execute<T>(
    fetch: FetchFunction<T>,
    options: StrategyOptions
  ): Promise<StrategyResult<T>> {
    const { onNetworkError } = options;

    try {
      const data = await fetch();
      return this.createResult(data, 'network', null, false);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Network request failed');
      onNetworkError?.(err);
      return this.createResult<T>(null, 'network', err, false);
    }
  }
}

/**
 * CacheOnly Strategy
 * Only reads from cache, never makes network requests
 * Best for: Offline mode, prefetched data
 */
export class CacheOnlyStrategy extends BaseStrategy {
  async execute<T>(
    _fetch: FetchFunction<T>,
    options: StrategyOptions
  ): Promise<StrategyResult<T>> {
    const { cacheKey, onCacheHit, onCacheMiss } = options;

    const cachedData = await this.cacheManager.get<T>(cacheKey);

    if (cachedData !== null) {
      onCacheHit?.(cachedData);
      return this.createResult(cachedData, 'cache', null, false);
    }

    onCacheMiss?.();
    return this.createResult<T>(null, 'cache', new Error('Cache miss'), false);
  }
}

// Strategy type union
export type CacheStrategy =
  | CacheFirstStrategy
  | NetworkFirstStrategy
  | StaleWhileRevalidateStrategy
  | NetworkOnlyStrategy
  | CacheOnlyStrategy;

// Strategy names for factory
export enum StrategyName {
  CACHE_FIRST = 'cache-first',
  NETWORK_FIRST = 'network-first',
  STALE_WHILE_REVALIDATE = 'stale-while-revalidate',
  NETWORK_ONLY = 'network-only',
  CACHE_ONLY = 'cache-only',
}

// Strategy factory configuration
export interface StrategyFactoryConfig {
  networkFirstTimeout?: number;
  staleWhileRevalidateThreshold?: number;
  cacheManager?: CacheManager;
}

/**
 * Strategy Factory - Creates strategy instances
 */
export class StrategyFactory {
  private config: StrategyFactoryConfig;

  constructor(config: StrategyFactoryConfig = {}) {
    this.config = config;
  }

  create(name: StrategyName): CacheStrategy {
    const cacheManager = this.config.cacheManager;

    switch (name) {
      case StrategyName.CACHE_FIRST:
        return new CacheFirstStrategy(cacheManager);

      case StrategyName.NETWORK_FIRST:
        return new NetworkFirstStrategy(cacheManager, this.config.networkFirstTimeout);

      case StrategyName.STALE_WHILE_REVALIDATE:
        return new StaleWhileRevalidateStrategy(
          cacheManager,
          this.config.staleWhileRevalidateThreshold
        );

      case StrategyName.NETWORK_ONLY:
        return new NetworkOnlyStrategy(cacheManager);

      case StrategyName.CACHE_ONLY:
        return new CacheOnlyStrategy(cacheManager);

      default:
        throw new Error(`Unknown strategy: ${name}`);
    }
  }
}

// Singleton factory
let strategyFactoryInstance: StrategyFactory | null = null;

export function getStrategyFactory(config?: StrategyFactoryConfig): StrategyFactory {
  if (!strategyFactoryInstance) {
    strategyFactoryInstance = new StrategyFactory(config);
  }
  return strategyFactoryInstance;
}

/**
 * Convenience function to execute a strategy
 */
export async function executeStrategy<T>(
  strategyName: StrategyName,
  fetch: FetchFunction<T>,
  options: StrategyOptions
): Promise<StrategyResult<T>> {
  const factory = getStrategyFactory();
  const strategy = factory.create(strategyName);
  return strategy.execute(fetch, options);
}

/**
 * Hook-friendly cached fetch function
 */
export async function cachedFetch<T>(
  key: string,
  fetch: FetchFunction<T>,
  options: {
    strategy?: StrategyName;
    ttl?: number;
    priority?: CachePriority;
    tags?: string[];
  } = {}
): Promise<StrategyResult<T>> {
  const {
    strategy = StrategyName.STALE_WHILE_REVALIDATE,
    ttl,
    priority,
    tags,
  } = options;

  return executeStrategy(strategy, fetch, {
    cacheKey: key,
    ttl,
    priority,
    tags,
  });
}

export default {
  CacheFirstStrategy,
  NetworkFirstStrategy,
  StaleWhileRevalidateStrategy,
  NetworkOnlyStrategy,
  CacheOnlyStrategy,
  StrategyFactory,
  StrategyName,
  executeStrategy,
  cachedFetch,
  getStrategyFactory,
};
