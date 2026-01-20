module.exports = {
  name: 'Festival',
  slug: 'festival-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  splash: {
    resizeMode: 'contain',
    backgroundColor: '#6366f1',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.festival.mobile',
    // Enable Hermes for iOS (faster JS execution)
    jsEngine: 'hermes',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#6366f1',
    },
    package: 'com.festival.mobile',
    // Enable Hermes for Android (faster JS execution)
    jsEngine: 'hermes',
  },
  web: {
    bundler: 'metro',
  },
  // Performance optimizations
  experiments: {
    // Enable New Architecture (Fabric + TurboModules) for better performance
    reactCompiler: true,
  },
  // Plugins for performance (reanimated disabled temporarily)
  plugins: [],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333',
  },
};
