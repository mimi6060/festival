import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface Zone {
  id: string;
  name: string;
  type: 'entrance' | 'stage' | 'food' | 'camping' | 'vip';
  currentOccupancy: number;
  maxCapacity: number;
  status: 'normal' | 'busy' | 'critical' | 'full';
  isAssigned: boolean;
  alertCount: number;
  lastUpdate: string;
}

type ZoneFilter = 'all' | 'assigned' | 'alerts';

const ZONE_TYPE_CONFIG = {
  entrance: { icon: '🚪', label: 'Entrée' },
  stage: { icon: '🎸', label: 'Scène' },
  food: { icon: '🍔', label: 'Restauration' },
  camping: { icon: '⛺', label: 'Camping' },
  vip: { icon: '⭐', label: 'VIP' },
};

const STATUS_CONFIG = {
  normal: { color: '#22c55e', label: 'Normal' },
  busy: { color: '#f59e0b', label: 'Affluence' },
  critical: { color: '#ef4444', label: 'Critique' },
  full: { color: '#dc2626', label: 'Plein' },
};

// Mock data
function generateMockZones(): Zone[] {
  const zones = [
    { name: 'Entrée principale', type: 'entrance' as const, max: 5000, assigned: true },
    { name: 'Entrée VIP', type: 'entrance' as const, max: 500, assigned: true },
    { name: 'Grande Scène', type: 'stage' as const, max: 15000, assigned: false },
    { name: 'Scène Electro', type: 'stage' as const, max: 8000, assigned: false },
    { name: 'Food Court', type: 'food' as const, max: 3000, assigned: false },
    { name: 'Zone Camping A', type: 'camping' as const, max: 2000, assigned: true },
    { name: 'Espace VIP', type: 'vip' as const, max: 300, assigned: false },
  ];

  return zones.map((z, i) => {
    const occupancyPercent = Math.random();
    const current = Math.floor(z.max * occupancyPercent);
    let status: Zone['status'] = 'normal';
    if (occupancyPercent > 0.95) {
      status = 'full';
    } else if (occupancyPercent > 0.85) {
      status = 'critical';
    } else if (occupancyPercent > 0.7) {
      status = 'busy';
    }

    return {
      id: `zone-${i + 1}`,
      name: z.name,
      type: z.type,
      currentOccupancy: current,
      maxCapacity: z.max,
      status,
      isAssigned: z.assigned,
      alertCount:
        status === 'critical' || status === 'full' ? Math.floor(Math.random() * 3) + 1 : 0,
      lastUpdate: new Date(Date.now() - Math.random() * 300000).toISOString(),
    };
  });
}

const ZoneCard = React.memo(({ zone, onPress }: { zone: Zone; onPress: () => void }) => {
  const typeConfig = ZONE_TYPE_CONFIG[zone.type];
  const statusConfig = STATUS_CONFIG[zone.status];
  const occupancyPercent = (zone.currentOccupancy / zone.maxCapacity) * 100;

  const timeSinceUpdate = Math.floor((Date.now() - new Date(zone.lastUpdate).getTime()) / 60000);

  return (
    <TouchableOpacity style={styles.zoneCard} onPress={onPress}>
      <View style={styles.zoneHeader}>
        <View style={styles.zoneInfo}>
          <View style={styles.zoneTitleRow}>
            <Text style={styles.zoneIcon}>{typeConfig.icon}</Text>
            <Text style={styles.zoneName}>{zone.name}</Text>
            {zone.isAssigned && (
              <View style={styles.assignedBadge}>
                <Text style={styles.assignedText}>Assigné</Text>
              </View>
            )}
          </View>
          <Text style={styles.zoneType}>{typeConfig.label}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
          <Text style={styles.statusText}>{statusConfig.label}</Text>
        </View>
      </View>

      <View style={styles.occupancyContainer}>
        <View style={styles.occupancyHeader}>
          <Text style={styles.occupancyLabel}>Occupation</Text>
          <Text style={styles.occupancyValue}>
            {zone.currentOccupancy.toLocaleString()} / {zone.maxCapacity.toLocaleString()}
          </Text>
        </View>
        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, occupancyPercent)}%`, backgroundColor: statusConfig.color },
            ]}
          />
        </View>
        <Text style={styles.occupancyPercent}>{occupancyPercent.toFixed(1)}%</Text>
      </View>

      <View style={styles.zoneFooter}>
        <Text style={styles.updateTime}>Mis à jour il y a {timeSinceUpdate} min</Text>
        {zone.alertCount > 0 && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertText}>🔔 {zone.alertCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

ZoneCard.displayName = 'ZoneCard';

export const StaffZonesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [zones, setZones] = useState<Zone[]>([]);
  const [filter, setFilter] = useState<ZoneFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    setZones(generateMockZones());
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadZones();
    setRefreshing(false);
  }, [loadZones]);

  const filteredZones = React.useMemo(() => {
    switch (filter) {
      case 'assigned':
        return zones.filter((z) => z.isAssigned);
      case 'alerts':
        return zones.filter((z) => z.alertCount > 0);
      default:
        return zones;
    }
  }, [zones, filter]);

  const stats = React.useMemo(() => {
    const totalOccupancy = zones.reduce((sum, z) => sum + z.currentOccupancy, 0);
    const totalCapacity = zones.reduce((sum, z) => sum + z.maxCapacity, 0);
    const alertZones = zones.filter((z) => z.alertCount > 0).length;
    return { totalOccupancy, totalCapacity, alertZones };
  }, [zones]);

  const handleZonePress = useCallback((_zone: Zone) => {
    // In real app, navigate to zone details
    // navigation.navigate('ZoneDetails', { zoneId: zone.id });
  }, []);

  const renderZone = useCallback(
    ({ item }: { item: Zone }) => <ZoneCard zone={item} onPress={() => handleZonePress(item)} />,
    [handleZonePress]
  );

  const keyExtractor = useCallback((item: Zone) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Zones</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalOccupancy.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Présents</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalCapacity.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Capacité</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, stats.alertZones > 0 && { color: '#f59e0b' }]}>
            {stats.alertZones}
          </Text>
          <Text style={styles.statLabel}>Alertes</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'assigned', 'alerts'] as ZoneFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f === 'all' ? 'Toutes' : f === 'assigned' ? 'Mes zones' : 'Alertes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Zones List */}
      <FlatList
        data={filteredZones}
        keyExtractor={keyExtractor}
        renderItem={renderZone}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune zone trouvée</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 20,
    color: colors.white,
  },
  title: {
    ...typography.h2,
    color: colors.white,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  statValue: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  zoneCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  zoneIcon: {
    fontSize: 20,
  },
  zoneName: {
    ...typography.h4,
    color: colors.white,
    fontWeight: '600',
  },
  assignedBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  assignedText: {
    ...typography.caption,
    color: '#3b82f6',
    fontWeight: '600',
  },
  zoneType: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  occupancyContainer: {
    marginBottom: spacing.md,
  },
  occupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  occupancyLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  occupancyValue: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  progressBackground: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  occupancyPercent: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  zoneFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  updateTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  alertBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  alertText: {
    ...typography.caption,
    color: '#f59e0b',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
});

export default StaffZonesScreen;
