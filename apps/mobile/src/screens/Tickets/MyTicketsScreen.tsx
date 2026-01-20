import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TicketCard } from '../../components/tickets';
import { useTicketStore } from '../../store';
import { offlineService } from '../../services';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList, Ticket } from '../../types';

// Constants for FlatList optimization
const TICKET_CARD_HEIGHT = 200; // Approximate height of ticket card
const ITEM_SEPARATOR_HEIGHT = 16; // spacing.md
const _FILTER_ITEM_WIDTH = 100; // Approximate width of filter button (reserved for horizontal scroll optimization)

type TicketsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

type FilterType = 'all' | 'valid' | 'used' | 'expired';

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'valid', label: 'Actifs' },
  { key: 'used', label: 'Utilises' },
  { key: 'expired', label: 'Expires' },
];

// Mock tickets for demo
const mockTickets: Ticket[] = [
  {
    id: '1',
    eventId: 'e1',
    eventName: 'Electric Dreams 2025 - Pass 4 Jours',
    eventDate: '2025-08-20',
    eventTime: '16:00',
    venue: 'Domaine de Chambord',
    ticketType: 'vip',
    price: 450,
    qrCode: 'ED25-VIP-001-ABCD1234',
    status: 'valid',
    purchasedAt: '2025-01-02T10:00:00Z',
    seatInfo: 'Pass Platinum - Acces Backstage',
  },
  {
    id: '2',
    eventId: 'e2',
    eventName: 'Electric Dreams 2025 - Pass 1 Jour',
    eventDate: '2025-08-21',
    eventTime: '16:00',
    venue: 'Domaine de Chambord',
    ticketType: 'standard',
    price: 55,
    qrCode: 'ED25-STD-002-EFGH5678',
    status: 'valid',
    purchasedAt: '2025-01-02T14:30:00Z',
  },
  {
    id: '3',
    eventId: 'e3',
    eventName: 'Les Nuits Electriques 2024',
    eventDate: '2024-08-15',
    eventTime: '18:00',
    venue: 'Plage du Grand Travers',
    ticketType: 'backstage',
    price: 180,
    qrCode: 'NE24-BST-003-IJKL9012',
    status: 'used',
    purchasedAt: '2024-06-10T09:00:00Z',
  },
  {
    id: '4',
    eventId: 'e4',
    eventName: 'Summer Vibes 2024 - Workshop',
    eventDate: '2024-07-12',
    eventTime: '14:00',
    venue: 'La Rochelle - Esplanade',
    ticketType: 'standard',
    price: 25,
    qrCode: 'SV24-STD-004-MNOP3456',
    status: 'expired',
    purchasedAt: '2024-06-05T16:00:00Z',
  },
];

export const MyTicketsScreen: React.FC = () => {
  const navigation = useNavigation<TicketsNavigationProp>();
  const { tickets: storeTickets, setTickets, clearTickets } = useTicketStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Clear invalid tickets and replace with mock data on mount
  useEffect(() => {
    const hasInvalidTickets = storeTickets.some((t) => !t.eventDate || !t.eventName);
    if (hasInvalidTickets || storeTickets.length === 0) {
      clearTickets();
      setTickets(mockTickets);
    }
  }, []);

  // Use mock data if store is empty or has invalid data
  const hasValidTickets =
    storeTickets.length > 0 && storeTickets.every((t) => t.eventDate && t.eventName);
  const tickets = hasValidTickets ? storeTickets : mockTickets;

  const filteredTickets = useMemo(() => {
    if (activeFilter === 'all') {
      return tickets;
    }
    return tickets.filter((t) => t.status === activeFilter);
  }, [tickets, activeFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await offlineService.syncAllData();
    setRefreshing(false);
  }, []);

  const handleTicketPress = useCallback(
    (ticket: Ticket) => {
      navigation.navigate('TicketDetail', { ticketId: ticket.id });
    },
    [navigation]
  );

  const handleFilterPress = useCallback((filterKey: FilterType) => {
    setActiveFilter(filterKey);
  }, []);

  // Memoized filter item component
  const FilterItem = memo(
    ({
      item,
      isActive,
      onPress,
    }: {
      item: { key: FilterType; label: string };
      isActive: boolean;
      onPress: (key: FilterType) => void;
    }) => (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => onPress(item.key)}
      >
        <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{item.label}</Text>
      </TouchableOpacity>
    )
  );

  const renderFilter = useCallback(
    ({ item }: { item: { key: FilterType; label: string } }) => (
      <FilterItem item={item} isActive={activeFilter === item.key} onPress={handleFilterPress} />
    ),
    [activeFilter, handleFilterPress]
  );

  const renderTicket = useCallback(
    ({ item }: { item: Ticket }) => (
      <TicketCard ticket={item} onPress={() => handleTicketPress(item)} />
    ),
    [handleTicketPress]
  );

  // getItemLayout for fixed-height optimization
  const getTicketItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: TICKET_CARD_HEIGHT + ITEM_SEPARATOR_HEIGHT,
      offset: (TICKET_CARD_HEIGHT + ITEM_SEPARATOR_HEIGHT) * index,
      index,
    }),
    []
  );

  // Stable key extractors
  const ticketKeyExtractor = useCallback((item: Ticket) => item.id, []);
  const filterKeyExtractor = useCallback(
    (item: { key: FilterType; label: string }) => item.key,
    []
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎟️</Text>
      <Text style={styles.emptyTitle}>Aucun billet</Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter === 'all'
          ? "Vous n'avez pas encore de billets"
          : `Aucun billet ${filters.find((f) => f.key === activeFilter)?.label.toLowerCase()}`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mes Billets</Text>
        <Text style={styles.subtitle}>
          {tickets.length} billet{tickets.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filters - Optimized horizontal FlatList */}
      <FlatList
        horizontal
        data={filters}
        renderItem={renderFilter}
        keyExtractor={filterKeyExtractor}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersList}
        // Horizontal list optimizations
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
      />

      {/* Tickets List - Optimized FlatList */}
      <FlatList
        data={filteredTickets}
        renderItem={renderTicket}
        keyExtractor={ticketKeyExtractor}
        getItemLayout={getTicketItemLayout}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        // Performance optimizations
        windowSize={5}
        maxToRenderPerBatch={5}
        initialNumToRender={4}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
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
  filtersList: {
    maxHeight: 50,
  },
  filtersContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
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

export default MyTicketsScreen;
