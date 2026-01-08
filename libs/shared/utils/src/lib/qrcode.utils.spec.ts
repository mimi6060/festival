import {
  generateQRData,
  parseQRData,
  generateQRSignature,
  validateSignature,
  generateSimpleTicketQR,
  verifySimpleTicketQR,
  generateCashlessQR,
  generateAccessQR,
  generateVoucherQR,
  getQRCodeType,
  isQRCodeExpired,
  getQRCodeAge,
  QRCodeData,
} from './qrcode.utils';

describe('QR Code Utils', () => {
  const testSecret = 'test-secret-key-32-chars-long!!!';

  // ============================================================================
  // generateQRData / parseQRData
  // ============================================================================
  describe('generateQRData', () => {
    it('should generate QR data string', () => {
      const data = generateQRData(
        {
          type: 'ticket',
          id: 'ticket-123',
          userId: 'user-456',
          festivalId: 'festival-789',
        },
        testSecret
      );
      expect(data).toBeDefined();
      expect(typeof data).toBe('string');
    });

    it('should generate QR data with two parts separated by dot', () => {
      const data = generateQRData(
        {
          type: 'ticket',
          id: 'ticket-123',
          userId: 'user-456',
          festivalId: 'festival-789',
        },
        testSecret
      );
      const parts = data.split('.');
      expect(parts).toHaveLength(2);
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const data = generateQRData(
        {
          type: 'ticket',
          id: 'ticket-123',
          userId: 'user-456',
          festivalId: 'festival-789',
        },
        testSecret
      );
      const after = Date.now();

      const parsed = parseQRData(data, testSecret);
      expect(parsed.isValid).toBe(true);
      expect(parsed.data?.timestamp).toBeGreaterThanOrEqual(before);
      expect(parsed.data?.timestamp).toBeLessThanOrEqual(after);
    });

    it('should include optional metadata', () => {
      const data = generateQRData(
        {
          type: 'ticket',
          id: 'ticket-123',
          userId: 'user-456',
          festivalId: 'festival-789',
          metadata: { seat: 'A1' },
        },
        testSecret
      );
      const parsed = parseQRData(data, testSecret);
      expect(parsed.data?.metadata?.seat).toBe('A1');
    });

    it('should include expiration when provided', () => {
      const expiresAt = Date.now() + 3600000; // 1 hour
      const data = generateQRData(
        {
          type: 'access',
          id: 'access-123',
          userId: 'user-456',
          festivalId: 'festival-789',
          expiresAt,
        },
        testSecret
      );
      const parsed = parseQRData(data, testSecret);
      expect(parsed.data?.expiresAt).toBe(expiresAt);
    });
  });

  describe('parseQRData', () => {
    it('should parse valid QR data', () => {
      const qr = generateQRData(
        {
          type: 'ticket',
          id: 'ticket-123',
          userId: 'user-456',
          festivalId: 'festival-789',
        },
        testSecret
      );
      const parsed = parseQRData(qr, testSecret);

      expect(parsed.isValid).toBe(true);
      expect(parsed.data?.type).toBe('ticket');
      expect(parsed.data?.id).toBe('ticket-123');
      expect(parsed.data?.userId).toBe('user-456');
      expect(parsed.data?.festivalId).toBe('festival-789');
    });

    it('should reject invalid format (no dot separator)', () => {
      const parsed = parseQRData('invalid-data', testSecret);
      expect(parsed.isValid).toBe(false);
      expect(parsed.error).toBe('Invalid QR code format');
    });

    it('should reject invalid signature', () => {
      const qr = generateQRData(
        {
          type: 'ticket',
          id: 'ticket-123',
          userId: 'user-456',
          festivalId: 'festival-789',
        },
        testSecret
      );
      const [payload] = qr.split('.');
      const tampered = `${payload}.invalidsignature1234567890`;

      const parsed = parseQRData(tampered, testSecret);
      expect(parsed.isValid).toBe(false);
      expect(parsed.error).toBe('Invalid signature');
    });

    it('should reject with wrong secret', () => {
      const qr = generateQRData(
        {
          type: 'ticket',
          id: 'ticket-123',
          userId: 'user-456',
          festivalId: 'festival-789',
        },
        testSecret
      );
      const parsed = parseQRData(qr, 'wrong-secret');
      expect(parsed.isValid).toBe(false);
    });

    it('should reject expired QR code', () => {
      const qr = generateQRData(
        {
          type: 'access',
          id: 'access-123',
          userId: 'user-456',
          festivalId: 'festival-789',
          expiresAt: Date.now() - 1000, // Already expired
        },
        testSecret
      );
      const parsed = parseQRData(qr, testSecret);
      expect(parsed.isValid).toBe(false);
      expect(parsed.error).toBe('QR code has expired');
    });

    it('should accept non-expired QR code', () => {
      const qr = generateQRData(
        {
          type: 'access',
          id: 'access-123',
          userId: 'user-456',
          festivalId: 'festival-789',
          expiresAt: Date.now() + 3600000, // 1 hour from now
        },
        testSecret
      );
      const parsed = parseQRData(qr, testSecret);
      expect(parsed.isValid).toBe(true);
    });

    it('should handle malformed JSON', () => {
      const parsed = parseQRData('notbase64.signature', testSecret);
      expect(parsed.isValid).toBe(false);
    });
  });

  // ============================================================================
  // generateQRSignature / validateSignature
  // ============================================================================
  describe('generateQRSignature', () => {
    it('should generate consistent signature', () => {
      const sig1 = generateQRSignature('test-payload', testSecret);
      const sig2 = generateQRSignature('test-payload', testSecret);
      expect(sig1).toBe(sig2);
    });

    it('should generate 32 character signature', () => {
      const sig = generateQRSignature('test-payload', testSecret);
      expect(sig).toHaveLength(32);
    });

    it('should generate different signatures for different payloads', () => {
      const sig1 = generateQRSignature('payload-1', testSecret);
      const sig2 = generateQRSignature('payload-2', testSecret);
      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const sig1 = generateQRSignature('test-payload', 'secret-1');
      const sig2 = generateQRSignature('test-payload', 'secret-2');
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('validateSignature', () => {
    it('should validate correct signature', () => {
      const payload = 'test-payload';
      const signature = generateQRSignature(payload, testSecret);
      expect(validateSignature(payload, signature, testSecret)).toBe(true);
    });

    it('should reject incorrect signature', () => {
      expect(validateSignature('payload', 'wrong-signature', testSecret)).toBe(false);
    });

    it('should reject signature with different length', () => {
      expect(validateSignature('payload', 'short', testSecret)).toBe(false);
    });
  });

  // ============================================================================
  // Simple Ticket QR (Legacy Format)
  // ============================================================================
  describe('generateSimpleTicketQR', () => {
    it('should generate QR with 4 parts', () => {
      const qr = generateSimpleTicketQR('ticket-123', 'user-456', testSecret);
      const parts = qr.split(':');
      expect(parts).toHaveLength(4);
    });

    it('should include ticket and user ID', () => {
      const qr = generateSimpleTicketQR('ticket-123', 'user-456', testSecret);
      expect(qr).toContain('ticket-123');
      expect(qr).toContain('user-456');
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const qr = generateSimpleTicketQR('ticket-123', 'user-456', testSecret);
      const after = Date.now();

      const parts = qr.split(':');
      const timestamp = parseInt(parts[2], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should include 16 character signature', () => {
      const qr = generateSimpleTicketQR('ticket-123', 'user-456', testSecret);
      const parts = qr.split(':');
      expect(parts[3]).toHaveLength(16);
    });
  });

  describe('verifySimpleTicketQR', () => {
    it('should verify valid QR', () => {
      const qr = generateSimpleTicketQR('ticket-123', 'user-456', testSecret);
      const result = verifySimpleTicketQR(qr, testSecret);

      expect(result.isValid).toBe(true);
      expect(result.ticketId).toBe('ticket-123');
      expect(result.userId).toBe('user-456');
      expect(result.timestamp).toBeDefined();
    });

    it('should reject invalid format', () => {
      const result = verifySimpleTicketQR('invalid', testSecret);
      expect(result.isValid).toBe(false);
    });

    it('should reject tampered QR', () => {
      const qr = generateSimpleTicketQR('ticket-123', 'user-456', testSecret);
      const tampered = qr.replace('ticket-123', 'ticket-999');
      const result = verifySimpleTicketQR(tampered, testSecret);
      expect(result.isValid).toBe(false);
    });

    it('should reject wrong secret', () => {
      const qr = generateSimpleTicketQR('ticket-123', 'user-456', testSecret);
      const result = verifySimpleTicketQR(qr, 'wrong-secret');
      expect(result.isValid).toBe(false);
    });
  });

  // ============================================================================
  // Specialized QR Code Generators
  // ============================================================================
  describe('generateCashlessQR', () => {
    it('should generate cashless QR with type', () => {
      const qr = generateCashlessQR('account-123', 'user-456', 'festival-789', testSecret);
      const parsed = parseQRData(qr, testSecret);

      expect(parsed.isValid).toBe(true);
      expect(parsed.data?.type).toBe('cashless');
      expect(parsed.data?.id).toBe('account-123');
    });
  });

  describe('generateAccessQR', () => {
    it('should generate access QR with expiration', () => {
      const validUntil = new Date(Date.now() + 3600000);
      const qr = generateAccessQR(
        'access-123',
        'user-456',
        'festival-789',
        'zone-vip',
        validUntil,
        testSecret
      );
      const parsed = parseQRData(qr, testSecret);

      expect(parsed.isValid).toBe(true);
      expect(parsed.data?.type).toBe('access');
      expect(parsed.data?.expiresAt).toBe(validUntil.getTime());
      expect(parsed.data?.metadata?.zoneId).toBe('zone-vip');
    });
  });

  describe('generateVoucherQR', () => {
    it('should generate voucher QR with value', () => {
      const qr = generateVoucherQR('voucher-123', 'user-456', 'festival-789', 50, null, testSecret);
      const parsed = parseQRData(qr, testSecret);

      expect(parsed.isValid).toBe(true);
      expect(parsed.data?.type).toBe('voucher');
      expect(parsed.data?.metadata?.value).toBe('50');
    });

    it('should generate voucher QR with expiration', () => {
      const expiresAt = new Date(Date.now() + 86400000);
      const qr = generateVoucherQR(
        'voucher-123',
        'user-456',
        'festival-789',
        50,
        expiresAt,
        testSecret
      );
      const parsed = parseQRData(qr, testSecret);

      expect(parsed.data?.expiresAt).toBe(expiresAt.getTime());
    });

    it('should generate voucher QR without expiration', () => {
      const qr = generateVoucherQR('voucher-123', 'user-456', 'festival-789', 50, null, testSecret);
      const parsed = parseQRData(qr, testSecret);

      expect(parsed.data?.expiresAt).toBeUndefined();
    });
  });

  // ============================================================================
  // QR Code Utilities
  // ============================================================================
  describe('getQRCodeType', () => {
    it('should extract ticket type', () => {
      const qr = generateQRData(
        {
          type: 'ticket',
          id: 'ticket-123',
          userId: 'user-456',
          festivalId: 'festival-789',
        },
        testSecret
      );
      expect(getQRCodeType(qr)).toBe('ticket');
    });

    it('should extract cashless type', () => {
      const qr = generateCashlessQR('account-123', 'user-456', 'festival-789', testSecret);
      expect(getQRCodeType(qr)).toBe('cashless');
    });

    it('should extract access type', () => {
      const qr = generateAccessQR(
        'access-123',
        'user-456',
        'festival-789',
        'zone-1',
        new Date(),
        testSecret
      );
      expect(getQRCodeType(qr)).toBe('access');
    });

    it('should detect legacy ticket format', () => {
      const qr = generateSimpleTicketQR('ticket-123', 'user-456', testSecret);
      expect(getQRCodeType(qr)).toBe('ticket-legacy');
    });

    it('should return null for invalid QR', () => {
      expect(getQRCodeType('invalid')).toBeNull();
    });
  });

  describe('isQRCodeExpired', () => {
    it('should return true for expired QR', () => {
      const qr = generateQRData(
        {
          type: 'access',
          id: 'access-123',
          userId: 'user-456',
          festivalId: 'festival-789',
          expiresAt: Date.now() - 1000,
        },
        testSecret
      );
      expect(isQRCodeExpired(qr)).toBe(true);
    });

    it('should return false for non-expired QR', () => {
      const qr = generateQRData(
        {
          type: 'access',
          id: 'access-123',
          userId: 'user-456',
          festivalId: 'festival-789',
          expiresAt: Date.now() + 3600000,
        },
        testSecret
      );
      expect(isQRCodeExpired(qr)).toBe(false);
    });

    it('should return false for QR without expiration', () => {
      const qr = generateQRData(
        {
          type: 'ticket',
          id: 'ticket-123',
          userId: 'user-456',
          festivalId: 'festival-789',
        },
        testSecret
      );
      expect(isQRCodeExpired(qr)).toBe(false);
    });

    it('should return false for legacy format', () => {
      const qr = generateSimpleTicketQR('ticket-123', 'user-456', testSecret);
      expect(isQRCodeExpired(qr)).toBe(false);
    });

    it('should return false for invalid QR', () => {
      expect(isQRCodeExpired('invalid')).toBe(false);
    });
  });

  describe('getQRCodeAge', () => {
    it('should return age in seconds for modern format', () => {
      const qr = generateQRData(
        {
          type: 'ticket',
          id: 'ticket-123',
          userId: 'user-456',
          festivalId: 'festival-789',
        },
        testSecret
      );
      const age = getQRCodeAge(qr);
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(5); // Should be less than 5 seconds
    });

    it('should return age in seconds for legacy format', () => {
      const qr = generateSimpleTicketQR('ticket-123', 'user-456', testSecret);
      const age = getQRCodeAge(qr);
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(5);
    });

    it('should return null for invalid QR', () => {
      expect(getQRCodeAge('invalid')).toBeNull();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle special characters in IDs', () => {
      const qr = generateQRData(
        {
          type: 'ticket',
          id: 'ticket-\u00E9\u00E8\u00E0',
          userId: 'user-test@example.com',
          festivalId: 'festival/2024',
        },
        testSecret
      );
      const parsed = parseQRData(qr, testSecret);
      expect(parsed.isValid).toBe(true);
      expect(parsed.data?.id).toBe('ticket-\u00E9\u00E8\u00E0');
    });

    it('should handle empty metadata', () => {
      const qr = generateQRData(
        {
          type: 'ticket',
          id: 'ticket-123',
          userId: 'user-456',
          festivalId: 'festival-789',
          metadata: {},
        },
        testSecret
      );
      const parsed = parseQRData(qr, testSecret);
      expect(parsed.isValid).toBe(true);
      expect(parsed.data?.metadata).toEqual({});
    });

    it('should handle very long IDs', () => {
      const longId = 'a'.repeat(1000);
      const qr = generateQRData(
        {
          type: 'ticket',
          id: longId,
          userId: 'user-456',
          festivalId: 'festival-789',
        },
        testSecret
      );
      const parsed = parseQRData(qr, testSecret);
      expect(parsed.isValid).toBe(true);
      expect(parsed.data?.id).toBe(longId);
    });

    it('should handle all QR types', () => {
      const types: QRCodeData['type'][] = ['ticket', 'cashless', 'access', 'voucher'];

      for (const type of types) {
        const qr = generateQRData(
          {
            type,
            id: `${type}-123`,
            userId: 'user-456',
            festivalId: 'festival-789',
          },
          testSecret
        );
        const parsed = parseQRData(qr, testSecret);
        expect(parsed.isValid).toBe(true);
        expect(parsed.data?.type).toBe(type);
      }
    });
  });
});
