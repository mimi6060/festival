import { SetMetadata, applyDecorators } from '@nestjs/common';
import {
  THROTTLE_LIMIT_KEY,
  THROTTLE_TTL_KEY,
  THROTTLE_SKIP_KEY,
  THROTTLE_TRACKER_KEY,
  THROTTLE_CONFIG,
  ThrottleTrackerType,
} from '../throttler.constants';

/**
 * Custom Throttle decorator
 * Applies rate limiting to a controller or route handler
 *
 * @param limit - Maximum number of requests allowed in the time window
 * @param ttl - Time window in milliseconds
 * @param tracker - Type of identifier to use for tracking (IP, User ID, API Key)
 */
export function Throttle(
  limit: number,
  ttl: number,
  tracker: ThrottleTrackerType = ThrottleTrackerType.IP,
) {
  return applyDecorators(
    SetMetadata(THROTTLE_LIMIT_KEY, limit),
    SetMetadata(THROTTLE_TTL_KEY, ttl),
    SetMetadata(THROTTLE_TRACKER_KEY, tracker),
  );
}

/**
 * Skip throttling for specific routes
 * Useful for webhooks, health checks, etc.
 */
export function SkipThrottle() {
  return SetMetadata(THROTTLE_SKIP_KEY, true);
}

/**
 * Auth endpoints throttle decorator
 * 5 requests per minute - anti brute-force protection
 */
export function ThrottleAuth() {
  return Throttle(
    THROTTLE_CONFIG.AUTH.limit,
    THROTTLE_CONFIG.AUTH.ttl,
    ThrottleTrackerType.IP,
  );
}

/**
 * Payment endpoints throttle decorator
 * 10 requests per minute
 */
export function ThrottlePayment() {
  return Throttle(
    THROTTLE_CONFIG.PAYMENT.limit,
    THROTTLE_CONFIG.PAYMENT.ttl,
    ThrottleTrackerType.COMBINED,
  );
}

/**
 * Public endpoints throttle decorator
 * 200 requests per minute
 */
export function ThrottlePublic() {
  return Throttle(
    THROTTLE_CONFIG.PUBLIC.limit,
    THROTTLE_CONFIG.PUBLIC.ttl,
    ThrottleTrackerType.IP,
  );
}

/**
 * Strict throttle decorator for sensitive operations
 * 3 requests per 5 minutes
 */
export function ThrottleStrict() {
  return Throttle(
    THROTTLE_CONFIG.STRICT.limit,
    THROTTLE_CONFIG.STRICT.ttl,
    ThrottleTrackerType.COMBINED,
  );
}

/**
 * Throttle by user ID only (requires authenticated user)
 */
export function ThrottleByUser(limit: number, ttl: number) {
  return Throttle(limit, ttl, ThrottleTrackerType.USER_ID);
}

/**
 * Throttle by API key only
 */
export function ThrottleByApiKey(limit: number, ttl: number) {
  return Throttle(limit, ttl, ThrottleTrackerType.API_KEY);
}
