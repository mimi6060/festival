import React, { memo, useMemo } from 'react';
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../../theme';

// Dynamic import for expo-image (web fallback to RN Image)
let ImageComponent: React.ComponentType<{
  source: { uri: string } | number;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder?: string | { blurhash: string };
  transition?: number;
  cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
  priority?: 'low' | 'normal' | 'high';
}>;

// Try to use expo-image for better performance
if (Platform.OS !== 'web') {
  try {
    const ExpoImage = require('expo-image').Image;
    ImageComponent = ExpoImage;
  } catch {
    // Fallback to React Native Image
    const { Image } = require('react-native');
    ImageComponent = Image as typeof ImageComponent;
  }
} else {
  // Web uses standard Image
  const { Image } = require('react-native');
  ImageComponent = Image as typeof ImageComponent;
}

interface OptimizedImageProps {
  uri: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder?: string;
  blurhash?: string;
  transition?: number;
  priority?: 'low' | 'normal' | 'high';
  cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
}

/**
 * OptimizedImage - A performance-optimized image component
 *
 * Features:
 * - Uses expo-image for native platforms (fast caching, blurhash placeholders)
 * - Falls back to React Native Image on web
 * - Memoized to prevent unnecessary re-renders
 * - Configurable cache policy and priority
 *
 * @example
 * <OptimizedImage
 *   uri="https://example.com/image.jpg"
 *   style={{ width: 100, height: 100 }}
 *   blurhash="LEHV6nWB2yk8pyo0adR*.7kCMdnj"
 *   priority="high"
 * />
 */
export const OptimizedImage = memo<OptimizedImageProps>(({
  uri,
  style,
  contentFit = 'cover',
  placeholder,
  blurhash,
  transition = 200,
  priority = 'normal',
  cachePolicy = 'memory-disk',
}) => {
  // Memoize source to prevent unnecessary re-renders
  const source = useMemo(() => ({ uri }), [uri]);

  // Memoize placeholder config
  const placeholderConfig = useMemo(() => {
    if (blurhash) {
      return { blurhash };
    }
    return placeholder;
  }, [blurhash, placeholder]);

  return (
    <ImageComponent
      source={source}
      style={style}
      contentFit={contentFit}
      placeholder={placeholderConfig}
      transition={transition}
      priority={priority}
      cachePolicy={cachePolicy}
    />
  );
});

// Placeholder component for when no image is available
export const ImagePlaceholder = memo<{
  style?: StyleProp<ViewStyle>;
  icon?: string;
}>(({ style, icon = '🖼️' }) => {
  const { Text } = require('react-native');

  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.placeholderIcon}>{icon}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
  },
});

export default OptimizedImage;
