/**
 * NFC Formatter Service
 * Handles encoding, decoding, encryption and signing of NFC data
 * for the Festival cashless system
 */

import CryptoJS from 'crypto-js';

// Encryption key (in production, this should come from secure storage)
const ENCRYPTION_KEY = process.env.NFC_ENCRYPTION_KEY || 'festival-nfc-secure-key-2024';
const SIGNING_KEY = process.env.NFC_SIGNING_KEY || 'festival-nfc-signing-key-2024';

// Data version for backward compatibility
const CURRENT_VERSION = '1.0';

// Tag types
export type NFCTagType = 'cashless' | 'ticket' | 'staff' | 'transfer' | 'unknown';

// Cashless data structure
export interface CashlessData {
  accountId: string;
  balance: number;
  lastTransaction: string | null;
  linkedUserId: string | null;
  status: 'active' | 'suspended' | 'locked';
}

// Transfer data structure
export interface TransferData {
  fromUserId: string;
  toUserId?: string;
  amount: number;
  timestamp: number;
  expiresAt: number;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
}

// Staff data structure
export interface StaffData {
  staffId: string;
  role: string;
  zones: string[];
  validFrom: number;
  validUntil: number;
}

// Ticket data structure
export interface TicketData {
  ticketId: string;
  ticketType: string;
  accessLevel: string;
  validDate: string;
  scanned: boolean;
}

// Main NFC tag data structure
export interface NFCTagData {
  type: NFCTagType;
  version: string;
  festivalId?: string;
  cashless?: CashlessData;
  transfer?: TransferData;
  staff?: StaffData;
  ticket?: TicketData;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// NFC Payload structure (what gets written to tag)
export interface NFCPayload {
  v: string; // version
  t: string; // type
  d: string; // encrypted data
  s: string; // signature
  ts: number; // timestamp
}

export class NFCFormatter {
  private encryptionKey: string;
  private signingKey: string;

  constructor(encryptionKey?: string, signingKey?: string) {
    this.encryptionKey = encryptionKey || ENCRYPTION_KEY;
    this.signingKey = signingKey || SIGNING_KEY;
  }

  /**
   * Encode tag data for writing to NFC tag
   */
  encodeTagData(data: NFCTagData, encrypt: boolean = true): NFCPayload {
    // Prepare data for encoding
    const dataToEncode = {
      ...data,
      timestamp: data.timestamp || Date.now(),
    };

    // Convert to JSON string
    const jsonData = JSON.stringify(dataToEncode);

    // Encrypt if required
    const encodedData = encrypt
      ? this.encrypt(jsonData)
      : this.base64Encode(jsonData);

    // Create payload
    const payload: NFCPayload = {
      v: CURRENT_VERSION,
      t: data.type,
      d: encodedData,
      s: '', // Will be filled by signPayload
      ts: data.timestamp,
    };

    return payload;
  }

  /**
   * Decode tag data from NFC tag
   */
  decodeTagData(payload: NFCPayload, decrypt: boolean = true): NFCTagData {
    try {
      // Decrypt or decode data
      const jsonData = decrypt
        ? this.decrypt(payload.d)
        : this.base64Decode(payload.d);

      if (!jsonData) {
        throw new Error('Failed to decode data');
      }

      // Parse JSON
      const data = JSON.parse(jsonData) as NFCTagData;

      return data;
    } catch (error) {
      console.error('[NFCFormatter] Decode error:', error);
      throw new Error(`Failed to decode tag data: ${error}`);
    }
  }

  /**
   * Format payload as string for NFC writing
   */
  formatPayload(payload: NFCPayload): string {
    return JSON.stringify(payload);
  }

  /**
   * Parse payload string from NFC tag
   */
  parsePayload(payloadString: string): NFCPayload {
    try {
      const payload = JSON.parse(payloadString) as NFCPayload;

      // Validate required fields
      if (!payload.v || !payload.t || !payload.d) {
        throw new Error('Invalid payload format');
      }

      return payload;
    } catch (error) {
      throw new Error(`Failed to parse payload: ${error}`);
    }
  }

  /**
   * Sign payload data
   */
  signPayload(payload: NFCPayload): NFCPayload {
    const dataToSign = `${payload.v}|${payload.t}|${payload.d}|${payload.ts}`;
    payload.s = this.createSignature(dataToSign);
    return payload;
  }

  /**
   * Verify payload signature
   */
  verifySignature(payload: NFCPayload): boolean {
    if (!payload.s) {
      return false;
    }

    const dataToVerify = `${payload.v}|${payload.t}|${payload.d}|${payload.ts}`;
    const expectedSignature = this.createSignature(dataToVerify);

    return payload.s === expectedSignature;
  }

  /**
   * Create HMAC signature
   */
  private createSignature(data: string): string {
    return CryptoJS.HmacSHA256(data, this.signingKey).toString(CryptoJS.enc.Hex);
  }

  /**
   * Encrypt data using AES
   */
  private encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }

  /**
   * Decrypt data using AES
   */
  private decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Base64 encode (for non-encrypted data)
   */
  private base64Encode(data: string): string {
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(data));
  }

  /**
   * Base64 decode
   */
  private base64Decode(encodedData: string): string {
    return CryptoJS.enc.Base64.parse(encodedData).toString(CryptoJS.enc.Utf8);
  }

  /**
   * Create cashless bracelet data
   */
  createCashlessData(
    accountId: string,
    userId: string,
    initialBalance: number = 0
  ): CashlessData {
    return {
      accountId,
      balance: initialBalance,
      lastTransaction: null,
      linkedUserId: userId,
      status: 'active',
    };
  }

  /**
   * Create transfer request data
   */
  createTransferData(
    fromUserId: string,
    amount: number,
    expiryMinutes: number = 5
  ): TransferData {
    const now = Date.now();
    return {
      fromUserId,
      amount,
      timestamp: now,
      expiresAt: now + expiryMinutes * 60 * 1000,
      status: 'pending',
    };
  }

  /**
   * Create staff badge data
   */
  createStaffData(
    staffId: string,
    role: string,
    zones: string[],
    validDays: number = 7
  ): StaffData {
    const now = Date.now();
    return {
      staffId,
      role,
      zones,
      validFrom: now,
      validUntil: now + validDays * 24 * 60 * 60 * 1000,
    };
  }

  /**
   * Create ticket data
   */
  createTicketData(
    ticketId: string,
    ticketType: string,
    accessLevel: string,
    validDate: string
  ): TicketData {
    return {
      ticketId,
      ticketType,
      accessLevel,
      validDate,
      scanned: false,
    };
  }

  /**
   * Validate tag data structure
   */
  validateTagData(data: NFCTagData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.type) {
      errors.push('Missing tag type');
    }

    if (!data.version) {
      errors.push('Missing version');
    }

    if (data.type === 'cashless' && !data.cashless) {
      errors.push('Missing cashless data for cashless tag');
    }

    if (data.type === 'transfer' && !data.transfer) {
      errors.push('Missing transfer data for transfer tag');
    }

    if (data.type === 'staff' && !data.staff) {
      errors.push('Missing staff data for staff tag');
    }

    if (data.type === 'ticket' && !data.ticket) {
      errors.push('Missing ticket data for ticket tag');
    }

    if (data.cashless) {
      if (!data.cashless.accountId) {
        errors.push('Missing account ID in cashless data');
      }
      if (typeof data.cashless.balance !== 'number') {
        errors.push('Invalid balance in cashless data');
      }
    }

    if (data.transfer) {
      if (!data.transfer.fromUserId) {
        errors.push('Missing fromUserId in transfer data');
      }
      if (typeof data.transfer.amount !== 'number' || data.transfer.amount <= 0) {
        errors.push('Invalid amount in transfer data');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if transfer has expired
   */
  isTransferExpired(transfer: TransferData): boolean {
    return Date.now() > transfer.expiresAt;
  }

  /**
   * Check if staff badge is valid
   */
  isStaffBadgeValid(staff: StaffData): boolean {
    const now = Date.now();
    return now >= staff.validFrom && now <= staff.validUntil;
  }

  /**
   * Get tag type from string
   */
  getTagType(typeString: string): NFCTagType {
    const validTypes: NFCTagType[] = ['cashless', 'ticket', 'staff', 'transfer'];
    return validTypes.includes(typeString as NFCTagType)
      ? (typeString as NFCTagType)
      : 'unknown';
  }

  /**
   * Generate unique tag identifier
   */
  generateTagId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `FTV-${timestamp}-${random}`.toUpperCase();
  }
}

export default NFCFormatter;
