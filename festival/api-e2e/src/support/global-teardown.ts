/**
 * Global E2E Test Teardown
 * Cleans up resources after all tests have completed
 */

import { killPort } from '@nx/node/utils';

/* eslint-disable */
declare var __TEARDOWN_MESSAGE__: string;

module.exports = async function () {
  console.log(globalThis.__TEARDOWN_MESSAGE__);

  try {
    // Kill the API server if it's running
    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    await killPort(port);
    console.log(`Port ${port} has been released.`);
  } catch (error) {
    // Port might already be free
    console.log('Cleanup completed.');
  }

  console.log('E2E Test Environment teardown complete.\n');
};
