import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../types';

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.65;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ValidationStatus = 'valid' | 'invalid' | 'already_used' | 'expired' | 'scanning' | 'idle';

interface ScanHistoryItem {
  id: string;
  ticketCode: string;
  status: ValidationStatus;
  timestamp: Date;
  category?: string;
  holder?: string;
}

interface PendingOfflineScan {
  ticketCode: string;
  scannedAt: Date;
}

const STATUS_CONFIG: Record<
  ValidationStatus,
  { color: string; icon: string; message: string; vibration: number[] }
> = {
  valid: {
    color: '#22c55e',
    icon: '✓',
    message: 'ENTRÉE AUTORISÉE',
    vibration: [0, 100],
  },
  invalid: {
    color: '#ef4444',
    icon: '✕',
    message: 'BILLET INVALIDE',
    vibration: [0, 100, 100, 100, 100, 100],
  },
  already_used: {
    color: '#f59e0b',
    icon: '!',
    message: 'DÉJÀ UTILISÉ',
    vibration: [0, 200, 100, 200],
  },
  expired: {
    color: '#ef4444',
    icon: '⏰',
    message: 'BILLET EXPIRÉ',
    vibration: [0, 100, 100, 100, 100, 100],
  },
  scanning: {
    color: colors.primary,
    icon: '⋯',
    message: 'SCAN EN COURS...',
    vibration: [],
  },
  idle: {
    color: colors.textMuted,
    icon: '📷',
    message: 'SCANNER UN BILLET',
    vibration: [],
  },
};

const MAX_HISTORY_ITEMS = 10;

export const StaffValidationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [lastScan, setLastScan] = useState<ScanHistoryItem | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOfflineScans, setPendingOfflineScans] = useState<PendingOfflineScan[]>([]);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [scanCount, setScanCount] = useState({ valid: 0, invalid: 0 });

  const statusScale = useRef(new Animated.Value(1)).current;
  const statusOpacity = useRef(new Animated.Value(1)).current;

  // Simulate network status check
  useEffect(() => {
    const interval = setInterval(() => {
      // In real app, use @react-native-community/netinfo
      setIsOnline(Math.random() > 0.1); // Simulate 90% online
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Sync pending offline scans when back online
  useEffect(() => {
    if (isOnline && pendingOfflineScans.length > 0) {
      syncOfflineScans();
    }
  }, [isOnline, pendingOfflineScans.length]);

  const syncOfflineScans = useCallback(async () => {
    // In real app, send pending scans to server
    // Silently sync offline scans - logging handled by API response
    setPendingOfflineScans([]);
  }, [pendingOfflineScans]);

  const animateStatus = useCallback(
    (_isSuccess: boolean) => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(statusScale, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(statusOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(statusScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [statusScale, statusOpacity]
  );

  const handleScan = useCallback(
    async (ticketCode: string) => {
      if (status === 'scanning') {
        return;
      }

      setStatus('scanning');

      try {
        // Vibrate on scan start
        if (Platform.OS !== 'web') {
          Vibration.vibrate(50);
        }

        // Simulate API call or offline validation
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Parse ticket and validate
        let validationStatus: ValidationStatus;
        let category = 'Standard';
        let holder = 'Participant';

        // Simulate different scenarios based on ticket code
        const lastDigit = parseInt(ticketCode.slice(-1), 10) || 0;
        if (lastDigit <= 6) {
          validationStatus = 'valid';
          category = ['Standard', 'VIP', 'Backstage'][lastDigit % 3];
          holder = ['Jean Dupont', 'Marie Martin', 'Pierre Durand'][lastDigit % 3];
        } else if (lastDigit === 7) {
          validationStatus = 'already_used';
        } else if (lastDigit === 8) {
          validationStatus = 'expired';
        } else {
          validationStatus = 'invalid';
        }

        // If offline, queue for later sync
        if (!isOnline && validationStatus === 'valid') {
          setPendingOfflineScans((prev) => [...prev, { ticketCode, scannedAt: new Date() }]);
        }

        // Create history item
        const historyItem: ScanHistoryItem = {
          id: Date.now().toString(),
          ticketCode,
          status: validationStatus,
          timestamp: new Date(),
          category,
          holder,
        };

        // Update state
        setStatus(validationStatus);
        setLastScan(historyItem);
        setHistory((prev) => [historyItem, ...prev].slice(0, MAX_HISTORY_ITEMS));

        // Update counters
        setScanCount((prev) => ({
          valid: prev.valid + (validationStatus === 'valid' ? 1 : 0),
          invalid: prev.invalid + (validationStatus !== 'valid' ? 1 : 0),
        }));

        // Animate and vibrate based on result
        animateStatus(validationStatus === 'valid');
        const vibrationPattern = STATUS_CONFIG[validationStatus].vibration;
        if (vibrationPattern.length > 0 && Platform.OS !== 'web') {
          Vibration.vibrate(vibrationPattern);
        }

        // Auto-reset to idle after showing result
        setTimeout(() => {
          setStatus('idle');
        }, 2000);
      } catch {
        setStatus('invalid');
        if (Platform.OS !== 'web') {
          Vibration.vibrate([0, 100, 100, 100, 100, 100]);
        }
        setTimeout(() => setStatus('idle'), 2000);
      }
    },
    [status, isOnline, animateStatus]
  );

  const renderHistoryItem = ({ item }: { item: ScanHistoryItem }) => {
    const config = STATUS_CONFIG[item.status];
    return (
      <View style={[styles.historyItem, { borderLeftColor: config.color }]}>
        <View style={styles.historyItemContent}>
          <Text style={styles.historyCode}>{item.ticketCode}</Text>
          <Text style={styles.historyMeta}>
            {item.holder} • {item.category}
          </Text>
        </View>
        <View style={styles.historyItemRight}>
          <View style={[styles.historyStatus, { backgroundColor: config.color }]}>
            <Text style={styles.historyStatusText}>{config.icon}</Text>
          </View>
          <Text style={styles.historyTime}>
            {item.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const currentConfig = STATUS_CONFIG[status];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Text style={styles.headerButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Validation</Text>
          <View style={[styles.statusBadge, { backgroundColor: isOnline ? '#22c55e' : '#f59e0b' }]}>
            <Text style={styles.statusBadgeText}>
              {isOnline ? 'En ligne' : `Hors ligne (${pendingOfflineScans.length})`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setFlashEnabled(!flashEnabled)}
        >
          <Text style={styles.headerButtonText}>{flashEnabled ? '🔦' : '💡'}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#22c55e' }]}>{scanCount.valid}</Text>
          <Text style={styles.statLabel}>Validés</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{scanCount.invalid}</Text>
          <Text style={styles.statLabel}>Refusés</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{scanCount.valid + scanCount.invalid}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Status Display */}
      <Animated.View
        style={[
          styles.statusDisplay,
          { backgroundColor: currentConfig.color },
          { transform: [{ scale: statusScale }], opacity: statusOpacity },
        ]}
      >
        <Text style={styles.statusIcon}>{currentConfig.icon}</Text>
        <Text style={styles.statusMessage}>{currentConfig.message}</Text>
        {lastScan && status !== 'idle' && status !== 'scanning' && (
          <View style={styles.scanDetails}>
            <Text style={styles.scanDetailsText}>{lastScan.holder}</Text>
            <Text style={styles.scanDetailsText}>{lastScan.category}</Text>
          </View>
        )}
      </Animated.View>

      {/* Camera/Scanner Area (Placeholder) */}
      <View style={styles.scannerArea}>
        <View style={styles.scanFrame}>
          <View style={styles.scanCorner} />
          <View style={[styles.scanCorner, styles.topRight]} />
          <View style={[styles.scanCorner, styles.bottomLeft]} />
          <View style={[styles.scanCorner, styles.bottomRight]} />
        </View>
        <Text style={styles.scannerPlaceholder}>Camera Preview</Text>
      </View>

      {/* Demo Scan Buttons (Dev Only) */}
      {__DEV__ && (
        <View style={styles.demoButtons}>
          <TouchableOpacity
            style={[styles.demoButton, { backgroundColor: '#22c55e' }]}
            onPress={() => handleScan('FEST-TICKET-123456')}
          >
            <Text style={styles.demoButtonText}>Valid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.demoButton, { backgroundColor: '#f59e0b' }]}
            onPress={() => handleScan('FEST-TICKET-123457')}
          >
            <Text style={styles.demoButtonText}>Used</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.demoButton, { backgroundColor: '#ef4444' }]}
            onPress={() => handleScan('FEST-TICKET-123459')}
          >
            <Text style={styles.demoButtonText}>Invalid</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* History */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Derniers scans</Text>
        {history.length === 0 ? (
          <Text style={styles.historyEmpty}>Aucun scan récent</Text>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={renderHistoryItem}
            showsVerticalScrollIndicator={false}
            style={styles.historyList}
          />
        )}
      </View>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 20,
    color: colors.white,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  statValue: {
    ...typography.h2,
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
  statusDisplay: {
    marginHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusIcon: {
    fontSize: 48,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  statusMessage: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
    textAlign: 'center',
  },
  scanDetails: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  scanDetailsText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
  },
  scannerArea: {
    height: SCAN_AREA_SIZE,
    marginHorizontal: spacing.md,
    backgroundColor: '#1a1a1a',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    position: 'relative',
  },
  scanFrame: {
    position: 'absolute',
    width: SCAN_AREA_SIZE * 0.8,
    height: SCAN_AREA_SIZE * 0.8,
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary,
    borderWidth: 4,
    borderRadius: 4,
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    right: 0,
    left: undefined,
    borderLeftWidth: 0,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    top: undefined,
    borderTopWidth: 0,
    borderBottomWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: undefined,
    left: undefined,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  scannerPlaceholder: {
    ...typography.body,
    color: colors.textMuted,
  },
  demoButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  demoButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  demoButtonText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  historyTitle: {
    ...typography.h4,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  historyEmpty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderLeftWidth: 4,
  },
  historyItemContent: {
    flex: 1,
  },
  historyCode: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  historyMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  historyStatus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  historyStatusText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '700',
  },
  historyTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

export default StaffValidationScreen;
