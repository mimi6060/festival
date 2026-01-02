/**
 * NFCStatus Component
 * Displays the current NFC status with visual indicators
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import type { NFCStatus as NFCStatusType, NFCError } from '../../services/nfc';

// Status Props
export interface NFCStatusProps {
  status: NFCStatusType;
  isScanning?: boolean;
  error?: NFCError | null;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// Status configurations
const STATUS_CONFIG: Record<NFCStatusType, {
  color: string;
  label: string;
  icon: string;
}> = {
  unavailable: {
    color: colors.textMuted,
    label: 'NFC indisponible',
    icon: '📵',
  },
  disabled: {
    color: colors.warning,
    label: 'NFC desactive',
    icon: '📴',
  },
  ready: {
    color: colors.success,
    label: 'NFC pret',
    icon: '📶',
  },
  scanning: {
    color: colors.primary,
    label: 'Scan en cours...',
    icon: '📡',
  },
  error: {
    color: colors.error,
    label: 'Erreur NFC',
    icon: '⚠️',
  },
};

export const NFCStatus: React.FC<NFCStatusProps> = ({
  status,
  isScanning = false,
  error = null,
  showLabel = true,
  size = 'medium',
}) => {
  // Determine effective status
  const effectiveStatus = error ? 'error' : isScanning ? 'scanning' : status;
  const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.error;

  // Size configurations
  const sizes = {
    small: {
      container: styles.containerSmall,
      dot: styles.dotSmall,
      text: styles.textSmall,
      icon: 16,
    },
    medium: {
      container: styles.containerMedium,
      dot: styles.dotMedium,
      text: styles.textMedium,
      icon: 20,
    },
    large: {
      container: styles.containerLarge,
      dot: styles.dotLarge,
      text: styles.textLarge,
      icon: 24,
    },
  };

  const sizeConfig = sizes[size];

  return (
    <View style={[styles.container, sizeConfig.container]}>
      {/* Status Indicator */}
      <View style={styles.indicatorContainer}>
        {isScanning ? (
          <ActivityIndicator
            size={size === 'small' ? 'small' : 'small'}
            color={config.color}
          />
        ) : (
          <View style={[styles.dot, sizeConfig.dot, { backgroundColor: config.color }]} />
        )}
      </View>

      {/* Status Icon */}
      <Text style={[styles.icon, { fontSize: sizeConfig.icon }]}>
        {config.icon}
      </Text>

      {/* Status Label */}
      {showLabel && (
        <Text style={[styles.label, sizeConfig.text, { color: config.color }]}>
          {error ? error.message || config.label : config.label}
        </Text>
      )}
    </View>
  );
};

// Inline status indicator (compact version)
export interface NFCStatusIndicatorProps {
  isEnabled: boolean;
  isScanning?: boolean;
}

export const NFCStatusIndicator: React.FC<NFCStatusIndicatorProps> = ({
  isEnabled,
  isScanning = false,
}) => {
  const color = isScanning
    ? colors.primary
    : isEnabled
    ? colors.success
    : colors.warning;

  return (
    <View style={styles.indicatorOnly}>
      {isScanning ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <View style={[styles.indicatorDot, { backgroundColor: color }]} />
      )}
    </View>
  );
};

// Status Badge (for headers/cards)
export interface NFCStatusBadgeProps {
  status: NFCStatusType;
  isScanning?: boolean;
}

export const NFCStatusBadge: React.FC<NFCStatusBadgeProps> = ({
  status,
  isScanning = false,
}) => {
  const effectiveStatus = isScanning ? 'scanning' : status;
  const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.error;

  return (
    <View style={[styles.badge, { backgroundColor: config.color + '20' }]}>
      {isScanning && (
        <ActivityIndicator
          size="small"
          color={config.color}
          style={styles.badgeSpinner}
        />
      )}
      <Text style={[styles.badgeIcon]}>{config.icon}</Text>
      <Text style={[styles.badgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

// Connection Status (for detailed view)
export interface NFCConnectionStatusProps {
  isSupported: boolean;
  isEnabled: boolean;
  isReady: boolean;
  isScanning: boolean;
}

export const NFCConnectionStatus: React.FC<NFCConnectionStatusProps> = ({
  isSupported,
  isEnabled,
  isReady,
  isScanning,
}) => {
  return (
    <View style={styles.connectionContainer}>
      <Text style={styles.connectionTitle}>Etat de la connexion NFC</Text>

      <View style={styles.connectionRow}>
        <Text style={styles.connectionLabel}>Support NFC</Text>
        <View style={[
          styles.connectionDot,
          { backgroundColor: isSupported ? colors.success : colors.error }
        ]} />
        <Text style={[
          styles.connectionValue,
          { color: isSupported ? colors.success : colors.error }
        ]}>
          {isSupported ? 'Oui' : 'Non'}
        </Text>
      </View>

      <View style={styles.connectionRow}>
        <Text style={styles.connectionLabel}>NFC active</Text>
        <View style={[
          styles.connectionDot,
          { backgroundColor: isEnabled ? colors.success : colors.warning }
        ]} />
        <Text style={[
          styles.connectionValue,
          { color: isEnabled ? colors.success : colors.warning }
        ]}>
          {isEnabled ? 'Oui' : 'Non'}
        </Text>
      </View>

      <View style={styles.connectionRow}>
        <Text style={styles.connectionLabel}>Pret</Text>
        <View style={[
          styles.connectionDot,
          { backgroundColor: isReady ? colors.success : colors.textMuted }
        ]} />
        <Text style={[
          styles.connectionValue,
          { color: isReady ? colors.success : colors.textMuted }
        ]}>
          {isReady ? 'Oui' : 'Non'}
        </Text>
      </View>

      <View style={styles.connectionRow}>
        <Text style={styles.connectionLabel}>Scan en cours</Text>
        {isScanning ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View style={[
            styles.connectionDot,
            { backgroundColor: colors.textMuted }
          ]} />
        )}
        <Text style={[
          styles.connectionValue,
          { color: isScanning ? colors.primary : colors.textMuted }
        ]}>
          {isScanning ? 'Oui' : 'Non'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  containerSmall: {
    padding: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  containerMedium: {
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  containerLarge: {
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  indicatorContainer: {
    marginRight: spacing.xs,
  },
  dot: {
    borderRadius: 50,
  },
  dotSmall: {
    width: 6,
    height: 6,
  },
  dotMedium: {
    width: 8,
    height: 8,
  },
  dotLarge: {
    width: 10,
    height: 10,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontWeight: '500',
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
  textLarge: {
    fontSize: 14,
  },

  // Indicator only
  indicatorOnly: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  badgeSpinner: {
    marginRight: spacing.xs,
  },
  badgeIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Connection Status
  connectionContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  connectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  connectionLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  connectionValue: {
    ...typography.bodySmall,
    fontWeight: '600',
    width: 40,
  },
});

export default NFCStatus;
