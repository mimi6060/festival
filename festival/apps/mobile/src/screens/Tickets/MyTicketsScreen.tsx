import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TicketCard } from '../../components/tickets';
import { useTicketStore } from '../../store';
import { offlineService } from '../../services';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList, Ticket } from '../../types';

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
    eventName: 'Festival Pass - Weekend Complet',
    eventDate: '2024-07-15',
    eventTime: '12:00',
    venue: 'Parc des Expositions',
    ticketType: 'vip',
    price: 250,
    qrCode: 'FEST-VIP-2024-001-ABCD1234',
    status: 'valid',
    purchasedAt: '2024-06-01T10:00:00Z',
    seatInfo: 'Zone VIP - Acces prioritaire',
  },
  {
    id: '2',
    eventId: 'e2',
    eventName: 'Concert The Midnight',
    eventDate: '2024-07-15',
    eventTime: '21:00',
    venue: 'Main Stage',
    ticketType: 'standard',
    price: 45,
    qrCode: 'FEST-STD-2024-002-EFGH5678',
    status: 'valid',
    purchasedAt: '2024-06-15T14:30:00Z',
  },
  {
    id: '3',
    eventId: 'e3',
    eventName: 'After Party - Saturday Night',
    eventDate: '2024-07-13',
    eventTime: '23:00',
    venue: 'Club Tent',
    ticketType: 'backstage',
    price: 80,
    qrCode: 'FEST-BST-2024-003-IJKL9012',
    status: 'used',
    purchasedAt: '2024-06-10T09:00:00Z',
  },
  {
    id: '4',
    eventId: 'e4',
    eventName: 'Workshop DJ Set',
    eventDate: '2024-07-12',
    eventTime: '14:00',
    venue: 'Workshop Area',
    ticketType: 'standard',
    price: 25,
    qrCode: 'FEST-STD-2024-004-MNOP3456',
    status: 'expired',
    purchasedAt: '2024-06-05T16:00:00Z',
  },
];

export const MyTicketsScreen: React.FC = () => {
  const navigation = useNavigation<TicketsNavigationProp>();
  const { tickets: storeTickets } = useTicketStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Use mock data if store is empty
  const tickets = storeTickets.length > 0 ? storeTickets : mockTickets;

  const filteredTickets = useMemo(() => {
    if (activeFilter === 'all') return tickets;
    return tickets.filter((t) => t.status === activeFilter);
  }, [tickets, activeFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await offlineService.syncAllData();
    setRefreshing(false);
  };

  const handleTicketPress = (ticket: Ticket) => {
    navigation.navigate('TicketDetail', { ticketId: ticket.id });
  };

  const renderFilter = ({ item }: { item: { key: FilterType; label: string } }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        activeFilter === item.key && styles.filterButtonActive,
      ]}
      onPress={() => setActiveFilter(item.key)}
    >
      <Text
        style={[
          styles.filterText,
          activeFilter === item.key && styles.filterTextActive,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderTicket = ({ item }: { item: Ticket }) => (
    <TicketCard ticket={item} onPress={() => handleTicketPress(item)} />
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

      {/* Filters */}
      <FlatList
        horizontal
        data={filters}
        renderItem={renderFilter}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersList}
      />

      {/* Tickets List */}
      <FlatList
        data={filteredTickets}
        renderItem={renderTicket}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
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
    ...typography.bodySmall,
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
