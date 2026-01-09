/**
 * API Key Entity
 *
 * Represents an API key for programmatic access to the Festival API.
 * Each API key has a tier that determines rate limits and permissions.
 *
 * @module ApiKeyEntity
 */

import { ClientTier } from '../../common/rate-limit/rate-limit-tiers';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * API Key status enum
 */
export enum ApiKeyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

/**
 * API Key scope for fine-grained permissions
 */
export enum ApiKeyScope {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  ADMIN = 'ADMIN',
}

/**
 * API Key permissions by resource
 */
export interface ApiKeyPermissions {
  festivals?: ApiKeyScope[];
  tickets?: ApiKeyScope[];
  payments?: ApiKeyScope[];
  cashless?: ApiKeyScope[];
  users?: ApiKeyScope[];
  analytics?: ApiKeyScope[];
  vendors?: ApiKeyScope[];
  zones?: ApiKeyScope[];
  program?: ApiKeyScope[];
  notifications?: ApiKeyScope[];
}

/**
 * API Key entity interface
 */
export interface ApiKey {
  /** Unique identifier */
  id: string;
  /** User who owns this API key */
  userId: string;
  /** Friendly name for the API key */
  name: string;
  /** The API key value (hashed in database, only shown once on creation) */
  key: string;
  /** Key prefix for identification (first 8 chars) */
  keyPrefix: string;
  /** Hashed key stored in database */
  keyHash: string;
  /** Rate limit tier */
  tier: ClientTier;
  /** API key status */
  status: ApiKeyStatus;
  /** Scopes/permissions granted */
  scopes: ApiKeyScope[];
  /** Resource-specific permissions */
  permissions: ApiKeyPermissions;
  /** Optional description */
  description?: string;
  /** IP whitelist (empty means all IPs allowed) */
  ipWhitelist: string[];
  /** Last used timestamp */
  lastUsedAt?: Date;
  /** Last used IP address */
  lastUsedIp?: string;
  /** Usage count */
  usageCount: number;
  /** Expiration date (null = never expires) */
  expiresAt?: Date;
  /** Festival ID for scoped keys (null = all festivals) */
  festivalId?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * API Key creation input
 */
export interface CreateApiKeyInput {
  userId: string;
  name: string;
  tier?: ClientTier;
  scopes?: ApiKeyScope[];
  permissions?: ApiKeyPermissions;
  description?: string;
  ipWhitelist?: string[];
  expiresAt?: Date;
  festivalId?: string;
}

/**
 * API Key update input
 */
export interface UpdateApiKeyInput {
  name?: string;
  tier?: ClientTier;
  status?: ApiKeyStatus;
  scopes?: ApiKeyScope[];
  permissions?: ApiKeyPermissions;
  description?: string;
  ipWhitelist?: string[];
  expiresAt?: Date;
}

/**
 * API Key creation result (includes the plaintext key)
 */
export interface CreateApiKeyResult {
  /** The API key entity */
  apiKey: ApiKey;
  /** The plaintext key (only returned once, on creation) */
  plaintextKey: string;
}

/**
 * API Key validation result
 */
export interface ApiKeyValidationResult {
  /** Whether the key is valid */
  valid: boolean;
  /** The API key if valid */
  apiKey?: ApiKey;
  /** Error message if invalid */
  error?: string;
  /** Error code */
  errorCode?: ApiKeyErrorCode;
}

/**
 * API Key error codes
 */
export enum ApiKeyErrorCode {
  INVALID_KEY = 'INVALID_KEY',
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',
  KEY_REVOKED = 'KEY_REVOKED',
  KEY_EXPIRED = 'KEY_EXPIRED',
  KEY_INACTIVE = 'KEY_INACTIVE',
  IP_NOT_ALLOWED = 'IP_NOT_ALLOWED',
  INSUFFICIENT_SCOPE = 'INSUFFICIENT_SCOPE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a secure API key
 */
export function generateApiKey(): { key: string; prefix: string } {
  const crypto = require('crypto');
  const key = `fst_${crypto.randomBytes(32).toString('hex')}`;
  const prefix = key.substring(0, 12);
  return { key, prefix };
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Check if an API key has a specific scope
 */
export function hasScope(apiKey: ApiKey, requiredScope: ApiKeyScope): boolean {
  // Admin scope includes all permissions
  if (apiKey.scopes.includes(ApiKeyScope.ADMIN)) {
    return true;
  }
  return apiKey.scopes.includes(requiredScope);
}

/**
 * Check if an API key has permission for a resource
 */
export function hasPermission(
  apiKey: ApiKey,
  resource: keyof ApiKeyPermissions,
  scope: ApiKeyScope,
): boolean {
  // Admin scope includes all permissions
  if (apiKey.scopes.includes(ApiKeyScope.ADMIN)) {
    return true;
  }

  const resourcePermissions = apiKey.permissions[resource];
  if (!resourcePermissions) {
    // Fall back to general scopes if no specific permission
    return hasScope(apiKey, scope);
  }

  // Admin permission on resource includes all operations
  if (resourcePermissions.includes(ApiKeyScope.ADMIN)) {
    return true;
  }

  return resourcePermissions.includes(scope);
}

/**
 * Check if an API key is currently valid
 */
export function isApiKeyValid(apiKey: ApiKey): { valid: boolean; error?: ApiKeyErrorCode } {
  // Check status
  if (apiKey.status === ApiKeyStatus.REVOKED) {
    return { valid: false, error: ApiKeyErrorCode.KEY_REVOKED };
  }

  if (apiKey.status === ApiKeyStatus.INACTIVE) {
    return { valid: false, error: ApiKeyErrorCode.KEY_INACTIVE };
  }

  if (apiKey.status === ApiKeyStatus.EXPIRED) {
    return { valid: false, error: ApiKeyErrorCode.KEY_EXPIRED };
  }

  // Check expiration
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return { valid: false, error: ApiKeyErrorCode.KEY_EXPIRED };
  }

  return { valid: true };
}

/**
 * Check if IP is allowed for this API key
 */
export function isIpAllowed(apiKey: ApiKey, ip: string): boolean {
  // Empty whitelist means all IPs allowed
  if (!apiKey.ipWhitelist || apiKey.ipWhitelist.length === 0) {
    return true;
  }

  return apiKey.ipWhitelist.includes(ip);
}

/**
 * Mask an API key for display
 */
export function maskApiKey(key: string): string {
  if (key.length <= 12) {
    return key;
  }
  return `${key.substring(0, 12)}${'*'.repeat(key.length - 16)}${key.substring(key.length - 4)}`;
}

/**
 * Default permissions for each tier
 */
export const DEFAULT_TIER_PERMISSIONS: Record<ClientTier, ApiKeyScope[]> = {
  [ClientTier.FREE]: [ApiKeyScope.READ],
  [ClientTier.STARTER]: [ApiKeyScope.READ, ApiKeyScope.WRITE],
  [ClientTier.PRO]: [ApiKeyScope.READ, ApiKeyScope.WRITE, ApiKeyScope.DELETE],
  [ClientTier.ENTERPRISE]: [ApiKeyScope.READ, ApiKeyScope.WRITE, ApiKeyScope.DELETE, ApiKeyScope.ADMIN],
};

/**
 * Get default scopes for a tier
 */
export function getDefaultScopesForTier(tier: ClientTier): ApiKeyScope[] {
  return DEFAULT_TIER_PERMISSIONS[tier] || DEFAULT_TIER_PERMISSIONS[ClientTier.FREE];
}
