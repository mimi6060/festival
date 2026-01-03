/**
 * Offline Map Service
 * Handles caching and management of offline map tiles and data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// Map region types
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface OfflineRegion {
  id: string;
  name: string;
  region: MapRegion;
  minZoom: number;
  maxZoom: number;
  tileCount: number;
  downloadedCount: number;
  sizeBytes: number;
  downloadedAt?: Date;
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'paused';
  progress: number;
}

export interface MapTile {
  x: number;
  y: number;
  z: number;
  url: string;
  localPath?: string;
  cached: boolean;
}

export interface POIData {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  description?: string;
  icon?: string;
  festivalId: string;
}

export interface OfflineMapConfig {
  tileServerUrl: string;
  maxCacheSizeMB: number;
  maxZoomLevel: number;
  minZoomLevel: number;
  tileSize: number;
}

// Storage keys
const STORAGE_KEYS = {
  OFFLINE_REGIONS: '@festival/offline_regions',
  POI_DATA: '@festival/poi_data',
  MAP_CONFIG: '@festival/map_config',
  DOWNLOAD_QUEUE: '@festival/download_queue',
};

// Default tile server (OpenStreetMap)
const DEFAULT_TILE_SERVER = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Cache directory
const TILES_DIRECTORY = `${FileSystem.cacheDirectory}map_tiles/`;

class OfflineMapService {
  private config: OfflineMapConfig;
  private downloadQueue: MapTile[] = [];
  private isDownloading = false;
  private downloadAbortController: AbortController | null = null;
  private listeners = new Map<string, (region: OfflineRegion) => void>();

  constructor() {
    this.config = {
      tileServerUrl: DEFAULT_TILE_SERVER,
      maxCacheSizeMB: 500,
      maxZoomLevel: 18,
      minZoomLevel: 10,
      tileSize: 256,
    };
    this.initializeDirectory();
  }

  private async initializeDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(TILES_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(TILES_DIRECTORY, { intermediates: true });
      }
    } catch (error) {
      console.error('Failed to initialize tiles directory:', error);
    }
  }

  /**
   * Configure the offline map service
   */
  async configure(config: Partial<OfflineMapConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await AsyncStorage.setItem(STORAGE_KEYS.MAP_CONFIG, JSON.stringify(this.config));
  }

  /**
   * Calculate number of tiles for a region
   */
  calculateTileCount(region: MapRegion, minZoom: number, maxZoom: number): number {
    let totalTiles = 0;

    for (let z = minZoom; z <= maxZoom; z++) {
      const tiles = this.getTilesForRegion(region, z);
      totalTiles += tiles.length;
    }

    return totalTiles;
  }

  /**
   * Get tiles covering a region at a specific zoom level
   */
  private getTilesForRegion(region: MapRegion, zoom: number): MapTile[] {
    const tiles: MapTile[] = [];

    const north = region.latitude + region.latitudeDelta / 2;
    const south = region.latitude - region.latitudeDelta / 2;
    const east = region.longitude + region.longitudeDelta / 2;
    const west = region.longitude - region.longitudeDelta / 2;

    const minTileX = this.lonToTileX(west, zoom);
    const maxTileX = this.lonToTileX(east, zoom);
    const minTileY = this.latToTileY(north, zoom);
    const maxTileY = this.latToTileY(south, zoom);

    for (let x = minTileX; x <= maxTileX; x++) {
      for (let y = minTileY; y <= maxTileY; y++) {
        tiles.push({
          x,
          y,
          z: zoom,
          url: this.getTileUrl(x, y, zoom),
          cached: false,
        });
      }
    }

    return tiles;
  }

  /**
   * Convert longitude to tile X coordinate
   */
  private lonToTileX(lon: number, zoom: number): number {
    return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  }

  /**
   * Convert latitude to tile Y coordinate
   */
  private latToTileY(lat: number, zoom: number): number {
    return Math.floor(
      ((1 -
        Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
        2) *
        Math.pow(2, zoom)
    );
  }

  /**
   * Get tile URL from template
   */
  private getTileUrl(x: number, y: number, z: number): string {
    return this.config.tileServerUrl
      .replace('{x}', x.toString())
      .replace('{y}', y.toString())
      .replace('{z}', z.toString());
  }

  /**
   * Get local path for a tile
   */
  private getTileLocalPath(x: number, y: number, z: number): string {
    return `${TILES_DIRECTORY}${z}/${x}/${y}.png`;
  }

  /**
   * Download a region for offline use
   */
  async downloadRegion(
    name: string,
    region: MapRegion,
    minZoom: number = this.config.minZoomLevel,
    maxZoom: number = this.config.maxZoomLevel,
    onProgress?: (progress: number, downloaded: number, total: number) => void
  ): Promise<OfflineRegion> {
    const regionId = `region_${Date.now()}`;
    const tileCount = this.calculateTileCount(region, minZoom, maxZoom);

    const offlineRegion: OfflineRegion = {
      id: regionId,
      name,
      region,
      minZoom,
      maxZoom,
      tileCount,
      downloadedCount: 0,
      sizeBytes: 0,
      status: 'downloading',
      progress: 0,
    };

    await this.saveOfflineRegion(offlineRegion);
    this.notifyListeners(offlineRegion);

    // Collect all tiles to download
    const tiles: MapTile[] = [];
    for (let z = minZoom; z <= maxZoom; z++) {
      tiles.push(...this.getTilesForRegion(region, z));
    }

    this.downloadAbortController = new AbortController();
    let downloadedCount = 0;
    let totalSize = 0;

    try {
      for (const tile of tiles) {
        if (this.downloadAbortController.signal.aborted) {
          offlineRegion.status = 'paused';
          break;
        }

        try {
          const localPath = this.getTileLocalPath(tile.x, tile.y, tile.z);

          // Create directory if needed
          const dir = localPath.substring(0, localPath.lastIndexOf('/'));
          const dirInfo = await FileSystem.getInfoAsync(dir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
          }

          // Download tile
          const downloadResult = await FileSystem.downloadAsync(tile.url, localPath);

          if (downloadResult.status === 200) {
            const fileInfo = await FileSystem.getInfoAsync(localPath);
            if (fileInfo.exists && 'size' in fileInfo) {
              totalSize += fileInfo.size;
            }
            downloadedCount++;
          }
        } catch (tileError) {
          console.warn(`Failed to download tile ${tile.z}/${tile.x}/${tile.y}:`, tileError);
        }

        offlineRegion.downloadedCount = downloadedCount;
        offlineRegion.sizeBytes = totalSize;
        offlineRegion.progress = (downloadedCount / tileCount) * 100;

        if (onProgress) {
          onProgress(offlineRegion.progress, downloadedCount, tileCount);
        }

        // Save progress periodically
        if (downloadedCount % 50 === 0) {
          await this.saveOfflineRegion(offlineRegion);
          this.notifyListeners(offlineRegion);
        }
      }

      offlineRegion.status = offlineRegion.progress >= 100 ? 'completed' : offlineRegion.status;
      offlineRegion.downloadedAt = new Date();
      await this.saveOfflineRegion(offlineRegion);
      this.notifyListeners(offlineRegion);

      return offlineRegion;
    } catch (error) {
      offlineRegion.status = 'error';
      await this.saveOfflineRegion(offlineRegion);
      this.notifyListeners(offlineRegion);
      throw error;
    }
  }

  /**
   * Pause region download
   */
  pauseDownload(): void {
    if (this.downloadAbortController) {
      this.downloadAbortController.abort();
    }
  }

  /**
   * Resume region download
   */
  async resumeDownload(regionId: string): Promise<OfflineRegion | null> {
    const region = await this.getOfflineRegion(regionId);
    if (region?.status !== 'paused') {
      return null;
    }

    return this.downloadRegion(region.name, region.region, region.minZoom, region.maxZoom);
  }

  /**
   * Delete an offline region
   */
  async deleteRegion(regionId: string): Promise<void> {
    const region = await this.getOfflineRegion(regionId);
    if (!region) {
      return;
    }

    // Delete tiles for this region
    for (let z = region.minZoom; z <= region.maxZoom; z++) {
      const tiles = this.getTilesForRegion(region.region, z);
      for (const tile of tiles) {
        const localPath = this.getTileLocalPath(tile.x, tile.y, tile.z);
        try {
          const fileInfo = await FileSystem.getInfoAsync(localPath);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(localPath);
          }
        } catch {
          // Ignore deletion errors
        }
      }
    }

    // Remove from saved regions
    const regions = await this.getOfflineRegions();
    const filteredRegions = regions.filter((r) => r.id !== regionId);
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_REGIONS, JSON.stringify(filteredRegions));
  }

  /**
   * Check if a tile is cached
   */
  async isTileCached(x: number, y: number, z: number): Promise<boolean> {
    const localPath = this.getTileLocalPath(x, y, z);
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    return fileInfo.exists;
  }

  /**
   * Get cached tile URI
   */
  async getCachedTileUri(x: number, y: number, z: number): Promise<string | null> {
    const localPath = this.getTileLocalPath(x, y, z);
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    return fileInfo.exists ? localPath : null;
  }

  /**
   * Save offline region to storage
   */
  private async saveOfflineRegion(region: OfflineRegion): Promise<void> {
    const regions = await this.getOfflineRegions();
    const existingIndex = regions.findIndex((r) => r.id === region.id);

    if (existingIndex >= 0) {
      regions[existingIndex] = region;
    } else {
      regions.push(region);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_REGIONS, JSON.stringify(regions));
  }

  /**
   * Get all offline regions
   */
  async getOfflineRegions(): Promise<OfflineRegion[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_REGIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get a specific offline region
   */
  async getOfflineRegion(regionId: string): Promise<OfflineRegion | null> {
    const regions = await this.getOfflineRegions();
    return regions.find((r) => r.id === regionId) || null;
  }

  /**
   * Cache POI data for offline use
   */
  async cachePOIData(festivalId: string, pois: POIData[]): Promise<void> {
    try {
      const existingData = await this.getCachedPOIData();
      existingData[festivalId] = {
        pois,
        cachedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(STORAGE_KEYS.POI_DATA, JSON.stringify(existingData));
    } catch (error) {
      console.error('Failed to cache POI data:', error);
    }
  }

  /**
   * Get cached POI data
   */
  async getCachedPOIData(): Promise<Record<string, { pois: POIData[]; cachedAt: string }>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.POI_DATA);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  /**
   * Get POIs for a festival
   */
  async getPOIsForFestival(festivalId: string): Promise<POIData[]> {
    const data = await this.getCachedPOIData();
    return data[festivalId]?.pois || [];
  }

  /**
   * Get total cache size
   */
  async getCacheSize(): Promise<number> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(TILES_DIRECTORY);
      if (dirInfo.exists && 'size' in dirInfo) {
        return dirInfo.size;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Clear all cached tiles
   */
  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(TILES_DIRECTORY, { idempotent: true });
      await FileSystem.makeDirectoryAsync(TILES_DIRECTORY, { intermediates: true });
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_REGIONS);
      await AsyncStorage.removeItem(STORAGE_KEYS.POI_DATA);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Add listener for region updates
   */
  addRegionListener(id: string, callback: (region: OfflineRegion) => void): void {
    this.listeners.set(id, callback);
  }

  /**
   * Remove listener
   */
  removeRegionListener(id: string): void {
    this.listeners.delete(id);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(region: OfflineRegion): void {
    this.listeners.forEach((callback) => callback(region));
  }
}

// Export singleton instance
export const offlineMapService = new OfflineMapService();
export default OfflineMapService;
