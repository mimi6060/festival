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
import type { ProgramEvent } from '../../types';

interface EventCardProps {
  event: ProgramEvent;
  onPress?: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onPress,
  onFavoritePress,
  isFavorite = false,
  variant = 'default',
}) => {
  const formatTimeRange = () => {
    return `${event.startTime} - ${event.endTime}`;
  };

  const getGenreColor = (genre: string) => {
    const genreColors: Record<string, string> = {
      Electronic: colors.primary,
      Rock: colors.error,
      Pop: colors.secondary,
      Jazz: colors.accent,
      'Hip-Hop': colors.warning,
      Reggae: colors.success,
    };
    return genreColors[genre] || colors.primary;
  };

  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={onPress} disabled={!onPress}>
        <View style={styles.compactContainer}>
          <View style={styles.compactTimeColumn}>
            <Text style={styles.compactTime}>{event.startTime}</Text>
          </View>
          <View style={styles.compactDivider} />
          <View style={styles.compactInfo}>
            <Text style={styles.compactArtist} numberOfLines={1}>
              {event.artist.name}
            </Text>
            <Text style={styles.compactStage} numberOfLines={1}>
              {event.stage.name}
            </Text>
          </View>
          {onFavoritePress && (
            <TouchableOpacity
              style={styles.compactFavorite}
              onPress={onFavoritePress}
            >
              <Text style={styles.favoriteIcon}>
                {isFavorite ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'featured') {
    return (
      <TouchableOpacity onPress={onPress} disabled={!onPress}>
        <Card style={styles.featuredCard}>
          {/* Artist Image */}
          <View style={styles.featuredImageContainer}>
            {event.artist.image ? (
              <Image
                source={{ uri: event.artist.image }}
                style={styles.featuredImage}
              />
            ) : (
              <View style={styles.featuredImagePlaceholder}>
                <Text style={styles.featuredImageIcon}>🎵</Text>
              </View>
            )}
            {/* Favorite Button */}
            {onFavoritePress && (
              <TouchableOpacity
                style={styles.featuredFavoriteButton}
                onPress={onFavoritePress}
              >
                <Text style={styles.favoriteIcon}>
                  {isFavorite ? '❤️' : '🤍'}
                </Text>
              </TouchableOpacity>
            )}
            {/* Time Badge */}
            <View style={styles.timeBadge}>
              <Text style={styles.timeBadgeText}>{event.startTime}</Text>
            </View>
          </View>

          {/* Event Info */}
          <View style={styles.featuredInfo}>
            <View style={styles.featuredHeader}>
              <Text style={styles.featuredArtist}>{event.artist.name}</Text>
              <View
                style={[
                  styles.genreBadge,
                  { backgroundColor: getGenreColor(event.artist.genre) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.genreText,
                    { color: getGenreColor(event.artist.genre) },
                  ]}
                >
                  {event.artist.genre}
                </Text>
              </View>
            </View>
            <View style={styles.featuredDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>📍</Text>
                <Text style={styles.detailText}>{event.stage.name}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>⏱️</Text>
                <Text style={styles.detailText}>{formatTimeRange()}</Text>
              </View>
            </View>
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
          {/* Time Column */}
          <View style={styles.timeColumn}>
            <Text style={styles.startTime}>{event.startTime}</Text>
            <View style={styles.timeLine} />
            <Text style={styles.endTime}>{event.endTime}</Text>
          </View>

          {/* Event Info */}
          <View style={styles.eventInfo}>
            <Text style={styles.artistName}>{event.artist.name}</Text>
            <View
              style={[
                styles.genreBadge,
                { backgroundColor: getGenreColor(event.artist.genre) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.genreText,
                  { color: getGenreColor(event.artist.genre) },
                ]}
              >
                {event.artist.genre}
              </Text>
            </View>
            <View style={styles.stageRow}>
              <Text style={styles.stageIcon}>📍</Text>
              <Text style={styles.stageName}>{event.stage.name}</Text>
            </View>
          </View>

          {/* Favorite Button */}
          {onFavoritePress && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={onFavoritePress}
            >
              <Text style={styles.favoriteIcon}>
                {isFavorite ? '❤️' : '🤍'}
              </Text>
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
  timeColumn: {
    alignItems: 'center',
    marginRight: spacing.md,
    minWidth: 50,
  },
  startTime: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  timeLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  endTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  eventInfo: {
    flex: 1,
  },
  artistName: {
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
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  stageName: {
    ...typography.caption,
    color: colors.textMuted,
  },
  favoriteButton: {
    padding: spacing.sm,
  },
  favoriteIcon: {
    fontSize: 24,
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  compactTimeColumn: {
    width: 50,
  },
  compactTime: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  compactDivider: {
    width: 2,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  compactInfo: {
    flex: 1,
  },
  compactArtist: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  compactStage: {
    ...typography.caption,
    color: colors.textMuted,
  },
  compactFavorite: {
    padding: spacing.xs,
  },

  // Featured variant
  featuredCard: {
    padding: 0,
    overflow: 'hidden',
  },
  featuredImageContainer: {
    height: 150,
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredImageIcon: {
    fontSize: 48,
  },
  featuredFavoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  timeBadgeText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '700',
  },
  featuredInfo: {
    padding: spacing.md,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  featuredArtist: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  featuredDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  detailText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});

export default EventCard;
