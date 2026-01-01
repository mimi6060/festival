import type { Config } from 'jest';

const config: Config = {
  displayName: 'api',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.spec.ts',
    '**/__tests__/**/*.test.ts',
  ],
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  coverageDirectory: '../coverage/api',
  collectCoverageFrom: [
    'src/**/*.service.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/index.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  moduleNameMapper: {
    '^@festival/types$': '<rootDir>/../libs/shared/types/src/index.ts',
    '^@festival/utils$': '<rootDir>/../libs/shared/utils/src/index.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
