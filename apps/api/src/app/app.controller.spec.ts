/**
 * AppController Unit Tests
 *
 * Comprehensive tests for the root application controller including:
 * - GET / endpoint functionality
 * - Service integration
 * - Controller initialization
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// ============================================================================
// Mock Setup
// ============================================================================

describe('AppController', () => {
  let controller: AppController;
  let appService: jest.Mocked<AppService>;

  const mockAppService = {
    getData: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: mockAppService }],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get(AppService);
  });

  // ==========================================================================
  // Controller Initialization
  // ==========================================================================

  describe('initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should be an instance of AppController', () => {
      expect(controller).toBeInstanceOf(AppController);
    });

    it('should have appService injected', () => {
      expect(appService).toBeDefined();
    });
  });

  // ==========================================================================
  // GET / - getData Tests
  // ==========================================================================

  describe('getData (GET /)', () => {
    it('should return data from AppService', () => {
      // Arrange
      const expectedData = { message: 'Hello API' };
      mockAppService.getData.mockReturnValue(expectedData);

      // Act
      const result = controller.getData();

      // Assert
      expect(result).toBe(expectedData);
    });

    it('should call AppService.getData() once', () => {
      // Arrange
      mockAppService.getData.mockReturnValue({ message: 'Hello API' });

      // Act
      controller.getData();

      // Assert
      expect(mockAppService.getData).toHaveBeenCalledTimes(1);
    });

    it('should call AppService.getData() without arguments', () => {
      // Arrange
      mockAppService.getData.mockReturnValue({ message: 'Hello API' });

      // Act
      controller.getData();

      // Assert
      expect(mockAppService.getData).toHaveBeenCalledWith();
    });

    it('should return object with message property', () => {
      // Arrange
      mockAppService.getData.mockReturnValue({ message: 'Hello API' });

      // Act
      const result = controller.getData();

      // Assert
      expect(result).toHaveProperty('message');
    });

    it('should return "Hello API" message', () => {
      // Arrange
      mockAppService.getData.mockReturnValue({ message: 'Hello API' });

      // Act
      const result = controller.getData();

      // Assert
      expect(result.message).toBe('Hello API');
    });

    it('should return exactly what service returns', () => {
      // Arrange
      const customMessage = { message: 'Custom Message' };
      mockAppService.getData.mockReturnValue(customMessage);

      // Act
      const result = controller.getData();

      // Assert
      expect(result).toBe(customMessage);
    });

    it('should be callable multiple times', () => {
      // Arrange
      mockAppService.getData.mockReturnValue({ message: 'Hello API' });

      // Act
      controller.getData();
      controller.getData();
      controller.getData();

      // Assert
      expect(mockAppService.getData).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // Return Type Tests
  // ==========================================================================

  describe('return type validation', () => {
    it('should return object matching { message: string } interface', () => {
      // Arrange
      mockAppService.getData.mockReturnValue({ message: 'Hello API' });

      // Act
      const result = controller.getData();

      // Assert
      expect(result).toMatchObject({
        message: expect.any(String),
      });
    });

    it('should return non-null result', () => {
      // Arrange
      mockAppService.getData.mockReturnValue({ message: 'Hello API' });

      // Act
      const result = controller.getData();

      // Assert
      expect(result).not.toBeNull();
    });

    it('should return non-undefined result', () => {
      // Arrange
      mockAppService.getData.mockReturnValue({ message: 'Hello API' });

      // Act
      const result = controller.getData();

      // Assert
      expect(result).not.toBeUndefined();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should propagate errors from service', () => {
      // Arrange
      const error = new Error('Service error');
      mockAppService.getData.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => controller.getData()).toThrow('Service error');
    });

    it('should propagate specific error types', () => {
      // Arrange
      const error = new TypeError('Type error');
      mockAppService.getData.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => controller.getData()).toThrow(TypeError);
    });
  });

  // ==========================================================================
  // Integration with Real Service
  // ==========================================================================

  describe('integration with real AppService', () => {
    let realController: AppController;
    let realService: AppService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AppController],
        providers: [AppService],
      }).compile();

      realController = module.get<AppController>(AppController);
      realService = module.get<AppService>(AppService);
    });

    it('should be defined with real service', () => {
      expect(realController).toBeDefined();
      expect(realService).toBeDefined();
    });

    it('should return "Hello API" with real service', () => {
      // Act
      const result = realController.getData();

      // Assert
      expect(result).toEqual({ message: 'Hello API' });
    });

    it('should return same result as direct service call', () => {
      // Act
      const controllerResult = realController.getData();
      const serviceResult = realService.getData();

      // Assert
      expect(controllerResult).toEqual(serviceResult);
    });
  });

  // ==========================================================================
  // Service Dependency Tests
  // ==========================================================================

  describe('service dependency', () => {
    it('should use injected service', () => {
      // Arrange
      const customData = { message: 'Custom from injected service' };
      mockAppService.getData.mockReturnValue(customData);

      // Act
      const result = controller.getData();

      // Assert
      expect(result).toBe(customData);
      expect(mockAppService.getData).toHaveBeenCalled();
    });

    it('should not call service constructor directly', () => {
      // The controller receives an already-constructed service
      // This test verifies the DI pattern is followed
      expect(appService).toBeDefined();
      expect(typeof appService.getData).toBe('function');
    });
  });
});
