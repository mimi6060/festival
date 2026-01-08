/**
 * @deprecated This compression interceptor is deprecated. Use the Express compression()
 * middleware in main.ts instead. The middleware approach is more efficient for production
 * as it properly handles streaming, chunked encoding, and integrates better with Express.
 *
 * The Express compression middleware is already configured in main.ts:
 * ```
 * import compression from 'compression';
 * app.use(compression({ threshold: 1024, level: 6 }));
 * ```
 *
 * This file is kept for backward compatibility but should not be used for new code.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Response, Request } from 'express';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const deflate = promisify(zlib.deflate);
const brotliCompress = promisify(zlib.brotliCompress);

/**
 * Compression types supported
 */
export enum CompressionType {
  GZIP = 'gzip',
  DEFLATE = 'deflate',
  BROTLI = 'br',
  NONE = 'identity',
}

/**
 * Compression options configuration
 */
export interface CompressionOptions {
  /** Minimum response size in bytes to apply compression (default: 1024) */
  threshold?: number;
  /** Compression level (1-9 for gzip/deflate, 0-11 for brotli) */
  level?: number;
  /** Content types to compress (default: json, text, xml) */
  mimeTypes?: string[];
  /** Whether to compress responses by default */
  enabled?: boolean;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  threshold: 1024, // 1KB minimum
  level: 6, // Balanced compression
  mimeTypes: [
    'application/json',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/xml',
    'text/xml',
  ],
  enabled: true,
};

/**
 * Compression Interceptor
 *
 * Automatically compresses HTTP responses using gzip, deflate, or brotli
 * based on the client's Accept-Encoding header.
 *
 * Features:
 * - Automatic encoding detection from Accept-Encoding header
 * - Configurable compression threshold
 * - Support for gzip, deflate, and brotli compression
 * - MIME type filtering
 * - Streaming support for large responses
 *
 * @example
 * // Global registration in main.ts
 * app.useGlobalInterceptors(new CompressionInterceptor({ threshold: 1024 }));
 *
 * @example
 * // Controller-level registration
 * @UseInterceptors(new CompressionInterceptor({ level: 9 }))
 * @Controller('api')
 * export class ApiController {}
 *
 * @deprecated Use Express compression() middleware in main.ts instead.
 */
@Injectable()
export class CompressionInterceptor implements NestInterceptor {
  private readonly options: CompressionOptions;

  constructor(options: CompressionOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    if (!this.options.enabled) {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Get preferred encoding from Accept-Encoding header
    const acceptEncoding = request.headers['accept-encoding'] || '';
    const encoding = this.getPreferredEncoding(acceptEncoding);

    // If no compression supported, skip
    if (encoding === CompressionType.NONE) {
      return next.handle();
    }

    return next.handle().pipe(
      map(async (data) => {
        // Skip if no data
        if (data === null || data === undefined) {
          return data;
        }

        // Convert to string/buffer for compression
        const content = typeof data === 'string' ? data : JSON.stringify(data);
        const buffer = Buffer.from(content, 'utf-8');

        // Skip compression for small responses
        if (buffer.length < (this.options.threshold || 1024)) {
          return data;
        }

        // Check content type
        const contentType = response.getHeader('content-type') as string || 'application/json';
        if (!this.shouldCompress(contentType)) {
          return data;
        }

        try {
          // Compress the content
          const compressed = await this.compress(buffer, encoding);

          // Set response headers
          response.setHeader('Content-Encoding', encoding);
          response.setHeader('Content-Length', compressed.length);
          response.setHeader('Vary', 'Accept-Encoding');

          // Remove Content-Type if it was set, we'll send raw buffer
          response.removeHeader('Content-Type');
          response.setHeader('Content-Type', contentType);

          // Send compressed buffer directly
          response.send(compressed);
          return undefined; // Signal that response is already sent
        } catch {
          // On compression error, return original data
          return data;
        }
      }),
    );
  }

  /**
   * Determine the preferred compression encoding based on Accept-Encoding header
   */
  private getPreferredEncoding(acceptEncoding: string): CompressionType {
    const encodings = acceptEncoding.toLowerCase();

    // Prefer brotli for best compression (if supported)
    if (encodings.includes('br')) {
      return CompressionType.BROTLI;
    }

    // Then gzip as most widely supported
    if (encodings.includes('gzip')) {
      return CompressionType.GZIP;
    }

    // Then deflate
    if (encodings.includes('deflate')) {
      return CompressionType.DEFLATE;
    }

    return CompressionType.NONE;
  }

  /**
   * Check if the content type should be compressed
   */
  private shouldCompress(contentType: string): boolean {
    const mimeTypes = this.options.mimeTypes || DEFAULT_OPTIONS.mimeTypes!;
    return mimeTypes.some((mime) => contentType.includes(mime));
  }

  /**
   * Compress content using the specified encoding
   */
  private async compress(
    buffer: Buffer,
    encoding: CompressionType,
  ): Promise<Buffer> {
    const level = this.options.level || 6;

    switch (encoding) {
      case CompressionType.GZIP:
        return gzip(buffer, { level }) as Promise<Buffer>;

      case CompressionType.DEFLATE:
        return deflate(buffer, { level }) as Promise<Buffer>;

      case CompressionType.BROTLI:
        return brotliCompress(buffer, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: Math.min(level, 11),
          },
        }) as Promise<Buffer>;

      default:
        return buffer;
    }
  }
}

/**
 * Decorator to skip compression for specific endpoints
 *
 * @example
 * @SkipCompression()
 * @Get('download')
 * downloadFile() { ... }
 */
import { SetMetadata } from '@nestjs/common';

export const SKIP_COMPRESSION_KEY = 'skipCompression';
export const SkipCompression = () => SetMetadata(SKIP_COMPRESSION_KEY, true);

/**
 * Enhanced Compression Interceptor with metadata support
 *
 * This version checks for @SkipCompression() decorator
 *
 * @deprecated Use Express compression() middleware in main.ts instead.
 */
@Injectable()
export class EnhancedCompressionInterceptor extends CompressionInterceptor {
  constructor(options: CompressionOptions = {}) {
    super(options);
  }

  override async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    // Check for skip metadata
    const handler = context.getHandler();
    const skipCompression = Reflect.getMetadata(SKIP_COMPRESSION_KEY, handler);

    if (skipCompression) {
      return next.handle();
    }

    return super.intercept(context, next);
  }
}
