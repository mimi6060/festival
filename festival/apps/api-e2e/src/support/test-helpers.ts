/**
 * Test Helpers
 *
 * Utility functions for E2E tests including authentication,
 * request helpers, and database operations.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

// ============================================================================
// Types
// ============================================================================

export interface TestUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  accessToken?: string;
  refreshToken?: string;
}

export type UserRole = 'ADMIN' | 'ORGANIZER' | 'STAFF' | 'CASHIER' | 'SECURITY' | 'USER';

export interface TestFestival {
  id: string;
  name: string;
  slug: string;
  organizerId: string;
  startDate: string;
  endDate: string;
  location: string;
  maxCapacity: number;
  status: string;
}

export interface TestTicketCategory {
  id: string;
  festivalId: string;
  name: string;
  type: string;
  price: number;
  quota: number;
  soldCount: number;
}

export interface TestTicket {
  id: string;
  festivalId: string;
  categoryId: string;
  userId: string;
  qrCode: string;
  status: string;
  purchasePrice: number;
}

export interface TestCashlessAccount {
  id: string;
  userId: string;
  balance: number;
  nfcTagId?: string;
  isActive: boolean;
}

// ============================================================================
// API Client Factory
// ============================================================================

/**
 * Creates an authenticated axios instance with the given token
 */
export function createAuthenticatedClient(accessToken: string): AxiosInstance {
  const client = axios.create({
    baseURL: axios.defaults.baseURL,
    timeout: 10000,
    validateStatus: () => true,
  });

  client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  return client;
}

/**
 * Makes an authenticated request using the provided token
 */
export async function authenticatedRequest<T = unknown>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  accessToken: string,
  data?: unknown,
): Promise<AxiosResponse<T>> {
  const config = {
    method,
    url,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    data,
  };

  return axios.request<T>(config);
}

// ============================================================================
// User Management
// ============================================================================

let userCounter = 0;

/**
 * Creates a unique test user with registration
 */
export async function createTestUser(
  role: UserRole = 'USER',
  overrides: Partial<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }> = {},
): Promise<TestUser> {
  userCounter++;
  const timestamp = Date.now();
  const uniqueId = `${timestamp}-${userCounter}`;

  const userData = {
    email: overrides.email || `testuser-${uniqueId}@e2e-test.festival`,
    password: overrides.password || 'TestPassword123!',
    firstName: overrides.firstName || `TestFirst${userCounter}`,
    lastName: overrides.lastName || `TestLast${userCounter}`,
  };

  // Register the user
  const registerResponse = await axios.post('/api/auth/register', userData);

  if (registerResponse.status !== 201 && registerResponse.status !== 200) {
    throw new Error(`Failed to create test user: ${JSON.stringify(registerResponse.data)}`);
  }

  const user: TestUser = {
    id: registerResponse.data.user?.id || registerResponse.data.id,
    email: userData.email,
    password: userData.password,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role,
    accessToken: registerResponse.data.accessToken,
    refreshToken: registerResponse.data.refreshToken,
  };

  // If role is not USER, we need to update the role (requires admin)
  // In tests, we may need a seeded admin user for this
  if (role !== 'USER' && user.id) {
    // This would require admin privileges - handle via seed or mock
    console.log(`Note: User ${user.email} created with USER role. Role ${role} requires admin update.`);
  }

  return user;
}

/**
 * Logs in an existing user and returns tokens
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; user: unknown }> {
  const response = await axios.post('/api/auth/login', { email, password });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Failed to login: ${JSON.stringify(response.data)}`);
  }

  return {
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
    user: response.data.user,
  };
}

/**
 * Refreshes an access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await axios.post('/api/auth/refresh', { refreshToken });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Failed to refresh token: ${JSON.stringify(response.data)}`);
  }

  return response.data.accessToken;
}

/**
 * Logs out a user
 */
export async function logoutUser(accessToken: string): Promise<void> {
  await authenticatedRequest('post', '/api/auth/logout', accessToken);
}

// ============================================================================
// Festival Management
// ============================================================================

let festivalCounter = 0;

/**
 * Creates a test festival
 */
export async function createTestFestival(
  accessToken: string,
  overrides: Partial<{
    name: string;
    slug: string;
    location: string;
    startDate: string;
    endDate: string;
    maxCapacity: number;
    description: string;
  }> = {},
): Promise<TestFestival> {
  festivalCounter++;
  const timestamp = Date.now();
  const uniqueId = `${timestamp}-${festivalCounter}`;

  // Start date is 30 days from now, end date is 33 days from now
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 30);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 33);

  const festivalData = {
    name: overrides.name || `Test Festival ${uniqueId}`,
    slug: overrides.slug || `test-festival-${uniqueId}`,
    location: overrides.location || 'Test Location, France',
    startDate: overrides.startDate || startDate.toISOString(),
    endDate: overrides.endDate || endDate.toISOString(),
    maxCapacity: overrides.maxCapacity || 10000,
    description: overrides.description || `Test festival created for E2E testing`,
  };

  const response = await authenticatedRequest('post', '/api/festivals', accessToken, festivalData);

  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Failed to create festival: ${JSON.stringify(response.data)}`);
  }

  return {
    id: response.data.id,
    name: festivalData.name,
    slug: festivalData.slug,
    organizerId: response.data.organizerId,
    startDate: festivalData.startDate,
    endDate: festivalData.endDate,
    location: festivalData.location,
    maxCapacity: festivalData.maxCapacity,
    status: response.data.status || 'DRAFT',
  };
}

// ============================================================================
// Ticket Management
// ============================================================================

let ticketCategoryCounter = 0;

/**
 * Creates a test ticket category
 */
export async function createTestTicketCategory(
  accessToken: string,
  festivalId: string,
  overrides: Partial<{
    name: string;
    type: string;
    price: number;
    quota: number;
    maxPerUser: number;
    saleStartDate: string;
    saleEndDate: string;
  }> = {},
): Promise<TestTicketCategory> {
  ticketCategoryCounter++;
  const timestamp = Date.now();

  // Sale dates: starts now, ends in 60 days
  const saleStartDate = new Date();
  const saleEndDate = new Date();
  saleEndDate.setDate(saleEndDate.getDate() + 60);

  const categoryData = {
    festivalId,
    name: overrides.name || `Test Category ${ticketCategoryCounter}`,
    type: overrides.type || 'STANDARD',
    price: overrides.price ?? 99.99,
    quota: overrides.quota ?? 1000,
    maxPerUser: overrides.maxPerUser ?? 4,
    saleStartDate: overrides.saleStartDate || saleStartDate.toISOString(),
    saleEndDate: overrides.saleEndDate || saleEndDate.toISOString(),
  };

  const response = await authenticatedRequest(
    'post',
    `/api/festivals/${festivalId}/ticket-categories`,
    accessToken,
    categoryData,
  );

  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Failed to create ticket category: ${JSON.stringify(response.data)}`);
  }

  return {
    id: response.data.id,
    festivalId,
    name: categoryData.name,
    type: categoryData.type,
    price: categoryData.price,
    quota: categoryData.quota,
    soldCount: 0,
  };
}

/**
 * Purchases a ticket
 */
export async function purchaseTicket(
  accessToken: string,
  festivalId: string,
  categoryId: string,
  quantity: number = 1,
): Promise<TestTicket[]> {
  const response = await authenticatedRequest('post', '/api/tickets/buy', accessToken, {
    festivalId,
    categoryId,
    quantity,
  });

  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Failed to purchase ticket: ${JSON.stringify(response.data)}`);
  }

  // Response might be a single ticket or an array
  const tickets = Array.isArray(response.data) ? response.data : [response.data];

  return tickets.map((t: unknown) => ({
    id: (t as Record<string, unknown>).id as string,
    festivalId,
    categoryId,
    userId: (t as Record<string, unknown>).userId as string,
    qrCode: (t as Record<string, unknown>).qrCode as string,
    status: (t as Record<string, unknown>).status as string,
    purchasePrice: (t as Record<string, unknown>).purchasePrice as number,
  }));
}

/**
 * Validates a ticket QR code
 */
export async function validateTicket(
  accessToken: string,
  qrCode: string,
): Promise<{ valid: boolean; ticket?: unknown; error?: string }> {
  const response = await authenticatedRequest('post', '/api/tickets/validate', accessToken, {
    qrCode,
  });

  return {
    valid: response.status === 200,
    ticket: response.data.ticket,
    error: response.data.message,
  };
}

// ============================================================================
// Cashless Management
// ============================================================================

/**
 * Creates or gets a cashless account for a user
 */
export async function createCashlessAccount(
  accessToken: string,
): Promise<TestCashlessAccount> {
  const response = await authenticatedRequest('post', '/api/cashless/account', accessToken);

  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Failed to create cashless account: ${JSON.stringify(response.data)}`);
  }

  return {
    id: response.data.id,
    userId: response.data.userId,
    balance: parseFloat(response.data.balance) || 0,
    nfcTagId: response.data.nfcTagId,
    isActive: response.data.isActive ?? true,
  };
}

/**
 * Tops up a cashless account
 */
export async function topupCashlessAccount(
  accessToken: string,
  amount: number,
  festivalId: string,
): Promise<{ balance: number; transactionId: string }> {
  const response = await authenticatedRequest('post', '/api/cashless/topup', accessToken, {
    amount,
    festivalId,
  });

  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Failed to topup cashless account: ${JSON.stringify(response.data)}`);
  }

  return {
    balance: parseFloat(response.data.balance) || 0,
    transactionId: response.data.transactionId || response.data.id,
  };
}

/**
 * Makes a cashless payment
 */
export async function makeCashlessPayment(
  accessToken: string,
  amount: number,
  festivalId: string,
  description?: string,
): Promise<{ balance: number; transactionId: string }> {
  const response = await authenticatedRequest('post', '/api/cashless/pay', accessToken, {
    amount,
    festivalId,
    description,
  });

  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Failed to make cashless payment: ${JSON.stringify(response.data)}`);
  }

  return {
    balance: parseFloat(response.data.balance) || 0,
    transactionId: response.data.transactionId || response.data.id,
  };
}

/**
 * Gets the current cashless balance
 */
export async function getCashlessBalance(
  accessToken: string,
): Promise<number> {
  const response = await authenticatedRequest('get', '/api/cashless/balance', accessToken);

  if (response.status !== 200) {
    throw new Error(`Failed to get cashless balance: ${JSON.stringify(response.data)}`);
  }

  return parseFloat(response.data.balance) || 0;
}

// ============================================================================
// Database Cleanup (for tests that need it)
// ============================================================================

/**
 * Cleans up test data created during tests
 * Note: This requires proper API endpoints or direct database access
 */
export async function cleanupTestData(): Promise<void> {
  // In a real implementation, this would clean up:
  // - Test users (by email pattern)
  // - Test festivals (by slug pattern)
  // - Related tickets, payments, etc.

  console.log('Test data cleanup - implement based on your needs');
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Asserts that an object has the expected shape
 */
export function expectShape(obj: unknown, expectedKeys: string[]): void {
  expect(obj).toBeDefined();
  expect(typeof obj).toBe('object');

  for (const key of expectedKeys) {
    expect(obj).toHaveProperty(key);
  }
}

/**
 * Asserts that a response is a validation error
 */
export function expectValidationError(response: AxiosResponse): void {
  expect(response.status).toBe(400);
  expect(response.data).toHaveProperty('message');
}

/**
 * Asserts that a response is unauthorized
 */
export function expectUnauthorized(response: AxiosResponse): void {
  expect(response.status).toBe(401);
}

/**
 * Asserts that a response is forbidden (RBAC)
 */
export function expectForbidden(response: AxiosResponse): void {
  expect(response.status).toBe(403);
}

/**
 * Asserts that a response is not found
 */
export function expectNotFound(response: AxiosResponse): void {
  expect(response.status).toBe(404);
}

// ============================================================================
// Data Generation
// ============================================================================

/**
 * Generates a random string of given length
 */
export function randomString(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a random email
 */
export function randomEmail(): string {
  return `test-${randomString(8)}@e2e-test.festival`;
}

/**
 * Generates a random valid password
 */
export function randomPassword(): string {
  return `Test${randomString(8)}!123`;
}

/**
 * Waits for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
