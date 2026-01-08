/**
 * PrismaHealthIndicator Unit Tests
 *
 * Tests for the database health check indicator including:
 * - Healthy state when database is connected
 * - Unhealthy state when database connection fails
 * - Response time measurement
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaHealthIndicator, HealthIndicatorResult } from './prisma.health';
import { PrismaService } from '../../prisma/prisma.service';

describe('PrismaHealthIndicator', () => {
  let indicator: PrismaHealthIndicator;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaHealthIndicator,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    indicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
    prismaService = module.get(PrismaService);
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should be defined', () => {
      expect(indicator).toBeDefined();
    });
  });

  // ==========================================================================
  // isHealthy() - Healthy State Tests
  // ==========================================================================

  describe('isHealthy - healthy state', () => {
    it('should return up status when database is connected', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      // Act
      const result = await indicator.isHealthy('database');

      // Assert
      expect(result).toHaveProperty('database');
      expect(result.database.status).toBe('up');
      expect(result.database).toHaveProperty('responseTime');
      expect(typeof result.database.responseTime).toBe('number');
      expect(result.database.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should use the provided key in the response', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      // Act
      const result = await indicator.isHealthy('customKey');

      // Assert
      expect(result).toHaveProperty('customKey');
      expect(result.customKey.status).toBe('up');
    });

    it('should measure response time correctly', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return [{ '?column?': 1 }];
      });

      // Act
      const result = await indicator.isHealthy('database');

      // Assert
      expect(result.database.responseTime).toBeGreaterThanOrEqual(10);
    });
  });

  // ==========================================================================
  // isHealthy() - Unhealthy State Tests
  // ==========================================================================

  describe('isHealthy - unhealthy state', () => {
    it('should return down status when database connection fails', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      // Act
      const result = await indicator.isHealthy('database');

      // Assert
      expect(result.database.status).toBe('down');
      expect(result.database.error).toBe('Connection refused');
      expect(result.database).toHaveProperty('responseTime');
    });

    it('should return down status when database times out', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection timeout'));

      // Act
      const result = await indicator.isHealthy('database');

      // Assert
      expect(result.database.status).toBe('down');
      expect(result.database.error).toBe('Connection timeout');
    });

    it('should return down status when database credentials are invalid', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error('password authentication failed')
      );

      // Act
      const result = await indicator.isHealthy('database');

      // Assert
      expect(result.database.status).toBe('down');
      expect(result.database.error).toBe('password authentication failed');
    });

    it('should handle unknown error types gracefully', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockRejectedValue('string error');

      // Act
      const result = await indicator.isHealthy('database');

      // Assert
      expect(result.database.status).toBe('down');
      expect(result.database.error).toBe('Unknown error');
    });

    it('should measure response time even on failure', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        throw new Error('Connection failed');
      });

      // Act
      const result = await indicator.isHealthy('database');

      // Assert
      expect(result.database.status).toBe('down');
      expect(result.database.responseTime).toBeGreaterThanOrEqual(5);
    });
  });

  // ==========================================================================
  // Response Structure Tests
  // ==========================================================================

  describe('response structure', () => {
    it('should return HealthIndicatorResult type', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      // Act
      const result: HealthIndicatorResult = await indicator.isHealthy('database');

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should include all required fields in healthy response', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      // Act
      const result = await indicator.isHealthy('database');

      // Assert
      expect(Object.keys(result.database)).toContain('status');
      expect(Object.keys(result.database)).toContain('responseTime');
    });

    it('should include all required fields in unhealthy response', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await indicator.isHealthy('database');

      // Assert
      expect(Object.keys(result.database)).toContain('status');
      expect(Object.keys(result.database)).toContain('responseTime');
      expect(Object.keys(result.database)).toContain('error');
    });
  });
});
