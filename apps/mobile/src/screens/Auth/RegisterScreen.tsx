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

type RegisterNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterNavigationProp>();
  const { login } = useAuthStore();

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Prenom requis';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Nom requis';
    }

    if (!formData.email) {
      newErrors.email = 'Email requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.password) {
      newErrors.password = 'Mot de passe requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Minimum 8 caracteres';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmation requise';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) {return;}

    setLoading(true);
    try {
      const response = await apiService.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      if (response.success && response.data) {
        login(response.data.user, response.data.token);
        navigation.replace('Main');
      } else {
        Alert.alert('Erreur', response.message || 'Inscription echouee');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez reessayer.');
    } finally {
      setLoading(false);
    }
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Creer un compte</Text>
            <Text style={styles.subtitle}>
              Rejoignez la communaute du festival
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="Prenom"
                  placeholder="Jean"
                  value={formData.firstName}
                  onChangeText={(v) => updateField('firstName', v)}
                  autoCapitalize="words"
                  error={errors.firstName}
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="Nom"
                  placeholder="Dupont"
                  value={formData.lastName}
                  onChangeText={(v) => updateField('lastName', v)}
                  autoCapitalize="words"
                  error={errors.lastName}
                />
              </View>
            </View>

            <Input
              label="Email"
              placeholder="votre@email.com"
              value={formData.email}
              onChangeText={(v) => updateField('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />

            <Input
              label="Mot de passe"
              placeholder="Minimum 8 caracteres"
              value={formData.password}
              onChangeText={(v) => updateField('password', v)}
              secureTextEntry={!showPassword}
              error={errors.password}
              rightIcon={
                <Text style={styles.eyeIcon}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              }
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            <Input
              label="Confirmer le mot de passe"
              placeholder="Retapez votre mot de passe"
              value={formData.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              secureTextEntry={!showPassword}
              error={errors.confirmPassword}
            />

            <Button
              title="S'inscrire"
              onPress={handleRegister}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.registerButton}
            />
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            En vous inscrivant, vous acceptez nos{' '}
            <Text style={styles.link}>Conditions d'utilisation</Text> et notre{' '}
            <Text style={styles.link}>Politique de confidentialite</Text>.
          </Text>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Deja un compte?</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}> Se connecter</Text>
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
    marginBottom: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backIcon: {
    fontSize: 28,
    color: colors.text,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -spacing.xs,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  eyeIcon: {
    fontSize: 20,
  },
  registerButton: {
    marginTop: spacing.md,
  },
  terms: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  link: {
    color: colors.primary,
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
  loginLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default RegisterScreen;
