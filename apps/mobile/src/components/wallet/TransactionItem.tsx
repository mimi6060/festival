import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import type { Transaction } from '../../types';

// Transaction type config - memoized outside component
const TRANSACTION_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  topup: { icon: '💰', label: 'Rechargement' },
  purchase: { icon: '🛒', label: 'Achat' },
  refund: { icon: '↩️', label: 'Remboursement' },
  transfer: { icon: '↔️', label: 'Transfert' },
};

const DEFAULT_TYPE_CONFIG = { icon: '💳', label: 'Transaction' };

// Status color map - memoized outside component
const STATUS_COLORS: Record<string, string> = {
  completed: colors.success,
  pending: colors.warning,
  failed: colors.error,
};

// Positive transaction types
const POSITIVE_TYPES = new Set(['topup', 'refund']);

interface TransactionItemProps {
  transaction: Transaction;
}

// Memoized TransactionItem component for optimal performance
export const TransactionItem = memo<TransactionItemProps>(({
  transaction,
}) => {
  // Memoized type config
  const typeConfig = useMemo(() =>
    TRANSACTION_TYPE_CONFIG[transaction.type] || DEFAULT_TYPE_CONFIG,
    [transaction.type]
  );

  // Memoized status color
  const statusColor = useMemo(() =>
    STATUS_COLORS[transaction.status] || colors.textMuted,
    [transaction.status]
  );

  // Memoized positive check
  const isPositive = useMemo(() =>
    POSITIVE_TYPES.has(transaction.type),
    [transaction.type]
  );

  // Memoized currency formatting
  const formattedAmount = useMemo(() => {
    const prefix = isPositive ? '+' : '-';
    return `${prefix}${new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: transaction.currency,
    }).format(Math.abs(transaction.amount))}`;
  }, [transaction.amount, transaction.currency, isPositive]);

  // Memoized date formatting
  const formattedDate = useMemo(() => {
    const date = new Date(transaction.createdAt);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [transaction.createdAt]);

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{typeConfig.icon}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.leftContent}>
            <Text style={styles.type}>{typeConfig.label}</Text>
            <Text style={styles.description} numberOfLines={1}>
              {transaction.description}
            </Text>
          </View>
          <View style={styles.rightContent}>
            <Text
              style={[
                styles.amount,
                { color: isPositive ? colors.success : colors.text },
              ]}
            >
              {formattedAmount}
            </Text>
            <View style={styles.statusRow}>
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text style={[styles.status, { color: statusColor }]}>
                {transaction.status}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceLight,
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  leftContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  type: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  amount: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  status: {
    ...typography.caption,
    textTransform: 'capitalize',
  },
  date: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

export default TransactionItem;
