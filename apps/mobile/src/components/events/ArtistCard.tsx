import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, OptimizedImage } from '../common';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { Artist, ProgramEvent } from '../../types';

// Genre color map - memoized outside component
const GENRE_COLORS: Record<string, string> = {
  Electronic: colors.primary,
  Rock: colors.error,
  Pop: colors.secondary,
  Jazz: colors.accent,
  'Hip-Hop': colors.warning,
  Reggae: colors.success,
  Synthwave: colors.primary,
  'Disco/Funk': colors.secondary,
  House: colors.accent,
  Downtempo: colors.info,
};

interface ArtistCardProps {
  artist: Artist;
  events?: ProgramEvent[];
  onPress?: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  variant?: 'default' | 'compact' | 'large';
}

// Memoized ArtistCard component for optimal performance
export const ArtistCard = memo<ArtistCardProps>(
  ({ artist, events = [], onPress, onFavoritePress, isFavorite = false, variant = 'default' }) => {
    // Memoized genre color lookup
    const genreColor = useMemo(() => GENRE_COLORS[artist.genre] || colors.primary, [artist.genre]);

    // Memoized initials calculation
    const initials = useMemo(
      () =>
        artist.name
          .split(' ')
          .map((word) => word.charAt(0))
          .join('')
          .slice(0, 2)
          .toUpperCase(),
      [artist.name]
    );

    // Memoized next event lookup
    const nextEvent = useMemo(
      () => events.find((e) => e.artist.id === artist.id),
      [events, artist.id]
    );

    // Memoized callbacks to prevent re-renders
    const handlePress = useCallback(() => onPress?.(), [onPress]);
    const handleFavoritePress = useCallback(() => onFavoritePress?.(), [onFavoritePress]);

    if (variant === 'compact') {
      return (
        <TouchableOpacity onPress={handlePress} disabled={!onPress}>
          <View style={styles.compactContainer}>
            {/* Avatar with OptimizedImage */}
            {artist.image ? (
              <OptimizedImage
                uri={artist.image}
                style={styles.compactAvatar}
                priority="normal"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.compactAvatar, { backgroundColor: genreColor }]}>
                <Text style={styles.compactAvatarText}>{initials}</Text>
              </View>
            )}

            {/* Info */}
            <View style={styles.compactInfo}>
              <Text style={styles.compactName} numberOfLines={1}>
                {artist.name}
              </Text>
              <Text style={styles.compactGenre}>{artist.genre}</Text>
            </View>

            {/* Favorite */}
            {onFavoritePress && (
              <TouchableOpacity style={styles.compactFavorite} onPress={handleFavoritePress}>
                <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    if (variant === 'large') {
      return (
        <TouchableOpacity onPress={handlePress} disabled={!onPress}>
          <Card style={styles.largeCard}>
            {/* Cover Image with OptimizedImage */}
            <View style={styles.largeCover}>
              {artist.image ? (
                <OptimizedImage
                  uri={artist.image}
                  style={styles.largeCoverImage}
                  priority="high"
                  cachePolicy="memory-disk"
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.largeCoverPlaceholder, { backgroundColor: genreColor }]}>
                  <Text style={styles.largeCoverIcon}>🎵</Text>
                </View>
              )}

              {/* Favorite Button */}
              {onFavoritePress && (
                <TouchableOpacity style={styles.largeFavoriteButton} onPress={handleFavoritePress}>
                  <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
                </TouchableOpacity>
              )}

              {/* Genre Badge */}
              <View style={[styles.largeGenreBadge, { backgroundColor: genreColor }]}>
                <Text style={styles.largeGenreText}>{artist.genre}</Text>
              </View>
            </View>

            {/* Artist Info */}
            <View style={styles.largeInfo}>
              <Text style={styles.largeName}>{artist.name}</Text>

              {artist.bio && (
                <Text style={styles.largeBio} numberOfLines={2}>
                  {artist.bio}
                </Text>
              )}

              {/* Next Performance */}
              {nextEvent && (
                <View style={styles.largeNextEvent}>
                  <Text style={styles.largeNextLabel}>Prochain concert:</Text>
                  <View style={styles.largeNextDetails}>
                    <Text style={styles.largeNextIcon}>📅</Text>
                    <Text style={styles.largeNextText}>
                      {nextEvent.day} a {nextEvent.startTime}
                    </Text>
                    <Text style={styles.largeNextDot}>|</Text>
                    <Text style={styles.largeNextIcon}>📍</Text>
                    <Text style={styles.largeNextText}>{nextEvent.stage.name}</Text>
                  </View>
                </View>
              )}
            </View>
          </Card>
        </TouchableOpacity>
      );
    }

    // Default variant
    return (
      <TouchableOpacity onPress={handlePress} disabled={!onPress}>
        <Card style={styles.defaultCard}>
          <View style={styles.defaultContent}>
            {/* Avatar with OptimizedImage */}
            <View style={styles.avatarContainer}>
              {artist.image ? (
                <OptimizedImage
                  uri={artist.image}
                  style={styles.avatar}
                  priority="normal"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: genreColor }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
            </View>

            {/* Artist Info */}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {artist.name}
              </Text>
              <View style={[styles.genreBadge, { backgroundColor: genreColor + '20' }]}>
                <Text style={[styles.genreText, { color: genreColor }]}>{artist.genre}</Text>
              </View>

              {/* Next Event Info */}
              {nextEvent && (
                <View style={styles.nextEventRow}>
                  <Text style={styles.nextEventIcon}>📅</Text>
                  <Text style={styles.nextEventText}>
                    {nextEvent.day} | {nextEvent.startTime}
                  </Text>
                </View>
              )}
            </View>

            {/* Favorite Button */}
            {onFavoritePress && (
              <TouchableOpacity style={styles.favoriteButton} onPress={handleFavoritePress}>
                <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  // Default variant
  defaultCard: {
    marginBottom: spacing.sm,
  },
  defaultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  // Default variant - uses lg size (48px) for consistency
  avatar: {
    width: 48, // lg size: 48px
    height: 48,
    borderRadius: 24, // rounded-full
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)', // ring-2 ring-white/10
  },
  avatarPlaceholder: {
    width: 48, // lg size: 48px
    height: 48,
    borderRadius: 24, // rounded-full
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)', // ring-2 ring-white/10
  },
  avatarText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  genreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  genreText: {
    ...typography.caption,
    fontWeight: '600',
  },
  nextEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextEventIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  nextEventText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  favoriteButton: {
    padding: spacing.sm,
  },
  favoriteIcon: {
    fontSize: 22,
  },

  // Compact variant - uses md size (40px) for consistency
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  compactAvatar: {
    width: 40, // md size: 40px
    height: 40,
    borderRadius: 20, // rounded-full
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)', // ring-2 ring-white/10
  },
  compactAvatarText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '700',
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
  },
  compactGenre: {
    ...typography.caption,
    color: colors.textMuted,
  },
  compactFavorite: {
    padding: spacing.xs,
  },

  // Large variant
  largeCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  largeCover: {
    height: 180,
    position: 'relative',
  },
  largeCoverImage: {
    width: '100%',
    height: '100%',
  },
  largeCoverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeCoverIcon: {
    fontSize: 64,
  },
  largeFavoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeGenreBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  largeGenreText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  largeInfo: {
    padding: spacing.md,
  },
  largeName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  largeBio: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  largeNextEvent: {
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  largeNextLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  largeNextDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  largeNextIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  largeNextText: {
    ...typography.small,
    color: colors.text,
    marginRight: spacing.xs,
  },
  largeNextDot: {
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
});

export default ArtistCard;
