import { Injectable, Logger } from '@nestjs/common';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds between retries */
  initialDelayMs: number;
  /** Maximum delay in milliseconds (for exponential backoff) */
  maxDelayMs: number;
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Whether to add jitter to delays to avoid thundering herd */
  useJitter?: boolean;
  /** Error types that should trigger a retry */
  retryableErrors?: (new (...args: unknown[]) => Error)[];
  /** Custom function to determine if an error is retryable */
  isRetryable?: (error: Error) => boolean;
  /** Callback called on each retry attempt */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
  /** Operation name for logging */
  operationName?: string;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDurationMs: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_OPTIONS: Partial<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  useJitter: true,
};

/**
 * Retry service for critical operations
 * Implements exponential backoff with jitter
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  /**
   * Execute an operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
  ): Promise<RetryResult<T>> {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
    const startTime = Date.now();
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < config.maxAttempts) {
      attempt++;

      try {
        const result = await operation();

        if (attempt > 1) {
          this.logger.log(
            `[${config.operationName || 'Operation'}] Succeeded after ${attempt} attempt(s)`,
          );
        }

        return {
          success: true,
          result,
          attempts: attempt,
          totalDurationMs: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry this error
        if (!this.shouldRetry(lastError, config)) {
          this.logger.warn(
            `[${config.operationName || 'Operation'}] Non-retryable error on attempt ${attempt}: ${lastError.message}`,
          );
          break;
        }

        // Check if we've exhausted retries
        if (attempt >= config.maxAttempts) {
          this.logger.error(
            `[${config.operationName || 'Operation'}] Failed after ${attempt} attempts: ${lastError.message}`,
          );
          break;
        }

        // Calculate delay with exponential backoff and optional jitter
        const delay = this.calculateDelay(attempt, config);

        this.logger.warn(
          `[${config.operationName || 'Operation'}] Attempt ${attempt} failed, retrying in ${delay}ms: ${lastError.message}`,
        );

        // Call optional retry callback
        if (config.onRetry) {
          config.onRetry(lastError, attempt, delay);
        }

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: attempt,
      totalDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Execute with retry and throw on failure
   */
  async executeOrThrow<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
  ): Promise<T> {
    const result = await this.execute(operation, options);

    if (!result.success) {
      throw result.error || new Error('Operation failed after retries');
    }

    return result.result as T;
  }

  /**
   * Execute multiple operations with retry, failing fast on first error
   */
  async executeAll<T>(
    operations: Array<() => Promise<T>>,
    options: RetryOptions,
  ): Promise<RetryResult<T[]>> {
    const startTime = Date.now();
    const results: T[] = [];

    for (let i = 0; i < operations.length; i++) {
      const result = await this.execute(operations[i], {
        ...options,
        operationName: `${options.operationName || 'Operation'}[${i}]`,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          attempts: result.attempts,
          totalDurationMs: Date.now() - startTime,
        };
      }

      results.push(result.result as T);
    }

    return {
      success: true,
      result: results,
      attempts: 1,
      totalDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Execute multiple operations with retry, collecting all results/errors
   */
  async executeAllSettled<T>(
    operations: Array<() => Promise<T>>,
    options: RetryOptions,
  ): Promise<Array<RetryResult<T>>> {
    return Promise.all(
      operations.map((op, i) =>
        this.execute(op, {
          ...options,
          operationName: `${options.operationName || 'Operation'}[${i}]`,
        }),
      ),
    );
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: Error, config: RetryOptions): boolean {
    // Custom retry check
    if (config.isRetryable) {
      return config.isRetryable(error);
    }

    // Check against retryable error types
    if (config.retryableErrors && config.retryableErrors.length > 0) {
      return config.retryableErrors.some((ErrorType) => error instanceof ErrorType);
    }

    // Default: retry on network errors and timeouts
    return this.isDefaultRetryableError(error);
  }

  /**
   * Check if error is a commonly retryable error
   */
  private isDefaultRetryableError(error: Error): boolean {
    const retryableMessages = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'EPIPE',
      'EPROTO',
      'EHOSTUNREACH',
      'socket hang up',
      'timeout',
      'network error',
      'connection reset',
      'deadlock',
      'lock wait timeout',
      'too many connections',
      'temporary failure',
      'service unavailable',
      'rate limit',
      'throttl',
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableMessages.some((msg) => errorMessage.includes(msg.toLowerCase()));
  }

  /**
   * Calculate delay for the given attempt
   */
  private calculateDelay(attempt: number, config: RetryOptions): number {
    const multiplier = config.backoffMultiplier || 2;
    let delay = config.initialDelayMs * Math.pow(multiplier, attempt - 1);

    // Cap at max delay
    delay = Math.min(delay, config.maxDelayMs);

    // Add jitter if enabled (0-30% random variation)
    if (config.useJitter) {
      const jitter = delay * 0.3 * Math.random();
      delay = Math.floor(delay + jitter);
    }

    return delay;
  }

  /**
   * Sleep for the specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Decorator for retry logic on class methods
 */
export function Retry(options: RetryOptions) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const retryService = new RetryService();
      const result = await retryService.execute(
        () => originalMethod.apply(this, args),
        { ...options, operationName: propertyKey },
      );

      if (!result.success) {
        throw result.error;
      }

      return result.result;
    };

    return descriptor;
  };
}

/**
 * Pre-configured retry options for common use cases
 */
export const RetryPresets = {
  /** Database operations: 3 attempts, 100ms-2s delay */
  DATABASE: {
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
    useJitter: true,
    operationName: 'Database',
  } as RetryOptions,

  /** External API calls: 5 attempts, 500ms-30s delay */
  EXTERNAL_API: {
    maxAttempts: 5,
    initialDelayMs: 500,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    useJitter: true,
    operationName: 'ExternalAPI',
  } as RetryOptions,

  /** Payment operations: 3 attempts, 1s-10s delay */
  PAYMENT: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    useJitter: true,
    operationName: 'Payment',
  } as RetryOptions,

  /** Cache operations: 2 attempts, 50ms-500ms delay */
  CACHE: {
    maxAttempts: 2,
    initialDelayMs: 50,
    maxDelayMs: 500,
    backoffMultiplier: 2,
    useJitter: false,
    operationName: 'Cache',
  } as RetryOptions,

  /** Email sending: 4 attempts, 2s-60s delay */
  EMAIL: {
    maxAttempts: 4,
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 3,
    useJitter: true,
    operationName: 'Email',
  } as RetryOptions,

  /** Push notifications: 3 attempts, 500ms-5s delay */
  PUSH_NOTIFICATION: {
    maxAttempts: 3,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    useJitter: true,
    operationName: 'PushNotification',
  } as RetryOptions,
};
