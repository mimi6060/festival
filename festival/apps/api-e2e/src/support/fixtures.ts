/**
 * Test Fixtures
 *
 * Predefined test data for E2E tests.
 * These fixtures represent common test scenarios.
 */

// ============================================================================
// User Fixtures
// ============================================================================

export const validUserData = {
  email: 'valid.user@test.festival',
  password: 'ValidPassword123!',
  firstName: 'Valid',
  lastName: 'User',
};

export const adminUserData = {
  email: 'admin@test.festival',
  password: 'AdminPassword123!',
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN' as const,
};

export const organizerUserData = {
  email: 'organizer@test.festival',
  password: 'OrganizerPassword123!',
  firstName: 'Organizer',
  lastName: 'User',
  role: 'ORGANIZER' as const,
};

export const staffUserData = {
  email: 'staff@test.festival',
  password: 'StaffPassword123!',
  firstName: 'Staff',
  lastName: 'User',
  role: 'STAFF' as const,
};

export const cashierUserData = {
  email: 'cashier@test.festival',
  password: 'CashierPassword123!',
  firstName: 'Cashier',
  lastName: 'User',
  role: 'CASHIER' as const,
};

// Invalid user data for validation testing
export const invalidUserData = {
  missingEmail: {
    password: 'ValidPassword123!',
    firstName: 'Test',
    lastName: 'User',
  },
  missingPassword: {
    email: 'test@test.festival',
    firstName: 'Test',
    lastName: 'User',
  },
  invalidEmail: {
    email: 'not-an-email',
    password: 'ValidPassword123!',
    firstName: 'Test',
    lastName: 'User',
  },
  weakPassword: {
    email: 'test@test.festival',
    password: '123',
    firstName: 'Test',
    lastName: 'User',
  },
  emptyFirstName: {
    email: 'test@test.festival',
    password: 'ValidPassword123!',
    firstName: '',
    lastName: 'User',
  },
  emptyLastName: {
    email: 'test@test.festival',
    password: 'ValidPassword123!',
    firstName: 'Test',
    lastName: '',
  },
};

// ============================================================================
// Festival Fixtures
// ============================================================================

const today = new Date();
const startDate = new Date(today);
startDate.setDate(startDate.getDate() + 30);
const endDate = new Date(today);
endDate.setDate(endDate.getDate() + 33);

export const validFestivalData = {
  name: 'Test Music Festival',
  slug: 'test-music-festival',
  description: 'A great test festival for E2E testing',
  location: 'Paris, France',
  address: '123 Festival Street, 75001 Paris',
  startDate: startDate.toISOString(),
  endDate: endDate.toISOString(),
  maxCapacity: 50000,
  timezone: 'Europe/Paris',
  currency: 'EUR',
  contactEmail: 'contact@test-festival.com',
  websiteUrl: 'https://test-festival.com',
};

export const invalidFestivalData = {
  missingName: {
    slug: 'test-festival',
    location: 'Paris',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    maxCapacity: 10000,
  },
  missingLocation: {
    name: 'Test Festival',
    slug: 'test-festival',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    maxCapacity: 10000,
  },
  invalidDates: {
    name: 'Test Festival',
    slug: 'test-festival',
    location: 'Paris',
    startDate: endDate.toISOString(), // Start after end
    endDate: startDate.toISOString(),
    maxCapacity: 10000,
  },
  pastDates: {
    name: 'Test Festival',
    slug: 'test-festival',
    location: 'Paris',
    startDate: '2020-01-01T00:00:00.000Z',
    endDate: '2020-01-03T00:00:00.000Z',
    maxCapacity: 10000,
  },
  negativeCapacity: {
    name: 'Test Festival',
    slug: 'test-festival',
    location: 'Paris',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    maxCapacity: -100,
  },
  duplicateSlug: {
    name: 'Different Festival',
    slug: 'test-music-festival', // Same slug as validFestivalData
    location: 'Lyon',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    maxCapacity: 10000,
  },
};

// ============================================================================
// Ticket Category Fixtures
// ============================================================================

const saleStartDate = new Date();
const saleEndDate = new Date();
saleEndDate.setDate(saleEndDate.getDate() + 60);

export const standardTicketCategory = {
  name: 'Standard Pass',
  description: 'General admission for all 3 days',
  type: 'STANDARD',
  price: 149.99,
  quota: 30000,
  maxPerUser: 4,
  saleStartDate: saleStartDate.toISOString(),
  saleEndDate: saleEndDate.toISOString(),
};

export const vipTicketCategory = {
  name: 'VIP Pass',
  description: 'VIP access with backstage privileges',
  type: 'VIP',
  price: 499.99,
  quota: 1000,
  maxPerUser: 2,
  saleStartDate: saleStartDate.toISOString(),
  saleEndDate: saleEndDate.toISOString(),
};

export const backstageTicketCategory = {
  name: 'Backstage Pass',
  description: 'Full backstage access',
  type: 'BACKSTAGE',
  price: 999.99,
  quota: 100,
  maxPerUser: 1,
  saleStartDate: saleStartDate.toISOString(),
  saleEndDate: saleEndDate.toISOString(),
};

export const campingTicketCategory = {
  name: 'Camping Add-on',
  description: '3-night camping spot',
  type: 'CAMPING',
  price: 79.99,
  quota: 5000,
  maxPerUser: 1,
  saleStartDate: saleStartDate.toISOString(),
  saleEndDate: saleEndDate.toISOString(),
};

export const parkingTicketCategory = {
  name: 'Parking Pass',
  description: 'Parking for all 3 days',
  type: 'PARKING',
  price: 49.99,
  quota: 2000,
  maxPerUser: 1,
  saleStartDate: saleStartDate.toISOString(),
  saleEndDate: saleEndDate.toISOString(),
};

export const invalidTicketCategoryData = {
  missingName: {
    type: 'STANDARD',
    price: 99.99,
    quota: 1000,
    saleStartDate: saleStartDate.toISOString(),
    saleEndDate: saleEndDate.toISOString(),
  },
  negativePrice: {
    name: 'Bad Price Ticket',
    type: 'STANDARD',
    price: -50,
    quota: 1000,
    saleStartDate: saleStartDate.toISOString(),
    saleEndDate: saleEndDate.toISOString(),
  },
  zeroQuota: {
    name: 'No Quota Ticket',
    type: 'STANDARD',
    price: 99.99,
    quota: 0,
    saleStartDate: saleStartDate.toISOString(),
    saleEndDate: saleEndDate.toISOString(),
  },
  invalidType: {
    name: 'Invalid Type Ticket',
    type: 'INVALID_TYPE',
    price: 99.99,
    quota: 1000,
    saleStartDate: saleStartDate.toISOString(),
    saleEndDate: saleEndDate.toISOString(),
  },
  expiredSale: {
    name: 'Expired Sale Ticket',
    type: 'STANDARD',
    price: 99.99,
    quota: 1000,
    saleStartDate: '2020-01-01T00:00:00.000Z',
    saleEndDate: '2020-01-02T00:00:00.000Z',
  },
};

// ============================================================================
// Payment Fixtures
// ============================================================================

export const validPaymentData = {
  amount: 149.99,
  currency: 'EUR',
  provider: 'STRIPE',
};

export const invalidPaymentData = {
  negativeAmount: {
    amount: -50,
    currency: 'EUR',
    provider: 'STRIPE',
  },
  zeroAmount: {
    amount: 0,
    currency: 'EUR',
    provider: 'STRIPE',
  },
  invalidCurrency: {
    amount: 100,
    currency: 'INVALID',
    provider: 'STRIPE',
  },
  invalidProvider: {
    amount: 100,
    currency: 'EUR',
    provider: 'INVALID_PROVIDER',
  },
};

// ============================================================================
// Cashless Fixtures
// ============================================================================

export const validTopupData = {
  amount: 50.00,
};

export const validPaymentCashlessData = {
  amount: 10.50,
  description: 'Food purchase',
};

export const invalidCashlessData = {
  negativeTopup: {
    amount: -20,
  },
  zeroTopup: {
    amount: 0,
  },
  excessiveTopup: {
    amount: 10000, // Might exceed limits
  },
  negativePayment: {
    amount: -10,
    description: 'Invalid payment',
  },
  excessivePayment: {
    amount: 99999, // More than balance
    description: 'Too much',
  },
};

// ============================================================================
// Zone Fixtures
// ============================================================================

export const mainStageZone = {
  name: 'Main Stage',
  description: 'Main concert area',
  capacity: 20000,
  requiresTicketType: ['STANDARD', 'VIP', 'BACKSTAGE'],
};

export const vipZone = {
  name: 'VIP Lounge',
  description: 'Exclusive VIP area',
  capacity: 500,
  requiresTicketType: ['VIP', 'BACKSTAGE'],
};

export const backstageZone = {
  name: 'Backstage Area',
  description: 'Artist and crew only',
  capacity: 100,
  requiresTicketType: ['BACKSTAGE'],
};

// ============================================================================
// Vendor Fixtures
// ============================================================================

export const foodVendor = {
  name: 'Burger Heaven',
  type: 'FOOD',
  description: 'Gourmet burgers and fries',
  location: 'Food Court A',
  commissionRate: 10,
};

export const drinkVendor = {
  name: 'Festival Bar',
  type: 'BAR',
  description: 'Craft beers and cocktails',
  location: 'Bar Zone B',
  commissionRate: 15,
};

export const merchandiseVendor = {
  name: 'Festival Merch',
  type: 'MERCHANDISE',
  description: 'Official festival merchandise',
  location: 'Merchandise Tent',
  commissionRate: 5,
};

// ============================================================================
// Stripe Mock Data (for webhook testing)
// ============================================================================

export const stripeWebhookPayloads = {
  paymentSucceeded: {
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_123456',
        amount: 14999,
        currency: 'eur',
        status: 'succeeded',
        metadata: {
          userId: 'test-user-id',
          ticketCategoryId: 'test-category-id',
          quantity: '1',
        },
      },
    },
  },
  paymentFailed: {
    type: 'payment_intent.payment_failed',
    data: {
      object: {
        id: 'pi_test_failed_123',
        amount: 14999,
        currency: 'eur',
        status: 'requires_payment_method',
        last_payment_error: {
          message: 'Your card was declined.',
        },
      },
    },
  },
  refundCreated: {
    type: 'refund.created',
    data: {
      object: {
        id: 're_test_123',
        payment_intent: 'pi_test_123456',
        amount: 14999,
        status: 'succeeded',
      },
    },
  },
};

// ============================================================================
// Error Messages (for validation testing)
// ============================================================================

export const expectedErrorMessages = {
  auth: {
    invalidCredentials: 'Invalid email or password',
    emailAlreadyExists: 'Email already exists',
    tokenExpired: 'Token has expired',
    invalidToken: 'Invalid token',
    unauthorized: 'Unauthorized',
    forbidden: 'Forbidden',
  },
  validation: {
    emailRequired: 'email should not be empty',
    emailInvalid: 'email must be an email',
    passwordRequired: 'password should not be empty',
    passwordWeak: 'password is not strong enough',
    firstNameRequired: 'firstName should not be empty',
    lastNameRequired: 'lastName should not be empty',
  },
  festival: {
    notFound: 'Festival not found',
    slugExists: 'Festival with this slug already exists',
    invalidDates: 'End date must be after start date',
  },
  ticket: {
    notFound: 'Ticket not found',
    alreadyUsed: 'Ticket has already been used',
    invalidQrCode: 'Invalid QR code',
    soldOut: 'Tickets are sold out',
    maxPerUserExceeded: 'Maximum tickets per user exceeded',
    saleClosed: 'Ticket sale is closed',
  },
  cashless: {
    insufficientBalance: 'Insufficient balance',
    accountNotFound: 'Cashless account not found',
    invalidAmount: 'Amount must be positive',
  },
};
