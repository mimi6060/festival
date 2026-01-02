import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import type { Transaction } from '../../types';

interface TransactionItemProps {
  transaction: Transaction;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
}) => {
  const getIcon = () => {
    switch (transaction.type) {
      case 'topup':
        return '💰';
      case 'purchase':
        return '🛒';
      case 'refund':
        return '↩️';
      case 'transfer':
        return '↔️';
      default:
        return '💳';
    }
  };

  const getTypeLabel = () => {
    switch (transaction.type) {
      case 'topup':
        return 'Rechargement';
      case 'purchase':
        return 'Achat';
      case 'refund':
        return 'Remboursement';
      case 'transfer':
        return 'Transfert';
      default:
        return 'Transaction';
    }
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'completed':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'failed':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const isPositive = transaction.type === 'topup' || transaction.type === 'refund';

  const formatCurrency = (amount: number) => {
    const prefix = isPositive ? '+' : '-';
    return `${prefix}${new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: transaction.currency,
    }).format(Math.abs(amount))}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getIcon()}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.leftContent}>
            <Text style={styles.type}>{getTypeLabel()}</Text>
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
              {formatCurrency(transaction.amount)}
            </Text>
            <View style={styles.statusRow}>
              <View
                style={[styles.statusDot, { backgroundColor: getStatusColor() }]}
              />
              <Text style={[styles.status, { color: getStatusColor() }]}>
                {transaction.status}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.date}>{formatDate(transaction.createdAt)}</Text>
      </View>
    </View>
  );
};

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
