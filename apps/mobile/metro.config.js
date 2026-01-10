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

// Support for SVG transformer
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

// Asset extensions
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
