/**
 * Camping Types
 * Types for camping areas, spots, and reservations
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Camping zone type
 */
export enum CampingZoneType {
  TENT = 'tent',
  CARAVAN = 'caravan',
  CAMPERVAN = 'campervan',
  GLAMPING = 'glamping',
  TIPI = 'tipi',
  CABIN = 'cabin',
  MIXED = 'mixed',
}

/**
 * Camping spot status
 */
export enum CampingSpotStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  OCCUPIED = 'occupied',
  MAINTENANCE = 'maintenance',
  BLOCKED = 'blocked',
}

/**
 * Camping reservation status
 */
export enum CampingReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

/**
 * Camping amenity type
 */
export enum CampingAmenityType {
  ELECTRICITY = 'electricity',
  WATER = 'water',
  WIFI = 'wifi',
  SHOWER = 'shower',
  TOILET = 'toilet',
  KITCHEN = 'kitchen',
  BBQ = 'bbq',
  FIRE_PIT = 'fire_pit',
  PARKING = 'parking',
  SECURITY = 'security',
  LAUNDRY = 'laundry',
  CHARGING_STATION = 'charging_station',
}

/**
 * Vehicle type for camping
 */
export enum CampingVehicleType {
  CAR = 'car',
  MOTORCYCLE = 'motorcycle',
  CARAVAN = 'caravan',
  CAMPERVAN = 'campervan',
  MOTORHOME = 'motorhome',
  TRAILER = 'trailer',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Camping zone
 */
export interface CampingZone {
  id: string;
  festivalId: string;
  name: string;
  slug: string;
  description?: string;
  type: CampingZoneType;
  capacity: number;
  spotsCount: number;
  availableSpots: number;
  pricePerNight: number;
  currency: string;
  minNights?: number;
  maxNights?: number;
  checkInTime: string;
  checkOutTime: string;
  amenities: CampingAmenity[];
  rules: CampingRules;
  coordinates?: CampingCoordinates;
  polygon?: CampingPolygon;
  image?: string;
  images?: string[];
  isActive: boolean;
  sortOrder: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Camping amenity
 */
export interface CampingAmenity {
  type: CampingAmenityType;
  name: string;
  description?: string;
  icon?: string;
  isIncluded: boolean;
  extraCost?: number;
}

/**
 * Camping rules
 */
export interface CampingRules {
  petsAllowed: boolean;
  petsMaxCount?: number;
  petsFee?: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  maxPersonsPerSpot: number;
  vehiclesAllowed: boolean;
  maxVehiclesPerSpot?: number;
  firesAllowed: boolean;
  generatorsAllowed: boolean;
  generatorHours?: { start: string; end: string };
  minAge?: number;
  alcoholAllowed: boolean;
  specialRequirements?: string[];
}

/**
 * Camping coordinates
 */
export interface CampingCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Camping polygon for map
 */
export interface CampingPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

/**
 * Camping spot
 */
export interface CampingSpot {
  id: string;
  zoneId: string;
  festivalId: string;
  spotNumber: string;
  name?: string;
  status: CampingSpotStatus;
  type: CampingZoneType;
  size: SpotSize;
  coordinates?: CampingCoordinates;
  amenities: CampingAmenityType[];
  priceModifier?: number;
  isAccessible: boolean;
  isPremium: boolean;
  notes?: string;
  currentReservationId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Spot size
 */
export interface SpotSize {
  width: number;
  length: number;
  unit: 'meters' | 'feet';
}

/**
 * Camping reservation
 */
export interface CampingReservation {
  id: string;
  reservationNumber: string;
  festivalId: string;
  zoneId: string;
  spotId: string;
  userId: string;
  ticketId?: string;
  status: CampingReservationStatus;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guests: CampingGuest[];
  guestsCount: number;
  vehicles: CampingVehicle[];
  pets?: CampingPet[];
  pricing: CampingPricing;
  paymentId?: string;
  specialRequests?: string;
  internalNotes?: string;
  checkInTime?: string;
  checkInBy?: string;
  checkOutTime?: string;
  checkOutBy?: string;
  wristbandIds?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Camping guest
 */
export interface CampingGuest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  documentType?: 'id' | 'passport' | 'driver_license';
  documentNumber?: string;
  isMainGuest: boolean;
}

/**
 * Camping vehicle
 */
export interface CampingVehicle {
  type: CampingVehicleType;
  licensePlate: string;
  make?: string;
  model?: string;
  color?: string;
  length?: number;
  width?: number;
}

/**
 * Camping pet
 */
export interface CampingPet {
  type: 'dog' | 'cat' | 'other';
  name: string;
  breed?: string;
  vaccinationProof?: string;
}

/**
 * Camping pricing breakdown
 */
export interface CampingPricing {
  basePrice: number;
  nightlyRate: number;
  nights: number;
  spotSurcharge: number;
  amenitiesTotal: number;
  vehiclesFee: number;
  petsFee: number;
  extraGuestsFee: number;
  discount: number;
  discountCode?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
}

/**
 * Camping zone with availability
 */
export interface CampingZoneWithAvailability extends CampingZone {
  availability: CampingAvailability;
}

/**
 * Camping availability
 */
export interface CampingAvailability {
  zoneId: string;
  dateRange: { start: string; end: string };
  availableSpots: number;
  totalSpots: number;
  percentageAvailable: number;
  priceRange: { min: number; max: number };
  dailyAvailability: DailyCampingAvailability[];
}

/**
 * Daily camping availability
 */
export interface DailyCampingAvailability {
  date: string;
  available: number;
  reserved: number;
  occupied: number;
  blocked: number;
}

/**
 * Camping reservation with details
 */
export interface CampingReservationWithDetails extends CampingReservation {
  zone: CampingZone;
  spot: CampingSpot;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

/**
 * Camping statistics
 */
export interface CampingStats {
  festivalId: string;
  totalZones: number;
  totalSpots: number;
  totalReservations: number;
  occupancyRate: number;
  revenue: number;
  currency: string;
  byZone: ZoneCampingStats[];
  byDate: DateCampingStats[];
}

/**
 * Zone camping statistics
 */
export interface ZoneCampingStats {
  zoneId: string;
  zoneName: string;
  zoneType: CampingZoneType;
  totalSpots: number;
  reserved: number;
  occupied: number;
  available: number;
  revenue: number;
}

/**
 * Date camping statistics
 */
export interface DateCampingStats {
  date: string;
  checkIns: number;
  checkOuts: number;
  occupancy: number;
  occupancyRate: number;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a camping zone
 */
export interface CreateCampingZoneDto {
  name: string;
  description?: string;
  type: CampingZoneType;
  capacity: number;
  pricePerNight: number;
  currency?: string;
  minNights?: number;
  maxNights?: number;
  checkInTime?: string;
  checkOutTime?: string;
  amenities?: Omit<CampingAmenity, 'type'>[];
  rules?: Partial<CampingRules>;
  coordinates?: CampingCoordinates;
  image?: string;
}

/**
 * DTO for updating a camping zone
 */
export interface UpdateCampingZoneDto {
  name?: string;
  description?: string;
  type?: CampingZoneType;
  capacity?: number;
  pricePerNight?: number;
  minNights?: number;
  maxNights?: number;
  checkInTime?: string;
  checkOutTime?: string;
  amenities?: CampingAmenity[];
  rules?: Partial<CampingRules>;
  coordinates?: CampingCoordinates;
  polygon?: CampingPolygon;
  image?: string;
  images?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

/**
 * DTO for creating a camping spot
 */
export interface CreateCampingSpotDto {
  spotNumber: string;
  name?: string;
  type?: CampingZoneType;
  size: SpotSize;
  coordinates?: CampingCoordinates;
  amenities?: CampingAmenityType[];
  priceModifier?: number;
  isAccessible?: boolean;
  isPremium?: boolean;
  notes?: string;
}

/**
 * DTO for updating a camping spot
 */
export interface UpdateCampingSpotDto {
  spotNumber?: string;
  name?: string;
  status?: CampingSpotStatus;
  type?: CampingZoneType;
  size?: SpotSize;
  coordinates?: CampingCoordinates;
  amenities?: CampingAmenityType[];
  priceModifier?: number;
  isAccessible?: boolean;
  isPremium?: boolean;
  notes?: string;
}

/**
 * DTO for creating a camping reservation
 */
export interface CreateCampingReservationDto {
  zoneId: string;
  spotId?: string;
  ticketId?: string;
  checkInDate: string;
  checkOutDate: string;
  guests: CampingGuest[];
  vehicles?: CampingVehicle[];
  pets?: CampingPet[];
  discountCode?: string;
  specialRequests?: string;
}

/**
 * DTO for updating a camping reservation
 */
export interface UpdateCampingReservationDto {
  spotId?: string;
  status?: CampingReservationStatus;
  checkInDate?: string;
  checkOutDate?: string;
  guests?: CampingGuest[];
  vehicles?: CampingVehicle[];
  pets?: CampingPet[];
  specialRequests?: string;
  internalNotes?: string;
}

/**
 * DTO for camping check-in
 */
export interface CampingCheckInDto {
  reservationId: string;
  verifiedGuests?: string[];
  verifiedVehicles?: string[];
  wristbandIds?: string[];
  notes?: string;
}

/**
 * DTO for camping check-out
 */
export interface CampingCheckOutDto {
  reservationId: string;
  spotCondition?: 'good' | 'needs_cleaning' | 'damaged';
  damageNotes?: string;
  returnedItems?: string[];
}

/**
 * Camping filters
 */
export interface CampingZoneFilters {
  festivalId?: string;
  type?: CampingZoneType | CampingZoneType[];
  minPrice?: number;
  maxPrice?: number;
  amenities?: CampingAmenityType[];
  petsAllowed?: boolean;
  vehiclesAllowed?: boolean;
  isActive?: boolean;
  hasAvailability?: boolean;
  checkInDate?: string;
  checkOutDate?: string;
}

/**
 * Camping reservation filters
 */
export interface CampingReservationFilters {
  festivalId?: string;
  zoneId?: string;
  spotId?: string;
  userId?: string;
  status?: CampingReservationStatus | CampingReservationStatus[];
  checkInDateFrom?: string;
  checkInDateTo?: string;
  search?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid CampingZoneType
 */
export function isCampingZoneType(value: unknown): value is CampingZoneType {
  return Object.values(CampingZoneType).includes(value as CampingZoneType);
}

/**
 * Check if value is a valid CampingSpotStatus
 */
export function isCampingSpotStatus(value: unknown): value is CampingSpotStatus {
  return Object.values(CampingSpotStatus).includes(value as CampingSpotStatus);
}

/**
 * Check if value is a valid CampingReservationStatus
 */
export function isCampingReservationStatus(value: unknown): value is CampingReservationStatus {
  return Object.values(CampingReservationStatus).includes(value as CampingReservationStatus);
}

/**
 * Check if spot is available
 */
export function isSpotAvailable(spot: CampingSpot): boolean {
  return spot.status === CampingSpotStatus.AVAILABLE;
}

/**
 * Check if reservation is active
 */
export function isReservationActive(reservation: CampingReservation): boolean {
  return [CampingReservationStatus.CONFIRMED, CampingReservationStatus.CHECKED_IN].includes(
    reservation.status
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get camping zone type display name
 */
export function getCampingZoneTypeDisplayName(type: CampingZoneType): string {
  const names: Record<CampingZoneType, string> = {
    [CampingZoneType.TENT]: 'Emplacement tente',
    [CampingZoneType.CARAVAN]: 'Emplacement caravane',
    [CampingZoneType.CAMPERVAN]: 'Emplacement camping-car',
    [CampingZoneType.GLAMPING]: 'Glamping',
    [CampingZoneType.TIPI]: 'Tipi',
    [CampingZoneType.CABIN]: 'Cabane',
    [CampingZoneType.MIXED]: 'Zone mixte',
  };
  return names[type];
}

/**
 * Get camping spot status display name
 */
export function getCampingSpotStatusDisplayName(status: CampingSpotStatus): string {
  const names: Record<CampingSpotStatus, string> = {
    [CampingSpotStatus.AVAILABLE]: 'Disponible',
    [CampingSpotStatus.RESERVED]: 'Reserve',
    [CampingSpotStatus.OCCUPIED]: 'Occupe',
    [CampingSpotStatus.MAINTENANCE]: 'Maintenance',
    [CampingSpotStatus.BLOCKED]: 'Bloque',
  };
  return names[status];
}

/**
 * Get camping reservation status display name
 */
export function getCampingReservationStatusDisplayName(status: CampingReservationStatus): string {
  const names: Record<CampingReservationStatus, string> = {
    [CampingReservationStatus.PENDING]: 'En attente',
    [CampingReservationStatus.CONFIRMED]: 'Confirmee',
    [CampingReservationStatus.CHECKED_IN]: 'Arrivee',
    [CampingReservationStatus.CHECKED_OUT]: 'Depart',
    [CampingReservationStatus.CANCELLED]: 'Annulee',
    [CampingReservationStatus.NO_SHOW]: 'Non presente',
  };
  return names[status];
}

/**
 * Get amenity type display name
 */
export function getCampingAmenityDisplayName(type: CampingAmenityType): string {
  const names: Record<CampingAmenityType, string> = {
    [CampingAmenityType.ELECTRICITY]: 'Electricite',
    [CampingAmenityType.WATER]: 'Eau',
    [CampingAmenityType.WIFI]: 'WiFi',
    [CampingAmenityType.SHOWER]: 'Douche',
    [CampingAmenityType.TOILET]: 'Toilettes',
    [CampingAmenityType.KITCHEN]: 'Cuisine',
    [CampingAmenityType.BBQ]: 'Barbecue',
    [CampingAmenityType.FIRE_PIT]: 'Feu de camp',
    [CampingAmenityType.PARKING]: 'Parking',
    [CampingAmenityType.SECURITY]: 'Securite',
    [CampingAmenityType.LAUNDRY]: 'Laverie',
    [CampingAmenityType.CHARGING_STATION]: 'Station de charge',
  };
  return names[type];
}

/**
 * Calculate number of nights
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate camping total price
 */
export function calculateCampingPrice(
  nightlyRate: number,
  nights: number,
  spotSurcharge = 0,
  amenitiesCost = 0,
  vehiclesFee = 0,
  petsFee = 0,
  extraGuestsFee = 0,
  discount = 0,
  taxRate = 0
): CampingPricing {
  const basePrice = nightlyRate * nights;
  const subtotal =
    basePrice + spotSurcharge + amenitiesCost + vehiclesFee + petsFee + extraGuestsFee - discount;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return {
    basePrice,
    nightlyRate,
    nights,
    spotSurcharge,
    amenitiesTotal: amenitiesCost,
    vehiclesFee,
    petsFee,
    extraGuestsFee,
    discount,
    subtotal,
    taxRate,
    taxAmount,
    total,
    currency: 'EUR',
  };
}

/**
 * Generate reservation number
 */
export function generateCampingReservationNumber(festivalPrefix: string, sequence: number): string {
  const year = new Date().getFullYear();
  const paddedSequence = sequence.toString().padStart(5, '0');
  return `${festivalPrefix}-CAMP-${year}-${paddedSequence}`;
}

/**
 * Format spot size
 */
export function formatSpotSize(size: SpotSize): string {
  const unit = size.unit === 'meters' ? 'm' : 'ft';
  return `${size.width}${unit} x ${size.length}${unit}`;
}

/**
 * Check if zone allows pets
 */
export function zoneAllowsPets(zone: CampingZone): boolean {
  return zone.rules.petsAllowed;
}

/**
 * Check if zone allows vehicles
 */
export function zoneAllowsVehicles(zone: CampingZone): boolean {
  return zone.rules.vehiclesAllowed;
}

/**
 * Get max guests for zone
 */
export function getMaxGuestsPerSpot(zone: CampingZone): number {
  return zone.rules.maxPersonsPerSpot;
}
