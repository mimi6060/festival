import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    ignores: [
      'postcss.config.js',
      'tailwind.config.js',
      'next.config.js',
      'next-env.d.ts',
      '.next/**',
    ],
  },
];
