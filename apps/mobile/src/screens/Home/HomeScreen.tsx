import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button } from '../../components/common';
import { TicketCard } from '../../components/tickets';
import { BalanceCard } from '../../components/wallet';
import {
  useAuthStore,
  useTicketStore,
  useWalletStore,
  useNotificationStore,
  useProgramStore,
} from '../../store';
import { offlineService, initializeDemoData } from '../../services';
import { colors, spacing, typography, webPressable } from '../../theme';
import type { RootStackParamList, MainTabParamList, Ticket } from '../../types';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList & MainTabParamList, 'Home'>;

// Memoized event card for home screen - extracted for stable reference
const HomeEventCard = memo(
  ({
    event,
    isFavorite,
    onToggleFavorite,
  }: {
    event: {
      id: string;
      startTime: string;
      day: string;
      artist: { name: string; genre: string };
      stage: { name: string };
    };
    isFavorite: boolean;
    onToggleFavorite: (id: string) => void;
  }) => (
    <Card style={styles.eventCard}>
      <View style={styles.eventContent}>
        <View style={styles.eventTime}>
          <Text style={styles.eventTimeText}>{event.startTime}</Text>
          <Text style={styles.eventDay}>{event.day}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventArtist}>{event.artist.name}</Text>
          <Text style={styles.eventStage}>📍 {event.stage.name}</Text>
          <Text style={styles.eventGenre}>{event.artist.genre}</Text>
        </View>
        <TouchableOpacity
          style={[styles.favoriteButton, webPressable]}
          onPress={() => onToggleFavorite(event.id)}
        >
          <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  )
);

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const { user } = useAuthStore();
  const { tickets } = useTicketStore();
  const { balance } = useWalletStore();
  const { unreadCount } = useNotificationStore();
  const { events: programEvents, favorites, toggleFavorite } = useProgramStore();

  const [refreshing, setRefreshing] = useState(false);

  // Get upcoming events from the program store
  const upcomingEvents = programEvents.slice(0, 4);
  const activeTickets = tickets.filter((t) => t.status === 'valid').slice(0, 2);

  useEffect(() => {
    // Initialize demo data on first load
    initializeDemoData();
    // Then try to sync with API
    offlineService.syncAllData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await offlineService.syncAllData();
    setRefreshing(false);
  };

  const handleTicketPress = (ticket: Ticket) => {
    navigation.navigate('TicketDetail', { ticketId: ticket.id });
  };

  const handleToggleFavorite = useCallback(
    (eventId: string) => {
      toggleFavorite(eventId);
    },
    [toggleFavorite]
  );

  const handleQuickAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'plan':
          navigation.navigate('Map', { filter: 'all' });
          break;
        case 'food':
          navigation.navigate('Map', { filter: 'food' });
          break;
        case 'toilettes':
          navigation.navigate('Map', { filter: 'services' });
          break;
        case 'secours':
          navigation.navigate('Map', { filter: 'emergency' });
          break;
      }
    },
    [navigation]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>{user?.firstName || 'Festivalier'} 👋</Text>
          </View>
          <TouchableOpacity
            style={[styles.notificationButton, webPressable]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.notificationIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Festival Countdown */}
        <Card style={styles.countdownCard}>
          <View style={styles.countdownContent}>
            <Text style={styles.countdownIcon}>🎉</Text>
            <View style={styles.countdownText}>
              <Text style={styles.countdownTitle}>Festival en cours!</Text>
              <Text style={styles.countdownSubtitle}>Profitez de chaque moment</Text>
            </View>
          </View>
        </Card>

        {/* Wallet Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mon portefeuille</Text>
          <BalanceCard
            balance={balance}
            onTopup={() => navigation.navigate('Topup')}
            onViewTransactions={() => navigation.navigate('Transactions')}
          />
        </View>

        {/* Active Tickets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mes billets actifs</Text>
            <TouchableOpacity style={webPressable} onPress={() => navigation.navigate('Tickets')}>
              <Text style={styles.seeAll}>Voir tout →</Text>
            </TouchableOpacity>
          </View>

          {activeTickets.length > 0 ? (
            activeTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onPress={() => handleTicketPress(ticket)}
              />
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🎟️</Text>
              <Text style={styles.emptyTitle}>Aucun billet actif</Text>
              <Text style={styles.emptySubtitle}>Achetez vos billets pour acceder au festival</Text>
              <Button
                title="Acheter des billets"
                onPress={() => navigation.navigate('Tickets')}
                variant="outline"
                size="sm"
                style={styles.emptyButton}
              />
            </Card>
          )}
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Prochains concerts</Text>
            <TouchableOpacity style={webPressable} onPress={() => navigation.navigate('Program')}>
              <Text style={styles.seeAll}>Programme →</Text>
            </TouchableOpacity>
          </View>

          {upcomingEvents.map((event) => (
            <HomeEventCard
              key={event.id}
              event={event}
              isFavorite={favorites.includes(event.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acces rapide</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, webPressable]}
              onPress={() => handleQuickAction('plan')}
            >
              <Text style={styles.quickActionIcon}>🗺️</Text>
              <Text style={styles.quickActionLabel}>Plan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, webPressable]}
              onPress={() => handleQuickAction('food')}
            >
              <Text style={styles.quickActionIcon}>🍔</Text>
              <Text style={styles.quickActionLabel}>Food</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, webPressable]}
              onPress={() => handleQuickAction('toilettes')}
            >
              <Text style={styles.quickActionIcon}>🚻</Text>
              <Text style={styles.quickActionLabel}>Toilettes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, webPressable]}
              onPress={() => handleQuickAction('secours')}
            >
              <Text style={styles.quickActionIcon}>🏥</Text>
              <Text style={styles.quickActionLabel}>Secours</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  greeting: {
    ...typography.body,
    color: colors.textSecondary,
  },
  userName: {
    ...typography.h2,
    color: colors.text,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.festivalPink,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  countdownCard: {
    backgroundColor: colors.festivalPurple,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.festivalPink + '40',
    shadowColor: colors.festivalPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  countdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownIcon: {
    fontSize: 40,
    marginRight: spacing.md,
  },
  countdownText: {
    flex: 1,
  },
  countdownTitle: {
    ...typography.h3,
    color: colors.white,
  },
  countdownSubtitle: {
    ...typography.small,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  seeAll: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyButton: {
    marginTop: spacing.sm,
  },
  eventCard: {
    marginBottom: spacing.sm,
  },
  eventContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTime: {
    alignItems: 'center',
    marginRight: spacing.md,
    minWidth: 50,
  },
  eventTimeText: {
    ...typography.h3,
    color: colors.festivalPink,
  },
  eventDay: {
    ...typography.caption,
    color: colors.textMuted,
  },
  eventInfo: {
    flex: 1,
  },
  eventArtist: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  eventStage: {
    ...typography.small,
    color: colors.textSecondary,
  },
  eventGenre: {
    ...typography.caption,
    color: colors.textMuted,
  },
  favoriteButton: {
    padding: spacing.sm,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default HomeScreen;
