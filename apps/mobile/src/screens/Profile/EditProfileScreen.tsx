import React, { useState, useCallback } from 'react';
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
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Card, Button, Avatar } from '../../components/common';
import { useAuthStore } from '../../store';
import { useTheme, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../types';

type EditProfileNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<EditProfileNavigationProp>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, updateUser } = useAuthStore();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const showAlert = useCallback((title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }, []);

  const pickImageFromLibrary = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert(t('common.error'), t('profile.photoPermissionDenied'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64Uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        updateUser({ avatar: base64Uri });
        showAlert(t('common.success'), t('profile.photoUpdated'));
      }
    } catch (_error) {
      showAlert(t('common.error'), t('profile.photoError'));
    }
  }, [t, showAlert, updateUser]);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert(t('common.error'), t('profile.cameraPermissionDenied'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64Uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        updateUser({ avatar: base64Uri });
        showAlert(t('common.success'), t('profile.photoUpdated'));
      }
    } catch (_error) {
      showAlert(t('common.error'), t('profile.photoError'));
    }
  }, [t, showAlert, updateUser]);

  const handleChangeAvatar = useCallback(() => {
    if (Platform.OS === 'web') {
      // For web, create a file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            updateUser({ avatar: base64 });
            showAlert(t('common.success'), t('profile.photoUpdated'));
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('profile.takePhoto'), t('profile.chooseFromLibrary')],
          cancelButtonIndex: 0,
          title: t('profile.changePhoto'),
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickImageFromLibrary();
          }
        }
      );
    } else {
      // Android
      Alert.alert(t('profile.changePhoto'), '', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.takePhoto'), onPress: takePhoto },
        { text: t('profile.chooseFromLibrary'), onPress: pickImageFromLibrary },
      ]);
    }
  }, [t, showAlert, updateUser, takePhoto, pickImageFromLibrary]);

  const validateEmail = useCallback((emailValue: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  }, []);

  const validatePhone = useCallback((phoneValue: string) => {
    return (
      !phoneValue ||
      /^(\+?\d{1,3})?[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}$/.test(phoneValue)
    );
  }, []);

  const handleSave = useCallback(async () => {
    // Validation
    if (!firstName.trim()) {
      showAlert(t('errors.validation'), t('errors.required'));
      return;
    }
    if (!lastName.trim()) {
      showAlert(t('errors.validation'), t('errors.required'));
      return;
    }
    if (!validateEmail(email)) {
      showAlert(t('errors.validation'), t('errors.invalidEmail'));
      return;
    }
    if (!validatePhone(phone)) {
      showAlert(t('errors.validation'), t('errors.invalidPhone'));
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      updateUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });

      showAlert(t('common.success'), t('profile.editProfile'));
      navigation.goBack();
    } catch {
      showAlert(t('common.error'), t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [
    firstName,
    lastName,
    email,
    phone,
    t,
    showAlert,
    validateEmail,
    validatePhone,
    updateUser,
    navigation,
  ]);

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    card: { backgroundColor: colors.surface },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
    input: {
      backgroundColor: colors.surfaceLight,
      color: colors.text,
      borderColor: colors.border,
    },
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backIcon, dynamicStyles.text]}>{'<-'}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>{t('profile.editProfile')}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <Avatar
              name={`${firstName} ${lastName}`}
              src={user?.avatar}
              size="2xl"
              style={styles.avatarMargin}
            />
            <TouchableOpacity style={styles.changeAvatarButton} onPress={handleChangeAvatar}>
              <Text style={[styles.changeAvatarText, { color: colors.primary }]}>
                {t('profile.editProfile')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <Card style={[styles.formCard, dynamicStyles.card]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>
                {t('auth.firstName')} *
              </Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t('auth.firstName')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>
                {t('auth.lastName')} *
              </Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={lastName}
                onChangeText={setLastName}
                placeholder={t('auth.lastName')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>
                {t('auth.email')} *
              </Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.email')}
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>
                {t('auth.phone')}
              </Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+33 6 12 34 56 78"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              <Text style={[styles.inputHint, dynamicStyles.textMuted]}>
                {t('common.info')} - {t('settings.notifications')}
              </Text>
            </View>
          </Card>

          {/* Save Button */}
          <Button
            title={loading ? t('common.loading') : t('common.save')}
            onPress={handleSave}
            disabled={loading}
            style={styles.saveButton}
          />

          {/* Info */}
          <Text style={[styles.infoText, dynamicStyles.textMuted]}>* {t('errors.required')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
  },
  headerTitle: {
    ...typography.h3,
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarMargin: {
    marginBottom: spacing.md,
  },
  changeAvatarButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  changeAvatarText: {
    ...typography.body,
    fontWeight: '600',
  },
  formCard: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.small,
    marginBottom: spacing.xs,
  },
  input: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    borderWidth: 1,
  },
  inputHint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  saveButton: {
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.caption,
    textAlign: 'center',
  },
});

export default EditProfileScreen;
