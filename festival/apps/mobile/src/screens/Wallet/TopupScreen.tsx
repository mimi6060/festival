import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button, Input } from '../../components/common';
import { useWalletStore } from '../../store';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../types';

type TopupNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Topup'>;

const quickAmounts = [20, 50, 100, 200];

const paymentMethods = [
  { id: 'card', label: 'Carte bancaire', icon: '💳' },
  { id: 'apple', label: 'Apple Pay', icon: '🍎' },
  { id: 'google', label: 'Google Pay', icon: '🔵' },
];

export const TopupScreen: React.FC = () => {
  const navigation = useNavigation<TopupNavigationProp>();
  const { updateBalance, addTransaction } = useWalletStore();

  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [loading, setLoading] = useState(false);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleTopup = async () => {
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    if (numAmount < 10) {
      Alert.alert('Erreur', 'Le montant minimum est de 10 EUR');
      return;
    }

    if (numAmount > 500) {
      Alert.alert('Erreur', 'Le montant maximum est de 500 EUR');
      return;
    }

    setLoading(true);

    // Simulate payment processing
    setTimeout(() => {
      // Add transaction
      addTransaction({
        id: Date.now().toString(),
        type: 'topup',
        amount: numAmount,
        currency: 'EUR',
        description: `Rechargement par ${paymentMethods.find(m => m.id === selectedMethod)?.label}`,
        status: 'completed',
        createdAt: new Date().toISOString(),
      });

      // Update balance
      updateBalance(numAmount, 'add');

      setLoading(false);

      Alert.alert(
        'Rechargement reussi!',
        `${numAmount.toFixed(2)} EUR ont ete ajoutes a votre portefeuille.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }, 2000);
  };

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
        <Text style={styles.headerTitle}>Recharger</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount Input */}
          <View style={styles.amountSection}>
            <Text style={styles.sectionTitle}>Montant</Text>
            <Card style={styles.amountCard}>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currency}>EUR</Text>
                <Input
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  keyboardType="numeric"
                  containerStyle={styles.amountInput}
                />
              </View>
              <Text style={styles.amountHint}>Min. 10 EUR - Max. 500 EUR</Text>
            </Card>

            {/* Quick Amounts */}
            <View style={styles.quickAmounts}>
              {quickAmounts.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.quickAmountButton,
                    amount === value.toString() && styles.quickAmountButtonActive,
                  ]}
                  onPress={() => handleQuickAmount(value)}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      amount === value.toString() && styles.quickAmountTextActive,
                    ]}
                  >
                    {value} EUR
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mode de paiement</Text>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  selectedMethod === method.id && styles.paymentMethodActive,
                ]}
                onPress={() => setSelectedMethod(method.id)}
              >
                <Text style={styles.paymentIcon}>{method.icon}</Text>
                <Text style={styles.paymentLabel}>{method.label}</Text>
                <View
                  style={[
                    styles.radioButton,
                    selectedMethod === method.id && styles.radioButtonActive,
                  ]}
                >
                  {selectedMethod === method.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary */}
          {amount && parseFloat(amount) > 0 && (
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Montant</Text>
                <Text style={styles.summaryValue}>
                  {parseFloat(amount).toFixed(2)} EUR
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Frais</Text>
                <Text style={styles.summaryValueFree}>Gratuit</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>Total</Text>
                <Text style={styles.summaryTotalValue}>
                  {parseFloat(amount).toFixed(2)} EUR
                </Text>
              </View>
            </Card>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title={loading ? 'Traitement...' : 'Confirmer le rechargement'}
            onPress={handleTopup}
            loading={loading}
            disabled={!amount || parseFloat(amount) < 10}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  amountSection: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  amountCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currency: {
    ...typography.h2,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 0,
    marginBottom: 0,
  },
  amountHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
  },
  quickAmountButtonActive: {
    backgroundColor: colors.primary,
  },
  quickAmountText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  quickAmountTextActive: {
    color: colors.white,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.transparent,
  },
  paymentMethodActive: {
    borderColor: colors.primary,
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  paymentLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonActive: {
    borderColor: colors.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  summaryCard: {
    backgroundColor: colors.surfaceLight,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.text,
  },
  summaryValueFree: {
    ...typography.body,
    color: colors.success,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  summaryTotal: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  summaryTotalValue: {
    ...typography.h3,
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default TopupScreen;
