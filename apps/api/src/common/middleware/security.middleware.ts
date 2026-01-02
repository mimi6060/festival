/**
 * Security Middleware for Festival Platform API
 *
 * Provides comprehensive security measures including:
 * - Enhanced HTTP security headers (beyond Helmet defaults)
 * - CSRF protection
 * - Request sanitization
 * - XSS prevention
 * - Content Security Policy
 * - Rate limiting headers
 * - Request ID tracking
 *
 * @module SecurityMiddleware
 * @security Critical - All requests pass through this middleware
 */

import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * Configuration for security middleware
 */
export interface SecurityMiddlewareConfig {
  /** Enable CSRF protection */
  csrfEnabled: boolean;
  /** CSRF cookie name */
  csrfCookieName: string;
  /** CSRF header name */
  csrfHeaderName: string;
  /** List of paths exempt from CSRF checks */
  csrfExemptPaths: string[];
  /** Enable request sanitization */
  sanitizeEnabled: boolean;
  /** Maximum request body size in bytes */
  maxBodySize: number;
  /** Enable request ID tracking */
  requestIdEnabled: boolean;
  /** Content Security Policy directives */
  cspDirectives: Record<string, string[]>;
  /** Allowed HTTP methods */
  allowedMethods: string[];
  /** Enable XSS filter */
  xssFilterEnabled: boolean;
  /** Enable clickjacking protection */
  clickjackingProtection: boolean;
  /** Enable HSTS */
  hstsEnabled: boolean;
  /** HSTS max age in seconds */
  hstsMaxAge: number;
}

/**
 * Default security configuration
 */
const defaultConfig: SecurityMiddlewareConfig = {
  csrfEnabled: process.env.CSRF_ENABLED !== 'false',
  csrfCookieName: 'XSRF-TOKEN',
  csrfHeaderName: 'X-XSRF-TOKEN',
  csrfExemptPaths: [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/webhooks/',
    '/api/health',
    '/api/docs',
  ],
  sanitizeEnabled: true,
  maxBodySize: 10 * 1024 * 1024, // 10MB
  requestIdEnabled: true,
  cspDirectives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", 'https://api.stripe.com'],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
  },
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  xssFilterEnabled: true,
  clickjackingProtection: true,
  hstsEnabled: process.env.NODE_ENV === 'production',
  hstsMaxAge: 31536000, // 1 year
};

/**
 * Security Middleware
 *
 * Implements comprehensive security measures for all HTTP requests.
 * This middleware should be applied globally before all route handlers.
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  private readonly config: SecurityMiddlewareConfig;

  constructor(config?: Partial<SecurityMiddlewareConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Main middleware handler
   */
  use(req: Request, res: Response, next: NextFunction): void {
    try {
      // Generate and attach request ID for tracing
      if (this.config.requestIdEnabled) {
        this.attachRequestId(req, res);
      }

      // Set comprehensive security headers
      this.setSecurityHeaders(res);

      // Validate HTTP method
      this.validateHttpMethod(req);

      // CSRF protection for state-changing requests
      if (this.config.csrfEnabled) {
        this.handleCsrf(req, res);
      }

      // Sanitize request data
      if (this.config.sanitizeEnabled) {
        this.sanitizeRequest(req);
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Attach unique request ID for tracing
   */
  private attachRequestId(req: Request, res: Response): void {
    const requestId =
      (req.headers['x-request-id'] as string) ||
      crypto.randomBytes(16).toString('hex');

    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
  }

  /**
   * Set comprehensive security headers
   */
  private setSecurityHeaders(res: Response): void {
    // Content Security Policy
    const csp = Object.entries(this.config.cspDirectives)
      .map(([key, values]) => `${key} ${values.join(' ')}`)
      .join('; ');
    res.setHeader('Content-Security-Policy', csp);

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS protection (legacy browsers)
    if (this.config.xssFilterEnabled) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Clickjacking protection
    if (this.config.clickjackingProtection) {
      res.setHeader('X-Frame-Options', 'DENY');
    }

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Feature Policy / Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(self)',
    );

    // HTTP Strict Transport Security
    if (this.config.hstsEnabled) {
      res.setHeader(
        'Strict-Transport-Security',
        `max-age=${this.config.hstsMaxAge}; includeSubDomains; preload`,
      );
    }

    // Prevent caching of sensitive data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Remove server header
    res.removeHeader('X-Powered-By');

    // Cross-Origin policies
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  }

  /**
   * Validate HTTP method is allowed
   */
  private validateHttpMethod(req: Request): void {
    if (!this.config.allowedMethods.includes(req.method)) {
      throw new BadRequestException(
        `HTTP method ${req.method} is not allowed`,
      );
    }
  }

  /**
   * Handle CSRF protection
   *
   * Implements Double Submit Cookie pattern:
   * 1. Server sets a random token in a cookie
   * 2. Client must send the same token in a header
   * 3. Server validates that both match
   */
  private handleCsrf(req: Request, res: Response): void {
    const isExempt = this.config.csrfExemptPaths.some(
      (path) =>
        req.path === path ||
        req.path.startsWith(path) ||
        (path.endsWith('/') && req.path.startsWith(path)),
    );

    // Safe methods don't need CSRF protection
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method) || isExempt) {
      // Generate and set CSRF token for subsequent requests
      this.setCsrfToken(res);
      return;
    }

    // Validate CSRF token for state-changing requests
    const cookieToken = req.cookies?.[this.config.csrfCookieName];
    const headerToken = req.headers[
      this.config.csrfHeaderName.toLowerCase()
    ] as string;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      this.logger.warn(
        `CSRF validation failed for ${req.method} ${req.path}`,
        {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          hasHeaderToken: !!headerToken,
          hasCookieToken: !!cookieToken,
        },
      );
      throw new BadRequestException('CSRF token validation failed');
    }

    // Regenerate token after successful validation
    this.setCsrfToken(res);
  }

  /**
   * Generate and set CSRF token cookie
   */
  private setCsrfToken(res: Response): void {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(this.config.csrfCookieName, token, {
      httpOnly: false, // Client needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
      path: '/',
    });
  }

  /**
   * Sanitize request data to prevent XSS and injection attacks
   */
  private sanitizeRequest(req: Request): void {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = this.sanitizeObject(req.query) as typeof req.query;
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = this.sanitizeObject(req.params) as typeof req.params;
    }
  }

  /**
   * Recursively sanitize an object's string values
   */
  private sanitizeObject<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        // Sanitize key as well
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized as T;
    }

    return obj;
  }

  /**
   * Sanitize a string value
   *
   * - Removes HTML tags (potential XSS)
   * - Encodes special HTML characters
   * - Removes null bytes
   * - Trims excessive whitespace
   */
  private sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return str;
    }

    let sanitized = str;

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove HTML tags (basic XSS prevention)
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Encode HTML entities
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    // Only encode if there are actual HTML-like patterns
    if (/<|>|&/.test(sanitized)) {
      sanitized = sanitized.replace(
        /[&<>"'/]/g,
        (char) => htmlEntities[char] || char,
      );
    }

    // Remove common XSS patterns
    const xssPatterns = [
      /javascript:/gi,
      /data:/gi,
      /vbscript:/gi,
      /on\w+=/gi,
      /expression\(/gi,
    ];

    for (const pattern of xssPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Trim excessive whitespace but preserve single spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }
}

/**
 * Factory function to create security middleware with custom config
 */
export function createSecurityMiddleware(
  config?: Partial<SecurityMiddlewareConfig>,
): new () => SecurityMiddleware {
  return class extends SecurityMiddleware {
    constructor() {
      super(config);
    }
  };
}
