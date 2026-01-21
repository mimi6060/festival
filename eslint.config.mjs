// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/dist/**',
      '**/out-tsc',
      '**/vite.config.*.timestamp*',
      '**/next-env.d.ts',
      '**/*.d.ts',
      '.storybook/**',
      'stories/**',
      '**/webpack.config.js',
      '**/__mocks__/**',
      '**/.next/**',
      '**/.next',
      '**/eslint.config.mjs',
      'libs/**/eslint.config.mjs',
      // Ignore Next.js generated files completely
      'apps/web/.next/**',
      'apps/admin/.next/**',
      'dist/apps/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            // Apps can import from any shared library
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            // types is the base - cannot import from other libs
            {
              sourceTag: 'module:types',
              onlyDependOnLibsWithTags: [],
            },
            // utils can only import from types
            {
              sourceTag: 'module:utils',
              onlyDependOnLibsWithTags: ['module:types'],
            },
            // validation can import from types and utils
            {
              sourceTag: 'module:validation',
              onlyDependOnLibsWithTags: ['module:types', 'module:utils'],
            },
            // constants can import from types
            {
              sourceTag: 'module:constants',
              onlyDependOnLibsWithTags: ['module:types'],
            },
            // i18n can import from types
            {
              sourceTag: 'module:i18n',
              onlyDependOnLibsWithTags: ['module:types'],
            },
            // hooks can import from types, utils, and api-client
            {
              sourceTag: 'module:hooks',
              onlyDependOnLibsWithTags: ['module:types', 'module:utils', 'module:api-client'],
            },
            // api-client can import from types
            {
              sourceTag: 'module:api-client',
              onlyDependOnLibsWithTags: ['module:types'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {
      // Relax non-null assertion for better DX (use with care)
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Allow explicit any with warning instead of error
      '@typescript-eslint/no-explicit-any': 'warn',
      // Prefer optional chain disabled (requires type information)
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      // Allow console in development (warn only)
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
      // Allow unused vars when prefixed with _
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      // Empty functions are sometimes needed for interface implementations
      '@typescript-eslint/no-empty-function': 'warn',
      // Triple slash references in .d.ts files are normal
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  // Test files: more permissive rules
  {
    files: [
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.e2e-spec.ts',
      '**/e2e/**/*.ts',
    ],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  ...storybook.configs["flat/recommended"],
  // E2E tests: very permissive rules (MUST be after all other configs to override)
  {
    files: ['**/apps/api-e2e/**/*.ts', 'apps/api-e2e/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
