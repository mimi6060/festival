/**
 * Test Setup - Configures the test environment for each test file
 */

import axios from 'axios';

// Increase timeout for E2E tests
jest.setTimeout(30000);

module.exports = async function () {
  // Configure axios defaults
  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ?? '3000';
  const apiPrefix = process.env.API_PREFIX ?? 'api';

  axios.defaults.baseURL = `http://${host}:${port}/${apiPrefix}`;
  axios.defaults.validateStatus = () => true; // Don't throw on any status code
  axios.defaults.timeout = 10000;

  // Set default headers
  axios.defaults.headers.common['Content-Type'] = 'application/json';
  axios.defaults.headers.common['Accept'] = 'application/json';
};
