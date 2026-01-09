/**
 * CacheDebugger - Development tool for cache inspection
 * Shows cache statistics, hit/miss rates, and provides cache management tools
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getCacheManager,
  getImageCache,
  getFestivalDataCache,
  type CacheStatistics,
  type CacheEvent,
} from '../../services/cache';
import { colors, spacing, borderRadius, typography } from '../../theme';

// Format bytes to human readable string
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Format percentage
const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

// Format timestamp
const formatTime = (timestamp: number | null): string => {
  if (!timestamp) return 'Never';
  return new Date(timestamp).toLocaleTimeString();
};

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
  </View>
);

interface CacheEventLogProps {
  events: CacheEvent[];
}

const CacheEventLog: React.FC<CacheEventLogProps> = ({ events }) => (
  <View style={styles.eventLog}>
    <Text style={styles.sectionTitle}>Recent Events</Text>
    <ScrollView style={styles.eventList} nestedScrollEnabled>
      {events.length === 0 ? (
        <Text style={styles.emptyText}>No events yet</Text>
      ) : (
        events.slice(-20).reverse().map((event, index) => (
          <View key={index} style={styles.eventItem}>
            <Text style={styles.eventType}>{event.type.toUpperCase()}</Text>
            <Text style={styles.eventDetail}>
              {event.type === 'set' && `Key: ${event.key} (${formatBytes(event.size)})`}
              {event.type === 'get' && `Key: ${event.key} (${event.hit ? 'HIT' : 'MISS'})`}
              {event.type === 'delete' && `Key: ${event.key}`}
              {event.type === 'evict' && `${event.keys.length} entries (${event.reason})`}
              {event.type === 'clear' && 'All entries cleared'}
              {event.type === 'restore' && `${event.entryCount} entries restored`}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  </View>
);

interface CacheDebuggerProps {
  visible: boolean;
  onClose: () => void;
}

export const CacheDebugger: React.FC<CacheDebuggerProps> = ({ visible, onClose }) => {
  // State
  const [stats, setStats] = useState<CacheStatistics | null>(null);
  const [imageCacheStats, setImageCacheStats] = useState<any>(null);
  const [events, setEvents] = useState<CacheEvent[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'general' | 'images' | 'events'>('general');

  // Get cache instances
  const cacheManager = getCacheManager();
  const imageCache = getImageCache();
  const festivalCache = getFestivalDataCache();

  // Update stats
  const updateStats = useCallback(() => {
    setStats(cacheManager.getStatistics());
    setImageCacheStats(imageCache.getStats());
  }, [cacheManager, imageCache]);

  // Subscribe to events
  useEffect(() => {
    if (!visible) return;

    updateStats();

    const unsubscribe = cacheManager.subscribe((event) => {
      setEvents((prev) => [...prev, event]);
      if (autoRefresh) {
        updateStats();
      }
    });

    return unsubscribe;
  }, [visible, cacheManager, autoRefresh, updateStats]);

  // Auto refresh
  useEffect(() => {
    if (!visible || !autoRefresh) return;

    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [visible, autoRefresh, updateStats]);

  // Clear general cache
  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await cacheManager.clear();
            setEvents([]);
            updateStats();
          },
        },
      ]
    );
  }, [cacheManager, updateStats]);

  // Clear image cache
  const handleClearImageCache = useCallback(() => {
    Alert.alert(
      'Clear Image Cache',
      'Are you sure you want to clear all cached images?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await imageCache.clear();
            updateStats();
          },
        },
      ]
    );
  }, [imageCache, updateStats]);

  // Clear festival cache
  const handleClearFestivalCache = useCallback(() => {
    Alert.alert(
      'Clear Festival Cache',
      'Are you sure you want to clear festival data cache?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await festivalCache.clearFestivalData();
            updateStats();
          },
        },
      ]
    );
  }, [festivalCache, updateStats]);

  // Force eviction
  const handleForceEviction = useCallback(async () => {
    const evicted = await cacheManager.evict('manual');
    Alert.alert('Eviction Complete', `Evicted ${evicted.length} entries`);
    updateStats();
  }, [cacheManager, updateStats]);

  // Clear events log
  const handleClearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const renderGeneralStats = () => (
    <ScrollView style={styles.tabContent}>
      {stats && (
        <>
          <Text style={styles.sectionTitle}>Cache Statistics</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Entries" value={stats.entryCount} />
            <StatCard label="Total Size" value={formatBytes(stats.totalSize)} />
            <StatCard
              label="Hit Rate"
              value={formatPercent(stats.hitRate)}
              color={stats.hitRate > 0.7 ? colors.success : stats.hitRate > 0.4 ? colors.warning : colors.error}
            />
            <StatCard label="Hits" value={stats.hits} color={colors.success} />
            <StatCard label="Misses" value={stats.misses} color={colors.error} />
            <StatCard label="Evictions" value={stats.evictions} />
            <StatCard
              label="Avg Access Time"
              value={`${stats.averageAccessTime.toFixed(2)}ms`}
            />
            <StatCard
              label="Last Eviction"
              value={formatTime(stats.lastEvictionAt)}
            />
          </View>

          <Text style={styles.sectionTitle}>By Priority</Text>
          <View style={styles.priorityList}>
            <View style={styles.priorityItem}>
              <Text style={styles.priorityLabel}>Critical</Text>
              <Text style={styles.priorityValue}>{stats.byPriority[4] || 0}</Text>
            </View>
            <View style={styles.priorityItem}>
              <Text style={styles.priorityLabel}>High</Text>
              <Text style={styles.priorityValue}>{stats.byPriority[3] || 0}</Text>
            </View>
            <View style={styles.priorityItem}>
              <Text style={styles.priorityLabel}>Normal</Text>
              <Text style={styles.priorityValue}>{stats.byPriority[2] || 0}</Text>
            </View>
            <View style={styles.priorityItem}>
              <Text style={styles.priorityLabel}>Low</Text>
              <Text style={styles.priorityValue}>{stats.byPriority[1] || 0}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>By Tag</Text>
          <View style={styles.tagList}>
            {Object.entries(stats.byTag).map(([tag, count]) => (
              <View key={tag} style={styles.tagItem}>
                <Text style={styles.tagName}>{tag}</Text>
                <Text style={styles.tagCount}>{count}</Text>
              </View>
            ))}
            {Object.keys(stats.byTag).length === 0 && (
              <Text style={styles.emptyText}>No tagged entries</Text>
            )}
          </View>
        </>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleClearCache}>
          <Text style={styles.actionButtonText}>Clear All Cache</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleClearFestivalCache}>
          <Text style={styles.actionButtonText}>Clear Festival Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleForceEviction}>
          <Text style={styles.actionButtonText}>Force Eviction</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderImageStats = () => (
    <ScrollView style={styles.tabContent}>
      {imageCacheStats && (
        <>
          <Text style={styles.sectionTitle}>Image Cache Statistics</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Images" value={imageCacheStats.imageCount} />
            <StatCard label="Disk Size" value={formatBytes(imageCacheStats.totalDiskSize)} />
            <StatCard label="Memory Size" value={formatBytes(imageCacheStats.totalMemorySize)} />
            <StatCard
              label="Hit Rate"
              value={formatPercent(imageCacheStats.hitRate)}
              color={imageCacheStats.hitRate > 0.7 ? colors.success : colors.warning}
            />
            <StatCard label="Hits" value={imageCacheStats.hits} color={colors.success} />
            <StatCard label="Misses" value={imageCacheStats.misses} color={colors.error} />
            <StatCard label="Prefetched" value={imageCacheStats.prefetchedCount} />
            <StatCard label="Failed Prefetch" value={imageCacheStats.failedPrefetchCount} />
          </View>

          <Text style={styles.sectionTitle}>Cached URLs</Text>
          <ScrollView style={styles.urlList} nestedScrollEnabled>
            {imageCache.getCachedUrls().slice(0, 20).map((url, index) => (
              <Text key={index} style={styles.urlItem} numberOfLines={1}>
                {url}
              </Text>
            ))}
            {imageCache.getCachedUrls().length === 0 && (
              <Text style={styles.emptyText}>No cached images</Text>
            )}
            {imageCache.getCachedUrls().length > 20 && (
              <Text style={styles.moreText}>
                + {imageCache.getCachedUrls().length - 20} more...
              </Text>
            )}
          </ScrollView>
        </>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleClearImageCache}>
          <Text style={styles.actionButtonText}>Clear Image Cache</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderEventsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.eventsHeader}>
        <Text style={styles.sectionTitle}>Event Log ({events.length})</Text>
        <TouchableOpacity onPress={handleClearEvents}>
          <Text style={styles.clearEventsText}>Clear</Text>
        </TouchableOpacity>
      </View>
      <CacheEventLog events={events} />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Cache Debugger</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.autoRefreshRow}>
          <Text style={styles.autoRefreshLabel}>Auto Refresh</Text>
          <Switch
            value={autoRefresh}
            onValueChange={setAutoRefresh}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={autoRefresh ? colors.primary : colors.textMuted}
          />
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'general' && styles.tabActive]}
            onPress={() => setSelectedTab('general')}
          >
            <Text style={[styles.tabText, selectedTab === 'general' && styles.tabTextActive]}>
              General
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'images' && styles.tabActive]}
            onPress={() => setSelectedTab('images')}
          >
            <Text style={[styles.tabText, selectedTab === 'images' && styles.tabTextActive]}>
              Images
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'events' && styles.tabActive]}
            onPress={() => setSelectedTab('events')}
          >
            <Text style={[styles.tabText, selectedTab === 'events' && styles.tabTextActive]}>
              Events
            </Text>
          </TouchableOpacity>
        </View>

        {selectedTab === 'general' && renderGeneralStats()}
        {selectedTab === 'images' && renderImageStats()}
        {selectedTab === 'events' && renderEventsTab()}
      </SafeAreaView>
    </Modal>
  );
};

// Floating debug button component
interface CacheDebugButtonProps {
  onPress: () => void;
}

export const CacheDebugButton: React.FC<CacheDebugButtonProps> = ({ onPress }) => {
  const [hitRate, setHitRate] = useState(0);

  useEffect(() => {
    const updateHitRate = () => {
      const stats = getCacheManager().getStatistics();
      setHitRate(stats.hitRate);
    };

    updateHitRate();
    const interval = setInterval(updateHitRate, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TouchableOpacity style={styles.debugButton} onPress={onPress}>
      <Text style={styles.debugButtonText}>
        Cache {formatPercent(hitRate)}
      </Text>
    </TouchableOpacity>
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
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  closeButton: {
    ...typography.body,
    color: colors.primary,
  },
  autoRefreshRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  autoRefreshLabel: {
    ...typography.body,
    color: colors.text,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabContent: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  statCard: {
    width: '50%',
    padding: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
  },
  priorityList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  priorityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  priorityLabel: {
    ...typography.body,
    color: colors.text,
  },
  priorityValue: {
    ...typography.body,
    color: colors.textSecondary,
  },
  tagList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  tagItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  tagName: {
    ...typography.body,
    color: colors.text,
  },
  tagCount: {
    ...typography.body,
    color: colors.primary,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  urlList: {
    maxHeight: 200,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  urlItem: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingVertical: 2,
  },
  moreText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    ...typography.button,
    color: colors.error,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearEventsText: {
    ...typography.bodySmall,
    color: colors.primary,
  },
  eventLog: {
    flex: 1,
  },
  eventList: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  eventItem: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventType: {
    ...typography.caption,
    color: colors.primary,
    width: 70,
    fontWeight: '600',
  },
  eventDetail: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  debugButton: {
    position: 'absolute',
    bottom: 100,
    right: spacing.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  debugButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default CacheDebugger;
