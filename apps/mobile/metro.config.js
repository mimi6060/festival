const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the default Expo config
const config = getDefaultConfig(__dirname);

// Project root is the monorepo root
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Support for monorepo - watch the workspace root
config.watchFolders = [workspaceRoot];

// Add workspace packages to resolver
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Web-specific module aliases
const webAliases = {
  'react-native-push-notification': path.resolve(projectRoot, 'src/mocks/push-notification.web.ts'),
  '@react-native-community/netinfo': path.resolve(projectRoot, 'src/mocks/netinfo.web.ts'),
};

// Remove .mjs from source extensions to avoid ESM modules with import.meta
// This forces Metro to use CommonJS versions of packages like zustand
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== 'mjs');

// Custom resolver for web platform
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Use web mocks when building for web
  if (platform === 'web' && webAliases[moduleName]) {
    return {
      filePath: webAliases[moduleName],
      type: 'sourceFile',
    };
  }

  // Default resolution
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Support for SVG transformer
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

// Asset extensions
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
