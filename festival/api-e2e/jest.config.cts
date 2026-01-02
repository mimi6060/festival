/**
 * Jest Configuration for API E2E Tests
 */

export default {
  displayName: 'api-e2e',
  preset: '../jest.preset.js',
  globalSetup: '<rootDir>/src/support/global-setup.ts',
  globalTeardown: '<rootDir>/src/support/global-teardown.ts',
  setupFiles: ['<rootDir>/src/support/test-setup.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/api-e2e',
  testTimeout: 30000,
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Test execution order
  testSequencer: '@jest/test-sequencer',
  // Verbose output for better debugging
  verbose: true,
  // Fail fast on first error in CI
  bail: process.env.CI ? 1 : 0,
  // Max workers for parallel execution
  maxWorkers: process.env.CI ? 2 : '50%',
  // Clear mocks between tests
  clearMocks: true,
  // Collect coverage from e2e tests
  collectCoverageFrom: [
    '../api/src/**/*.ts',
    '!../api/src/**/*.spec.ts',
    '!../api/src/**/*.d.ts',
  ],
};
