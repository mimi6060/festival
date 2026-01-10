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
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#6366f1',
    },
    package: 'com.festival.mobile',
  },
  web: {
    bundler: 'metro',
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333',
  },
};
