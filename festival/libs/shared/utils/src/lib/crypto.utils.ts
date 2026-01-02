// Crypto utility functions
// Note: For production, use proper crypto libraries like bcrypt for passwords

import * as crypto from 'crypto';

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Hash a string using SHA256
 */
export function hashSHA256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a short unique ID (for URLs, etc.)
 */
export function generateShortId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Generate a QR code token for tickets
 */
export function generateTicketQRCode(ticketId: string, userId: string): string {
  const payload = `${ticketId}:${userId}:${Date.now()}`;
  const signature = crypto
    .createHmac('sha256', process.env['QR_SECRET'] || 'default-secret')
    .update(payload)
    .digest('hex')
    .slice(0, 16);
  return `${payload}:${signature}`;
}

/**
 * Verify a QR code token
 */
export function verifyTicketQRCode(qrCode: string): {
  isValid: boolean;
  ticketId?: string;
  userId?: string;
  timestamp?: number;
} {
  const parts = qrCode.split(':');
  if (parts.length !== 4) {
    return { isValid: false };
  }

  const [ticketId, userId, timestamp, signature] = parts;
  const payload = `${ticketId}:${userId}:${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env['QR_SECRET'] || 'default-secret')
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
    timestamp: parseInt(timestamp, 10),
  };
}
