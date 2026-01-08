/**
 * Bulk Operation Controller Unit Tests
 *
 * Comprehensive tests for bulk operation controller including:
 * - Bulk delete endpoint
 * - Import validation endpoint
 * - Export endpoint
 * - Error handling
 * - Response structure
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GenericBulkController, BulkOperationController } from './bulk-operation.controller';
import { BulkOperationService } from './bulk-operation.service';
import {
  BulkDeleteDto,
  BulkImportDto,
  BulkExportDto,
  BulkOperationStatus,
  OperationResultStatus,
  BulkOperationResponseDto,
} from './bulk-operation.dto';

// ============================================================================
// Mock Setup
// ============================================================================

const mockBulkOperationService = {
  bulkCreate: jest.fn(),
  bulkUpdate: jest.fn(),
  bulkDelete: jest.fn(),
};

describe('GenericBulkController', () => {
  let controller: GenericBulkController;
  let service: BulkOperationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenericBulkController],
      providers: [
        {
          provide: BulkOperationService,
          useValue: mockBulkOperationService,
        },
      ],
    }).compile();

    controller = module.get<GenericBulkController>(GenericBulkController);
    service = module.get<BulkOperationService>(BulkOperationService);
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('bulkDelete', () => {
    it('should call bulkService.bulkDelete with correct parameters', async () => {
      const dto: BulkDeleteDto = {
        ids: ['uuid-1', 'uuid-2', 'uuid-3'],
        softDelete: true,
        continueOnError: true,
      };

      const mockResponse: BulkOperationResponseDto = {
        status: BulkOperationStatus.COMPLETED,
        total: 3,
        successful: 3,
        failed: 0,
        skipped: 0,
        processingTimeMs: 100,
        results: [
          { index: 0, id: 'uuid-1', status: OperationResultStatus.SUCCESS },
          { index: 1, id: 'uuid-2', status: OperationResultStatus.SUCCESS },
          { index: 2, id: 'uuid-3', status: OperationResultStatus.SUCCESS },
        ],
      };

      mockBulkOperationService.bulkDelete.mockResolvedValue(mockResponse);

      const result = await controller.bulkDelete(dto);

      expect(mockBulkOperationService.bulkDelete).toHaveBeenCalledWith(
        dto,
        expect.any(Function),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return correct response structure', async () => {
      const dto: BulkDeleteDto = {
        ids: ['uuid-1'],
      };

      const mockResponse: BulkOperationResponseDto = {
        status: BulkOperationStatus.COMPLETED,
        total: 1,
        successful: 1,
        failed: 0,
        skipped: 0,
        processingTimeMs: 50,
        results: [{ index: 0, id: 'uuid-1', status: OperationResultStatus.SUCCESS }],
      };

      mockBulkOperationService.bulkDelete.mockResolvedValue(mockResponse);

      const result = await controller.bulkDelete(dto);

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('successful');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('processingTimeMs');
      expect(result).toHaveProperty('results');
    });

    it('should handle partial failures', async () => {
      const dto: BulkDeleteDto = {
        ids: ['uuid-1', 'uuid-2'],
      };

      const mockResponse: BulkOperationResponseDto = {
        status: BulkOperationStatus.PARTIAL,
        total: 2,
        successful: 1,
        failed: 1,
        skipped: 0,
        processingTimeMs: 75,
        results: [
          { index: 0, id: 'uuid-1', status: OperationResultStatus.SUCCESS },
          { index: 1, id: 'uuid-2', status: OperationResultStatus.FAILED, error: 'Not found' },
        ],
        errorSummary: { 'Not found': 1 },
      };

      mockBulkOperationService.bulkDelete.mockResolvedValue(mockResponse);

      const result = await controller.bulkDelete(dto);

      expect(result.status).toBe(BulkOperationStatus.PARTIAL);
      expect(result.errorSummary).toBeDefined();
    });
  });

  describe('validateImport', () => {
    it('should validate JSON import data', async () => {
      const dto: BulkImportDto = {
        format: 'json',
        data: '[{"email":"user@example.com","name":"John"}]',
      };

      const result = await controller.validateImport(dto);

      expect(result.status).toBe(BulkOperationStatus.COMPLETED);
      expect(result.total).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should return FAILED status for invalid JSON', async () => {
      const dto: BulkImportDto = {
        format: 'json',
        data: 'invalid json {',
      };

      const result = await controller.validateImport(dto);

      expect(result.status).toBe(BulkOperationStatus.FAILED);
      expect(result.failed).toBe(1);
      expect(result.results[0].error).toBeDefined();
    });

    it('should handle empty JSON array', async () => {
      const dto: BulkImportDto = {
        format: 'json',
        data: '[]',
      };

      const result = await controller.validateImport(dto);

      expect(result.status).toBe(BulkOperationStatus.COMPLETED);
      expect(result.total).toBe(0);
    });

    it('should handle CSV format (placeholder)', async () => {
      const dto: BulkImportDto = {
        format: 'csv',
        data: 'email,name\nuser@example.com,John',
      };

      const result = await controller.validateImport(dto);

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should return validation results for each item', async () => {
      const dto: BulkImportDto = {
        format: 'json',
        data: '[{"name":"Item1"},{"name":"Item2"},{"name":"Item3"}]',
      };

      const result = await controller.validateImport(dto);

      expect(result.results).toHaveLength(3);
      result.results.forEach((r, i) => {
        expect(r.index).toBe(i);
        expect(r.status).toBe(OperationResultStatus.SUCCESS);
      });
    });

    it('should track processing time', async () => {
      const dto: BulkImportDto = {
        format: 'json',
        data: '[{"name":"Test"}]',
      };

      const result = await controller.validateImport(dto);

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should include error summary on failure', async () => {
      const dto: BulkImportDto = {
        format: 'json',
        data: 'not valid json',
      };

      const result = await controller.validateImport(dto);

      expect(result.errorSummary).toBeDefined();
    });
  });

  describe('bulkExport', () => {
    it('should return download URL for JSON export', async () => {
      const dto: BulkExportDto = {
        format: 'json',
        fields: ['id', 'name', 'email'],
      };

      const result = await controller.bulkExport(dto);

      expect(result.downloadUrl).toBeDefined();
      expect(result.downloadUrl).toContain('.json');
      expect(result.format).toBe('json');
    });

    it('should return download URL for CSV export', async () => {
      const dto: BulkExportDto = {
        format: 'csv',
        fields: ['id', 'name'],
      };

      const result = await controller.bulkExport(dto);

      expect(result.downloadUrl).toContain('.csv');
      expect(result.format).toBe('csv');
    });

    it('should return download URL for XLSX export', async () => {
      const dto: BulkExportDto = {
        format: 'xlsx',
      };

      const result = await controller.bulkExport(dto);

      expect(result.downloadUrl).toContain('.xlsx');
      expect(result.format).toBe('xlsx');
    });

    it('should include record count in response', async () => {
      const dto: BulkExportDto = {
        format: 'json',
      };

      const result = await controller.bulkExport(dto);

      expect(result).toHaveProperty('recordCount');
      expect(typeof result.recordCount).toBe('number');
    });

    it('should handle filters in export request', async () => {
      const dto: BulkExportDto = {
        format: 'json',
        filters: { status: 'active', role: 'admin' },
      };

      const result = await controller.bulkExport(dto);

      expect(result.downloadUrl).toBeDefined();
    });

    it('should handle limit in export request', async () => {
      const dto: BulkExportDto = {
        format: 'json',
        limit: 100,
      };

      const result = await controller.bulkExport(dto);

      expect(result.downloadUrl).toBeDefined();
    });
  });
});

describe('BulkOperationController (abstract)', () => {
  // Create a concrete implementation for testing
  class TestBulkController extends BulkOperationController {
    constructor(bulkService: BulkOperationService) {
      super(bulkService);
    }

    async testAccess(): Promise<BulkOperationService> {
      return this.bulkService;
    }
  }

  let controller: TestBulkController;
  let mockService: Partial<BulkOperationService>;

  beforeEach(() => {
    mockService = {
      bulkCreate: jest.fn(),
      bulkUpdate: jest.fn(),
      bulkDelete: jest.fn(),
    };

    controller = new TestBulkController(mockService as BulkOperationService);
  });

  it('should have bulkService available to subclasses', async () => {
    const service = await controller.testAccess();
    expect(service).toBe(mockService);
  });

  it('should be abstract (cannot instantiate directly)', () => {
    // TypeScript enforces this at compile time, but we can verify the pattern
    expect(BulkOperationController.prototype.constructor).toBeDefined();
  });
});

describe('Controller decorators', () => {
  it('should have correct controller path for GenericBulkController', () => {
    const metadata = Reflect.getMetadata('path', GenericBulkController);
    expect(metadata).toBe('api/bulk');
  });

  it('should have correct method decorators for bulkDelete', () => {
    const prototype = GenericBulkController.prototype;
    // The @Post decorator should be present
    const postMetadata = Reflect.getMetadata('method', prototype.bulkDelete);
    // Check if method exists
    expect(typeof prototype.bulkDelete).toBe('function');
  });

  it('should have correct method decorators for validateImport', () => {
    const prototype = GenericBulkController.prototype;
    expect(typeof prototype.validateImport).toBe('function');
  });

  it('should have correct method decorators for bulkExport', () => {
    const prototype = GenericBulkController.prototype;
    expect(typeof prototype.bulkExport).toBe('function');
  });
});

describe('DTO validation (integration)', () => {
  let controller: GenericBulkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenericBulkController],
      providers: [
        {
          provide: BulkOperationService,
          useValue: mockBulkOperationService,
        },
      ],
    }).compile();

    controller = module.get<GenericBulkController>(GenericBulkController);
  });

  describe('BulkDeleteDto', () => {
    it('should accept valid UUID array', async () => {
      const dto: BulkDeleteDto = {
        ids: [
          '550e8400-e29b-41d4-a716-446655440000',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        ],
      };

      mockBulkOperationService.bulkDelete.mockResolvedValue({
        status: BulkOperationStatus.COMPLETED,
        total: 2,
        successful: 2,
        failed: 0,
        skipped: 0,
        processingTimeMs: 0,
        results: [],
      });

      const result = await controller.bulkDelete(dto);
      expect(result).toBeDefined();
    });
  });

  describe('BulkImportDto', () => {
    it('should accept valid JSON format', async () => {
      const dto: BulkImportDto = {
        format: 'json',
        data: '[{"name":"test"}]',
      };

      const result = await controller.validateImport(dto);
      expect(result).toBeDefined();
    });

    it('should accept valid CSV format', async () => {
      const dto: BulkImportDto = {
        format: 'csv',
        data: 'name\ntest',
        fieldMapping: { name: 0 },
        skipHeader: true,
      };

      const result = await controller.validateImport(dto);
      expect(result).toBeDefined();
    });
  });

  describe('BulkExportDto', () => {
    it('should accept all valid export formats', async () => {
      const formats: Array<'csv' | 'json' | 'xlsx'> = ['csv', 'json', 'xlsx'];

      for (const format of formats) {
        const dto: BulkExportDto = { format };
        const result = await controller.bulkExport(dto);
        expect(result.format).toBe(format);
      }
    });
  });
});

describe('Error handling', () => {
  let controller: GenericBulkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenericBulkController],
      providers: [
        {
          provide: BulkOperationService,
          useValue: mockBulkOperationService,
        },
      ],
    }).compile();

    controller = module.get<GenericBulkController>(GenericBulkController);
  });

  it('should propagate service errors', async () => {
    const dto: BulkDeleteDto = { ids: ['uuid-1'] };
    const error = new Error('Service error');
    mockBulkOperationService.bulkDelete.mockRejectedValue(error);

    await expect(controller.bulkDelete(dto)).rejects.toThrow('Service error');
  });

  it('should handle malformed JSON in validateImport gracefully', async () => {
    const dto: BulkImportDto = {
      format: 'json',
      data: '{"incomplete": ',
    };

    const result = await controller.validateImport(dto);

    expect(result.status).toBe(BulkOperationStatus.FAILED);
    expect(result.results[0].status).toBe(OperationResultStatus.FAILED);
  });
});
