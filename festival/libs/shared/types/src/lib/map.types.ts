/**
 * Map Types
 * Types for interactive festival map and points of interest
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Point of Interest type
 */
export enum PoiType {
  // Entertainment
  STAGE = 'stage',
  ATTRACTION = 'attraction',
  ART_INSTALLATION = 'art_installation',
  CAMPING = 'camping',

  // Food & Drink
  BAR = 'bar',
  FOOD_STAND = 'food_stand',
  RESTAURANT = 'restaurant',
  WATER_POINT = 'water_point',

  // Services
  ENTRANCE = 'entrance',
  EXIT = 'exit',
  PARKING = 'parking',
  INFO_POINT = 'info_point',
  FIRST_AID = 'first_aid',
  SECURITY = 'security',
  LOST_AND_FOUND = 'lost_and_found',
  CHARGING_STATION = 'charging_station',
  ATM = 'atm',
  LOCKER = 'locker',

  // Facilities
  TOILET = 'toilet',
  SHOWER = 'shower',
  ACCESSIBLE_TOILET = 'accessible_toilet',

  // Cashless
  TOPUP_POINT = 'topup_point',
  CASHOUT_POINT = 'cashout_point',

  // Merchandise
  MERCH_STAND = 'merch_stand',

  // Other
  MEETING_POINT = 'meeting_point',
  PHOTO_SPOT = 'photo_spot',
  SPONSOR_AREA = 'sponsor_area',
  VIP_AREA = 'vip_area',
  OTHER = 'other',
}

/**
 * POI category for grouping
 */
export enum PoiCategory {
  ENTERTAINMENT = 'entertainment',
  FOOD_DRINK = 'food_drink',
  SERVICES = 'services',
  FACILITIES = 'facilities',
  CASHLESS = 'cashless',
  SHOPPING = 'shopping',
  OTHER = 'other',
}

/**
 * Map layer type
 */
export enum MapLayerType {
  BASE = 'base',
  STAGES = 'stages',
  FOOD = 'food',
  SERVICES = 'services',
  FACILITIES = 'facilities',
  CUSTOM = 'custom',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Geographic coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Map bounds
 */
export interface MapBounds {
  northEast: Coordinates;
  southWest: Coordinates;
}

/**
 * Map Point of Interest
 */
export interface MapPoi {
  id: string;
  festivalId: string;
  type: PoiType;
  category: PoiCategory;
  name: string;
  description?: string;
  shortDescription?: string;
  coordinates: Coordinates;
  icon?: string;
  color?: string;
  image?: string;
  isActive: boolean;
  isHighlighted: boolean;
  accessibilityInfo?: AccessibilityInfo;
  openingHours?: OpeningHours[];
  relatedStageId?: string;
  relatedVendorId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Accessibility information
 */
export interface AccessibilityInfo {
  wheelchairAccessible: boolean;
  hearingAssistance: boolean;
  visualAssistance: boolean;
  notes?: string;
}

/**
 * Opening hours for a specific day
 */
export interface OpeningHours {
  day: string;
  openTime: string;
  closeTime: string;
  isClosed?: boolean;
}

/**
 * Map layer
 */
export interface MapLayer {
  id: string;
  festivalId: string;
  type: MapLayerType;
  name: string;
  description?: string;
  isVisible: boolean;
  opacity: number;
  sortOrder: number;
  poiTypes: PoiType[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Map area/zone
 */
export interface MapArea {
  id: string;
  festivalId: string;
  name: string;
  description?: string;
  coordinates: Coordinates[];
  color?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  isRestricted: boolean;
  accessLevel?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Map route/path
 */
export interface MapRoute {
  id: string;
  festivalId: string;
  name: string;
  description?: string;
  waypoints: Coordinates[];
  color?: string;
  width?: number;
  isAccessible: boolean;
  estimatedTime?: number;
  distance?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Festival map configuration
 */
export interface FestivalMap {
  id: string;
  festivalId: string;
  name: string;
  description?: string;
  bounds: MapBounds;
  center: Coordinates;
  defaultZoom: number;
  minZoom: number;
  maxZoom: number;
  baseTileUrl?: string;
  customTileUrl?: string;
  overlayImageUrl?: string;
  overlayBounds?: MapBounds;
  layers: MapLayer[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * User location on map
 */
export interface UserLocation {
  coordinates: Coordinates;
  accuracy: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

/**
 * POI search result
 */
export interface PoiSearchResult {
  poi: MapPoi;
  distance?: number;
  relevanceScore?: number;
}

/**
 * Directions between POIs
 */
export interface Directions {
  from: MapPoi;
  to: MapPoi;
  route: Coordinates[];
  distance: number;
  estimatedTime: number;
  isAccessible: boolean;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a POI
 */
export interface CreateMapPoiDto {
  type: PoiType;
  category: PoiCategory;
  name: string;
  description?: string;
  shortDescription?: string;
  coordinates: Coordinates;
  icon?: string;
  color?: string;
  image?: string;
  accessibilityInfo?: AccessibilityInfo;
  openingHours?: OpeningHours[];
  relatedStageId?: string;
  relatedVendorId?: string;
  tags?: string[];
}

/**
 * DTO for updating a POI
 */
export interface UpdateMapPoiDto {
  type?: PoiType;
  category?: PoiCategory;
  name?: string;
  description?: string;
  shortDescription?: string;
  coordinates?: Coordinates;
  icon?: string;
  color?: string;
  image?: string;
  isActive?: boolean;
  isHighlighted?: boolean;
  accessibilityInfo?: AccessibilityInfo;
  openingHours?: OpeningHours[];
  tags?: string[];
  sortOrder?: number;
}

/**
 * DTO for creating a map area
 */
export interface CreateMapAreaDto {
  name: string;
  description?: string;
  coordinates: Coordinates[];
  color?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  isRestricted?: boolean;
  accessLevel?: string;
}

/**
 * DTO for creating a map route
 */
export interface CreateMapRouteDto {
  name: string;
  description?: string;
  waypoints: Coordinates[];
  color?: string;
  width?: number;
  isAccessible?: boolean;
}

/**
 * DTO for map configuration
 */
export interface UpdateMapConfigDto {
  name?: string;
  description?: string;
  bounds?: MapBounds;
  center?: Coordinates;
  defaultZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  baseTileUrl?: string;
  customTileUrl?: string;
  overlayImageUrl?: string;
  overlayBounds?: MapBounds;
}

/**
 * POI filter parameters
 */
export interface PoiFilters {
  festivalId?: string;
  type?: PoiType | PoiType[];
  category?: PoiCategory | PoiCategory[];
  isActive?: boolean;
  isAccessible?: boolean;
  search?: string;
  nearCoordinates?: Coordinates;
  withinRadius?: number;
  tags?: string[];
}

/**
 * Map view state
 */
export interface MapViewState {
  center: Coordinates;
  zoom: number;
  rotation?: number;
  pitch?: number;
  visibleLayers: string[];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid PoiType
 */
export function isPoiType(value: unknown): value is PoiType {
  return Object.values(PoiType).includes(value as PoiType);
}

/**
 * Check if value is a valid PoiCategory
 */
export function isPoiCategory(value: unknown): value is PoiCategory {
  return Object.values(PoiCategory).includes(value as PoiCategory);
}

/**
 * Check if value is valid coordinates
 */
export function isValidCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false;
  const coords = value as Coordinates;
  return (
    typeof coords.latitude === 'number' &&
    typeof coords.longitude === 'number' &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}

/**
 * Check if POI is currently open
 */
export function isPoiOpen(poi: MapPoi, now: Date = new Date()): boolean {
  if (!poi.openingHours || poi.openingHours.length === 0) return true;

  const dayNames = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  const today = dayNames[now.getDay()];
  const todayHours = poi.openingHours.find(
    (h) => h.day.toLowerCase() === today
  );

  if (!todayHours || todayHours.isClosed) return false;

  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  return currentTime >= todayHours.openTime && currentTime < todayHours.closeTime;
}

/**
 * Check if POI is wheelchair accessible
 */
export function isWheelchairAccessible(poi: MapPoi): boolean {
  return poi.accessibilityInfo?.wheelchairAccessible ?? false;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get POI category from type
 */
export function getPoiCategory(type: PoiType): PoiCategory {
  const categoryMap: Record<PoiType, PoiCategory> = {
    [PoiType.STAGE]: PoiCategory.ENTERTAINMENT,
    [PoiType.ATTRACTION]: PoiCategory.ENTERTAINMENT,
    [PoiType.ART_INSTALLATION]: PoiCategory.ENTERTAINMENT,
    [PoiType.CAMPING]: PoiCategory.SERVICES,
    [PoiType.BAR]: PoiCategory.FOOD_DRINK,
    [PoiType.FOOD_STAND]: PoiCategory.FOOD_DRINK,
    [PoiType.RESTAURANT]: PoiCategory.FOOD_DRINK,
    [PoiType.WATER_POINT]: PoiCategory.FOOD_DRINK,
    [PoiType.ENTRANCE]: PoiCategory.SERVICES,
    [PoiType.EXIT]: PoiCategory.SERVICES,
    [PoiType.PARKING]: PoiCategory.SERVICES,
    [PoiType.INFO_POINT]: PoiCategory.SERVICES,
    [PoiType.FIRST_AID]: PoiCategory.SERVICES,
    [PoiType.SECURITY]: PoiCategory.SERVICES,
    [PoiType.LOST_AND_FOUND]: PoiCategory.SERVICES,
    [PoiType.CHARGING_STATION]: PoiCategory.SERVICES,
    [PoiType.ATM]: PoiCategory.SERVICES,
    [PoiType.LOCKER]: PoiCategory.SERVICES,
    [PoiType.TOILET]: PoiCategory.FACILITIES,
    [PoiType.SHOWER]: PoiCategory.FACILITIES,
    [PoiType.ACCESSIBLE_TOILET]: PoiCategory.FACILITIES,
    [PoiType.TOPUP_POINT]: PoiCategory.CASHLESS,
    [PoiType.CASHOUT_POINT]: PoiCategory.CASHLESS,
    [PoiType.MERCH_STAND]: PoiCategory.SHOPPING,
    [PoiType.MEETING_POINT]: PoiCategory.OTHER,
    [PoiType.PHOTO_SPOT]: PoiCategory.OTHER,
    [PoiType.SPONSOR_AREA]: PoiCategory.OTHER,
    [PoiType.VIP_AREA]: PoiCategory.OTHER,
    [PoiType.OTHER]: PoiCategory.OTHER,
  };
  return categoryMap[type];
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371e3; // Earth's radius in meters
  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Find nearest POIs from a location
 */
export function findNearestPois(
  pois: MapPoi[],
  location: Coordinates,
  limit = 5
): PoiSearchResult[] {
  return pois
    .map((poi) => ({
      poi,
      distance: calculateDistance(location, poi.coordinates),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/**
 * Filter POIs within a radius
 */
export function filterPoisWithinRadius(
  pois: MapPoi[],
  center: Coordinates,
  radiusMeters: number
): MapPoi[] {
  return pois.filter(
    (poi) => calculateDistance(center, poi.coordinates) <= radiusMeters
  );
}

/**
 * Get POI type display name
 */
export function getPoiTypeName(type: PoiType): string {
  const names: Record<PoiType, string> = {
    [PoiType.STAGE]: 'Scene',
    [PoiType.ATTRACTION]: 'Attraction',
    [PoiType.ART_INSTALLATION]: 'Installation artistique',
    [PoiType.CAMPING]: 'Camping',
    [PoiType.BAR]: 'Bar',
    [PoiType.FOOD_STAND]: 'Stand nourriture',
    [PoiType.RESTAURANT]: 'Restaurant',
    [PoiType.WATER_POINT]: 'Point d\'eau',
    [PoiType.ENTRANCE]: 'Entree',
    [PoiType.EXIT]: 'Sortie',
    [PoiType.PARKING]: 'Parking',
    [PoiType.INFO_POINT]: 'Point info',
    [PoiType.FIRST_AID]: 'Premiers secours',
    [PoiType.SECURITY]: 'Securite',
    [PoiType.LOST_AND_FOUND]: 'Objets trouves',
    [PoiType.CHARGING_STATION]: 'Station de charge',
    [PoiType.ATM]: 'Distributeur',
    [PoiType.LOCKER]: 'Consigne',
    [PoiType.TOILET]: 'Toilettes',
    [PoiType.SHOWER]: 'Douches',
    [PoiType.ACCESSIBLE_TOILET]: 'Toilettes PMR',
    [PoiType.TOPUP_POINT]: 'Rechargement cashless',
    [PoiType.CASHOUT_POINT]: 'Remboursement cashless',
    [PoiType.MERCH_STAND]: 'Merchandising',
    [PoiType.MEETING_POINT]: 'Point de rencontre',
    [PoiType.PHOTO_SPOT]: 'Spot photo',
    [PoiType.SPONSOR_AREA]: 'Espace sponsor',
    [PoiType.VIP_AREA]: 'Zone VIP',
    [PoiType.OTHER]: 'Autre',
  };
  return names[type];
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Estimate walking time (average 5 km/h)
 */
export function estimateWalkingTime(meters: number): number {
  const walkingSpeedMps = 5000 / 3600; // 5 km/h in m/s
  return Math.ceil(meters / walkingSpeedMps / 60); // Return minutes
}

/**
 * Format walking time for display
 */
export function formatWalkingTime(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}
