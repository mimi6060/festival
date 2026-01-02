/**
 * Indoor Location Types
 * Types for indoor positioning, beacons, and navigation
 */

// Coordinate types
export interface Coordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface IndoorCoordinate extends Coordinate {
  floor: number;
  buildingId?: string;
  accuracy: number;
  source: LocationSource;
  timestamp: number;
}

export type LocationSource = 'gps' | 'beacon' | 'wifi' | 'fused' | 'manual';

// Beacon types
export interface Beacon {
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
  txPower: number;
  distance: number;
  accuracy: BeaconAccuracy;
  lastSeen: number;
}

export type BeaconAccuracy = 'immediate' | 'near' | 'far' | 'unknown';

export interface BeaconRegion {
  uuid: string;
  identifier: string;
  major?: number;
  minor?: number;
}

export interface BeaconConfig {
  uuid: string;
  major: number;
  minor: number;
  coordinate: IndoorCoordinate;
  name: string;
  zone?: string;
}

// WiFi types
export interface WiFiAccessPoint {
  bssid: string;
  ssid: string;
  rssi: number;
  frequency: number;
  timestamp: number;
}

export interface WiFiFingerprint {
  locationId: string;
  coordinate: IndoorCoordinate;
  accessPoints: WiFiFingerprintAP[];
}

export interface WiFiFingerprintAP {
  bssid: string;
  meanRssi: number;
  stdRssi: number;
}

// Map types
export interface Floor {
  id: string;
  level: number;
  name: string;
  mapUrl: string;
  bounds: MapBounds;
  pois: POI[];
}

export interface MapBounds {
  northEast: Coordinate;
  southWest: Coordinate;
}

export interface POI {
  id: string;
  name: string;
  category: POICategory;
  coordinate: IndoorCoordinate;
  icon: string;
  description?: string;
  openingHours?: string;
  amenities?: string[];
  accessible?: boolean;
}

export type POICategory =
  | 'stage'
  | 'food'
  | 'drinks'
  | 'restroom'
  | 'medical'
  | 'info'
  | 'parking'
  | 'camping'
  | 'exit'
  | 'atm'
  | 'shop'
  | 'vip'
  | 'backstage'
  | 'charging'
  | 'locker';

// Navigation types
export interface NavigationRoute {
  id: string;
  origin: IndoorCoordinate;
  destination: POI;
  waypoints: RouteWaypoint[];
  totalDistance: number;
  estimatedTime: number;
  instructions: NavigationInstruction[];
  isAccessible: boolean;
}

export interface RouteWaypoint {
  coordinate: IndoorCoordinate;
  type: 'start' | 'turn' | 'floor_change' | 'waypoint' | 'destination';
  instruction?: string;
}

export interface NavigationInstruction {
  text: string;
  distance: number;
  direction: NavigationDirection;
  floor?: number;
  landmark?: string;
}

export type NavigationDirection =
  | 'straight'
  | 'slight_left'
  | 'left'
  | 'sharp_left'
  | 'slight_right'
  | 'right'
  | 'sharp_right'
  | 'u_turn'
  | 'stairs_up'
  | 'stairs_down'
  | 'elevator_up'
  | 'elevator_down'
  | 'arrive';

// Zone types
export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  boundary: Coordinate[];
  floor: number;
  capacity?: number;
  currentOccupancy?: number;
  accessLevel: AccessLevel;
}

export type ZoneType =
  | 'general'
  | 'vip'
  | 'backstage'
  | 'staff'
  | 'camping'
  | 'parking'
  | 'restricted';

export type AccessLevel = 'public' | 'ticket' | 'vip' | 'backstage' | 'staff' | 'admin';

// Heatmap types
export interface HeatmapData {
  timestamp: number;
  zones: ZoneOccupancy[];
  grid?: HeatmapCell[];
}

export interface ZoneOccupancy {
  zoneId: string;
  occupancy: number;
  capacity: number;
  level: CrowdLevel;
}

export interface HeatmapCell {
  coordinate: Coordinate;
  intensity: number;
  floor: number;
}

export type CrowdLevel = 'low' | 'medium' | 'high' | 'full';

// Geofence types
export interface Geofence {
  id: string;
  name: string;
  coordinate: Coordinate;
  radius: number;
  floor?: number;
  type: GeofenceType;
  triggerOnEnter: boolean;
  triggerOnExit: boolean;
  notification?: GeofenceNotification;
}

export type GeofenceType = 'circular' | 'polygon';

export interface GeofenceNotification {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface GeofenceEvent {
  geofenceId: string;
  type: 'enter' | 'exit' | 'dwell';
  timestamp: number;
  location: IndoorCoordinate;
}

// Location state
export interface LocationState {
  currentLocation: IndoorCoordinate | null;
  lastOutdoorLocation: Coordinate | null;
  isIndoor: boolean;
  currentFloor: number;
  currentZone: Zone | null;
  accuracy: number;
  heading: number;
  speed: number;
  isTracking: boolean;
  batteryMode: BatteryMode;
}

export type BatteryMode = 'high_accuracy' | 'balanced' | 'low_power';

// Error types
export interface LocationError {
  code: LocationErrorCode;
  message: string;
  timestamp: number;
}

export type LocationErrorCode =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'BLUETOOTH_DISABLED'
  | 'WIFI_DISABLED'
  | 'LOCATION_DISABLED'
  | 'BEACON_SCAN_FAILED'
  | 'UNKNOWN';

// Events
export interface LocationUpdateEvent {
  location: IndoorCoordinate;
  source: LocationSource;
  timestamp: number;
}

export interface BeaconUpdateEvent {
  beacons: Beacon[];
  timestamp: number;
}

export interface ZoneTransitionEvent {
  previousZone: Zone | null;
  currentZone: Zone | null;
  timestamp: number;
}
