import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/common';
import {
  useAuthStore,
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

type SettingsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

interface SettingItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightElement?: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  label,
  value,
  onPress,
  showArrow = true,
  rightElement,
  colors,
}) => {
  const content = (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={[styles.settingValue, { color: colors.textMuted }]}>{value}</Text>}
        {rightElement}
        {showArrow && !rightElement && (
          <Text style={[styles.settingArrow, { color: colors.textMuted }]}>{'>'}</Text>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsNavigationProp>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { setHasSeenOnboarding } = useAuthStore();
  const { pushEnabled, setPushEnabled } = useNotificationStore();
  const {
    language,
    theme,
    biometricEnabled,
    offlineModeEnabled,
    setLanguage,
    setTheme,
    setBiometricEnabled,
    setOfflineModeEnabled,
  } = useSettingsStore();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  const handleLanguageChange = useCallback(() => {
    setShowLanguageModal(true);
  }, []);

  const handleThemeChange = useCallback(() => {
    setShowThemeModal(true);
  }, []);

  const showAlert = useCallback((title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }, []);

  const handleClearCache = useCallback(() => {
    const confirmClear = () => {
      offlineService.clearOfflineData().then(() => {
        showAlert(t('settings.cacheCleared'), t('settings.cacheCleared'));
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('settings.clearCache') + '?')) {
        confirmClear();
      }
    } else {
      Alert.alert(t('settings.clearCache'), t('settings.offlineData'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: confirmClear },
      ]);
    }
  }, [t, showAlert]);

  const handleResetOnboarding = useCallback(() => {
    const resetOnboarding = () => {
      setHasSeenOnboarding(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('onboarding.welcome.title') + '?')) {
        resetOnboarding();
      }
    } else {
      Alert.alert(t('onboarding.welcome.title'), t('onboarding.welcome.description'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.yes'), onPress: resetOnboarding },
      ]);
    }
  }, [t, setHasSeenOnboarding, navigation]);

  const handlePrivacyPolicy = useCallback(() => {
    Linking.openURL('https://festival.com/privacy');
  }, []);

  const handleTermsOfService = useCallback(() => {
    Linking.openURL('https://festival.com/terms');
  }, []);

  const handleRateApp = useCallback(() => {
    if (Platform.OS === 'web') {
      window.open('https://apps.apple.com', '_blank');
    } else {
      Alert.alert(t('profile.about'), t('common.info'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.ok'), onPress: () => Linking.openURL('https://apps.apple.com') },
      ]);
    }
  }, [t]);

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backIcon, dynamicStyles.text]}>{'<-'}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, dynamicStyles.text]}>{t('settings.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.textMuted]}>
            {t('settings.notifications')}
          </Text>
          <Card padding="none" style={[styles.settingCard, dynamicStyles.card]}>
            <SettingItem
              icon="🔔"
              label={t('settings.pushNotifications')}
              showArrow={false}
              colors={colors}
              rightElement={
                <Switch
                  value={pushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              }
            />
            <View style={[styles.divider, dynamicStyles.divider]} />
            <SettingItem
              icon="📅"
              label={t('settings.eventReminders')}
              value="15 min"
              onPress={() => showAlert(t('common.info'), t('common.soon'))}
              colors={colors}
            />
            <View style={[styles.divider, dynamicStyles.divider]} />
            <SettingItem
              icon="📢"
              label={t('settings.announcements')}
              value={pushEnabled ? t('common.yes') : t('common.no')}
              onPress={() => showAlert(t('common.info'), t('common.soon'))}
              colors={colors}
            />
          </Card>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.textMuted]}>
            {t('settings.appearance')}
          </Text>
          <Card padding="none" style={[styles.settingCard, dynamicStyles.card]}>
            <SettingItem
              icon="🌙"
              label={t('settings.theme')}
              value={themeLabels[theme]}
              onPress={handleThemeChange}
              colors={colors}
            />
            <View style={[styles.divider, dynamicStyles.divider]} />
            <SettingItem
              icon="🌍"
              label={t('settings.language')}
              value={`${languageFlags[language]} ${languageLabels[language]}`}
              onPress={handleLanguageChange}
              colors={colors}
            />
          </Card>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.textMuted]}>
            {t('profile.security')}
          </Text>
          <Card padding="none" style={[styles.settingCard, dynamicStyles.card]}>
            <SettingItem
              icon="🔐"
              label={t('profile.biometric')}
              showArrow={false}
              colors={colors}
              rightElement={
                <Switch
                  value={biometricEnabled}
                  onValueChange={(value) => {
                    setBiometricEnabled(value);
                    if (value) {
                      showAlert(t('profile.biometric'), t('auth.biometricLogin'));
                    }
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              }
            />
            <View style={[styles.divider, dynamicStyles.divider]} />
            <SettingItem
              icon="🔒"
              label={t('profile.changePassword')}
              onPress={() => navigation.navigate('ChangePassword')}
              colors={colors}
            />
          </Card>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.textMuted]}>{t('settings.cache')}</Text>
          <Card padding="none" style={[styles.settingCard, dynamicStyles.card]}>
            <SettingItem
              icon="📴"
              label={t('settings.offlineData')}
              showArrow={false}
              colors={colors}
              rightElement={
                <Switch
                  value={offlineModeEnabled}
                  onValueChange={(value) => {
                    setOfflineModeEnabled(value);
                    showAlert(
                      value ? t('common.offline') : t('common.online'),
                      value ? t('settings.downloadForOffline') : t('common.syncComplete')
                    );
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              }
            />
            <View style={[styles.divider, dynamicStyles.divider]} />
            <SettingItem
              icon="🗑️"
              label={t('settings.clearCache')}
              onPress={handleClearCache}
              colors={colors}
            />
            <View style={[styles.divider, dynamicStyles.divider]} />
            <SettingItem
              icon="📥"
              label={t('profile.dataExport')}
              onPress={() => showAlert(t('common.info'), t('common.soon'))}
              colors={colors}
            />
          </Card>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.textMuted]}>{t('profile.about')}</Text>
          <Card padding="none" style={[styles.settingCard, dynamicStyles.card]}>
            <SettingItem
              icon="📄"
              label={t('profile.terms')}
              onPress={handleTermsOfService}
              colors={colors}
            />
            <View style={[styles.divider, dynamicStyles.divider]} />
            <SettingItem
              icon="🔐"
              label={t('profile.privacyPolicy')}
              onPress={handlePrivacyPolicy}
              colors={colors}
            />
            <View style={[styles.divider, dynamicStyles.divider]} />
            <SettingItem
              icon="⭐"
              label={t('common.share')}
              onPress={handleRateApp}
              colors={colors}
            />
            <View style={[styles.divider, dynamicStyles.divider]} />
            <SettingItem
              icon="🎬"
              label={t('onboarding.welcome.title')}
              onPress={handleResetOnboarding}
              colors={colors}
            />
          </Card>
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, dynamicStyles.text]}>Festival App</Text>
          <Text style={[styles.versionNumber, dynamicStyles.textMuted]}>
            {t('profile.version')} 1.0.0 (Build 1)
          </Text>
          <Text style={[styles.copyright, dynamicStyles.textMuted]}>
            2024 Festival. {t('common.all')} {t('profile.licenses')}.
          </Text>
        </View>

        {/* Debug Section (Development only) */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.textMuted]}>Developer</Text>
            <Card padding="none" style={[styles.settingCard, dynamicStyles.card]}>
              <SettingItem
                icon="🐛"
                label="Debug mode"
                value="Active"
                showArrow={false}
                colors={colors}
              />
              <View style={[styles.divider, dynamicStyles.divider]} />
              <SettingItem
                icon="🔄"
                label={t('common.syncInProgress')}
                onPress={async () => {
                  const result = await offlineService.syncAllData();
                  showAlert(
                    'Sync',
                    result.success ? t('common.syncComplete') : t('common.syncFailed')
                  );
                }}
                colors={colors}
              />
              <View style={[styles.divider, dynamicStyles.divider]} />
              <SettingItem
                icon="📊"
                label="Queue"
                value={`${offlineService.getSyncQueueLength()} items`}
                showArrow={false}
                colors={colors}
              />
            </Card>
          </View>
        )}
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
                <Text style={styles.languageFlag}>{languageFlags[lang]}</Text>
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
                <Text style={styles.themeIcon}>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
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
  title: {
    ...typography.h2,
  },
  placeholder: {
    width: 40,
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
  settingCard: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  settingLabel: {
    ...typography.body,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    ...typography.small,
    marginRight: spacing.sm,
  },
  settingArrow: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginLeft: 52,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  versionText: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  versionNumber: {
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
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
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
  languageFlag: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  themeIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  modalOptionText: {
    ...typography.body,
    flex: 1,
  },
  checkIcon: {
    fontSize: 18,
    fontWeight: 'bold',
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

export default SettingsScreen;
