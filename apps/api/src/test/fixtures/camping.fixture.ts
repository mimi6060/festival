/**
 * Camping Test Fixtures
 *
 * Predefined camping zone, spot, and booking data for unit and integration tests.
 * Includes various booking states, date scenarios, and availability testing.
 */

import { regularUser } from './users.fixture';
import { publishedFestival } from './festivals.fixture';

// ============================================================================
// Types (matching Prisma enums)
// ============================================================================

export enum AccommodationType {
  TENT = 'TENT',
  CARAVAN = 'CARAVAN',
  GLAMPING = 'GLAMPING',
  CABIN = 'CABIN',
  CAMPERVAN = 'CAMPERVAN',
}

export enum CampingSpotStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE',
  BLOCKED = 'BLOCKED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

// ============================================================================
// Interface Types
// ============================================================================

export interface CampingZoneFixture {
  id: string;
  festivalId: string;
  name: string;
  description: string | null;
  type: AccommodationType;
  capacity: number;
  pricePerNight: number;
  amenities: string[];
  rules: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampingSpotFixture {
  id: string;
  zoneId: string;
  number: string;
  status: CampingSpotStatus;
  latitude: number | null;
  longitude: number | null;
  size: string | null;
  electricityHook: boolean;
  waterHook: boolean;
  maxVehicleLength: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampingBookingFixture {
  id: string;
  bookingNumber: string;
  spotId: string;
  userId: string;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  status: BookingStatus;
  totalPrice: number;
  paidAmount: number;
  vehiclePlate: string | null;
  vehicleType: string | null;
  qrCode: string | null;
  notes: string | null;
  staffNotes: string | null;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  damageReport: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Camping Zone Fixtures
// ============================================================================

export const tentZone: CampingZoneFixture = {
  id: 'camping-zone-uuid-00000000-0000-0000-0000-000000000001',
  festivalId: publishedFestival.id,
  name: 'Zone A - Tentes',
  description: 'Zone ombragee proche des sanitaires, ideale pour les tentes',
  type: AccommodationType.TENT,
  capacity: 50,
  pricePerNight: 25.0,
  amenities: ['showers', 'toilets', 'wifi', 'charging_stations'],
  rules: 'Silence apres 23h. Animaux non autorises.',
  latitude: 48.8566,
  longitude: 2.3522,
  imageUrl: 'https://cdn.festival.com/zones/tent-zone.jpg',
  isActive: true,
  sortOrder: 1,
  createdAt: new Date('2024-01-15T00:00:00Z'),
  updatedAt: new Date('2024-01-15T00:00:00Z'),
};

export const caravanZone: CampingZoneFixture = {
  id: 'camping-zone-uuid-00000000-0000-0000-0000-000000000002',
  festivalId: publishedFestival.id,
  name: 'Zone B - Caravanes',
  description: 'Emplacements spacieux pour caravanes avec branchements electriques',
  type: AccommodationType.CARAVAN,
  capacity: 30,
  pricePerNight: 45.0,
  amenities: ['electricity', 'water', 'showers', 'toilets', 'wifi'],
  rules: 'Vehicules max 8m. Generateurs interdits.',
  latitude: 48.8567,
  longitude: 2.3523,
  imageUrl: 'https://cdn.festival.com/zones/caravan-zone.jpg',
  isActive: true,
  sortOrder: 2,
  createdAt: new Date('2024-01-15T00:00:00Z'),
  updatedAt: new Date('2024-01-15T00:00:00Z'),
};

export const glampingZone: CampingZoneFixture = {
  id: 'camping-zone-uuid-00000000-0000-0000-0000-000000000003',
  festivalId: publishedFestival.id,
  name: 'Zone VIP - Glamping',
  description: 'Tentes de luxe equipees avec lits confortables',
  type: AccommodationType.GLAMPING,
  capacity: 20,
  pricePerNight: 150.0,
  amenities: ['electricity', 'beds', 'private_shower', 'minibar', 'wifi', 'concierge'],
  rules: 'Check-in avant 18h. Service de menage quotidien.',
  latitude: 48.8568,
  longitude: 2.3524,
  imageUrl: 'https://cdn.festival.com/zones/glamping-zone.jpg',
  isActive: true,
  sortOrder: 0,
  createdAt: new Date('2024-01-15T00:00:00Z'),
  updatedAt: new Date('2024-01-15T00:00:00Z'),
};

export const inactiveZone: CampingZoneFixture = {
  id: 'camping-zone-uuid-00000000-0000-0000-0000-000000000004',
  festivalId: publishedFestival.id,
  name: 'Zone C - En travaux',
  description: 'Zone temporairement fermee pour travaux',
  type: AccommodationType.TENT,
  capacity: 40,
  pricePerNight: 20.0,
  amenities: ['toilets'],
  rules: null,
  latitude: 48.8569,
  longitude: 2.3525,
  imageUrl: null,
  isActive: false,
  sortOrder: 99,
  createdAt: new Date('2024-01-15T00:00:00Z'),
  updatedAt: new Date('2024-02-01T00:00:00Z'),
};

// ============================================================================
// Camping Spot Fixtures
// ============================================================================

export const availableSpot: CampingSpotFixture = {
  id: 'camping-spot-uuid-00000000-0000-0000-0000-000000000001',
  zoneId: tentZone.id,
  number: 'A1',
  status: CampingSpotStatus.AVAILABLE,
  latitude: 48.85661,
  longitude: 2.35221,
  size: 'medium',
  electricityHook: false,
  waterHook: false,
  maxVehicleLength: null,
  notes: 'Corner spot with good shade',
  isActive: true,
  createdAt: new Date('2024-01-15T00:00:00Z'),
  updatedAt: new Date('2024-01-15T00:00:00Z'),
};

export const occupiedSpot: CampingSpotFixture = {
  id: 'camping-spot-uuid-00000000-0000-0000-0000-000000000002',
  zoneId: tentZone.id,
  number: 'A2',
  status: CampingSpotStatus.OCCUPIED,
  latitude: 48.85662,
  longitude: 2.35222,
  size: 'large',
  electricityHook: true,
  waterHook: false,
  maxVehicleLength: null,
  notes: null,
  isActive: true,
  createdAt: new Date('2024-01-15T00:00:00Z'),
  updatedAt: new Date('2024-07-15T00:00:00Z'),
};

export const reservedSpot: CampingSpotFixture = {
  id: 'camping-spot-uuid-00000000-0000-0000-0000-000000000003',
  zoneId: tentZone.id,
  number: 'A3',
  status: CampingSpotStatus.RESERVED,
  latitude: 48.85663,
  longitude: 2.35223,
  size: 'small',
  electricityHook: false,
  waterHook: false,
  maxVehicleLength: null,
  notes: 'Reserved for VIP guest',
  isActive: true,
  createdAt: new Date('2024-01-15T00:00:00Z'),
  updatedAt: new Date('2024-03-01T00:00:00Z'),
};

export const maintenanceSpot: CampingSpotFixture = {
  id: 'camping-spot-uuid-00000000-0000-0000-0000-000000000004',
  zoneId: tentZone.id,
  number: 'A4',
  status: CampingSpotStatus.MAINTENANCE,
  latitude: 48.85664,
  longitude: 2.35224,
  size: 'medium',
  electricityHook: true,
  waterHook: true,
  maxVehicleLength: null,
  notes: 'Electrical repairs needed',
  isActive: true,
  createdAt: new Date('2024-01-15T00:00:00Z'),
  updatedAt: new Date('2024-03-10T00:00:00Z'),
};

export const caravanSpot: CampingSpotFixture = {
  id: 'camping-spot-uuid-00000000-0000-0000-0000-000000000005',
  zoneId: caravanZone.id,
  number: 'B1',
  status: CampingSpotStatus.AVAILABLE,
  latitude: 48.85671,
  longitude: 2.35231,
  size: 'large',
  electricityHook: true,
  waterHook: true,
  maxVehicleLength: 8.5,
  notes: 'Drive-through spot',
  isActive: true,
  createdAt: new Date('2024-01-15T00:00:00Z'),
  updatedAt: new Date('2024-01-15T00:00:00Z'),
};

export const inactiveSpot: CampingSpotFixture = {
  id: 'camping-spot-uuid-00000000-0000-0000-0000-000000000006',
  zoneId: tentZone.id,
  number: 'A5',
  status: CampingSpotStatus.BLOCKED,
  latitude: 48.85665,
  longitude: 2.35225,
  size: 'small',
  electricityHook: false,
  waterHook: false,
  maxVehicleLength: null,
  notes: 'Temporarily closed',
  isActive: false,
  createdAt: new Date('2024-01-15T00:00:00Z'),
  updatedAt: new Date('2024-02-20T00:00:00Z'),
};

// ============================================================================
// Camping Booking Fixtures
// ============================================================================

// Base dates for testing
const _festivalStartDate = new Date('2024-07-15T00:00:00Z');
const _festivalEndDate = new Date('2024-07-20T00:00:00Z');

export const pendingBooking: CampingBookingFixture = {
  id: 'camping-booking-uuid-00000000-0000-0000-0000-000000000001',
  bookingNumber: 'CAMP-TEST-PEND001',
  spotId: availableSpot.id,
  userId: regularUser.id,
  checkIn: new Date('2024-07-15T14:00:00Z'),
  checkOut: new Date('2024-07-18T11:00:00Z'),
  guestCount: 2,
  status: BookingStatus.PENDING,
  totalPrice: 75.0, // 3 nights * 25 EUR
  paidAmount: 0,
  vehiclePlate: null,
  vehicleType: 'none',
  qrCode: 'CAMP-QR-PENDING-001',
  notes: 'Arriving late around 22h',
  staffNotes: null,
  checkedInAt: null,
  checkedOutAt: null,
  cancelledAt: null,
  cancelReason: null,
  damageReport: null,
  createdAt: new Date('2024-03-01T10:00:00Z'),
  updatedAt: new Date('2024-03-01T10:00:00Z'),
};

export const confirmedBooking: CampingBookingFixture = {
  id: 'camping-booking-uuid-00000000-0000-0000-0000-000000000002',
  bookingNumber: 'CAMP-TEST-CONF002',
  spotId: reservedSpot.id,
  userId: regularUser.id,
  checkIn: new Date('2024-07-15T14:00:00Z'),
  checkOut: new Date('2024-07-17T11:00:00Z'),
  guestCount: 4,
  status: BookingStatus.CONFIRMED,
  totalPrice: 50.0, // 2 nights * 25 EUR
  paidAmount: 50.0,
  vehiclePlate: 'AB-123-CD',
  vehicleType: 'car',
  qrCode: 'CAMP-QR-CONFIRMED-002',
  notes: 'Family with 2 children',
  staffNotes: 'VIP guest - extra care',
  checkedInAt: null,
  checkedOutAt: null,
  cancelledAt: null,
  cancelReason: null,
  damageReport: null,
  createdAt: new Date('2024-03-01T11:00:00Z'),
  updatedAt: new Date('2024-03-02T10:00:00Z'),
};

export const checkedInBooking: CampingBookingFixture = {
  id: 'camping-booking-uuid-00000000-0000-0000-0000-000000000003',
  bookingNumber: 'CAMP-TEST-CHIN003',
  spotId: occupiedSpot.id,
  userId: regularUser.id,
  checkIn: new Date('2024-07-15T14:00:00Z'),
  checkOut: new Date('2024-07-19T11:00:00Z'),
  guestCount: 2,
  status: BookingStatus.CHECKED_IN,
  totalPrice: 100.0, // 4 nights * 25 EUR
  paidAmount: 100.0,
  vehiclePlate: 'EF-456-GH',
  vehicleType: 'car',
  qrCode: 'CAMP-QR-CHECKEDIN-003',
  notes: null,
  staffNotes: 'Checked in on time',
  checkedInAt: new Date('2024-07-15T15:30:00Z'),
  checkedOutAt: null,
  cancelledAt: null,
  cancelReason: null,
  damageReport: null,
  createdAt: new Date('2024-03-05T09:00:00Z'),
  updatedAt: new Date('2024-07-15T15:30:00Z'),
};

export const checkedOutBooking: CampingBookingFixture = {
  id: 'camping-booking-uuid-00000000-0000-0000-0000-000000000004',
  bookingNumber: 'CAMP-TEST-CHOUT004',
  spotId: availableSpot.id,
  userId: regularUser.id,
  checkIn: new Date('2024-07-10T14:00:00Z'),
  checkOut: new Date('2024-07-12T11:00:00Z'),
  guestCount: 1,
  status: BookingStatus.CHECKED_OUT,
  totalPrice: 50.0,
  paidAmount: 50.0,
  vehiclePlate: null,
  vehicleType: 'none',
  qrCode: 'CAMP-QR-CHECKEDOUT-004',
  notes: 'Solo traveler',
  staffNotes: '[Checkout] All clear, no issues',
  checkedInAt: new Date('2024-07-10T16:00:00Z'),
  checkedOutAt: new Date('2024-07-12T10:00:00Z'),
  cancelledAt: null,
  cancelReason: null,
  damageReport: null,
  createdAt: new Date('2024-02-20T14:00:00Z'),
  updatedAt: new Date('2024-07-12T10:00:00Z'),
};

export const cancelledBooking: CampingBookingFixture = {
  id: 'camping-booking-uuid-00000000-0000-0000-0000-000000000005',
  bookingNumber: 'CAMP-TEST-CANC005',
  spotId: availableSpot.id,
  userId: regularUser.id,
  checkIn: new Date('2024-07-16T14:00:00Z'),
  checkOut: new Date('2024-07-18T11:00:00Z'),
  guestCount: 3,
  status: BookingStatus.CANCELLED,
  totalPrice: 50.0,
  paidAmount: 50.0,
  vehiclePlate: 'IJ-789-KL',
  vehicleType: 'car',
  qrCode: 'CAMP-QR-CANCELLED-005',
  notes: null,
  staffNotes: null,
  checkedInAt: null,
  checkedOutAt: null,
  cancelledAt: new Date('2024-03-15T09:00:00Z'),
  cancelReason: 'Change of plans',
  damageReport: null,
  createdAt: new Date('2024-02-28T16:00:00Z'),
  updatedAt: new Date('2024-03-15T09:00:00Z'),
};

export const caravanBooking: CampingBookingFixture = {
  id: 'camping-booking-uuid-00000000-0000-0000-0000-000000000006',
  bookingNumber: 'CAMP-TEST-CARA006',
  spotId: caravanSpot.id,
  userId: regularUser.id,
  checkIn: new Date('2024-07-15T14:00:00Z'),
  checkOut: new Date('2024-07-20T11:00:00Z'),
  guestCount: 4,
  status: BookingStatus.CONFIRMED,
  totalPrice: 225.0, // 5 nights * 45 EUR
  paidAmount: 225.0,
  vehiclePlate: 'MN-012-OP',
  vehicleType: 'caravan',
  qrCode: 'CAMP-QR-CARAVAN-006',
  notes: 'Caravan 7m length',
  staffNotes: null,
  checkedInAt: null,
  checkedOutAt: null,
  cancelledAt: null,
  cancelReason: null,
  damageReport: null,
  createdAt: new Date('2024-03-10T12:00:00Z'),
  updatedAt: new Date('2024-03-11T10:00:00Z'),
};

// ============================================================================
// Collections
// ============================================================================

export const allCampingZoneFixtures: CampingZoneFixture[] = [
  tentZone,
  caravanZone,
  glampingZone,
  inactiveZone,
];

export const activeCampingZoneFixtures: CampingZoneFixture[] = [
  tentZone,
  caravanZone,
  glampingZone,
];

export const allCampingSpotFixtures: CampingSpotFixture[] = [
  availableSpot,
  occupiedSpot,
  reservedSpot,
  maintenanceSpot,
  caravanSpot,
  inactiveSpot,
];

export const activeCampingSpotFixtures: CampingSpotFixture[] = [
  availableSpot,
  occupiedSpot,
  reservedSpot,
  maintenanceSpot,
  caravanSpot,
];

export const allCampingBookingFixtures: CampingBookingFixture[] = [
  pendingBooking,
  confirmedBooking,
  checkedInBooking,
  checkedOutBooking,
  cancelledBooking,
  caravanBooking,
];

export const activeBookingFixtures: CampingBookingFixture[] = [
  pendingBooking,
  confirmedBooking,
  checkedInBooking,
  caravanBooking,
];

// ============================================================================
// Factory Functions
// ============================================================================

let zoneCounter = 0;
let spotCounter = 0;
let bookingCounter = 0;

/**
 * Creates a unique camping zone fixture
 */
export function createCampingZoneFixture(
  overrides: Partial<CampingZoneFixture> = {}
): CampingZoneFixture {
  zoneCounter++;
  const timestamp = Date.now();
  const uniqueId = `test-${timestamp}-${zoneCounter}`;

  return {
    id: `camping-zone-uuid-${uniqueId}`,
    festivalId: publishedFestival.id,
    name: `Zone Test ${zoneCounter}`,
    description: 'Test zone description',
    type: AccommodationType.TENT,
    capacity: 50,
    pricePerNight: 25.0,
    amenities: ['toilets', 'showers'],
    rules: null,
    latitude: 48.8566,
    longitude: 2.3522,
    imageUrl: null,
    isActive: true,
    sortOrder: zoneCounter,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a unique camping spot fixture
 */
export function createCampingSpotFixture(
  overrides: Partial<CampingSpotFixture> = {}
): CampingSpotFixture {
  spotCounter++;
  const timestamp = Date.now();
  const uniqueId = `test-${timestamp}-${spotCounter}`;

  return {
    id: `camping-spot-uuid-${uniqueId}`,
    zoneId: tentZone.id,
    number: `T${spotCounter}`,
    status: CampingSpotStatus.AVAILABLE,
    latitude: 48.8566 + spotCounter * 0.0001,
    longitude: 2.3522 + spotCounter * 0.0001,
    size: 'medium',
    electricityHook: false,
    waterHook: false,
    maxVehicleLength: null,
    notes: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a unique camping booking fixture
 */
export function createCampingBookingFixture(
  overrides: Partial<CampingBookingFixture> = {}
): CampingBookingFixture {
  bookingCounter++;
  const timestamp = Date.now();
  const uniqueId = `test-${timestamp}-${bookingCounter}`;
  const checkIn = overrides.checkIn ?? new Date('2024-07-15T14:00:00Z');
  const checkOut = overrides.checkOut ?? new Date('2024-07-17T11:00:00Z');
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  return {
    id: `camping-booking-uuid-${uniqueId}`,
    bookingNumber: `CAMP-${uniqueId.toUpperCase()}`,
    spotId: availableSpot.id,
    userId: regularUser.id,
    checkIn,
    checkOut,
    guestCount: 2,
    status: BookingStatus.PENDING,
    totalPrice: nights * 25.0,
    paidAmount: 0,
    vehiclePlate: null,
    vehicleType: 'none',
    qrCode: `CAMP-QR-${uniqueId}`,
    notes: null,
    staffNotes: null,
    checkedInAt: null,
    checkedOutAt: null,
    cancelledAt: null,
    cancelReason: null,
    damageReport: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Test Input Data
// ============================================================================

export const validCreateSpotInput = {
  zoneId: tentZone.id,
  number: 'A10',
  size: 'medium',
  electricityHook: false,
  waterHook: false,
};

export const validBulkCreateSpotsInput = {
  zoneId: tentZone.id,
  prefix: 'A',
  count: 10,
  startNumber: 20,
  size: 'medium',
  electricityHook: false,
  waterHook: false,
};

export const validBookingInput = {
  spotId: availableSpot.id,
  checkIn: new Date('2024-07-20T14:00:00Z'),
  checkOut: new Date('2024-07-22T11:00:00Z'),
  guestCount: 2,
  vehiclePlate: 'XY-999-ZZ',
  vehicleType: 'car',
  notes: 'Test booking',
};

export const invalidBookingInputs = {
  checkOutBeforeCheckIn: {
    spotId: availableSpot.id,
    checkIn: new Date('2024-07-22T14:00:00Z'),
    checkOut: new Date('2024-07-20T11:00:00Z'),
    guestCount: 2,
  },
  overlappingDates: {
    spotId: occupiedSpot.id,
    checkIn: new Date('2024-07-16T14:00:00Z'),
    checkOut: new Date('2024-07-18T11:00:00Z'),
    guestCount: 2,
  },
  zeroGuests: {
    spotId: availableSpot.id,
    checkIn: new Date('2024-07-20T14:00:00Z'),
    checkOut: new Date('2024-07-22T11:00:00Z'),
    guestCount: 0,
  },
};

export const validCheckInInput = {
  vehiclePlate: 'NEW-PLATE-123',
  notes: 'Arrived on time',
};

export const validCheckOutInput = {
  notes: 'All good, no issues',
  damageReport: null,
};

export const validCancelInput = {
  reason: 'Guest requested cancellation',
  issueRefund: true,
};

// ============================================================================
// Spot With Zone (for includes)
// ============================================================================

export const spotWithZone = {
  ...availableSpot,
  zone: {
    id: tentZone.id,
    name: tentZone.name,
    type: tentZone.type,
    pricePerNight: tentZone.pricePerNight,
    festivalId: tentZone.festivalId,
    amenities: tentZone.amenities,
  },
};

export const occupiedSpotWithZone = {
  ...occupiedSpot,
  zone: {
    id: tentZone.id,
    name: tentZone.name,
    type: tentZone.type,
    pricePerNight: tentZone.pricePerNight,
    festivalId: tentZone.festivalId,
    amenities: tentZone.amenities,
  },
};

export const caravanSpotWithZone = {
  ...caravanSpot,
  zone: {
    id: caravanZone.id,
    name: caravanZone.name,
    type: caravanZone.type,
    pricePerNight: caravanZone.pricePerNight,
    festivalId: caravanZone.festivalId,
    amenities: caravanZone.amenities,
  },
};

// ============================================================================
// Booking With Relations (for includes)
// ============================================================================

export const bookingWithRelations = {
  ...confirmedBooking,
  spot: {
    ...reservedSpot,
    zone: {
      id: tentZone.id,
      name: tentZone.name,
      type: tentZone.type,
      pricePerNight: tentZone.pricePerNight,
      festivalId: tentZone.festivalId,
    },
  },
  user: {
    id: regularUser.id,
    firstName: regularUser.firstName,
    lastName: regularUser.lastName,
    email: regularUser.email,
    phone: regularUser.phone,
  },
};

export const checkedInBookingWithRelations = {
  ...checkedInBooking,
  spot: {
    ...occupiedSpot,
    zone: {
      id: tentZone.id,
      name: tentZone.name,
      type: tentZone.type,
      pricePerNight: tentZone.pricePerNight,
      festivalId: tentZone.festivalId,
    },
  },
  user: {
    id: regularUser.id,
    firstName: regularUser.firstName,
    lastName: regularUser.lastName,
    email: regularUser.email,
    phone: regularUser.phone,
  },
};
