/**
 * Global Setup for E2E Tests
 *
 * This file runs once before all test suites.
 * It sets up the test database and starts the API server.
 */

import { execSync, spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

// Store server process for teardown
declare global {
  var __API_SERVER__: ChildProcess | undefined;
  var __TEARDOWN_MESSAGE__: string;
}

const waitForServer = async (url: string, maxRetries = 30, delay = 1000): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return false;
};

module.exports = async function globalSetup() {
  console.log('\n========================================');
  console.log('  Setting up E2E Test Environment');
  console.log('========================================\n');

  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3333;
  const baseUrl = `http://${host}:${port}`;

  // Set environment variables for tests
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/festival_test';
  process.env.JWT_SECRET = 'test-jwt-secret-e2e-testing-only';
  process.env.JWT_EXPIRATION = '1h';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-e2e';
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy';

  // Check if server is already running (external server mode)
  const serverAlreadyRunning = await waitForServer(`${baseUrl}/api`, 2, 500);

  if (serverAlreadyRunning) {
    console.log(`API server already running at ${baseUrl}`);
    globalThis.__TEARDOWN_MESSAGE__ = '\nUsing external server - no cleanup needed.\n';
    return;
  }

  console.log('Starting API server for tests...');

  // Run Prisma migrations for test database
  const projectRoot = path.resolve(__dirname, '../../../..');

  try {
    console.log('Running Prisma migrations...');
    execSync('npx prisma migrate deploy', {
      cwd: projectRoot,
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
      stdio: 'pipe',
    });
    console.log('Prisma migrations completed.');
  } catch (error) {
    console.warn('Prisma migrations may have failed (database might not exist yet):', error);
  }

  // Reset test database if prisma is available
  try {
    console.log('Resetting test database...');
    execSync('npx prisma db push --force-reset --accept-data-loss', {
      cwd: projectRoot,
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
      stdio: 'pipe',
    });
    console.log('Test database reset completed.');
  } catch (error) {
    console.warn('Database reset skipped:', error);
  }

  // Start the API server
  const serverProcess = spawn('npx', ['nx', 'serve', 'api'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: true,
  });

  globalThis.__API_SERVER__ = serverProcess;

  serverProcess.stdout?.on('data', (data) => {
    if (process.env.DEBUG) {
      console.log(`[API]: ${data.toString()}`);
    }
  });

  serverProcess.stderr?.on('data', (data) => {
    if (process.env.DEBUG) {
      console.error(`[API Error]: ${data.toString()}`);
    }
  });

  // Wait for server to be ready
  console.log(`Waiting for API server at ${baseUrl}...`);
  const serverReady = await waitForServer(`${baseUrl}/api`, 60, 1000);

  if (!serverReady) {
    serverProcess.kill();
    throw new Error('API server failed to start within timeout');
  }

  console.log('API server is ready!');
  console.log('\n========================================');
  console.log('  E2E Test Environment Ready');
  console.log('========================================\n');

  globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down E2E test environment...\n';
};
