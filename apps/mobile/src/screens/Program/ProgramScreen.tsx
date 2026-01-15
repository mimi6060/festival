import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/common';
import { useProgramStore } from '../../store';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { ProgramEvent } from '../../types';

// Constants for FlatList optimization
const EVENT_CARD_HEIGHT = 100; // Approximate height of event card
const ITEM_SEPARATOR_HEIGHT = 8; // spacing.sm

const days = [
  { key: 'vendredi', label: 'Ven. 12', fullLabel: 'Vendredi 12 Juillet' },
  { key: 'samedi', label: 'Sam. 13', fullLabel: 'Samedi 13 Juillet' },
  { key: 'dimanche', label: 'Dim. 14', fullLabel: 'Dimanche 14 Juillet' },
];

// Mock program data
const mockProgram: ProgramEvent[] = [
  // Vendredi
  {
    id: '1',
    artist: { id: '1', name: 'Opening DJ Set', genre: 'Electronic', image: '' },
    stage: { id: '1', name: 'Main Stage', location: 'North', capacity: 10000 },
    startTime: '18:00',
    endTime: '19:30',
    day: 'vendredi',
  },
  {
    id: '2',
    artist: { id: '2', name: 'The Midnight', genre: 'Synthwave', image: '' },
    stage: { id: '1', name: 'Main Stage', location: 'North', capacity: 10000 },
    startTime: '20:00',
    endTime: '21:30',
    day: 'vendredi',
  },
  {
    id: '3',
    artist: { id: '3', name: 'Caribou', genre: 'Electronic', image: '' },
    stage: { id: '2', name: 'Electric Tent', location: 'East', capacity: 5000 },
    startTime: '21:00',
    endTime: '22:30',
    day: 'vendredi',
  },
  {
    id: '4',
    artist: { id: '4', name: 'Daft Punk Tribute', genre: 'Electronic', image: '' },
    stage: { id: '1', name: 'Main Stage', location: 'North', capacity: 10000 },
    startTime: '22:00',
    endTime: '00:00',
    day: 'vendredi',
  },
  // Samedi
  {
    id: '5',
    artist: { id: '5', name: 'Parcels', genre: 'Disco/Funk', image: '' },
    stage: { id: '1', name: 'Main Stage', location: 'North', capacity: 10000 },
    startTime: '17:00',
    endTime: '18:30',
    day: 'samedi',
  },
  {
    id: '6',
    artist: { id: '6', name: 'Jungle', genre: 'Neo-Soul', image: '' },
    stage: { id: '2', name: 'Electric Tent', location: 'East', capacity: 5000 },
    startTime: '19:00',
    endTime: '20:30',
    day: 'samedi',
  },
  {
    id: '7',
    artist: { id: '7', name: 'Moderat', genre: 'Electronic', image: '' },
    stage: { id: '1', name: 'Main Stage', location: 'North', capacity: 10000 },
    startTime: '21:00',
    endTime: '22:30',
    day: 'samedi',
  },
  {
    id: '8',
    artist: { id: '8', name: 'Bonobo', genre: 'Downtempo', image: '' },
    stage: { id: '1', name: 'Main Stage', location: 'North', capacity: 10000 },
    startTime: '23:00',
    endTime: '01:00',
    day: 'samedi',
  },
  // Dimanche
  {
    id: '9',
    artist: { id: '9', name: 'Khruangbin', genre: 'Psychedelic', image: '' },
    stage: { id: '1', name: 'Main Stage', location: 'North', capacity: 10000 },
    startTime: '18:00',
    endTime: '19:30',
    day: 'dimanche',
  },
  {
    id: '10',
    artist: { id: '10', name: 'ODESZA', genre: 'Electronic', image: '' },
    stage: { id: '1', name: 'Main Stage', location: 'North', capacity: 10000 },
    startTime: '20:30',
    endTime: '22:00',
    day: 'dimanche',
  },
  {
    id: '11',
    artist: { id: '11', name: 'Closing Set', genre: 'House', image: '' },
    stage: { id: '1', name: 'Main Stage', location: 'North', capacity: 10000 },
    startTime: '22:30',
    endTime: '00:00',
    day: 'dimanche',
  },
];

export const ProgramScreen: React.FC = () => {
  const { favorites, toggleFavorite, events: storeEvents } = useProgramStore();
  const [selectedDay, setSelectedDay] = useState('vendredi');
  const [refreshing, setRefreshing] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const events = storeEvents.length > 0 ? storeEvents : mockProgram;

  const filteredEvents = useMemo(() => {
    let filtered = events.filter((e) => e.day === selectedDay);
    if (showFavoritesOnly) {
      filtered = filtered.filter((e) => favorites.includes(e.id));
    }
    return filtered.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [events, selectedDay, showFavoritesOnly, favorites]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleToggleFavorite = useCallback((eventId: string) => {
    toggleFavorite(eventId);
  }, [toggleFavorite]);

  // Memoized event item component for better performance
  const EventItem = memo(({ item, isFavorite, onToggleFavorite }: {
    item: ProgramEvent;
    isFavorite: boolean;
    onToggleFavorite: (id: string) => void;
  }) => (
    <Card style={styles.eventCard}>
      <View style={styles.eventContent}>
        {/* Time Column */}
        <View style={styles.timeColumn}>
          <Text style={styles.startTime}>{item.startTime}</Text>
          <View style={styles.timeLine} />
          <Text style={styles.endTime}>{item.endTime}</Text>
        </View>

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.artistName}>{item.artist.name}</Text>
          <Text style={styles.genre}>{item.artist.genre}</Text>
          <View style={styles.stageRow}>
            <Text style={styles.stageIcon}>📍</Text>
            <Text style={styles.stageName}>{item.stage.name}</Text>
          </View>
        </View>

        {/* Favorite Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onToggleFavorite(item.id)}
        >
          <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  ));

  const renderEvent = useCallback(({ item }: { item: ProgramEvent }) => {
    const isFavorite = favorites.includes(item.id);
    return (
      <EventItem
        item={item}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  }, [favorites, handleToggleFavorite]);

  // getItemLayout for fixed-height optimization
  const getItemLayout = useCallback((_: unknown, index: number) => ({
    length: EVENT_CARD_HEIGHT + ITEM_SEPARATOR_HEIGHT,
    offset: (EVENT_CARD_HEIGHT + ITEM_SEPARATOR_HEIGHT) * index,
    index,
  }), []);

  // Stable key extractor
  const keyExtractor = useCallback((item: ProgramEvent) => item.id, []);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📅</Text>
      <Text style={styles.emptyTitle}>
        {showFavoritesOnly ? 'Aucun favori' : 'Aucun concert'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {showFavoritesOnly
          ? 'Ajoutez des concerts a vos favoris'
          : 'Aucun concert prevu pour ce jour'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Programme</Text>
          <Text style={styles.subtitle}>
            {days.find((d) => d.key === selectedDay)?.fullLabel}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.favoritesToggle,
            showFavoritesOnly && styles.favoritesToggleActive,
          ]}
          onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          <Text style={styles.favoritesToggleIcon}>
            {showFavoritesOnly ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Day Selector */}
      <View style={styles.daySelector}>
        {days.map((day) => (
          <TouchableOpacity
            key={day.key}
            style={[
              styles.dayButton,
              selectedDay === day.key && styles.dayButtonActive,
            ]}
            onPress={() => setSelectedDay(day.key)}
          >
            <Text
              style={[
                styles.dayText,
                selectedDay === day.key && styles.dayTextActive,
              ]}
            >
              {day.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Events List - Optimized FlatList */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        // Performance optimizations
        windowSize={5} // Render 5 screens worth of content (2 above, 2 below, 1 visible)
        maxToRenderPerBatch={10} // Render 10 items per batch
        initialNumToRender={8} // Start with 8 items
        removeClippedSubviews={true} // Unmount off-screen components (Android)
        updateCellsBatchingPeriod={50} // Batch updates every 50ms
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  favoritesToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoritesToggleActive: {
    backgroundColor: colors.primary + '20',
  },
  favoritesToggleIcon: {
    fontSize: 20,
  },
  daySelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dayButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
  },
  dayText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  eventCard: {
    marginBottom: spacing.sm,
  },
  eventContent: {
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
    marginBottom: 2,
  },
  genre: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 4,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default ProgramScreen;
