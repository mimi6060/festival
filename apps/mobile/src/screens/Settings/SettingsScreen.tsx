import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button } from '../../components/common';
import { useAuthStore, useNotificationStore, useSettingsStore, languageLabels, themeLabels } from '../../store';
import type { Language, Theme } from '../../store';
import { offlineService } from '../../services';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../types';

type SettingsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

interface SettingItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightElement?: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  label,
  value,
  onPress,
  showArrow = true,
  rightElement,
}) => {
  const content = (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {rightElement}
        {showArrow && !rightElement && <Text style={styles.settingArrow}>&gt;</Text>}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsNavigationProp>();
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

  const handleLanguageChange = () => {
    setShowLanguageModal(true);
  };

  const handleThemeChange = () => {
    setShowThemeModal(true);
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Vider le cache',
      'Cela supprimera les donnees temporaires mais pas vos informations de compte.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            await offlineService.clearOfflineData();
            Alert.alert('Cache vide', 'Les donnees temporaires ont ete supprimees.');
          },
        },
      ]
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Revoir l\'introduction',
      'Voulez-vous revoir les ecrans d\'introduction?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Oui',
          onPress: () => {
            setHasSeenOnboarding(false);
            navigation.reset({
              index: 0,
              routes: [{ name: 'Onboarding' }],
            });
          },
        },
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://festival.com/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://festival.com/terms');
  };

  const handleRateApp = () => {
    Alert.alert(
      'Noter l\'application',
      'Vous aimez Festival App? Laissez-nous un avis!',
      [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Noter', onPress: () => Linking.openURL('https://apps.apple.com') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Parametres</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Card padding="none" style={styles.settingCard}>
            <SettingItem
              icon="🔔"
              label="Notifications push"
              showArrow={false}
              rightElement={
                <Switch
                  value={pushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="📅"
              label="Rappels de concerts"
              value="15 min avant"
              onPress={() => Alert.alert('Info', 'Configuration des rappels a venir')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="📢"
              label="Alertes festival"
              value="Activees"
              onPress={() => Alert.alert('Info', 'Configuration des alertes a venir')}
            />
          </Card>
        </View>

        {/* Apparence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apparence</Text>
          <Card padding="none" style={styles.settingCard}>
            <SettingItem
              icon="🌙"
              label="Theme"
              value={themeLabels[theme]}
              onPress={handleThemeChange}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="🌍"
              label="Langue"
              value={languageLabels[language]}
              onPress={handleLanguageChange}
            />
          </Card>
        </View>

        {/* Securite */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Securite</Text>
          <Card padding="none" style={styles.settingCard}>
            <SettingItem
              icon="🔐"
              label="Authentification biometrique"
              showArrow={false}
              rightElement={
                <Switch
                  value={biometricEnabled}
                  onValueChange={(value) => {
                    setBiometricEnabled(value);
                    if (value) {
                      showAlert('Biometrie activee', 'Vous pouvez maintenant vous connecter avec Face ID / Touch ID');
                    }
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="🔒"
              label="Changer le mot de passe"
              onPress={() => showAlert('Mot de passe', 'Fonctionnalite de changement de mot de passe a venir')}
            />
          </Card>
        </View>

        {/* Donnees */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Donnees</Text>
          <Card padding="none" style={styles.settingCard}>
            <SettingItem
              icon="📴"
              label="Mode hors-ligne"
              showArrow={false}
              rightElement={
                <Switch
                  value={offlineModeEnabled}
                  onValueChange={(value) => {
                    setOfflineModeEnabled(value);
                    showAlert(
                      value ? 'Mode hors-ligne active' : 'Mode hors-ligne desactive',
                      value
                        ? 'Les donnees seront stockees localement pour une utilisation sans connexion.'
                        : 'Les donnees seront synchronisees en temps reel.'
                    );
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="🗑️"
              label="Vider le cache"
              onPress={handleClearCache}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="📥"
              label="Telecharger mes donnees"
              onPress={() => showAlert('Telechargement', 'Fonctionnalite de telechargement des donnees a venir (RGPD)')}
            />
          </Card>
        </View>

        {/* A propos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>A propos</Text>
          <Card padding="none" style={styles.settingCard}>
            <SettingItem
              icon="📄"
              label="Conditions d'utilisation"
              onPress={handleTermsOfService}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="🔐"
              label="Politique de confidentialite"
              onPress={handlePrivacyPolicy}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="⭐"
              label="Noter l'application"
              onPress={handleRateApp}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="🎬"
              label="Revoir l'introduction"
              onPress={handleResetOnboarding}
            />
          </Card>
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Festival App</Text>
          <Text style={styles.versionNumber}>Version 1.0.0 (Build 1)</Text>
          <Text style={styles.copyright}>2024 Festival. Tous droits reserves.</Text>
        </View>

        {/* Debug Section (Development only) */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Developpeur</Text>
            <Card padding="none" style={styles.settingCard}>
              <SettingItem
                icon="🐛"
                label="Debug mode"
                value="Active"
                showArrow={false}
              />
              <View style={styles.divider} />
              <SettingItem
                icon="🔄"
                label="Forcer la synchronisation"
                onPress={async () => {
                  const result = await offlineService.syncAllData();
                  Alert.alert('Sync', result.success ? 'Synchronisation reussie' : 'Echec');
                }}
              />
              <View style={styles.divider} />
              <SettingItem
                icon="📊"
                label="Queue hors-ligne"
                value={`${offlineService.getSyncQueueLength()} elements`}
                showArrow={false}
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
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir la langue</Text>
            {(Object.keys(languageLabels) as Language[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.modalOption,
                  language === lang && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setLanguage(lang);
                  setShowLanguageModal(false);
                  showAlert('Langue modifiee', `La langue a ete changee en ${languageLabels[lang]}`);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    language === lang && styles.modalOptionTextSelected,
                  ]}
                >
                  {languageLabels[lang]}
                </Text>
                {language === lang && (
                  <Text style={styles.checkIcon}>{'✓'}</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowThemeModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir le theme</Text>
            {(Object.keys(themeLabels) as Theme[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.modalOption,
                  theme === t && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setTheme(t);
                  setShowThemeModal(false);
                  showAlert('Theme modifie', `Le theme a ete change en ${themeLabels[t]}`);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    theme === t && styles.modalOptionTextSelected,
                  ]}
                >
                  {themeLabels[t]}
                </Text>
                {theme === t && (
                  <Text style={styles.checkIcon}>{'✓'}</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.text,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  settingCard: {
    overflow: 'hidden',
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
    color: colors.text,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  settingArrow: {
    fontSize: 16,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 52,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  versionText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  versionNumber: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  copyright: {
    ...typography.caption,
    color: colors.textMuted,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  modalOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  modalOptionText: {
    ...typography.body,
    color: colors.text,
  },
  modalOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkIcon: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  modalCancel: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalCancelText: {
    ...typography.body,
    color: colors.textMuted,
  },
});

export default SettingsScreen;
