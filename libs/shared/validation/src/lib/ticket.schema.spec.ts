/**
 * Unit tests for ticket validation schemas
 */

import {
  ticketStatusEnum,
  ticketTypeStatusEnum,
  ticketCategoryEnum,
  accessLevelEnum,
  qrCodeSchema,
  ticketCodeSchema,
  ticketHolderSchema,
  createTicketTypeSchema,
  updateTicketTypeSchema,
  purchaseTicketItemSchema,
  purchaseTicketsSchema,
  validateTicketSchema,
  transferTicketSchema,
  refundTicketSchema,
  ticketQuerySchema,
  ticketTypeQuerySchema,
  scanEventSchema,
  batchTicketOperationSchema,
  promoCodeSchema,
  applyPromoCodeSchema,
  ticketStatsQuerySchema,
  ticketIdSchema,
  ticketTypeIdSchema,
} from './ticket.schema';

describe('ticket.schema', () => {
  // ============================================================================
  // Enums
  // ============================================================================

  describe('ticketStatusEnum', () => {
    it('should accept all valid statuses', () => {
      const validStatuses = ['valid', 'used', 'expired', 'cancelled', 'refunded', 'transferred', 'pending'];
      validStatuses.forEach((status) => {
        const result = ticketStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const result = ticketStatusEnum.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('ticketTypeStatusEnum', () => {
    it('should accept all valid statuses', () => {
      const validStatuses = ['draft', 'on_sale', 'sold_out', 'off_sale', 'archived'];
      validStatuses.forEach((status) => {
        const result = ticketTypeStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('ticketCategoryEnum', () => {
    it('should accept all valid categories', () => {
      const categories = [
        'general_admission', 'vip', 'backstage', 'camping', 'parking',
        'premium', 'early_bird', 'student', 'group', 'press', 'staff', 'artist', 'sponsor',
      ];
      categories.forEach((category) => {
        const result = ticketCategoryEnum.safeParse(category);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('accessLevelEnum', () => {
    it('should accept all valid access levels', () => {
      const levels = ['standard', 'premium', 'vip', 'backstage', 'all_access'];
      levels.forEach((level) => {
        const result = accessLevelEnum.safeParse(level);
        expect(result.success).toBe(true);
      });
    });
  });

  // ============================================================================
  // QR Code and Ticket Code Schemas
  // ============================================================================

  describe('qrCodeSchema', () => {
    it('should accept valid QR code', () => {
      const result = qrCodeSchema.safeParse('ABCDEF1234567890ABCDEF');
      expect(result.success).toBe(true);
    });

    it('should reject QR code too short (<20 chars)', () => {
      const result = qrCodeSchema.safeParse('ABCD1234');
      expect(result.success).toBe(false);
    });

    it('should reject QR code too long (>500 chars)', () => {
      const result = qrCodeSchema.safeParse('A'.repeat(501));
      expect(result.success).toBe(false);
    });

    it('should accept QR code at boundary lengths', () => {
      const minResult = qrCodeSchema.safeParse('A'.repeat(20));
      const maxResult = qrCodeSchema.safeParse('A'.repeat(500));
      expect(minResult.success).toBe(true);
      expect(maxResult.success).toBe(true);
    });
  });

  describe('ticketCodeSchema', () => {
    it('should accept valid ticket code', () => {
      const result = ticketCodeSchema.safeParse('TICKET-2025-001');
      expect(result.success).toBe(true);
    });

    it('should accept uppercase alphanumeric with dashes', () => {
      const result = ticketCodeSchema.safeParse('ABC-123-DEF');
      expect(result.success).toBe(true);
    });

    it('should reject lowercase letters', () => {
      const result = ticketCodeSchema.safeParse('ticket-2025');
      expect(result.success).toBe(false);
    });

    it('should reject special characters', () => {
      const result = ticketCodeSchema.safeParse('TICKET_2025!');
      expect(result.success).toBe(false);
    });

    it('should reject code too short (<8 chars)', () => {
      const result = ticketCodeSchema.safeParse('ABC123');
      expect(result.success).toBe(false);
    });

    it('should reject code too long (>50 chars)', () => {
      const result = ticketCodeSchema.safeParse('A'.repeat(51));
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Ticket Holder Schema
  // ============================================================================

  describe('ticketHolderSchema', () => {
    const validHolder = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
    };

    it('should accept valid ticket holder', () => {
      const result = ticketHolderSchema.safeParse(validHolder);
      expect(result.success).toBe(true);
    });

    it('should accept holder with optional fields', () => {
      const result = ticketHolderSchema.safeParse({
        ...validHolder,
        phone: '+33612345678',
        dateOfBirth: '1990-05-15',
        documentType: 'passport',
        documentNumber: 'AB123456',
      });
      expect(result.success).toBe(true);
    });

    it('should trim firstName and lastName', () => {
      const result = ticketHolderSchema.safeParse({
        ...validHolder,
        firstName: '  Jean  ',
        lastName: '  Dupont  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('Jean');
        expect(result.data.lastName).toBe('Dupont');
      }
    });

    it('should reject empty firstName', () => {
      const result = ticketHolderSchema.safeParse({ ...validHolder, firstName: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty lastName', () => {
      const result = ticketHolderSchema.safeParse({ ...validHolder, lastName: '' });
      expect(result.success).toBe(false);
    });

    it('should reject firstName too long (>100 chars)', () => {
      const result = ticketHolderSchema.safeParse({ ...validHolder, firstName: 'A'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = ticketHolderSchema.safeParse({ ...validHolder, email: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should accept valid document types', () => {
      const types = ['id_card', 'passport', 'driving_license'];
      types.forEach((type) => {
        const result = ticketHolderSchema.safeParse({ ...validHolder, documentType: type });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid document type', () => {
      const result = ticketHolderSchema.safeParse({ ...validHolder, documentType: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Create Ticket Type Schema
  // ============================================================================

  describe('createTicketTypeSchema', () => {
    const validTicketType = {
      festivalId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'General Admission',
      category: 'general_admission',
      price: 5000,
      totalQuantity: 1000,
      salesStartDate: '2025-01-01T00:00:00Z',
      salesEndDate: '2025-07-14T23:59:59Z',
    };

    it('should accept valid ticket type', () => {
      const result = createTicketTypeSchema.safeParse(validTicketType);
      expect(result.success).toBe(true);
    });

    it('should provide default values', () => {
      const result = createTicketTypeSchema.safeParse(validTicketType);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accessLevel).toBe('standard');
        expect(result.data.currency).toBe('EUR');
        expect(result.data.maxPerOrder).toBe(10);
        expect(result.data.minPerOrder).toBe(1);
        expect(result.data.isTransferable).toBe(true);
        expect(result.data.isRefundable).toBe(true);
        expect(result.data.requiresHolderInfo).toBe(false);
      }
    });

    it('should accept ticket type with all optional fields', () => {
      const result = createTicketTypeSchema.safeParse({
        ...validTicketType,
        description: 'Standard entry to the festival',
        accessLevel: 'vip',
        maxPerOrder: 5,
        minPerOrder: 2,
        validFrom: '2025-07-15T10:00:00Z',
        validUntil: '2025-07-17T23:59:59Z',
        allowedZones: ['550e8400-e29b-41d4-a716-446655440001'],
        allowedDays: ['2025-07-15', '2025-07-16'],
        isTransferable: false,
        isRefundable: false,
        refundDeadline: '2025-07-01T00:00:00Z',
        requiresHolderInfo: true,
        ageRestriction: 18,
        termsAndConditions: 'No refunds after entry.',
      });
      expect(result.success).toBe(true);
    });

    it('should trim name', () => {
      const result = createTicketTypeSchema.safeParse({
        ...validTicketType,
        name: '  General Admission  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('General Admission');
      }
    });

    it('should reject name too short (<2 chars)', () => {
      const result = createTicketTypeSchema.safeParse({ ...validTicketType, name: 'A' });
      expect(result.success).toBe(false);
    });

    it('should reject name too long (>100 chars)', () => {
      const result = createTicketTypeSchema.safeParse({ ...validTicketType, name: 'A'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('should reject invalid festivalId', () => {
      const result = createTicketTypeSchema.safeParse({ ...validTicketType, festivalId: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject negative price', () => {
      const result = createTicketTypeSchema.safeParse({ ...validTicketType, price: -100 });
      expect(result.success).toBe(false);
    });

    it('should accept zero price (free tickets)', () => {
      const result = createTicketTypeSchema.safeParse({ ...validTicketType, price: 0 });
      expect(result.success).toBe(true);
    });

    it('should reject non-integer price', () => {
      const result = createTicketTypeSchema.safeParse({ ...validTicketType, price: 49.99 });
      expect(result.success).toBe(false);
    });

    it('should reject totalQuantity less than 1', () => {
      const result = createTicketTypeSchema.safeParse({ ...validTicketType, totalQuantity: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject totalQuantity greater than 1000000', () => {
      const result = createTicketTypeSchema.safeParse({ ...validTicketType, totalQuantity: 1000001 });
      expect(result.success).toBe(false);
    });

    it('should reject salesEndDate before salesStartDate', () => {
      const result = createTicketTypeSchema.safeParse({
        ...validTicketType,
        salesStartDate: '2025-07-15T00:00:00Z',
        salesEndDate: '2025-07-01T00:00:00Z',
      });
      expect(result.success).toBe(false);
    });

    it('should reject minPerOrder greater than maxPerOrder', () => {
      const result = createTicketTypeSchema.safeParse({
        ...validTicketType,
        minPerOrder: 10,
        maxPerOrder: 5,
      });
      expect(result.success).toBe(false);
    });

    it('should accept minPerOrder equal to maxPerOrder', () => {
      const result = createTicketTypeSchema.safeParse({
        ...validTicketType,
        minPerOrder: 5,
        maxPerOrder: 5,
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Update Ticket Type Schema
  // ============================================================================

  describe('updateTicketTypeSchema', () => {
    it('should accept empty update (all optional)', () => {
      const result = updateTicketTypeSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept partial update', () => {
      const result = updateTicketTypeSchema.safeParse({
        name: 'Updated Ticket Name',
        price: 6000,
        status: 'on_sale',
      });
      expect(result.success).toBe(true);
    });

    it('should accept status update', () => {
      const result = updateTicketTypeSchema.safeParse({ status: 'sold_out' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = updateTicketTypeSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Purchase Ticket Schemas
  // ============================================================================

  describe('purchaseTicketItemSchema', () => {
    it('should accept valid purchase item', () => {
      const result = purchaseTicketItemSchema.safeParse({
        ticketTypeId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 2,
      });
      expect(result.success).toBe(true);
    });

    it('should accept item with holders', () => {
      const result = purchaseTicketItemSchema.safeParse({
        ticketTypeId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 2,
        holders: [
          { firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' },
          { firstName: 'Marie', lastName: 'Dupont', email: 'marie@example.com' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject quantity less than 1', () => {
      const result = purchaseTicketItemSchema.safeParse({
        ticketTypeId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject quantity greater than 20', () => {
      const result = purchaseTicketItemSchema.safeParse({
        ticketTypeId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 21,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('purchaseTicketsSchema', () => {
    const validPurchase = {
      festivalId: '550e8400-e29b-41d4-a716-446655440000',
      items: [
        { ticketTypeId: '550e8400-e29b-41d4-a716-446655440001', quantity: 2 },
      ],
      buyerEmail: 'buyer@example.com',
      buyerPhone: '+33612345678',
      buyerFirstName: 'Jean',
      buyerLastName: 'Dupont',
      acceptsTerms: true as const,
    };

    it('should accept valid purchase', () => {
      const result = purchaseTicketsSchema.safeParse(validPurchase);
      expect(result.success).toBe(true);
    });

    it('should provide default values', () => {
      const result = purchaseTicketsSchema.safeParse(validPurchase);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.acceptsMarketing).toBe(false);
        expect(result.data.locale).toBe('fr');
      }
    });

    it('should accept purchase with optional fields', () => {
      const result = purchaseTicketsSchema.safeParse({
        ...validPurchase,
        promoCode: 'SAVE10',
        acceptsMarketing: true,
        locale: 'en',
      });
      expect(result.success).toBe(true);
    });

    it('should trim buyer names', () => {
      const result = purchaseTicketsSchema.safeParse({
        ...validPurchase,
        buyerFirstName: '  Jean  ',
        buyerLastName: '  Dupont  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.buyerFirstName).toBe('Jean');
        expect(result.data.buyerLastName).toBe('Dupont');
      }
    });

    it('should normalize email to lowercase', () => {
      const result = purchaseTicketsSchema.safeParse({
        ...validPurchase,
        buyerEmail: 'BUYER@EXAMPLE.COM',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.buyerEmail).toBe('buyer@example.com');
      }
    });

    it('should reject purchase without accepting terms', () => {
      const result = purchaseTicketsSchema.safeParse({
        ...validPurchase,
        acceptsTerms: false,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty items array', () => {
      const result = purchaseTicketsSchema.safeParse({
        ...validPurchase,
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject too many items (>10)', () => {
      const result = purchaseTicketsSchema.safeParse({
        ...validPurchase,
        items: Array.from({ length: 11 }, (_, i) => ({
          ticketTypeId: `550e8400-e29b-41d4-a716-44665544000${i}`,
          quantity: 1,
        })),
      });
      expect(result.success).toBe(false);
    });

    it('should reject mismatched holders count', () => {
      const result = purchaseTicketsSchema.safeParse({
        ...validPurchase,
        items: [{
          ticketTypeId: '550e8400-e29b-41d4-a716-446655440001',
          quantity: 2,
          holders: [{ firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' }],
        }],
      });
      expect(result.success).toBe(false);
    });

    it('should accept matching holders count', () => {
      const result = purchaseTicketsSchema.safeParse({
        ...validPurchase,
        items: [{
          ticketTypeId: '550e8400-e29b-41d4-a716-446655440001',
          quantity: 2,
          holders: [
            { firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' },
            { firstName: 'Marie', lastName: 'Dupont', email: 'marie@example.com' },
          ],
        }],
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Validate Ticket Schema
  // ============================================================================

  describe('validateTicketSchema', () => {
    const festivalId = '550e8400-e29b-41d4-a716-446655440000';

    it('should accept validation with ticketId', () => {
      const result = validateTicketSchema.safeParse({
        ticketId: '550e8400-e29b-41d4-a716-446655440001',
        festivalId,
      });
      expect(result.success).toBe(true);
    });

    it('should accept validation with qrCode', () => {
      const result = validateTicketSchema.safeParse({
        qrCode: 'ABCDEF1234567890ABCDEF',
        festivalId,
      });
      expect(result.success).toBe(true);
    });

    it('should accept validation with ticketCode', () => {
      const result = validateTicketSchema.safeParse({
        ticketCode: 'TICKET-2025-001',
        festivalId,
      });
      expect(result.success).toBe(true);
    });

    it('should accept validation with optional fields', () => {
      const result = validateTicketSchema.safeParse({
        ticketId: '550e8400-e29b-41d4-a716-446655440001',
        festivalId,
        zoneId: '550e8400-e29b-41d4-a716-446655440002',
        scannerId: '550e8400-e29b-41d4-a716-446655440003',
        scanLocation: { latitude: 48.8566, longitude: 2.3522 },
      });
      expect(result.success).toBe(true);
    });

    it('should reject validation without any identifier', () => {
      const result = validateTicketSchema.safeParse({ festivalId });
      expect(result.success).toBe(false);
    });

    it('should reject invalid scanLocation coordinates', () => {
      const result = validateTicketSchema.safeParse({
        ticketId: '550e8400-e29b-41d4-a716-446655440001',
        festivalId,
        scanLocation: { latitude: 100, longitude: 200 },
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Transfer Ticket Schema
  // ============================================================================

  describe('transferTicketSchema', () => {
    const validTransfer = {
      ticketId: '550e8400-e29b-41d4-a716-446655440000',
      recipientEmail: 'recipient@example.com',
      recipientFirstName: 'Marie',
      recipientLastName: 'Dupont',
    };

    it('should accept valid transfer', () => {
      const result = transferTicketSchema.safeParse(validTransfer);
      expect(result.success).toBe(true);
    });

    it('should default notifyRecipient to true', () => {
      const result = transferTicketSchema.safeParse(validTransfer);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifyRecipient).toBe(true);
      }
    });

    it('should accept transfer with optional message', () => {
      const result = transferTicketSchema.safeParse({
        ...validTransfer,
        message: 'Enjoy the festival!',
        notifyRecipient: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject message too long (>500 chars)', () => {
      const result = transferTicketSchema.safeParse({
        ...validTransfer,
        message: 'A'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should trim recipient names', () => {
      const result = transferTicketSchema.safeParse({
        ...validTransfer,
        recipientFirstName: '  Marie  ',
        recipientLastName: '  Dupont  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.recipientFirstName).toBe('Marie');
        expect(result.data.recipientLastName).toBe('Dupont');
      }
    });
  });

  // ============================================================================
  // Refund Ticket Schema
  // ============================================================================

  describe('refundTicketSchema', () => {
    const validRefund = {
      ticketId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'customer_request',
    };

    it('should accept valid refund', () => {
      const result = refundTicketSchema.safeParse(validRefund);
      expect(result.success).toBe(true);
    });

    it('should accept all valid refund reasons', () => {
      const reasons = ['customer_request', 'event_cancelled', 'event_postponed', 'duplicate_purchase', 'fraud', 'other'];
      reasons.forEach((reason) => {
        const result = refundTicketSchema.safeParse({ ...validRefund, reason });
        expect(result.success).toBe(true);
      });
    });

    it('should accept refund with all optional fields', () => {
      const result = refundTicketSchema.safeParse({
        ...validRefund,
        reasonDetails: 'Customer could not attend due to illness',
        refundAmount: 2500,
        isPartialRefund: true,
        refundToOriginalMethod: true,
        notifyCustomer: true,
      });
      expect(result.success).toBe(true);
    });

    it('should provide default values', () => {
      const result = refundTicketSchema.safeParse(validRefund);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPartialRefund).toBe(false);
        expect(result.data.refundToOriginalMethod).toBe(true);
        expect(result.data.notifyCustomer).toBe(true);
      }
    });

    it('should reject invalid reason', () => {
      const result = refundTicketSchema.safeParse({ ...validRefund, reason: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Ticket Query Schema
  // ============================================================================

  describe('ticketQuerySchema', () => {
    it('should accept empty query with defaults', () => {
      const result = ticketQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should accept all filter options', () => {
      const result = ticketQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        ticketTypeId: '550e8400-e29b-41d4-a716-446655440002',
        status: 'valid',
        category: 'vip',
        purchaseDateFrom: '2025-01-01',
        purchaseDateTo: '2025-12-31',
        search: 'dupont',
        sortBy: 'purchaseDate',
        isUsed: true,
        isExpired: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept array of statuses', () => {
      const result = ticketQuerySchema.safeParse({
        status: ['valid', 'used', 'pending'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept array of categories', () => {
      const result = ticketQuerySchema.safeParse({
        category: ['general_admission', 'vip'],
      });
      expect(result.success).toBe(true);
    });

    it('should coerce boolean filters', () => {
      const result = ticketQuerySchema.safeParse({
        isUsed: 'true',
        isExpired: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isUsed).toBe(true);
        expect(result.data.isExpired).toBe(true);
      }
    });

    it('should accept boolean false directly', () => {
      const result = ticketQuerySchema.safeParse({
        isUsed: false,
        isExpired: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isUsed).toBe(false);
        expect(result.data.isExpired).toBe(false);
      }
    });
  });

  // ============================================================================
  // Ticket Type Query Schema
  // ============================================================================

  describe('ticketTypeQuerySchema', () => {
    it('should require festivalId', () => {
      const result = ticketTypeQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept valid query', () => {
      const result = ticketTypeQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all filter options', () => {
      const result = ticketTypeQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'on_sale',
        category: 'vip',
        accessLevel: 'premium',
        minPrice: 1000,
        maxPrice: 10000,
        hasAvailability: true,
        isOnSale: true,
        search: 'general',
        sortBy: 'price',
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Scan Event Schema
  // ============================================================================

  describe('scanEventSchema', () => {
    const validScan = {
      ticketId: '550e8400-e29b-41d4-a716-446655440000',
      scanType: 'entry',
    };

    it('should accept valid scan event', () => {
      const result = scanEventSchema.safeParse(validScan);
      expect(result.success).toBe(true);
    });

    it('should accept all scan types', () => {
      const types = ['entry', 'exit', 'zone_access', 'reentry'];
      types.forEach((scanType) => {
        const result = scanEventSchema.safeParse({ ...validScan, scanType });
        expect(result.success).toBe(true);
      });
    });

    it('should accept scan with all optional fields', () => {
      const result = scanEventSchema.safeParse({
        ...validScan,
        scannerId: '550e8400-e29b-41d4-a716-446655440001',
        deviceId: 'DEVICE-001',
        zoneId: '550e8400-e29b-41d4-a716-446655440002',
        location: { latitude: 48.8566, longitude: 2.3522 },
        timestamp: '2025-07-15T14:30:00Z',
        isOffline: true,
      });
      expect(result.success).toBe(true);
    });

    it('should default isOffline to false', () => {
      const result = scanEventSchema.safeParse(validScan);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isOffline).toBe(false);
      }
    });
  });

  // ============================================================================
  // Batch Ticket Operation Schema
  // ============================================================================

  describe('batchTicketOperationSchema', () => {
    const validBatch = {
      ticketIds: [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
      ],
      operation: 'cancel',
    };

    it('should accept valid batch operation', () => {
      const result = batchTicketOperationSchema.safeParse(validBatch);
      expect(result.success).toBe(true);
    });

    it('should accept all operation types', () => {
      const operations = ['cancel', 'refund', 'extend_validity', 'change_status'];
      operations.forEach((operation) => {
        const result = batchTicketOperationSchema.safeParse({ ...validBatch, operation });
        expect(result.success).toBe(true);
      });
    });

    it('should accept batch with optional fields', () => {
      const result = batchTicketOperationSchema.safeParse({
        ...validBatch,
        operation: 'change_status',
        newStatus: 'cancelled',
        reason: 'Festival cancelled due to weather',
        notifyHolders: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty ticketIds array', () => {
      const result = batchTicketOperationSchema.safeParse({
        ...validBatch,
        ticketIds: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject too many ticketIds (>100)', () => {
      const result = batchTicketOperationSchema.safeParse({
        ...validBatch,
        ticketIds: Array.from({ length: 101 }, (_, i) =>
          `550e8400-e29b-41d4-a716-44665544000${i.toString().padStart(1, '0')}`
        ).map(() => '550e8400-e29b-41d4-a716-446655440000'),
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Promo Code Schema
  // ============================================================================

  describe('promoCodeSchema', () => {
    const validPromo = {
      code: 'SUMMER2025',
      festivalId: '550e8400-e29b-41d4-a716-446655440000',
      discountType: 'percentage',
      discountValue: 20,
      validFrom: '2025-01-01T00:00:00Z',
      validUntil: '2025-07-14T23:59:59Z',
    };

    it('should accept valid promo code', () => {
      const result = promoCodeSchema.safeParse(validPromo);
      expect(result.success).toBe(true);
    });

    it('should transform code to uppercase', () => {
      const result = promoCodeSchema.safeParse({ ...validPromo, code: 'summer2025' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('SUMMER2025');
      }
    });

    it('should trim code', () => {
      const result = promoCodeSchema.safeParse({ ...validPromo, code: '  SUMMER2025  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('SUMMER2025');
      }
    });

    it('should accept all discount types', () => {
      const types = ['percentage', 'fixed_amount', 'free_ticket'];
      types.forEach((discountType) => {
        const result = promoCodeSchema.safeParse({ ...validPromo, discountType });
        expect(result.success).toBe(true);
      });
    });

    it('should reject percentage discount > 100', () => {
      const result = promoCodeSchema.safeParse({
        ...validPromo,
        discountType: 'percentage',
        discountValue: 150,
      });
      expect(result.success).toBe(false);
    });

    it('should accept 100% discount', () => {
      const result = promoCodeSchema.safeParse({
        ...validPromo,
        discountType: 'percentage',
        discountValue: 100,
      });
      expect(result.success).toBe(true);
    });

    it('should reject validUntil before validFrom', () => {
      const result = promoCodeSchema.safeParse({
        ...validPromo,
        validFrom: '2025-07-15T00:00:00Z',
        validUntil: '2025-01-01T00:00:00Z',
      });
      expect(result.success).toBe(false);
    });

    it('should reject code too short (<3 chars)', () => {
      const result = promoCodeSchema.safeParse({ ...validPromo, code: 'AB' });
      expect(result.success).toBe(false);
    });

    it('should provide default values', () => {
      const result = promoCodeSchema.safeParse(validPromo);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxUsesPerUser).toBe(1);
        expect(result.data.isActive).toBe(true);
      }
    });
  });

  // ============================================================================
  // Apply Promo Code Schema
  // ============================================================================

  describe('applyPromoCodeSchema', () => {
    it('should accept valid apply promo code request', () => {
      const result = applyPromoCodeSchema.safeParse({
        code: 'SUMMER2025',
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should transform code to uppercase and trim', () => {
      const result = applyPromoCodeSchema.safeParse({
        code: '  summer2025  ',
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('SUMMER2025');
      }
    });

    it('should reject empty code', () => {
      const result = applyPromoCodeSchema.safeParse({
        code: '',
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Ticket Stats Query Schema
  // ============================================================================

  describe('ticketStatsQuerySchema', () => {
    it('should accept valid stats query', () => {
      const result = ticketStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should default granularity to day', () => {
      const result = ticketStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.granularity).toBe('day');
      }
    });

    it('should accept metrics array', () => {
      const result = ticketStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        metrics: ['sales_count', 'sales_revenue', 'scans_count'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept groupBy option', () => {
      const result = ticketStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        groupBy: 'ticket_type',
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // ID Schemas
  // ============================================================================

  describe('ticketIdSchema', () => {
    it('should accept valid UUID', () => {
      const result = ticketIdSchema.safeParse({
        ticketId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = ticketIdSchema.safeParse({ ticketId: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('ticketTypeIdSchema', () => {
    it('should accept valid UUID', () => {
      const result = ticketTypeIdSchema.safeParse({
        ticketTypeId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = ticketTypeIdSchema.safeParse({ ticketTypeId: 'not-uuid' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should transform promo code to uppercase and trim', () => {
      const result = promoCodeSchema.safeParse({
        code: '  summer2025  ',
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        discountType: 'percentage',
        discountValue: 20,
        validFrom: '2025-01-01T00:00:00Z',
        validUntil: '2025-07-14T23:59:59Z',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('SUMMER2025');
      }
    });

    it('should handle special characters in holder names', () => {
      const result = ticketHolderSchema.safeParse({
        firstName: "Jean-Pierre",
        lastName: "O'Connor",
        email: 'jean@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should handle 0% discount', () => {
      const result = promoCodeSchema.safeParse({
        code: 'ZERO',
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        discountType: 'percentage',
        discountValue: 0,
        validFrom: '2025-01-01T00:00:00Z',
        validUntil: '2025-07-14T23:59:59Z',
      });
      expect(result.success).toBe(true);
    });
  });
});
