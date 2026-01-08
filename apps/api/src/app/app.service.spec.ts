/**
 * AppService Unit Tests
 *
 * Comprehensive tests for the root application service including:
 * - getData() method functionality
 * - Return value validation
 * - Service initialization
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

// ============================================================================
// Test Suite
// ============================================================================

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  // ==========================================================================
  // Service Initialization
  // ==========================================================================

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be an instance of AppService', () => {
      expect(service).toBeInstanceOf(AppService);
    });
  });

  // ==========================================================================
  // getData() Tests
  // ==========================================================================

  describe('getData', () => {
    it('should return an object with message property', () => {
      // Act
      const result = service.getData();

      // Assert
      expect(result).toHaveProperty('message');
    });

    it('should return "Hello API" message', () => {
      // Act
      const result = service.getData();

      // Assert
      expect(result.message).toBe('Hello API');
    });

    it('should return correct object structure', () => {
      // Act
      const result = service.getData();

      // Assert
      expect(result).toEqual({ message: 'Hello API' });
    });

    it('should return a new object each time (not cached)', () => {
      // Act
      const result1 = service.getData();
      const result2 = service.getData();

      // Assert
      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // Different object references
    });

    it('should return object with exactly one property', () => {
      // Act
      const result = service.getData();

      // Assert
      expect(Object.keys(result)).toHaveLength(1);
    });

    it('should return message property as a string', () => {
      // Act
      const result = service.getData();

      // Assert
      expect(typeof result.message).toBe('string');
    });

    it('should return non-empty message', () => {
      // Act
      const result = service.getData();

      // Assert
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('should be callable multiple times without errors', () => {
      // Act & Assert
      expect(() => {
        for (let i = 0; i < 100; i++) {
          service.getData();
        }
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Return Type Tests
  // ==========================================================================

  describe('return type validation', () => {
    it('should match the expected interface { message: string }', () => {
      // Act
      const result = service.getData();

      // Assert
      expect(result).toMatchObject({
        message: expect.any(String),
      });
    });

    it('should not have undefined message', () => {
      // Act
      const result = service.getData();

      // Assert
      expect(result.message).not.toBeUndefined();
    });

    it('should not have null message', () => {
      // Act
      const result = service.getData();

      // Assert
      expect(result.message).not.toBeNull();
    });
  });
});
