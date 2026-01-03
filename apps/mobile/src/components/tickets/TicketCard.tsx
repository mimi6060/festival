import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import type { Ticket } from '../../types';

interface TicketCardProps {
  ticket: Ticket;
  onPress: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onPress }) => {
  const getStatusColor = () => {
    switch (ticket.status) {
      case 'valid':
        return colors.success;
      case 'used':
        return colors.textMuted;
      case 'expired':
        return colors.error;
      case 'cancelled':
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

  const getTicketTypeColor = () => {
    switch (ticket.ticketType) {
      case 'vip':
        return colors.secondary;
      case 'backstage':
        return colors.accent;
      default:
        return colors.primary;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date inconnue';

    // Handle YYYY-MM-DD format explicitly
    let date: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) return 'Date inconnue';

    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Ticket Type Badge */}
      <View style={[styles.typeBadge, { backgroundColor: getTicketTypeColor() }]}>
        <Text style={styles.typeBadgeText}>{getTicketTypeLabel()}</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.eventName} numberOfLines={2}>
          {ticket.eventName}
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(ticket.eventDate)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Heure</Text>
            <Text style={styles.infoValue}>{ticket.eventTime}</Text>
          </View>
        </View>

        <View style={styles.venueRow}>
          <Text style={styles.venueIcon}>📍</Text>
          <Text style={styles.venue} numberOfLines={1}>
            {ticket.venue}
          </Text>
        </View>

        {ticket.seatInfo && (
          <View style={styles.seatRow}>
            <Text style={styles.seatIcon}>🎟️</Text>
            <Text style={styles.seat}>{ticket.seatInfo}</Text>
          </View>
        )}
      </View>

      {/* Status and Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerCircleLeft} />
        <View style={styles.dividerLine} />
        <View style={styles.dividerCircleRight} />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {ticket.status.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.viewQr}>Voir QR Code →</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  typeBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    borderBottomRightRadius: borderRadius.md,
  },
  typeBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1,
  },
  content: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  eventName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  infoItem: {
    marginRight: spacing.xl,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  venueIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  venue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  seat: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  dividerCircleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background,
    marginLeft: -10,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  dividerCircleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background,
    marginRight: -10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
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
  viewQr: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default TicketCard;
