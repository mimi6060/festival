/**
 * OfflineIndicator Component
 * Prominent visual indicator for offline mode status
 * Shows when app is offline and sync status
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

import { useOfflineStatus } from '../hooks';

// Props
export interface OfflineIndicatorProps {
  // Display options
  showWhenOnline?: boolean;
  showSyncStatus?: boolean;
  showPendingCount?: boolean;

  // Position
  position?: 'top' | 'bottom';

  // Callbacks
  onPress?: () => void;
  onSyncPress?: () => void;

  // Custom styles
  style?: object;
}

/**
 * OfflineIndicator Component
 * Banner that appears when the device is offline
 */
export function OfflineIndicator({
  showWhenOnline = false,
  showSyncStatus = true,
  showPendingCount = true,
  position = 'top',
  onPress,
  onSyncPress,
  style,
}: OfflineIndicatorProps): JSX.Element | null {
  const offlineStatus = useOfflineStatus();

  // Animation values
  const slideAnim = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Determine if we should show the indicator
  const shouldShow = !offlineStatus.isOnline || (showWhenOnline && offlineStatus.isSyncing);

  // Slide animation when visibility changes
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: shouldShow ? 0 : (position === 'top' ? -100 : 100),
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [shouldShow, slideAnim, position]);

  // Pulse animation for offline state
  useEffect(() => {
    if (!offlineStatus.isOnline) {
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]);

      const loop = Animated.loop(pulse);
      loop.start();

      return () => loop.stop();
    }
  }, [offlineStatus.isOnline, pulseAnim]);

  // Don't render if not visible
  if (!shouldShow && !showWhenOnline) {
    return null;
  }

  // Get status message
  const getStatusMessage = () => {
    if (!offlineStatus.isOnline) {
      const pendingText = showPendingCount && offlineStatus.pendingChanges > 0
        ? ` - ${offlineStatus.pendingChanges} pending`
        : '';
      return `Offline Mode${pendingText}`;
    }

    if (offlineStatus.isSyncing) {
      return 'Syncing...';
    }

    return 'Online';
  };

  // Get connection quality indicator
  const getQualityIndicator = () => {
    switch (offlineStatus.connectionQuality) {
      case 'excellent':
        return { bars: 4, color: '#34C759' };
      case 'good':
        return { bars: 3, color: '#34C759' };
      case 'fair':
        return { bars: 2, color: '#FF9500' };
      case 'poor':
        return { bars: 1, color: '#FF3B30' };
      default:
        return { bars: 0, color: '#8E8E93' };
    }
  };

  const quality = getQualityIndicator();

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top' ? styles.positionTop : styles.positionBottom,
        {
          transform: [{ translateY: slideAnim }],
          opacity: pulseAnim,
        },
        style,
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity
          style={[
            styles.content,
            !offlineStatus.isOnline ? styles.contentOffline : styles.contentOnline,
          ]}
          onPress={onPress}
          activeOpacity={0.8}
        >
          {/* Status icon */}
          <View style={styles.iconContainer}>
            {!offlineStatus.isOnline ? (
              // Offline icon - cloud with slash
              <View style={styles.offlineIcon}>
                <Text style={styles.offlineIconText}>OFFLINE</Text>
              </View>
            ) : (
              // Connection quality bars
              <View style={styles.qualityBars}>
                {[1, 2, 3, 4].map((bar) => (
                  <View
                    key={bar}
                    style={[
                      styles.qualityBar,
                      {
                        height: 4 + bar * 3,
                        backgroundColor: bar <= quality.bars ? quality.color : '#E5E5EA',
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Status text */}
          <View style={styles.textContainer}>
            <Text style={[
              styles.statusText,
              !offlineStatus.isOnline && styles.offlineText,
            ]}>
              {getStatusMessage()}
            </Text>

            {showSyncStatus && offlineStatus.lastSyncAt && offlineStatus.isOnline && (
              <Text style={styles.lastSyncText}>
                Last sync: {formatTimeAgo(offlineStatus.lastSyncAt)}
              </Text>
            )}
          </View>

          {/* Sync button (only when online with pending changes) */}
          {offlineStatus.isOnline && offlineStatus.pendingChanges > 0 && !offlineStatus.isSyncing && (
            <TouchableOpacity
              style={styles.syncButton}
              onPress={onSyncPress}
            >
              <Text style={styles.syncButtonText}>Sync Now</Text>
            </TouchableOpacity>
          )}

          {/* Syncing indicator */}
          {offlineStatus.isSyncing && (
            <View style={styles.syncingIndicator}>
              <Animated.View style={[styles.syncingDot, { opacity: pulseAnim }]} />
              <Text style={styles.syncingText}>Syncing</Text>
            </View>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </Animated.View>
  );
}

/**
 * Format time ago helper
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) { return 'Just now'; }
  if (diffMins < 60) { return `${diffMins}m ago`; }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) { return `${diffHours}h ago`; }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
  },
  positionTop: {
    top: 0,
  },
  positionBottom: {
    bottom: 0,
  },
  safeArea: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  contentOffline: {
    backgroundColor: '#FF3B30',
  },
  contentOnline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  iconContainer: {
    marginRight: 12,
  },
  offlineIcon: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  offlineIconText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  qualityBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  qualityBar: {
    width: 4,
    borderRadius: 2,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  offlineText: {
    color: '#FFFFFF',
  },
  lastSyncText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  syncingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  syncingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 6,
  },
  syncingText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default OfflineIndicator;
