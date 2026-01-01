/**
 * E2E Test Helpers
 * Utilities for creating test users, obtaining tokens, and managing test data
 */

import axios, { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Types
// ============================================

export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticatedUser extends TestUser {
  tokens: TokenPair;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
  STAFF = 'STAFF',
  CASHIER = 'CASHIER',
  SECURITY = 'SECURITY',
  USER = 'USER',
}

export enum FestivalStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface TestFestival {
  id: string;
  name: string;
  slug: string;
  description?: string;
  location: string;
  startDate: string;
  endDate: string;
  maxCapacity: number;
  status: FestivalStatus;
}

export interface TestTicketCategory {
  id: string;
  festivalId: string;
  name: string;
  type: string;
  price: number;
  quota: number;
}

// ============================================
// API Client
// ============================================

const getBaseUrl = (): string => {
  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ?? '3000';
  const apiPrefix = process.env.API_PREFIX ?? 'api';
  return `http://${host}:${port}/${apiPrefix}`;
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  validateStatus: () => true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ============================================
// User Helpers
// ============================================

/**
 * Generates a unique test email address
 */
export function generateTestEmail(): string {
  return `test-${uuidv4().substring(0, 8)}@festival-test.com`;
}

/**
 * Generates test user data
 */
export function generateUserData(overrides: Partial<TestUser> = {}): Omit<TestUser, 'id'> {
  const uniqueId = uuidv4().substring(0, 8);
  return {
    email: `test-${uniqueId}@festival-test.com`,
    firstName: overrides.firstName || `Test${uniqueId}`,
    lastName: overrides.lastName || 'User',
    password: overrides.password || 'TestPassword123!',
    role: overrides.role || UserRole.USER,
    ...overrides,
  };
}

/**
 * Registers a new test user
 */
export async function registerUser(
  userData?: Partial<Omit<TestUser, 'id'>>
): Promise<{ user: TestUser; response: AxiosResponse }> {
  const data = generateUserData(userData);

  const response = await api.post('/auth/register', {
    email: data.email,
    password: data.password,
    firstName: data.firstName,
    lastName: data.lastName,
  });

  if (response.status !== 201) {
    throw new Error(`Failed to register user: ${JSON.stringify(response.data)}`);
  }

  return {
    user: {
      id: response.data.data?.user?.id || response.data.user?.id,
      ...data,
    },
    response,
  };
}

/**
 * Logs in a user and returns tokens
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ tokens: TokenPair; response: AxiosResponse }> {
  const response = await api.post('/auth/login', { email, password });

  if (response.status !== 200) {
    throw new Error(`Failed to login: ${JSON.stringify(response.data)}`);
  }

  const data = response.data.data || response.data;
  return {
    tokens: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    },
    response,
  };
}

/**
 * Creates and authenticates a test user
 */
export async function createAuthenticatedUser(
  userData?: Partial<Omit<TestUser, 'id'>>
): Promise<AuthenticatedUser> {
  const { user } = await registerUser(userData);
  const { tokens } = await loginUser(user.email, user.password);

  return {
    ...user,
    tokens,
  };
}

/**
 * Creates an authenticated user with a specific role
 * Note: In a real scenario, you'd need admin access to set roles
 */
export async function createUserWithRole(
  role: UserRole,
  userData?: Partial<Omit<TestUser, 'id' | 'role'>>
): Promise<AuthenticatedUser> {
  // For testing purposes, we register and assume the role
  // In production, role assignment would require admin intervention
  return createAuthenticatedUser({ ...userData, role });
}

/**
 * Gets authenticated axios headers
 */
export function getAuthHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

/**
 * Makes an authenticated API request
 */
export async function authenticatedRequest(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  accessToken: string,
  data?: unknown
): Promise<AxiosResponse> {
  const config = {
    headers: getAuthHeaders(accessToken),
  };

  switch (method) {
    case 'get':
      return api.get(url, config);
    case 'post':
      return api.post(url, data, config);
    case 'put':
      return api.put(url, data, config);
    case 'patch':
      return api.patch(url, data, config);
    case 'delete':
      return api.delete(url, config);
  }
}

// ============================================
// Festival Helpers
// ============================================

/**
 * Generates test festival data
 */
export function generateFestivalData(
  overrides: Partial<TestFestival> = {}
): Omit<TestFestival, 'id' | 'status'> {
  const uniqueId = uuidv4().substring(0, 8);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 30); // 30 days from now

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 3); // 3 day festival

  return {
    name: overrides.name || `Test Festival ${uniqueId}`,
    slug: overrides.slug || `test-festival-${uniqueId}`,
    description: overrides.description || 'A test festival for E2E testing',
    location: overrides.location || 'Test City, Test Country',
    startDate: overrides.startDate || startDate.toISOString(),
    endDate: overrides.endDate || endDate.toISOString(),
    maxCapacity: overrides.maxCapacity || 1000,
  };
}

/**
 * Creates a test festival (requires organizer/admin authentication)
 */
export async function createFestival(
  accessToken: string,
  festivalData?: Partial<Omit<TestFestival, 'id' | 'status'>>
): Promise<{ festival: TestFestival; response: AxiosResponse }> {
  const data = generateFestivalData(festivalData);

  const response = await authenticatedRequest('post', '/festivals', accessToken, data);

  if (response.status !== 201) {
    throw new Error(`Failed to create festival: ${JSON.stringify(response.data)}`);
  }

  const festivalResponse = response.data.data || response.data;
  return {
    festival: {
      id: festivalResponse.id,
      ...data,
      status: festivalResponse.status || FestivalStatus.DRAFT,
    },
    response,
  };
}

/**
 * Publishes a festival
 */
export async function publishFestival(
  accessToken: string,
  festivalId: string
): Promise<AxiosResponse> {
  return authenticatedRequest('post', `/festivals/${festivalId}/publish`, accessToken);
}

// ============================================
// Ticket Category Helpers
// ============================================

/**
 * Generates test ticket category data
 */
export function generateTicketCategoryData(
  festivalId: string,
  overrides: Partial<TestTicketCategory> = {}
): Omit<TestTicketCategory, 'id'> {
  const uniqueId = uuidv4().substring(0, 8);
  const saleStartDate = new Date();
  const saleEndDate = new Date();
  saleEndDate.setDate(saleEndDate.getDate() + 25);

  return {
    festivalId,
    name: overrides.name || `Standard Ticket ${uniqueId}`,
    type: overrides.type || 'STANDARD',
    price: overrides.price || 50.0,
    quota: overrides.quota || 100,
    ...overrides,
  };
}

/**
 * Creates a ticket category
 */
export async function createTicketCategory(
  accessToken: string,
  festivalId: string,
  categoryData?: Partial<Omit<TestTicketCategory, 'id' | 'festivalId'>>
): Promise<{ category: TestTicketCategory; response: AxiosResponse }> {
  const data = generateTicketCategoryData(festivalId, categoryData);

  const saleStartDate = new Date();
  const saleEndDate = new Date();
  saleEndDate.setDate(saleEndDate.getDate() + 25);

  const response = await authenticatedRequest(
    'post',
    `/festivals/${festivalId}/ticket-categories`,
    accessToken,
    {
      ...data,
      saleStartDate: saleStartDate.toISOString(),
      saleEndDate: saleEndDate.toISOString(),
    }
  );

  if (response.status !== 201) {
    throw new Error(`Failed to create ticket category: ${JSON.stringify(response.data)}`);
  }

  const categoryResponse = response.data.data || response.data;
  return {
    category: {
      id: categoryResponse.id,
      ...data,
    },
    response,
  };
}

// ============================================
// Cleanup Helpers
// ============================================

/**
 * Storage for created test resources to clean up later
 */
const createdResources: {
  users: string[];
  festivals: string[];
  tickets: string[];
} = {
  users: [],
  festivals: [],
  tickets: [],
};

/**
 * Tracks a resource for cleanup
 */
export function trackResource(type: 'users' | 'festivals' | 'tickets', id: string): void {
  createdResources[type].push(id);
}

/**
 * Cleans up all tracked resources
 * Note: This requires admin access in a real scenario
 */
export async function cleanupResources(adminToken?: string): Promise<void> {
  // In a real implementation, you would delete created resources
  // For now, we rely on database reset between test runs
  createdResources.users = [];
  createdResources.festivals = [];
  createdResources.tickets = [];
}

// ============================================
// Assertion Helpers
// ============================================

/**
 * Asserts that a response has a success structure
 */
export function expectSuccess(response: AxiosResponse, expectedStatus = 200): void {
  expect(response.status).toBe(expectedStatus);
  // Handle both wrapped and unwrapped response formats
  if (response.data.success !== undefined) {
    expect(response.data.success).toBe(true);
  }
}

/**
 * Asserts that a response has an error structure
 */
export function expectError(
  response: AxiosResponse,
  expectedStatus: number,
  expectedMessage?: string | RegExp
): void {
  expect(response.status).toBe(expectedStatus);

  if (expectedMessage) {
    const message = response.data.message || response.data.error;
    if (expectedMessage instanceof RegExp) {
      expect(message).toMatch(expectedMessage);
    } else {
      expect(message).toContain(expectedMessage);
    }
  }
}

/**
 * Wait for a specified amount of time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
