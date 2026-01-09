// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/vite.config.*.timestamp*', '**/next-env.d.ts', '.storybook/**', 'stories/**'],
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
    rules: {},
  },
  ...storybook.configs["flat/recommended"]
];
