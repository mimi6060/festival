import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button } from '../../components/common';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../types';

type ChangePasswordNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<ChangePasswordNavigationProp>();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const validatePassword = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    return checks;
  };

  const isPasswordValid = (password: string) => {
    const checks = validatePassword(password);
    return checks.length && checks.uppercase && checks.lowercase && checks.number;
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword) {
      showAlert('Erreur', 'Veuillez saisir votre mot de passe actuel');
      return;
    }

    if (!isPasswordValid(newPassword)) {
      showAlert('Erreur', 'Le nouveau mot de passe ne respecte pas les criteres de securite');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (currentPassword === newPassword) {
      showAlert('Erreur', 'Le nouveau mot de passe doit etre different de l\'ancien');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      showAlert('Succes', 'Votre mot de passe a ete modifie avec succes');
      navigation.goBack();
    } catch (error) {
      showAlert('Erreur', 'Impossible de modifier le mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const passwordChecks = validatePassword(newPassword);

  const PasswordCheck: React.FC<{ valid: boolean; label: string }> = ({ valid, label }) => (
    <View style={styles.checkRow}>
      <Text style={[styles.checkIcon, valid && styles.checkIconValid]}>
        {valid ? '✓' : '○'}
      </Text>
      <Text style={[styles.checkLabel, valid && styles.checkLabelValid]}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mot de passe</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Security Icon */}
          <View style={styles.iconSection}>
            <View style={styles.securityIcon}>
              <Text style={styles.securityEmoji}>🔐</Text>
            </View>
            <Text style={styles.securityText}>
              Choisissez un mot de passe securise pour proteger votre compte
            </Text>
          </View>

          {/* Form */}
          <Card style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mot de passe actuel</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Votre mot de passe actuel"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowCurrent(!showCurrent)}
                >
                  <Text style={styles.eyeIcon}>{showCurrent ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Votre nouveau mot de passe"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowNew(!showNew)}
                >
                  <Text style={styles.eyeIcon}>{showNew ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirmer le nouveau mot de passe"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirm(!showConfirm)}
                >
                  <Text style={styles.eyeIcon}>{showConfirm ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
              {confirmPassword && newPassword !== confirmPassword && (
                <Text style={styles.errorText}>Les mots de passe ne correspondent pas</Text>
              )}
            </View>
          </Card>

          {/* Password Requirements */}
          <Card style={styles.requirementsCard}>
            <Text style={styles.requirementsTitle}>Exigences du mot de passe</Text>
            <PasswordCheck valid={passwordChecks.length} label="Au moins 8 caracteres" />
            <PasswordCheck valid={passwordChecks.uppercase} label="Une lettre majuscule" />
            <PasswordCheck valid={passwordChecks.lowercase} label="Une lettre minuscule" />
            <PasswordCheck valid={passwordChecks.number} label="Un chiffre" />
            <PasswordCheck valid={passwordChecks.special} label="Un caractere special (recommande)" />
          </Card>

          {/* Save Button */}
          <Button
            title={loading ? 'Modification...' : 'Modifier le mot de passe'}
            onPress={handleChangePassword}
            disabled={loading || !currentPassword || !isPasswordValid(newPassword) || newPassword !== confirmPassword}
            style={styles.saveButton}
          />

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotButton}>
            <Text style={styles.forgotText}>Mot de passe oublie ?</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  iconSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  securityIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  securityEmoji: {
    fontSize: 40,
  },
  securityText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  formCard: {
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  eyeButton: {
    padding: spacing.sm,
  },
  eyeIcon: {
    fontSize: 20,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  requirementsCard: {
    marginBottom: spacing.lg,
  },
  requirementsTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  checkIcon: {
    fontSize: 14,
    color: colors.textMuted,
    marginRight: spacing.sm,
    width: 20,
  },
  checkIconValid: {
    color: colors.success,
  },
  checkLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  checkLabelValid: {
    color: colors.text,
  },
  saveButton: {
    marginBottom: spacing.md,
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  forgotText: {
    ...typography.body,
    color: colors.primary,
  },
});

export default ChangePasswordScreen;
