import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { Button } from '../../components/common';
import { useVendorStore } from '../../store/vendorStore';
import { useAuthStore } from '../../store';
import { colors, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../types';
import type { VendorProduct, PaymentMethod, CartItem } from '../../types/vendor';

type POSNavigationProp = NativeStackNavigationProp<RootStackParamList, 'VendorPOS'>;
type POSScreenProps = NativeStackScreenProps<RootStackParamList, 'VendorPOS'>;

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'CASHLESS', label: 'Cashless', icon: '💳' },
  { key: 'CARD', label: 'Carte', icon: '💳' },
  { key: 'CASH', label: 'Especes', icon: '💵' },
];

export const VendorPOSScreen: React.FC = () => {
  const navigation = useNavigation<POSNavigationProp>();
  const route = useRoute<POSScreenProps['route']>();
  const { user } = useAuthStore();
  const {
    vendor,
    products,
    cart,
    isLoading,
    error,
    loadVendorById,
    loadVendorByQR,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    getCartTotal,
    getCartItemCount,
    createOrder,
    clearError,
  } = useVendorStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCart, setShowCart] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('CASHLESS');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Check user permissions
  const hasPermission = useCallback(() => {
    const allowedRoles = ['ADMIN', 'ORGANIZER', 'CASHIER', 'STAFF'];
    return user?.role && allowedRoles.includes(user.role);
  }, [user?.role]);

  useEffect(() => {
    if (!hasPermission()) {
      Alert.alert('Acces refuse', "Vous n'avez pas les permissions pour acceder au POS", [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    // Load vendor from route params
    const { vendorId, qrCode } = route.params || {};
    if (qrCode) {
      loadVendorByQR(qrCode);
    } else if (vendorId) {
      loadVendorById(vendorId);
    }
  }, [route.params, loadVendorById, loadVendorByQR, hasPermission, navigation]);

  // Get unique categories
  const categories = ['all', ...new Set(products.map((p) => p.category))];

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (!p.isAvailable) {
      return false;
    }
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (product: VendorProduct) => {
    if (product.stock !== null && product.stock <= 0) {
      Alert.alert('Rupture de stock', 'Ce produit est en rupture de stock');
      return;
    }
    addToCart(product);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Panier vide', 'Ajoutez des produits au panier');
      return;
    }

    setIsProcessing(true);
    try {
      const order = await createOrder(selectedPayment);
      Alert.alert(
        'Commande confirmee',
        `Commande #${order.orderNumber}\nTotal: ${order.totalAmount.toFixed(2)} EUR`,
        [
          {
            text: 'Nouvelle commande',
            onPress: () => {
              clearCart();
              setShowCart(false);
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Erreur lors du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderProductItem = ({ item }: { item: VendorProduct }) => {
    const inCart = cart.find((c) => c.product.id === item.id);
    const isOutOfStock = item.stock !== null && item.stock <= 0;

    return (
      <TouchableOpacity
        style={[styles.productCard, isOutOfStock && styles.productCardDisabled]}
        onPress={() => !isOutOfStock && handleAddToCart(item)}
        disabled={isOutOfStock}
        activeOpacity={0.7}
      >
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.productDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.productMeta}>
            <Text style={styles.productPrice}>{item.price.toFixed(2)} EUR</Text>
            {item.stock !== null && (
              <Text style={[styles.stockBadge, isOutOfStock && styles.stockBadgeEmpty]}>
                {isOutOfStock ? 'Rupture' : `Stock: ${item.stock}`}
              </Text>
            )}
          </View>
        </View>
        {inCart && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{inCart.quantity}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.product.name}</Text>
        <Text style={styles.cartItemPrice}>
          {(item.product.price * item.quantity).toFixed(2)} EUR
        </Text>
      </View>
      <View style={styles.cartItemQuantity}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateCartQuantity(item.product.id, item.quantity - 1)}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateCartQuantity(item.product.id, item.quantity + 1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.product.id)}
        >
          <Text style={styles.removeButtonText}>X</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Reessayer" onPress={clearError} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !vendor) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.festivalPink} />
          <Text style={styles.loadingText}>Chargement du point de vente...</Text>
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
        <View style={styles.headerTitle}>
          <Text style={styles.vendorName}>{vendor.name}</Text>
          <View style={[styles.statusBadge, vendor.isOpen && styles.statusOpen]}>
            <Text style={styles.statusText}>{vendor.isOpen ? 'Ouvert' : 'Ferme'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.cartButton} onPress={() => setShowCart(!showCart)}>
          <Text style={styles.cartIcon}>🛒</Text>
          {getCartItemCount() > 0 && (
            <View style={styles.cartCountBadge}>
              <Text style={styles.cartCountText}>{getCartItemCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive,
              ]}
            >
              {category === 'all' ? 'Tous' : category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products or Cart */}
      {showCart ? (
        <View style={styles.cartContainer}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Panier ({getCartItemCount()} articles)</Text>
            {cart.length > 0 && (
              <TouchableOpacity onPress={clearCart}>
                <Text style={styles.clearCartText}>Vider</Text>
              </TouchableOpacity>
            )}
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartIcon}>🛒</Text>
              <Text style={styles.emptyCartText}>Le panier est vide</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={cart}
                keyExtractor={(item) => item.product.id}
                renderItem={renderCartItem}
                style={styles.cartList}
              />

              {/* Payment Method */}
              <View style={styles.paymentSection}>
                <Text style={styles.paymentTitle}>Mode de paiement</Text>
                <View style={styles.paymentMethods}>
                  {PAYMENT_METHODS.map((method) => (
                    <TouchableOpacity
                      key={method.key}
                      style={[
                        styles.paymentMethod,
                        selectedPayment === method.key && styles.paymentMethodActive,
                      ]}
                      onPress={() => setSelectedPayment(method.key)}
                    >
                      <Text style={styles.paymentIcon}>{method.icon}</Text>
                      <Text
                        style={[
                          styles.paymentLabel,
                          selectedPayment === method.key && styles.paymentLabelActive,
                        ]}
                      >
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Total and Checkout */}
              <View style={styles.checkoutSection}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>{getCartTotal().toFixed(2)} EUR</Text>
                </View>
                <Button
                  title={isProcessing ? 'Traitement...' : 'Valider la commande'}
                  onPress={handleCheckout}
                  disabled={isProcessing || cart.length === 0}
                  style={styles.checkoutButton}
                />
              </View>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productsContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyProducts}>
              <Text style={styles.emptyProductsIcon}>📦</Text>
              <Text style={styles.emptyProductsText}>Aucun produit disponible</Text>
            </View>
          }
        />
      )}

      {/* Floating Cart Summary */}
      {!showCart && cart.length > 0 && (
        <TouchableOpacity style={styles.floatingCart} onPress={() => setShowCart(true)}>
          <View style={styles.floatingCartInfo}>
            <Text style={styles.floatingCartCount}>{getCartItemCount()} articles</Text>
            <Text style={styles.floatingCartTotal}>{getCartTotal().toFixed(2)} EUR</Text>
          </View>
          <Text style={styles.floatingCartButton}>Voir le panier →</Text>
        </TouchableOpacity>
      )}
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
    flex: 1,
    marginLeft: spacing.md,
  },
  vendorName: {
    ...typography.h3,
    color: colors.text,
  },
  statusBadge: {
    backgroundColor: colors.error + '30',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusOpen: {
    backgroundColor: colors.success + '30',
  },
  statusText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  cartButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.festivalPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartIcon: {
    fontSize: 24,
  },
  cartCountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.festivalPink,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    fontSize: 11,
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
  categoriesContainer: {
    maxHeight: 50,
  },
  categoriesContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: colors.festivalPurple,
    borderColor: colors.festivalPink,
  },
  categoryChipText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  productsContent: {
    padding: spacing.md,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  productDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    ...typography.body,
    color: colors.festivalPink,
    fontWeight: '700',
  },
  stockBadge: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  stockBadgeEmpty: {
    color: colors.error,
  },
  cartBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.festivalPink,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  cartContainer: {
    flex: 1,
    padding: spacing.md,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cartTitle: {
    ...typography.h3,
    color: colors.text,
  },
  clearCartText: {
    ...typography.small,
    color: colors.error,
    fontWeight: '600',
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  cartItemPrice: {
    ...typography.small,
    color: colors.festivalPink,
    fontWeight: '600',
  },
  cartItemQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.festivalPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '700',
  },
  quantityText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  removeButtonText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '700',
  },
  paymentSection: {
    marginVertical: spacing.md,
  },
  paymentTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  paymentMethodActive: {
    borderColor: colors.festivalPink,
    backgroundColor: colors.festivalPurple + '30',
  },
  paymentIcon: {
    fontSize: 20,
  },
  paymentLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  paymentLabelActive: {
    color: colors.festivalPink,
  },
  checkoutSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: {
    ...typography.h3,
    color: colors.text,
  },
  totalAmount: {
    ...typography.h2,
    color: colors.festivalPink,
  },
  checkoutButton: {
    backgroundColor: colors.festivalPurple,
  },
  emptyCart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCartIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyCartText: {
    ...typography.body,
    color: colors.textMuted,
  },
  emptyProducts: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyProductsIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyProductsText: {
    ...typography.body,
    color: colors.textMuted,
  },
  floatingCart: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.festivalPurple,
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.festivalPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingCartInfo: {
    flex: 1,
  },
  floatingCartCount: {
    ...typography.small,
    color: colors.white,
    opacity: 0.8,
  },
  floatingCartTotal: {
    ...typography.h3,
    color: colors.white,
  },
  floatingCartButton: {
    ...typography.body,
    color: colors.festivalPink,
    fontWeight: '700',
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});

export default VendorPOSScreen;
