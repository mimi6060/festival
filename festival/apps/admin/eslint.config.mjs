import baseConfig from '../../eslint.config.mjs';

export default [
  {
    ignores: [
      '.next/**',
      'out/**',
      'node_modules/**',
      'tailwind.config.js',
      'postcss.config.js',
      'next.config.js',
      'next-env.d.ts',
      '*.config.js',
    ],
  },
  ...baseConfig,
];
