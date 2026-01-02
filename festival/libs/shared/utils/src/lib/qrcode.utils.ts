// QR Code utility functions
import * as crypto from 'crypto';

/**
 * QR Code data structure for tickets
 */
export interface QRCodeData {
  type: 'ticket' | 'cashless' | 'access' | 'voucher';
  id: string;
  userId: string;
  festivalId: string;
  timestamp: number;
  expiresAt?: number;
  metadata?: Record<string, string>;
}

/**
 * Parsed QR code result
 */
export interface ParsedQRCode {
  isValid: boolean;
  data?: QRCodeData;
  error?: string;
}

/**
 * Generate QR code data for a ticket
 */
export function generateQRData(
  data: Omit<QRCodeData, 'timestamp'>,
  secret: string
): string {
  const timestamp = Date.now();
  const payload: QRCodeData = {
    ...data,
    timestamp,
  };

  const payloadString = JSON.stringify(payload);
  const signature = generateQRSignature(payloadString, secret);

  // Encode as base64url for compact representation
  const encoded = Buffer.from(payloadString).toString('base64url');
  return `${encoded}.${signature}`;
}

/**
 * Parse QR code data
 */
export function parseQRData(qrString: string, secret: string): ParsedQRCode {
  try {
    const parts = qrString.split('.');
    if (parts.length !== 2) {
      return { isValid: false, error: 'Invalid QR code format' };
    }

    const [encoded, signature] = parts;

    // Decode the payload
    const payloadString = Buffer.from(encoded, 'base64url').toString('utf-8');

    // Verify signature
    if (!validateSignature(payloadString, signature, secret)) {
      return { isValid: false, error: 'Invalid signature' };
    }

    const data: QRCodeData = JSON.parse(payloadString);

    // Check expiration if set
    if (data.expiresAt && data.expiresAt < Date.now()) {
      return { isValid: false, error: 'QR code has expired' };
    }

    return { isValid: true, data };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to parse QR code',
    };
  }
}

/**
 * Generate HMAC signature for QR code
 */
export function generateQRSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')
    .slice(0, 32); // Truncate for smaller QR code
}

/**
 * Validate QR code signature
 */
export function validateSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateQRSignature(payload, secret);

  // Use timing-safe comparison
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Generate a simple ticket QR code (legacy format)
 */
export function generateSimpleTicketQR(
  ticketId: string,
  userId: string,
  secret: string
): string {
  const timestamp = Date.now();
  const payload = `${ticketId}:${userId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .slice(0, 16);

  return `${payload}:${signature}`;
}

/**
 * Verify a simple ticket QR code (legacy format)
 */
export function verifySimpleTicketQR(
  qrCode: string,
  secret: string
): {
  isValid: boolean;
  ticketId?: string;
  userId?: string;
  timestamp?: number;
} {
  const parts = qrCode.split(':');
  if (parts.length !== 4) {
    return { isValid: false };
  }

  const [ticketId, userId, timestampStr, signature] = parts;
  const payload = `${ticketId}:${userId}:${timestampStr}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .slice(0, 16);

  if (signature !== expectedSignature) {
    return { isValid: false };
  }

  return {
    isValid: true,
    ticketId,
    userId,
    timestamp: parseInt(timestampStr, 10),
  };
}

/**
 * Generate cashless QR code
 */
export function generateCashlessQR(
  accountId: string,
  userId: string,
  festivalId: string,
  secret: string
): string {
  return generateQRData(
    {
      type: 'cashless',
      id: accountId,
      userId,
      festivalId,
    },
    secret
  );
}

/**
 * Generate access control QR code
 */
export function generateAccessQR(
  accessId: string,
  userId: string,
  festivalId: string,
  zoneId: string,
  validUntil: Date,
  secret: string
): string {
  return generateQRData(
    {
      type: 'access',
      id: accessId,
      userId,
      festivalId,
      expiresAt: validUntil.getTime(),
      metadata: { zoneId },
    },
    secret
  );
}

/**
 * Generate voucher QR code
 */
export function generateVoucherQR(
  voucherId: string,
  userId: string,
  festivalId: string,
  value: number,
  expiresAt: Date | null,
  secret: string
): string {
  return generateQRData(
    {
      type: 'voucher',
      id: voucherId,
      userId,
      festivalId,
      expiresAt: expiresAt ? expiresAt.getTime() : undefined,
      metadata: { value: value.toString() },
    },
    secret
  );
}

/**
 * Extract QR code type without full validation
 */
export function getQRCodeType(qrString: string): string | null {
  try {
    const parts = qrString.split('.');
    if (parts.length !== 2) {
      // Check legacy format
      if (qrString.split(':').length === 4) {
        return 'ticket-legacy';
      }
      return null;
    }

    const [encoded] = parts;
    const payloadString = Buffer.from(encoded, 'base64url').toString('utf-8');
    const data = JSON.parse(payloadString);

    return data.type || null;
  } catch {
    return null;
  }
}

/**
 * Check if QR code is expired (without signature verification)
 */
export function isQRCodeExpired(qrString: string): boolean {
  try {
    const parts = qrString.split('.');
    if (parts.length !== 2) {
      return false; // Legacy format doesn't expire
    }

    const [encoded] = parts;
    const payloadString = Buffer.from(encoded, 'base64url').toString('utf-8');
    const data: QRCodeData = JSON.parse(payloadString);

    if (!data.expiresAt) {
      return false;
    }

    return data.expiresAt < Date.now();
  } catch {
    return false;
  }
}

/**
 * Calculate QR code age in seconds
 */
export function getQRCodeAge(qrString: string): number | null {
  try {
    const parts = qrString.split('.');
    if (parts.length !== 2) {
      // Legacy format
      const legacyParts = qrString.split(':');
      if (legacyParts.length === 4) {
        const timestamp = parseInt(legacyParts[2], 10);
        return Math.floor((Date.now() - timestamp) / 1000);
      }
      return null;
    }

    const [encoded] = parts;
    const payloadString = Buffer.from(encoded, 'base64url').toString('utf-8');
    const data: QRCodeData = JSON.parse(payloadString);

    return Math.floor((Date.now() - data.timestamp) / 1000);
  } catch {
    return null;
  }
}
