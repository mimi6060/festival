/**
 * Festival Test Fixtures
 *
 * Predefined festival data for unit and integration tests.
 * Includes various festival states, ticket categories, and zones.
 */

import { FestivalStatus, TicketType, TicketStatus } from '@prisma/client';
import { organizerUser } from './users.fixture';

// ============================================================================
// Types
// ============================================================================

export interface FestivalFixture {
  id: string;
  organizerId: string;
  name: string;
  slug: string;
  description: string | null;
  location: string;
  address: string | null;
  startDate: Date;
  endDate: Date;
  status: FestivalStatus;
  maxCapacity: number;
  currentAttendees: number;
  logoUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  timezone: string;
  currency: string;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketCategoryFixture {
  id: string;
  festivalId: string;
  name: string;
  description: string | null;
  type: TicketType;
  price: number;
  quota: number;
  soldCount: number;
  maxPerUser: number;
  saleStartDate: Date;
  saleEndDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketFixture {
  id: string;
  festivalId: string;
  categoryId: string;
  userId: string;
  qrCode: string;
  qrCodeData: string;
  status: TicketStatus;
  purchasePrice: number;
  usedAt: Date | null;
  usedByStaffId: string | null;
  paymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ZoneFixture {
  id: string;
  festivalId: string;
  name: string;
  description: string | null;
  capacity: number | null;
  currentOccupancy: number;
  requiresTicketType: TicketType[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Date Helpers
// ============================================================================

const now = new Date();

// Future dates (festival not yet started)
const futureStartDate = new Date(now);
futureStartDate.setDate(futureStartDate.getDate() + 30);
const futureEndDate = new Date(now);
futureEndDate.setDate(futureEndDate.getDate() + 33);

// Current dates (ongoing festival)
const ongoingStartDate = new Date(now);
ongoingStartDate.setDate(ongoingStartDate.getDate() - 1);
const ongoingEndDate = new Date(now);
ongoingEndDate.setDate(ongoingEndDate.getDate() + 2);

// Past dates (completed festival)
const pastStartDate = new Date(now);
pastStartDate.setMonth(pastStartDate.getMonth() - 2);
const pastEndDate = new Date(now);
pastEndDate.setMonth(pastEndDate.getMonth() - 2);
pastEndDate.setDate(pastEndDate.getDate() + 3);

// Sale dates
const saleStartDate = new Date(now);
saleStartDate.setMonth(saleStartDate.getMonth() - 1);
const futureSaleEndDate = new Date(futureStartDate);
futureSaleEndDate.setDate(futureSaleEndDate.getDate() - 1);
const expiredSaleEndDate = new Date(now);
expiredSaleEndDate.setDate(expiredSaleEndDate.getDate() - 7);

// ============================================================================
// Festival Fixtures
// ============================================================================

export const draftFestival: FestivalFixture = {
  id: 'festival-uuid-00000000-0000-0000-0000-000000000001',
  organizerId: organizerUser.id,
  name: 'Summer Beats Festival 2025',
  slug: 'summer-beats-2025',
  description: 'The ultimate electronic music experience',
  location: 'Paris, France',
  address: '123 Festival Avenue, 75001 Paris',
  startDate: futureStartDate,
  endDate: futureEndDate,
  status: FestivalStatus.DRAFT,
  maxCapacity: 50000,
  currentAttendees: 0,
  logoUrl: 'https://cdn.festival.test/summer-beats-logo.png',
  bannerUrl: 'https://cdn.festival.test/summer-beats-banner.jpg',
  websiteUrl: 'https://summer-beats.festival.test',
  contactEmail: 'contact@summer-beats.festival.test',
  timezone: 'Europe/Paris',
  currency: 'EUR',
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-15T00:00:00Z'),
};

export const publishedFestival: FestivalFixture = {
  id: 'festival-uuid-00000000-0000-0000-0000-000000000002',
  organizerId: organizerUser.id,
  name: 'Rock Nation Festival',
  slug: 'rock-nation-2025',
  description: 'Three days of pure rock energy',
  location: 'Lyon, France',
  address: '456 Rock Street, 69000 Lyon',
  startDate: futureStartDate,
  endDate: futureEndDate,
  status: FestivalStatus.PUBLISHED,
  maxCapacity: 30000,
  currentAttendees: 0,
  logoUrl: 'https://cdn.festival.test/rock-nation-logo.png',
  bannerUrl: 'https://cdn.festival.test/rock-nation-banner.jpg',
  websiteUrl: 'https://rock-nation.festival.test',
  contactEmail: 'contact@rock-nation.festival.test',
  timezone: 'Europe/Paris',
  currency: 'EUR',
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date('2024-02-01T00:00:00Z'),
  updatedAt: new Date('2024-02-15T00:00:00Z'),
};

export const ongoingFestival: FestivalFixture = {
  id: 'festival-uuid-00000000-0000-0000-0000-000000000003',
  organizerId: organizerUser.id,
  name: 'Jazz & Wine Weekend',
  slug: 'jazz-wine-2025',
  description: 'Smooth jazz and fine wines',
  location: 'Bordeaux, France',
  address: '789 Wine Lane, 33000 Bordeaux',
  startDate: ongoingStartDate,
  endDate: ongoingEndDate,
  status: FestivalStatus.ONGOING,
  maxCapacity: 10000,
  currentAttendees: 4500,
  logoUrl: 'https://cdn.festival.test/jazz-wine-logo.png',
  bannerUrl: null,
  websiteUrl: 'https://jazz-wine.festival.test',
  contactEmail: 'info@jazz-wine.festival.test',
  timezone: 'Europe/Paris',
  currency: 'EUR',
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date('2023-10-01T00:00:00Z'),
  updatedAt: new Date(),
};

export const completedFestival: FestivalFixture = {
  id: 'festival-uuid-00000000-0000-0000-0000-000000000004',
  organizerId: organizerUser.id,
  name: 'Electronic Dreams 2024',
  slug: 'electronic-dreams-2024',
  description: 'Last year\'s electronic extravaganza',
  location: 'Nice, France',
  address: '321 Beach Road, 06000 Nice',
  startDate: pastStartDate,
  endDate: pastEndDate,
  status: FestivalStatus.COMPLETED,
  maxCapacity: 25000,
  currentAttendees: 23456,
  logoUrl: null,
  bannerUrl: null,
  websiteUrl: null,
  contactEmail: 'archive@electronic-dreams.festival.test',
  timezone: 'Europe/Paris',
  currency: 'EUR',
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date('2023-05-01T00:00:00Z'),
  updatedAt: pastEndDate,
};

export const cancelledFestival: FestivalFixture = {
  id: 'festival-uuid-00000000-0000-0000-0000-000000000005',
  organizerId: organizerUser.id,
  name: 'Cancelled Event',
  slug: 'cancelled-event-2025',
  description: 'This event was cancelled',
  location: 'Marseille, France',
  address: '999 Cancelled Street, 13000 Marseille',
  startDate: futureStartDate,
  endDate: futureEndDate,
  status: FestivalStatus.CANCELLED,
  maxCapacity: 15000,
  currentAttendees: 0,
  logoUrl: null,
  bannerUrl: null,
  websiteUrl: null,
  contactEmail: null,
  timezone: 'Europe/Paris',
  currency: 'EUR',
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-02-01T00:00:00Z'),
};

export const deletedFestival: FestivalFixture = {
  id: 'festival-uuid-00000000-0000-0000-0000-000000000006',
  organizerId: organizerUser.id,
  name: 'Deleted Festival',
  slug: 'deleted-festival-2025',
  description: 'This festival was soft deleted',
  location: 'Toulouse, France',
  address: null,
  startDate: futureStartDate,
  endDate: futureEndDate,
  status: FestivalStatus.DRAFT,
  maxCapacity: 5000,
  currentAttendees: 0,
  logoUrl: null,
  bannerUrl: null,
  websiteUrl: null,
  contactEmail: null,
  timezone: 'Europe/Paris',
  currency: 'EUR',
  isDeleted: true,
  deletedAt: new Date('2024-01-20T00:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-20T00:00:00Z'),
};

// ============================================================================
// Ticket Category Fixtures
// ============================================================================

export const standardCategory: TicketCategoryFixture = {
  id: 'category-uuid-00000000-0000-0000-0000-000000000001',
  festivalId: publishedFestival.id,
  name: 'Standard Pass',
  description: 'General admission for all 3 days',
  type: TicketType.STANDARD,
  price: 149.99,
  quota: 20000,
  soldCount: 5000,
  maxPerUser: 4,
  saleStartDate: saleStartDate,
  saleEndDate: futureSaleEndDate,
  isActive: true,
  createdAt: new Date('2024-02-01T00:00:00Z'),
  updatedAt: new Date('2024-02-01T00:00:00Z'),
};

export const vipCategory: TicketCategoryFixture = {
  id: 'category-uuid-00000000-0000-0000-0000-000000000002',
  festivalId: publishedFestival.id,
  name: 'VIP Pass',
  description: 'Premium access with VIP lounge',
  type: TicketType.VIP,
  price: 399.99,
  quota: 2000,
  soldCount: 500,
  maxPerUser: 2,
  saleStartDate: saleStartDate,
  saleEndDate: futureSaleEndDate,
  isActive: true,
  createdAt: new Date('2024-02-01T00:00:00Z'),
  updatedAt: new Date('2024-02-01T00:00:00Z'),
};

export const backstageCategory: TicketCategoryFixture = {
  id: 'category-uuid-00000000-0000-0000-0000-000000000003',
  festivalId: publishedFestival.id,
  name: 'Backstage Pass',
  description: 'Full backstage access',
  type: TicketType.BACKSTAGE,
  price: 999.99,
  quota: 100,
  soldCount: 50,
  maxPerUser: 1,
  saleStartDate: saleStartDate,
  saleEndDate: futureSaleEndDate,
  isActive: true,
  createdAt: new Date('2024-02-01T00:00:00Z'),
  updatedAt: new Date('2024-02-01T00:00:00Z'),
};

export const campingCategory: TicketCategoryFixture = {
  id: 'category-uuid-00000000-0000-0000-0000-000000000004',
  festivalId: publishedFestival.id,
  name: 'Camping Add-on',
  description: '3-night camping spot',
  type: TicketType.CAMPING,
  price: 79.99,
  quota: 5000,
  soldCount: 1000,
  maxPerUser: 1,
  saleStartDate: saleStartDate,
  saleEndDate: futureSaleEndDate,
  isActive: true,
  createdAt: new Date('2024-02-01T00:00:00Z'),
  updatedAt: new Date('2024-02-01T00:00:00Z'),
};

export const parkingCategory: TicketCategoryFixture = {
  id: 'category-uuid-00000000-0000-0000-0000-000000000005',
  festivalId: publishedFestival.id,
  name: 'Parking Pass',
  description: 'Vehicle parking for 3 days',
  type: TicketType.PARKING,
  price: 49.99,
  quota: 3000,
  soldCount: 800,
  maxPerUser: 1,
  saleStartDate: saleStartDate,
  saleEndDate: futureSaleEndDate,
  isActive: true,
  createdAt: new Date('2024-02-01T00:00:00Z'),
  updatedAt: new Date('2024-02-01T00:00:00Z'),
};

export const soldOutCategory: TicketCategoryFixture = {
  id: 'category-uuid-00000000-0000-0000-0000-000000000006',
  festivalId: publishedFestival.id,
  name: 'Early Bird',
  description: 'Limited early bird tickets - SOLD OUT',
  type: TicketType.STANDARD,
  price: 99.99,
  quota: 1000,
  soldCount: 1000, // Sold out!
  maxPerUser: 2,
  saleStartDate: saleStartDate,
  saleEndDate: futureSaleEndDate,
  isActive: true,
  createdAt: new Date('2024-01-15T00:00:00Z'),
  updatedAt: new Date('2024-02-01T00:00:00Z'),
};

export const expiredSaleCategory: TicketCategoryFixture = {
  id: 'category-uuid-00000000-0000-0000-0000-000000000007',
  festivalId: publishedFestival.id,
  name: 'Flash Sale',
  description: 'Flash sale - expired',
  type: TicketType.STANDARD,
  price: 119.99,
  quota: 500,
  soldCount: 250,
  maxPerUser: 2,
  saleStartDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
  saleEndDate: expiredSaleEndDate, // Sale ended
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const inactiveCategory: TicketCategoryFixture = {
  id: 'category-uuid-00000000-0000-0000-0000-000000000008',
  festivalId: publishedFestival.id,
  name: 'Disabled Category',
  description: 'This category is disabled',
  type: TicketType.STANDARD,
  price: 99.99,
  quota: 1000,
  soldCount: 0,
  maxPerUser: 4,
  saleStartDate: saleStartDate,
  saleEndDate: futureSaleEndDate,
  isActive: false, // Inactive
  createdAt: new Date('2024-02-01T00:00:00Z'),
  updatedAt: new Date('2024-02-01T00:00:00Z'),
};

// ============================================================================
// Zone Fixtures
// ============================================================================

export const mainStageZone: ZoneFixture = {
  id: 'zone-uuid-00000000-0000-0000-0000-000000000001',
  festivalId: publishedFestival.id,
  name: 'Main Stage',
  description: 'Main concert area',
  capacity: 25000,
  currentOccupancy: 0,
  requiresTicketType: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE],
  isActive: true,
  createdAt: new Date('2024-02-01T00:00:00Z'),
  updatedAt: new Date('2024-02-01T00:00:00Z'),
};

export const vipLounge: ZoneFixture = {
  id: 'zone-uuid-00000000-0000-0000-0000-000000000002',
  festivalId: publishedFestival.id,
  name: 'VIP Lounge',
  description: 'Exclusive VIP area with premium amenities',
  capacity: 1000,
  currentOccupancy: 0,
  requiresTicketType: [TicketType.VIP, TicketType.BACKSTAGE],
  isActive: true,
  createdAt: new Date('2024-02-01T00:00:00Z'),
  updatedAt: new Date('2024-02-01T00:00:00Z'),
};

export const backstageArea: ZoneFixture = {
  id: 'zone-uuid-00000000-0000-0000-0000-000000000003',
  festivalId: publishedFestival.id,
  name: 'Backstage Area',
  description: 'Artist and crew area',
  capacity: 200,
  currentOccupancy: 0,
  requiresTicketType: [TicketType.BACKSTAGE],
  isActive: true,
  createdAt: new Date('2024-02-01T00:00:00Z'),
  updatedAt: new Date('2024-02-01T00:00:00Z'),
};

export const campingZone: ZoneFixture = {
  id: 'zone-uuid-00000000-0000-0000-0000-000000000004',
  festivalId: publishedFestival.id,
  name: 'Camping Area',
  description: 'Festival camping grounds',
  capacity: 5000,
  currentOccupancy: 0,
  requiresTicketType: [TicketType.CAMPING],
  isActive: true,
  createdAt: new Date('2024-02-01T00:00:00Z'),
  updatedAt: new Date('2024-02-01T00:00:00Z'),
};

// ============================================================================
// Collections
// ============================================================================

export const allFestivalFixtures: FestivalFixture[] = [
  draftFestival,
  publishedFestival,
  ongoingFestival,
  completedFestival,
  cancelledFestival,
  deletedFestival,
];

export const activeFestivalFixtures: FestivalFixture[] = [
  draftFestival,
  publishedFestival,
  ongoingFestival,
];

export const allTicketCategoryFixtures: TicketCategoryFixture[] = [
  standardCategory,
  vipCategory,
  backstageCategory,
  campingCategory,
  parkingCategory,
  soldOutCategory,
  expiredSaleCategory,
  inactiveCategory,
];

export const availableTicketCategoryFixtures: TicketCategoryFixture[] = [
  standardCategory,
  vipCategory,
  backstageCategory,
  campingCategory,
  parkingCategory,
];

export const allZoneFixtures: ZoneFixture[] = [
  mainStageZone,
  vipLounge,
  backstageArea,
  campingZone,
];

// ============================================================================
// Factory Functions
// ============================================================================

let festivalCounter = 0;
let categoryCounter = 0;
let ticketCounter = 0;

/**
 * Creates a unique festival fixture
 */
export function createFestivalFixture(overrides: Partial<FestivalFixture> = {}): FestivalFixture {
  festivalCounter++;
  const timestamp = Date.now();
  const uniqueId = `test-${timestamp}-${festivalCounter}`;

  return {
    id: `festival-uuid-${uniqueId}`,
    organizerId: organizerUser.id,
    name: `Test Festival ${festivalCounter}`,
    slug: `test-festival-${uniqueId}`,
    description: `Test festival ${festivalCounter} description`,
    location: 'Test Location, France',
    address: '123 Test Street',
    startDate: futureStartDate,
    endDate: futureEndDate,
    status: FestivalStatus.DRAFT,
    maxCapacity: 10000,
    currentAttendees: 0,
    logoUrl: null,
    bannerUrl: null,
    websiteUrl: null,
    contactEmail: null,
    timezone: 'Europe/Paris',
    currency: 'EUR',
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a unique ticket category fixture
 */
export function createTicketCategoryFixture(
  festivalId: string,
  overrides: Partial<TicketCategoryFixture> = {},
): TicketCategoryFixture {
  categoryCounter++;
  const timestamp = Date.now();
  const uniqueId = `test-${timestamp}-${categoryCounter}`;

  return {
    id: `category-uuid-${uniqueId}`,
    festivalId,
    name: `Test Category ${categoryCounter}`,
    description: `Test category ${categoryCounter} description`,
    type: TicketType.STANDARD,
    price: 99.99,
    quota: 1000,
    soldCount: 0,
    maxPerUser: 4,
    saleStartDate: saleStartDate,
    saleEndDate: futureSaleEndDate,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a unique ticket fixture
 */
export function createTicketFixture(
  festivalId: string,
  categoryId: string,
  userId: string,
  overrides: Partial<TicketFixture> = {},
): TicketFixture {
  ticketCounter++;
  const timestamp = Date.now();
  const uniqueId = `test-${timestamp}-${ticketCounter}`;

  return {
    id: `ticket-uuid-${uniqueId}`,
    festivalId,
    categoryId,
    userId,
    qrCode: `QR-${uniqueId}`,
    qrCodeData: `signed-data-${uniqueId}`,
    status: TicketStatus.SOLD,
    purchasePrice: 99.99,
    usedAt: null,
    usedByStaffId: null,
    paymentId: `payment-uuid-${uniqueId}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Test Input Data
// ============================================================================

export const validFestivalInput = {
  name: 'New Test Festival',
  slug: 'new-test-festival',
  description: 'A new test festival',
  location: 'Test City, France',
  address: '123 Test Street',
  startDate: futureStartDate.toISOString(),
  endDate: futureEndDate.toISOString(),
  maxCapacity: 15000,
  timezone: 'Europe/Paris',
  currency: 'EUR',
  contactEmail: 'contact@test.festival',
};

export const invalidFestivalInputs = {
  missingName: {
    slug: 'test-festival',
    location: 'Paris',
    startDate: futureStartDate.toISOString(),
    endDate: futureEndDate.toISOString(),
    maxCapacity: 10000,
  },
  duplicateSlug: {
    name: 'Different Festival',
    slug: publishedFestival.slug, // Duplicate!
    location: 'Lyon',
    startDate: futureStartDate.toISOString(),
    endDate: futureEndDate.toISOString(),
    maxCapacity: 10000,
  },
  invalidDates: {
    name: 'Invalid Dates Festival',
    slug: 'invalid-dates',
    location: 'Paris',
    startDate: futureEndDate.toISOString(), // Start after end
    endDate: futureStartDate.toISOString(),
    maxCapacity: 10000,
  },
  negativeCapacity: {
    name: 'Negative Capacity',
    slug: 'negative-capacity',
    location: 'Paris',
    startDate: futureStartDate.toISOString(),
    endDate: futureEndDate.toISOString(),
    maxCapacity: -100, // Negative!
  },
  pastDates: {
    name: 'Past Festival',
    slug: 'past-festival',
    location: 'Paris',
    startDate: pastStartDate.toISOString(),
    endDate: pastEndDate.toISOString(),
    maxCapacity: 10000,
  },
};

export const validTicketCategoryInput = {
  name: 'New Ticket Category',
  description: 'A new ticket category',
  type: 'STANDARD',
  price: 129.99,
  quota: 5000,
  maxPerUser: 4,
  saleStartDate: saleStartDate.toISOString(),
  saleEndDate: futureSaleEndDate.toISOString(),
};

export const invalidTicketCategoryInputs = {
  negativePrice: {
    name: 'Negative Price',
    type: 'STANDARD',
    price: -50,
    quota: 1000,
    saleStartDate: saleStartDate.toISOString(),
    saleEndDate: futureSaleEndDate.toISOString(),
  },
  zeroQuota: {
    name: 'Zero Quota',
    type: 'STANDARD',
    price: 99.99,
    quota: 0,
    saleStartDate: saleStartDate.toISOString(),
    saleEndDate: futureSaleEndDate.toISOString(),
  },
  invalidType: {
    name: 'Invalid Type',
    type: 'INVALID_TYPE',
    price: 99.99,
    quota: 1000,
    saleStartDate: saleStartDate.toISOString(),
    saleEndDate: futureSaleEndDate.toISOString(),
  },
};
