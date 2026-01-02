import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
    festivalId?: string;
  };
}

/**
 * Middleware to set Sentry user context from authenticated request
 * This ensures all errors and transactions are associated with the user
 */
@Injectable()
export class SentryUserMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    // Set user context if user is authenticated
    if (req.user) {
      Sentry.setUser({
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      });

      // Add additional tags for filtering
      if (req.user.festivalId) {
        Sentry.setTag('festival_id', req.user.festivalId);
      }
      if (req.user.role) {
        Sentry.setTag('user_role', req.user.role);
      }
    }

    // Add request-specific context
    Sentry.setContext('request_info', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      referer: req.get('referer'),
      correlationId: req.headers['x-correlation-id'],
    });

    // Add breadcrumb for the incoming request
    Sentry.addBreadcrumb({
      category: 'http',
      message: `${req.method} ${req.url}`,
      level: 'info',
      data: {
        method: req.method,
        url: req.url,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
      },
    });

    // Clear user context when response finishes (for connection reuse)
    res.on('finish', () => {
      // Only clear if not an error (errors are handled by the filter)
      if (res.statusCode < 400) {
        Sentry.setUser(null);
      }
    });

    next();
  }
}
