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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button } from '../../components/common';
import { useAuthStore, useNotificationStore } from '../../store';
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
        {showArrow && !rightElement && <Text style={styles.settingArrow}>></Text>}
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

  const [darkMode, setDarkMode] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [language, setLanguage] = useState('Francais');

  const handleLanguageChange = () => {
    Alert.alert(
      'Langue',
      'Selectionnez votre langue',
      [
        { text: 'Francais', onPress: () => setLanguage('Francais') },
        { text: 'English', onPress: () => setLanguage('English') },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
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
          <Text style={styles.title}>Parametres</Text>
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
              label="Mode sombre"
              showArrow={false}
              rightElement={
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="🌍"
              label="Langue"
              value={language}
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
                  onValueChange={setBiometricEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="🔒"
              label="Changer le mot de passe"
              onPress={() => Alert.alert('Info', 'Changement de mot de passe a venir')}
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
                  value={offlineMode}
                  onValueChange={setOfflineMode}
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
              onPress={() => Alert.alert('Info', 'Telechargement a venir')}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
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
});

export default SettingsScreen;
