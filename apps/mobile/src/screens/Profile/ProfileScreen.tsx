import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  Pressable,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Card, Avatar } from '../../components/common';
import {
  useAuthStore,
  useTicketStore,
  useWalletStore,
  useProgramStore,
  useNotificationStore,
  useSettingsStore,
  languageLabels,
  languageFlags,
  themeLabels,
  Language,
  Theme,
} from '../../store';
import { offlineService } from '../../services';
import { useTheme, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../types';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

interface MenuItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
  showArrow?: boolean;
  destructive?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  value,
  onPress,
  showArrow = true,
  destructive = false,
  colors,
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.menuItemLeft}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, { color: destructive ? colors.error : colors.text }]}>
        {label}
      </Text>
    </View>
    <View style={styles.menuItemRight}>
      {value && <Text style={[styles.menuValue, { color: colors.textMuted }]}>{value}</Text>}
      {showArrow && <Text style={[styles.menuArrow, { color: colors.textMuted }]}>{'>'}</Text>}
    </View>
  </TouchableOpacity>
);

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNavigationProp>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, logout, updateUser } = useAuthStore();
  const ticketStore = useTicketStore();
  const walletStore = useWalletStore();
  const programStore = useProgramStore();
  const notificationStore = useNotificationStore();
  const { language, theme, setLanguage, setTheme } = useSettingsStore();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

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

  const handleChangePhoto = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t('common.cancel'),
            t('profile.takePhoto'),
            t('profile.chooseFromLibrary'),
            t('common.delete'),
          ],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
          title: t('profile.changePhoto'),
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickImageFromLibrary();
          } else if (buttonIndex === 3) {
            updateUser({ avatar: undefined });
            showAlert(t('common.success'), t('profile.photoRemoved'));
          }
        }
      );
    } else if (Platform.OS === 'web') {
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
    } else {
      // Android
      Alert.alert(t('profile.changePhoto'), '', [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.takePhoto'),
          onPress: takePhoto,
        },
        {
          text: t('profile.chooseFromLibrary'),
          onPress: pickImageFromLibrary,
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            updateUser({ avatar: undefined });
            showAlert(t('common.success'), t('profile.photoRemoved'));
          },
        },
      ]);
    }
  }, [t, showAlert, updateUser, takePhoto, pickImageFromLibrary]);

  const handleLogout = useCallback(() => {
    const performLogout = () => {
      logout();
      ticketStore.clearTickets();
      walletStore.clearWallet();
      programStore.clearProgram();
      notificationStore.clearNotifications();
      offlineService.clearOfflineData();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('profile.logoutConfirm'))) {
        performLogout();
      }
    } else {
      Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: performLogout,
        },
      ]);
    }
  }, [t, logout, ticketStore, walletStore, programStore, notificationStore, navigation]);

  const handleDeleteAccount = useCallback(() => {
    const performDelete = () => {
      showAlert(t('common.info'), t('support.contactUs'));
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('profile.deleteAccountWarning'))) {
        performDelete();
      }
    } else {
      Alert.alert(t('profile.deleteAccount'), t('profile.deleteAccountWarning'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: performDelete,
        },
      ]);
    }
  }, [t, showAlert]);

  const selectLanguage = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      setShowLanguageModal(false);
    },
    [setLanguage]
  );

  const selectTheme = useCallback(
    (selectedTheme: Theme) => {
      setTheme(selectedTheme);
      setShowThemeModal(false);
    },
    [setTheme]
  );

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    card: { backgroundColor: colors.surface },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
    divider: { backgroundColor: colors.border },
    modalOverlay: { backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalContent: { backgroundColor: colors.surface },
    modalOptionSelected: { backgroundColor: colors.primary + '20' },
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Avatar
              name={`${user?.firstName || ''} ${user?.lastName || ''}`}
              src={user?.avatar}
              size="2xl"
            />
            <TouchableOpacity
              style={[
                styles.editAvatarButton,
                { backgroundColor: colors.surface, borderColor: colors.background },
              ]}
              onPress={handleChangePhoto}
              activeOpacity={0.8}
            >
              <Text style={styles.editAvatarIcon}>📷</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.userName, dynamicStyles.text]}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={[styles.userEmail, dynamicStyles.textSecondary]}>{user?.email}</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.textMuted]}>
            {t('profile.personalInfo')}
          </Text>
          <Card padding="none" style={[styles.menuCard, dynamicStyles.card]}>
            <MenuItem
              icon="👤"
              label={t('profile.personalInfo')}
              onPress={() => navigation.navigate('EditProfile')}
              colors={colors}
            />
            <View style={[styles.menuDivider, dynamicStyles.divider]} />
            <MenuItem
              icon="📧"
              label={t('profile.email')}
              value={user?.email}
              onPress={() => navigation.navigate('EditProfile')}
              colors={colors}
            />
            <View style={[styles.menuDivider, dynamicStyles.divider]} />
            <MenuItem
              icon="📱"
              label={t('profile.phone')}
              value={user?.phone || t('common.noData')}
              onPress={() => navigation.navigate('EditProfile')}
              colors={colors}
            />
            <View style={[styles.menuDivider, dynamicStyles.divider]} />
            <MenuItem
              icon="🔒"
              label={t('profile.changePassword')}
              onPress={() => navigation.navigate('ChangePassword')}
              colors={colors}
            />
          </Card>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.textMuted]}>
            {t('settings.general')}
          </Text>
          <Card padding="none" style={[styles.menuCard, dynamicStyles.card]}>
            <MenuItem
              icon="🔔"
              label={t('profile.notifications')}
              value={notificationStore.pushEnabled ? t('common.yes') : t('common.no')}
              onPress={() => navigation.navigate('Settings')}
              colors={colors}
            />
            <View style={[styles.menuDivider, dynamicStyles.divider]} />
            <MenuItem
              icon="🌙"
              label={t('settings.theme')}
              value={themeLabels[theme]}
              onPress={() => setShowThemeModal(true)}
              colors={colors}
            />
            <View style={[styles.menuDivider, dynamicStyles.divider]} />
            <MenuItem
              icon="🌍"
              label={t('settings.language')}
              value={`${languageFlags[language]} ${languageLabels[language]}`}
              onPress={() => setShowLanguageModal(true)}
              colors={colors}
            />
          </Card>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.textMuted]}>{t('support.title')}</Text>
          <Card padding="none" style={[styles.menuCard, dynamicStyles.card]}>
            <MenuItem
              icon="❓"
              label={t('support.helpCenter')}
              onPress={() => navigation.navigate('HelpCenter')}
              colors={colors}
            />
            <View style={[styles.menuDivider, dynamicStyles.divider]} />
            <MenuItem
              icon="💬"
              label={t('support.contactUs')}
              onPress={() => navigation.navigate('ContactUs')}
              colors={colors}
            />
            <View style={[styles.menuDivider, dynamicStyles.divider]} />
            <MenuItem
              icon="📄"
              label={t('profile.terms')}
              onPress={() => navigation.navigate('HelpCenter')}
              colors={colors}
            />
            <View style={[styles.menuDivider, dynamicStyles.divider]} />
            <MenuItem
              icon="🔐"
              label={t('profile.privacyPolicy')}
              onPress={() => navigation.navigate('HelpCenter')}
              colors={colors}
            />
          </Card>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Card padding="none" style={[styles.menuCard, dynamicStyles.card]}>
            <MenuItem
              icon="🚪"
              label={t('profile.logout')}
              onPress={handleLogout}
              showArrow={false}
              destructive
              colors={colors}
            />
            <View style={[styles.menuDivider, dynamicStyles.divider]} />
            <MenuItem
              icon="🗑️"
              label={t('profile.deleteAccount')}
              onPress={handleDeleteAccount}
              showArrow={false}
              destructive
              colors={colors}
            />
          </Card>
        </View>

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={[styles.version, dynamicStyles.textMuted]}>
            Festival App {t('profile.version')} 1.0.0
          </Text>
          <Text style={[styles.copyright, dynamicStyles.textMuted]}>
            2024 Festival. {t('common.all')} {t('profile.licenses')}.
          </Text>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, dynamicStyles.modalOverlay]}
          onPress={() => setShowLanguageModal(false)}
        >
          <Pressable
            style={[styles.modalContent, dynamicStyles.modalContent]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, dynamicStyles.text]}>
              {t('settings.selectLanguage')}
            </Text>
            {(Object.keys(languageLabels) as Language[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.modalOption, language === lang && dynamicStyles.modalOptionSelected]}
                onPress={() => selectLanguage(lang)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionIcon}>{languageFlags[lang]}</Text>
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: colors.text },
                    language === lang && { color: colors.primary, fontWeight: '600' },
                  ]}
                >
                  {languageLabels[lang]}
                </Text>
                {language === lang && (
                  <Text style={[styles.checkIcon, { color: colors.primary }]}>{'check'}</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalCancel, { borderTopColor: colors.border }]}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={[styles.modalCancelText, dynamicStyles.textMuted]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, dynamicStyles.modalOverlay]}
          onPress={() => setShowThemeModal(false)}
        >
          <Pressable
            style={[styles.modalContent, dynamicStyles.modalContent]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, dynamicStyles.text]}>{t('settings.theme')}</Text>
            {(Object.keys(themeLabels) as Theme[]).map((themeOption) => (
              <TouchableOpacity
                key={themeOption}
                style={[
                  styles.modalOption,
                  theme === themeOption && dynamicStyles.modalOptionSelected,
                ]}
                onPress={() => selectTheme(themeOption)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionIcon}>
                  {themeOption === 'light' ? '☀️' : themeOption === 'dark' ? '🌙' : '⚙️'}
                </Text>
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: colors.text },
                    theme === themeOption && { color: colors.primary, fontWeight: '600' },
                  ]}
                >
                  {themeLabels[themeOption]}
                </Text>
                {theme === themeOption && (
                  <Text style={[styles.checkIcon, { color: colors.primary }]}>{'check'}</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalCancel, { borderTopColor: colors.border }]}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={[styles.modalCancelText, dynamicStyles.textMuted]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  editAvatarIcon: {
    fontSize: 18,
  },
  userName: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  userEmail: {
    ...typography.body,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  menuCard: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  menuLabel: {
    ...typography.body,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuValue: {
    ...typography.small,
    marginRight: spacing.sm,
    maxWidth: 150,
  },
  menuArrow: {
    fontSize: 16,
  },
  menuDivider: {
    height: 1,
    marginLeft: 52,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  version: {
    ...typography.small,
    marginBottom: spacing.xs,
  },
  copyright: {
    ...typography.caption,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 340,
    padding: spacing.lg,
    ...Platform.select({
      web: {
        maxHeight: '80vh',
      },
    }),
  },
  modalTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  modalOptionText: {
    ...typography.body,
    flex: 1,
  },
  checkIcon: {
    fontSize: 18,
  },
  modalCancel: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  modalCancelText: {
    ...typography.body,
  },
});

export default ProfileScreen;
