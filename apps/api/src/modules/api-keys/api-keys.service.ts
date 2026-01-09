/**
 * API Keys Service
 *
 * Manages API key lifecycle including creation, validation, and revocation.
 * Provides secure key generation, hashing, and tier-based access control.
 *
 * @module ApiKeysService
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientTier, DEFAULT_TIER } from '../../common/rate-limit/rate-limit-tiers';
import {
  ApiKey,
  ApiKeyStatus,
  ApiKeyScope,
  ApiKeyPermissions,
  CreateApiKeyInput,
  UpdateApiKeyInput,
  CreateApiKeyResult,
  ApiKeyValidationResult,
  ApiKeyErrorCode,
  getDefaultScopesForTier,
  isApiKeyValid,
  isIpAllowed,
  maskApiKey,
} from './api-key.entity';

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  // API key prefix for Festival API
  private readonly KEY_PREFIX = 'fst';

  // Cache for validated keys (to reduce database lookups)
  private keyCache: Map<string, { apiKey: ApiKey; cachedAt: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * Create a new API key
   */
  async create(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
    const { userId, name, tier = DEFAULT_TIER, scopes, permissions, description, ipWhitelist, expiresAt, festivalId } = input;

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for duplicate name for this user
    const existing = await this.prisma.apiKey.findFirst({
      where: {
        userId,
        name,
        status: { not: 'REVOKED' },
      },
    });

    if (existing) {
      throw new ConflictException('An API key with this name already exists');
    }

    // Generate the API key
    const plaintextKey = this.generateKey();
    const keyPrefix = plaintextKey.substring(0, 12);
    const keyHash = this.hashKey(plaintextKey);

    // Determine scopes
    const finalScopes = scopes || getDefaultScopesForTier(tier);

    // Create in database
    const apiKeyRecord = await this.prisma.apiKey.create({
      data: {
        userId,
        name,
        keyPrefix,
        keyHash,
        tier,
        status: ApiKeyStatus.ACTIVE,
        scopes: finalScopes,
        permissions: permissions || {},
        description,
        ipWhitelist: ipWhitelist || [],
        expiresAt,
        festivalId,
        usageCount: 0,
      },
    });

    this.logger.log(`Created API key ${keyPrefix}... for user ${userId}`);

    const apiKey = this.toApiKeyEntity(apiKeyRecord, plaintextKey);

    return {
      apiKey,
      plaintextKey,
    };
  }

  /**
   * Get API key by ID
   */
  async findById(id: string, userId?: string): Promise<ApiKey> {
    const where: any = { id };

    if (userId) {
      where.userId = userId;
    }

    const apiKeyRecord = await this.prisma.apiKey.findFirst({
      where,
    });

    if (!apiKeyRecord) {
      throw new NotFoundException('API key not found');
    }

    return this.toApiKeyEntity(apiKeyRecord);
  }

  /**
   * Get all API keys for a user
   */
  async findByUserId(userId: string): Promise<ApiKey[]> {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        userId,
        status: { not: ApiKeyStatus.REVOKED },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map((key) => this.toApiKeyEntity(key));
  }

  /**
   * Update an API key
   */
  async update(id: string, userId: string, input: UpdateApiKeyInput): Promise<ApiKey> {
    // Verify ownership
    const existing = await this.findById(id, userId);

    if (existing.status === ApiKeyStatus.REVOKED) {
      throw new BadRequestException('Cannot update a revoked API key');
    }

    // Update in database
    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });

    // Clear cache
    this.clearCacheForKey(existing.keyHash);

    this.logger.log(`Updated API key ${id}`);

    return this.toApiKeyEntity(updated);
  }

  /**
   * Revoke an API key
   */
  async revoke(id: string, userId: string): Promise<void> {
    const existing = await this.findById(id, userId);

    await this.prisma.apiKey.update({
      where: { id },
      data: {
        status: ApiKeyStatus.REVOKED,
        updatedAt: new Date(),
      },
    });

    // Clear cache
    this.clearCacheForKey(existing.keyHash);

    this.logger.log(`Revoked API key ${id}`);
  }

  /**
   * Delete an API key permanently
   */
  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.findById(id, userId);

    await this.prisma.apiKey.delete({
      where: { id },
    });

    // Clear cache
    this.clearCacheForKey(existing.keyHash);

    this.logger.log(`Deleted API key ${id}`);
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate an API key and return the key entity if valid
   */
  async validate(plaintextKey: string, ip?: string): Promise<ApiKeyValidationResult> {
    // Basic format validation
    if (!this.isValidKeyFormat(plaintextKey)) {
      return {
        valid: false,
        error: 'Invalid API key format',
        errorCode: ApiKeyErrorCode.INVALID_KEY,
      };
    }

    const keyHash = this.hashKey(plaintextKey);

    // Check cache first
    const cached = this.getCachedKey(keyHash);
    if (cached) {
      return this.performValidation(cached, ip);
    }

    // Look up in database
    const apiKeyRecord = await this.prisma.apiKey.findFirst({
      where: { keyHash },
    });

    if (!apiKeyRecord) {
      return {
        valid: false,
        error: 'API key not found',
        errorCode: ApiKeyErrorCode.KEY_NOT_FOUND,
      };
    }

    const apiKey = this.toApiKeyEntity(apiKeyRecord);

    // Cache the key
    this.cacheKey(keyHash, apiKey);

    return this.performValidation(apiKey, ip);
  }

  /**
   * Record API key usage
   */
  async recordUsage(keyHash: string, ip: string): Promise<void> {
    await this.prisma.apiKey.updateMany({
      where: { keyHash },
      data: {
        lastUsedAt: new Date(),
        lastUsedIp: ip,
        usageCount: { increment: 1 },
      },
    });

    // Update cache
    const cached = this.getCachedKey(keyHash);
    if (cached) {
      cached.lastUsedAt = new Date();
      cached.lastUsedIp = ip;
      cached.usageCount++;
      this.cacheKey(keyHash, cached);
    }
  }

  /**
   * Get API key statistics
   */
  async getStats(userId: string): Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
    tierBreakdown: Record<ClientTier, number>;
  }> {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { userId },
      select: { status: true, tier: true, expiresAt: true },
    });

    const now = new Date();
    const tierBreakdown: Record<string, number> = {};

    let active = 0;
    let expired = 0;
    let revoked = 0;

    for (const key of apiKeys) {
      // Count by status
      if (key.status === ApiKeyStatus.REVOKED) {
        revoked++;
      } else if (key.expiresAt && new Date(key.expiresAt) < now) {
        expired++;
      } else if (key.status === ApiKeyStatus.ACTIVE) {
        active++;
      }

      // Count by tier
      tierBreakdown[key.tier] = (tierBreakdown[key.tier] || 0) + 1;
    }

    return {
      total: apiKeys.length,
      active,
      expired,
      revoked,
      tierBreakdown: tierBreakdown as Record<ClientTier, number>,
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Generate a secure API key
   */
  private generateKey(): string {
    const randomPart = crypto.randomBytes(32).toString('hex');
    return `${this.KEY_PREFIX}_${randomPart}`;
  }

  /**
   * Hash an API key for storage
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Validate API key format
   */
  private isValidKeyFormat(key: string): boolean {
    // Key format: fst_<64 hex chars>
    const regex = new RegExp(`^${this.KEY_PREFIX}_[a-f0-9]{64}$`);
    return regex.test(key);
  }

  /**
   * Perform validation checks on an API key
   */
  private performValidation(apiKey: ApiKey, ip?: string): ApiKeyValidationResult {
    // Check if key is valid (status and expiration)
    const validityCheck = isApiKeyValid(apiKey);
    if (!validityCheck.valid) {
      return {
        valid: false,
        error: `API key is ${validityCheck.error?.toLowerCase().replace('_', ' ')}`,
        errorCode: validityCheck.error,
      };
    }

    // Check IP whitelist
    if (ip && !isIpAllowed(apiKey, ip)) {
      return {
        valid: false,
        error: 'IP address not allowed for this API key',
        errorCode: ApiKeyErrorCode.IP_NOT_ALLOWED,
      };
    }

    return {
      valid: true,
      apiKey,
    };
  }

  /**
   * Convert database record to API key entity
   */
  private toApiKeyEntity(record: any, plaintextKey?: string): ApiKey {
    return {
      id: record.id,
      userId: record.userId,
      name: record.name,
      key: plaintextKey ? maskApiKey(plaintextKey) : `${record.keyPrefix}${'*'.repeat(52)}`,
      keyPrefix: record.keyPrefix,
      keyHash: record.keyHash,
      tier: record.tier as ClientTier,
      status: record.status as ApiKeyStatus,
      scopes: record.scopes as ApiKeyScope[],
      permissions: (record.permissions || {}) as ApiKeyPermissions,
      description: record.description,
      ipWhitelist: record.ipWhitelist || [],
      lastUsedAt: record.lastUsedAt,
      lastUsedIp: record.lastUsedIp,
      usageCount: record.usageCount || 0,
      expiresAt: record.expiresAt,
      festivalId: record.festivalId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Get a key from cache
   */
  private getCachedKey(keyHash: string): ApiKey | null {
    const cached = this.keyCache.get(keyHash);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.cachedAt > this.CACHE_TTL) {
      this.keyCache.delete(keyHash);
      return null;
    }

    return cached.apiKey;
  }

  /**
   * Cache an API key
   */
  private cacheKey(keyHash: string, apiKey: ApiKey): void {
    this.keyCache.set(keyHash, {
      apiKey,
      cachedAt: Date.now(),
    });
  }

  /**
   * Clear cache for a specific key
   */
  private clearCacheForKey(keyHash: string): void {
    this.keyCache.delete(keyHash);
  }
}
