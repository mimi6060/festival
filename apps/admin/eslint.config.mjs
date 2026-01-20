import baseConfig from '../../eslint.config.mjs';

export default [
  // Global ignores for this project
  {
    ignores: [
      'next-env.d.ts',
      '.next/**',
      '**/*.d.ts',
      '**/*.stories.tsx',
      '**/*.stories.ts',
    ],
  },
  ...baseConfig,
];
