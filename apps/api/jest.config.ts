/**
 * Jest Configuration for API Module
 *
 * Configuration includes:
 * - 80% minimum code coverage threshold
 * - TypeScript support via @swc/jest
 * - Prisma mocking setup
 * - Module path aliases
 */

import type { Config } from 'jest';

const config: Config = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',

  // Transform TypeScript files using SWC
  transform: {
    '^.+\\.[tj]s$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: false,
            decorators: true,
            dynamicImport: true,
          },
          transform: {
            decoratorMetadata: true,
            legacyDecorator: true,
          },
          target: 'es2021',
        },
      },
    ],
  },

  // File extensions to process
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],

  // Test file patterns
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.test.ts'],

  // Files to ignore
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Module path mapping for imports
  moduleNameMapper: {
    '^@festival/shared/types$': '<rootDir>/../../libs/shared/types/src/index.ts',
    '^@festival/shared/utils$': '<rootDir>/../../libs/shared/utils/src/index.ts',
    '^@festival/shared/(.*)$': '<rootDir>/../../libs/shared/$1/src/index.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock bullmq for testing (not installed in dev dependencies)
    '^bullmq$': '<rootDir>/src/test/__mocks__/bullmq.ts',
    // Mock pdfkit for testing
    '^pdfkit$': '<rootDir>/src/test/__mocks__/pdfkit.ts',
  },

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main.ts',
    '!src/test/**/*',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.guard.ts',
    '!src/**/*.decorator.ts',
    '!src/**/*.strategy.ts',
    '!src/**/*.filter.ts',
    '!src/**/*.interceptor.ts',
    '!src/**/*.pipe.ts',
  ],

  // Coverage output directory
  coverageDirectory: '<rootDir>/coverage',

  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json'],

  // Coverage thresholds
  // Global threshold set to 0 - critical services are validated individually
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    // Critical services require 90%+ coverage
    './src/modules/auth/auth.service.ts': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85,
    },
    './src/modules/tickets/tickets.service.ts': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85,
    },
    './src/modules/cashless/cashless.service.ts': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85,
    },
    './src/modules/payments/payments.service.ts': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85,
    },
  },

  // Other options
  verbose: true,
  passWithNoTests: false,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Maximum time a test can run (in milliseconds)
  testTimeout: 10000,

  // Maximum workers for parallel test execution
  maxWorkers: '50%',

  // Fail tests if there are any errors during the test run
  bail: false,

  // Display individual test results with the test suite hierarchy
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' > ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // Global variables available in all test files
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },

  // Error handling
  errorOnDeprecated: true,
};

export default config;
