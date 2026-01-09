/**
 * SyncIndicator Component
 * Shows sync status in UI with pending changes count and manual sync trigger
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Pressable,
} from 'react-native';

import { useOfflineStatus, useSyncProgress, usePendingMutations } from '../hooks';
import { SyncPhase } from '../services/sync';

// Props
export interface SyncIndicatorProps {
  // Display options
  showOfflineIndicator?: boolean;
  showPendingCount?: boolean;
  showSyncButton?: boolean;
  showProgress?: boolean;
  showLastSync?: boolean;

  // Style options
  position?: 'top' | 'bottom' | 'inline';
  variant?: 'compact' | 'expanded' | 'minimal';
  theme?: 'light' | 'dark';

  // Callbacks
  onSyncPress?: () => void;
  onOfflinePress?: () => void;

  // Custom styles
  containerStyle?: object;
}

/**
 * Get phase display text
 */
function getPhaseText(phase: SyncPhase): string {
  const phaseTexts: Record<SyncPhase, string> = {
    idle: 'Ready',
    preparing: 'Preparing...',
    authenticating: 'Authenticating...',
    pulling: 'Downloading...',
    resolving_conflicts: 'Resolving conflicts...',
    pushing: 'Uploading...',
    finalizing: 'Finalizing...',
    completed: 'Complete',
    failed: 'Failed',
  };

  return phaseTexts[phase] || phase;
}

/**
 * Format time ago
 */
function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Format duration
 */
function formatDuration(ms: number | null): string {
  if (!ms) return '';

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * SyncIndicator Component
 */
export function SyncIndicator({
  showOfflineIndicator = true,
  showPendingCount = true,
  showSyncButton = true,
  showProgress = true,
  showLastSync = true,
  position = 'inline',
  variant = 'compact',
  theme = 'light',
  onSyncPress,
  onOfflinePress,
  containerStyle,
}: SyncIndicatorProps): JSX.Element | null {
  // Hooks
  const offlineStatus = useOfflineStatus();
  const syncProgress = useSyncProgress();
  const pendingMutations = usePendingMutations();

  // Animation
  const [pulseAnim] = useState(new Animated.Value(1));
  const [spinAnim] = useState(new Animated.Value(0));

  // Derived state
  const isOnline = offlineStatus.isOnline;
  const isSyncing = syncProgress.isActive;
  const pendingCount = pendingMutations.pendingCount;
  const hasErrors = syncProgress.hasErrors || pendingMutations.failedCount > 0;

  /**
   * Pulse animation for pending changes
   */
  useEffect(() => {
    if (pendingCount > 0 && !isSyncing) {
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]);

      const loop = Animated.loop(pulse);
      loop.start();

      return () => loop.stop();
    }
  }, [pendingCount, isSyncing, pulseAnim]);

  /**
   * Spin animation for syncing
   */
  useEffect(() => {
    if (isSyncing) {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spin.start();

      return () => spin.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [isSyncing, spinAnim]);

  /**
   * Handle sync button press
   */
  const handleSyncPress = useCallback(async () => {
    if (onSyncPress) {
      onSyncPress();
    } else {
      await syncProgress.startSync(true);
    }
  }, [onSyncPress, syncProgress]);

  /**
   * Get status color
   */
  const getStatusColor = () => {
    if (!isOnline) return colors.offline;
    if (hasErrors) return colors.error;
    if (isSyncing) return colors.syncing;
    if (pendingCount > 0) return colors.pending;
    return colors.synced;
  };

  /**
   * Get status text
   */
  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return getPhaseText(syncProgress.phase);
    if (hasErrors) return 'Sync Error';
    if (pendingCount > 0) return `${pendingCount} pending`;
    return 'Synced';
  };

  // Theme colors
  const colors = theme === 'dark' ? darkColors : lightColors;

  // Render based on variant
  if (variant === 'minimal') {
    return (
      <View style={[styles.minimalContainer, containerStyle]}>
        <Animated.View
          style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(), transform: [{ scale: pulseAnim }] },
          ]}
        />
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View
        style={[
          styles.compactContainer,
          position === 'top' && styles.positionTop,
          position === 'bottom' && styles.positionBottom,
          { backgroundColor: colors.background },
          containerStyle,
        ]}
      >
        {/* Status indicator */}
        <View style={styles.compactStatus}>
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.syncing} />
          ) : (
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor() },
              ]}
            />
          )}
          <Text style={[styles.compactText, { color: colors.text }]}>
            {getStatusText()}
          </Text>
        </View>

        {/* Pending count badge */}
        {showPendingCount && pendingCount > 0 && !isSyncing && (
          <Animated.View
            style={[
              styles.pendingBadge,
              { backgroundColor: colors.pending, transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={styles.pendingText}>{pendingCount}</Text>
          </Animated.View>
        )}

        {/* Sync button */}
        {showSyncButton && isOnline && !isSyncing && (
          <TouchableOpacity
            onPress={handleSyncPress}
            style={[styles.syncButton, { backgroundColor: colors.buttonBackground }]}
          >
            <Text style={[styles.syncButtonText, { color: colors.buttonText }]}>
              Sync
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Expanded variant
  return (
    <View
      style={[
        styles.expandedContainer,
        position === 'top' && styles.positionTop,
        position === 'bottom' && styles.positionBottom,
        { backgroundColor: colors.background },
        containerStyle,
      ]}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.statusSection}>
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.syncing} />
          ) : (
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor() },
              ]}
            />
          )}
          <Text style={[styles.statusText, { color: colors.text }]}>
            {getStatusText()}
          </Text>
        </View>

        {showSyncButton && isOnline && (
          <TouchableOpacity
            onPress={handleSyncPress}
            disabled={isSyncing}
            style={[
              styles.syncButton,
              { backgroundColor: isSyncing ? colors.buttonDisabled : colors.buttonBackground },
            ]}
          >
            <Text style={[styles.syncButtonText, { color: colors.buttonText }]}>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar */}
      {showProgress && isSyncing && (
        <View style={styles.progressSection}>
          <View style={[styles.progressBar, { backgroundColor: colors.progressBackground }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.syncing,
                  width: `${syncProgress.progress}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {syncProgress.currentEntity && `${syncProgress.currentEntity} - `}
            {Math.round(syncProgress.progress)}%
            {syncProgress.estimatedTimeRemaining && (
              ` (${formatDuration(syncProgress.estimatedTimeRemaining)} remaining)`
            )}
          </Text>
        </View>
      )}

      {/* Details row */}
      <View style={styles.detailsRow}>
        {/* Offline indicator */}
        {showOfflineIndicator && !isOnline && (
          <Pressable onPress={onOfflinePress} style={styles.detailItem}>
            <View style={[styles.detailDot, { backgroundColor: colors.offline }]} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              Offline Mode
            </Text>
          </Pressable>
        )}

        {/* Pending changes */}
        {showPendingCount && pendingCount > 0 && (
          <View style={styles.detailItem}>
            <View style={[styles.detailDot, { backgroundColor: colors.pending }]} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {pendingCount} pending change{pendingCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Failed mutations */}
        {pendingMutations.failedCount > 0 && (
          <TouchableOpacity
            onPress={() => pendingMutations.replayAll()}
            style={styles.detailItem}
          >
            <View style={[styles.detailDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.detailText, { color: colors.error }]}>
              {pendingMutations.failedCount} failed - Tap to retry
            </Text>
          </TouchableOpacity>
        )}

        {/* Last sync */}
        {showLastSync && syncProgress.lastResult && (
          <View style={styles.detailItem}>
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              Last sync: {formatTimeAgo(syncProgress.startedAt)}
            </Text>
          </View>
        )}
      </View>

      {/* Conflict warning */}
      {pendingMutations.conflictCount > 0 && (
        <View style={[styles.conflictBanner, { backgroundColor: colors.warningBackground }]}>
          <Text style={[styles.conflictText, { color: colors.warning }]}>
            {pendingMutations.conflictCount} conflict{pendingMutations.conflictCount !== 1 ? 's' : ''} need resolution
          </Text>
        </View>
      )}
    </View>
  );
}

// Light theme colors
const lightColors = {
  background: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  buttonBackground: '#007AFF',
  buttonText: '#FFFFFF',
  buttonDisabled: '#CCCCCC',
  synced: '#34C759',
  syncing: '#007AFF',
  pending: '#FF9500',
  offline: '#8E8E93',
  error: '#FF3B30',
  warning: '#FF9500',
  warningBackground: '#FFF3CD',
  progressBackground: '#E5E5EA',
};

// Dark theme colors
const darkColors = {
  background: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  buttonBackground: '#0A84FF',
  buttonText: '#FFFFFF',
  buttonDisabled: '#3A3A3C',
  synced: '#30D158',
  syncing: '#0A84FF',
  pending: '#FF9F0A',
  offline: '#636366',
  error: '#FF453A',
  warning: '#FF9F0A',
  warningBackground: '#3A3A3C',
  progressBackground: '#3A3A3C',
};

const styles = StyleSheet.create({
  // Minimal variant
  minimalContainer: {
    padding: 4,
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },

  compactStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },

  compactText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Expanded variant
  expandedContainer: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Progress
  progressSection: {
    gap: 4,
  },

  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  progressText: {
    fontSize: 12,
  },

  // Details
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  detailDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  detailText: {
    fontSize: 12,
  },

  // Status dot
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Pending badge
  pendingBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pendingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Sync button
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Conflict banner
  conflictBanner: {
    padding: 8,
    borderRadius: 6,
  },

  conflictText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Position styles
  positionTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },

  positionBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
});

export default SyncIndicator;
