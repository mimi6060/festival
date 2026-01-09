/**
 * Geolocation Utilities
 * Functions for geographic calculations and location handling
 */

// ============================================================================
// Types
// ============================================================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface GeoBounds {
  northeast: Coordinates;
  southwest: Coordinates;
}

export type DistanceUnit = 'km' | 'mi' | 'm' | 'ft';

// ============================================================================
// Constants
// ============================================================================

const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_MI = 3959;
const KM_TO_MI = 0.621371;
const MI_TO_KM = 1.60934;
const M_TO_FT = 3.28084;
const FT_TO_M = 0.3048;

// ============================================================================
// Distance Calculations
// ============================================================================

/**
 * Calculate the distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates,
  unit: DistanceUnit = 'km'
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceKm = EARTH_RADIUS_KM * c;

  switch (unit) {
    case 'km':
      return distanceKm;
    case 'mi':
      return distanceKm * KM_TO_MI;
    case 'm':
      return distanceKm * 1000;
    case 'ft':
      return distanceKm * 1000 * M_TO_FT;
    default:
      return distanceKm;
  }
}

/**
 * Calculate the bearing between two coordinates
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;

  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const x = Math.sin(deltaLon) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  let bearing = toDegrees(Math.atan2(x, y));
  bearing = (bearing + 360) % 360;

  return bearing;
}

/**
 * Get compass direction from bearing
 */
export function getCompassDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Calculate midpoint between two coordinates
 */
export function calculateMidpoint(point1: Coordinates, point2: Coordinates): Coordinates {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;

  const lat1 = toRadians(point1.latitude);
  const lon1 = toRadians(point1.longitude);
  const lat2 = toRadians(point2.latitude);
  const lon2 = toRadians(point2.longitude);

  const bx = Math.cos(lat2) * Math.cos(lon2 - lon1);
  const by = Math.cos(lat2) * Math.sin(lon2 - lon1);

  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + bx) * (Math.cos(lat1) + bx) + by * by)
  );
  const lon3 = lon1 + Math.atan2(by, Math.cos(lat1) + bx);

  return {
    latitude: toDegrees(lat3),
    longitude: toDegrees(lon3),
  };
}

/**
 * Calculate destination point given distance and bearing
 */
export function calculateDestination(
  start: Coordinates,
  distanceKm: number,
  bearing: number
): Coordinates {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;

  const lat1 = toRadians(start.latitude);
  const lon1 = toRadians(start.longitude);
  const bearingRad = toRadians(bearing);
  const angularDistance = distanceKm / EARTH_RADIUS_KM;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: toDegrees(lat2),
    longitude: toDegrees(lon2),
  };
}

// ============================================================================
// Bounding Box Operations
// ============================================================================

/**
 * Calculate bounding box from an array of coordinates
 */
export function calculateBoundingBox(points: Coordinates[]): BoundingBox {
  if (points.length === 0) {
    throw new Error('Cannot calculate bounding box from empty array');
  }

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  for (const point of points) {
    if (point.latitude > north) north = point.latitude;
    if (point.latitude < south) south = point.latitude;
    if (point.longitude > east) east = point.longitude;
    if (point.longitude < west) west = point.longitude;
  }

  return { north, south, east, west };
}

/**
 * Calculate bounding box from center and radius
 */
export function calculateBoundingBoxFromRadius(
  center: Coordinates,
  radiusKm: number
): BoundingBox {
  const latDelta = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const lonDelta =
    (radiusKm / (EARTH_RADIUS_KM * Math.cos((center.latitude * Math.PI) / 180))) *
    (180 / Math.PI);

  return {
    north: center.latitude + latDelta,
    south: center.latitude - latDelta,
    east: center.longitude + lonDelta,
    west: center.longitude - lonDelta,
  };
}

/**
 * Check if a point is within a bounding box
 */
export function isPointInBoundingBox(point: Coordinates, box: BoundingBox): boolean {
  return (
    point.latitude <= box.north &&
    point.latitude >= box.south &&
    point.longitude <= box.east &&
    point.longitude >= box.west
  );
}

/**
 * Get center of bounding box
 */
export function getBoundingBoxCenter(box: BoundingBox): Coordinates {
  return {
    latitude: (box.north + box.south) / 2,
    longitude: (box.east + box.west) / 2,
  };
}

/**
 * Expand bounding box by a percentage
 */
export function expandBoundingBox(box: BoundingBox, percentage: number): BoundingBox {
  const latDelta = (box.north - box.south) * (percentage / 100);
  const lonDelta = (box.east - box.west) * (percentage / 100);

  return {
    north: box.north + latDelta,
    south: box.south - latDelta,
    east: box.east + lonDelta,
    west: box.west - lonDelta,
  };
}

// ============================================================================
// Polygon Operations
// ============================================================================

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(point: Coordinates, polygon: [number, number][]): boolean {
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculate the area of a polygon in square kilometers
 */
export function calculatePolygonArea(polygon: [number, number][]): number {
  if (polygon.length < 3) return 0;

  let total = 0;

  for (let i = 0, l = polygon.length; i < l; i++) {
    const addX = polygon[i][0];
    const addY = polygon[i === l - 1 ? 0 : i + 1][1];
    const subX = polygon[i === l - 1 ? 0 : i + 1][0];
    const subY = polygon[i][1];

    total += addX * addY * 0.5;
    total -= subX * subY * 0.5;
  }

  const areaDegrees = Math.abs(total);
  // Approximate conversion to km^2 at equator
  const areaKm2 = areaDegrees * 111.32 * 111.32;

  return areaKm2;
}

/**
 * Calculate the centroid of a polygon
 */
export function calculatePolygonCentroid(polygon: [number, number][]): Coordinates {
  let sumLat = 0;
  let sumLng = 0;

  for (const point of polygon) {
    sumLng += point[0];
    sumLat += point[1];
  }

  return {
    latitude: sumLat / polygon.length,
    longitude: sumLng / polygon.length,
  };
}

// ============================================================================
// Coordinate Validation & Formatting
// ============================================================================

/**
 * Validate coordinates
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Normalize longitude to -180 to 180
 */
export function normalizeLongitude(lng: number): number {
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;
  return lng;
}

/**
 * Format coordinates as DMS (Degrees, Minutes, Seconds)
 */
export function formatCoordinatesAsDMS(
  lat: number,
  lng: number
): { latitude: string; longitude: string } {
  const formatDMS = (degrees: number, isLat: boolean): string => {
    const absolute = Math.abs(degrees);
    const d = Math.floor(absolute);
    const minutesFloat = (absolute - d) * 60;
    const m = Math.floor(minutesFloat);
    const s = ((minutesFloat - m) * 60).toFixed(2);

    const direction = isLat ? (degrees >= 0 ? 'N' : 'S') : degrees >= 0 ? 'E' : 'W';

    return `${d}° ${m}' ${s}" ${direction}`;
  };

  return {
    latitude: formatDMS(lat, true),
    longitude: formatDMS(lng, false),
  };
}

/**
 * Format coordinates as decimal string
 */
export function formatCoordinatesAsDecimal(lat: number, lng: number, precision = 6): string {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

/**
 * Parse DMS string to decimal
 */
export function parseDMSToDecimal(dms: string): number | null {
  const regex = /^(\d+)°\s*(\d+)'\s*([\d.]+)"\s*([NSEW])$/i;
  const match = dms.match(regex);

  if (!match) return null;

  const degrees = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseFloat(match[3]);
  const direction = match[4].toUpperCase();

  let decimal = degrees + minutes / 60 + seconds / 3600;

  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

// ============================================================================
// Clustering & Grouping
// ============================================================================

/**
 * Find points within a given radius of a center point
 */
export function findPointsWithinRadius<T extends Coordinates>(
  center: Coordinates,
  points: T[],
  radiusKm: number
): T[] {
  return points.filter((point) => calculateDistance(center, point) <= radiusKm);
}

/**
 * Group points by grid cell
 */
export function groupPointsByGrid<T extends Coordinates>(
  points: T[],
  gridSizeKm: number
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const point of points) {
    const cellX = Math.floor(point.longitude / (gridSizeKm / 111));
    const cellY = Math.floor(point.latitude / (gridSizeKm / 111));
    const key = `${cellX},${cellY}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(point);
  }

  return groups;
}

/**
 * Find the nearest point from a list
 */
export function findNearestPoint<T extends Coordinates>(
  target: Coordinates,
  points: T[]
): { point: T; distance: number } | null {
  if (points.length === 0) return null;

  let nearest = points[0];
  let minDistance = calculateDistance(target, nearest);

  for (let i = 1; i < points.length; i++) {
    const distance = calculateDistance(target, points[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = points[i];
    }
  }

  return { point: nearest, distance: minDistance };
}

/**
 * Sort points by distance from a center
 */
export function sortPointsByDistance<T extends Coordinates>(
  center: Coordinates,
  points: T[]
): T[] {
  return [...points].sort(
    (a, b) => calculateDistance(center, a) - calculateDistance(center, b)
  );
}

// ============================================================================
// Unit Conversions
// ============================================================================

/**
 * Convert kilometers to miles
 */
export function kmToMiles(km: number): number {
  return km * KM_TO_MI;
}

/**
 * Convert miles to kilometers
 */
export function milesToKm(miles: number): number {
  return miles * MI_TO_KM;
}

/**
 * Convert meters to feet
 */
export function metersToFeet(meters: number): number {
  return meters * M_TO_FT;
}

/**
 * Convert feet to meters
 */
export function feetToMeters(feet: number): number {
  return feet * FT_TO_M;
}

/**
 * Format distance with appropriate unit
 */
export function formatDistance(distanceKm: number, unit: DistanceUnit = 'km'): string {
  let value: number;
  let unitStr: string;

  switch (unit) {
    case 'km':
      if (distanceKm < 1) {
        value = distanceKm * 1000;
        unitStr = 'm';
      } else {
        value = distanceKm;
        unitStr = 'km';
      }
      break;
    case 'mi':
      value = distanceKm * KM_TO_MI;
      if (value < 0.1) {
        value = value * 5280;
        unitStr = 'ft';
      } else {
        unitStr = 'mi';
      }
      break;
    case 'm':
      value = distanceKm * 1000;
      unitStr = 'm';
      break;
    case 'ft':
      value = distanceKm * 1000 * M_TO_FT;
      unitStr = 'ft';
      break;
    default:
      value = distanceKm;
      unitStr = 'km';
  }

  return `${value.toFixed(value < 10 ? 1 : 0)} ${unitStr}`;
}

// ============================================================================
// Walking Time Estimation
// ============================================================================

/**
 * Estimate walking time between two points
 * Average walking speed: 5 km/h
 */
export function estimateWalkingTime(
  from: Coordinates,
  to: Coordinates,
  walkingSpeedKmh = 5
): number {
  const distanceKm = calculateDistance(from, to);
  const timeHours = distanceKm / walkingSpeedKmh;
  return Math.ceil(timeHours * 60); // Return minutes
}

/**
 * Format walking time
 */
export function formatWalkingTime(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}
