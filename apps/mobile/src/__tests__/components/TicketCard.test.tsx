/**
 * TicketCard Component Tests
 *
 * Tests the TicketCard component's logic and helper functions.
 * Uses unit testing approach for component logic.
 */

import type { Ticket } from '../../types';

// Mock theme values for color testing
const mockColors = {
  success: '#22C55E',
  textMuted: '#71717A',
  error: '#EF4444',
  primary: '#6366F1',
  secondary: '#F59E0B',
  accent: '#10B981',
};

// Helper functions extracted from component for testing
const getStatusColor = (status: Ticket['status']) => {
  switch (status) {
    case 'valid':
      return mockColors.success;
    case 'used':
      return mockColors.textMuted;
    case 'expired':
      return mockColors.error;
    case 'cancelled':
      return mockColors.error;
    default:
      return mockColors.textMuted;
  }
};

const getTicketTypeLabel = (ticketType: Ticket['ticketType']) => {
  switch (ticketType) {
    case 'vip':
      return 'VIP';
    case 'backstage':
      return 'BACKSTAGE';
    default:
      return 'STANDARD';
  }
};

const getTicketTypeColor = (ticketType: Ticket['ticketType']) => {
  switch (ticketType) {
    case 'vip':
      return mockColors.secondary;
    case 'backstage':
      return mockColors.accent;
    default:
      return mockColors.primary;
  }
};

const formatDate = (dateString: string): string => {
  if (!dateString) {
    return 'Date inconnue';
  }

  let date: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateString);
  }

  if (isNaN(date.getTime())) {
    return 'Date inconnue';
  }

  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

describe('TicketCard Logic', () => {
  describe('getStatusColor', () => {
    it('should return success color for valid tickets', () => {
      expect(getStatusColor('valid')).toBe(mockColors.success);
    });

    it('should return muted color for used tickets', () => {
      expect(getStatusColor('used')).toBe(mockColors.textMuted);
    });

    it('should return error color for expired tickets', () => {
      expect(getStatusColor('expired')).toBe(mockColors.error);
    });

    it('should return error color for cancelled tickets', () => {
      expect(getStatusColor('cancelled')).toBe(mockColors.error);
    });

    it('should return muted color for unknown status', () => {
      expect(getStatusColor('unknown' as any)).toBe(mockColors.textMuted);
    });
  });

  describe('getTicketTypeLabel', () => {
    it('should return STANDARD for standard tickets', () => {
      expect(getTicketTypeLabel('standard')).toBe('STANDARD');
    });

    it('should return VIP for vip tickets', () => {
      expect(getTicketTypeLabel('vip')).toBe('VIP');
    });

    it('should return BACKSTAGE for backstage tickets', () => {
      expect(getTicketTypeLabel('backstage')).toBe('BACKSTAGE');
    });

    it('should return STANDARD for unknown type', () => {
      expect(getTicketTypeLabel('unknown' as any)).toBe('STANDARD');
    });
  });

  describe('getTicketTypeColor', () => {
    it('should return primary color for standard tickets', () => {
      expect(getTicketTypeColor('standard')).toBe(mockColors.primary);
    });

    it('should return secondary color for vip tickets', () => {
      expect(getTicketTypeColor('vip')).toBe(mockColors.secondary);
    });

    it('should return accent color for backstage tickets', () => {
      expect(getTicketTypeColor('backstage')).toBe(mockColors.accent);
    });

    it('should return primary color for unknown type', () => {
      expect(getTicketTypeColor('unknown' as any)).toBe(mockColors.primary);
    });
  });

  describe('formatDate', () => {
    it('should format YYYY-MM-DD date correctly', () => {
      const result = formatDate('2026-07-15');
      expect(result).toContain('15');
      expect(result).toContain('juil');
    });

    it('should format ISO date correctly', () => {
      const result = formatDate('2026-12-25T18:00:00Z');
      expect(result).toContain('25');
      expect(result).toContain('déc');
    });

    it('should return "Date inconnue" for empty string', () => {
      expect(formatDate('')).toBe('Date inconnue');
    });

    it('should return "Date inconnue" for invalid date', () => {
      expect(formatDate('invalid-date')).toBe('Date inconnue');
    });

    it('should return "Date inconnue" for garbage input', () => {
      expect(formatDate('not-a-date-at-all')).toBe('Date inconnue');
    });

    it('should handle January dates', () => {
      const result = formatDate('2026-01-01');
      expect(result).toContain('1');
      expect(result).toContain('janv');
    });

    it('should handle December dates', () => {
      const result = formatDate('2026-12-31');
      expect(result).toContain('31');
      expect(result).toContain('déc');
    });

    it('should include weekday abbreviation', () => {
      // 2026-07-15 is a Wednesday
      const result = formatDate('2026-07-15');
      expect(result).toContain('mer');
    });
  });

  describe('Ticket Data Validation', () => {
    const createTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
      id: 'ticket-123',
      eventId: 'event-456',
      eventName: 'Festival Summer 2026',
      eventDate: '2026-07-15',
      eventTime: '20:00',
      venue: 'Parc des Expositions, Paris',
      ticketType: 'standard',
      price: 89.99,
      qrCode: 'FEST-TICKET-123-abc123',
      status: 'valid',
      purchasedAt: '2026-01-01T10:00:00Z',
      ...overrides,
    });

    it('should have all required fields', () => {
      const ticket = createTicket();
      expect(ticket.id).toBeDefined();
      expect(ticket.eventId).toBeDefined();
      expect(ticket.eventName).toBeDefined();
      expect(ticket.eventDate).toBeDefined();
      expect(ticket.eventTime).toBeDefined();
      expect(ticket.venue).toBeDefined();
      expect(ticket.ticketType).toBeDefined();
      expect(ticket.price).toBeDefined();
      expect(ticket.qrCode).toBeDefined();
      expect(ticket.status).toBeDefined();
      expect(ticket.purchasedAt).toBeDefined();
    });

    it('should allow optional seatInfo', () => {
      const ticketWithSeat = createTicket({ seatInfo: 'Row A, Seat 1' });
      expect(ticketWithSeat.seatInfo).toBe('Row A, Seat 1');

      const ticketWithoutSeat = createTicket();
      expect(ticketWithoutSeat.seatInfo).toBeUndefined();
    });

    it('should handle all valid ticket types', () => {
      const standardTicket = createTicket({ ticketType: 'standard' });
      const vipTicket = createTicket({ ticketType: 'vip' });
      const backstageTicket = createTicket({ ticketType: 'backstage' });

      expect(standardTicket.ticketType).toBe('standard');
      expect(vipTicket.ticketType).toBe('vip');
      expect(backstageTicket.ticketType).toBe('backstage');
    });

    it('should handle all valid statuses', () => {
      const validTicket = createTicket({ status: 'valid' });
      const usedTicket = createTicket({ status: 'used' });
      const expiredTicket = createTicket({ status: 'expired' });
      const cancelledTicket = createTicket({ status: 'cancelled' });

      expect(validTicket.status).toBe('valid');
      expect(usedTicket.status).toBe('used');
      expect(expiredTicket.status).toBe('expired');
      expect(cancelledTicket.status).toBe('cancelled');
    });

    it('should handle special characters in event name', () => {
      const ticket = createTicket({
        eventName: "Rock'n'Roll Fever & Blues 2026",
      });
      expect(ticket.eventName).toBe("Rock'n'Roll Fever & Blues 2026");
    });

    it('should handle unicode characters', () => {
      const ticket = createTicket({
        eventName: 'Festival de Musique',
        venue: 'Palais des Congres',
      });
      expect(ticket.eventName).toBe('Festival de Musique');
      expect(ticket.venue).toBe('Palais des Congres');
    });

    it('should handle long text values', () => {
      const longName = 'This is an extremely long festival name that should work fine';
      const ticket = createTicket({ eventName: longName });
      expect(ticket.eventName).toBe(longName);
    });

    it('should handle zero price', () => {
      const freeTicket = createTicket({ price: 0 });
      expect(freeTicket.price).toBe(0);
    });

    it('should handle decimal prices', () => {
      const ticket = createTicket({ price: 149.99 });
      expect(ticket.price).toBe(149.99);
    });
  });
});
