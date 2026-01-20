import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface StaffStats {
  validationsToday: number;
  validationsTotal: number;
  avgValidationTime: number;
  activeAlerts: number;
  assignedZones: number;
  shiftStart: string;
  shiftEnd: string;
  isOnShift: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route: keyof RootStackParamList;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'scan', label: 'Scanner', icon: '📷', route: 'StaffValidation', color: '#3b82f6' },
  { id: 'pos', label: 'POS/Bar', icon: '🍹', route: 'VendorSelect', color: '#ec4899' },
  { id: 'zones', label: 'Zones', icon: '📍', route: 'StaffZones', color: '#10b981' },
  { id: 'alerts', label: 'Alertes', icon: '🔔', route: 'Notifications', color: '#f59e0b' },
];

// Mock data - in real app, fetch from API
function generateMockStats(): StaffStats {
  const now = new Date();
  const shiftStart = new Date(now);
  shiftStart.setHours(8, 0, 0, 0);
  const shiftEnd = new Date(now);
  shiftEnd.setHours(20, 0, 0, 0);

  return {
    validationsToday: Math.floor(Math.random() * 200) + 50,
    validationsTotal: Math.floor(Math.random() * 1000) + 500,
    avgValidationTime: Math.random() * 2 + 1,
    activeAlerts: Math.floor(Math.random() * 5),
    assignedZones: Math.floor(Math.random() * 3) + 1,
    shiftStart: shiftStart.toISOString(),
    shiftEnd: shiftEnd.toISOString(),
    isOnShift: now >= shiftStart && now <= shiftEnd,
  };
}

export const StaffDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadStats = useCallback(async () => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300));
    setStats(generateMockStats());
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  const shiftInfo = useMemo(() => {
    if (!stats) {
      return null;
    }

    const start = new Date(stats.shiftStart);
    const end = new Date(stats.shiftEnd);
    const now = currentTime;

    const totalMinutes = (end.getTime() - start.getTime()) / 60000;
    const elapsedMinutes = Math.max(0, (now.getTime() - start.getTime()) / 60000);
    const remainingMinutes = Math.max(0, (end.getTime() - now.getTime()) / 60000);

    const progress = Math.min(100, (elapsedMinutes / totalMinutes) * 100);

    const formatTime = (date: Date) =>
      date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const formatRemaining = (mins: number) => {
      const hours = Math.floor(mins / 60);
      const minutes = Math.floor(mins % 60);
      if (hours > 0) {
        return `${hours}h ${minutes}min`;
      }
      return `${minutes}min`;
    };

    return {
      startTime: formatTime(start),
      endTime: formatTime(end),
      remaining: formatRemaining(remainingMinutes),
      progress,
      isOnShift: stats.isOnShift,
    };
  }, [stats, currentTime]);

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      navigation.navigate(action.route as never);
    },
    [navigation]
  );

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Mode Staff</Text>
          <Text style={styles.date}>
            {currentTime.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>

        {/* Shift Status */}
        {shiftInfo && (
          <View
            style={[
              styles.shiftCard,
              shiftInfo.isOnShift ? styles.shiftActive : styles.shiftInactive,
            ]}
          >
            <View style={styles.shiftHeader}>
              <Text style={styles.shiftTitle}>
                {shiftInfo.isOnShift ? '🟢 En service' : '⚪ Hors service'}
              </Text>
              <Text style={styles.shiftTime}>
                {shiftInfo.startTime} - {shiftInfo.endTime}
              </Text>
            </View>
            {shiftInfo.isOnShift && (
              <>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${shiftInfo.progress}%` }]} />
                </View>
                <Text style={styles.shiftRemaining}>Temps restant: {shiftInfo.remaining}</Text>
              </>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.quickActionButton, { backgroundColor: action.color }]}
              onPress={() => handleQuickAction(action)}
            >
              <Text style={styles.quickActionIcon}>{action.icon}</Text>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.validationsToday}</Text>
            <Text style={styles.statLabel}>Scans aujourd'hui</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.avgValidationTime.toFixed(1)}s</Text>
            <Text style={styles.statLabel}>Temps moyen</Text>
          </View>
          <View style={[styles.statCard, stats.activeAlerts > 0 && styles.statCardAlert]}>
            <Text style={[styles.statValue, stats.activeAlerts > 0 && styles.statValueAlert]}>
              {stats.activeAlerts}
            </Text>
            <Text style={styles.statLabel}>Alertes actives</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.assignedZones}</Text>
            <Text style={styles.statLabel}>Zones assignées</Text>
          </View>
        </View>

        {/* Total Stats */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total validations (festival)</Text>
            <Text style={styles.totalValue}>{stats.validationsTotal.toLocaleString()}</Text>
          </View>
        </View>

        {/* Start Scanning CTA */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => navigation.navigate('StaffValidation' as never)}
        >
          <Text style={styles.scanButtonIcon}>📷</Text>
          <Text style={styles.scanButtonText}>Commencer à scanner</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  greeting: {
    ...typography.h1,
    color: colors.white,
    fontWeight: '700',
  },
  date: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  shiftCard: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  shiftActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  shiftInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftTitle: {
    ...typography.h4,
    color: colors.white,
    fontWeight: '600',
  },
  shiftTime: {
    ...typography.small,
    color: colors.textMuted,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  shiftRemaining: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickActionButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statCardAlert: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statValue: {
    ...typography.h2,
    color: colors.white,
    fontWeight: '700',
  },
  statValueAlert: {
    color: '#f59e0b',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  totalCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  totalValue: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },
  scanButton: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  scanButtonIcon: {
    fontSize: 24,
  },
  scanButtonText: {
    ...typography.h4,
    color: colors.white,
    fontWeight: '600',
  },
});

export default StaffDashboardScreen;
