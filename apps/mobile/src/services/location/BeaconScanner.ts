/**
 * Beacon Scanner Service
 * Handles BLE beacon scanning for indoor positioning (iBeacon/Eddystone)
 * Uses react-native-ble-plx for BLE operations
 */

import { BleManager, Device, State } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  Beacon,
  BeaconRegion,
  BeaconConfig,
  BeaconAccuracy,
  BeaconUpdateEvent,
  LocationErrorCode,
} from './types';

// Signal processing constants
const RSSI_FILTER_COEFFICIENT = 0.3; // Low-pass filter coefficient
const DISTANCE_DECAY_TIME = 5000; // Time in ms before beacon is considered lost

interface BeaconScannerConfig {
  scanIntervalMs: number;
  scanDurationMs: number;
  regions: BeaconRegion[];
  beaconConfigs: BeaconConfig[];
  onBeaconsUpdated: (event: BeaconUpdateEvent) => void;
  onError: (error: { code: LocationErrorCode; message: string }) => void;
}

interface TrackedBeacon extends Beacon {
  filteredRssi: number;
  lastUpdated: number;
}

export class BeaconScanner {
  private bleManager: BleManager;
  private config: BeaconScannerConfig;
  private isScanning = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private trackedBeacons = new Map<string, TrackedBeacon>();
  private beaconConfigMap = new Map<string, BeaconConfig>();

  constructor(config: BeaconScannerConfig) {
    this.bleManager = new BleManager();
    this.config = config;
    this.initializeBeaconConfigs();
  }

  private initializeBeaconConfigs(): void {
    this.config.beaconConfigs.forEach((config) => {
      const key = this.getBeaconKey(config.uuid, config.major, config.minor);
      this.beaconConfigMap.set(key, config);
    });
  }

  private getBeaconKey(uuid: string, major: number, minor: number): string {
    return `${uuid.toLowerCase()}_${major}_${minor}`;
  }

  /**
   * Request necessary permissions for BLE scanning
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      // iOS permissions are handled in Info.plist
      return true;
    }

    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version;

      if (apiLevel >= 31) {
        // Android 12+
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return Object.values(results).every(
          (result) => result === PermissionsAndroid.RESULTS.GRANTED
        );
      } else if (apiLevel >= 29) {
        // Android 10-11
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        ]);

        return Object.values(results).every(
          (result) => result === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        // Android 9 and below
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
    }

    return false;
  }

  /**
   * Check if Bluetooth is enabled
   */
  async isBluetoothEnabled(): Promise<boolean> {
    const state = await this.bleManager.state();
    return state === State.PoweredOn;
  }

  /**
   * Start beacon scanning
   */
  async startScanning(): Promise<void> {
    if (this.isScanning) {
      console.log('[BeaconScanner] Already scanning');
      return;
    }

    // Check permissions
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      this.config.onError({
        code: 'PERMISSION_DENIED',
        message: 'Bluetooth permissions not granted',
      });
      return;
    }

    // Check Bluetooth state
    const isEnabled = await this.isBluetoothEnabled();
    if (!isEnabled) {
      this.config.onError({
        code: 'BLUETOOTH_DISABLED',
        message: 'Bluetooth is not enabled',
      });
      return;
    }

    this.isScanning = true;
    console.log('[BeaconScanner] Starting beacon scan');

    // Start continuous scanning with intervals
    this.startScanCycle();
  }

  private startScanCycle(): void {
    const performScan = async () => {
      if (!this.isScanning) {
        return;
      }

      try {
        await this.performSingleScan();
      } catch (error) {
        console.error('[BeaconScanner] Scan error:', error);
        this.config.onError({
          code: 'BEACON_SCAN_FAILED',
          message: error instanceof Error ? error.message : 'Unknown scan error',
        });
      }
    };

    // Initial scan
    performScan();

    // Schedule periodic scans
    this.scanInterval = setInterval(performScan, this.config.scanIntervalMs);
  }

  private async performSingleScan(): Promise<void> {
    return new Promise((resolve) => {
      const scanTimeout = setTimeout(() => {
        this.bleManager.stopDeviceScan();
        this.processScannedBeacons();
        resolve();
      }, this.config.scanDurationMs);

      this.bleManager.startDeviceScan(
        null, // Scan all UUIDs
        { allowDuplicates: true },
        (error, device) => {
          if (error) {
            console.error('[BeaconScanner] Device scan error:', error);
            clearTimeout(scanTimeout);
            resolve();
            return;
          }

          if (device) {
            this.processDevice(device);
          }
        }
      );
    });
  }

  private processDevice(device: Device): void {
    // Try to parse as iBeacon
    const beacon = this.parseIBeacon(device);
    if (beacon) {
      this.updateTrackedBeacon(beacon);
    }
  }

  private parseIBeacon(device: Device): Beacon | null {
    const manufacturerData = device.manufacturerData;
    if (!manufacturerData) {
      return null;
    }

    try {
      // Decode base64 manufacturer data
      const data = this.base64ToBytes(manufacturerData);

      // Check for Apple iBeacon prefix (0x004C followed by 0x0215)
      if (data.length < 25 || data[0] !== 0x4c || data[1] !== 0x00) {
        return null;
      }

      // Check beacon type (0x02) and length (0x15 = 21)
      if (data[2] !== 0x02 || data[3] !== 0x15) {
        return null;
      }

      // Extract UUID (bytes 4-19)
      const uuid = this.bytesToUUID(data.slice(4, 20));

      // Extract major (bytes 20-21)
      const major = (data[20] << 8) | data[21];

      // Extract minor (bytes 22-23)
      const minor = (data[22] << 8) | data[23];

      // Extract TX power (byte 24)
      const txPower = data[24] > 127 ? data[24] - 256 : data[24];

      // Check if this beacon belongs to a monitored region
      const isMonitored = this.config.regions.some(
        (region) =>
          region.uuid.toLowerCase() === uuid.toLowerCase() &&
          (region.major === undefined || region.major === major) &&
          (region.minor === undefined || region.minor === minor)
      );

      if (!isMonitored) {
        return null;
      }

      const rssi = device.rssi || -100;
      const distance = this.calculateDistance(rssi, txPower);

      return {
        uuid,
        major,
        minor,
        rssi,
        txPower,
        distance,
        accuracy: this.getAccuracyLevel(distance),
        lastSeen: Date.now(),
      };
    } catch (error) {
      console.error('[BeaconScanner] Error parsing iBeacon:', error);
      return null;
    }
  }

  private base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private bytesToUUID(bytes: Uint8Array): string {
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
      16,
      20
    )}-${hex.slice(20)}`;
  }

  /**
   * Calculate distance from RSSI using log-distance path loss model
   */
  private calculateDistance(rssi: number, txPower: number): number {
    if (rssi === 0) {
      return -1;
    }

    // Using empirical formula for distance estimation
    const ratio = rssi / txPower;

    if (ratio < 1.0) {
      return Math.pow(ratio, 10);
    } else {
      return 0.89976 * Math.pow(ratio, 7.7095) + 0.111;
    }
  }

  private getAccuracyLevel(distance: number): BeaconAccuracy {
    if (distance < 0) {
      return 'unknown';
    }
    if (distance < 0.5) {
      return 'immediate';
    }
    if (distance < 3) {
      return 'near';
    }
    return 'far';
  }

  private updateTrackedBeacon(beacon: Beacon): void {
    const key = this.getBeaconKey(beacon.uuid, beacon.major, beacon.minor);
    const existing = this.trackedBeacons.get(key);

    if (existing) {
      // Apply low-pass filter to RSSI
      const filteredRssi =
        RSSI_FILTER_COEFFICIENT * beacon.rssi +
        (1 - RSSI_FILTER_COEFFICIENT) * existing.filteredRssi;

      const filteredDistance = this.calculateDistance(filteredRssi, beacon.txPower);

      this.trackedBeacons.set(key, {
        ...beacon,
        rssi: beacon.rssi,
        filteredRssi,
        distance: filteredDistance,
        accuracy: this.getAccuracyLevel(filteredDistance),
        lastUpdated: Date.now(),
      });
    } else {
      this.trackedBeacons.set(key, {
        ...beacon,
        filteredRssi: beacon.rssi,
        lastUpdated: Date.now(),
      });
    }
  }

  private processScannedBeacons(): void {
    const now = Date.now();
    const activeBeacons: Beacon[] = [];

    // Remove stale beacons and collect active ones
    this.trackedBeacons.forEach((beacon, key) => {
      if (now - beacon.lastUpdated > DISTANCE_DECAY_TIME) {
        this.trackedBeacons.delete(key);
      } else {
        activeBeacons.push({
          uuid: beacon.uuid,
          major: beacon.major,
          minor: beacon.minor,
          rssi: beacon.filteredRssi,
          txPower: beacon.txPower,
          distance: beacon.distance,
          accuracy: beacon.accuracy,
          lastSeen: beacon.lastSeen,
        });
      }
    });

    // Sort by distance (closest first)
    activeBeacons.sort((a, b) => a.distance - b.distance);

    // Emit update event
    this.config.onBeaconsUpdated({
      beacons: activeBeacons,
      timestamp: now,
    });
  }

  /**
   * Stop beacon scanning
   */
  stopScanning(): void {
    if (!this.isScanning) {
      return;
    }

    this.isScanning = false;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    this.bleManager.stopDeviceScan();
    this.trackedBeacons.clear();

    console.log('[BeaconScanner] Stopped scanning');
  }

  /**
   * Get current tracked beacons
   */
  getTrackedBeacons(): Beacon[] {
    return Array.from(this.trackedBeacons.values()).map((b) => ({
      uuid: b.uuid,
      major: b.major,
      minor: b.minor,
      rssi: b.filteredRssi,
      txPower: b.txPower,
      distance: b.distance,
      accuracy: b.accuracy,
      lastSeen: b.lastSeen,
    }));
  }

  /**
   * Get beacon configuration for a specific beacon
   */
  getBeaconConfig(uuid: string, major: number, minor: number): BeaconConfig | undefined {
    const key = this.getBeaconKey(uuid, major, minor);
    return this.beaconConfigMap.get(key);
  }

  /**
   * Calculate position from beacons using trilateration
   */
  calculatePositionFromBeacons(): { x: number; y: number; floor: number } | null {
    const beacons = this.getTrackedBeacons();
    if (beacons.length < 3) {
      return null;
    }

    // Get configurations for nearest beacons
    const beaconsWithConfig = beacons
      .slice(0, 5) // Use up to 5 nearest beacons
      .map((beacon) => ({
        beacon,
        config: this.getBeaconConfig(beacon.uuid, beacon.major, beacon.minor),
      }))
      .filter((b) => b.config !== undefined);

    if (beaconsWithConfig.length < 3) {
      return null;
    }

    // Weighted centroid calculation (weighted by inverse distance)
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;
    const floorVotes = new Map<number, number>();

    beaconsWithConfig.forEach(({ beacon, config }) => {
      if (!config) {
        return;
      }

      const weight = 1 / Math.max(beacon.distance, 0.1); // Avoid division by zero
      totalWeight += weight;
      weightedX += config.coordinate.latitude * weight;
      weightedY += config.coordinate.longitude * weight;

      // Vote for floor
      const floor = config.coordinate.floor;
      floorVotes.set(floor, (floorVotes.get(floor) || 0) + weight);
    });

    // Determine most likely floor
    let maxFloorWeight = 0;
    let mostLikelyFloor = 0;
    floorVotes.forEach((weight, floor) => {
      if (weight > maxFloorWeight) {
        maxFloorWeight = weight;
        mostLikelyFloor = floor;
      }
    });

    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight,
      floor: mostLikelyFloor,
    };
  }

  /**
   * Update scan configuration
   */
  updateConfig(newConfig: Partial<BeaconScannerConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.beaconConfigs) {
      this.beaconConfigMap.clear();
      this.initializeBeaconConfigs();
    }
  }

  /**
   * Destroy the scanner and release resources
   */
  destroy(): void {
    this.stopScanning();
    this.bleManager.destroy();
  }
}

export default BeaconScanner;
