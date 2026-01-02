import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    ignores: [
      'metro.config.js',
      'babel.config.js',
      '*.config.js',
      '*.config.cjs',
      '.expo/',
      'node_modules/',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Disable rules that require type information for non-TS files
    },
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
