import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiService } from '../../services/api';
import { colors, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../types';
import type { Vendor, VendorType } from '../../types/vendor';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'VendorSelect'>;

const VENDOR_TYPE_LABELS: Record<VendorType, { label: string; icon: string }> = {
  BAR: { label: 'Bar', icon: '🍺' },
  FOOD: { label: 'Food', icon: '🍔' },
  DRINK: { label: 'Boissons', icon: '🥤' },
  MERCHANDISE: { label: 'Merch', icon: '👕' },
};

export const VendorSelectScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<VendorType | 'all'>('all');

  const loadVendors = useCallback(async () => {
    try {
      const response = await apiService.get<{ data: Vendor[] }>('/vendors?isOpen=true');
      setVendors(response.data);
      setFilteredVendors(response.data);
    } catch (error) {
      console.error('Failed to load vendors:', error);
      // Use mock data for demo
      const mockVendors: Vendor[] = [
        {
          id: '1',
          name: 'Bar Principal',
          type: 'BAR',
          description: 'Bieres, cocktails, softs',
          isOpen: true,
          qrMenuCode: 'BAR001',
        },
        {
          id: '2',
          name: 'Food Truck Tacos',
          type: 'FOOD',
          description: 'Tacos, burritos, quesadillas',
          isOpen: true,
          qrMenuCode: 'FOOD001',
        },
        {
          id: '3',
          name: 'Stand Boissons',
          type: 'DRINK',
          description: 'Eau, jus, energy drinks',
          isOpen: true,
          qrMenuCode: 'DRINK001',
        },
        {
          id: '4',
          name: 'Merch Festival',
          type: 'MERCHANDISE',
          description: 'T-shirts, casquettes, goodies',
          isOpen: true,
          qrMenuCode: 'MERCH001',
        },
        {
          id: '5',
          name: 'Bar VIP',
          type: 'BAR',
          description: 'Cocktails premium, champagne',
          isOpen: true,
          qrMenuCode: 'BAR002',
        },
      ];
      setVendors(mockVendors);
      setFilteredVendors(mockVendors);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  useEffect(() => {
    let filtered = vendors;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter((v) => v.type === selectedType);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) => v.name.toLowerCase().includes(query) || v.description?.toLowerCase().includes(query)
      );
    }

    setFilteredVendors(filtered);
  }, [vendors, selectedType, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadVendors();
    setRefreshing(false);
  }, [loadVendors]);

  const handleSelectVendor = (vendor: Vendor) => {
    navigation.navigate('VendorPOS', { vendorId: vendor.id });
  };

  const renderVendorItem = ({ item }: { item: Vendor }) => {
    const typeInfo = VENDOR_TYPE_LABELS[item.type];

    return (
      <TouchableOpacity
        style={styles.vendorCard}
        onPress={() => handleSelectVendor(item)}
        activeOpacity={0.7}
      >
        <View style={styles.vendorIcon}>
          <Text style={styles.vendorIconText}>{typeInfo.icon}</Text>
        </View>
        <View style={styles.vendorInfo}>
          <Text style={styles.vendorName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.vendorDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          <View style={styles.vendorMeta}>
            <View style={styles.vendorTypeBadge}>
              <Text style={styles.vendorTypeText}>{typeInfo.label}</Text>
            </View>
            <View style={[styles.statusDot, item.isOpen && styles.statusDotOpen]} />
            <Text style={styles.statusText}>{item.isOpen ? 'Ouvert' : 'Ferme'}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>→</Text>
      </TouchableOpacity>
    );
  };

  const vendorTypes: (VendorType | 'all')[] = ['all', 'BAR', 'FOOD', 'DRINK', 'MERCHANDISE'];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.festivalPink} />
          <Text style={styles.loadingText}>Chargement des points de vente...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choisir un point de vente</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un stand..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Type Filter */}
      <View style={styles.filterContainer}>
        {vendorTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterChip, selectedType === type && styles.filterChipActive]}
            onPress={() => setSelectedType(type)}
          >
            <Text
              style={[styles.filterChipText, selectedType === type && styles.filterChipTextActive]}
            >
              {type === 'all'
                ? 'Tous'
                : VENDOR_TYPE_LABELS[type].icon + ' ' + VENDOR_TYPE_LABELS[type].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Vendor List */}
      <FlatList
        data={filteredVendors}
        keyExtractor={(item) => item.id}
        renderItem={renderVendorItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.festivalPink}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={styles.emptyText}>Aucun point de vente trouve</Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: colors.text,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    marginLeft: spacing.md,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.festivalPurple,
    borderColor: colors.festivalPink,
  },
  filterChipText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vendorIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.festivalPurple + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorIconText: {
    fontSize: 24,
  },
  vendorInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  vendorName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  vendorDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  vendorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  vendorTypeBadge: {
    backgroundColor: colors.festivalPink + '30',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vendorTypeText: {
    ...typography.caption,
    color: colors.festivalPink,
    fontWeight: '600',
    fontSize: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
    marginLeft: spacing.xs,
  },
  statusDotOpen: {
    backgroundColor: colors.success,
  },
  statusText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  chevron: {
    fontSize: 18,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
});

export default VendorSelectScreen;
