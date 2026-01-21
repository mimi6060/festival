import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/common';
import { useTheme, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../types';

type LiveChatNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'unavailable';

export const LiveChatScreen: React.FC = () => {
  const navigation = useNavigation<LiveChatNavigationProp>();
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [message, setMessage] = useState('');

  // Simulate WebSocket connection attempt
  useEffect(() => {
    const connectTimeout = setTimeout(() => {
      // Simulate connection attempt then show unavailable
      setConnectionStatus('unavailable');
    }, 2000);

    return () => clearTimeout(connectTimeout);
  }, []);

  const getStatusColor = useCallback(() => {
    switch (connectionStatus) {
      case 'connecting':
        return colors.warning;
      case 'connected':
        return colors.success;
      case 'disconnected':
      case 'unavailable':
        return colors.error;
      default:
        return colors.textMuted;
    }
  }, [connectionStatus, colors]);

  const getStatusText = useCallback(() => {
    switch (connectionStatus) {
      case 'connecting':
        return t('support.connecting') || 'Connecting...';
      case 'connected':
        return t('support.connected') || 'Connected';
      case 'disconnected':
        return t('support.disconnected') || 'Disconnected';
      case 'unavailable':
        return t('support.chatUnavailable') || 'Chat unavailable';
      default:
        return '';
    }
  }, [connectionStatus, t]);

  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    card: { backgroundColor: colors.surface },
    text: { color: colors.text },
    textMuted: { color: colors.textMuted },
    textSecondary: { color: colors.textSecondary },
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
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, dynamicStyles.text]}>
              {t('support.liveChat') || 'Live Chat'}
            </Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Chat Area */}
        <ScrollView
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {connectionStatus === 'unavailable' && (
            <Card style={[styles.unavailableCard, dynamicStyles.card]}>
              <Text style={styles.unavailableIcon}>{'...'}</Text>
              <Text style={[styles.unavailableTitle, dynamicStyles.text]}>
                {t('support.chatComingSoon') || 'Live Chat Coming Soon'}
              </Text>
              <Text style={[styles.unavailableText, dynamicStyles.textSecondary]}>
                {t('support.chatComingSoonDesc') ||
                  'Our live chat feature is currently under development. Real-time WebSocket support will be available soon!'}
              </Text>

              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>{'>'}</Text>
                  <Text style={[styles.featureText, dynamicStyles.textSecondary]}>
                    {t('support.featureRealtime') || 'Real-time messaging with support agents'}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>{'>'}</Text>
                  <Text style={[styles.featureText, dynamicStyles.textSecondary]}>
                    {t('support.featureAttachments') || 'Image and file attachments'}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>{'>'}</Text>
                  <Text style={[styles.featureText, dynamicStyles.textSecondary]}>
                    {t('support.featureHistory') || 'Chat history and ticket tracking'}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>{'>'}</Text>
                  <Text style={[styles.featureText, dynamicStyles.textSecondary]}>
                    {t('support.featurePush') || 'Push notifications for responses'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('ContactUs')}
              >
                <Text style={[styles.contactButtonText, { color: colors.white }]}>
                  {t('support.contactUsInstead') || 'Contact Us Instead'}
                </Text>
              </TouchableOpacity>
            </Card>
          )}

          {connectionStatus === 'connecting' && (
            <View style={styles.connectingContainer}>
              <Text style={styles.connectingIcon}>{'...'}</Text>
              <Text style={[styles.connectingText, dynamicStyles.textMuted]}>
                {t('support.connectingToChat') || 'Connecting to chat server...'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Input Area (disabled for placeholder) */}
        <View style={[styles.inputArea, { backgroundColor: colors.surface }]}>
          <TextInput
            style={[styles.input, dynamicStyles.input]}
            placeholder={t('support.typeMessage') || 'Type a message...'}
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            editable={connectionStatus === 'connected'}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  connectionStatus === 'connected' ? colors.primary : colors.textMuted,
              },
            ]}
            disabled={connectionStatus !== 'connected' || !message.trim()}
          >
            <Text style={[styles.sendIcon, { color: colors.white }]}>{'>'}</Text>
          </TouchableOpacity>
        </View>
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    ...typography.caption,
  },
  placeholder: {
    width: 40,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: spacing.md,
    flexGrow: 1,
    justifyContent: 'center',
  },
  unavailableCard: {
    padding: spacing.xl,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  unavailableIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  unavailableTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  unavailableText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  featureList: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  featureIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  featureText: {
    ...typography.small,
    flex: 1,
    lineHeight: 20,
  },
  contactButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  contactButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  connectingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  connectingIcon: {
    fontSize: 32,
    marginBottom: spacing.md,
  },
  connectingText: {
    ...typography.body,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  input: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    borderWidth: 1,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LiveChatScreen;
