/**
 * Security Middleware Unit Tests
 *
 * Comprehensive tests for security middleware including:
 * - Security headers
 * - CSRF protection
 * - Request sanitization
 * - Request ID tracking
 * - HTTP method validation
 * - XSS prevention
 * - Content Security Policy
 */

import { BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  SecurityMiddleware,
  SecurityMiddlewareConfig,
  createSecurityMiddleware,
} from './security.middleware';

// ============================================================================
// Mock Setup
// ============================================================================

const createMockRequest = (
  overrides: Partial<{
    method: string;
    path: string;
    body: Record<string, unknown>;
    query: Record<string, unknown>;
    params: Record<string, unknown>;
    headers: Record<string, string>;
    cookies: Record<string, string>;
    ip: string;
  }> = {},
): Partial<Request> => ({
  method: overrides.method ?? 'GET',
  path: overrides.path ?? '/api/test',
  body: overrides.body ?? {},
  query: overrides.query ?? {},
  params: overrides.params ?? {},
  headers: overrides.headers ?? {},
  cookies: overrides.cookies ?? {},
  ip: overrides.ip ?? '127.0.0.1',
});

const createMockResponse = (): Partial<Response> => {
  const headers: Record<string, string> = {};
  return {
    setHeader: jest.fn((key: string, value: string) => {
      headers[key] = value;
      return this;
    }),
    removeHeader: jest.fn(),
    cookie: jest.fn(),
    getHeader: jest.fn((key: string) => headers[key]),
    _headers: headers,
  } as any;
};

const createMockNext = (): NextFunction => jest.fn();

describe('SecurityMiddleware', () => {
  let middleware: SecurityMiddleware;

  beforeEach(() => {
    middleware = new SecurityMiddleware();
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      expect(middleware).toBeDefined();
    });

    it('should accept custom config', () => {
      const customMiddleware = new SecurityMiddleware({
        csrfEnabled: false,
        sanitizeEnabled: false,
      });
      expect(customMiddleware).toBeDefined();
    });
  });

  describe('use - request ID tracking', () => {
    it('should generate request ID when not present', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(req.headers!['x-request-id']).toBeDefined();
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        expect.any(String),
      );
    });

    it('should use existing request ID', () => {
      const existingId = 'existing-request-id';
      const req = createMockRequest({
        headers: { 'x-request-id': existingId },
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(req.headers!['x-request-id']).toBe(existingId);
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', existingId);
    });

    it('should not add request ID when disabled', () => {
      const customMiddleware = new SecurityMiddleware({
        requestIdEnabled: false,
      });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      customMiddleware.use(req as Request, res as Response, next);

      expect(res.setHeader).not.toHaveBeenCalledWith(
        'X-Request-ID',
        expect.any(String),
      );
    });
  });

  describe('use - security headers', () => {
    it('should set Content-Security-Policy header', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.any(String),
      );
    });

    it('should set X-Content-Type-Options header', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff',
      );
    });

    it('should set X-XSS-Protection header when enabled', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '1; mode=block',
      );
    });

    it('should set X-Frame-Options header when clickjacking protection enabled', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should set Referrer-Policy header', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin',
      );
    });

    it('should set Permissions-Policy header', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.any(String),
      );
    });

    it('should set cache control headers', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-store, no-cache, must-revalidate',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Expires', '0');
    });

    it('should remove X-Powered-By header', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(res.removeHeader).toHaveBeenCalledWith('X-Powered-By');
    });

    it('should set Cross-Origin headers', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Cross-Origin-Opener-Policy',
        'same-origin',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Cross-Origin-Resource-Policy',
        'same-origin',
      );
    });
  });

  describe('use - HTTP method validation', () => {
    it('should allow valid HTTP methods', () => {
      const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

      for (const method of validMethods) {
        const req = createMockRequest({ method });
        const res = createMockResponse();
        const next = createMockNext();

        // For POST methods, add CSRF token or use exempt path
        if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
          (req as any).path = '/api/auth/login'; // Exempt path
        }

        middleware.use(req as Request, res as Response, next);
        // Should not have called next with an error for method validation
        expect(next).toHaveBeenCalled();
      }
    });

    it('should reject invalid HTTP methods', () => {
      const req = createMockRequest({ method: 'TRACE' });
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      // Should call next with a BadRequestException
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestException));
    });

    it('should allow custom methods when configured', () => {
      const customMiddleware = new SecurityMiddleware({
        allowedMethods: ['GET', 'POST', 'TRACE'],
        csrfEnabled: false,
      });
      const req = createMockRequest({ method: 'TRACE' });
      const res = createMockResponse();
      const next = createMockNext();

      customMiddleware.use(req as Request, res as Response, next);

      // Should call next without error
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('use - CSRF protection', () => {
    // Note: CSRF is disabled by default in test environment via CSRF_ENABLED=false
    // We need to explicitly enable it for these tests
    let csrfMiddleware: SecurityMiddleware;

    beforeEach(() => {
      csrfMiddleware = new SecurityMiddleware({ csrfEnabled: true });
    });

    it('should set CSRF token cookie for GET requests', () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = createMockNext();

      csrfMiddleware.use(req as Request, res as Response, next);

      expect(res.cookie).toHaveBeenCalledWith(
        'XSRF-TOKEN',
        expect.any(String),
        expect.objectContaining({
          httpOnly: false,
          sameSite: 'strict',
          path: '/',
        }),
      );
    });

    it('should skip CSRF for exempt paths', () => {
      const exemptPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/refresh',
        '/api/webhooks/stripe',
        '/api/health',
      ];

      for (const path of exemptPaths) {
        const req = createMockRequest({
          method: 'POST',
          path,
        });
        const res = createMockResponse();
        const next = createMockNext();

        csrfMiddleware.use(req as Request, res as Response, next);
        // Should call next without an error for exempt paths
        expect(next).toHaveBeenCalledWith();
      }
    });

    it('should skip CSRF for safe methods', () => {
      // Only use safe methods that are also in the allowedMethods list
      // HEAD is not in default allowedMethods, so skip it here
      const safeMethods = ['GET', 'OPTIONS'];

      for (const method of safeMethods) {
        const req = createMockRequest({ method });
        const res = createMockResponse();
        const next = createMockNext();

        csrfMiddleware.use(req as Request, res as Response, next);
        // Should call next without an error for safe methods
        expect(next).toHaveBeenCalledWith();
      }
    });

    it('should reject POST without CSRF token', () => {
      const req = createMockRequest({
        method: 'POST',
        path: '/api/users',
        cookies: {},
        headers: {},
      });
      const res = createMockResponse();
      const next = createMockNext();

      csrfMiddleware.use(req as Request, res as Response, next);

      // Should call next with a BadRequestException
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestException));
    });

    it('should reject POST with mismatched CSRF tokens', () => {
      const req = createMockRequest({
        method: 'POST',
        path: '/api/users',
        cookies: { 'XSRF-TOKEN': 'token1' },
        headers: { 'x-xsrf-token': 'token2' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      csrfMiddleware.use(req as Request, res as Response, next);

      // Should call next with a BadRequestException
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestException));
    });

    it('should allow POST with matching CSRF tokens', () => {
      const token = 'valid-csrf-token';
      const req = createMockRequest({
        method: 'POST',
        path: '/api/users',
        cookies: { 'XSRF-TOKEN': token },
        headers: { 'x-xsrf-token': token },
      });
      const res = createMockResponse();
      const next = createMockNext();

      csrfMiddleware.use(req as Request, res as Response, next);

      // Should call next without an error
      expect(next).toHaveBeenCalledWith();
    });

    it('should skip CSRF when disabled', () => {
      const disabledCsrfMiddleware = new SecurityMiddleware({
        csrfEnabled: false,
      });
      const req = createMockRequest({
        method: 'POST',
        path: '/api/users',
      });
      const res = createMockResponse();
      const next = createMockNext();

      disabledCsrfMiddleware.use(req as Request, res as Response, next);

      // Should call next without an error
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('use - request sanitization', () => {
    it('should sanitize request body', () => {
      const req = createMockRequest({
        body: {
          name: '  John Doe  ',
          content: '<script>alert(1)</script>Hello',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(req.body!.name).toBe('John Doe');
      expect(req.body!.content).not.toContain('<script>');
    });

    it('should sanitize query parameters', () => {
      const req = createMockRequest({
        query: {
          search: '  test<script>  ',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(req.query!.search).not.toContain('<script>');
    });

    it('should sanitize URL parameters', () => {
      const req = createMockRequest({
        params: {
          id: '  123<script>  ',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(req.params!.id).not.toContain('<script>');
    });

    it('should remove null bytes', () => {
      const req = createMockRequest({
        body: {
          name: 'John\0Doe',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(req.body!.name).not.toContain('\0');
    });

    it('should remove XSS patterns', () => {
      const xssPatterns = [
        'javascript:alert(1)',
        'data:text/html,<script>',
        'vbscript:msgbox',
        'onclick=alert(1)',
        'expression(alert(1))',
      ];

      for (const pattern of xssPatterns) {
        const req = createMockRequest({
          body: { content: pattern },
        });
        const res = createMockResponse();
        const next = createMockNext();

        middleware.use(req as Request, res as Response, next);

        expect(req.body!.content).not.toMatch(/(javascript|vbscript|data|onclick|expression)/i);
      }
    });

    it('should skip sanitization when disabled', () => {
      const customMiddleware = new SecurityMiddleware({
        sanitizeEnabled: false,
      });
      const req = createMockRequest({
        body: { name: '  John  ' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      customMiddleware.use(req as Request, res as Response, next);

      expect(req.body!.name).toBe('  John  ');
    });

    it('should handle nested objects', () => {
      const req = createMockRequest({
        body: {
          user: {
            profile: {
              name: '  <script>John</script>  ',
            },
          },
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(req.body!.user.profile.name).not.toContain('<script>');
    });

    it('should handle arrays', () => {
      const req = createMockRequest({
        body: {
          tags: ['  tag1  ', '<script>tag2</script>'],
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(req.body!.tags[0]).toBe('tag1');
      expect(req.body!.tags[1]).not.toContain('<script>');
    });

    it('should preserve non-string values', () => {
      const req = createMockRequest({
        body: {
          count: 42,
          active: true,
          items: null,
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(req.body!.count).toBe(42);
      expect(req.body!.active).toBe(true);
      expect(req.body!.items).toBe(null);
    });
  });

  describe('use - error handling', () => {
    it('should call next with error on exception', () => {
      const customMiddleware = new SecurityMiddleware({
        allowedMethods: [], // This will cause any method to throw
        csrfEnabled: false,
      });
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = createMockNext();

      customMiddleware.use(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should call next without arguments on success', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('CSP directives', () => {
    it('should include default CSP directives', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req as Request, res as Response, next);

      const cspCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Security-Policy',
      );
      expect(cspCall).toBeDefined();
      const cspValue = cspCall![1];
      expect(cspValue).toContain("default-src 'self'");
      expect(cspValue).toContain("frame-ancestors 'none'");
    });

    it('should allow custom CSP directives', () => {
      const customMiddleware = new SecurityMiddleware({
        cspDirectives: {
          'default-src': ["'self'", 'https://cdn.example.com'],
          'script-src': ["'self'"],
        },
      });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      customMiddleware.use(req as Request, res as Response, next);

      const cspCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Security-Policy',
      );
      expect(cspCall![1]).toContain('https://cdn.example.com');
    });
  });
});

describe('createSecurityMiddleware', () => {
  it('should create middleware class with custom config', () => {
    const CustomMiddleware = createSecurityMiddleware({
      csrfEnabled: false,
    });

    const middleware = new CustomMiddleware();
    const req = createMockRequest({
      method: 'POST',
      path: '/api/test',
    });
    const res = createMockResponse();
    const next = createMockNext();

    middleware.use(req as Request, res as Response, next);

    // Should call next without error because CSRF is disabled
    expect(next).toHaveBeenCalledWith();
  });

  it('should extend SecurityMiddleware', () => {
    const CustomMiddleware = createSecurityMiddleware();
    const middleware = new CustomMiddleware();
    expect(middleware).toBeInstanceOf(SecurityMiddleware);
  });
});

describe('Edge cases', () => {
  it('should handle empty body', () => {
    const middleware = new SecurityMiddleware({ csrfEnabled: false });
    const req = createMockRequest({ body: undefined });
    const res = createMockResponse();
    const next = createMockNext();

    middleware.use(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should handle null body', () => {
    const middleware = new SecurityMiddleware({ csrfEnabled: false });
    const req = createMockRequest({ body: null as any });
    const res = createMockResponse();
    const next = createMockNext();

    middleware.use(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should handle empty query', () => {
    const middleware = new SecurityMiddleware({ csrfEnabled: false });
    const req = createMockRequest({ query: undefined });
    const res = createMockResponse();
    const next = createMockNext();

    middleware.use(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should handle deeply nested malicious content', () => {
    const middleware = new SecurityMiddleware({ csrfEnabled: false });
    const req = createMockRequest({
      body: {
        level1: {
          level2: {
            level3: {
              content: '<script>alert(document.cookie)</script>',
            },
          },
        },
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    middleware.use(req as Request, res as Response, next);

    expect(req.body!.level1.level2.level3.content).not.toContain('<script>');
  });

  it('should handle very long strings', () => {
    const middleware = new SecurityMiddleware({ csrfEnabled: false });
    const longString = 'a'.repeat(10000);
    const req = createMockRequest({
      body: { content: longString },
    });
    const res = createMockResponse();
    const next = createMockNext();

    middleware.use(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should handle special unicode characters', () => {
    const middleware = new SecurityMiddleware({ csrfEnabled: false });
    const req = createMockRequest({
      body: { content: 'Hello\u2028World\u2029End' },
    });
    const res = createMockResponse();
    const next = createMockNext();

    middleware.use(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });
});

describe('Security edge cases', () => {
  it('should handle encoded XSS attempts', () => {
    const middleware = new SecurityMiddleware({ csrfEnabled: false });
    const req = createMockRequest({
      body: {
        content: '&lt;script&gt;alert(1)&lt;/script&gt;',
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    middleware.use(req as Request, res as Response, next);

    // Already encoded content should remain
    expect(req.body!.content).toBeDefined();
  });

  it('should handle null byte injection', () => {
    const middleware = new SecurityMiddleware({ csrfEnabled: false });
    const req = createMockRequest({
      body: {
        filename: 'image.jpg\0.exe',
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    middleware.use(req as Request, res as Response, next);

    expect(req.body!.filename).not.toContain('\0');
  });

  it('should handle prototype pollution attempts', () => {
    const middleware = new SecurityMiddleware({ csrfEnabled: false });
    const req = createMockRequest({
      body: {
        '__proto__': { polluted: true },
        'constructor': { prototype: { polluted: true } },
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    middleware.use(req as Request, res as Response, next);

    // Should not pollute global prototype
    expect(next).toHaveBeenCalledWith();
    expect(({} as any).polluted).toBeUndefined();
  });
});
