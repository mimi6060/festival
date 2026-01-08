/**
 * Jest Configuration for Web App
 *
 * Configures Jest for React/Next.js component testing with:
 * - jsdom environment for DOM testing
 * - Testing Library integration
 * - Path aliases for shared libs
 * - Coverage thresholds
 */

import type { Config } from 'jest';

const config: Config = {
  displayName: 'web',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.tsx'],

  // Transform TypeScript and TSX files using ts-jest
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        useESM: false,
      },
    ],
  },

  // Module resolution
  moduleNameMapper: {
    // Handle path aliases
    '^@/(.*)$': '<rootDir>/$1',
    '^@festival/shared/types$': '<rootDir>/../../libs/shared/types/src/index.ts',
    '^@festival/shared/utils$': '<rootDir>/../../libs/shared/utils/src/index.ts',
    '^@festival/shared/(.*)$': '<rootDir>/../../libs/shared/$1/src/index.ts',

    // Handle CSS imports
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    '^.+\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',

    // Handle image imports
    '^.+\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },

  // Transform ignore patterns - don't transform node_modules except specific packages
  transformIgnorePatterns: ['/node_modules/(?!(zustand|immer)/)'],

  // Test file patterns
  testMatch: ['<rootDir>/**/*.test.{ts,tsx}', '<rootDir>/**/*.spec.{ts,tsx}'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Coverage configuration
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'stores/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/index.ts',
    '!**/__mocks__/**',
  ],

  // Coverage thresholds (lowered for initial setup)
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};

export default config;
