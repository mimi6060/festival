/**
 * Zone Types
 * Types for zone management and access control
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Zone type
 */
export enum ZoneType {
  GENERAL = 'general',
  VIP = 'vip',
  BACKSTAGE = 'backstage',
  PRESS = 'press',
  STAFF = 'staff',
  ARTIST = 'artist',
  CAMPING = 'camping',
  PARKING = 'parking',
  FOOD_COURT = 'food_court',
  MERCHANDISE = 'merchandise',
  MEDICAL = 'medical',
  SECURITY = 'security',
  RESTRICTED = 'restricted',
}

/**
 * Zone status
 */
export enum ZoneStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  FULL = 'full',
  MAINTENANCE = 'maintenance',
  EMERGENCY = 'emergency',
}

/**
 * Access level
 */
export enum AccessLevel {
  PUBLIC = 'public',
  TICKET_HOLDERS = 'ticket_holders',
  VIP = 'vip',
  BACKSTAGE = 'backstage',
  STAFF_ONLY = 'staff_only',
  ARTIST_ONLY = 'artist_only',
  RESTRICTED = 'restricted',
}

/**
 * Gate type
 */
export enum GateType {
  ENTRANCE = 'entrance',
  EXIT = 'exit',
  BOTH = 'both',
  EMERGENCY = 'emergency',
}

/**
 * Access decision
 */
export enum AccessDecision {
  GRANTED = 'granted',
  DENIED = 'denied',
  PENDING = 'pending',
  EXPIRED = 'expired',
  INVALID = 'invalid',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Zone
 */
export interface Zone {
  id: string;
  festivalId: string;
  name: string;
  slug: string;
  description?: string;
  type: ZoneType;
  status: ZoneStatus;
  accessLevel: AccessLevel;
  capacity?: number;
  currentOccupancy: number;
  coordinates?: ZoneCoordinates;
  polygon?: ZonePolygon;
  color?: string;
  icon?: string;
  image?: string;
  gates: Gate[];
  parentZoneId?: string;
  childZones?: Zone[];
  schedule?: ZoneSchedule;
  rules: ZoneRules;
  amenities: string[];
  isActive: boolean;
  sortOrder: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Zone coordinates (center point)
 */
export interface ZoneCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Zone polygon for map display
 */
export interface ZonePolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

/**
 * Zone schedule
 */
export interface ZoneSchedule {
  defaultOpenTime: string;
  defaultCloseTime: string;
  dailySchedule?: DailyZoneSchedule[];
}

/**
 * Daily zone schedule
 */
export interface DailyZoneSchedule {
  date: string;
  openTime: string;
  closeTime: string;
  isClosed?: boolean;
  reason?: string;
}

/**
 * Zone rules
 */
export interface ZoneRules {
  minAge?: number;
  maxOccupancy?: number;
  reentryAllowed: boolean;
  maxReentries?: number;
  requiresWristband?: boolean;
  requiresAccompaniment?: boolean;
  accompanimentMinAge?: number;
  noReentryAfter?: string;
  specialRequirements?: string[];
}

/**
 * Gate
 */
export interface Gate {
  id: string;
  zoneId: string;
  name: string;
  type: GateType;
  location?: ZoneCoordinates;
  isActive: boolean;
  devices: GateDevice[];
  currentFlow?: GateFlow;
  createdAt: string;
  updatedAt: string;
}

/**
 * Gate device (scanner)
 */
export interface GateDevice {
  id: string;
  gateId: string;
  deviceId: string;
  name?: string;
  type: 'scanner' | 'turnstile' | 'nfc_reader';
  isOnline: boolean;
  lastActivityAt?: string;
  batteryLevel?: number;
}

/**
 * Gate flow statistics
 */
export interface GateFlow {
  gateId: string;
  timestamp: string;
  entriesLastHour: number;
  exitsLastHour: number;
  currentQueue?: number;
  averageWaitTime?: number;
}

/**
 * Access log entry
 */
export interface AccessLog {
  id: string;
  festivalId: string;
  zoneId: string;
  gateId?: string;
  ticketId?: string;
  userId?: string;
  nfcId?: string;
  direction: 'in' | 'out';
  decision: AccessDecision;
  reason?: string;
  scannedBy?: string;
  deviceId?: string;
  method: 'qr' | 'nfc' | 'manual' | 'biometric';
  location?: ZoneCoordinates;
  timestamp: string;
}

/**
 * Zone occupancy
 */
export interface ZoneOccupancy {
  zoneId: string;
  zoneName: string;
  capacity: number;
  currentOccupancy: number;
  percentageFull: number;
  status: 'low' | 'medium' | 'high' | 'full';
  trend: 'increasing' | 'stable' | 'decreasing';
  lastUpdated: string;
}

/**
 * Zone statistics
 */
export interface ZoneStats {
  zoneId: string;
  zoneName: string;
  totalEntries: number;
  totalExits: number;
  uniqueVisitors: number;
  averageStayDuration: number;
  peakOccupancy: number;
  peakOccupancyTime: string;
  accessDenied: number;
  hourlyData: HourlyZoneData[];
}

/**
 * Hourly zone data
 */
export interface HourlyZoneData {
  hour: string;
  entries: number;
  exits: number;
  occupancy: number;
}

/**
 * Zone access permission
 */
export interface ZoneAccessPermission {
  id: string;
  festivalId: string;
  zoneId: string;
  grantedToType: 'user' | 'ticket_category' | 'role';
  grantedToId: string;
  accessLevel: AccessLevel;
  validFrom?: string;
  validUntil?: string;
  restrictions?: ZoneAccessRestrictions;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Zone access restrictions
 */
export interface ZoneAccessRestrictions {
  maxEntries?: number;
  timeWindows?: TimeWindow[];
  specificDates?: string[];
  excludeDates?: string[];
}

/**
 * Time window
 */
export interface TimeWindow {
  startTime: string;
  endTime: string;
}

/**
 * Zone with occupancy
 */
export interface ZoneWithOccupancy extends Zone {
  occupancy: ZoneOccupancy;
}

/**
 * Zone summary for lists
 */
export interface ZoneSummary {
  id: string;
  name: string;
  type: ZoneType;
  status: ZoneStatus;
  accessLevel: AccessLevel;
  capacity?: number;
  currentOccupancy: number;
  percentageFull?: number;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a zone
 */
export interface CreateZoneDto {
  name: string;
  description?: string;
  type: ZoneType;
  accessLevel: AccessLevel;
  capacity?: number;
  coordinates?: ZoneCoordinates;
  polygon?: ZonePolygon;
  color?: string;
  icon?: string;
  parentZoneId?: string;
  schedule?: ZoneSchedule;
  rules?: Partial<ZoneRules>;
  amenities?: string[];
}

/**
 * DTO for updating a zone
 */
export interface UpdateZoneDto {
  name?: string;
  description?: string;
  type?: ZoneType;
  status?: ZoneStatus;
  accessLevel?: AccessLevel;
  capacity?: number;
  coordinates?: ZoneCoordinates;
  polygon?: ZonePolygon;
  color?: string;
  icon?: string;
  image?: string;
  parentZoneId?: string;
  schedule?: ZoneSchedule;
  rules?: Partial<ZoneRules>;
  amenities?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

/**
 * DTO for creating a gate
 */
export interface CreateGateDto {
  name: string;
  type: GateType;
  location?: ZoneCoordinates;
}

/**
 * DTO for updating a gate
 */
export interface UpdateGateDto {
  name?: string;
  type?: GateType;
  location?: ZoneCoordinates;
  isActive?: boolean;
}

/**
 * DTO for checking access
 */
export interface CheckAccessDto {
  zoneId: string;
  ticketId?: string;
  nfcId?: string;
  userId?: string;
  direction: 'in' | 'out';
  gateId?: string;
  deviceId?: string;
}

/**
 * Access check response
 */
export interface AccessCheckResponse {
  decision: AccessDecision;
  reason?: string;
  zone: ZoneSummary;
  accessLog: AccessLog;
  message: string;
}

/**
 * DTO for granting zone access
 */
export interface GrantZoneAccessDto {
  zoneId: string;
  grantedToType: 'user' | 'ticket_category' | 'role';
  grantedToId: string;
  accessLevel?: AccessLevel;
  validFrom?: string;
  validUntil?: string;
  restrictions?: ZoneAccessRestrictions;
}

/**
 * Zone filters
 */
export interface ZoneFilters {
  festivalId?: string;
  type?: ZoneType | ZoneType[];
  status?: ZoneStatus | ZoneStatus[];
  accessLevel?: AccessLevel | AccessLevel[];
  parentZoneId?: string;
  isActive?: boolean;
  search?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid ZoneType
 */
export function isZoneType(value: unknown): value is ZoneType {
  return Object.values(ZoneType).includes(value as ZoneType);
}

/**
 * Check if value is a valid ZoneStatus
 */
export function isZoneStatus(value: unknown): value is ZoneStatus {
  return Object.values(ZoneStatus).includes(value as ZoneStatus);
}

/**
 * Check if value is a valid AccessLevel
 */
export function isAccessLevel(value: unknown): value is AccessLevel {
  return Object.values(AccessLevel).includes(value as AccessLevel);
}

/**
 * Check if value is a valid AccessDecision
 */
export function isAccessDecision(value: unknown): value is AccessDecision {
  return Object.values(AccessDecision).includes(value as AccessDecision);
}

/**
 * Check if zone is open
 */
export function isZoneOpen(zone: Zone): boolean {
  return zone.status === ZoneStatus.OPEN && zone.isActive;
}

/**
 * Check if zone is at capacity
 */
export function isZoneAtCapacity(zone: Zone): boolean {
  if (!zone.capacity) return false;
  return zone.currentOccupancy >= zone.capacity;
}

/**
 * Check if zone allows reentry
 */
export function allowsReentry(zone: Zone, currentTime?: Date): boolean {
  if (!zone.rules.reentryAllowed) return false;
  if (zone.rules.noReentryAfter && currentTime) {
    const [hours = 0, minutes = 0] = zone.rules.noReentryAfter.split(':').map(Number);
    const noReentryTime = new Date(currentTime);
    noReentryTime.setHours(hours, minutes, 0, 0);
    if (currentTime > noReentryTime) return false;
  }
  return true;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get zone type display name
 */
export function getZoneTypeDisplayName(type: ZoneType): string {
  const names: Record<ZoneType, string> = {
    [ZoneType.GENERAL]: 'Zone generale',
    [ZoneType.VIP]: 'Zone VIP',
    [ZoneType.BACKSTAGE]: 'Backstage',
    [ZoneType.PRESS]: 'Zone presse',
    [ZoneType.STAFF]: 'Zone staff',
    [ZoneType.ARTIST]: 'Zone artistes',
    [ZoneType.CAMPING]: 'Camping',
    [ZoneType.PARKING]: 'Parking',
    [ZoneType.FOOD_COURT]: 'Espace restauration',
    [ZoneType.MERCHANDISE]: 'Merchandising',
    [ZoneType.MEDICAL]: 'Zone medicale',
    [ZoneType.SECURITY]: 'Securite',
    [ZoneType.RESTRICTED]: 'Zone restreinte',
  };
  return names[type];
}

/**
 * Get zone status display name
 */
export function getZoneStatusDisplayName(status: ZoneStatus): string {
  const names: Record<ZoneStatus, string> = {
    [ZoneStatus.OPEN]: 'Ouvert',
    [ZoneStatus.CLOSED]: 'Ferme',
    [ZoneStatus.FULL]: 'Complet',
    [ZoneStatus.MAINTENANCE]: 'Maintenance',
    [ZoneStatus.EMERGENCY]: 'Urgence',
  };
  return names[status];
}

/**
 * Get access level display name
 */
export function getAccessLevelDisplayName(level: AccessLevel): string {
  const names: Record<AccessLevel, string> = {
    [AccessLevel.PUBLIC]: 'Public',
    [AccessLevel.TICKET_HOLDERS]: 'Detenteurs de billets',
    [AccessLevel.VIP]: 'VIP',
    [AccessLevel.BACKSTAGE]: 'Backstage',
    [AccessLevel.STAFF_ONLY]: 'Staff uniquement',
    [AccessLevel.ARTIST_ONLY]: 'Artistes uniquement',
    [AccessLevel.RESTRICTED]: 'Acces restreint',
  };
  return names[level];
}

/**
 * Calculate occupancy percentage
 */
export function calculateOccupancyPercentage(zone: Zone): number {
  if (!zone.capacity || zone.capacity === 0) return 0;
  return Math.round((zone.currentOccupancy / zone.capacity) * 100);
}

/**
 * Get occupancy status
 */
export function getOccupancyStatus(
  percentage: number
): 'low' | 'medium' | 'high' | 'full' {
  if (percentage >= 100) return 'full';
  if (percentage >= 80) return 'high';
  if (percentage >= 50) return 'medium';
  return 'low';
}

/**
 * Check if zone is currently in schedule
 */
export function isZoneInSchedule(zone: Zone, now: Date = new Date()): boolean {
  if (!zone.schedule) return true;

  const currentDate = now.toISOString().split('T')[0];
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const dailySchedule = zone.schedule.dailySchedule?.find(
    (s) => s.date === currentDate
  );

  if (dailySchedule) {
    if (dailySchedule.isClosed) return false;
    return currentTime >= dailySchedule.openTime && currentTime < dailySchedule.closeTime;
  }

  return (
    currentTime >= zone.schedule.defaultOpenTime &&
    currentTime < zone.schedule.defaultCloseTime
  );
}

/**
 * Format zone capacity
 */
export function formatZoneCapacity(zone: Zone): string {
  if (!zone.capacity) return 'Illimite';
  return `${zone.currentOccupancy} / ${zone.capacity}`;
}
