/**
 * useOfflineMap Hook
 * React hook for managing offline map regions and tiles
 */

import { useState, useEffect, useCallback } from 'react';
import {
  offlineMapService,
  OfflineRegion,
  MapRegion,
  POIData,
} from '../services/maps/OfflineMapService';

export interface UseOfflineMapState {
  regions: OfflineRegion[];
  isLoading: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  currentDownload: OfflineRegion | null;
  cacheSize: number;
  error: string | null;
}

export interface UseOfflineMapActions {
  downloadRegion: (
    name: string,
    region: MapRegion,
    minZoom?: number,
    maxZoom?: number
  ) => Promise<OfflineRegion>;
  pauseDownload: () => void;
  resumeDownload: (regionId: string) => Promise<void>;
  deleteRegion: (regionId: string) => Promise<void>;
  clearCache: () => Promise<void>;
  refreshRegions: () => Promise<void>;
  getCachedTileUri: (x: number, y: number, z: number) => Promise<string | null>;
  cachePOIs: (festivalId: string, pois: POIData[]) => Promise<void>;
  getPOIs: (festivalId: string) => Promise<POIData[]>;
  calculateTileCount: (region: MapRegion, minZoom: number, maxZoom: number) => number;
  estimateDownloadSize: (tileCount: number) => string;
}

export type UseOfflineMapReturn = UseOfflineMapState & UseOfflineMapActions;

export function useOfflineMap(): UseOfflineMapReturn {
  const [regions, setRegions] = useState<OfflineRegion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentDownload, setCurrentDownload] = useState<OfflineRegion | null>(null);
  const [cacheSize, setCacheSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load regions on mount
  useEffect(() => {
    loadRegions();
    loadCacheSize();
  }, []);

  // Listen for region updates
  useEffect(() => {
    const listenerId = 'useOfflineMap';

    offlineMapService.addRegionListener(listenerId, (updatedRegion) => {
      setRegions((prev) => {
        const index = prev.findIndex((r) => r.id === updatedRegion.id);
        if (index >= 0) {
          const newRegions = [...prev];
          newRegions[index] = updatedRegion;
          return newRegions;
        }
        return [...prev, updatedRegion];
      });

      if (updatedRegion.status === 'downloading') {
        setDownloadProgress(updatedRegion.progress);
        setCurrentDownload(updatedRegion);
      } else if (updatedRegion.status === 'completed' || updatedRegion.status === 'error') {
        setIsDownloading(false);
        setCurrentDownload(null);
        loadCacheSize();
      }
    });

    return () => {
      offlineMapService.removeRegionListener(listenerId);
    };
  }, []);

  const loadRegions = async () => {
    try {
      setIsLoading(true);
      const savedRegions = await offlineMapService.getOfflineRegions();
      setRegions(savedRegions);
    } catch {
      setError('Failed to load offline regions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCacheSize = async () => {
    const size = await offlineMapService.getCacheSize();
    setCacheSize(size);
  };

  const downloadRegion = useCallback(
    async (name: string, region: MapRegion, minZoom = 12, maxZoom = 16): Promise<OfflineRegion> => {
      setError(null);
      setIsDownloading(true);
      setDownloadProgress(0);

      try {
        const offlineRegion = await offlineMapService.downloadRegion(
          name,
          region,
          minZoom,
          maxZoom,
          (progress, _downloaded, _total) => {
            setDownloadProgress(progress);
          }
        );
        await loadRegions();
        await loadCacheSize();
        return offlineRegion;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Download failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsDownloading(false);
        setCurrentDownload(null);
      }
    },
    []
  );

  const pauseDownload = useCallback(() => {
    offlineMapService.pauseDownload();
    setIsDownloading(false);
  }, []);

  const resumeDownload = useCallback(async (regionId: string) => {
    setError(null);
    setIsDownloading(true);
    try {
      await offlineMapService.resumeDownload(regionId);
      await loadRegions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Resume failed';
      setError(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const deleteRegion = useCallback(async (regionId: string) => {
    setError(null);
    try {
      await offlineMapService.deleteRegion(regionId);
      await loadRegions();
      await loadCacheSize();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
    }
  }, []);

  const clearCache = useCallback(async () => {
    setError(null);
    try {
      await offlineMapService.clearCache();
      setRegions([]);
      setCacheSize(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Clear cache failed';
      setError(errorMessage);
    }
  }, []);

  const refreshRegions = useCallback(async () => {
    await loadRegions();
    await loadCacheSize();
  }, []);

  const getCachedTileUri = useCallback(
    async (x: number, y: number, z: number): Promise<string | null> => {
      return offlineMapService.getCachedTileUri(x, y, z);
    },
    []
  );

  const cachePOIs = useCallback(async (festivalId: string, pois: POIData[]) => {
    await offlineMapService.cachePOIData(festivalId, pois);
  }, []);

  const getPOIs = useCallback(async (festivalId: string): Promise<POIData[]> => {
    return offlineMapService.getPOIsForFestival(festivalId);
  }, []);

  const calculateTileCount = useCallback(
    (region: MapRegion, minZoom: number, maxZoom: number): number => {
      return offlineMapService.calculateTileCount(region, minZoom, maxZoom);
    },
    []
  );

  const estimateDownloadSize = useCallback((tileCount: number): string => {
    // Average tile size is ~15KB for OSM tiles
    const avgTileSizeKB = 15;
    const totalSizeKB = tileCount * avgTileSizeKB;

    if (totalSizeKB < 1024) {
      return `${totalSizeKB.toFixed(0)} KB`;
    } else if (totalSizeKB < 1024 * 1024) {
      return `${(totalSizeKB / 1024).toFixed(1)} MB`;
    } else {
      return `${(totalSizeKB / 1024 / 1024).toFixed(2)} GB`;
    }
  }, []);

  return {
    regions,
    isLoading,
    isDownloading,
    downloadProgress,
    currentDownload,
    cacheSize,
    error,
    downloadRegion,
    pauseDownload,
    resumeDownload,
    deleteRegion,
    clearCache,
    refreshRegions,
    getCachedTileUri,
    cachePOIs,
    getPOIs,
    calculateTileCount,
    estimateDownloadSize,
  };
}

export default useOfflineMap;
