/**
 * Location Fusion Service
 * Combines GPS, beacon, and WiFi positioning data
 * Handles indoor/outdoor transitions seamlessly
 */

import { Platform } from 'react-native';
import Geolocation, {
  GeoPosition,
  GeoOptions,
  GeoError,
} from '@react-native-community/geolocation';
import {
  IndoorCoordinate,
  Coordinate,
  LocationSource,
  LocationState,
  LocationError,
  LocationErrorCode,
  BatteryMode,
  Beacon,
  Zone,
} from './types';

// Fusion algorithm constants
const GPS_INDOOR_ACCURACY_THRESHOLD = 30; // meters - below this, GPS may be valid indoors
const GPS_OUTDOOR_CONFIDENCE = 0.9;
const BEACON_WEIGHT_BASE = 0.8;
const WIFI_WEIGHT_BASE = 0.6;
const GPS_WEIGHT_BASE = 0.4;
const INDOOR_DETECTION_BEACON_COUNT = 2;
const POSITION_HISTORY_SIZE = 10;
const VELOCITY_SMOOTHING_FACTOR = 0.3;

interface LocationFusionConfig {
  enableGPS: boolean;
  enableBeacons: boolean;
  enableWiFi: boolean;
  batteryMode: BatteryMode;
  onLocationUpdated: (location: IndoorCoordinate) => void;
  onIndoorOutdoorTransition: (isIndoor: boolean) => void;
  onZoneChanged: (zone: Zone | null) => void;
  onError: (error: LocationError) => void;
}

interface LocationSample {
  coordinate: IndoorCoordinate;
  source: LocationSource;
  timestamp: number;
  weight: number;
}

interface FusionState {
  gpsPosition: Coordinate | null;
  gpsAccuracy: number;
  gpsTimestamp: number;
  beaconPosition: IndoorCoordinate | null;
  beaconCount: number;
  beaconTimestamp: number;
  wifiPosition: IndoorCoordinate | null;
  wifiTimestamp: number;
  isIndoor: boolean;
  lastFusedPosition: IndoorCoordinate | null;
  positionHistory: IndoorCoordinate[];
  currentVelocity: { x: number; y: number };
}

export class LocationFusion {
  private config: LocationFusionConfig;
  private state: FusionState;
  private watchId: number | null = null;
  private fusionInterval: NodeJS.Timeout | null = null;
  private zones: Zone[] = [];
  private currentZone: Zone | null = null;

  constructor(config: LocationFusionConfig) {
    this.config = config;
    this.state = this.getInitialState();
  }

  private getInitialState(): FusionState {
    return {
      gpsPosition: null,
      gpsAccuracy: Infinity,
      gpsTimestamp: 0,
      beaconPosition: null,
      beaconCount: 0,
      beaconTimestamp: 0,
      wifiPosition: null,
      wifiTimestamp: 0,
      isIndoor: false,
      lastFusedPosition: null,
      positionHistory: [],
      currentVelocity: { x: 0, y: 0 },
    };
  }

  /**
   * Get GPS options based on battery mode
   */
  private getGPSOptions(): GeoOptions {
    const baseOptions: GeoOptions = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 1000,
    };

    switch (this.config.batteryMode) {
      case 'high_accuracy':
        return {
          ...baseOptions,
          enableHighAccuracy: true,
          maximumAge: 0,
          distanceFilter: 1,
        };
      case 'balanced':
        return {
          ...baseOptions,
          enableHighAccuracy: true,
          maximumAge: 5000,
          distanceFilter: 5,
        };
      case 'low_power':
        return {
          ...baseOptions,
          enableHighAccuracy: false,
          maximumAge: 30000,
          distanceFilter: 20,
        };
      default:
        return baseOptions;
    }
  }

  /**
   * Start location fusion
   */
  startFusion(): void {
    console.log('[LocationFusion] Starting location fusion');

    // Start GPS tracking if enabled
    if (this.config.enableGPS) {
      this.startGPSTracking();
    }

    // Start fusion processing
    this.startFusionProcessing();
  }

  private startGPSTracking(): void {
    const options = this.getGPSOptions();

    this.watchId = Geolocation.watchPosition(
      (position: GeoPosition) => {
        this.handleGPSUpdate(position);
      },
      (error: GeoError) => {
        console.error('[LocationFusion] GPS error:', error);
        this.config.onError({
          code: this.mapGPSError(error.code),
          message: error.message,
          timestamp: Date.now(),
        });
      },
      options
    );
  }

  private mapGPSError(code: number): LocationErrorCode {
    switch (code) {
      case 1:
        return 'PERMISSION_DENIED';
      case 2:
        return 'POSITION_UNAVAILABLE';
      case 3:
        return 'TIMEOUT';
      default:
        return 'UNKNOWN';
    }
  }

  private handleGPSUpdate(position: GeoPosition): void {
    this.state.gpsPosition = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude || undefined,
    };
    this.state.gpsAccuracy = position.coords.accuracy;
    this.state.gpsTimestamp = position.timestamp;

    // Check indoor/outdoor transition based on GPS accuracy
    this.checkIndoorOutdoorTransition();
  }

  /**
   * Update beacon position from BeaconScanner
   */
  updateBeaconPosition(
    position: { x: number; y: number; floor: number } | null,
    beacons: Beacon[]
  ): void {
    if (position) {
      this.state.beaconPosition = {
        latitude: position.x,
        longitude: position.y,
        floor: position.floor,
        accuracy: this.calculateBeaconAccuracy(beacons),
        source: 'beacon',
        timestamp: Date.now(),
      };
      this.state.beaconCount = beacons.length;
      this.state.beaconTimestamp = Date.now();
    } else {
      this.state.beaconPosition = null;
      this.state.beaconCount = beacons.length;
    }

    this.checkIndoorOutdoorTransition();
  }

  private calculateBeaconAccuracy(beacons: Beacon[]): number {
    if (beacons.length === 0) return Infinity;

    // Calculate accuracy based on number and proximity of beacons
    const nearBeacons = beacons.filter((b) => b.distance < 5);
    const immediateBeacons = beacons.filter((b) => b.distance < 1);

    if (immediateBeacons.length >= 2) return 1;
    if (nearBeacons.length >= 3) return 2;
    if (beacons.length >= 3) return 5;
    return 10;
  }

  /**
   * Update WiFi position from WiFiPositioning
   */
  updateWiFiPosition(position: IndoorCoordinate | null): void {
    this.state.wifiPosition = position;
    if (position) {
      this.state.wifiTimestamp = Date.now();
    }
  }

  /**
   * Check for indoor/outdoor transition
   */
  private checkIndoorOutdoorTransition(): void {
    const wasIndoor = this.state.isIndoor;
    let isIndoor = false;

    // Criteria for indoor detection:
    // 1. Multiple beacons detected
    // 2. Poor GPS accuracy combined with beacon presence
    // 3. WiFi fingerprint match

    if (this.state.beaconCount >= INDOOR_DETECTION_BEACON_COUNT) {
      isIndoor = true;
    } else if (
      this.state.gpsAccuracy > GPS_INDOOR_ACCURACY_THRESHOLD &&
      this.state.beaconCount > 0
    ) {
      isIndoor = true;
    } else if (
      this.state.wifiPosition &&
      Date.now() - this.state.wifiTimestamp < 10000
    ) {
      isIndoor = true;
    }

    if (isIndoor !== wasIndoor) {
      this.state.isIndoor = isIndoor;
      this.config.onIndoorOutdoorTransition(isIndoor);
      console.log(`[LocationFusion] Transition to ${isIndoor ? 'indoor' : 'outdoor'}`);
    }
  }

  /**
   * Start periodic fusion processing
   */
  private startFusionProcessing(): void {
    const intervalMs = this.getFusionInterval();

    this.fusionInterval = setInterval(() => {
      this.processLocationFusion();
    }, intervalMs);

    // Initial processing
    this.processLocationFusion();
  }

  private getFusionInterval(): number {
    switch (this.config.batteryMode) {
      case 'high_accuracy':
        return 500;
      case 'balanced':
        return 1000;
      case 'low_power':
        return 3000;
      default:
        return 1000;
    }
  }

  /**
   * Process location fusion from all sources
   */
  private processLocationFusion(): void {
    const now = Date.now();
    const samples: LocationSample[] = [];

    // Collect valid samples from each source
    if (this.config.enableGPS && this.state.gpsPosition) {
      const age = now - this.state.gpsTimestamp;
      if (age < 30000) {
        // 30 seconds max age
        const weight = this.calculateGPSWeight(age);
        samples.push({
          coordinate: {
            latitude: this.state.gpsPosition.latitude,
            longitude: this.state.gpsPosition.longitude,
            altitude: this.state.gpsPosition.altitude,
            floor: 0, // GPS doesn't provide floor
            accuracy: this.state.gpsAccuracy,
            source: 'gps',
            timestamp: this.state.gpsTimestamp,
          },
          source: 'gps',
          timestamp: this.state.gpsTimestamp,
          weight,
        });
      }
    }

    if (this.config.enableBeacons && this.state.beaconPosition) {
      const age = now - this.state.beaconTimestamp;
      if (age < 10000) {
        // 10 seconds max age
        const weight = this.calculateBeaconWeight(age);
        samples.push({
          coordinate: this.state.beaconPosition,
          source: 'beacon',
          timestamp: this.state.beaconTimestamp,
          weight,
        });
      }
    }

    if (this.config.enableWiFi && this.state.wifiPosition) {
      const age = now - this.state.wifiTimestamp;
      if (age < 15000) {
        // 15 seconds max age
        const weight = this.calculateWiFiWeight(age);
        samples.push({
          coordinate: this.state.wifiPosition,
          source: 'wifi',
          timestamp: this.state.wifiTimestamp,
          weight,
        });
      }
    }

    if (samples.length === 0) {
      return;
    }

    // Fuse positions
    const fusedPosition = this.fusePositions(samples);

    // Apply velocity-based prediction
    const predictedPosition = this.applyVelocityPrediction(fusedPosition);

    // Update history
    this.updatePositionHistory(predictedPosition);

    // Check zone changes
    this.checkZoneChange(predictedPosition);

    // Emit update
    this.state.lastFusedPosition = predictedPosition;
    this.config.onLocationUpdated(predictedPosition);
  }

  private calculateGPSWeight(age: number): number {
    // Higher weight when outdoor, lower when indoor
    const baseWeight = this.state.isIndoor ? GPS_WEIGHT_BASE * 0.3 : GPS_WEIGHT_BASE;
    const ageFactor = Math.max(0, 1 - age / 30000);
    const accuracyFactor = Math.max(0, 1 - this.state.gpsAccuracy / 50);
    return baseWeight * ageFactor * accuracyFactor;
  }

  private calculateBeaconWeight(age: number): number {
    // Higher weight when indoor
    const baseWeight = this.state.isIndoor ? BEACON_WEIGHT_BASE : BEACON_WEIGHT_BASE * 0.5;
    const ageFactor = Math.max(0, 1 - age / 10000);
    const countFactor = Math.min(1, this.state.beaconCount / 5);
    return baseWeight * ageFactor * countFactor;
  }

  private calculateWiFiWeight(age: number): number {
    const baseWeight = this.state.isIndoor ? WIFI_WEIGHT_BASE : WIFI_WEIGHT_BASE * 0.3;
    const ageFactor = Math.max(0, 1 - age / 15000);
    return baseWeight * ageFactor;
  }

  /**
   * Fuse positions from multiple sources using weighted average
   */
  private fusePositions(samples: LocationSample[]): IndoorCoordinate {
    let totalWeight = 0;
    let weightedLat = 0;
    let weightedLng = 0;
    let weightedAlt = 0;
    const floorVotes: Map<number, number> = new Map();
    let minAccuracy = Infinity;
    let bestSource: LocationSource = 'fused';

    samples.forEach((sample) => {
      const weight = sample.weight;
      totalWeight += weight;

      weightedLat += sample.coordinate.latitude * weight;
      weightedLng += sample.coordinate.longitude * weight;
      weightedAlt += (sample.coordinate.altitude || 0) * weight;

      // Vote for floor (indoor sources only)
      if (sample.source !== 'gps') {
        const floor = sample.coordinate.floor;
        floorVotes.set(floor, (floorVotes.get(floor) || 0) + weight);
      }

      // Track best accuracy
      if (sample.coordinate.accuracy < minAccuracy) {
        minAccuracy = sample.coordinate.accuracy;
        bestSource = sample.source;
      }
    });

    // Determine floor
    let selectedFloor = 0;
    let maxFloorWeight = 0;
    floorVotes.forEach((weight, floor) => {
      if (weight > maxFloorWeight) {
        maxFloorWeight = weight;
        selectedFloor = floor;
      }
    });

    // Calculate fused accuracy
    const fusedAccuracy = this.calculateFusedAccuracy(samples);

    return {
      latitude: weightedLat / totalWeight,
      longitude: weightedLng / totalWeight,
      altitude: weightedAlt / totalWeight,
      floor: selectedFloor,
      accuracy: fusedAccuracy,
      source: 'fused',
      timestamp: Date.now(),
    };
  }

  private calculateFusedAccuracy(samples: LocationSample[]): number {
    // Fused accuracy is better than individual accuracies when sources agree
    if (samples.length === 1) {
      return samples[0].coordinate.accuracy;
    }

    // Calculate position spread
    const positions = samples.map((s) => s.coordinate);
    let maxDistance = 0;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dist = this.calculateDistance(positions[i], positions[j]);
        maxDistance = Math.max(maxDistance, dist);
      }
    }

    // If sources agree (low spread), improve accuracy
    const minAccuracy = Math.min(...samples.map((s) => s.coordinate.accuracy));
    const spreadFactor = Math.min(1, maxDistance / 10);

    return minAccuracy * (0.8 + 0.4 * spreadFactor);
  }

  private calculateDistance(a: IndoorCoordinate, b: IndoorCoordinate): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;

    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;

    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);

    const h =
      sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /**
   * Apply velocity-based prediction for smoother movement
   */
  private applyVelocityPrediction(position: IndoorCoordinate): IndoorCoordinate {
    if (this.state.positionHistory.length < 2) {
      return position;
    }

    const prev = this.state.positionHistory[this.state.positionHistory.length - 1];
    const dt = (position.timestamp - prev.timestamp) / 1000; // seconds

    if (dt <= 0 || dt > 5) {
      return position;
    }

    // Calculate instantaneous velocity
    const vx = (position.latitude - prev.latitude) / dt;
    const vy = (position.longitude - prev.longitude) / dt;

    // Smooth velocity
    this.state.currentVelocity = {
      x:
        VELOCITY_SMOOTHING_FACTOR * vx +
        (1 - VELOCITY_SMOOTHING_FACTOR) * this.state.currentVelocity.x,
      y:
        VELOCITY_SMOOTHING_FACTOR * vy +
        (1 - VELOCITY_SMOOTHING_FACTOR) * this.state.currentVelocity.y,
    };

    // Predict position with small time step
    const predictionTime = 0.1; // seconds
    return {
      ...position,
      latitude: position.latitude + this.state.currentVelocity.x * predictionTime,
      longitude: position.longitude + this.state.currentVelocity.y * predictionTime,
    };
  }

  private updatePositionHistory(position: IndoorCoordinate): void {
    this.state.positionHistory.push(position);

    if (this.state.positionHistory.length > POSITION_HISTORY_SIZE) {
      this.state.positionHistory.shift();
    }
  }

  /**
   * Check for zone changes
   */
  private checkZoneChange(position: IndoorCoordinate): void {
    const newZone = this.findZoneForPosition(position);

    if (newZone?.id !== this.currentZone?.id) {
      this.currentZone = newZone;
      this.config.onZoneChanged(newZone);
    }
  }

  private findZoneForPosition(position: IndoorCoordinate): Zone | null {
    for (const zone of this.zones) {
      if (zone.floor !== position.floor) continue;

      if (this.isPointInPolygon(position, zone.boundary)) {
        return zone;
      }
    }
    return null;
  }

  private isPointInPolygon(point: IndoorCoordinate, polygon: Coordinate[]): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    const x = point.latitude;
    const y = point.longitude;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].latitude;
      const yi = polygon[i].longitude;
      const xj = polygon[j].latitude;
      const yj = polygon[j].longitude;

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Set zones for geofencing
   */
  setZones(zones: Zone[]): void {
    this.zones = zones;
  }

  /**
   * Get current location state
   */
  getLocationState(): LocationState {
    return {
      currentLocation: this.state.lastFusedPosition,
      lastOutdoorLocation: this.state.isIndoor ? this.state.gpsPosition : null,
      isIndoor: this.state.isIndoor,
      currentFloor: this.state.lastFusedPosition?.floor || 0,
      currentZone: this.currentZone,
      accuracy: this.state.lastFusedPosition?.accuracy || Infinity,
      heading: 0, // Would need magnetometer for this
      speed: Math.sqrt(
        this.state.currentVelocity.x ** 2 + this.state.currentVelocity.y ** 2
      ),
      isTracking: this.fusionInterval !== null,
      batteryMode: this.config.batteryMode,
    };
  }

  /**
   * Set battery mode
   */
  setBatteryMode(mode: BatteryMode): void {
    this.config.batteryMode = mode;

    // Restart GPS with new options if running
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.startGPSTracking();
    }

    // Update fusion interval
    if (this.fusionInterval) {
      clearInterval(this.fusionInterval);
      this.startFusionProcessing();
    }
  }

  /**
   * Stop location fusion
   */
  stopFusion(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.fusionInterval) {
      clearInterval(this.fusionInterval);
      this.fusionInterval = null;
    }

    console.log('[LocationFusion] Stopped');
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.stopFusion();
    this.state = this.getInitialState();
  }
}

export default LocationFusion;
