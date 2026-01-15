/**
 * useIndoorLocation.ts
 * React hook for indoor location tracking with beacon and WiFi positioning
 * Provides real-time location updates, zone detection, and navigation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getIndoorLocationManager,
  IndoorLocationManagerConfig,
  IndoorLocationManagerCallbacks,
} from '../services/location/IndoorLocationManager';
import {
  IndoorCoordinate,
  LocationState,
  LocationError,
  BatteryMode,
  Zone,
  POI,
  Floor,
  NavigationRoute,
  GeofenceEvent,
  Beacon,
  HeatmapData,
} from '../services/location/types';

// Hook configuration
export interface UseIndoorLocationConfig {
  festivalId: string;
  apiEndpoint?: string;
  enableBeacons?: boolean;
  enableWiFi?: boolean;
  enableGPS?: boolean;
  batteryMode?: BatteryMode;
  autoStart?: boolean;
}

// Hook return type
export interface UseIndoorLocationReturn {
  // Current state
  location: IndoorCoordinate | null;
  locationState: LocationState | null;
  currentZone: Zone | null;
  currentFloor: number;
  isTracking: boolean;
  isIndoor: boolean;
  isInitialized: boolean;
  error: LocationError | null;
  nearbyBeacons: Beacon[];

  // Data
  floors: Floor[];
  zones: Zone[];
  pois: POI[];
  currentFloorPOIs: POI[];

  // Actions
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  setBatteryMode: (mode: BatteryMode) => void;
  calculateRoute: (destinationId: string) => Promise<NavigationRoute | null>;
  getHeatmap: () => Promise<HeatmapData | null>;
  findNearestPOI: (type?: string) => POI | null;
  getDistanceToPOI: (poiId: string) => number | null;
  refreshConfiguration: () => Promise<void>;

  // Utility
  formatDistance: (meters: number) => string;
  formatAccuracy: (accuracy: number) => string;
}

// Geofence event handler type
type GeofenceEventHandler = (event: GeofenceEvent) => void;

/**
 * Hook for indoor location tracking
 */
export function useIndoorLocation(
  config: UseIndoorLocationConfig,
  onGeofenceEvent?: GeofenceEventHandler
): UseIndoorLocationReturn {
  // State
  const [location, setLocation] = useState<IndoorCoordinate | null>(null);
  const [locationState, setLocationState] = useState<LocationState | null>(null);
  const [currentZone, setCurrentZone] = useState<Zone | null>(null);
  const [currentFloor, setCurrentFloor] = useState<number>(0);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [isIndoor, setIsIndoor] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error, setError] = useState<LocationError | null>(null);
  const [nearbyBeacons, setNearbyBeacons] = useState<Beacon[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);

  // Refs
  const managerRef = useRef(getIndoorLocationManager());
  const isMountedRef = useRef(true);

  // Initialize manager
  useEffect(() => {
    isMountedRef.current = true;

    const initializeManager = async () => {
      const manager = managerRef.current;

      const managerConfig: IndoorLocationManagerConfig = {
        festivalId: config.festivalId,
        apiEndpoint: config.apiEndpoint,
        enableBeacons: config.enableBeacons ?? true,
        enableWiFi: config.enableWiFi ?? true,
        enableGPS: config.enableGPS ?? true,
        batteryMode: config.batteryMode ?? 'balanced',
      };

      const callbacks: IndoorLocationManagerCallbacks = {
        onLocationUpdated: (loc) => {
          if (isMountedRef.current) {
            setLocation(loc);
            setCurrentFloor(loc.floor || 0);
            setError(null);
          }
        },
        onIndoorOutdoorTransition: (indoor) => {
          if (isMountedRef.current) {
            setIsIndoor(indoor);
          }
        },
        onZoneChanged: (zone) => {
          if (isMountedRef.current) {
            setCurrentZone(zone);
          }
        },
        onGeofenceEvent: (event) => {
          if (isMountedRef.current && onGeofenceEvent) {
            onGeofenceEvent(event);
          }
        },
        onError: (err) => {
          if (isMountedRef.current) {
            setError(err);
          }
        },
        onBeaconsUpdated: (beacons) => {
          if (isMountedRef.current) {
            setNearbyBeacons(beacons);
          }
        },
      };

      try {
        await manager.initialize(managerConfig, callbacks);

        if (isMountedRef.current) {
          setFloors(manager.getFloors());
          setZones(manager.getZones());
          setIsInitialized(true);

          // Auto-start if configured
          if (config.autoStart) {
            await manager.startTracking();
            setIsTracking(true);
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError({
            code: 'INIT_ERROR',
            message: err instanceof Error ? err.message : 'Failed to initialize location',
            timestamp: Date.now(),
          });
        }
      }
    };

    initializeManager();

    return () => {
      isMountedRef.current = false;
      managerRef.current.stopTracking();
    };
  }, [config.festivalId, config.apiEndpoint, config.autoStart]);

  // Update location state periodically
  useEffect(() => {
    if (!isTracking || !isInitialized) {return;}

    const interval = setInterval(() => {
      if (isMountedRef.current) {
        const state = managerRef.current.getLocationState();
        setLocationState(state);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, isInitialized]);

  // Start tracking
  const startTracking = useCallback(async () => {
    try {
      await managerRef.current.startTracking();
      setIsTracking(true);
      setError(null);
    } catch (err) {
      setError({
        code: 'START_ERROR',
        message: err instanceof Error ? err.message : 'Failed to start tracking',
        timestamp: Date.now(),
      });
    }
  }, []);

  // Stop tracking
  const stopTracking = useCallback(() => {
    managerRef.current.stopTracking();
    setIsTracking(false);
  }, []);

  // Set battery mode
  const setBatteryMode = useCallback((mode: BatteryMode) => {
    managerRef.current.setBatteryMode(mode);
  }, []);

  // Calculate route to POI
  const calculateRoute = useCallback(async (destinationId: string): Promise<NavigationRoute | null> => {
    return managerRef.current.calculateRoute(destinationId);
  }, []);

  // Get heatmap data
  const getHeatmap = useCallback(async (): Promise<HeatmapData | null> => {
    return managerRef.current.getHeatmapData();
  }, []);

  // Get all POIs
  const pois = managerRef.current.getAllPOIs();

  // Get POIs for current floor
  const currentFloorPOIs = managerRef.current.getPOIsForFloor(currentFloor);

  // Find nearest POI
  const findNearestPOI = useCallback((type?: string): POI | null => {
    if (!location) {return null;}

    const allPOIs = managerRef.current.getAllPOIs();
    const filteredPOIs = type
      ? allPOIs.filter((poi) => poi.type === type)
      : allPOIs;

    if (filteredPOIs.length === 0) {return null;}

    let nearest: POI | null = null;
    let minDistance = Infinity;

    for (const poi of filteredPOIs) {
      const distance = calculateDistanceFromCoords(
        location.latitude,
        location.longitude,
        poi.coordinate.latitude,
        poi.coordinate.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = poi;
      }
    }

    return nearest;
  }, [location]);

  // Get distance to a specific POI
  const getDistanceToPOI = useCallback((poiId: string): number | null => {
    if (!location) {return null;}

    const poi = pois.find((p) => p.id === poiId);
    if (!poi) {return null;}

    return calculateDistanceFromCoords(
      location.latitude,
      location.longitude,
      poi.coordinate.latitude,
      poi.coordinate.longitude
    );
  }, [location, pois]);

  // Refresh configuration from server
  const refreshConfiguration = useCallback(async () => {
    // Re-initialize to fetch fresh config
    const manager = managerRef.current;
    manager.destroy();

    const newManager = getIndoorLocationManager();
    managerRef.current = newManager;

    const managerConfig: IndoorLocationManagerConfig = {
      festivalId: config.festivalId,
      apiEndpoint: config.apiEndpoint,
      enableBeacons: config.enableBeacons ?? true,
      enableWiFi: config.enableWiFi ?? true,
      enableGPS: config.enableGPS ?? true,
      batteryMode: config.batteryMode ?? 'balanced',
    };

    await newManager.initialize(managerConfig, {});

    setFloors(newManager.getFloors());
    setZones(newManager.getZones());
  }, [config]);

  // Format distance for display
  const formatDistance = useCallback((meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }, []);

  // Format accuracy for display
  const formatAccuracy = useCallback((accuracy: number): string => {
    if (accuracy < 1) {
      return 'Tres precis';
    } else if (accuracy < 5) {
      return 'Precis';
    } else if (accuracy < 10) {
      return 'Moyen';
    } else {
      return 'Approximatif';
    }
  }, []);

  return {
    // Current state
    location,
    locationState,
    currentZone,
    currentFloor,
    isTracking,
    isIndoor,
    isInitialized,
    error,
    nearbyBeacons,

    // Data
    floors,
    zones,
    pois,
    currentFloorPOIs,

    // Actions
    startTracking,
    stopTracking,
    setBatteryMode,
    calculateRoute,
    getHeatmap,
    findNearestPOI,
    getDistanceToPOI,
    refreshConfiguration,

    // Utility
    formatDistance,
    formatAccuracy,
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistanceFromCoords(
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

/**
 * Simple hook for just getting current location
 */
export function useCurrentLocation(festivalId: string) {
  const {
    location,
    currentFloor,
    isTracking,
    error,
    startTracking,
    stopTracking,
  } = useIndoorLocation({ festivalId, autoStart: true });

  return {
    location,
    floor: currentFloor,
    isTracking,
    error,
    start: startTracking,
    stop: stopTracking,
  };
}

/**
 * Hook for zone-based alerts
 */
export function useZoneAlerts(
  festivalId: string,
  onEnterZone: (zone: Zone) => void,
  onExitZone: (zone: Zone) => void
) {
  const previousZoneRef = useRef<Zone | null>(null);

  const { currentZone, isTracking, startTracking, stopTracking } = useIndoorLocation({
    festivalId,
    autoStart: true,
  });

  useEffect(() => {
    const prevZone = previousZoneRef.current;

    if (currentZone && !prevZone) {
      // Entered a zone
      onEnterZone(currentZone);
    } else if (!currentZone && prevZone) {
      // Exited a zone
      onExitZone(prevZone);
    } else if (currentZone && prevZone && currentZone.id !== prevZone.id) {
      // Changed zones
      onExitZone(prevZone);
      onEnterZone(currentZone);
    }

    previousZoneRef.current = currentZone;
  }, [currentZone, onEnterZone, onExitZone]);

  return { currentZone, isTracking, startTracking, stopTracking };
}

/**
 * Hook for finding nearby points of interest
 */
export function useNearbyPOIs(festivalId: string, maxDistance = 100) {
  const { location, pois, isInitialized, formatDistance } = useIndoorLocation({
    festivalId,
    autoStart: true,
  });

  const [nearbyPOIs, setNearbyPOIs] = useState<(POI & { distance: number })[]>([]);

  useEffect(() => {
    if (!location || !isInitialized) {
      setNearbyPOIs([]);
      return;
    }

    const nearby = pois
      .map((poi) => ({
        ...poi,
        distance: calculateDistanceFromCoords(
          location.latitude,
          location.longitude,
          poi.coordinate.latitude,
          poi.coordinate.longitude
        ),
      }))
      .filter((poi) => poi.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    setNearbyPOIs(nearby);
  }, [location, pois, maxDistance, isInitialized]);

  return { nearbyPOIs, location, formatDistance };
}

export default useIndoorLocation;
