import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/common';
import { useAuthStore, useTicketStore, useWalletStore, useProgramStore, useNotificationStore, useSettingsStore, languageLabels, themeLabels } from '../../store';
import type { Language, Theme } from '../../store';
import { offlineService } from '../../services';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../types';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

interface MenuItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
  showArrow?: boolean;
  destructive?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  value,
  onPress,
  showArrow = true,
  destructive = false,
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemLeft}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>
        {label}
      </Text>
    </View>
    <View style={styles.menuItemRight}>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      {showArrow && <Text style={styles.menuArrow}>→</Text>}
    </View>
  </TouchableOpacity>
);

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNavigationProp>();
  const { user, logout } = useAuthStore();
  const ticketStore = useTicketStore();
  const walletStore = useWalletStore();
  const programStore = useProgramStore();
  const notificationStore = useNotificationStore();
  const { language, theme, setLanguage, setTheme } = useSettingsStore();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Deconnexion',
      'Etes-vous sur de vouloir vous deconnecter?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Deconnecter',
          style: 'destructive',
          onPress: () => {
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
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irreversible. Toutes vos donnees seront supprimees.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            // In a real app, this would call an API to delete the account
            Alert.alert('Info', 'Contactez le support pour supprimer votre compte.');
          },
        },
      ]
    );
  };

  const getInitials = () => {
    if (!user) return '?';
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Text style={styles.editAvatarIcon}>📷</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <Card padding="none" style={styles.menuCard}>
            <MenuItem
              icon="👤"
              label="Informations personnelles"
              onPress={() => navigation.navigate('EditProfile')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="📧"
              label="Email"
              value={user?.email}
              onPress={() => navigation.navigate('EditProfile')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="📱"
              label="Telephone"
              value={user?.phone || 'Non renseigne'}
              onPress={() => navigation.navigate('EditProfile')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="🔒"
              label="Mot de passe"
              onPress={() => navigation.navigate('ChangePassword')}
            />
          </Card>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <Card padding="none" style={styles.menuCard}>
            <MenuItem
              icon="🔔"
              label="Notifications"
              value={notificationStore.pushEnabled ? 'Actives' : 'Desactivees'}
              onPress={() => navigation.navigate('Settings')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="🌙"
              label="Theme"
              value={themeLabels[theme]}
              onPress={() => setShowThemeModal(true)}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="🌍"
              label="Langue"
              value={languageLabels[language]}
              onPress={() => setShowLanguageModal(true)}
            />
          </Card>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Card padding="none" style={styles.menuCard}>
            <MenuItem
              icon="❓"
              label="Centre d'aide"
              onPress={() => navigation.navigate('HelpCenter')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="💬"
              label="Nous contacter"
              onPress={() => navigation.navigate('ContactUs')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="📄"
              label="Conditions d'utilisation"
              onPress={() => navigation.navigate('HelpCenter')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="🔐"
              label="Politique de confidentialite"
              onPress={() => navigation.navigate('HelpCenter')}
            />
          </Card>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Card padding="none" style={styles.menuCard}>
            <MenuItem
              icon="🚪"
              label="Deconnexion"
              onPress={handleLogout}
              showArrow={false}
              destructive
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="🗑️"
              label="Supprimer le compte"
              onPress={handleDeleteAccount}
              showArrow={false}
              destructive
            />
          </Card>
        </View>

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={styles.version}>Festival App v1.0.0</Text>
          <Text style={styles.copyright}>2024 Festival. Tous droits reserves.</Text>
        </View>
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
                  <Text style={styles.checkIcon}>✓</Text>
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
                  <Text style={styles.checkIcon}>✓</Text>
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
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h1,
    color: colors.white,
    fontSize: 36,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  editAvatarIcon: {
    fontSize: 16,
  },
  userName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userEmail: {
    ...typography.body,
    color: colors.textSecondary,
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
  menuCard: {
    overflow: 'hidden',
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
    color: colors.text,
  },
  menuLabelDestructive: {
    color: colors.error,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuValue: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  menuArrow: {
    fontSize: 16,
    color: colors.textMuted,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 52,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  version: {
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 340,
    padding: spacing.lg,
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
    backgroundColor: colors.primary + '20',
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
  },
  modalCancel: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default ProfileScreen;
