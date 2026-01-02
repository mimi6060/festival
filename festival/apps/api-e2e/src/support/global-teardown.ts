/**
 * Global Teardown for E2E Tests
 *
 * This file runs once after all test suites complete.
 * It cleans up the test environment and stops the API server.
 */

declare global {
  var __API_SERVER__: import('child_process').ChildProcess | undefined;
  var __TEARDOWN_MESSAGE__: string;
}

module.exports = async function globalTeardown() {
  console.log(globalThis.__TEARDOWN_MESSAGE__ || '\nTearing down...\n');

  // Kill the API server if we started it
  if (globalThis.__API_SERVER__) {
    console.log('Stopping API server...');

    try {
      // Kill process group (negative PID kills the process group)
      if (globalThis.__API_SERVER__.pid) {
        process.kill(-globalThis.__API_SERVER__.pid, 'SIGTERM');
      }
    } catch (error) {
      // Process might already be dead
      console.log('Server process may have already terminated.');
    }

    // Give it a moment to clean up
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('API server stopped.');
  }

  console.log('\n========================================');
  console.log('  E2E Test Environment Cleaned Up');
  console.log('========================================\n');
};
