import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Card } from '../common';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { Artist, ProgramEvent } from '../../types';

interface ArtistCardProps {
  artist: Artist;
  events?: ProgramEvent[];
  onPress?: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  variant?: 'default' | 'compact' | 'large';
}

export const ArtistCard: React.FC<ArtistCardProps> = ({
  artist,
  events = [],
  onPress,
  onFavoritePress,
  isFavorite = false,
  variant = 'default',
}) => {
  const getGenreColor = (genre: string) => {
    const genreColors: Record<string, string> = {
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
    return genreColors[genre] || colors.primary;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const nextEvent = events.find((e) => e.artist.id === artist.id);

  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={onPress} disabled={!onPress}>
        <View style={styles.compactContainer}>
          {/* Avatar */}
          {artist.image ? (
            <Image source={{ uri: artist.image }} style={styles.compactAvatar} />
          ) : (
            <View
              style={[
                styles.compactAvatar,
                { backgroundColor: getGenreColor(artist.genre) },
              ]}
            >
              <Text style={styles.compactAvatarText}>{getInitials(artist.name)}</Text>
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
            <TouchableOpacity style={styles.compactFavorite} onPress={onFavoritePress}>
              <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'large') {
    return (
      <TouchableOpacity onPress={onPress} disabled={!onPress}>
        <Card style={styles.largeCard}>
          {/* Cover Image */}
          <View style={styles.largeCover}>
            {artist.image ? (
              <Image source={{ uri: artist.image }} style={styles.largeCoverImage} />
            ) : (
              <View
                style={[
                  styles.largeCoverPlaceholder,
                  { backgroundColor: getGenreColor(artist.genre) },
                ]}
              >
                <Text style={styles.largeCoverIcon}>🎵</Text>
              </View>
            )}

            {/* Favorite Button */}
            {onFavoritePress && (
              <TouchableOpacity
                style={styles.largeFavoriteButton}
                onPress={onFavoritePress}
              >
                <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
              </TouchableOpacity>
            )}

            {/* Genre Badge */}
            <View
              style={[
                styles.largeGenreBadge,
                { backgroundColor: getGenreColor(artist.genre) },
              ]}
            >
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
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card style={styles.defaultCard}>
        <View style={styles.defaultContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {artist.image ? (
              <Image source={{ uri: artist.image }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: getGenreColor(artist.genre) },
                ]}
              >
                <Text style={styles.avatarText}>{getInitials(artist.name)}</Text>
              </View>
            )}
          </View>

          {/* Artist Info */}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {artist.name}
            </Text>
            <View
              style={[
                styles.genreBadge,
                { backgroundColor: getGenreColor(artist.genre) + '20' },
              ]}
            >
              <Text
                style={[styles.genreText, { color: getGenreColor(artist.genre) }]}
              >
                {artist.genre}
              </Text>
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
            <TouchableOpacity style={styles.favoriteButton} onPress={onFavoritePress}>
              <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

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
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  compactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  compactAvatarText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '700',
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    ...typography.bodySmall,
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
    ...typography.bodySmall,
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
    ...typography.bodySmall,
    color: colors.text,
    marginRight: spacing.xs,
  },
  largeNextDot: {
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
});

export default ArtistCard;
