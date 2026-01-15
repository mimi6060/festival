/**
 * Indoor Location Manager
 * Main orchestrator for indoor positioning system
 * Manages BeaconScanner, WiFiPositioning, and LocationFusion
 */

import { AppState, AppStateStatus, NativeEventEmitter, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BeaconScanner } from './BeaconScanner';
import { WiFiPositioning } from './WiFiPositioning';
import { LocationFusion } from './LocationFusion';
import {
  IndoorCoordinate,
  LocationState,
  LocationError,
  BatteryMode,
  BeaconConfig,
  BeaconRegion,
  WiFiFingerprint,
  Zone,
  Geofence,
  GeofenceEvent,
  GeofenceNotification,
  Floor,
  POI,
  HeatmapData,
  NavigationRoute,
  Beacon,
} from './types';

// Storage keys
const STORAGE_KEYS = {
  BEACON_CONFIGS: '@location/beacon_configs',
  WIFI_FINGERPRINTS: '@location/wifi_fingerprints',
  ZONES: '@location/zones',
  GEOFENCES: '@location/geofences',
  FLOORS: '@location/floors',
  LAST_POSITION: '@location/last_position',
  BATTERY_MODE: '@location/battery_mode',
};

// Default configuration
const DEFAULT_SCAN_INTERVAL = 2000;
const DEFAULT_SCAN_DURATION = 1500;
const DEFAULT_BEACON_UUID = 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825'; // Example iBeacon UUID

export interface IndoorLocationManagerConfig {
  festivalId: string;
  apiEndpoint?: string;
  enableBeacons?: boolean;
  enableWiFi?: boolean;
  enableGPS?: boolean;
  batteryMode?: BatteryMode;
}

export interface IndoorLocationManagerCallbacks {
  onLocationUpdated?: (location: IndoorCoordinate) => void;
  onIndoorOutdoorTransition?: (isIndoor: boolean) => void;
  onZoneChanged?: (zone: Zone | null) => void;
  onGeofenceEvent?: (event: GeofenceEvent) => void;
  onError?: (error: LocationError) => void;
  onBeaconsUpdated?: (beacons: Beacon[]) => void;
}

class IndoorLocationManager {
  private static instance: IndoorLocationManager | null = null;

  private beaconScanner: BeaconScanner | null = null;
  private wifiPositioning: WiFiPositioning | null = null;
  private locationFusion: LocationFusion | null = null;

  private config: IndoorLocationManagerConfig | null = null;
  private callbacks: IndoorLocationManagerCallbacks = {};
  private appStateSubscription: any = null;
  private isInitialized = false;
  private isTracking = false;

  // Data
  private beaconConfigs: BeaconConfig[] = [];
  private beaconRegions: BeaconRegion[] = [];
  private wifiFingerprints: WiFiFingerprint[] = [];
  private zones: Zone[] = [];
  private geofences: Geofence[] = [];
  private floors: Floor[] = [];
  private activeGeofences = new Set<string>();
  private currentLocation: IndoorCoordinate | null = null;

  private constructor() {}

  static getInstance(): IndoorLocationManager {
    if (!IndoorLocationManager.instance) {
      IndoorLocationManager.instance = new IndoorLocationManager();
    }
    return IndoorLocationManager.instance;
  }

  /**
   * Initialize the indoor location manager
   */
  async initialize(
    config: IndoorLocationManagerConfig,
    callbacks: IndoorLocationManagerCallbacks = {}
  ): Promise<void> {
    if (this.isInitialized) {
      console.log('[IndoorLocationManager] Already initialized');
      return;
    }

    console.log('[IndoorLocationManager] Initializing...');
    this.config = config;
    this.callbacks = callbacks;

    // Load cached data
    await this.loadCachedData();

    // Fetch latest configuration from API
    await this.fetchConfiguration();

    // Initialize services
    this.initializeServices();

    // Listen to app state changes for battery optimization
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );

    this.isInitialized = true;
    console.log('[IndoorLocationManager] Initialized successfully');
  }

  /**
   * Load cached data from storage
   */
  private async loadCachedData(): Promise<void> {
    try {
      const [
        beaconConfigs,
        wifiFingerprints,
        zones,
        geofences,
        floors,
        lastPosition,
        batteryMode,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.BEACON_CONFIGS),
        AsyncStorage.getItem(STORAGE_KEYS.WIFI_FINGERPRINTS),
        AsyncStorage.getItem(STORAGE_KEYS.ZONES),
        AsyncStorage.getItem(STORAGE_KEYS.GEOFENCES),
        AsyncStorage.getItem(STORAGE_KEYS.FLOORS),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_POSITION),
        AsyncStorage.getItem(STORAGE_KEYS.BATTERY_MODE),
      ]);

      if (beaconConfigs) {this.beaconConfigs = JSON.parse(beaconConfigs);}
      if (wifiFingerprints) {this.wifiFingerprints = JSON.parse(wifiFingerprints);}
      if (zones) {this.zones = JSON.parse(zones);}
      if (geofences) {this.geofences = JSON.parse(geofences);}
      if (floors) {this.floors = JSON.parse(floors);}
      if (lastPosition) {this.currentLocation = JSON.parse(lastPosition);}
      if (batteryMode && this.config) {
        this.config.batteryMode = batteryMode as BatteryMode;
      }

      // Extract beacon regions from configs
      this.beaconRegions = this.extractBeaconRegions();

      console.log('[IndoorLocationManager] Loaded cached data');
    } catch (error) {
      console.error('[IndoorLocationManager] Error loading cached data:', error);
    }
  }

  private extractBeaconRegions(): BeaconRegion[] {
    const uniqueRegions = new Map<string, BeaconRegion>();

    this.beaconConfigs.forEach((config) => {
      const key = config.uuid.toLowerCase();
      if (!uniqueRegions.has(key)) {
        uniqueRegions.set(key, {
          uuid: config.uuid,
          identifier: `region_${config.uuid.slice(0, 8)}`,
        });
      }
    });

    return Array.from(uniqueRegions.values());
  }

  /**
   * Fetch configuration from API
   */
  private async fetchConfiguration(): Promise<void> {
    if (!this.config?.apiEndpoint || !this.config?.festivalId) {
      console.log('[IndoorLocationManager] No API endpoint configured, using cached data');
      return;
    }

    try {
      const response = await fetch(
        `${this.config.apiEndpoint}/festivals/${this.config.festivalId}/indoor-config`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Update local data
      if (data.beaconConfigs) {
        this.beaconConfigs = data.beaconConfigs;
        await AsyncStorage.setItem(
          STORAGE_KEYS.BEACON_CONFIGS,
          JSON.stringify(this.beaconConfigs)
        );
      }

      if (data.wifiFingerprints) {
        this.wifiFingerprints = data.wifiFingerprints;
        await AsyncStorage.setItem(
          STORAGE_KEYS.WIFI_FINGERPRINTS,
          JSON.stringify(this.wifiFingerprints)
        );
      }

      if (data.zones) {
        this.zones = data.zones;
        await AsyncStorage.setItem(STORAGE_KEYS.ZONES, JSON.stringify(this.zones));
      }

      if (data.geofences) {
        this.geofences = data.geofences;
        await AsyncStorage.setItem(
          STORAGE_KEYS.GEOFENCES,
          JSON.stringify(this.geofences)
        );
      }

      if (data.floors) {
        this.floors = data.floors;
        await AsyncStorage.setItem(STORAGE_KEYS.FLOORS, JSON.stringify(this.floors));
      }

      this.beaconRegions = this.extractBeaconRegions();

      console.log('[IndoorLocationManager] Fetched configuration from API');
    } catch (error) {
      console.error('[IndoorLocationManager] Error fetching configuration:', error);
    }
  }

  /**
   * Initialize tracking services
   */
  private initializeServices(): void {
    const batteryMode = this.config?.batteryMode || 'balanced';

    // Initialize Beacon Scanner
    if (this.config?.enableBeacons !== false) {
      this.beaconScanner = new BeaconScanner({
        scanIntervalMs: this.getScanInterval(batteryMode),
        scanDurationMs: DEFAULT_SCAN_DURATION,
        regions: this.beaconRegions,
        beaconConfigs: this.beaconConfigs,
        onBeaconsUpdated: (event) => {
          this.handleBeaconsUpdated(event.beacons);
        },
        onError: (error) => {
          this.handleError({
            code: error.code,
            message: error.message,
            timestamp: Date.now(),
          });
        },
      });
    }

    // Initialize WiFi Positioning
    if (this.config?.enableWiFi !== false) {
      this.wifiPositioning = new WiFiPositioning({
        scanIntervalMs: this.getScanInterval(batteryMode) * 1.5,
        fingerprints: this.wifiFingerprints,
        onPositionUpdated: (position) => {
          this.locationFusion?.updateWiFiPosition(position);
        },
        onError: (error) => {
          this.handleError({
            code: error.code,
            message: error.message,
            timestamp: Date.now(),
          });
        },
      });
    }

    // Initialize Location Fusion
    this.locationFusion = new LocationFusion({
      enableGPS: this.config?.enableGPS !== false,
      enableBeacons: this.config?.enableBeacons !== false,
      enableWiFi: this.config?.enableWiFi !== false,
      batteryMode,
      onLocationUpdated: (location) => {
        this.handleLocationUpdated(location);
      },
      onIndoorOutdoorTransition: (isIndoor) => {
        this.callbacks.onIndoorOutdoorTransition?.(isIndoor);
      },
      onZoneChanged: (zone) => {
        this.callbacks.onZoneChanged?.(zone);
      },
      onError: (error) => {
        this.handleError(error);
      },
    });

    // Set zones for geofencing
    this.locationFusion.setZones(this.zones);
  }

  private getScanInterval(mode: BatteryMode): number {
    switch (mode) {
      case 'high_accuracy':
        return 1000;
      case 'balanced':
        return 2000;
      case 'low_power':
        return 5000;
      default:
        return DEFAULT_SCAN_INTERVAL;
    }
  }

  /**
   * Handle beacons updated
   */
  private handleBeaconsUpdated(beacons: Beacon[]): void {
    // Calculate position from beacons
    const position = this.beaconScanner?.calculatePositionFromBeacons();

    // Update fusion
    this.locationFusion?.updateBeaconPosition(position, beacons);

    // Notify callback
    this.callbacks.onBeaconsUpdated?.(beacons);
  }

  /**
   * Handle location updated
   */
  private handleLocationUpdated(location: IndoorCoordinate): void {
    this.currentLocation = location;

    // Save last position
    AsyncStorage.setItem(
      STORAGE_KEYS.LAST_POSITION,
      JSON.stringify(location)
    ).catch(console.error);

    // Check geofences
    this.checkGeofences(location);

    // Notify callback
    this.callbacks.onLocationUpdated?.(location);
  }

  /**
   * Check geofence transitions
   */
  private checkGeofences(location: IndoorCoordinate): void {
    this.geofences.forEach((geofence) => {
      const isInside = this.isInsideGeofence(location, geofence);
      const wasInside = this.activeGeofences.has(geofence.id);

      if (isInside && !wasInside && geofence.triggerOnEnter) {
        this.activeGeofences.add(geofence.id);
        this.triggerGeofenceEvent(geofence, 'enter', location);
      } else if (!isInside && wasInside && geofence.triggerOnExit) {
        this.activeGeofences.delete(geofence.id);
        this.triggerGeofenceEvent(geofence, 'exit', location);
      }
    });
  }

  private isInsideGeofence(
    location: IndoorCoordinate,
    geofence: Geofence
  ): boolean {
    // Check floor if specified
    if (geofence.floor !== undefined && location.floor !== geofence.floor) {
      return false;
    }

    // Calculate distance
    const distance = this.calculateDistance(
      location.latitude,
      location.longitude,
      geofence.coordinate.latitude,
      geofence.coordinate.longitude
    );

    return distance <= geofence.radius;
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private triggerGeofenceEvent(
    geofence: Geofence,
    type: 'enter' | 'exit',
    location: IndoorCoordinate
  ): void {
    const event: GeofenceEvent = {
      geofenceId: geofence.id,
      type,
      timestamp: Date.now(),
      location,
    };

    console.log(`[IndoorLocationManager] Geofence ${type}: ${geofence.name}`);
    this.callbacks.onGeofenceEvent?.(event);

    // Trigger notification if configured
    if (geofence.notification) {
      this.showGeofenceNotification(geofence.notification);
    }
  }

  private async showGeofenceNotification(
    notification: GeofenceNotification
  ): Promise<void> {
    // This would integrate with push notification service
    console.log('[IndoorLocationManager] Notification:', notification.title);
    // Implementation would depend on notification library (e.g., notifee, react-native-push-notification)
  }

  /**
   * Handle error
   */
  private handleError(error: LocationError): void {
    console.error('[IndoorLocationManager] Error:', error);
    this.callbacks.onError?.(error);
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'background') {
      this.enterBackgroundMode();
    } else if (nextAppState === 'active') {
      this.enterForegroundMode();
    }
  }

  private enterBackgroundMode(): void {
    console.log('[IndoorLocationManager] Entering background mode');

    // Reduce scan frequency
    if (this.config?.batteryMode !== 'high_accuracy') {
      this.setBatteryMode('low_power');
    }
  }

  private enterForegroundMode(): void {
    console.log('[IndoorLocationManager] Entering foreground mode');

    // Restore configured battery mode
    const savedMode = this.config?.batteryMode || 'balanced';
    this.setBatteryMode(savedMode);
  }

  /**
   * Start location tracking
   */
  async startTracking(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('IndoorLocationManager not initialized');
    }

    if (this.isTracking) {
      console.log('[IndoorLocationManager] Already tracking');
      return;
    }

    console.log('[IndoorLocationManager] Starting tracking');

    // Start all services
    await this.beaconScanner?.startScanning();
    await this.wifiPositioning?.startPositioning();
    this.locationFusion?.startFusion();

    this.isTracking = true;
  }

  /**
   * Stop location tracking
   */
  stopTracking(): void {
    if (!this.isTracking) {return;}

    console.log('[IndoorLocationManager] Stopping tracking');

    this.beaconScanner?.stopScanning();
    this.wifiPositioning?.stopPositioning();
    this.locationFusion?.stopFusion();

    this.isTracking = false;
  }

  /**
   * Set battery mode
   */
  setBatteryMode(mode: BatteryMode): void {
    console.log(`[IndoorLocationManager] Setting battery mode: ${mode}`);

    if (this.config) {
      this.config.batteryMode = mode;
    }

    this.locationFusion?.setBatteryMode(mode);

    // Update scan intervals
    const scanInterval = this.getScanInterval(mode);
    this.beaconScanner?.updateConfig({ scanIntervalMs: scanInterval });
    this.wifiPositioning?.updateConfig({ scanIntervalMs: scanInterval * 1.5 });

    // Save preference
    AsyncStorage.setItem(STORAGE_KEYS.BATTERY_MODE, mode).catch(console.error);
  }

  /**
   * Get current location
   */
  getCurrentLocation(): IndoorCoordinate | null {
    return this.currentLocation;
  }

  /**
   * Get location state
   */
  getLocationState(): LocationState | null {
    return this.locationFusion?.getLocationState() || null;
  }

  /**
   * Get floors
   */
  getFloors(): Floor[] {
    return this.floors;
  }

  /**
   * Get POIs for a floor
   */
  getPOIsForFloor(floor: number): POI[] {
    const floorData = this.floors.find((f) => f.level === floor);
    return floorData?.pois || [];
  }

  /**
   * Get all POIs
   */
  getAllPOIs(): POI[] {
    return this.floors.flatMap((f) => f.pois);
  }

  /**
   * Get zones
   */
  getZones(): Zone[] {
    return this.zones;
  }

  /**
   * Get current floor
   */
  getCurrentFloor(): number {
    return this.currentLocation?.floor || 0;
  }

  /**
   * Calculate route to POI
   */
  async calculateRoute(destinationId: string): Promise<NavigationRoute | null> {
    if (!this.currentLocation) {return null;}

    const destination = this.getAllPOIs().find((poi) => poi.id === destinationId);
    if (!destination) {return null;}

    // Simple A* pathfinding would be implemented here
    // For now, return a direct route
    const distance = this.calculateDistance(
      this.currentLocation.latitude,
      this.currentLocation.longitude,
      destination.coordinate.latitude,
      destination.coordinate.longitude
    );

    const walkingSpeed = 1.4; // m/s
    const estimatedTime = Math.ceil(distance / walkingSpeed);

    return {
      id: `route_${Date.now()}`,
      origin: this.currentLocation,
      destination,
      waypoints: [
        {
          coordinate: this.currentLocation,
          type: 'start',
        },
        {
          coordinate: destination.coordinate,
          type: 'destination',
        },
      ],
      totalDistance: distance,
      estimatedTime,
      instructions: [
        {
          text: `Head towards ${destination.name}`,
          distance,
          direction: 'straight',
        },
        {
          text: `Arrive at ${destination.name}`,
          distance: 0,
          direction: 'arrive',
        },
      ],
      isAccessible: true,
    };
  }

  /**
   * Fetch heatmap data
   */
  async getHeatmapData(): Promise<HeatmapData | null> {
    if (!this.config?.apiEndpoint || !this.config?.festivalId) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.config.apiEndpoint}/festivals/${this.config.festivalId}/heatmap`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[IndoorLocationManager] Error fetching heatmap:', error);
      return null;
    }
  }

  /**
   * Report current location to server
   */
  async reportLocation(): Promise<void> {
    if (!this.currentLocation || !this.config?.apiEndpoint) {return;}

    try {
      await fetch(
        `${this.config.apiEndpoint}/festivals/${this.config?.festivalId}/location`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: this.currentLocation.latitude,
            longitude: this.currentLocation.longitude,
            floor: this.currentLocation.floor,
            accuracy: this.currentLocation.accuracy,
            timestamp: this.currentLocation.timestamp,
          }),
        }
      );
    } catch (error) {
      console.error('[IndoorLocationManager] Error reporting location:', error);
    }
  }

  /**
   * Update callbacks
   */
  setCallbacks(callbacks: IndoorLocationManagerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Check if tracking
   */
  isLocationTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    this.stopTracking();

    this.beaconScanner?.destroy();
    this.wifiPositioning?.destroy();
    this.locationFusion?.destroy();

    this.appStateSubscription?.remove();

    this.beaconScanner = null;
    this.wifiPositioning = null;
    this.locationFusion = null;
    this.isInitialized = false;

    IndoorLocationManager.instance = null;

    console.log('[IndoorLocationManager] Destroyed');
  }
}

// Export singleton instance getter
export const getIndoorLocationManager = (): IndoorLocationManager => {
  return IndoorLocationManager.getInstance();
};

export default IndoorLocationManager;
