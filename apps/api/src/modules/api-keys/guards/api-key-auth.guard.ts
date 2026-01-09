/**
 * API Key Authentication Guard
 *
 * Guard that validates API key from request headers and attaches
 * the API key info to the request for use in controllers and other guards.
 *
 * @module ApiKeyAuthGuard
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiKeysService } from '../api-keys.service';
import { ApiKeyErrorCode } from '../api-key.entity';

// ============================================================================
// Metadata Keys
// ============================================================================

export const ALLOW_API_KEY_AUTH = 'allow_api_key_auth';
export const REQUIRE_API_KEY_AUTH = 'require_api_key_auth';
export const API_KEY_SCOPES = 'api_key_scopes';

// ============================================================================
// Guard
// ============================================================================

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  // Header names to check for API key
  private readonly API_KEY_HEADERS = ['x-api-key', 'api-key', 'authorization'];

  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Check if API key auth is allowed/required for this endpoint
    const isAllowed = this.reflector.getAllAndOverride<boolean>(ALLOW_API_KEY_AUTH, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isRequired = this.reflector.getAllAndOverride<boolean>(REQUIRE_API_KEY_AUTH, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If not allowed and not required, skip
    if (!isAllowed && !isRequired) {
      return true;
    }

    // Extract API key from request
    const apiKey = this.extractApiKey(request);

    // If no API key and not required, allow (other auth methods may be used)
    if (!apiKey && !isRequired) {
      return true;
    }

    // If no API key but required, deny
    if (!apiKey && isRequired) {
      throw new UnauthorizedException({
        message: 'API key is required',
        error: 'Unauthorized',
        errorCode: ApiKeyErrorCode.INVALID_KEY,
      });
    }

    // Validate the API key
    const clientIp = this.getClientIp(request);
    const validationResult = await this.apiKeysService.validate(apiKey!, clientIp);

    if (!validationResult.valid) {
      this.logger.warn(`API key validation failed: ${validationResult.error}`, {
        ip: clientIp,
        errorCode: validationResult.errorCode,
      });

      throw new UnauthorizedException({
        message: validationResult.error,
        error: 'Unauthorized',
        errorCode: validationResult.errorCode,
      });
    }

    // Check required scopes
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(API_KEY_SCOPES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredScopes && requiredScopes.length > 0) {
      const hasAllScopes = requiredScopes.every((scope) =>
        validationResult.apiKey!.scopes.includes(scope as any),
      );

      if (!hasAllScopes) {
        this.logger.warn(`API key missing required scopes`, {
          required: requiredScopes,
          actual: validationResult.apiKey!.scopes,
          keyPrefix: validationResult.apiKey!.keyPrefix,
        });

        throw new UnauthorizedException({
          message: 'Insufficient API key permissions',
          error: 'Unauthorized',
          errorCode: ApiKeyErrorCode.INSUFFICIENT_SCOPE,
          required: requiredScopes,
        });
      }
    }

    // Attach API key info to request
    (request as any).apiKey = validationResult.apiKey;

    // Record usage asynchronously (don't block the request)
    this.apiKeysService.recordUsage(
      validationResult.apiKey!.keyHash,
      clientIp,
    ).catch((err) => {
      this.logger.error('Failed to record API key usage', err);
    });

    return true;
  }

  /**
   * Extract API key from request headers
   */
  private extractApiKey(request: Request): string | null {
    // Check X-API-Key header
    const xApiKey = request.headers['x-api-key'];
    if (xApiKey) {
      return Array.isArray(xApiKey) ? xApiKey[0] : xApiKey;
    }

    // Check API-Key header
    const apiKey = request.headers['api-key'];
    if (apiKey) {
      return Array.isArray(apiKey) ? apiKey[0] : apiKey;
    }

    // Check Authorization header with Bearer scheme
    const auth = request.headers['authorization'];
    if (auth) {
      const authStr = Array.isArray(auth) ? auth[0] : auth;
      if (authStr.startsWith('Bearer fst_')) {
        return authStr.substring(7); // Remove 'Bearer ' prefix
      }
      if (authStr.startsWith('ApiKey ')) {
        return authStr.substring(7); // Remove 'ApiKey ' prefix
      }
    }

    return null;
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
