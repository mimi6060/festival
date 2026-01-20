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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button } from '../../components/common';
import { useAuthStore } from '../../store';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../types';

type ContactUsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ContactMethod {
  id: string;
  title: string;
  icon: string;
  subtitle: string;
  action: () => void;
}

type RequestType = 'general' | 'ticket' | 'payment' | 'technical' | 'other';

const REQUEST_TYPES: { value: RequestType; label: string; icon: string }[] = [
  { value: 'general', label: 'Question generale', icon: '❓' },
  { value: 'ticket', label: 'Probleme de billet', icon: '🎫' },
  { value: 'payment', label: 'Paiement / Remboursement', icon: '💰' },
  { value: 'technical', label: 'Probleme technique', icon: '🔧' },
  { value: 'other', label: 'Autre', icon: '📝' },
];

export const ContactUsScreen: React.FC = () => {
  const navigation = useNavigation<ContactUsNavigationProp>();
  const { user } = useAuthStore();

  const [requestType, setRequestType] = useState<RequestType>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const showAlert = (title: string, msg: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
      onOk?.();
    } else {
      Alert.alert(title, msg, [{ text: 'OK', onPress: onOk }]);
    }
  };

  const contactMethods: ContactMethod[] = [
    {
      id: 'email',
      title: 'Email',
      icon: '📧',
      subtitle: 'support@festival.com',
      action: () => Linking.openURL('mailto:support@festival.com'),
    },
    {
      id: 'phone',
      title: 'Telephone',
      icon: '📞',
      subtitle: '+33 1 23 45 67 89',
      action: () => Linking.openURL('tel:+33123456789'),
    },
    {
      id: 'chat',
      title: 'Chat en direct',
      icon: '💬',
      subtitle: 'Disponible 9h-18h',
      action: () => showAlert('Chat', 'Le chat sera disponible bientot'),
    },
  ];

  const handleSubmit = async () => {
    if (!subject.trim()) {
      showAlert('Erreur', 'Veuillez saisir un sujet');
      return;
    }
    if (!message.trim()) {
      showAlert('Erreur', 'Veuillez saisir votre message');
      return;
    }
    if (message.trim().length < 20) {
      showAlert('Erreur', 'Votre message doit contenir au moins 20 caracteres');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      showAlert(
        'Message envoye',
        'Nous avons bien recu votre message. Notre equipe vous repondra dans les plus brefs delais.',
        () => navigation.goBack()
      );
    } catch {
      showAlert('Erreur', "Impossible d'envoyer le message. Veuillez reessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nous contacter</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Contact Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact direct</Text>
            <View style={styles.methodsRow}>
              {contactMethods.map((method) => (
                <TouchableOpacity key={method.id} style={styles.methodCard} onPress={method.action}>
                  <Text style={styles.methodIcon}>{method.icon}</Text>
                  <Text style={styles.methodTitle}>{method.title}</Text>
                  <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Contact Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Formulaire de contact</Text>
            <Card style={styles.formCard}>
              {/* User Info */}
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user?.firstName?.charAt(0) || '?'}
                    {user?.lastName?.charAt(0) || ''}
                  </Text>
                </View>
                <View>
                  <Text style={styles.userName}>
                    {user?.firstName} {user?.lastName}
                  </Text>
                  <Text style={styles.userEmail}>{user?.email}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Request Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type de demande</Text>
                <View style={styles.typeGrid}>
                  {REQUEST_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeButton,
                        requestType === type.value && styles.typeButtonSelected,
                      ]}
                      onPress={() => setRequestType(type.value)}
                    >
                      <Text style={styles.typeIcon}>{type.icon}</Text>
                      <Text
                        style={[
                          styles.typeLabel,
                          requestType === type.value && styles.typeLabelSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Subject */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sujet *</Text>
                <TextInput
                  style={styles.input}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Resumez votre demande..."
                  placeholderTextColor={colors.textMuted}
                  maxLength={100}
                />
                <Text style={styles.charCount}>{subject.length}/100</Text>
              </View>

              {/* Message */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Message *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Decrivez votre demande en detail..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <Text style={styles.charCount}>{message.length}/1000</Text>
              </View>

              {/* Submit Button */}
              <Button
                title={loading ? 'Envoi en cours...' : 'Envoyer le message'}
                onPress={handleSubmit}
                disabled={loading || !subject.trim() || !message.trim()}
                style={styles.submitButton}
              />
            </Card>
          </View>

          {/* Response Time */}
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>⏱️</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Delai de reponse</Text>
                <Text style={styles.infoText}>
                  Notre equipe vous repondra generalement sous 24 heures ouvrables. Pour les
                  urgences, preferez le telephone.
                </Text>
              </View>
            </View>
          </Card>

          {/* Social Links */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nous suivre</Text>
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => Linking.openURL('https://twitter.com/festival')}
              >
                <Text style={styles.socialIcon}>𝕏</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => Linking.openURL('https://instagram.com/festival')}
              >
                <Text style={styles.socialIcon}>📷</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => Linking.openURL('https://facebook.com/festival')}
              >
                <Text style={styles.socialIcon}>f</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => Linking.openURL('https://tiktok.com/@festival')}
              >
                <Text style={styles.socialIcon}>♪</Text>
              </TouchableOpacity>
            </View>
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.small,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  methodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  methodIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  methodTitle: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
  },
  methodSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  formCard: {
    paddingVertical: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userAvatarText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  userName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  userEmail: {
    ...typography.caption,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    margin: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeButtonSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  typeIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  typeLabel: {
    ...typography.caption,
    color: colors.text,
  },
  typeLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 120,
    paddingTop: spacing.sm,
  },
  charCount: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  socialIcon: {
    fontSize: 22,
    color: colors.text,
  },
});

export default ContactUsScreen;
