import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/common';
import { BalanceCard, TransactionItem } from '../../components/wallet';
import { useWalletStore } from '../../store';
import { offlineService } from '../../services';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList, Transaction } from '../../types';

type WalletNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

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
];

export const WalletScreen: React.FC = () => {
  const navigation = useNavigation<WalletNavigationProp>();
  const { balance, transactions: storeTransactions } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);

  // Use mock data if store is empty
  const transactions = storeTransactions.length > 0 ? storeTransactions : mockTransactions;
  const recentTransactions = transactions.slice(0, 5);

  const mockBalance = {
    available: 104.5,
    pending: 25,
    currency: 'EUR',
  };

  const displayBalance = balance.available > 0 ? balance : mockBalance;

  const onRefresh = async () => {
    setRefreshing(true);
    await offlineService.syncAllData();
    setRefreshing(false);
  };

  const handleTopup = () => {
    navigation.navigate('Topup');
  };

  const handleViewTransactions = () => {
    navigation.navigate('Transactions');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Portefeuille</Text>
          <Text style={styles.subtitle}>Gerez votre solde cashless</Text>
        </View>

        {/* Balance Card */}
        <BalanceCard
          balance={displayBalance}
          onTopup={handleTopup}
          onViewTransactions={handleViewTransactions}
        />

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={styles.statValue}>
              {transactions.filter((t) => t.type === 'purchase').length}
            </Text>
            <Text style={styles.statLabel}>Achats</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>
              {transactions
                .filter((t) => t.type === 'purchase' && t.status === 'completed')
                .reduce((sum, t) => sum + t.amount, 0)
                .toFixed(0)}
              EUR
            </Text>
            <Text style={styles.statLabel}>Depense</Text>
          </Card>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions recentes</Text>
            <TouchableOpacity onPress={handleViewTransactions}>
              <Text style={styles.seeAll}>Voir tout →</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Aucune transaction</Text>
              <Text style={styles.emptySubtitle}>
                Vos transactions apparaitront ici
              </Text>
            </Card>
          )}
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoContent}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Paiement cashless</Text>
              <Text style={styles.infoDescription}>
                Utilisez votre bracelet ou l'app pour payer partout sur le site du festival.
                Rapide, simple et securise!
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  seeAll: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.surfaceLight,
  },
  infoContent: {
    flexDirection: 'row',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  infoDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default WalletScreen;
