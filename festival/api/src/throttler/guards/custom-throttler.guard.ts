import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RedisThrottlerStorageService } from '../services/redis-throttler-storage.service';
import { RateLimitInfo, RateLimitViolation } from '../interfaces/throttler.interfaces';
import {
  THROTTLE_LIMIT_KEY,
  THROTTLE_TTL_KEY,
  THROTTLE_SKIP_KEY,
  THROTTLE_TRACKER_KEY,
  THROTTLE_CONFIG,
  ThrottleTrackerType,
} from '../throttler.constants';

// Extend Express Request to include rate limit info and user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  apiKey?: string;
  rateLimit?: RateLimitInfo;
}

@Injectable()
export class CustomThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly storageService: RedisThrottlerStorageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse();

    // Check if throttling should be skipped
    const skipThrottle = this.reflector.getAllAndOverride<boolean>(THROTTLE_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipThrottle) {
      return true;
    }

    // Get throttle configuration from decorators or use defaults
    const limit = this.reflector.getAllAndOverride<number>(THROTTLE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? THROTTLE_CONFIG.GLOBAL.limit;

    const ttl = this.reflector.getAllAndOverride<number>(THROTTLE_TTL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? THROTTLE_CONFIG.GLOBAL.ttl;

    const trackerType = this.reflector.getAllAndOverride<ThrottleTrackerType>(THROTTLE_TRACKER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? ThrottleTrackerType.IP;

    // Generate tracking key based on tracker type
    const trackingKey = this.generateTrackingKey(request, trackerType, context);

    // Check if the identifier is blocked
    const isBlocked = await this.storageService.isBlocked(trackingKey);
    if (isBlocked) {
      this.logger.warn(`Blocked request from: ${trackingKey}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'You have been temporarily blocked due to excessive requests. Please try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment the request count
    const record = await this.storageService.increment(trackingKey, ttl);
    const remaining = Math.max(0, limit - record.count);
    const resetTime = Math.ceil(record.expiresAt / 1000);

    // Set rate limit info on request for the interceptor
    const rateLimitInfo: RateLimitInfo = {
      limit,
      remaining,
      reset: resetTime,
      retryAfter: remaining === 0 ? Math.ceil((record.expiresAt - Date.now()) / 1000) : undefined,
    };
    request.rateLimit = rateLimitInfo;

    // Check if limit exceeded
    if (record.count > limit) {
      // Record violation
      const violationCount = await this.storageService.recordViolation(trackingKey);

      // Log the violation
      const violation: RateLimitViolation = {
        identifier: trackingKey,
        identifierType: trackerType,
        endpoint: request.path,
        method: request.method,
        limit,
        attempts: record.count,
        timestamp: new Date(),
        ip: this.getClientIp(request),
        userId: request.user?.id,
        apiKey: request.apiKey,
        userAgent: request.headers['user-agent'],
      };

      this.logViolation(violation, violationCount);

      // Set headers even for rate-limited responses
      response.header('X-RateLimit-Limit', limit.toString());
      response.header('X-RateLimit-Remaining', '0');
      response.header('X-RateLimit-Reset', resetTime.toString());
      response.header('Retry-After', rateLimitInfo.retryAfter?.toString() || '60');

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${limit} requests per ${ttl / 1000} seconds allowed.`,
          retryAfter: rateLimitInfo.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Generate a tracking key based on the tracker type
   */
  private generateTrackingKey(
    request: AuthenticatedRequest,
    trackerType: ThrottleTrackerType,
    context: ExecutionContext,
  ): string {
    const endpoint = `${request.method}:${request.path}`;
    const ip = this.getClientIp(request);

    switch (trackerType) {
      case ThrottleTrackerType.IP:
        return `ip:${ip}:${endpoint}`;

      case ThrottleTrackerType.USER_ID:
        if (request.user?.id) {
          return `user:${request.user.id}:${endpoint}`;
        }
        // Fall back to IP if no user
        return `ip:${ip}:${endpoint}`;

      case ThrottleTrackerType.API_KEY:
        if (request.apiKey) {
          return `apikey:${request.apiKey}:${endpoint}`;
        }
        // Check for API key in headers
        const apiKey = request.headers['x-api-key'] as string;
        if (apiKey) {
          return `apikey:${apiKey}:${endpoint}`;
        }
        // Fall back to IP if no API key
        return `ip:${ip}:${endpoint}`;

      case ThrottleTrackerType.COMBINED:
        // Use combination of user ID (if available) and IP
        const userId = request.user?.id || 'anonymous';
        return `combined:${userId}:${ip}:${endpoint}`;

      default:
        return `ip:${ip}:${endpoint}`;
    }
  }

  /**
   * Extract client IP from request, handling proxies
   */
  private getClientIp(request: Request): string {
    // Check X-Forwarded-For header (common with proxies/load balancers)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    // Check X-Real-IP header (nginx)
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fall back to connection remote address
    return request.ip || request.socket?.remoteAddress || 'unknown';
  }

  /**
   * Log rate limit violations
   */
  private logViolation(violation: RateLimitViolation, violationCount: number): void {
    const logMessage = {
      message: 'Rate limit violation detected',
      ...violation,
      totalViolations: violationCount,
    };

    if (violationCount >= 5) {
      this.logger.error(JSON.stringify(logMessage));
    } else if (violationCount >= 3) {
      this.logger.warn(JSON.stringify(logMessage));
    } else {
      this.logger.log(JSON.stringify(logMessage));
    }
  }
}
