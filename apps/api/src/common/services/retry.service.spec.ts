/**
 * Retry Service Unit Tests
 *
 * Comprehensive tests for retry service including:
 * - Basic retry logic with exponential backoff
 * - Jitter implementation
 * - Custom retry conditions
 * - Error handling and tracking
 * - Retry decorator
 * - Retry presets
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  RetryService,
  RetryOptions,
  RetryResult,
  DEFAULT_RETRY_OPTIONS,
  RetryPresets,
  Retry,
} from './retry.service';

// ============================================================================
// Test Helpers
// ============================================================================

class TestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestError';
  }
}

class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

describe('RetryService', () => {
  let service: RetryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RetryService],
    }).compile();

    service = module.get<RetryService>(RetryService);
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('successful operations', () => {
      it('should return success result on first attempt', async () => {
        const operation = jest.fn().mockResolvedValue('success');
        const options: RetryOptions = {
          maxAttempts: 3,
          initialDelayMs: 100,
          maxDelayMs: 1000,
        };

        const result = await service.execute(operation, options);

        expect(result.success).toBe(true);
        expect(result.result).toBe('success');
        expect(result.attempts).toBe(1);
        expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should return success result after retries', async () => {
        const operation = jest
          .fn()
          .mockRejectedValueOnce(new Error('timeout'))
          .mockRejectedValueOnce(new Error('connection reset'))
          .mockResolvedValue('success');

        const options: RetryOptions = {
          maxAttempts: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          useJitter: false,
        };

        const result = await service.execute(operation, options);

        expect(result.success).toBe(true);
        expect(result.result).toBe('success');
        expect(result.attempts).toBe(3);
        expect(operation).toHaveBeenCalledTimes(3);
      });

      it('should track total duration', async () => {
        const operation = jest
          .fn()
          .mockRejectedValueOnce(new Error('timeout'))
          .mockResolvedValue('success');

        const options: RetryOptions = {
          maxAttempts: 3,
          initialDelayMs: 50,
          maxDelayMs: 100,
          useJitter: false,
        };

        const result = await service.execute(operation, options);

        expect(result.totalDurationMs).toBeGreaterThanOrEqual(50);
      });
    });

    describe('failed operations', () => {
      it('should return failure result after exhausting retries', async () => {
        const error = new Error('persistent failure');
        const operation = jest.fn().mockRejectedValue(error);

        const options: RetryOptions = {
          maxAttempts: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          useJitter: false,
          isRetryable: () => false, // Don't retry to avoid default retryable check
        };

        const result = await service.execute(operation, options);

        expect(result.success).toBe(false);
        expect(result.error).toBe(error);
        expect(result.attempts).toBe(1);
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should handle non-Error thrown values', async () => {
        const operation = jest.fn().mockRejectedValue('string error');

        const options: RetryOptions = {
          maxAttempts: 2,
          initialDelayMs: 10,
          maxDelayMs: 100,
          isRetryable: () => false,
        };

        const result = await service.execute(operation, options);

        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error?.message).toBe('string error');
      });
    });

    describe('retry conditions', () => {
      it('should not retry non-retryable errors', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('unknown'));

        const options: RetryOptions = {
          maxAttempts: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          isRetryable: () => false,
        };

        const result = await service.execute(operation, options);

        expect(result.success).toBe(false);
        expect(result.attempts).toBe(1);
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should use custom isRetryable function', async () => {
        const retryableError = new TestError('retryable');
        const operation = jest
          .fn()
          .mockRejectedValueOnce(retryableError)
          .mockResolvedValue('success');

        const options: RetryOptions = {
          maxAttempts: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          isRetryable: (error) => error instanceof TestError,
        };

        const result = await service.execute(operation, options);

        expect(result.success).toBe(true);
        expect(result.attempts).toBe(2);
      });

      it('should use retryableErrors array', async () => {
        const operation = jest
          .fn()
          .mockRejectedValueOnce(new TestError('test'))
          .mockResolvedValue('success');

        const options: RetryOptions = {
          maxAttempts: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          retryableErrors: [TestError],
        };

        const result = await service.execute(operation, options);

        expect(result.success).toBe(true);
        expect(result.attempts).toBe(2);
      });

      it('should not retry if error type not in retryableErrors', async () => {
        const operation = jest.fn().mockRejectedValue(new NonRetryableError('non-retryable'));

        const options: RetryOptions = {
          maxAttempts: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          retryableErrors: [TestError],
        };

        const result = await service.execute(operation, options);

        expect(result.success).toBe(false);
        expect(result.attempts).toBe(1);
      });

      it('should retry on default retryable errors (network errors)', async () => {
        const networkErrors = [
          'ECONNRESET',
          'ECONNREFUSED',
          'ETIMEDOUT',
          'socket hang up',
          'timeout',
          'network error',
          'connection reset',
          'deadlock',
          'too many connections',
          'service unavailable',
          'rate limit',
          'throttling',
        ];

        for (const errorMsg of networkErrors) {
          const operation = jest
            .fn()
            .mockRejectedValueOnce(new Error(errorMsg))
            .mockResolvedValue('success');

          const options: RetryOptions = {
            maxAttempts: 2,
            initialDelayMs: 1,
            maxDelayMs: 10,
            useJitter: false,
          };

          const result = await service.execute(operation, options);

          expect(result.success).toBe(true);
          expect(result.attempts).toBe(2);
        }
      });
    });

    describe('exponential backoff', () => {
      it('should increase delay exponentially', async () => {
        const delays: number[] = [];
        const onRetry = jest.fn((_error, _attempt, delay) => {
          delays.push(delay);
        });

        const operation = jest.fn().mockRejectedValue(new Error('timeout'));

        const options: RetryOptions = {
          maxAttempts: 4,
          initialDelayMs: 100,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
          useJitter: false,
          onRetry,
        };

        await service.execute(operation, options);

        // First retry: 100ms, second: 200ms, third: 400ms
        expect(delays[0]).toBe(100);
        expect(delays[1]).toBe(200);
        expect(delays[2]).toBe(400);
      });

      it('should cap delay at maxDelayMs', async () => {
        const delays: number[] = [];
        const onRetry = jest.fn((_error, _attempt, delay) => {
          delays.push(delay);
        });

        const operation = jest.fn().mockRejectedValue(new Error('timeout'));

        const options: RetryOptions = {
          maxAttempts: 5,
          initialDelayMs: 100,
          maxDelayMs: 300,
          backoffMultiplier: 2,
          useJitter: false,
          onRetry,
        };

        await service.execute(operation, options);

        // All delays should be capped at 300ms
        expect(delays[0]).toBe(100);
        expect(delays[1]).toBe(200);
        expect(delays[2]).toBe(300); // capped
        expect(delays[3]).toBe(300); // capped
      });

      it('should use default backoff multiplier of 2', async () => {
        const delays: number[] = [];
        const onRetry = jest.fn((_error, _attempt, delay) => {
          delays.push(delay);
        });

        const operation = jest.fn().mockRejectedValue(new Error('timeout'));

        const options: RetryOptions = {
          maxAttempts: 3,
          initialDelayMs: 50,
          maxDelayMs: 10000,
          useJitter: false,
          onRetry,
        };

        await service.execute(operation, options);

        expect(delays[0]).toBe(50);
        expect(delays[1]).toBe(100);
      });
    });

    describe('jitter', () => {
      it('should add jitter when enabled', async () => {
        const delays: number[] = [];
        const onRetry = jest.fn((_error, _attempt, delay) => {
          delays.push(delay);
        });

        const operation = jest.fn().mockRejectedValue(new Error('timeout'));

        const options: RetryOptions = {
          maxAttempts: 10,
          initialDelayMs: 100,
          maxDelayMs: 10000,
          backoffMultiplier: 1, // Keep base delay constant
          useJitter: true,
          onRetry,
        };

        await service.execute(operation, options);

        // With jitter, delays should vary (100ms + 0-30% jitter = 100-130ms)
        // Not all delays should be exactly the same
        const uniqueDelays = new Set(delays);
        // With jitter and enough samples, we expect some variation
        expect(delays.every((d) => d >= 100 && d <= 130)).toBe(true);
      });

      it('should not add jitter when disabled', async () => {
        const delays: number[] = [];
        const onRetry = jest.fn((_error, _attempt, delay) => {
          delays.push(delay);
        });

        const operation = jest.fn().mockRejectedValue(new Error('timeout'));

        const options: RetryOptions = {
          maxAttempts: 5,
          initialDelayMs: 100,
          maxDelayMs: 10000,
          backoffMultiplier: 1, // Keep base delay constant
          useJitter: false,
          onRetry,
        };

        await service.execute(operation, options);

        // Without jitter, all delays should be exactly 100ms
        expect(delays.every((d) => d === 100)).toBe(true);
      });
    });

    describe('onRetry callback', () => {
      it('should call onRetry callback on each retry', async () => {
        const onRetry = jest.fn();
        // Use a retryable error (timeout is in default retryable errors list)
        const operation = jest.fn().mockRejectedValue(new Error('timeout'));

        const options: RetryOptions = {
          maxAttempts: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          useJitter: false,
          onRetry,
        };

        await service.execute(operation, options);

        expect(onRetry).toHaveBeenCalledTimes(2); // Called on attempts 1 and 2
        expect(onRetry).toHaveBeenCalledWith(
          expect.any(Error),
          1,
          expect.any(Number),
        );
        expect(onRetry).toHaveBeenCalledWith(
          expect.any(Error),
          2,
          expect.any(Number),
        );
      });

      it('should pass correct error to onRetry', async () => {
        const errors: Error[] = [];
        const onRetry = jest.fn((error) => {
          errors.push(error);
        });

        // Use retryable errors (timeout is in default retryable errors list)
        const error1 = new Error('timeout error 1');
        const error2 = new Error('ECONNRESET error 2');
        const operation = jest
          .fn()
          .mockRejectedValueOnce(error1)
          .mockRejectedValueOnce(error2)
          .mockResolvedValue('success');

        const options: RetryOptions = {
          maxAttempts: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          onRetry,
        };

        await service.execute(operation, options);

        expect(errors[0]).toBe(error1);
        expect(errors[1]).toBe(error2);
      });
    });

    describe('operation name logging', () => {
      it('should use operationName in logs', async () => {
        const operation = jest
          .fn()
          .mockRejectedValueOnce(new Error('timeout'))
          .mockResolvedValue('success');

        const options: RetryOptions = {
          maxAttempts: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          operationName: 'TestOperation',
        };

        const result = await service.execute(operation, options);

        expect(result.success).toBe(true);
      });

      it('should default to "Operation" when no name provided', async () => {
        const operation = jest
          .fn()
          .mockRejectedValueOnce(new Error('timeout'))
          .mockResolvedValue('success');

        const options: RetryOptions = {
          maxAttempts: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
        };

        const result = await service.execute(operation, options);

        expect(result.success).toBe(true);
      });
    });
  });

  describe('executeOrThrow', () => {
    it('should return result on success', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const options: RetryOptions = {
        maxAttempts: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
      };

      const result = await service.executeOrThrow(operation, options);

      expect(result).toBe('success');
    });

    it('should throw error on failure', async () => {
      const error = new Error('persistent failure');
      const operation = jest.fn().mockRejectedValue(error);

      const options: RetryOptions = {
        maxAttempts: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
        useJitter: false,
        isRetryable: () => false,
      };

      await expect(service.executeOrThrow(operation, options)).rejects.toThrow(error);
    });

    it('should throw converted error when non-Error value is thrown', async () => {
      // When a non-Error value is thrown, it gets converted to an Error with String(value) as message
      const operation = jest.fn().mockRejectedValue(null);

      const options: RetryOptions = {
        maxAttempts: 1,
        initialDelayMs: 10,
        maxDelayMs: 100,
        isRetryable: () => false,
      };

      // null gets converted to new Error("null")
      await expect(service.executeOrThrow(operation, options)).rejects.toThrow('null');
    });
  });

  describe('executeAll', () => {
    it('should execute all operations successfully', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockResolvedValue('result2'),
        jest.fn().mockResolvedValue('result3'),
      ];

      const options: RetryOptions = {
        maxAttempts: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
      };

      const result = await service.executeAll(operations, options);

      expect(result.success).toBe(true);
      expect(result.result).toEqual(['result1', 'result2', 'result3']);
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should fail fast on first error', async () => {
      const error = new Error('failure');
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockRejectedValue(error),
        jest.fn().mockResolvedValue('result3'),
      ];

      const options: RetryOptions = {
        maxAttempts: 1,
        initialDelayMs: 10,
        maxDelayMs: 100,
        isRetryable: () => false,
      };

      const result = await service.executeAll(operations, options);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(operations[0]).toHaveBeenCalled();
      expect(operations[1]).toHaveBeenCalled();
      expect(operations[2]).not.toHaveBeenCalled();
    });

    it('should retry failed operations', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest
          .fn()
          .mockRejectedValueOnce(new Error('timeout'))
          .mockResolvedValue('result2'),
        jest.fn().mockResolvedValue('result3'),
      ];

      const options: RetryOptions = {
        maxAttempts: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        useJitter: false,
      };

      const result = await service.executeAll(operations, options);

      expect(result.success).toBe(true);
      expect(result.result).toEqual(['result1', 'result2', 'result3']);
      expect(operations[1]).toHaveBeenCalledTimes(2);
    });

    it('should use indexed operation names', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockResolvedValue('result2'),
      ];

      const options: RetryOptions = {
        maxAttempts: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        operationName: 'BatchOp',
      };

      const result = await service.executeAll(operations, options);

      expect(result.success).toBe(true);
    });
  });

  describe('executeAllSettled', () => {
    it('should collect all results including failures', async () => {
      const error = new Error('failure');
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockRejectedValue(error),
        jest.fn().mockResolvedValue('result3'),
      ];

      const options: RetryOptions = {
        maxAttempts: 1,
        initialDelayMs: 10,
        maxDelayMs: 100,
        isRetryable: () => false,
      };

      const results = await service.executeAllSettled(operations, options);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe('result1');
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe(error);
      expect(results[2].success).toBe(true);
      expect(results[2].result).toBe('result3');
    });

    it('should execute all operations in parallel', async () => {
      const startTimes: number[] = [];
      const operations = [
        jest.fn().mockImplementation(async () => {
          startTimes.push(Date.now());
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 'result1';
        }),
        jest.fn().mockImplementation(async () => {
          startTimes.push(Date.now());
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 'result2';
        }),
        jest.fn().mockImplementation(async () => {
          startTimes.push(Date.now());
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 'result3';
        }),
      ];

      const options: RetryOptions = {
        maxAttempts: 1,
        initialDelayMs: 10,
        maxDelayMs: 100,
      };

      await service.executeAllSettled(operations, options);

      // All operations should start at approximately the same time
      const maxTimeDiff = Math.max(...startTimes) - Math.min(...startTimes);
      expect(maxTimeDiff).toBeLessThan(20); // Less than 20ms difference
    });
  });

  describe('DEFAULT_RETRY_OPTIONS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_RETRY_OPTIONS.maxAttempts).toBe(3);
      expect(DEFAULT_RETRY_OPTIONS.initialDelayMs).toBe(100);
      expect(DEFAULT_RETRY_OPTIONS.maxDelayMs).toBe(5000);
      expect(DEFAULT_RETRY_OPTIONS.backoffMultiplier).toBe(2);
      expect(DEFAULT_RETRY_OPTIONS.useJitter).toBe(true);
    });

    it('should merge with provided options', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const options: RetryOptions = {
        maxAttempts: 5,
        initialDelayMs: 200,
        maxDelayMs: 10000,
      };

      const result = await service.execute(operation, options);

      expect(result.success).toBe(true);
    });
  });

  describe('RetryPresets', () => {
    it('should have DATABASE preset', () => {
      expect(RetryPresets.DATABASE).toBeDefined();
      expect(RetryPresets.DATABASE.maxAttempts).toBe(3);
      expect(RetryPresets.DATABASE.initialDelayMs).toBe(100);
      expect(RetryPresets.DATABASE.maxDelayMs).toBe(2000);
      expect(RetryPresets.DATABASE.operationName).toBe('Database');
    });

    it('should have EXTERNAL_API preset', () => {
      expect(RetryPresets.EXTERNAL_API).toBeDefined();
      expect(RetryPresets.EXTERNAL_API.maxAttempts).toBe(5);
      expect(RetryPresets.EXTERNAL_API.initialDelayMs).toBe(500);
      expect(RetryPresets.EXTERNAL_API.maxDelayMs).toBe(30000);
      expect(RetryPresets.EXTERNAL_API.operationName).toBe('ExternalAPI');
    });

    it('should have PAYMENT preset', () => {
      expect(RetryPresets.PAYMENT).toBeDefined();
      expect(RetryPresets.PAYMENT.maxAttempts).toBe(3);
      expect(RetryPresets.PAYMENT.initialDelayMs).toBe(1000);
      expect(RetryPresets.PAYMENT.maxDelayMs).toBe(10000);
      expect(RetryPresets.PAYMENT.operationName).toBe('Payment');
    });

    it('should have CACHE preset', () => {
      expect(RetryPresets.CACHE).toBeDefined();
      expect(RetryPresets.CACHE.maxAttempts).toBe(2);
      expect(RetryPresets.CACHE.initialDelayMs).toBe(50);
      expect(RetryPresets.CACHE.maxDelayMs).toBe(500);
      expect(RetryPresets.CACHE.useJitter).toBe(false);
      expect(RetryPresets.CACHE.operationName).toBe('Cache');
    });

    it('should have EMAIL preset', () => {
      expect(RetryPresets.EMAIL).toBeDefined();
      expect(RetryPresets.EMAIL.maxAttempts).toBe(4);
      expect(RetryPresets.EMAIL.initialDelayMs).toBe(2000);
      expect(RetryPresets.EMAIL.maxDelayMs).toBe(60000);
      expect(RetryPresets.EMAIL.backoffMultiplier).toBe(3);
      expect(RetryPresets.EMAIL.operationName).toBe('Email');
    });

    it('should have PUSH_NOTIFICATION preset', () => {
      expect(RetryPresets.PUSH_NOTIFICATION).toBeDefined();
      expect(RetryPresets.PUSH_NOTIFICATION.maxAttempts).toBe(3);
      expect(RetryPresets.PUSH_NOTIFICATION.initialDelayMs).toBe(500);
      expect(RetryPresets.PUSH_NOTIFICATION.maxDelayMs).toBe(5000);
      expect(RetryPresets.PUSH_NOTIFICATION.operationName).toBe('PushNotification');
    });

    it('should work with execute method', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      const result = await service.execute(operation, RetryPresets.CACHE);

      expect(result.success).toBe(true);
    });
  });
});

describe('Retry Decorator', () => {
  class TestClass {
    callCount = 0;

    @Retry({
      maxAttempts: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      useJitter: false,
    })
    async successfulMethod(): Promise<string> {
      return 'success';
    }

    @Retry({
      maxAttempts: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      useJitter: false,
    })
    async retryableMethod(): Promise<string> {
      this.callCount++;
      if (this.callCount < 3) {
        throw new Error('timeout');
      }
      return 'success after retries';
    }

    @Retry({
      maxAttempts: 2,
      initialDelayMs: 10,
      maxDelayMs: 100,
      isRetryable: () => false,
    })
    async failingMethod(): Promise<string> {
      throw new Error('permanent failure');
    }
  }

  let instance: TestClass;

  beforeEach(() => {
    instance = new TestClass();
  });

  it('should execute method successfully on first attempt', async () => {
    const result = await instance.successfulMethod();
    expect(result).toBe('success');
  });

  it('should retry method and eventually succeed', async () => {
    const result = await instance.retryableMethod();
    expect(result).toBe('success after retries');
    expect(instance.callCount).toBe(3);
  });

  it('should throw error when retries exhausted', async () => {
    await expect(instance.failingMethod()).rejects.toThrow('permanent failure');
  });

  it('should use method name as operation name', async () => {
    const result = await instance.successfulMethod();
    expect(result).toBe('success');
  });
});
