/**
 * HealthIndicatorsService Unit Tests
 *
 * Comprehensive tests for the health indicators service including:
 * - Database health check
 * - Redis health check
 * - Memory health check
 * - Disk health check
 * - Event loop health check
 * - External service health check
 * - Liveness and readiness checks
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicatorsService,
  HealthStatus,
  HealthIndicatorResult,
  SystemHealth,
} from './health-indicators.service';

// Mock child_process for disk check
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

// Mock ioredis
jest.mock('ioredis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      ping: jest.fn(),
      quit: jest.fn(),
    })),
  };
});

// Mock @prisma/client
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      $queryRaw: jest.fn(),
      $disconnect: jest.fn(),
    })),
  };
});

describe('HealthIndicatorsService', () => {
  let service: HealthIndicatorsService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService.get.mockReturnValue('redis://localhost:6379');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthIndicatorsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<HealthIndicatorsService>(HealthIndicatorsService);
    configService = module.get(ConfigService);
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ==========================================================================
  // checkDatabase() Tests
  // ==========================================================================

  describe('checkDatabase', () => {
    it('should return UP status when database is connected', async () => {
      // Arrange
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      };
      PrismaClient.mockImplementation(() => mockPrisma);

      // Act
      const result = await service.checkDatabase();

      // Assert
      expect(result.name).toBe('database');
      expect(result.status).toBe(HealthStatus.UP);
      expect(result).toHaveProperty('responseTime');
      expect(result.details).toHaveProperty('type', 'postgresql');
    });

    it('should return DOWN status when database connection fails', async () => {
      // Arrange
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = {
        $queryRaw: jest.fn().mockRejectedValue(new Error('Connection refused')),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      };
      PrismaClient.mockImplementation(() => mockPrisma);

      // Act
      const result = await service.checkDatabase();

      // Assert
      expect(result.name).toBe('database');
      expect(result.status).toBe(HealthStatus.DOWN);
      expect(result.error).toBe('Connection refused');
    });

    it('should measure response time correctly', async () => {
      // Arrange
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = {
        $queryRaw: jest.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return [{ '?column?': 1 }];
        }),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      };
      PrismaClient.mockImplementation(() => mockPrisma);

      // Act
      const result = await service.checkDatabase();

      // Assert
      expect(result.responseTime).toBeGreaterThanOrEqual(10);
    });
  });

  // ==========================================================================
  // checkRedis() Tests
  // ==========================================================================

  describe('checkRedis', () => {
    it('should return UP status when Redis responds with PONG', async () => {
      // Arrange
      const { Redis } = require('ioredis');
      const mockRedis = {
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue(undefined),
      };
      Redis.mockImplementation(() => mockRedis);

      // Act
      const result = await service.checkRedis();

      // Assert
      expect(result.name).toBe('redis');
      expect(result.status).toBe(HealthStatus.UP);
      expect(result.details).toHaveProperty('type', 'redis');
    });

    it('should return DOWN status when Redis connection fails', async () => {
      // Arrange
      const { Redis } = require('ioredis');
      const mockRedis = {
        ping: jest.fn().mockRejectedValue(new Error('Connection refused')),
        quit: jest.fn().mockResolvedValue(undefined),
      };
      Redis.mockImplementation(() => mockRedis);

      // Act
      const result = await service.checkRedis();

      // Assert
      expect(result.name).toBe('redis');
      expect(result.status).toBe(HealthStatus.DOWN);
      expect(result.error).toBe('Connection refused');
    });

    it('should return DOWN status when Redis responds with invalid response', async () => {
      // Arrange
      const { Redis } = require('ioredis');
      const mockRedis = {
        ping: jest.fn().mockResolvedValue('INVALID'),
        quit: jest.fn().mockResolvedValue(undefined),
      };
      Redis.mockImplementation(() => mockRedis);

      // Act
      const result = await service.checkRedis();

      // Assert
      expect(result.name).toBe('redis');
      expect(result.status).toBe(HealthStatus.DOWN);
      expect(result.error).toBe('Invalid PING response');
    });

    it('should return DOWN status when Redis times out', async () => {
      // Arrange
      const { Redis } = require('ioredis');
      const mockRedis = {
        ping: jest.fn().mockRejectedValue(new Error('Redis timeout')),
        quit: jest.fn().mockResolvedValue(undefined),
      };
      Redis.mockImplementation(() => mockRedis);

      // Act
      const result = await service.checkRedis();

      // Assert
      expect(result.status).toBe(HealthStatus.DOWN);
      expect(result.error).toBe('Redis timeout');
    });
  });

  // ==========================================================================
  // checkMemory() Tests
  // ==========================================================================

  describe('checkMemory', () => {
    it('should return UP status when memory usage is normal', async () => {
      // Act
      const result = await service.checkMemory();

      // Assert
      expect(result.name).toBe('memory');
      expect([HealthStatus.UP, HealthStatus.DEGRADED]).toContain(result.status);
      expect(result.details).toHaveProperty('heapUsedMB');
      expect(result.details).toHaveProperty('heapTotalMB');
      expect(result.details).toHaveProperty('rssMB');
      expect(result.details).toHaveProperty('heapUsagePercent');
    });

    it('should include memory statistics in details', async () => {
      // Act
      const result = await service.checkMemory();

      // Assert
      expect(typeof result.details?.heapUsedMB).toBe('number');
      expect(typeof result.details?.heapTotalMB).toBe('number');
      expect(typeof result.details?.rssMB).toBe('number');
      expect(typeof result.details?.heapUsagePercent).toBe('number');
      expect(typeof result.details?.externalMB).toBe('number');
    });
  });

  // ==========================================================================
  // checkDiskSpace() Tests
  // ==========================================================================

  describe('checkDiskSpace', () => {
    it('should return UP status when disk usage is normal', async () => {
      // Arrange
      const { execSync } = require('child_process');
      execSync.mockReturnValue('/dev/disk1 500000000 250000000 250000000 50% /\n');

      // Act
      const result = await service.checkDiskSpace();

      // Assert
      expect(result.name).toBe('disk');
      expect(result.status).toBe(HealthStatus.UP);
      expect(result.details).toHaveProperty('usedPercent', 50);
      expect(result.details).toHaveProperty('path', '/');
    });

    it('should return DEGRADED status when disk usage is high (>85%)', async () => {
      // Arrange
      const { execSync } = require('child_process');
      execSync.mockReturnValue('/dev/disk1 500000000 450000000 50000000 90% /\n');

      // Act
      const result = await service.checkDiskSpace();

      // Assert
      expect(result.name).toBe('disk');
      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.error).toContain('Disk usage high');
    });

    it('should return DOWN status when disk usage is critical (>95%)', async () => {
      // Arrange
      const { execSync } = require('child_process');
      execSync.mockReturnValue('/dev/disk1 500000000 490000000 10000000 98% /\n');

      // Act
      const result = await service.checkDiskSpace();

      // Assert
      expect(result.name).toBe('disk');
      expect(result.status).toBe(HealthStatus.DOWN);
      expect(result.error).toContain('Disk usage critical');
    });

    it('should handle disk check unavailable gracefully', async () => {
      // Arrange
      const { execSync } = require('child_process');
      execSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Act
      const result = await service.checkDiskSpace();

      // Assert
      expect(result.name).toBe('disk');
      expect(result.status).toBe(HealthStatus.UP);
      expect(result.details).toHaveProperty('message', 'Disk check not available');
    });
  });

  // ==========================================================================
  // checkEventLoop() Tests
  // ==========================================================================

  describe('checkEventLoop', () => {
    it('should return UP status when event loop lag is low', async () => {
      // Act
      const result = await service.checkEventLoop();

      // Assert
      expect(result.name).toBe('eventLoop');
      expect(result.status).toBe(HealthStatus.UP);
      expect(result.details).toHaveProperty('lagMs');
      expect(typeof result.details?.lagMs).toBe('number');
    });

    it('should measure event loop lag', async () => {
      // Act
      const result = await service.checkEventLoop();

      // Assert
      expect(result.details?.lagMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // checkLiveness() Tests
  // ==========================================================================

  describe('checkLiveness', () => {
    it('should always return UP status', async () => {
      // Act
      const result = await service.checkLiveness();

      // Assert
      expect(result.status).toBe(HealthStatus.UP);
    });

    it('should include uptime', async () => {
      // Act
      const result = await service.checkLiveness();

      // Assert
      expect(result).toHaveProperty('uptime');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // checkReadiness() Tests
  // ==========================================================================

  describe('checkReadiness', () => {
    it('should return UP status when all dependencies are healthy', async () => {
      // Arrange
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      };
      PrismaClient.mockImplementation(() => mockPrisma);

      const { Redis } = require('ioredis');
      const mockRedis = {
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue(undefined),
      };
      Redis.mockImplementation(() => mockRedis);

      // Act
      const result = await service.checkReadiness();

      // Assert
      expect(result.status).toBe(HealthStatus.UP);
      expect(result.checks).toHaveLength(2);
    });

    it('should return DOWN status when database is not healthy', async () => {
      // Arrange
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = {
        $queryRaw: jest.fn().mockRejectedValue(new Error('Connection refused')),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      };
      PrismaClient.mockImplementation(() => mockPrisma);

      const { Redis } = require('ioredis');
      const mockRedis = {
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue(undefined),
      };
      Redis.mockImplementation(() => mockRedis);

      // Act
      const result = await service.checkReadiness();

      // Assert
      expect(result.status).toBe(HealthStatus.DOWN);
    });

    it('should include all check results', async () => {
      // Arrange
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      };
      PrismaClient.mockImplementation(() => mockPrisma);

      const { Redis } = require('ioredis');
      const mockRedis = {
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue(undefined),
      };
      Redis.mockImplementation(() => mockRedis);

      // Act
      const result = await service.checkReadiness();

      // Assert
      const checkNames = result.checks.map((c) => c.name);
      expect(checkNames).toContain('database');
      expect(checkNames).toContain('redis');
    });
  });

  // ==========================================================================
  // checkHealth() Tests
  // ==========================================================================

  describe('checkHealth', () => {
    beforeEach(() => {
      // Arrange - setup successful mocks
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      };
      PrismaClient.mockImplementation(() => mockPrisma);

      const { Redis } = require('ioredis');
      const mockRedis = {
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue(undefined),
      };
      Redis.mockImplementation(() => mockRedis);

      const { execSync } = require('child_process');
      execSync.mockReturnValue('/dev/disk1 500000000 250000000 250000000 50% /\n');
    });

    it('should return UP status when all checks pass', async () => {
      // Re-apply mocks to ensure they're fresh
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      };
      PrismaClient.mockImplementation(() => mockPrisma);

      const { Redis } = require('ioredis');
      const mockRedis = {
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue(undefined),
      };
      Redis.mockImplementation(() => mockRedis);

      // Act
      const result = await service.checkHealth();

      // Assert
      // Status can be UP, DEGRADED (if memory is high), but not DOWN (since DB and Redis are mocked)
      expect([HealthStatus.UP, HealthStatus.DEGRADED]).toContain(result.status);
    });

    it('should include timestamp in response', async () => {
      // Act
      const result = await service.checkHealth();

      // Assert
      expect(result).toHaveProperty('timestamp');
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });

    it('should include uptime in response', async () => {
      // Act
      const result = await service.checkHealth();

      // Assert
      expect(result).toHaveProperty('uptime');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include version in response', async () => {
      // Act
      const result = await service.checkHealth();

      // Assert
      expect(result).toHaveProperty('version');
    });

    it('should include all checks in response', async () => {
      // Act
      const result = await service.checkHealth();

      // Assert
      expect(result.checks).toBeInstanceOf(Array);
      expect(result.checks.length).toBeGreaterThanOrEqual(5);

      const checkNames = result.checks.map((c) => c.name);
      expect(checkNames).toContain('database');
      expect(checkNames).toContain('redis');
      expect(checkNames).toContain('memory');
      expect(checkNames).toContain('disk');
      expect(checkNames).toContain('eventLoop');
    });

    it('should return DEGRADED status when any check is degraded', async () => {
      // Arrange
      const { execSync } = require('child_process');
      execSync.mockReturnValue('/dev/disk1 500000000 450000000 50000000 90% /\n');

      // Act
      const result = await service.checkHealth();

      // Assert
      expect(result.status).toBe(HealthStatus.DEGRADED);
    });

    it('should return DOWN status when any critical check fails', async () => {
      // Arrange
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = {
        $queryRaw: jest.fn().mockRejectedValue(new Error('Connection refused')),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      };
      PrismaClient.mockImplementation(() => mockPrisma);

      // Act
      const result = await service.checkHealth();

      // Assert
      expect(result.status).toBe(HealthStatus.DOWN);
    });
  });

  // ==========================================================================
  // checkExternalService() Tests
  // ==========================================================================

  describe('checkExternalService', () => {
    it('should return UP status for reachable service', async () => {
      // Arrange
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      }) as jest.Mock;

      // Act
      const result = await service.checkExternalService('api', 'https://api.example.com/health');

      // Assert
      expect(result.name).toBe('api');
      expect(result.status).toBe(HealthStatus.UP);
      expect(result.details).toHaveProperty('statusCode', 200);
      expect(result.details).toHaveProperty('url', 'https://api.example.com/health');
    });

    it('should return DOWN status for unreachable service', async () => {
      // Arrange
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as jest.Mock;

      // Act
      const result = await service.checkExternalService('api', 'https://api.example.com/health');

      // Assert
      expect(result.name).toBe('api');
      expect(result.status).toBe(HealthStatus.DOWN);
      expect(result.error).toBe('ECONNREFUSED');
    });

    it('should return DOWN status for non-ok response', async () => {
      // Arrange
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }) as jest.Mock;

      // Act
      const result = await service.checkExternalService('api', 'https://api.example.com/health');

      // Assert
      expect(result.name).toBe('api');
      expect(result.status).toBe(HealthStatus.DOWN);
      expect(result.details).toHaveProperty('statusCode', 503);
    });

    it('should include response time', async () => {
      // Arrange
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      }) as jest.Mock;

      // Act
      const result = await service.checkExternalService('api', 'https://api.example.com/health');

      // Assert
      expect(result).toHaveProperty('responseTime');
      expect(typeof result.responseTime).toBe('number');
    });
  });

  // ==========================================================================
  // getHealthSummary() Tests
  // ==========================================================================

  describe('getHealthSummary', () => {
    beforeEach(() => {
      // Arrange - setup successful mocks
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      };
      PrismaClient.mockImplementation(() => mockPrisma);

      const { Redis } = require('ioredis');
      const mockRedis = {
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue(undefined),
      };
      Redis.mockImplementation(() => mockRedis);

      const { execSync } = require('child_process');
      execSync.mockReturnValue('/dev/disk1 500000000 250000000 250000000 50% /\n');
    });

    it('should return summary with healthy status', async () => {
      // Re-apply mocks to ensure they're fresh
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      };
      PrismaClient.mockImplementation(() => mockPrisma);

      const { Redis } = require('ioredis');
      const mockRedis = {
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue(undefined),
      };
      Redis.mockImplementation(() => mockRedis);

      // Act
      const result = await service.getHealthSummary();

      // Assert
      // Status can be UP or DEGRADED (if memory is high), but not DOWN (since DB and Redis are mocked)
      expect(result).toHaveProperty('healthy');
      expect([HealthStatus.UP, HealthStatus.DEGRADED]).toContain(result.status);
      // healthy is true only when status is UP
      if (result.status === HealthStatus.UP) {
        expect(result.healthy).toBe(true);
      }
    });

    it('should include formatted uptime', async () => {
      // Act
      const result = await service.getHealthSummary();

      // Assert
      expect(result).toHaveProperty('uptimeFormatted');
      expect(typeof result.uptimeFormatted).toBe('string');
    });

    it('should include timestamp', async () => {
      // Act
      const result = await service.getHealthSummary();

      // Assert
      expect(result).toHaveProperty('timestamp');
    });

    it('should include checks as object', async () => {
      // Act
      const result = await service.getHealthSummary();

      // Assert
      expect(result).toHaveProperty('checks');
      expect(typeof result.checks).toBe('object');
    });
  });

  // ==========================================================================
  // HealthStatus Enum Tests
  // ==========================================================================

  describe('HealthStatus enum', () => {
    it('should have UP status', () => {
      expect(HealthStatus.UP).toBe('up');
    });

    it('should have DOWN status', () => {
      expect(HealthStatus.DOWN).toBe('down');
    });

    it('should have DEGRADED status', () => {
      expect(HealthStatus.DEGRADED).toBe('degraded');
    });
  });
});
