import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { ApiVersion, API_VERSION_HEADER, DEFAULT_API_VERSION } from './api-version.decorator';

/**
 * API Version response structure
 */
export interface VersionedResponse<T> {
  /** API version used */
  apiVersion: string;
  /** Response data */
  data: T;
  /** Deprecation warning (if applicable) */
  deprecationWarning?: string;
  /** Sunset date for deprecated versions */
  sunsetDate?: string;
}

/**
 * Version deprecation configuration
 */
export interface DeprecationConfig {
  /** Versions that are deprecated */
  deprecatedVersions: ApiVersion[];
  /** Warning message for deprecated versions */
  warningMessage?: string;
  /** Sunset dates for deprecated versions */
  sunsetDates?: Record<ApiVersion, string>;
}

const DEFAULT_DEPRECATION_CONFIG: DeprecationConfig = {
  deprecatedVersions: [],
  warningMessage: 'This API version is deprecated. Please migrate to a newer version.',
  sunsetDates: {},
};

/**
 * API Version Interceptor
 *
 * Adds API version information to all responses and handles deprecation warnings.
 *
 * Features:
 * - Adds X-API-Version header to all responses
 * - Wraps responses with version metadata (optional)
 * - Adds deprecation warnings for old versions
 * - Sets sunset dates for deprecated versions
 *
 * @example
 * // Global registration
 * app.useGlobalInterceptors(new ApiVersionInterceptor());
 *
 * @example
 * // With deprecation config
 * app.useGlobalInterceptors(new ApiVersionInterceptor({
 *   deprecatedVersions: [ApiVersion.V1],
 *   sunsetDates: { [ApiVersion.V1]: '2025-12-31' },
 * }));
 */
@Injectable()
export class ApiVersionInterceptor implements NestInterceptor {
  private readonly config: DeprecationConfig;
  private readonly wrapResponses: boolean;

  constructor(
    config: Partial<DeprecationConfig> = {},
    wrapResponses = false,
  ) {
    this.config = { ...DEFAULT_DEPRECATION_CONFIG, ...config };
    this.wrapResponses = wrapResponses;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request & { apiVersion?: ApiVersion }>();
    const response = ctx.getResponse<Response>();

    const version = request.apiVersion || this.extractVersionFromPath(request.path);

    // Set version header on response
    response.setHeader(API_VERSION_HEADER, `v${version}`);

    // Check if version is deprecated
    const isDeprecated = this.config.deprecatedVersions.includes(version);
    if (isDeprecated) {
      response.setHeader('Deprecation', 'true');
      response.setHeader('X-Deprecation-Warning', this.config.warningMessage || '');

      const sunsetDate = this.config.sunsetDates?.[version];
      if (sunsetDate) {
        response.setHeader('Sunset', sunsetDate);
      }
    }

    return next.handle().pipe(
      map((data) => {
        if (this.wrapResponses) {
          const versionedResponse: VersionedResponse<typeof data> = {
            apiVersion: `v${version}`,
            data,
          };

          if (isDeprecated) {
            versionedResponse.deprecationWarning = this.config.warningMessage;
            const sunsetDate = this.config.sunsetDates?.[version];
            if (sunsetDate) {
              versionedResponse.sunsetDate = sunsetDate;
            }
          }

          return versionedResponse;
        }

        return data;
      }),
    );
  }

  /**
   * Extract version from URL path
   */
  private extractVersionFromPath(path: string): ApiVersion {
    const match = path.match(/\/v(\d+)\//);
    if (match) {
      switch (match[1]) {
        case '1':
          return ApiVersion.V1;
        case '2':
          return ApiVersion.V2;
      }
    }
    return DEFAULT_API_VERSION;
  }
}

/**
 * Lightweight version header interceptor
 *
 * Only adds version header without wrapping responses
 */
@Injectable()
export class ApiVersionHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request & { apiVersion?: ApiVersion }>();
    const response = ctx.getResponse<Response>();

    const version = request.apiVersion || DEFAULT_API_VERSION;
    response.setHeader(API_VERSION_HEADER, `v${version}`);

    return next.handle();
  }
}
