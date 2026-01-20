import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button } from '../../components/common';
import { QRCodeDisplay } from '../../components/tickets';
import { useTicketStore, useAuthStore } from '../../store';
import { colors, spacing, typography, borderRadius, webPressable } from '../../theme';
import type { RootStackParamList, Ticket } from '../../types';

const { width } = Dimensions.get('window');

type TicketDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TicketDetail'>;
type TicketDetailRouteProp = RouteProp<RootStackParamList, 'TicketDetail'>;

// Mock ticket for demo - userId matches the demo user
const mockTicket: Ticket = {
  id: '1',
  userId: 'demo-user-id', // Demo user ID for testing
  eventId: 'e1',
  eventName: 'Festival Pass - Weekend Complet',
  eventDate: '2024-07-15',
  eventTime: '12:00',
  venue: 'Parc des Expositions, Paris',
  ticketType: 'vip',
  price: 250,
  qrCode: 'FEST-VIP-2024-001-ABCD1234-XYZ789',
  status: 'valid',
  purchasedAt: '2024-06-01T10:00:00Z',
  seatInfo: 'Zone VIP - Acces prioritaire',
};

export const TicketDetailScreen: React.FC = () => {
  const navigation = useNavigation<TicketDetailNavigationProp>();
  const route = useRoute<TicketDetailRouteProp>();
  const { tickets, selectTicket } = useTicketStore();
  const { user } = useAuthStore();
  const [_brightness, setBrightness] = useState(100);
  const [accessDenied, setAccessDenied] = useState(false);

  const ticketId = route.params?.ticketId;
  const foundTicket = tickets.find((t) => t.id === ticketId);

  // Security: Validate ticket ownership
  // Only allow access if the ticket belongs to the current user
  const isOwner = foundTicket?.userId === user?.id;

  // Use the found ticket only if user owns it, otherwise use mock for demo
  // In production, mock should be removed and unauthorized access should redirect
  const ticket = isOwner ? foundTicket : user?.id === 'demo-user-id' ? mockTicket : null;

  useEffect(() => {
    // Security check: If ticket exists but user doesn't own it, deny access
    if (foundTicket && user && foundTicket.userId !== user.id) {
      setAccessDenied(true);
      Alert.alert(
        'Access Denied',
        'You do not have permission to view this ticket.',
        [
          {
            text: 'Go Back',
            onPress: () => navigation.goBack(),
          },
        ],
        { cancelable: false }
      );
      return;
    }

    // If no ticket found at all (not in user's tickets), also deny
    if (ticketId && !foundTicket && user?.id !== 'demo-user-id') {
      setAccessDenied(true);
      Alert.alert(
        'Ticket Not Found',
        'This ticket does not exist or you do not have access to it.',
        [
          {
            text: 'Go Back',
            onPress: () => navigation.goBack(),
          },
        ],
        { cancelable: false }
      );
      return;
    }

    if (ticket) {
      selectTicket(ticket);
    }
    return () => selectTicket(null);
  }, [foundTicket, user, ticketId, ticket, navigation, selectTicket]);

  // Show loading or access denied screen when ticket is not available
  if (accessDenied || !ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, webPressable]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail du billet</Text>
          <View style={styles.shareButton} />
        </View>
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedIcon}>🔒</Text>
          <Text style={styles.accessDeniedTitle}>
            {accessDenied ? 'Acces refuse' : 'Chargement...'}
          </Text>
          <Text style={styles.accessDeniedMessage}>
            {accessDenied
              ? "Vous n'avez pas l'autorisation de voir ce billet."
              : 'Veuillez patienter...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = () => {
    switch (ticket.status) {
      case 'valid':
        return colors.success;
      case 'used':
        return colors.textMuted;
      case 'expired':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const getTicketTypeLabel = () => {
    switch (ticket.ticketType) {
      case 'vip':
        return 'VIP';
      case 'backstage':
        return 'BACKSTAGE';
      default:
        return 'STANDARD';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatPurchaseDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Mon billet pour ${ticket.eventName}\n${formatDate(ticket.eventDate)} a ${ticket.eventTime}\n${ticket.venue}`,
        title: ticket.eventName,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleMaxBrightness = () => {
    // In a real app, this would adjust screen brightness
    setBrightness(100);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, webPressable]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail du billet</Text>
        <TouchableOpacity style={[styles.shareButton, webPressable]} onPress={handleShare}>
          <Text style={styles.shareIcon}>📤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Ticket Type Badge */}
        <View style={styles.badgeContainer}>
          <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.typeBadgeText}>{getTicketTypeLabel()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {ticket.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Event Name */}
        <Text style={styles.eventName}>{ticket.eventName}</Text>

        {/* QR Code Section */}
        <Card style={styles.qrCard}>
          <QRCodeDisplay
            value={ticket.qrCode}
            size={width - 140}
            title="Votre QR Code"
            subtitle="Presentez ce code a l'entree"
          />

          <Button
            title="Luminosite maximale"
            onPress={handleMaxBrightness}
            variant="outline"
            size="sm"
            icon={<Text>☀️</Text>}
            style={styles.brightnessButton}
          />
        </Card>

        {/* Event Details */}
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Text style={styles.iconEmoji}>📅</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(ticket.eventDate)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Text style={styles.iconEmoji}>⏰</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Heure</Text>
              <Text style={styles.detailValue}>{ticket.eventTime}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Text style={styles.iconEmoji}>📍</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Lieu</Text>
              <Text style={styles.detailValue}>{ticket.venue}</Text>
            </View>
          </View>

          {ticket.seatInfo && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Text style={styles.iconEmoji}>🎟️</Text>
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Place</Text>
                  <Text style={styles.detailValue}>{ticket.seatInfo}</Text>
                </View>
              </View>
            </>
          )}
        </Card>

        {/* Purchase Info */}
        <Card style={styles.purchaseCard}>
          <Text style={styles.purchaseTitle}>Informations d'achat</Text>
          <View style={styles.purchaseRow}>
            <Text style={styles.purchaseLabel}>Reference</Text>
            <Text style={styles.purchaseValue}>{ticket.id.toUpperCase()}</Text>
          </View>
          <View style={styles.purchaseRow}>
            <Text style={styles.purchaseLabel}>Date d'achat</Text>
            <Text style={styles.purchaseValue}>{formatPurchaseDate(ticket.purchasedAt)}</Text>
          </View>
          <View style={styles.purchaseRow}>
            <Text style={styles.purchaseLabel}>Prix</Text>
            <Text style={styles.purchaseValue}>{ticket.price.toFixed(2)} EUR</Text>
          </View>
        </Card>

        {/* Help Section */}
        <TouchableOpacity style={[styles.helpButton, webPressable]}>
          <Text style={styles.helpIcon}>❓</Text>
          <Text style={styles.helpText}>Besoin d'aide avec ce billet?</Text>
          <Text style={styles.helpArrow}>→</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  typeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  typeBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  eventName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  qrCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  brightnessButton: {
    marginTop: spacing.md,
  },
  detailsCard: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconEmoji: {
    fontSize: 18,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 56,
  },
  purchaseCard: {
    marginBottom: spacing.md,
  },
  purchaseTitle: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  purchaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  purchaseLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  purchaseValue: {
    ...typography.small,
    color: colors.text,
    fontWeight: '500',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  helpIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  helpText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  helpArrow: {
    fontSize: 18,
    color: colors.textMuted,
  },
  // Access denied styles
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  accessDeniedIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  accessDeniedTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  accessDeniedMessage: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default TicketDetailScreen;
