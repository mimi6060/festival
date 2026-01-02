/**
 * Festival-related Constants
 * @module @festival/constants/festival
 */

/**
 * Festival status lifecycle
 */
export const FESTIVAL_STATUS = {
  /** Initial draft state */
  DRAFT: 'DRAFT',
  /** Pending approval/review */
  PENDING: 'PENDING',
  /** Approved but not yet published */
  APPROVED: 'APPROVED',
  /** Published and visible to public */
  PUBLISHED: 'PUBLISHED',
  /** Ticket sales are live */
  ON_SALE: 'ON_SALE',
  /** Tickets sold out */
  SOLD_OUT: 'SOLD_OUT',
  /** Festival is currently happening */
  ONGOING: 'ONGOING',
  /** Festival has ended */
  ENDED: 'ENDED',
  /** Festival was cancelled */
  CANCELLED: 'CANCELLED',
  /** Festival postponed to later date */
  POSTPONED: 'POSTPONED',
  /** Archived (past festival, no longer visible) */
  ARCHIVED: 'ARCHIVED',
} as const;

export type FestivalStatus = (typeof FESTIVAL_STATUS)[keyof typeof FESTIVAL_STATUS];

/**
 * Ticket types/categories
 */
export const TICKET_TYPES = {
  /** Standard general admission */
  GENERAL: 'GENERAL',
  /** VIP access with extra perks */
  VIP: 'VIP',
  /** Premium/Platinum tier */
  PREMIUM: 'PREMIUM',
  /** Early bird discounted tickets */
  EARLY_BIRD: 'EARLY_BIRD',
  /** Last minute tickets */
  LAST_MINUTE: 'LAST_MINUTE',
  /** Group/bundle tickets */
  GROUP: 'GROUP',
  /** Student discounted tickets */
  STUDENT: 'STUDENT',
  /** Senior discounted tickets */
  SENIOR: 'SENIOR',
  /** Child tickets */
  CHILD: 'CHILD',
  /** Companion/carer tickets */
  COMPANION: 'COMPANION',
  /** Press/Media accreditation */
  PRESS: 'PRESS',
  /** Staff/crew passes */
  STAFF: 'STAFF',
  /** Artist/performer passes */
  ARTIST: 'ARTIST',
  /** Sponsor passes */
  SPONSOR: 'SPONSOR',
  /** Single day pass */
  DAY_PASS: 'DAY_PASS',
  /** Weekend pass */
  WEEKEND_PASS: 'WEEKEND_PASS',
  /** Full festival pass */
  FULL_PASS: 'FULL_PASS',
  /** Camping addon */
  CAMPING: 'CAMPING',
  /** Parking addon */
  PARKING: 'PARKING',
  /** Locker rental */
  LOCKER: 'LOCKER',
} as const;

export type TicketType = (typeof TICKET_TYPES)[keyof typeof TICKET_TYPES];

/**
 * Ticket status lifecycle
 */
export const TICKET_STATUS = {
  /** Ticket created but not paid */
  RESERVED: 'RESERVED',
  /** Payment confirmed */
  PAID: 'PAID',
  /** Ticket has been validated/scanned */
  VALIDATED: 'VALIDATED',
  /** Ticket used for entry */
  USED: 'USED',
  /** Ticket cancelled/refunded */
  CANCELLED: 'CANCELLED',
  /** Ticket expired (not paid in time) */
  EXPIRED: 'EXPIRED',
  /** Ticket transferred to another user */
  TRANSFERRED: 'TRANSFERRED',
  /** Ticket pending refund */
  PENDING_REFUND: 'PENDING_REFUND',
  /** Ticket refunded */
  REFUNDED: 'REFUNDED',
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

/**
 * Order status
 */
export const ORDER_STATUS = {
  /** Order created, awaiting payment */
  PENDING: 'PENDING',
  /** Payment processing */
  PROCESSING: 'PROCESSING',
  /** Order confirmed and paid */
  CONFIRMED: 'CONFIRMED',
  /** Order fulfilled (tickets delivered) */
  FULFILLED: 'FULFILLED',
  /** Order cancelled */
  CANCELLED: 'CANCELLED',
  /** Order refunded */
  REFUNDED: 'REFUNDED',
  /** Partial refund applied */
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  /** Order expired (not completed in time) */
  EXPIRED: 'EXPIRED',
  /** Payment failed */
  FAILED: 'FAILED',
  /** Order disputed */
  DISPUTED: 'DISPUTED',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/**
 * Event/Performance types
 */
export const EVENT_TYPES = {
  /** Music concert/performance */
  CONCERT: 'CONCERT',
  /** DJ set */
  DJ_SET: 'DJ_SET',
  /** Live performance */
  LIVE: 'LIVE',
  /** Workshop/masterclass */
  WORKSHOP: 'WORKSHOP',
  /** Panel/talk */
  TALK: 'TALK',
  /** Art installation */
  INSTALLATION: 'INSTALLATION',
  /** Cinema/screening */
  SCREENING: 'SCREENING',
  /** Parade/procession */
  PARADE: 'PARADE',
  /** Meet and greet */
  MEET_GREET: 'MEET_GREET',
  /** Signing session */
  SIGNING: 'SIGNING',
  /** Food/drink tasting */
  TASTING: 'TASTING',
  /** Competition */
  COMPETITION: 'COMPETITION',
  /** Ceremony (opening/closing) */
  CEREMONY: 'CEREMONY',
  /** Other/miscellaneous */
  OTHER: 'OTHER',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/**
 * Music genres
 */
export const MUSIC_GENRES = {
  ROCK: 'ROCK',
  POP: 'POP',
  ELECTRONIC: 'ELECTRONIC',
  TECHNO: 'TECHNO',
  HOUSE: 'HOUSE',
  HIP_HOP: 'HIP_HOP',
  RAP: 'RAP',
  RNB: 'RNB',
  JAZZ: 'JAZZ',
  BLUES: 'BLUES',
  CLASSICAL: 'CLASSICAL',
  FOLK: 'FOLK',
  COUNTRY: 'COUNTRY',
  REGGAE: 'REGGAE',
  METAL: 'METAL',
  PUNK: 'PUNK',
  INDIE: 'INDIE',
  ALTERNATIVE: 'ALTERNATIVE',
  SOUL: 'SOUL',
  FUNK: 'FUNK',
  DISCO: 'DISCO',
  LATIN: 'LATIN',
  WORLD: 'WORLD',
  EXPERIMENTAL: 'EXPERIMENTAL',
  AMBIENT: 'AMBIENT',
  DRUM_AND_BASS: 'DRUM_AND_BASS',
  DUBSTEP: 'DUBSTEP',
  TRANCE: 'TRANCE',
  OTHER: 'OTHER',
} as const;

export type MusicGenre = (typeof MUSIC_GENRES)[keyof typeof MUSIC_GENRES];

/**
 * Zone types for access control
 */
export const ZONE_TYPES = {
  /** Main festival grounds */
  MAIN: 'MAIN',
  /** VIP area */
  VIP: 'VIP',
  /** Backstage area */
  BACKSTAGE: 'BACKSTAGE',
  /** Main stage area */
  MAIN_STAGE: 'MAIN_STAGE',
  /** Secondary stages */
  SECONDARY_STAGE: 'SECONDARY_STAGE',
  /** Camping area */
  CAMPING: 'CAMPING',
  /** Food court */
  FOOD_COURT: 'FOOD_COURT',
  /** Bar/drinks area */
  BAR: 'BAR',
  /** Merchandise zone */
  MERCH: 'MERCH',
  /** Rest/chill area */
  CHILL: 'CHILL',
  /** First aid/medical */
  MEDICAL: 'MEDICAL',
  /** Parking */
  PARKING: 'PARKING',
  /** Entry/exit points */
  ENTRANCE: 'ENTRANCE',
  /** Staff only */
  STAFF_ONLY: 'STAFF_ONLY',
  /** Press area */
  PRESS: 'PRESS',
  /** Sponsor lounge */
  SPONSOR: 'SPONSOR',
  /** Toilets/facilities */
  FACILITIES: 'FACILITIES',
  /** Charging stations */
  CHARGING: 'CHARGING',
  /** Lockers */
  LOCKERS: 'LOCKERS',
} as const;

export type ZoneType = (typeof ZONE_TYPES)[keyof typeof ZONE_TYPES];

/**
 * Accommodation types for camping/lodging
 */
export const ACCOMMODATION_TYPES = {
  /** Bring your own tent */
  TENT_OWN: 'TENT_OWN',
  /** Pre-pitched tent */
  TENT_RENTAL: 'TENT_RENTAL',
  /** Glamping tent */
  GLAMPING: 'GLAMPING',
  /** Camper van spot */
  CAMPER_VAN: 'CAMPER_VAN',
  /** Caravan spot */
  CARAVAN: 'CARAVAN',
  /** Cabin/chalet */
  CABIN: 'CABIN',
  /** Tipi */
  TIPI: 'TIPI',
  /** Bell tent */
  BELL_TENT: 'BELL_TENT',
  /** Yurt */
  YURT: 'YURT',
  /** Hotel nearby (partner) */
  HOTEL: 'HOTEL',
  /** Hostel nearby (partner) */
  HOSTEL: 'HOSTEL',
  /** No accommodation */
  NONE: 'NONE',
} as const;

export type AccommodationType = (typeof ACCOMMODATION_TYPES)[keyof typeof ACCOMMODATION_TYPES];

/**
 * Vendor/merchant categories
 */
export const VENDOR_CATEGORIES = {
  /** Food vendor */
  FOOD: 'FOOD',
  /** Drinks/bar */
  DRINKS: 'DRINKS',
  /** Merchandise */
  MERCH: 'MERCH',
  /** Arts and crafts */
  ARTS: 'ARTS',
  /** Clothing/fashion */
  CLOTHING: 'CLOTHING',
  /** Jewelry/accessories */
  ACCESSORIES: 'ACCESSORIES',
  /** Health/wellness */
  WELLNESS: 'WELLNESS',
  /** Services (massage, etc) */
  SERVICES: 'SERVICES',
  /** Sponsor booth */
  SPONSOR: 'SPONSOR',
  /** Information booth */
  INFO: 'INFO',
  /** Other */
  OTHER: 'OTHER',
} as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[keyof typeof VENDOR_CATEGORIES];

/**
 * Festival configuration limits
 */
export const FESTIVAL_LIMITS = {
  /** Maximum title length */
  MAX_TITLE_LENGTH: 150,
  /** Maximum description length */
  MAX_DESCRIPTION_LENGTH: 10000,
  /** Maximum short description length */
  MAX_SHORT_DESCRIPTION_LENGTH: 500,
  /** Maximum number of tags */
  MAX_TAGS: 20,
  /** Maximum number of images */
  MAX_IMAGES: 50,
  /** Maximum number of stages */
  MAX_STAGES: 50,
  /** Maximum festival duration in days */
  MAX_DURATION_DAYS: 30,
  /** Minimum capacity */
  MIN_CAPACITY: 10,
  /** Maximum capacity */
  MAX_CAPACITY: 500000,
  /** Maximum ticket categories per festival */
  MAX_TICKET_CATEGORIES: 50,
  /** Maximum artists per festival */
  MAX_ARTISTS: 1000,
  /** Maximum vendors per festival */
  MAX_VENDORS: 500,
  /** Maximum zones per festival */
  MAX_ZONES: 100,
  /** Ticket reservation timeout in minutes */
  TICKET_RESERVATION_TIMEOUT_MINUTES: 15,
  /** Maximum tickets per order */
  MAX_TICKETS_PER_ORDER: 10,
  /** Maximum tickets per user per festival */
  MAX_TICKETS_PER_USER: 20,
} as const;

/**
 * Schedule-related constants
 */
export const SCHEDULE = {
  /** Minimum event duration in minutes */
  MIN_EVENT_DURATION_MINUTES: 15,
  /** Maximum event duration in minutes */
  MAX_EVENT_DURATION_MINUTES: 480,
  /** Default event duration in minutes */
  DEFAULT_EVENT_DURATION_MINUTES: 60,
  /** Time slot granularity in minutes */
  TIME_SLOT_GRANULARITY_MINUTES: 15,
  /** Buffer time between events in minutes */
  DEFAULT_BUFFER_MINUTES: 30,
} as const;

/**
 * Entry scan modes
 */
export const SCAN_MODE = {
  /** Single entry - ticket can only be used once */
  SINGLE: 'SINGLE',
  /** Multiple entry - in and out allowed */
  MULTIPLE: 'MULTIPLE',
  /** Timed entry - valid for specific time slot */
  TIMED: 'TIMED',
  /** Zone specific - validates for specific zone */
  ZONE: 'ZONE',
} as const;

export type ScanMode = (typeof SCAN_MODE)[keyof typeof SCAN_MODE];
