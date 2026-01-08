export default {
  displayName: 'mobile',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
          target: 'es2022',
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.(spec|test).[jt]s?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__mocks__/async-storage.ts',
    '^@react-native-community/netinfo$': '<rootDir>/src/__mocks__/netinfo.ts',
    '^react-native-safe-area-context$': '<rootDir>/src/__mocks__/safe-area-context.ts',
    '^react-native-qrcode-svg$': '<rootDir>/src/__mocks__/qrcode-svg.ts',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main*.tsx',
    '!src/__mocks__/**',
  ],
  coverageDirectory: '../../coverage/apps/mobile',
  clearMocks: true,
  resetMocks: true,
};
