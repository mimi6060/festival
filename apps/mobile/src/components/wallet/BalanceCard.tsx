import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import type { WalletBalance } from '../../types';

interface BalanceCardProps {
  balance: WalletBalance;
  onTopup: () => void;
  onViewTransactions: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  onTopup,
  onViewTransactions,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: balance.currency,
    }).format(amount);
  };

  return (
    <View style={styles.container}>
      {/* Gradient overlay effect */}
      <View style={styles.gradientOverlay} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.label}>Solde disponible</Text>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>💳</Text>
          </View>
        </View>

        {/* Balance */}
        <Text style={styles.balance}>{formatCurrency(balance.available)}</Text>

        {/* Pending */}
        {balance.pending > 0 && (
          <View style={styles.pendingRow}>
            <Text style={styles.pendingLabel}>En attente:</Text>
            <Text style={styles.pendingAmount}>
              {formatCurrency(balance.pending)}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onTopup}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionText}>Recharger</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onViewTransactions}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>Historique</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    ...shadows.lg,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '60%',
    height: '100%',
    backgroundColor: colors.primaryLight,
    opacity: 0.3,
    transform: [{ skewX: '-20deg' }, { translateX: 50 }],
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  balance: {
    ...typography.h1,
    color: colors.white,
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pendingLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    marginRight: spacing.xs,
  },
  pendingAmount: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 4,
  },
  actionDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: spacing.sm,
  },
  actionIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  actionText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
});

export default BalanceCard;
