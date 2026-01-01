/**
 * Global E2E Test Setup
 * Initializes the test database and waits for the API to be ready
 */

import { waitForPortOpen } from '@nx/node/utils';
import { execSync } from 'child_process';
import * as path from 'path';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

module.exports = async function () {
  console.log('\n========================================');
  console.log('Setting up E2E Test Environment...');
  console.log('========================================\n');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://festival:festival_dev_password@localhost:5432/festival_test';

  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  try {
    // Reset and seed the test database
    console.log('Resetting test database...');
    const rootDir = path.resolve(__dirname, '../../../../');

    // Run prisma migrate reset with force flag for test database
    execSync('npx prisma migrate reset --force --skip-seed', {
      cwd: rootDir,
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
      stdio: 'inherit',
    });

    console.log('Test database reset successfully.');

    // Wait for the API to be ready
    console.log(`Waiting for API on ${host}:${port}...`);
    await waitForPortOpen(port, { host, timeout: 60000 });
    console.log('API is ready!');

  } catch (error) {
    console.error('Failed to setup test environment:', error);
    // Continue anyway - the database might already be ready
  }

  // Store teardown message for later
  globalThis.__TEARDOWN_MESSAGE__ = '\n========================================\nTearing down E2E Test Environment...\n========================================\n';
};
