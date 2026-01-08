/**
 * StripeHealthIndicator Unit Tests
 *
 * Tests for the Stripe health check indicator including:
 * - Healthy state when Stripe API is reachable
 * - Not configured state when Stripe key is missing
 * - Unhealthy state when Stripe API call fails
 * - Response time measurement
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StripeHealthIndicator, HealthIndicatorResult } from './stripe.health';

describe('StripeHealthIndicator', () => {
  let indicator: StripeHealthIndicator;

  const mockConfigService = {
    get: jest.fn(),
  };

  // ==========================================================================
  // Without Stripe Configured
  // ==========================================================================

  describe('without Stripe configured', () => {
    beforeEach(async () => {
      jest.clearAllMocks();

      mockConfigService.get.mockReturnValue(undefined);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StripeHealthIndicator,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      indicator = module.get<StripeHealthIndicator>(StripeHealthIndicator);
    });

    describe('constructor', () => {
      it('should be defined', () => {
        expect(indicator).toBeDefined();
      });
    });

    describe('isHealthy - not configured state', () => {
      it('should return not_configured status when Stripe key is missing', async () => {
        // Act
        const result = await indicator.isHealthy('stripe');

        // Assert
        expect(result).toHaveProperty('stripe');
        expect(result.stripe.status).toBe('not_configured');
        expect(result.stripe).not.toHaveProperty('responseTime');
        expect(result.stripe).not.toHaveProperty('error');
      });

      it('should use the provided key in not_configured response', async () => {
        // Act
        const result = await indicator.isHealthy('customKey');

        // Assert
        expect(result).toHaveProperty('customKey');
        expect(result.customKey.status).toBe('not_configured');
      });
    });

    describe('response structure', () => {
      it('should only contain status field when not configured', async () => {
        // Act
        const result = await indicator.isHealthy('stripe');

        // Assert
        expect(Object.keys(result.stripe)).toEqual(['status']);
      });
    });
  });

  // ==========================================================================
  // With Stripe Configured (using a custom mock Stripe class)
  // ==========================================================================

  describe('with Stripe configured', () => {
    let mockBalanceRetrieve: jest.Mock;

    beforeEach(async () => {
      jest.clearAllMocks();
      jest.useFakeTimers();

      mockConfigService.get.mockReturnValue('sk_test_mock_secret_key');
      mockBalanceRetrieve = jest.fn();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StripeHealthIndicator,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      indicator = module.get<StripeHealthIndicator>(StripeHealthIndicator);

      // Directly set up the mock on the internal stripe instance
      // This is necessary because we can't easily mock the Stripe constructor
      const stripeInstance = (indicator as any).stripe;
      if (stripeInstance) {
        stripeInstance.balance = {
          retrieve: mockBalanceRetrieve,
        };
      }
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('constructor', () => {
      it('should be defined', () => {
        expect(indicator).toBeDefined();
      });

      it('should initialize stripe when secret key is configured', () => {
        expect((indicator as any).stripe).toBeDefined();
        expect((indicator as any).isConfigured).toBe(true);
      });
    });

    describe('isHealthy - healthy state', () => {
      it('should return up status when Stripe API is reachable', async () => {
        // Arrange
        mockBalanceRetrieve.mockResolvedValue({
          available: [{ amount: 1000, currency: 'usd' }],
          pending: [{ amount: 0, currency: 'usd' }],
        });

        // Act
        const resultPromise = indicator.isHealthy('stripe');
        await jest.runAllTimersAsync();
        const result = await resultPromise;

        // Assert
        expect(result).toHaveProperty('stripe');
        expect(result.stripe.status).toBe('up');
        expect(result.stripe).toHaveProperty('responseTime');
        expect(typeof result.stripe.responseTime).toBe('number');
        expect(result.stripe.responseTime).toBeGreaterThanOrEqual(0);
      });

      it('should use the provided key in the response', async () => {
        // Arrange
        mockBalanceRetrieve.mockResolvedValue({
          available: [{ amount: 1000, currency: 'usd' }],
        });

        // Act
        const resultPromise = indicator.isHealthy('customStripeKey');
        await jest.runAllTimersAsync();
        const result = await resultPromise;

        // Assert
        expect(result).toHaveProperty('customStripeKey');
        expect(result.customStripeKey.status).toBe('up');
      });
    });

    describe('isHealthy - unhealthy state', () => {
      it('should return down status when Stripe API call fails', async () => {
        // Arrange
        mockBalanceRetrieve.mockRejectedValue(new Error('Invalid API Key'));

        // Act
        const resultPromise = indicator.isHealthy('stripe');
        await jest.runAllTimersAsync();
        const result = await resultPromise;

        // Assert
        expect(result.stripe.status).toBe('down');
        expect(result.stripe.error).toBe('Invalid API Key');
        expect(result.stripe).toHaveProperty('responseTime');
      });

      it('should return down status when Stripe API times out', async () => {
        // Arrange - mock never resolves, so the internal 5s timeout should trigger
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        mockBalanceRetrieve.mockImplementation(() => new Promise(() => {}));

        // Act
        const resultPromise = indicator.isHealthy('stripe');
        // Advance timers by 5 seconds to trigger the timeout
        jest.advanceTimersByTime(5000);
        await jest.runAllTimersAsync();
        const result = await resultPromise;

        // Assert
        expect(result.stripe.status).toBe('down');
        expect(result.stripe.error).toContain('timeout');
      });

      it('should return down status when Stripe rate limit is exceeded', async () => {
        // Arrange
        mockBalanceRetrieve.mockRejectedValue(new Error('Rate limit exceeded'));

        // Act
        const resultPromise = indicator.isHealthy('stripe');
        await jest.runAllTimersAsync();
        const result = await resultPromise;

        // Assert
        expect(result.stripe.status).toBe('down');
        expect(result.stripe.error).toBe('Rate limit exceeded');
      });

      it('should handle unknown error types gracefully', async () => {
        // Arrange
        mockBalanceRetrieve.mockRejectedValue('string error');

        // Act
        const resultPromise = indicator.isHealthy('stripe');
        await jest.runAllTimersAsync();
        const result = await resultPromise;

        // Assert
        expect(result.stripe.status).toBe('down');
        expect(result.stripe.error).toBe('Unknown error');
      });

      it('should measure response time even on failure', async () => {
        // Arrange
        mockBalanceRetrieve.mockRejectedValue(new Error('API Error'));

        // Act
        const resultPromise = indicator.isHealthy('stripe');
        await jest.runAllTimersAsync();
        const result = await resultPromise;

        // Assert
        expect(result.stripe.status).toBe('down');
        expect(result.stripe.responseTime).toBeGreaterThanOrEqual(0);
      });
    });

    describe('response structure', () => {
      it('should return HealthIndicatorResult type', async () => {
        // Arrange
        mockBalanceRetrieve.mockResolvedValue({
          available: [{ amount: 1000, currency: 'usd' }],
        });

        // Act
        const resultPromise = indicator.isHealthy('stripe');
        await jest.runAllTimersAsync();
        const result: HealthIndicatorResult = await resultPromise;

        // Assert
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });

      it('should include all required fields in healthy response', async () => {
        // Arrange
        mockBalanceRetrieve.mockResolvedValue({
          available: [{ amount: 1000, currency: 'usd' }],
        });

        // Act
        const resultPromise = indicator.isHealthy('stripe');
        await jest.runAllTimersAsync();
        const result = await resultPromise;

        // Assert
        expect(Object.keys(result.stripe)).toContain('status');
        expect(Object.keys(result.stripe)).toContain('responseTime');
      });

      it('should include all required fields in unhealthy response', async () => {
        // Arrange
        mockBalanceRetrieve.mockRejectedValue(new Error('Connection failed'));

        // Act
        const resultPromise = indicator.isHealthy('stripe');
        await jest.runAllTimersAsync();
        const result = await resultPromise;

        // Assert
        expect(Object.keys(result.stripe)).toContain('status');
        expect(Object.keys(result.stripe)).toContain('responseTime');
        expect(Object.keys(result.stripe)).toContain('error');
      });
    });

    describe('edge cases', () => {
      it('should handle network errors', async () => {
        // Arrange
        mockBalanceRetrieve.mockRejectedValue(new Error('ECONNREFUSED'));

        // Act
        const resultPromise = indicator.isHealthy('stripe');
        await jest.runAllTimersAsync();
        const result = await resultPromise;

        // Assert
        expect(result.stripe.status).toBe('down');
        expect(result.stripe.error).toBe('ECONNREFUSED');
      });

      it('should handle Stripe service unavailable', async () => {
        // Arrange
        mockBalanceRetrieve.mockRejectedValue(
          new Error('Service temporarily unavailable')
        );

        // Act
        const resultPromise = indicator.isHealthy('stripe');
        await jest.runAllTimersAsync();
        const result = await resultPromise;

        // Assert
        expect(result.stripe.status).toBe('down');
        expect(result.stripe.error).toBe('Service temporarily unavailable');
      });
    });
  });
});
