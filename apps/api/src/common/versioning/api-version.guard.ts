import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  API_VERSION_KEY,
  API_VERSION_HEADER,
  API_VERSION_PARAM,
  ApiVersion,
  DEFAULT_API_VERSION,
} from './api-version.decorator';

/**
 * API Version Guard
 *
 * Validates that the requested API version is supported by the endpoint.
 * The version can be specified via:
 * 1. X-API-Version header
 * 2. api-version query parameter
 * 3. URL path (/api/v1/... or /api/v2/...)
 *
 * @example
 * // Global registration in main.ts
 * app.useGlobalGuards(new ApiVersionGuard(reflector));
 *
 * @example
 * // Controller-level registration
 * @UseGuards(ApiVersionGuard)
 * @Controller('api')
 * export class ApiController {}
 */
@Injectable()
export class ApiVersionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get allowed versions from metadata
    const allowedVersions = this.reflector.getAllAndOverride<ApiVersion[]>(
      API_VERSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no version metadata, allow all versions
    if (!allowedVersions || allowedVersions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const requestedVersion = this.extractVersion(request);

    // Check if requested version is allowed
    if (!allowedVersions.includes(requestedVersion)) {
      throw new BadRequestException({
        statusCode: 400,
        message: `API version ${requestedVersion} is not supported for this endpoint. Supported versions: ${allowedVersions.map((v) => `v${v}`).join(', ')}`,
        error: 'Unsupported API Version',
        supportedVersions: allowedVersions,
        requestedVersion,
      });
    }

    // Attach version to request for later use
    (request as Request & { apiVersion: ApiVersion }).apiVersion = requestedVersion;

    return true;
  }

  /**
   * Extract API version from request
   * Priority: Header > Query > Path > Default
   */
  private extractVersion(request: Request): ApiVersion {
    // 1. Check header
    const headerVersion = request.headers[API_VERSION_HEADER.toLowerCase()];
    if (headerVersion) {
      return this.parseVersion(headerVersion as string);
    }

    // 2. Check query parameter
    const queryVersion = request.query[API_VERSION_PARAM];
    if (queryVersion) {
      return this.parseVersion(queryVersion as string);
    }

    // 3. Check URL path
    const pathMatch = request.path.match(/\/v(\d+)\//);
    if (pathMatch) {
      return this.parseVersion(pathMatch[1]);
    }

    // 4. Return default version
    return DEFAULT_API_VERSION;
  }

  /**
   * Parse version string to ApiVersion enum
   */
  private parseVersion(versionStr: string): ApiVersion {
    // Remove 'v' prefix if present
    const normalized = versionStr.replace(/^v/i, '');

    switch (normalized) {
      case '1':
        return ApiVersion.V1;
      case '2':
        return ApiVersion.V2;
      default:
        // Unknown version, return default (guard will reject if not allowed)
        return DEFAULT_API_VERSION;
    }
  }
}

/**
 * Get current API version from request
 *
 * @param request - Express request object
 * @returns Current API version
 *
 * @example
 * @Get('info')
 * getInfo(@Req() request: Request) {
 *   const version = getCurrentApiVersion(request);
 *   return { version };
 * }
 */
export function getCurrentApiVersion(request: Request): ApiVersion {
  return (request as Request & { apiVersion?: ApiVersion }).apiVersion || DEFAULT_API_VERSION;
}
