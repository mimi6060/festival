/**
 * Jest Preset Configuration
 *
 * Base configuration shared across all Jest projects in the monorepo.
 * Includes coverage thresholds and common settings.
 */
const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,

  // Common test settings
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Coverage settings for all projects
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/__tests__/',
    '/__mocks__/',
    '\\.d\\.ts$',
    '\\.mock\\.ts$',
    '\\.fixture\\.ts$',
  ],

  // Error on deprecated APIs
  errorOnDeprecated: true,

  // Fail on open handles
  detectOpenHandles: true,

  // Common module name mapper
  moduleNameMapper: {
    '^@festival/shared/types$': '<rootDir>/../../libs/shared/types/src/index.ts',
    '^@festival/shared/utils$': '<rootDir>/../../libs/shared/utils/src/index.ts',
    '^@festival/shared/(.*)$': '<rootDir>/../../libs/shared/$1/src/index.ts',
  },

  // Global threshold defaults (can be overridden by project configs)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
