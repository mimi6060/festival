import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input } from '../../components/common';
import { useAuthStore } from '../../store';
import { apiService } from '../../services';
import { colors, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../types';

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavigationProp>();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email invalide';
    }

    if (!password) {
      newErrors.password = 'Mot de passe requis';
    } else if (password.length < 6) {
      newErrors.password = 'Minimum 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.login(email, password);

      if (response.success && response.data) {
        login(response.data.user, response.data.token);
        navigation.replace('Main');
      } else {
        Alert.alert('Erreur', response.message || 'Identifiants incorrects');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez reessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    // Demo login for testing
    const demoUser = {
      id: 'demo-user-1',
      email: 'demo@festival.com',
      firstName: 'Jean',
      lastName: 'Dupont',
      createdAt: new Date().toISOString(),
    };
    login(demoUser, 'demo-token');
    navigation.replace('Main');
  };

  const handleForgotPassword = () => {
    if (!email) {
      Alert.alert(
        'Email requis',
        'Veuillez entrer votre adresse email pour recevoir le lien de réinitialisation.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Email invalide', 'Veuillez entrer une adresse email valide.', [{ text: 'OK' }]);
      return;
    }
    // Simulate sending reset email
    Alert.alert(
      'Email envoyé',
      `Un lien de réinitialisation a été envoyé à ${email}. Vérifiez votre boîte de réception.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>🎵</Text>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>
              Connectez-vous pour acceder a vos billets et votre portefeuille
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="votre@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />

            <Input
              label="Mot de passe"
              placeholder="Votre mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              error={errors.password}
              rightIcon={<Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMe}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberMeText}>Se souvenir de moi</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Mot de passe oublié?</Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Se connecter"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.loginButton}
            />

            <Button
              title="Mode Demo"
              onPress={handleDemoLogin}
              variant="outline"
              fullWidth
              size="lg"
              style={styles.demoButton}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}> S'inscrire</Text>
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  form: {
    marginBottom: spacing.xl,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  rememberMeText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  forgotPassword: {},
  forgotPasswordText: {
    ...typography.small,
    color: colors.primary,
  },
  loginButton: {
    marginBottom: spacing.md,
  },
  demoButton: {
    marginTop: spacing.sm,
  },
  eyeIcon: {
    fontSize: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingBottom: spacing.lg,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  registerLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default LoginScreen;
