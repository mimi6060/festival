import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    ignores: [
      'jest.config.ts',
      '*.config.js',
      '*.config.cjs',
    ],
  },
];
