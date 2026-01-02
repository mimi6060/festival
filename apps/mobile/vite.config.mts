import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';
import path from 'path';

const extensions = [
  '.mjs',
  '.web.tsx',
  '.tsx',
  '.web.ts',
  '.ts',
  '.web.jsx',
  '.jsx',
  '.web.js',
  '.js',
  '.css',
  '.json',
];

const rollupPlugin = (matchers: RegExp[]) => ({
  name: 'js-in-jsx',
  load(id: string) {
    if (matchers.some((matcher) => matcher.test(id)) && id.endsWith('.js')) {
      const file = readFileSync(id, { encoding: 'utf-8' });
      return esbuild.transformSync(file, { loader: 'jsx', jsx: 'automatic' });
    }
  },
});

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/mobile',
  define: {
    global: 'window',
    __DEV__: JSON.stringify(true),
  },
  resolve: {
    extensions,
    alias: {
      'react-native': 'react-native-web',
      'react-native-svg': 'react-native-svg-web',
      '@react-native/assets-registry/registry':
        'react-native-web/dist/modules/AssetRegistry/index',
      '@react-native-community/netinfo': path.resolve(import.meta.dirname, 'src/mocks/netinfo.web.ts'),
      'react-native-push-notification': path.resolve(import.meta.dirname, 'src/mocks/push-notification.web.ts'),
      // Force single React version from root
      'react': path.resolve(import.meta.dirname, '../../node_modules/react'),
      'react-dom': path.resolve(import.meta.dirname, '../../node_modules/react-dom'),
    },
  },
  build: {
    reportCompressedSize: true,
    commonjsOptions: { transformMixedEsModules: true },
    outDir: '../../dist/apps/mobile/web',
    rollupOptions: {
      plugins: [rollupPlugin([/react-native-vector-icons/])],
    },
  },
  server: {
    port: 4200,
    host: 'localhost',
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: extensions,
      jsx: 'automatic',
      loader: { '.js': 'jsx' },
    },
  },
  plugins: [react(), nxViteTsPaths()],
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ nxViteTsPaths() ],
  // },
});
