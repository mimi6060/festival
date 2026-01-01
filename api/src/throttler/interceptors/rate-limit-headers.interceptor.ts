import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response, Request } from 'express';
import { RateLimitInfo } from '../interfaces/throttler.interfaces';

// Extend Express Request to include rate limit info
interface RequestWithRateLimit extends Request {
  rateLimit?: RateLimitInfo;
}

/**
 * Interceptor that adds rate limit headers to all responses
 *
 * Headers added:
 * - X-RateLimit-Limit: Maximum requests allowed in the time window
 * - X-RateLimit-Remaining: Remaining requests in the current window
 * - X-RateLimit-Reset: Unix timestamp when the rate limit resets
 * - X-RateLimit-Policy: Rate limiting policy description
 */
@Injectable()
export class RateLimitHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithRateLimit>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        // Get rate limit info from request (set by the guard)
        const rateLimitInfo = request.rateLimit;

        if (rateLimitInfo) {
          // Set standard rate limit headers
          response.setHeader('X-RateLimit-Limit', rateLimitInfo.limit.toString());
          response.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
          response.setHeader('X-RateLimit-Reset', rateLimitInfo.reset.toString());

          // Add policy header for transparency
          const windowSeconds = Math.ceil((rateLimitInfo.reset * 1000 - Date.now()) / 1000);
          response.setHeader(
            'X-RateLimit-Policy',
            `${rateLimitInfo.limit};w=${Math.abs(windowSeconds) || 60}`,
          );

          // Add retry-after if close to limit
          if (rateLimitInfo.remaining <= 0 && rateLimitInfo.retryAfter) {
            response.setHeader('Retry-After', rateLimitInfo.retryAfter.toString());
          }

          // Add remaining percentage for client-side throttling hints
          const remainingPercent = Math.round((rateLimitInfo.remaining / rateLimitInfo.limit) * 100);
          response.setHeader('X-RateLimit-Remaining-Percent', remainingPercent.toString());
        }
      }),
    );
  }
}
