import {
  generateSecureToken,
  generateUUID,
  hashSHA256,
  generateShortId,
  generateTicketQRCode,
  verifyTicketQRCode,
  generateHMAC,
  verifyHMAC,
  hashMD5,
  hashSHA512,
  encryptAES,
  decryptAES,
  generateRandomPassword,
  generateOTP,
  constantTimeCompare,
  generateUrlSafeToken,
  calculateChecksum,
  deriveKey,
  generateSalt,
} from './crypto.utils';

describe('Crypto Utils', () => {
  // ============================================================================
  // generateSecureToken
  // ============================================================================
  describe('generateSecureToken', () => {
    it('should generate token of default length (32 bytes = 64 hex chars)', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64);
    });

    it('should generate token of specified length', () => {
      const token = generateSecureToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should generate hex string', () => {
      const token = generateSecureToken();
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  // ============================================================================
  // generateUUID
  // ============================================================================
  describe('generateUUID', () => {
    it('should generate valid UUID v4 format', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should have version 4 indicator', () => {
      const uuid = generateUUID();
      expect(uuid[14]).toBe('4');
    });
  });

  // ============================================================================
  // hashSHA256
  // ============================================================================
  describe('hashSHA256', () => {
    it('should generate consistent hash', () => {
      const hash1 = hashSHA256('hello');
      const hash2 = hashSHA256('hello');
      expect(hash1).toBe(hash2);
    });

    it('should generate 64 character hex string', () => {
      const hash = hashSHA256('test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate different hash for different input', () => {
      const hash1 = hashSHA256('hello');
      const hash2 = hashSHA256('world');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = hashSHA256('');
      expect(hash).toHaveLength(64);
    });

    it('should match known SHA256 hash', () => {
      const hash = hashSHA256('hello');
      expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });
  });

  // ============================================================================
  // generateShortId
  // ============================================================================
  describe('generateShortId', () => {
    it('should generate ID of default length (8)', () => {
      const id = generateShortId();
      expect(id).toHaveLength(8);
    });

    it('should generate ID of specified length', () => {
      const id = generateShortId(12);
      expect(id).toHaveLength(12);
    });

    it('should contain only alphanumeric characters', () => {
      const id = generateShortId(20);
      expect(id).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateShortId();
      const id2 = generateShortId();
      expect(id1).not.toBe(id2);
    });
  });

  // ============================================================================
  // generateTicketQRCode / verifyTicketQRCode
  // ============================================================================
  describe('generateTicketQRCode', () => {
    const originalEnv = process.env['QR_SECRET'];

    beforeAll(() => {
      process.env['QR_SECRET'] = 'test-secret-key-32-chars-long!!!';
    });

    afterAll(() => {
      if (originalEnv !== undefined) {
        process.env['QR_SECRET'] = originalEnv;
      } else {
        delete process.env['QR_SECRET'];
      }
    });

    it('should generate QR code string', () => {
      const qr = generateTicketQRCode('ticket-123', 'user-456');
      expect(qr).toBeDefined();
      expect(typeof qr).toBe('string');
    });

    it('should include ticket and user ID', () => {
      const qr = generateTicketQRCode('ticket-123', 'user-456');
      expect(qr).toContain('ticket-123');
      expect(qr).toContain('user-456');
    });

    it('should have 4 parts separated by colon', () => {
      const qr = generateTicketQRCode('ticket-123', 'user-456');
      const parts = qr.split(':');
      expect(parts).toHaveLength(4);
    });
  });

  describe('verifyTicketQRCode', () => {
    const originalEnv = process.env['QR_SECRET'];

    beforeAll(() => {
      process.env['QR_SECRET'] = 'test-secret-key-32-chars-long!!!';
    });

    afterAll(() => {
      if (originalEnv !== undefined) {
        process.env['QR_SECRET'] = originalEnv;
      } else {
        delete process.env['QR_SECRET'];
      }
    });

    it('should verify valid QR code', () => {
      const qr = generateTicketQRCode('ticket-123', 'user-456');
      const result = verifyTicketQRCode(qr);
      expect(result.isValid).toBe(true);
      expect(result.ticketId).toBe('ticket-123');
      expect(result.userId).toBe('user-456');
    });

    it('should return timestamp', () => {
      const before = Date.now();
      const qr = generateTicketQRCode('ticket-123', 'user-456');
      const after = Date.now();
      const result = verifyTicketQRCode(qr);
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });

    it('should reject invalid QR code', () => {
      const result = verifyTicketQRCode('invalid-qr-code');
      expect(result.isValid).toBe(false);
    });

    it('should reject tampered QR code', () => {
      const qr = generateTicketQRCode('ticket-123', 'user-456');
      const tampered = qr.replace('ticket-123', 'ticket-999');
      const result = verifyTicketQRCode(tampered);
      expect(result.isValid).toBe(false);
    });

    it('should reject QR with wrong number of parts', () => {
      const result = verifyTicketQRCode('only:two:parts');
      expect(result.isValid).toBe(false);
    });
  });

  // ============================================================================
  // generateHMAC / verifyHMAC
  // ============================================================================
  describe('generateHMAC', () => {
    it('should generate consistent HMAC', () => {
      const hmac1 = generateHMAC('data', 'secret');
      const hmac2 = generateHMAC('data', 'secret');
      expect(hmac1).toBe(hmac2);
    });

    it('should generate 64 character hex string', () => {
      const hmac = generateHMAC('data', 'secret');
      expect(hmac).toHaveLength(64);
      expect(hmac).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate different HMAC for different data', () => {
      const hmac1 = generateHMAC('data1', 'secret');
      const hmac2 = generateHMAC('data2', 'secret');
      expect(hmac1).not.toBe(hmac2);
    });

    it('should generate different HMAC for different secrets', () => {
      const hmac1 = generateHMAC('data', 'secret1');
      const hmac2 = generateHMAC('data', 'secret2');
      expect(hmac1).not.toBe(hmac2);
    });
  });

  describe('verifyHMAC', () => {
    it('should verify valid HMAC', () => {
      const hmac = generateHMAC('data', 'secret');
      expect(verifyHMAC('data', hmac, 'secret')).toBe(true);
    });

    it('should reject invalid HMAC', () => {
      const hmac = generateHMAC('data', 'secret');
      expect(verifyHMAC('different-data', hmac, 'secret')).toBe(false);
    });

    it('should reject HMAC with wrong secret', () => {
      const hmac = generateHMAC('data', 'secret');
      expect(verifyHMAC('data', hmac, 'wrong-secret')).toBe(false);
    });
  });

  // ============================================================================
  // hashMD5
  // ============================================================================
  describe('hashMD5', () => {
    it('should generate 32 character hex string', () => {
      const hash = hashMD5('test');
      expect(hash).toHaveLength(32);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate consistent hash', () => {
      const hash1 = hashMD5('hello');
      const hash2 = hashMD5('hello');
      expect(hash1).toBe(hash2);
    });

    it('should match known MD5 hash', () => {
      const hash = hashMD5('hello');
      expect(hash).toBe('5d41402abc4b2a76b9719d911017c592');
    });
  });

  // ============================================================================
  // hashSHA512
  // ============================================================================
  describe('hashSHA512', () => {
    it('should generate 128 character hex string', () => {
      const hash = hashSHA512('test');
      expect(hash).toHaveLength(128);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate consistent hash', () => {
      const hash1 = hashSHA512('hello');
      const hash2 = hashSHA512('hello');
      expect(hash1).toBe(hash2);
    });
  });

  // ============================================================================
  // encryptAES / decryptAES
  // ============================================================================
  describe('encryptAES and decryptAES', () => {
    const key = 'my-secret-key-for-testing';

    it('should encrypt and decrypt string', () => {
      const plaintext = 'Hello, World!';
      const { encrypted, iv, authTag } = encryptAES(plaintext, key);
      const decrypted = decryptAES(encrypted, iv, authTag, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should generate different ciphertext each time', () => {
      const plaintext = 'Hello';
      const result1 = encryptAES(plaintext, key);
      const result2 = encryptAES(plaintext, key);
      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it('should handle empty string', () => {
      const { encrypted, iv, authTag } = encryptAES('', key);
      const decrypted = decryptAES(encrypted, iv, authTag, key);
      expect(decrypted).toBe('');
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Hello Monde! Special chars: \u00E0\u00E9\u00EF\u00F4\u00FC';
      const { encrypted, iv, authTag } = encryptAES(plaintext, key);
      const decrypted = decryptAES(encrypted, iv, authTag, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should fail with wrong key', () => {
      const { encrypted, iv, authTag } = encryptAES('Hello', key);
      expect(() => decryptAES(encrypted, iv, authTag, 'wrong-key')).toThrow();
    });

    it('should fail with tampered auth tag', () => {
      const { encrypted, iv } = encryptAES('Hello', key);
      expect(() => decryptAES(encrypted, iv, 'tampered', key)).toThrow();
    });
  });

  // ============================================================================
  // generateRandomPassword
  // ============================================================================
  describe('generateRandomPassword', () => {
    it('should generate password of default length (16)', () => {
      const password = generateRandomPassword();
      expect(password).toHaveLength(16);
    });

    it('should generate password of specified length', () => {
      const password = generateRandomPassword(20);
      expect(password).toHaveLength(20);
    });

    it('should include all character types by default', () => {
      // Generate multiple times to ensure all types appear
      let hasLower = false;
      let hasUpper = false;
      let hasNumber = false;
      let hasSymbol = false;

      for (let i = 0; i < 100; i++) {
        const password = generateRandomPassword(50);
        if (/[a-z]/.test(password)) {
          hasLower = true;
        }
        if (/[A-Z]/.test(password)) {
          hasUpper = true;
        }
        if (/[0-9]/.test(password)) {
          hasNumber = true;
        }
        if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
          hasSymbol = true;
        }
      }

      expect(hasLower).toBe(true);
      expect(hasUpper).toBe(true);
      expect(hasNumber).toBe(true);
      expect(hasSymbol).toBe(true);
    });

    it('should generate password with only lowercase', () => {
      const password = generateRandomPassword(20, {
        lowercase: true,
        uppercase: false,
        numbers: false,
        symbols: false,
      });
      expect(password).toMatch(/^[a-z]+$/);
    });

    it('should generate password with only uppercase', () => {
      const password = generateRandomPassword(20, {
        lowercase: false,
        uppercase: true,
        numbers: false,
        symbols: false,
      });
      expect(password).toMatch(/^[A-Z]+$/);
    });

    it('should generate password with only numbers', () => {
      const password = generateRandomPassword(20, {
        lowercase: false,
        uppercase: false,
        numbers: true,
        symbols: false,
      });
      expect(password).toMatch(/^[0-9]+$/);
    });

    it('should use default charset if all options are false', () => {
      const password = generateRandomPassword(20, {
        lowercase: false,
        uppercase: false,
        numbers: false,
        symbols: false,
      });
      expect(password).toMatch(/^[a-zA-Z0-9]+$/);
    });
  });

  // ============================================================================
  // generateOTP
  // ============================================================================
  describe('generateOTP', () => {
    it('should generate OTP of default length (6)', () => {
      const otp = generateOTP();
      expect(otp).toHaveLength(6);
    });

    it('should generate OTP of specified length', () => {
      const otp = generateOTP(4);
      expect(otp).toHaveLength(4);
    });

    it('should contain only digits', () => {
      const otp = generateOTP(10);
      expect(otp).toMatch(/^[0-9]+$/);
    });

    it('should generate unique OTPs', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      // Note: This could theoretically fail, but probability is very low
      expect(otp1).not.toBe(otp2);
    });
  });

  // ============================================================================
  // constantTimeCompare
  // ============================================================================
  describe('constantTimeCompare', () => {
    it('should return true for equal strings', () => {
      expect(constantTimeCompare('hello', 'hello')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(constantTimeCompare('hello', 'world')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(constantTimeCompare('hello', 'hello!')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(constantTimeCompare('', '')).toBe(true);
    });
  });

  // ============================================================================
  // generateUrlSafeToken
  // ============================================================================
  describe('generateUrlSafeToken', () => {
    it('should generate URL-safe token', () => {
      const token = generateUrlSafeToken();
      // URL-safe base64 uses only alphanumeric, - and _
      expect(token).toMatch(/^[a-zA-Z0-9_-]+$/);
    });

    it('should not contain standard base64 characters', () => {
      // Generate multiple tokens to check
      for (let i = 0; i < 10; i++) {
        const token = generateUrlSafeToken();
        expect(token).not.toContain('+');
        expect(token).not.toContain('/');
        expect(token).not.toContain('=');
      }
    });

    it('should generate unique tokens', () => {
      const token1 = generateUrlSafeToken();
      const token2 = generateUrlSafeToken();
      expect(token1).not.toBe(token2);
    });
  });

  // ============================================================================
  // calculateChecksum
  // ============================================================================
  describe('calculateChecksum', () => {
    it('should generate 8 character checksum', () => {
      const checksum = calculateChecksum('test data');
      expect(checksum).toHaveLength(8);
    });

    it('should generate consistent checksum', () => {
      const checksum1 = calculateChecksum('hello');
      const checksum2 = calculateChecksum('hello');
      expect(checksum1).toBe(checksum2);
    });

    it('should generate different checksum for different data', () => {
      const checksum1 = calculateChecksum('hello');
      const checksum2 = calculateChecksum('world');
      expect(checksum1).not.toBe(checksum2);
    });

    it('should be hex string', () => {
      const checksum = calculateChecksum('test');
      expect(checksum).toMatch(/^[a-f0-9]+$/);
    });
  });

  // ============================================================================
  // deriveKey
  // ============================================================================
  describe('deriveKey', () => {
    it('should derive key from password and salt', () => {
      const key = deriveKey('password', 'salt');
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });

    it('should generate consistent key for same inputs', () => {
      const key1 = deriveKey('password', 'salt', 1000, 32);
      const key2 = deriveKey('password', 'salt', 1000, 32);
      expect(key1).toBe(key2);
    });

    it('should generate different key for different password', () => {
      const key1 = deriveKey('password1', 'salt', 1000, 32);
      const key2 = deriveKey('password2', 'salt', 1000, 32);
      expect(key1).not.toBe(key2);
    });

    it('should generate different key for different salt', () => {
      const key1 = deriveKey('password', 'salt1', 1000, 32);
      const key2 = deriveKey('password', 'salt2', 1000, 32);
      expect(key1).not.toBe(key2);
    });

    it('should generate key of specified length', () => {
      const key16 = deriveKey('password', 'salt', 1000, 16);
      const key32 = deriveKey('password', 'salt', 1000, 32);
      expect(key16).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(key32).toHaveLength(64); // 32 bytes = 64 hex chars
    });
  });

  // ============================================================================
  // generateSalt
  // ============================================================================
  describe('generateSalt', () => {
    it('should generate salt of default length', () => {
      const salt = generateSalt();
      expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should generate salt of specified length', () => {
      const salt = generateSalt(8);
      expect(salt).toHaveLength(16); // 8 bytes = 16 hex chars
    });

    it('should generate hex string', () => {
      const salt = generateSalt();
      expect(salt).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique salts', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toBe(salt2);
    });
  });
});
