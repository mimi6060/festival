/**
 * Rate Limit Guard Decorators
 *
 * @deprecated Use the decorators from '../throttler' instead
 *
 * This file is kept for backwards compatibility.
 * The new throttler module provides more advanced features.
 *
 * Migration guide:
 * - SkipThrottle() -> import { SkipThrottle } from '../throttler'
 * - CustomThrottle() -> import { Throttle } from '../throttler'
 *
 * @see api/src/throttler for the new implementation
 */

// Re-export from the new throttler module for backwards compatibility
export { SkipThrottle, Throttle as CustomThrottle } from '../../throttler';

// Legacy interface kept for backwards compatibility
export interface CustomThrottleConfig {
  limit: number;
  ttl: number; // in milliseconds
}

// Legacy constants
export const SKIP_THROTTLE_KEY = 'THROTTLE_SKIP';
export const CUSTOM_THROTTLE_KEY = 'THROTTLE_LIMIT';
