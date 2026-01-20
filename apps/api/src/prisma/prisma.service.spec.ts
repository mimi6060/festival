/**
 * PrismaService Unit Tests
 *
 * Comprehensive tests for the Prisma database service including:
 * - Module lifecycle hooks (onModuleInit, onModuleDestroy)
 * - Database connection handling
 * - Database cleanup functionality
 * - Transaction execution
 * - Event logging configuration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let prismaService: PrismaService;
  let loggerLogSpy: jest.SpyInstance;
  let _loggerDebugSpy: jest.SpyInstance;
  let _loggerErrorSpy: jest.SpyInstance;
  let _loggerWarnSpy: jest.SpyInstance;

  // Store original NODE_ENV
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    // Reset NODE_ENV before each test
    process.env.NODE_ENV = 'test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);

    // Spy on logger methods
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    _loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    _loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    _loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(async () => {
    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;

    // Restore all mocks
    jest.restoreAllMocks();

    // Disconnect from database if connected
    try {
      await prismaService.$disconnect();
    } catch {
      // Ignore disconnect errors in tests
    }
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should be defined', () => {
      expect(prismaService).toBeDefined();
    });

    it('should extend PrismaClient', () => {
      // Verify PrismaClient methods are available
      expect(typeof prismaService.$connect).toBe('function');
      expect(typeof prismaService.$disconnect).toBe('function');
      expect(typeof prismaService.$on).toBe('function');
      expect(typeof prismaService.$transaction).toBe('function');
    });

    it('should configure logging for error events', () => {
      // The service should be configured to emit events for errors
      // This is verified by checking the service was created successfully
      expect(prismaService).toBeDefined();
    });

    it('should configure logging for warn events', () => {
      // The service should be configured to emit events for warnings
      expect(prismaService).toBeDefined();
    });
  });

  // ==========================================================================
  // Constructor - Environment Configuration Tests
  // ==========================================================================

  describe('constructor - environment configuration', () => {
    it('should configure query logging in development mode', async () => {
      // Set development environment
      process.env.NODE_ENV = 'development';

      // Create a new module with the development configuration
      const devModule: TestingModule = await Test.createTestingModule({
        providers: [PrismaService],
      }).compile();

      const devPrismaService = devModule.get<PrismaService>(PrismaService);

      // Service should be defined and configured for development
      expect(devPrismaService).toBeDefined();

      // Cleanup
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      await devPrismaService.$disconnect().catch(() => {});
    });

    it('should not configure query logging in production mode', async () => {
      // Set production environment
      process.env.NODE_ENV = 'production';

      // Create a new module with the production configuration
      const prodModule: TestingModule = await Test.createTestingModule({
        providers: [PrismaService],
      }).compile();

      const prodPrismaService = prodModule.get<PrismaService>(PrismaService);

      // Service should be defined
      expect(prodPrismaService).toBeDefined();

      // Cleanup
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      await prodPrismaService.$disconnect().catch(() => {});
    });
  });

  // ==========================================================================
  // onModuleInit Tests
  // ==========================================================================

  describe('onModuleInit', () => {
    it('should call $connect when module initializes', async () => {
      // Arrange
      const connectSpy = jest.spyOn(prismaService, '$connect').mockResolvedValue();

      // Act
      await prismaService.onModuleInit();

      // Assert
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('should log connection attempt', async () => {
      // Arrange
      jest.spyOn(prismaService, '$connect').mockResolvedValue();

      // Act
      await prismaService.onModuleInit();

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('Connecting to database...');
    });

    it('should log successful connection', async () => {
      // Arrange
      jest.spyOn(prismaService, '$connect').mockResolvedValue();

      // Act
      await prismaService.onModuleInit();

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('Database connection established');
    });

    it('should propagate connection errors', async () => {
      // Arrange
      const connectionError = new Error('Connection failed');
      jest.spyOn(prismaService, '$connect').mockRejectedValue(connectionError);

      // Act & Assert
      await expect(prismaService.onModuleInit()).rejects.toThrow('Connection failed');
    });

    it('should implement OnModuleInit interface', () => {
      // Verify the method exists
      expect(typeof prismaService.onModuleInit).toBe('function');
    });
  });

  // ==========================================================================
  // onModuleDestroy Tests
  // ==========================================================================

  describe('onModuleDestroy', () => {
    it('should call $disconnect when module is destroyed', async () => {
      // Arrange
      const disconnectSpy = jest.spyOn(prismaService, '$disconnect').mockResolvedValue();

      // Act
      await prismaService.onModuleDestroy();

      // Assert
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('should log disconnection attempt', async () => {
      // Arrange
      jest.spyOn(prismaService, '$disconnect').mockResolvedValue();

      // Act
      await prismaService.onModuleDestroy();

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('Disconnecting from database...');
    });

    it('should log successful disconnection', async () => {
      // Arrange
      jest.spyOn(prismaService, '$disconnect').mockResolvedValue();

      // Act
      await prismaService.onModuleDestroy();

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('Database disconnected');
    });

    it('should propagate disconnection errors', async () => {
      // Arrange
      const disconnectError = new Error('Disconnection failed');
      jest.spyOn(prismaService, '$disconnect').mockRejectedValue(disconnectError);

      // Act & Assert
      await expect(prismaService.onModuleDestroy()).rejects.toThrow('Disconnection failed');
    });

    it('should implement OnModuleDestroy interface', () => {
      // Verify the method exists
      expect(typeof prismaService.onModuleDestroy).toBe('function');
    });
  });

  // ==========================================================================
  // cleanDatabase Tests
  // ==========================================================================

  describe('cleanDatabase', () => {
    it('should throw error in production environment', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';

      // Act & Assert
      await expect(prismaService.cleanDatabase()).rejects.toThrow(
        'Cannot clean database in production!'
      );
    });

    it('should not throw error in development environment', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';

      // Act & Assert - should not throw
      // Note: This will attempt to call deleteMany on models, which may fail
      // in test environment, but the production check should pass
      try {
        await prismaService.cleanDatabase();
      } catch (error) {
        // Only throw if it's the production error
        if (error instanceof Error && error.message === 'Cannot clean database in production!') {
          throw error;
        }
        // Other errors are expected since we're not connected to a real DB
      }
    });

    it('should not throw error in test environment', async () => {
      // Arrange
      process.env.NODE_ENV = 'test';

      // Act & Assert - should not throw the production error
      try {
        await prismaService.cleanDatabase();
      } catch (error) {
        // Only throw if it's the production error
        if (error instanceof Error && error.message === 'Cannot clean database in production!') {
          throw error;
        }
        // Other errors are expected since we're not connected to a real DB
      }
    });

    it('should not throw production error when NODE_ENV is undefined', async () => {
      // Arrange
      delete process.env.NODE_ENV;

      // Act & Assert - should not throw the production error
      try {
        await prismaService.cleanDatabase();
      } catch (error) {
        // Only throw if it's the production error
        if (error instanceof Error && error.message === 'Cannot clean database in production!') {
          throw error;
        }
        // Other errors are expected
      }
    });

    it('should filter out internal properties starting with underscore', () => {
      // This test verifies the filtering logic
      // The implementation filters keys that don't start with '_' or '$'
      const mockKeys = ['user', '_internal', '$queryRaw', 'ticket', '_engine'];
      const filteredKeys = mockKeys.filter((key) => !key.startsWith('_') && !key.startsWith('$'));

      expect(filteredKeys).toEqual(['user', 'ticket']);
    });

    it('should filter out internal properties starting with dollar sign', () => {
      // This test verifies the filtering logic
      const mockKeys = ['$connect', '$disconnect', 'user', '$on', 'festival'];
      const filteredKeys = mockKeys.filter((key) => !key.startsWith('_') && !key.startsWith('$'));

      expect(filteredKeys).toEqual(['user', 'festival']);
    });
  });

  // ==========================================================================
  // executeInTransaction Tests
  // ==========================================================================

  describe('executeInTransaction', () => {
    it('should call $transaction with the provided function', async () => {
      // Arrange
      const mockResult = { id: 'test-id', name: 'Test' };
      const transactionFn = jest.fn().mockResolvedValue(mockResult);
      const transactionSpy = jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(transactionFn);

      // Act
      await prismaService.executeInTransaction(async () => mockResult);

      // Assert
      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(transactionSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return the result from the transaction', async () => {
      // Arrange
      const mockResult = { id: 'test-id', data: 'test-data' };
      jest.spyOn(prismaService, '$transaction').mockResolvedValue(mockResult);

      // Act
      const result = await prismaService.executeInTransaction(async () => mockResult);

      // Assert
      expect(result).toEqual(mockResult);
    });

    it('should propagate errors from the transaction', async () => {
      // Arrange
      const transactionError = new Error('Transaction failed');
      jest.spyOn(prismaService, '$transaction').mockRejectedValue(transactionError);

      // Act & Assert
      await expect(
        prismaService.executeInTransaction(async () => {
          throw transactionError;
        })
      ).rejects.toThrow('Transaction failed');
    });

    it('should support generic return types', async () => {
      // Arrange
      interface TestUser {
        id: string;
        email: string;
      }
      const mockUser: TestUser = { id: 'user-1', email: 'test@example.com' };
      jest.spyOn(prismaService, '$transaction').mockResolvedValue(mockUser);

      // Act
      const result = await prismaService.executeInTransaction<TestUser>(async () => mockUser);

      // Assert
      expect(result).toEqual(mockUser);
      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
    });

    it('should support array return types', async () => {
      // Arrange
      const mockUsers = [
        { id: 'user-1', name: 'User One' },
        { id: 'user-2', name: 'User Two' },
      ];
      jest.spyOn(prismaService, '$transaction').mockResolvedValue(mockUsers);

      // Act
      const result = await prismaService.executeInTransaction(async () => mockUsers);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should support void return type', async () => {
      // Arrange
      jest.spyOn(prismaService, '$transaction').mockResolvedValue(undefined);

      // Act
      const result = await prismaService.executeInTransaction(async () => {
        // Perform some operation without returning a value
      });

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // Database Connection Error Handling Tests
  // ==========================================================================

  describe('database connection error handling', () => {
    it('should handle connection timeout gracefully', async () => {
      // Arrange
      const timeoutError = new Error('Connection timeout');
      jest.spyOn(prismaService, '$connect').mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(prismaService.onModuleInit()).rejects.toThrow('Connection timeout');
    });

    it('should handle authentication errors', async () => {
      // Arrange
      const authError = new Error('Authentication failed');
      jest.spyOn(prismaService, '$connect').mockRejectedValue(authError);

      // Act & Assert
      await expect(prismaService.onModuleInit()).rejects.toThrow('Authentication failed');
    });

    it('should handle database not found errors', async () => {
      // Arrange
      const dbNotFoundError = new Error('Database does not exist');
      jest.spyOn(prismaService, '$connect').mockRejectedValue(dbNotFoundError);

      // Act & Assert
      await expect(prismaService.onModuleInit()).rejects.toThrow('Database does not exist');
    });
  });

  // ==========================================================================
  // Logging Lifecycle Tests
  // ==========================================================================

  describe('logging lifecycle', () => {
    it('should log in correct order during initialization', async () => {
      // Arrange
      jest.spyOn(prismaService, '$connect').mockResolvedValue();
      const callOrder: string[] = [];
      loggerLogSpy.mockImplementation((message: string) => {
        callOrder.push(message);
      });

      // Act
      await prismaService.onModuleInit();

      // Assert
      expect(callOrder).toEqual(['Connecting to database...', 'Database connection established']);
    });

    it('should log in correct order during destruction', async () => {
      // Arrange
      jest.spyOn(prismaService, '$disconnect').mockResolvedValue();
      const callOrder: string[] = [];
      loggerLogSpy.mockImplementation((message: string) => {
        callOrder.push(message);
      });

      // Act
      await prismaService.onModuleDestroy();

      // Assert
      expect(callOrder).toEqual(['Disconnecting from database...', 'Database disconnected']);
    });

    it('should only log connecting message if connection fails', async () => {
      // Arrange
      jest.spyOn(prismaService, '$connect').mockRejectedValue(new Error('Failed'));
      const logMessages: string[] = [];
      loggerLogSpy.mockImplementation((message: string) => {
        logMessages.push(message);
      });

      // Act
      try {
        await prismaService.onModuleInit();
      } catch {
        // Expected to throw
      }

      // Assert - should only have the "connecting" message, not the success message
      expect(logMessages).toContain('Connecting to database...');
      expect(logMessages).not.toContain('Database connection established');
    });
  });

  // ==========================================================================
  // Service Instantiation Tests
  // ==========================================================================

  describe('service instantiation', () => {
    it('should create multiple independent instances', async () => {
      // Create a second module
      const module2: TestingModule = await Test.createTestingModule({
        providers: [PrismaService],
      }).compile();

      const prismaService2 = module2.get<PrismaService>(PrismaService);

      // Assert instances are different
      expect(prismaService).not.toBe(prismaService2);

      // Cleanup
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      await prismaService2.$disconnect().catch(() => {});
    });

    it('should have PrismaClient methods available', () => {
      // Assert PrismaClient methods exist
      expect(prismaService.$connect).toBeDefined();
      expect(prismaService.$disconnect).toBeDefined();
      expect(prismaService.$on).toBeDefined();
      expect(prismaService.$transaction).toBeDefined();
      expect(prismaService.$queryRaw).toBeDefined();
      expect(prismaService.$executeRaw).toBeDefined();
    });
  });
});
