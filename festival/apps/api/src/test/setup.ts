/**
 * Jest Test Setup
 *
 * This file runs before each test suite and sets up:
 * - Global mocks
 * - Test environment configuration
 * - Custom matchers
 * - Cleanup handlers
 */

import { jest } from '@jest/globals';

// ============================================================================
// Environment Setup
// ============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
process.env.JWT_EXPIRATION = '15m';
process.env.JWT_REFRESH_EXPIRATION = '7d';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_webhook_secret';

// ============================================================================
// Global Mocks
// ============================================================================

// Mock console methods to reduce noise in test output
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console.log in tests unless DEBUG_TESTS is set
  if (!process.env.DEBUG_TESTS) {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  }

  // Keep error and warn for debugging
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    // Only show errors if DEBUG_TESTS is set
    if (process.env.DEBUG_TESTS) {
      originalConsole.error(...args);
    }
  });

  jest.spyOn(console, 'warn').mockImplementation((...args) => {
    if (process.env.DEBUG_TESTS) {
      originalConsole.warn(...args);
    }
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ============================================================================
// Test Lifecycle Hooks
// ============================================================================

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// Custom Matchers
// ============================================================================

expect.extend({
  /**
   * Check if a value is a valid UUID
   */
  toBeUUID(received: unknown) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);

    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
      pass,
    };
  },

  /**
   * Check if a value is a valid ISO date string
   */
  toBeISODateString(received: unknown) {
    const pass =
      typeof received === 'string' && !isNaN(Date.parse(received)) && received.includes('T');

    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid ISO date string`
          : `expected ${received} to be a valid ISO date string`,
      pass,
    };
  },

  /**
   * Check if a value is a valid JWT token
   */
  toBeJWT(received: unknown) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = typeof received === 'string' && jwtRegex.test(received);

    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid JWT token`
          : `expected ${received} to be a valid JWT token`,
      pass,
    };
  },

  /**
   * Check if a value is a positive number
   */
  toBePositiveNumber(received: unknown) {
    const pass = typeof received === 'number' && received > 0 && isFinite(received);

    return {
      message: () =>
        pass
          ? `expected ${received} not to be a positive number`
          : `expected ${received} to be a positive number`,
      pass,
    };
  },

  /**
   * Check if an array is sorted by a specific field
   */
  toBeSortedBy(received: unknown[], field: string, order: 'asc' | 'desc' = 'asc') {
    if (!Array.isArray(received)) {
      return {
        message: () => `expected ${received} to be an array`,
        pass: false,
      };
    }

    let isSorted = true;
    for (let i = 1; i < received.length; i++) {
      const prev = (received[i - 1] as Record<string, unknown>)[field];
      const curr = (received[i] as Record<string, unknown>)[field];

      if (order === 'asc' && prev > curr) {
        isSorted = false;
        break;
      }
      if (order === 'desc' && prev < curr) {
        isSorted = false;
        break;
      }
    }

    return {
      message: () =>
        isSorted
          ? `expected array not to be sorted by ${field} in ${order} order`
          : `expected array to be sorted by ${field} in ${order} order`,
      pass: isSorted,
    };
  },
});

// ============================================================================
// Type Declarations for Custom Matchers
// ============================================================================

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeUUID(): R;
      toBeISODateString(): R;
      toBeJWT(): R;
      toBePositiveNumber(): R;
      toBeSortedBy(field: string, order?: 'asc' | 'desc'): R;
    }
  }
}

// ============================================================================
// Error Handling
// ============================================================================

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason: Error) => {
  console.error('Unhandled Promise Rejection in test:', reason);
  throw reason;
});

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Wait for a specified number of milliseconds
 */
export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a mock date for consistent test results
 */
export const mockDate = (dateString: string): void => {
  const mockDateInstance = new Date(dateString);
  jest.spyOn(global, 'Date').mockImplementation(() => mockDateInstance as unknown as Date);
};

/**
 * Reset the date mock
 */
export const resetDateMock = (): void => {
  jest.spyOn(global, 'Date').mockRestore();
};

// Export for use in tests
export { jest };
