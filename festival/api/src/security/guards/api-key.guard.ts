import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export const API_KEY_AUTH_KEY = 'api_key_auth';

/**
 * Decorator to enable API key authentication for a route
 * Useful for cashless terminals and other machine-to-machine communications
 *
 * @example
 * @UseApiKeyAuth()
 * @Post('terminal/payment')
 * processTerminalPayment() { ... }
 */
export const UseApiKeyAuth = () => Reflect.metadata(API_KEY_AUTH_KEY, true);

interface TerminalApiKey {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  festivalId?: string;
  isActive: boolean;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly apiKeys: Map<string, TerminalApiKey>;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    // Load API keys from config (in production, load from database)
    this.apiKeys = this.loadApiKeys();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if API key auth is required for this route
    const requiresApiKey = this.reflector.get<boolean>(
      API_KEY_AUTH_KEY,
      context.getHandler(),
    );

    if (!requiresApiKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Extract API key from header
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      this.logger.warn(
        `Missing API key for ${request.method} ${request.url}`,
      );
      throw new UnauthorizedException('API key is required');
    }

    // Validate API key
    const keyData = await this.validateApiKey(apiKey);

    if (!keyData) {
      this.logger.warn(
        `Invalid API key attempt for ${request.method} ${request.url}`,
      );
      throw new UnauthorizedException('Invalid API key');
    }

    // Attach terminal info to request for downstream use
    request.terminal = {
      id: keyData.id,
      name: keyData.name,
      permissions: keyData.permissions,
      festivalId: keyData.festivalId,
    };

    return true;
  }

  /**
   * Extracts API key from request headers
   */
  private extractApiKey(request: any): string | null {
    // Check X-API-Key header (preferred)
    const xApiKey = request.headers['x-api-key'];
    if (xApiKey) {
      return xApiKey;
    }

    // Check Authorization header with ApiKey scheme
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('ApiKey ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Validates API key and returns key data if valid
   */
  private async validateApiKey(apiKey: string): Promise<TerminalApiKey | null> {
    // Hash the provided key for comparison
    const hashedKey = this.hashApiKey(apiKey);

    // Look up key in store
    const keyData = this.apiKeys.get(hashedKey);

    if (!keyData) {
      return null;
    }

    if (!keyData.isActive) {
      this.logger.warn(`Inactive API key used: ${keyData.id}`);
      return null;
    }

    return keyData;
  }

  /**
   * Hashes an API key for storage/comparison
   */
  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Loads API keys from configuration
   * In production, this would load from database
   */
  private loadApiKeys(): Map<string, TerminalApiKey> {
    const keys = new Map<string, TerminalApiKey>();

    // Load from environment variable (JSON format)
    const apiKeysConfig = this.configService.get<string>('TERMINAL_API_KEYS');

    if (apiKeysConfig) {
      try {
        const configuredKeys = JSON.parse(apiKeysConfig) as TerminalApiKey[];
        for (const keyConfig of configuredKeys) {
          const hashedKey = this.hashApiKey(keyConfig.key);
          keys.set(hashedKey, {
            ...keyConfig,
            key: hashedKey, // Don't store plain key
          });
        }
      } catch (error) {
        this.logger.error('Failed to parse TERMINAL_API_KEYS config', error);
      }
    }

    // Add default development key if none configured
    if (keys.size === 0 && this.configService.get('NODE_ENV') === 'development') {
      const devKey = 'dev-terminal-api-key-12345';
      const hashedDevKey = this.hashApiKey(devKey);
      keys.set(hashedDevKey, {
        id: 'dev-terminal-1',
        key: hashedDevKey,
        name: 'Development Terminal',
        permissions: ['cashless:read', 'cashless:payment', 'cashless:topup'],
        isActive: true,
      });
      this.logger.warn('Using development API key. Do not use in production!');
    }

    return keys;
  }

  /**
   * Generates a new API key (for admin use)
   */
  static generateApiKey(): string {
    return crypto.randomBytes(32).toString('base64url');
  }
}

/**
 * Decorator to check for specific terminal permissions
 */
export const RequireTerminalPermission = (permission: string) =>
  Reflect.metadata('terminal_permission', permission);
