/**
 * WiFi Positioning Service
 * Implements WiFi fingerprinting for indoor positioning
 * Uses signal strength patterns to estimate location
 */

import { Platform, NativeModules, PermissionsAndroid } from 'react-native';
import {
  WiFiAccessPoint,
  WiFiFingerprint,
  IndoorCoordinate,
  LocationErrorCode,
} from './types';

// WiFi scan constants
const MIN_RSSI = -100;
const MAX_RSSI = -30;
const FINGERPRINT_MATCH_THRESHOLD = 3; // Minimum matching APs
const POSITION_SMOOTHING_FACTOR = 0.4;

interface WiFiPositioningConfig {
  scanIntervalMs: number;
  fingerprints: WiFiFingerprint[];
  onPositionUpdated: (position: IndoorCoordinate | null) => void;
  onError: (error: { code: LocationErrorCode; message: string }) => void;
}

interface PositionEstimate {
  coordinate: IndoorCoordinate;
  confidence: number;
  matchedAPs: number;
}

// Native module interface for WiFi scanning
interface WiFiScannerModule {
  startScan(): Promise<WiFiAccessPoint[]>;
  getLastScanResults(): Promise<WiFiAccessPoint[]>;
  isWifiEnabled(): Promise<boolean>;
}

// Mock native module for development
const MockWiFiScanner: WiFiScannerModule = {
  async startScan() {
    // In production, this would use platform-specific native modules
    // For iOS: NEHotspotHelper (requires entitlement)
    // For Android: WifiManager.startScan()
    console.log('[WiFiPositioning] Mock WiFi scan triggered');
    return [];
  },
  async getLastScanResults() {
    return [];
  },
  async isWifiEnabled() {
    return true;
  },
};

// Get native module or use mock
const getWiFiScannerModule = (): WiFiScannerModule => {
  if (NativeModules.WiFiScanner) {
    return NativeModules.WiFiScanner as WiFiScannerModule;
  }
  return MockWiFiScanner;
};

export class WiFiPositioning {
  private config: WiFiPositioningConfig;
  private isScanning: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private wifiModule: WiFiScannerModule;
  private lastPosition: IndoorCoordinate | null = null;
  private fingerprintIndex: Map<string, WiFiFingerprint[]> = new Map();

  constructor(config: WiFiPositioningConfig) {
    this.config = config;
    this.wifiModule = getWiFiScannerModule();
    this.buildFingerprintIndex();
  }

  /**
   * Build an index of fingerprints by BSSID for faster lookup
   */
  private buildFingerprintIndex(): void {
    this.fingerprintIndex.clear();

    this.config.fingerprints.forEach((fingerprint) => {
      fingerprint.accessPoints.forEach((ap) => {
        const existing = this.fingerprintIndex.get(ap.bssid) || [];
        existing.push(fingerprint);
        this.fingerprintIndex.set(ap.bssid, existing);
      });
    });
  }

  /**
   * Request WiFi scan permissions (Android only)
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location for indoor positioning',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('[WiFiPositioning] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Check if WiFi is enabled
   */
  async isWiFiEnabled(): Promise<boolean> {
    try {
      return await this.wifiModule.isWifiEnabled();
    } catch (error) {
      console.error('[WiFiPositioning] Error checking WiFi state:', error);
      return false;
    }
  }

  /**
   * Start WiFi positioning
   */
  async startPositioning(): Promise<void> {
    if (this.isScanning) {
      console.log('[WiFiPositioning] Already scanning');
      return;
    }

    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      this.config.onError({
        code: 'PERMISSION_DENIED',
        message: 'Location permission not granted for WiFi positioning',
      });
      return;
    }

    const wifiEnabled = await this.isWiFiEnabled();
    if (!wifiEnabled) {
      this.config.onError({
        code: 'WIFI_DISABLED',
        message: 'WiFi is not enabled',
      });
      return;
    }

    this.isScanning = true;
    console.log('[WiFiPositioning] Starting WiFi positioning');

    // Start scanning cycle
    this.performScan();
    this.scanInterval = setInterval(() => {
      this.performScan();
    }, this.config.scanIntervalMs);
  }

  /**
   * Perform a single WiFi scan and estimate position
   */
  private async performScan(): Promise<void> {
    if (!this.isScanning) return;

    try {
      const accessPoints = await this.wifiModule.startScan();

      if (accessPoints.length === 0) {
        // Try to get last scan results if current scan returns empty
        const lastResults = await this.wifiModule.getLastScanResults();
        if (lastResults.length > 0) {
          this.estimatePosition(lastResults);
        }
        return;
      }

      this.estimatePosition(accessPoints);
    } catch (error) {
      console.error('[WiFiPositioning] Scan error:', error);
    }
  }

  /**
   * Estimate position from WiFi access points using k-NN algorithm
   */
  private estimatePosition(accessPoints: WiFiAccessPoint[]): void {
    if (this.config.fingerprints.length === 0) {
      this.config.onPositionUpdated(null);
      return;
    }

    // Calculate similarity scores for all fingerprints
    const candidates: PositionEstimate[] = [];

    this.config.fingerprints.forEach((fingerprint) => {
      const similarity = this.calculateSimilarity(accessPoints, fingerprint);

      if (similarity.matchedAPs >= FINGERPRINT_MATCH_THRESHOLD) {
        candidates.push({
          coordinate: fingerprint.coordinate,
          confidence: similarity.score,
          matchedAPs: similarity.matchedAPs,
        });
      }
    });

    if (candidates.length === 0) {
      this.config.onPositionUpdated(null);
      return;
    }

    // Sort by confidence (highest first)
    candidates.sort((a, b) => b.confidence - a.confidence);

    // Use weighted average of top k candidates
    const k = Math.min(3, candidates.length);
    const topCandidates = candidates.slice(0, k);

    const position = this.weightedAveragePosition(topCandidates);

    // Apply position smoothing
    if (this.lastPosition) {
      position.latitude =
        POSITION_SMOOTHING_FACTOR * position.latitude +
        (1 - POSITION_SMOOTHING_FACTOR) * this.lastPosition.latitude;
      position.longitude =
        POSITION_SMOOTHING_FACTOR * position.longitude +
        (1 - POSITION_SMOOTHING_FACTOR) * this.lastPosition.longitude;
    }

    this.lastPosition = position;
    this.config.onPositionUpdated(position);
  }

  /**
   * Calculate similarity between current scan and a fingerprint
   */
  private calculateSimilarity(
    accessPoints: WiFiAccessPoint[],
    fingerprint: WiFiFingerprint
  ): { score: number; matchedAPs: number } {
    let totalDiff = 0;
    let matchedAPs = 0;
    let totalWeight = 0;

    // Create map for quick lookup
    const currentAPMap = new Map<string, number>();
    accessPoints.forEach((ap) => {
      currentAPMap.set(ap.bssid.toLowerCase(), ap.rssi);
    });

    fingerprint.accessPoints.forEach((fpAP) => {
      const bssid = fpAP.bssid.toLowerCase();
      const currentRssi = currentAPMap.get(bssid);

      if (currentRssi !== undefined) {
        matchedAPs++;

        // Calculate difference with standard deviation weighting
        const diff = Math.abs(currentRssi - fpAP.meanRssi);
        const weight = 1 / Math.max(fpAP.stdRssi, 1);

        totalDiff += diff * weight;
        totalWeight += weight;
      }
    });

    if (matchedAPs === 0) {
      return { score: 0, matchedAPs: 0 };
    }

    // Normalize score (higher is better)
    const avgDiff = totalDiff / totalWeight;
    const score = Math.max(0, 1 - avgDiff / 50); // Normalize with 50 dB max difference

    return { score, matchedAPs };
  }

  /**
   * Calculate weighted average position from candidates
   */
  private weightedAveragePosition(candidates: PositionEstimate[]): IndoorCoordinate {
    let totalWeight = 0;
    let weightedLat = 0;
    let weightedLng = 0;
    let weightedAlt = 0;
    const floorVotes: Map<number, number> = new Map();

    candidates.forEach((candidate) => {
      const weight = candidate.confidence * candidate.matchedAPs;
      totalWeight += weight;

      weightedLat += candidate.coordinate.latitude * weight;
      weightedLng += candidate.coordinate.longitude * weight;
      weightedAlt += (candidate.coordinate.altitude || 0) * weight;

      // Vote for floor
      const floor = candidate.coordinate.floor;
      floorVotes.set(floor, (floorVotes.get(floor) || 0) + weight);
    });

    // Determine floor by weighted voting
    let maxWeight = 0;
    let selectedFloor = 0;
    floorVotes.forEach((weight, floor) => {
      if (weight > maxWeight) {
        maxWeight = weight;
        selectedFloor = floor;
      }
    });

    // Calculate accuracy based on spread of candidates
    const avgConfidence =
      candidates.reduce((sum, c) => sum + c.confidence, 0) / candidates.length;
    const accuracy = Math.max(3, (1 - avgConfidence) * 20); // 3-20 meters

    return {
      latitude: weightedLat / totalWeight,
      longitude: weightedLng / totalWeight,
      altitude: weightedAlt / totalWeight,
      floor: selectedFloor,
      accuracy,
      source: 'wifi',
      timestamp: Date.now(),
    };
  }

  /**
   * Stop WiFi positioning
   */
  stopPositioning(): void {
    if (!this.isScanning) return;

    this.isScanning = false;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    console.log('[WiFiPositioning] Stopped positioning');
  }

  /**
   * Get last estimated position
   */
  getLastPosition(): IndoorCoordinate | null {
    return this.lastPosition;
  }

  /**
   * Update fingerprint database
   */
  updateFingerprints(fingerprints: WiFiFingerprint[]): void {
    this.config.fingerprints = fingerprints;
    this.buildFingerprintIndex();
  }

  /**
   * Add a new fingerprint (for calibration)
   */
  async captureFingerprint(
    locationId: string,
    coordinate: IndoorCoordinate
  ): Promise<WiFiFingerprint | null> {
    try {
      // Collect multiple samples
      const samples: WiFiAccessPoint[][] = [];
      const sampleCount = 5;
      const sampleInterval = 1000;

      for (let i = 0; i < sampleCount; i++) {
        const aps = await this.wifiModule.startScan();
        if (aps.length > 0) {
          samples.push(aps);
        }
        await new Promise((resolve) => setTimeout(resolve, sampleInterval));
      }

      if (samples.length === 0) {
        return null;
      }

      // Aggregate samples
      const apStats: Map<
        string,
        { rssiValues: number[]; ssid: string }
      > = new Map();

      samples.forEach((sample) => {
        sample.forEach((ap) => {
          const bssid = ap.bssid.toLowerCase();
          const existing = apStats.get(bssid);
          if (existing) {
            existing.rssiValues.push(ap.rssi);
          } else {
            apStats.set(bssid, {
              rssiValues: [ap.rssi],
              ssid: ap.ssid,
            });
          }
        });
      });

      // Calculate mean and std for each AP
      const accessPoints = Array.from(apStats.entries())
        .filter(([_, stats]) => stats.rssiValues.length >= sampleCount / 2)
        .map(([bssid, stats]) => {
          const mean =
            stats.rssiValues.reduce((a, b) => a + b, 0) / stats.rssiValues.length;
          const variance =
            stats.rssiValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
            stats.rssiValues.length;
          const std = Math.sqrt(variance);

          return {
            bssid,
            meanRssi: mean,
            stdRssi: std,
          };
        });

      return {
        locationId,
        coordinate,
        accessPoints,
      };
    } catch (error) {
      console.error('[WiFiPositioning] Error capturing fingerprint:', error);
      return null;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WiFiPositioningConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.fingerprints) {
      this.buildFingerprintIndex();
    }
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.stopPositioning();
    this.fingerprintIndex.clear();
  }
}

export default WiFiPositioning;
