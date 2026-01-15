/**
 * ImageCache - Disk-based image caching with progressive loading
 * Optimized for festival images with prefetching and placeholder support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Image as RNImage } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Image cache configuration
export interface ImageCacheConfig {
  maxDiskSize: number; // Maximum disk cache size in bytes
  maxMemorySize: number; // Maximum memory cache size in bytes
  maxAge: number; // Maximum age of cached images in milliseconds
  thumbnailSize: number; // Size for thumbnail generation
  qualityLevels: number[]; // Quality levels for progressive loading
  prefetchConcurrency: number; // Number of concurrent prefetch operations
  storageKeyPrefix: string; // Prefix for AsyncStorage metadata
}

// Image metadata
export interface ImageMetadata {
  url: string;
  localPath: string;
  thumbnailPath?: string;
  size: number;
  width: number;
  height: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  contentType: string;
  etag?: string;
}

// Image cache entry for memory cache
interface MemoryCacheEntry {
  url: string;
  base64?: string;
  localPath: string;
  size: number;
  lastAccessedAt: number;
}

// Prefetch result
export interface PrefetchResult {
  url: string;
  success: boolean;
  error?: Error;
  localPath?: string;
}

// Cache statistics
export interface ImageCacheStats {
  totalDiskSize: number;
  totalMemorySize: number;
  imageCount: number;
  hitRate: number;
  hits: number;
  misses: number;
  prefetchedCount: number;
  failedPrefetchCount: number;
}

// Default configuration
const DEFAULT_CONFIG: ImageCacheConfig = {
  maxDiskSize: 200 * 1024 * 1024, // 200MB
  maxMemorySize: 50 * 1024 * 1024, // 50MB
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  thumbnailSize: 100,
  qualityLevels: [0.1, 0.5, 1.0], // Progressive quality levels
  prefetchConcurrency: 3,
  storageKeyPrefix: '@festival_image_cache_',
};

// Get cache directory based on platform
const getCacheDirectory = (): string => {
  if (Platform.OS === 'web') {
    return '';
  }
  return FileSystem.cacheDirectory || '';
};

/**
 * ImageCache - Main class for image caching
 */
export class ImageCache {
  private config: ImageCacheConfig;
  private memoryCache = new Map<string, MemoryCacheEntry>();
  private metadata = new Map<string, ImageMetadata>();
  private currentDiskSize = 0;
  private currentMemorySize = 0;
  private prefetchQueue = new Map<string, Promise<PrefetchResult>>();
  private stats: ImageCacheStats;
  private initialized = false;
  private cacheDir: string;

  constructor(config: Partial<ImageCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cacheDir = getCacheDirectory() + 'images/';
    this.stats = this.createInitialStats();
  }

  /**
   * Initialize image cache
   */
  async initialize(): Promise<void> {
    if (this.initialized) {return;}

    if (Platform.OS !== 'web') {
      // Ensure cache directory exists
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }
    }

    // Load metadata from storage
    await this.loadMetadata();

    // Cleanup expired images
    await this.cleanupExpired();

    this.initialized = true;
  }

  /**
   * Get image from cache or fetch
   */
  async getImage(url: string): Promise<string | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(url);
    if (memoryEntry) {
      this.recordHit();
      memoryEntry.lastAccessedAt = Date.now();
      return memoryEntry.localPath;
    }

    // Check disk cache
    const meta = this.metadata.get(url);
    if (meta) {
      const exists = await this.fileExists(meta.localPath);
      if (exists) {
        this.recordHit();
        meta.lastAccessedAt = Date.now();
        meta.accessCount++;

        // Add to memory cache
        await this.addToMemoryCache(url, meta.localPath, meta.size);

        return meta.localPath;
      } else {
        // File was deleted, remove metadata
        this.metadata.delete(url);
        await this.saveMetadata();
      }
    }

    // Cache miss - need to fetch
    this.recordMiss();
    return null;
  }

  /**
   * Cache an image from URL
   */
  async cacheImage(url: string): Promise<string | null> {
    // Check if already cached
    const existing = await this.getImage(url);
    if (existing) {return existing;}

    if (Platform.OS === 'web') {
      // Web platform - use browser caching
      return url;
    }

    try {
      // Generate local path
      const filename = this.generateFilename(url);
      const localPath = this.cacheDir + filename;

      // Download image
      const downloadResult = await FileSystem.downloadAsync(url, localPath);

      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download image: ${downloadResult.status}`);
      }

      // Get image info
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (!fileInfo.exists) {
        throw new Error('Downloaded file does not exist');
      }

      const size = fileInfo.size || 0;

      // Ensure we have capacity
      await this.ensureDiskCapacity(size);

      // Get image dimensions
      const dimensions = await this.getImageDimensions(localPath);

      // Create metadata
      const meta: ImageMetadata = {
        url,
        localPath,
        size,
        width: dimensions.width,
        height: dimensions.height,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
        contentType: downloadResult.headers['content-type'] || 'image/jpeg',
        etag: downloadResult.headers['etag'],
      };

      // Store metadata
      this.metadata.set(url, meta);
      this.currentDiskSize += size;
      await this.saveMetadata();

      // Add to memory cache
      await this.addToMemoryCache(url, localPath, size);

      return localPath;
    } catch (error) {
      console.error('[ImageCache] Failed to cache image:', error);
      return null;
    }
  }

  /**
   * Get image with progressive loading
   */
  async getProgressiveImage(
    url: string,
    onProgress?: (quality: number, uri: string) => void
  ): Promise<string | null> {
    // First, try to get cached full-quality image
    const cached = await this.getImage(url);
    if (cached) {
      onProgress?.(1.0, cached);
      return cached;
    }

    // For progressive loading, we'll use placeholder first
    const placeholder = await this.getPlaceholder(url);
    if (placeholder) {
      onProgress?.(0.1, placeholder);
    }

    // Then fetch full image
    const fullImage = await this.cacheImage(url);
    if (fullImage) {
      onProgress?.(1.0, fullImage);
    }

    return fullImage;
  }

  /**
   * Get or generate placeholder for an image
   */
  async getPlaceholder(url: string): Promise<string | null> {
    const meta = this.metadata.get(url);
    if (meta?.thumbnailPath) {
      const exists = await this.fileExists(meta.thumbnailPath);
      if (exists) {return meta.thumbnailPath;}
    }

    // Return a default placeholder color
    return null;
  }

  /**
   * Prefetch images for better UX
   */
  async prefetch(urls: string[]): Promise<PrefetchResult[]> {
    const results: PrefetchResult[] = [];
    const urlsToFetch = urls.filter(url => !this.metadata.has(url));

    // Process in batches
    const batches: string[][] = [];
    for (let i = 0; i < urlsToFetch.length; i += this.config.prefetchConcurrency) {
      batches.push(urlsToFetch.slice(i, i + this.config.prefetchConcurrency));
    }

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(async url => {
          // Check if already being prefetched
          const existing = this.prefetchQueue.get(url);
          if (existing) {
            return existing;
          }

          // Start prefetch
          const promise = this.prefetchSingle(url);
          this.prefetchQueue.set(url, promise);

          try {
            const result = await promise;
            return result;
          } finally {
            this.prefetchQueue.delete(url);
          }
        })
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Prefetch single image
   */
  private async prefetchSingle(url: string): Promise<PrefetchResult> {
    try {
      const localPath = await this.cacheImage(url);
      if (localPath) {
        this.stats.prefetchedCount++;
        return { url, success: true, localPath };
      }
      throw new Error('Failed to cache image');
    } catch (error) {
      this.stats.failedPrefetchCount++;
      return {
        url,
        success: false,
        error: error instanceof Error ? error : new Error('Prefetch failed'),
      };
    }
  }

  /**
   * Prefetch festival images (artists, stages, etc.)
   */
  async prefetchFestivalImages(images: {
    artists?: string[];
    stages?: string[];
    banners?: string[];
  }): Promise<void> {
    const allUrls: string[] = [];

    // Priority order: banners, stages, artists
    if (images.banners) {
      allUrls.push(...images.banners);
    }
    if (images.stages) {
      allUrls.push(...images.stages);
    }
    if (images.artists) {
      allUrls.push(...images.artists);
    }

    // Filter out invalid URLs
    const validUrls = allUrls.filter(url => url && url.startsWith('http'));

    await this.prefetch(validUrls);
  }

  /**
   * Check if image is cached
   */
  isCached(url: string): boolean {
    return this.metadata.has(url);
  }

  /**
   * Get cached image path (sync)
   */
  getCachedPath(url: string): string | null {
    const meta = this.metadata.get(url);
    return meta?.localPath || null;
  }

  /**
   * Remove image from cache
   */
  async remove(url: string): Promise<boolean> {
    const meta = this.metadata.get(url);
    if (!meta) {return false;}

    try {
      // Remove from disk
      if (Platform.OS !== 'web') {
        await FileSystem.deleteAsync(meta.localPath, { idempotent: true });
        if (meta.thumbnailPath) {
          await FileSystem.deleteAsync(meta.thumbnailPath, { idempotent: true });
        }
      }

      // Remove from memory cache
      this.memoryCache.delete(url);

      // Update stats
      this.currentDiskSize -= meta.size;
      this.metadata.delete(url);

      await this.saveMetadata();
      return true;
    } catch (error) {
      console.error('[ImageCache] Failed to remove image:', error);
      return false;
    }
  }

  /**
   * Clear all cached images
   */
  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    this.currentMemorySize = 0;

    // Clear disk cache
    if (Platform.OS !== 'web') {
      try {
        await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      } catch (error) {
        console.error('[ImageCache] Failed to clear cache directory:', error);
      }
    }

    // Clear metadata
    this.metadata.clear();
    this.currentDiskSize = 0;

    await AsyncStorage.removeItem(this.config.storageKeyPrefix + 'metadata');

    // Reset stats
    this.stats = this.createInitialStats();
  }

  /**
   * Get cache statistics
   */
  getStats(): ImageCacheStats {
    return {
      ...this.stats,
      totalDiskSize: this.currentDiskSize,
      totalMemorySize: this.currentMemorySize,
      imageCount: this.metadata.size,
      hitRate: this.calculateHitRate(),
    };
  }

  /**
   * Get all cached URLs
   */
  getCachedUrls(): string[] {
    return Array.from(this.metadata.keys());
  }

  // Private methods

  private createInitialStats(): ImageCacheStats {
    return {
      totalDiskSize: 0,
      totalMemorySize: 0,
      imageCount: 0,
      hitRate: 0,
      hits: 0,
      misses: 0,
      prefetchedCount: 0,
      failedPrefetchCount: 0,
    };
  }

  private recordHit(): void {
    this.stats.hits++;
  }

  private recordMiss(): void {
    this.stats.misses++;
  }

  private calculateHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  private generateFilename(url: string): string {
    // Create a hash from the URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Get extension from URL or default to jpg
    const basePath = url.split('?')[0] || '';
    const urlParts = basePath.split('.');
    const lastPart = urlParts[urlParts.length - 1];
    const ext = lastPart ? lastPart.toLowerCase() : 'jpg';
    const validExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const extension = validExts.includes(ext) ? ext : 'jpg';

    return `img_${Math.abs(hash).toString(16)}_${Date.now()}.${extension}`;
  }

  private async fileExists(path: string): Promise<boolean> {
    if (Platform.OS === 'web') {return false;}

    try {
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    } catch {
      return false;
    }
  }

  private async getImageDimensions(path: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      if (Platform.OS === 'web') {
        resolve({ width: 0, height: 0 });
        return;
      }

      RNImage.getSize(
        path,
        (width, height) => resolve({ width, height }),
        () => resolve({ width: 0, height: 0 })
      );
    });
  }

  private async addToMemoryCache(url: string, localPath: string, size: number): Promise<void> {
    // Ensure memory capacity
    await this.ensureMemoryCapacity(size);

    this.memoryCache.set(url, {
      url,
      localPath,
      size,
      lastAccessedAt: Date.now(),
    });

    this.currentMemorySize += size;
  }

  private async ensureDiskCapacity(requiredSize: number): Promise<void> {
    while (this.currentDiskSize + requiredSize > this.config.maxDiskSize) {
      const evicted = await this.evictOldestFromDisk();
      if (!evicted) {break;}
    }
  }

  private async ensureMemoryCapacity(requiredSize: number): Promise<void> {
    while (this.currentMemorySize + requiredSize > this.config.maxMemorySize) {
      const evicted = this.evictOldestFromMemory();
      if (!evicted) {break;}
    }
  }

  private async evictOldestFromDisk(): Promise<boolean> {
    let oldest: ImageMetadata | null = null;
    let oldestUrl: string | null = null;

    const entries = Array.from(this.metadata.entries());
    for (const [url, meta] of entries) {
      if (!oldest || meta.lastAccessedAt < oldest.lastAccessedAt) {
        oldest = meta;
        oldestUrl = url;
      }
    }

    if (oldestUrl) {
      await this.remove(oldestUrl);
      return true;
    }

    return false;
  }

  private evictOldestFromMemory(): boolean {
    let oldest: MemoryCacheEntry | null = null;
    let oldestUrl: string | null = null;

    const entries = Array.from(this.memoryCache.entries());
    for (const [url, entry] of entries) {
      if (!oldest || entry.lastAccessedAt < oldest.lastAccessedAt) {
        oldest = entry;
        oldestUrl = url;
      }
    }

    if (oldestUrl && oldest) {
      this.memoryCache.delete(oldestUrl);
      this.currentMemorySize -= oldest.size;
      return true;
    }

    return false;
  }

  private async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const expiredUrls: string[] = [];

    const entries = Array.from(this.metadata.entries());
    for (const [url, meta] of entries) {
      if (now - meta.createdAt > this.config.maxAge) {
        expiredUrls.push(url);
      }
    }

    for (const url of expiredUrls) {
      await this.remove(url);
    }
  }

  private async loadMetadata(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.config.storageKeyPrefix + 'metadata');
      if (stored) {
        const data = JSON.parse(stored) as { entries: [string, ImageMetadata][]; diskSize: number };
        this.metadata = new Map(data.entries);
        this.currentDiskSize = data.diskSize;

        // Validate that files still exist
        const metaEntries = Array.from(this.metadata.entries());
        for (const [url, meta] of metaEntries) {
          const exists = await this.fileExists(meta.localPath);
          if (!exists) {
            this.metadata.delete(url);
            this.currentDiskSize -= meta.size;
          }
        }
      }
    } catch (error) {
      console.error('[ImageCache] Failed to load metadata:', error);
    }
  }

  private async saveMetadata(): Promise<void> {
    try {
      const data = {
        entries: Array.from(this.metadata.entries()),
        diskSize: this.currentDiskSize,
      };
      await AsyncStorage.setItem(
        this.config.storageKeyPrefix + 'metadata',
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('[ImageCache] Failed to save metadata:', error);
    }
  }
}

// Singleton instance
let imageCacheInstance: ImageCache | null = null;

export function getImageCache(config?: Partial<ImageCacheConfig>): ImageCache {
  if (!imageCacheInstance) {
    imageCacheInstance = new ImageCache(config);
  }
  return imageCacheInstance;
}

export function resetImageCache(): void {
  imageCacheInstance = null;
}

/**
 * Hook-friendly functions
 */

/**
 * Get cached image URI or original URL
 */
export async function getCachedImageUri(url: string): Promise<string> {
  const cache = getImageCache();
  await cache.initialize();

  const cached = await cache.getImage(url);
  if (cached) {return cached;}

  // Try to cache it
  const newCached = await cache.cacheImage(url);
  return newCached || url;
}

/**
 * Prefetch images
 */
export async function prefetchImages(urls: string[]): Promise<PrefetchResult[]> {
  const cache = getImageCache();
  await cache.initialize();
  return cache.prefetch(urls);
}

export default ImageCache;
