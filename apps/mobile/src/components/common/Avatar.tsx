import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { OptimizedImage } from './OptimizedImage';
import { colors, typography } from '../../theme';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  style?: StyleProp<ViewStyle>;
  showRing?: boolean;
}

// Standardized avatar sizes across all apps
// sm: 32px, md: 40px, lg: 48px, xl: 64px, 2xl: 100px (profile pages)
const SIZES: Record<AvatarSize, { size: number; fontSize: number; statusSize: number }> = {
  sm: { size: 32, fontSize: 14, statusSize: 8 },
  md: { size: 40, fontSize: 16, statusSize: 10 },
  lg: { size: 48, fontSize: 18, statusSize: 12 },
  xl: { size: 64, fontSize: 20, statusSize: 16 },
  '2xl': { size: 100, fontSize: 36, statusSize: 20 },
};

const STATUS_COLORS: Record<AvatarStatus, string> = {
  online: colors.success,
  offline: '#71717A',
  away: colors.warning,
  busy: colors.error,
};

// Standardized placeholder background color: indigo-500 (#6366F1)
const PLACEHOLDER_COLOR = '#6366F1';

// Ring color: white/10 equivalent
const RING_COLOR = 'rgba(255, 255, 255, 0.1)';

// Get initials from name
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Get initials from first and last name
export function getInitialsFromNames(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return (first + last).toUpperCase() || '?';
}

export const Avatar = memo<AvatarProps>(
  ({ src, name, size = 'md', status, style, showRing = true }) => {
    const sizeConfig = SIZES[size];
    const initials = useMemo(() => (name ? getInitials(name) : '?'), [name]);

    const containerStyle = useMemo(
      () => ({
        width: sizeConfig.size,
        height: sizeConfig.size,
        borderRadius: sizeConfig.size / 2,
        backgroundColor: src ? 'transparent' : PLACEHOLDER_COLOR,
        borderWidth: showRing ? 2 : 0,
        borderColor: RING_COLOR,
      }),
      [sizeConfig.size, src, showRing]
    );

    const statusStyle = useMemo(
      () => ({
        width: sizeConfig.statusSize,
        height: sizeConfig.statusSize,
        borderRadius: sizeConfig.statusSize / 2,
        backgroundColor: status ? STATUS_COLORS[status] : 'transparent',
        borderWidth: 2,
        borderColor: colors.background,
      }),
      [sizeConfig.statusSize, status]
    );

    return (
      <View style={[styles.container, style]}>
        <View style={[styles.avatarContainer, containerStyle]}>
          {src ? (
            <OptimizedImage
              uri={src}
              style={{
                width: sizeConfig.size - (showRing ? 4 : 0),
                height: sizeConfig.size - (showRing ? 4 : 0),
                borderRadius: (sizeConfig.size - (showRing ? 4 : 0)) / 2,
              }}
              priority="normal"
              cachePolicy="memory-disk"
            />
          ) : (
            <Text style={[styles.initials, { fontSize: sizeConfig.fontSize }]}>{initials}</Text>
          )}
        </View>
        {status && <View style={[styles.statusIndicator, statusStyle]} />}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});

export default Avatar;
