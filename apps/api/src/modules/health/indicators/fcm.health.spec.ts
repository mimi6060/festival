/**
 * FcmHealthIndicator Unit Tests
 *
 * Tests for the FCM health check indicator including:
 * - Healthy state when FCM is enabled
 * - Not configured state when FCM is not configured
 * - Unhealthy state when FCM check fails
 * - Response time measurement
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FcmHealthIndicator, HealthIndicatorResult } from './fcm.health';
import { FcmService } from '../../notifications/services/fcm.service';

describe('FcmHealthIndicator', () => {
  let indicator: FcmHealthIndicator;
  let mockFcmService: jest.Mocked<Partial<FcmService>>;

  // ==========================================================================
  // FCM Enabled
  // ==========================================================================

  describe('with FCM enabled', () => {
    beforeEach(async () => {
      jest.clearAllMocks();

      mockFcmService = {
        isEnabled: jest.fn().mockReturnValue(true),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [FcmHealthIndicator, { provide: FcmService, useValue: mockFcmService }],
      }).compile();

      indicator = module.get<FcmHealthIndicator>(FcmHealthIndicator);
    });

    describe('constructor', () => {
      it('should be defined', () => {
        expect(indicator).toBeDefined();
      });
    });

    describe('isHealthy - healthy state', () => {
      it('should return up status when FCM is enabled', async () => {
        // Act
        const result = await indicator.isHealthy('fcm');

        // Assert
        expect(result).toHaveProperty('fcm');
        expect(result.fcm.status).toBe('up');
        expect(result.fcm).toHaveProperty('responseTime');
        expect(typeof result.fcm.responseTime).toBe('number');
        expect(result.fcm.responseTime).toBeGreaterThanOrEqual(0);
      });

      it('should use the provided key in the response', async () => {
        // Act
        const result = await indicator.isHealthy('customFcmKey');

        // Assert
        expect(result).toHaveProperty('customFcmKey');
        expect(result.customFcmKey.status).toBe('up');
      });

      it('should call fcmService.isEnabled()', async () => {
        // Act
        await indicator.isHealthy('fcm');

        // Assert
        expect(mockFcmService.isEnabled).toHaveBeenCalledTimes(1);
      });
    });

    describe('response structure', () => {
      it('should return HealthIndicatorResult type', async () => {
        // Act
        const result: HealthIndicatorResult = await indicator.isHealthy('fcm');

        // Assert
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });

      it('should include status and responseTime in healthy response', async () => {
        // Act
        const result = await indicator.isHealthy('fcm');

        // Assert
        expect(Object.keys(result.fcm)).toContain('status');
        expect(Object.keys(result.fcm)).toContain('responseTime');
        expect(result.fcm).not.toHaveProperty('error');
      });
    });
  });

  // ==========================================================================
  // FCM Not Configured
  // ==========================================================================

  describe('with FCM not configured', () => {
    beforeEach(async () => {
      jest.clearAllMocks();

      mockFcmService = {
        isEnabled: jest.fn().mockReturnValue(false),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [FcmHealthIndicator, { provide: FcmService, useValue: mockFcmService }],
      }).compile();

      indicator = module.get<FcmHealthIndicator>(FcmHealthIndicator);
    });

    describe('isHealthy - not configured state', () => {
      it('should return not_configured status when FCM is not enabled', async () => {
        // Act
        const result = await indicator.isHealthy('fcm');

        // Assert
        expect(result).toHaveProperty('fcm');
        expect(result.fcm.status).toBe('not_configured');
        expect(result.fcm).toHaveProperty('responseTime');
        expect(result.fcm).not.toHaveProperty('error');
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
      it('should include status and responseTime when not configured', async () => {
        // Act
        const result = await indicator.isHealthy('fcm');

        // Assert
        expect(Object.keys(result.fcm)).toContain('status');
        expect(Object.keys(result.fcm)).toContain('responseTime');
      });
    });
  });

  // ==========================================================================
  // FCM Check Fails (Unhealthy State)
  // ==========================================================================

  describe('when FCM check fails', () => {
    beforeEach(async () => {
      jest.clearAllMocks();

      mockFcmService = {
        isEnabled: jest.fn().mockImplementation(() => {
          throw new Error('FCM initialization error');
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [FcmHealthIndicator, { provide: FcmService, useValue: mockFcmService }],
      }).compile();

      indicator = module.get<FcmHealthIndicator>(FcmHealthIndicator);
    });

    describe('isHealthy - unhealthy state', () => {
      it('should return down status when FCM check throws error', async () => {
        // Act
        const result = await indicator.isHealthy('fcm');

        // Assert
        expect(result.fcm.status).toBe('down');
        expect(result.fcm.error).toBe('FCM initialization error');
        expect(result.fcm).toHaveProperty('responseTime');
      });

      it('should measure response time even on failure', async () => {
        // Act
        const result = await indicator.isHealthy('fcm');

        // Assert
        expect(result.fcm.status).toBe('down');
        expect(result.fcm.responseTime).toBeGreaterThanOrEqual(0);
      });
    });

    describe('response structure', () => {
      it('should include all required fields in unhealthy response', async () => {
        // Act
        const result = await indicator.isHealthy('fcm');

        // Assert
        expect(Object.keys(result.fcm)).toContain('status');
        expect(Object.keys(result.fcm)).toContain('responseTime');
        expect(Object.keys(result.fcm)).toContain('error');
      });
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle unknown error types gracefully', async () => {
      // Arrange
      mockFcmService = {
        isEnabled: jest.fn().mockImplementation(() => {
          throw 'string error';
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [FcmHealthIndicator, { provide: FcmService, useValue: mockFcmService }],
      }).compile();

      indicator = module.get<FcmHealthIndicator>(FcmHealthIndicator);

      // Act
      const result = await indicator.isHealthy('fcm');

      // Assert
      expect(result.fcm.status).toBe('down');
      expect(result.fcm.error).toBe('Unknown error');
    });

    it('should handle null/undefined from isEnabled gracefully', async () => {
      // Arrange
      mockFcmService = {
        isEnabled: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [FcmHealthIndicator, { provide: FcmService, useValue: mockFcmService }],
      }).compile();

      indicator = module.get<FcmHealthIndicator>(FcmHealthIndicator);

      // Act
      const result = await indicator.isHealthy('fcm');

      // Assert
      // undefined is falsy, so should be treated as not configured
      expect(result.fcm.status).toBe('not_configured');
    });
  });
});
