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

/**
 * Generate HMAC-SHA256 signature
 */
export function generateHMAC(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC-SHA256 signature
 */
export function verifyHMAC(data: string, signature: string, secret: string): boolean {
  const expectedSignature = generateHMAC(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Hash a string using MD5 (not secure, for non-cryptographic purposes only)
 */
export function hashMD5(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

/**
 * Hash a string using SHA512
 */
export function hashSHA512(input: string): string {
  return crypto.createHash('sha512').update(input).digest('hex');
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encryptAES(
  plaintext: string,
  key: string
): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16);
  const keyBuffer = crypto.scryptSync(key, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decryptAES(
  encrypted: string,
  iv: string,
  authTag: string,
  key: string
): string {
  const keyBuffer = crypto.scryptSync(key, 'salt', 32);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    keyBuffer,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a random password
 */
export function generateRandomPassword(
  length: number = 16,
  options: {
    lowercase?: boolean;
    uppercase?: boolean;
    numbers?: boolean;
    symbols?: boolean;
  } = {}
): string {
  const {
    lowercase = true,
    uppercase = true,
    numbers = true,
    symbols = true,
  } = options;

  let chars = '';
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (numbers) chars += '0123456789';
  if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (chars.length === 0) {
    chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  }

  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }

  return password;
}

/**
 * Generate a numeric OTP (One-Time Password)
 */
export function generateOTP(length: number = 6): string {
  const bytes = crypto.randomBytes(length);
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += (bytes[i] % 10).toString();
  }
  return otp;
}

/**
 * Compare two strings in constant time (prevents timing attacks)
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Generate a URL-safe base64 token
 */
export function generateUrlSafeToken(length: number = 32): string {
  return crypto
    .randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Calculate checksum for data integrity
 */
export function calculateChecksum(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 8);
}

/**
 * Derive a key from a password using PBKDF2
 */
export function deriveKey(
  password: string,
  salt: string,
  iterations: number = 100000,
  keyLength: number = 32
): string {
  return crypto
    .pbkdf2Sync(password, salt, iterations, keyLength, 'sha256')
    .toString('hex');
}

/**
 * Generate a random salt
 */
export function generateSalt(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex');
}
