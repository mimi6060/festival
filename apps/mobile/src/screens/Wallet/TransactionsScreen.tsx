import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TransactionItem } from '../../components/wallet';
import { useWalletStore } from '../../store';
import { offlineService } from '../../services';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList, Transaction } from '../../types';

type TransactionsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Transactions'>;

type FilterType = 'all' | 'topup' | 'purchase' | 'refund';

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'topup', label: 'Recharges' },
  { key: 'purchase', label: 'Achats' },
  { key: 'refund', label: 'Remboursements' },
];

// Mock transactions for demo
const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'topup',
    amount: 50,
    currency: 'EUR',
    description: 'Rechargement par carte bancaire',
    status: 'completed',
    createdAt: '2024-07-15T14:30:00Z',
  },
  {
    id: '2',
    type: 'purchase',
    amount: 12.5,
    currency: 'EUR',
    description: 'Food Truck - Burger Stand',
    status: 'completed',
    createdAt: '2024-07-15T13:45:00Z',
  },
  {
    id: '3',
    type: 'purchase',
    amount: 8,
    currency: 'EUR',
    description: 'Bar Central - 2x Bieres',
    status: 'completed',
    createdAt: '2024-07-15T12:20:00Z',
  },
  {
    id: '4',
    type: 'topup',
    amount: 100,
    currency: 'EUR',
    description: 'Rechargement initial',
    status: 'completed',
    createdAt: '2024-07-14T10:00:00Z',
  },
  {
    id: '5',
    type: 'purchase',
    amount: 25,
    currency: 'EUR',
    description: 'Merchandising - T-shirt Festival',
    status: 'pending',
    createdAt: '2024-07-15T15:00:00Z',
  },
  {
    id: '6',
    type: 'refund',
    amount: 5,
    currency: 'EUR',
    description: 'Remboursement - Annulation commande',
    status: 'completed',
    createdAt: '2024-07-14T16:00:00Z',
  },
  {
    id: '7',
    type: 'purchase',
    amount: 15,
    currency: 'EUR',
    description: 'Pizza Corner',
    status: 'completed',
    createdAt: '2024-07-14T13:00:00Z',
  },
  {
    id: '8',
    type: 'purchase',
    amount: 6,
    currency: 'EUR',
    description: 'Soft drinks',
    status: 'completed',
    createdAt: '2024-07-14T11:30:00Z',
  },
];

export const TransactionsScreen: React.FC = () => {
  const navigation = useNavigation<TransactionsNavigationProp>();
  const { transactions: storeTransactions } = useWalletStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Use mock data if store is empty
  const transactions = storeTransactions.length > 0 ? storeTransactions : mockTransactions;

  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'all') return transactions;
    return transactions.filter((t) => t.type === activeFilter);
  }, [transactions, activeFilter]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};

    filteredTransactions.forEach((transaction) => {
      const date = new Date(transaction.createdAt).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
    });

    return Object.entries(groups).map(([date, items]) => ({
      date,
      data: items,
    }));
  }, [filteredTransactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await offlineService.syncAllData();
    setRefreshing(false);
  };

  const renderFilter = ({ item }: { item: { key: FilterType; label: string } }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        activeFilter === item.key && styles.filterButtonActive,
      ]}
      onPress={() => setActiveFilter(item.key)}
    >
      <Text
        style={[
          styles.filterText,
          activeFilter === item.key && styles.filterTextActive,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>Aucune transaction</Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter === 'all'
          ? "Vous n'avez pas encore de transactions"
          : `Aucune transaction de type ${filters.find((f) => f.key === activeFilter)?.label.toLowerCase()}`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filters */}
      <FlatList
        horizontal
        data={filters}
        renderItem={renderFilter}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersList}
      />

      {/* Transactions List */}
      <FlatList
        data={groupedTransactions}
        keyExtractor={(item) => item.date}
        renderItem={({ item: group }) => (
          <View style={styles.group}>
            <Text style={styles.groupDate}>{group.date}</Text>
            {group.data.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.text,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  filtersList: {
    maxHeight: 50,
  },
  filtersContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  group: {
    marginBottom: spacing.lg,
  },
  groupDate: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textTransform: 'capitalize',
    marginBottom: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default TransactionsScreen;
