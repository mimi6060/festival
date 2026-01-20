import React, { useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useNotificationStore } from '../../store';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { Notification } from '../../types';

// Constants for FlatList optimization
const NOTIFICATION_ITEM_HEIGHT = 100; // Approximate height of notification card
const ITEM_SEPARATOR_HEIGHT = 8; // spacing.sm

// Mock notifications for demo
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Concert dans 30 minutes!',
    message: 'The Midnight commence bientot sur la Main Stage. Ne manquez pas ce concert!',
    type: 'reminder',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Offre speciale',
    message: "Profitez de -20% sur les cocktails au Bar Central jusqu'a 19h!",
    type: 'promo',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '3',
    title: 'Rechargement reussi',
    message: 'Votre portefeuille a ete credite de 50 EUR.',
    type: 'info',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '4',
    title: 'Alerte meteo',
    message: 'Averses prevues vers 18h. Pensez a prendre un k-way!',
    type: 'alert',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: '5',
    title: 'Bienvenue au Festival!',
    message: 'Nous sommes ravis de vous accueillir. Profitez bien de votre experience!',
    type: 'info',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    notifications: storeNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const notifications = useMemo(
    () => (storeNotifications.length > 0 ? storeNotifications : mockNotifications),
    [storeNotifications]
  );
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const getNotificationIcon = useCallback((type: Notification['type']) => {
    switch (type) {
      case 'alert':
        return '⚠️';
      case 'promo':
        return '🎁';
      case 'reminder':
        return '⏰';
      default:
        return 'ℹ️';
    }
  }, []);

  const getNotificationColor = useCallback((type: Notification['type']) => {
    switch (type) {
      case 'alert':
        return colors.warning;
      case 'promo':
        return colors.secondary;
      case 'reminder':
        return colors.primary;
      default:
        return colors.info;
    }
  }, []);

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return "A l'instant";
    }
    if (diffMins < 60) {
      return `Il y a ${diffMins} min`;
    }
    if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    }
    if (diffDays === 1) {
      return 'Hier';
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      if (!notification.read) {
        markAsRead(notification.id);
      }
      // Handle navigation based on actionUrl
    },
    [markAsRead]
  );

  const handleDeleteNotification = useCallback(
    (notificationId: string) => {
      deleteNotification(notificationId);
    },
    [deleteNotification]
  );

  // Memoized notification item component
  const NotificationItem = memo(
    ({
      item,
      onPress,
      onDelete,
      getIcon,
      getColor,
      formatTimeFunc,
    }: {
      item: Notification;
      onPress: (notification: Notification) => void;
      onDelete: (id: string) => void;
      getIcon: (type: Notification['type']) => string;
      getColor: (type: Notification['type']) => string;
      formatTimeFunc: (dateString: string) => string;
    }) => (
      <TouchableOpacity
        style={[styles.notificationCard, !item.read && styles.notificationUnread]}
        onPress={() => onPress(item)}
        activeOpacity={0.9}
      >
        <View style={[styles.iconContainer, { backgroundColor: getColor(item.type) + '20' }]}>
          <Text style={styles.icon}>{getIcon(item.type)}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.time}>{formatTimeFunc(item.createdAt)}</Text>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(item.id)}>
          <Text style={styles.deleteIcon}>x</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    )
  );

  const renderNotification = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationItem
        item={item}
        onPress={handleNotificationPress}
        onDelete={handleDeleteNotification}
        getIcon={getNotificationIcon}
        getColor={getNotificationColor}
        formatTimeFunc={formatTime}
      />
    ),
    [
      handleNotificationPress,
      handleDeleteNotification,
      getNotificationIcon,
      getNotificationColor,
      formatTime,
    ]
  );

  // getItemLayout for fixed-height optimization
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: NOTIFICATION_ITEM_HEIGHT + ITEM_SEPARATOR_HEIGHT,
      offset: (NOTIFICATION_ITEM_HEIGHT + ITEM_SEPARATOR_HEIGHT) * index,
      index,
    }),
    []
  );

  // Stable key extractor
  const keyExtractor = useCallback((item: Notification) => item.id, []);

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔔</Text>
        <Text style={styles.emptyTitle}>Aucune notification</Text>
        <Text style={styles.emptySubtitle}>
          Vous recevrez ici les alertes et informations importantes
        </Text>
      </View>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={styles.placeholder} />}
      </View>

      {/* Unread Count */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadText}>
            {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue
            {unreadCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Notifications List - Optimized FlatList */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        // Performance optimizations
        windowSize={5}
        maxToRenderPerBatch={10}
        initialNumToRender={8}
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
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.text,
  },
  screenTitle: {
    ...typography.h3,
    color: colors.text,
  },
  markAllButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  markAllText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  placeholder: {
    width: 80,
  },
  unreadBanner: {
    backgroundColor: colors.primary + '20',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  unreadText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  notificationUnread: {
    backgroundColor: colors.surfaceLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  message: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  time: {
    ...typography.caption,
    color: colors.textMuted,
  },
  deleteButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  deleteIcon: {
    fontSize: 24,
    color: colors.textMuted,
    fontWeight: '300',
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
    paddingHorizontal: spacing.lg,
  },
});

export default NotificationsScreen;
