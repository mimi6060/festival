/**
 * Test Setup - Runs before each test file
 *
 * Configures axios defaults and sets up test utilities.
 */

import axios, { AxiosError } from 'axios';

// Configure axios defaults
const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ?? '3333';
axios.defaults.baseURL = `http://${host}:${port}`;
axios.defaults.timeout = 10000;
axios.defaults.validateStatus = () => true; // Don't throw on non-2xx

// Add request/response logging in debug mode
if (process.env.DEBUG) {
  axios.interceptors.request.use((config) => {
    console.log(`[Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  });

  axios.interceptors.response.use((response) => {
    console.log(`[Response] ${response.status} ${response.config.url}`);
    return response;
  });
}

// Extend Jest matchers for better API testing
expect.extend({
  toBeSuccessful(received) {
    const pass = received.status >= 200 && received.status < 300;
    if (pass) {
      return {
        message: () => `expected status ${received.status} not to be successful (2xx)`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected status ${received.status} to be successful (2xx), got: ${JSON.stringify(received.data)}`,
        pass: false,
      };
    }
  },

  toHaveStatus(received, expected: number) {
    const pass = received.status === expected;
    if (pass) {
      return {
        message: () => `expected status not to be ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected status ${expected}, got ${received.status}: ${JSON.stringify(received.data)}`,
        pass: false,
      };
    }
  },
});

// Type declarations for custom matchers
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeSuccessful(): R;
      toHaveStatus(status: number): R;
    }
  }
}

// Global test timeout
jest.setTimeout(30000);

// Console formatting for test output
beforeAll(() => {
  console.log('\n');
});

afterAll(() => {
  console.log('\n');
});
