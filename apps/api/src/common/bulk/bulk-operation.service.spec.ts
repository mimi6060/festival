/**
 * Bulk Operation Service Unit Tests
 *
 * Comprehensive tests for bulk operation service including:
 * - Bulk create operations
 * - Bulk update operations
 * - Bulk delete operations
 * - Batch processing
 * - Concurrency control
 * - Error handling and continue-on-error
 * - Validation callbacks
 * - Timeout handling
 * - Status determination
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  BulkOperationService,
  BulkOperationConfig,
  CreateCallback,
  UpdateCallback,
  DeleteCallback,
  ValidateCallback,
} from './bulk-operation.service';
import {
  BulkOperationStatus,
  OperationResultStatus,
  BulkDeleteDto,
  BulkUpdateDto,
} from './bulk-operation.dto';

// ============================================================================
// Test Setup
// ============================================================================

describe('BulkOperationService', () => {
  let service: BulkOperationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: BulkOperationService,
          useFactory: () => new BulkOperationService(),
        },
      ],
    }).compile();

    service = module.get<BulkOperationService>(BulkOperationService);
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should accept custom config', () => {
      const customConfig: Partial<BulkOperationConfig> = {
        batchSize: 50,
        concurrency: 5,
        itemTimeout: 10000,
      };
      const customService = new BulkOperationService(customConfig);
      expect(customService).toBeDefined();
    });
  });

  describe('bulkCreate', () => {
    describe('successful operations', () => {
      it('should create all items successfully', async () => {
        const items = [{ name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }];
        const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
          .fn()
          .mockImplementation((item, index) =>
            Promise.resolve({ id: `id-${index}`, ...item }),
          );

        const result = await service.bulkCreate(items, createCallback);

        expect(result.status).toBe(BulkOperationStatus.COMPLETED);
        expect(result.total).toBe(3);
        expect(result.successful).toBe(3);
        expect(result.failed).toBe(0);
        expect(result.skipped).toBe(0);
        expect(createCallback).toHaveBeenCalledTimes(3);
      });

      it('should return correct results for each item', async () => {
        const items = [{ name: 'Item 1' }, { name: 'Item 2' }];
        const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
          .fn()
          .mockImplementation((item, index) =>
            Promise.resolve({ id: `id-${index}`, ...item }),
          );

        const result = await service.bulkCreate(items, createCallback);

        expect(result.results).toHaveLength(2);
        expect(result.results[0].status).toBe(OperationResultStatus.SUCCESS);
        expect(result.results[0].index).toBe(0);
        expect(result.results[0].id).toBe('id-0');
        expect(result.results[1].status).toBe(OperationResultStatus.SUCCESS);
        expect(result.results[1].index).toBe(1);
      });

      it('should track processing time', async () => {
        const items = [{ name: 'Item 1' }];
        const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
          .fn()
          .mockImplementation(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return { id: 'id-1' };
          });

        const result = await service.bulkCreate(items, createCallback);

        expect(result.processingTimeMs).toBeGreaterThanOrEqual(50);
      });
    });

    describe('error handling', () => {
      it('should continue on error by default', async () => {
        const items = [{ name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }];
        const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
          .fn()
          .mockImplementationOnce(() => Promise.resolve({ id: 'id-0' }))
          .mockImplementationOnce(() => Promise.reject(new Error('Failed')))
          .mockImplementationOnce(() => Promise.resolve({ id: 'id-2' }));

        const result = await service.bulkCreate(items, createCallback);

        expect(result.status).toBe(BulkOperationStatus.PARTIAL);
        expect(result.successful).toBe(2);
        expect(result.failed).toBe(1);
        expect(result.results[1].status).toBe(OperationResultStatus.FAILED);
        expect(result.results[1].error).toBe('Failed');
      });

      it('should stop on first error when continueOnError is false', async () => {
        const items = [{ name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }];
        const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
          .fn()
          .mockImplementationOnce(() => Promise.resolve({ id: 'id-0' }))
          .mockImplementationOnce(() => Promise.reject(new Error('Failed')))
          .mockImplementationOnce(() => Promise.resolve({ id: 'id-2' }));

        // When continueOnError is false, the service throws on error
        await expect(
          service.bulkCreate(items, createCallback, { continueOnError: false }),
        ).rejects.toThrow('Failed');
      });

      it('should track error summary', async () => {
        const items = [{ name: '1' }, { name: '2' }, { name: '3' }];
        const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
          .fn()
          .mockImplementation(() => Promise.reject(new Error('Same error')));

        const result = await service.bulkCreate(items, createCallback);

        expect(result.errorSummary).toBeDefined();
        expect(result.errorSummary!['Same error']).toBe(3);
      });

      it('should handle non-Error thrown values', async () => {
        const items = [{ name: 'Item 1' }];
        const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
          .fn()
          .mockImplementation(() => Promise.reject('String error'));

        const result = await service.bulkCreate(items, createCallback);

        expect(result.results[0].error).toBe('Unknown error');
      });
    });

    describe('validation', () => {
      it('should validate items before processing when validateFirst is true', async () => {
        const items = [{ name: 'Valid' }, { name: 'Invalid' }];
        const validateCallback: ValidateCallback<typeof items[0]> = jest
          .fn()
          .mockImplementation((item) =>
            Promise.resolve({
              valid: item.name === 'Valid',
              error: item.name === 'Invalid' ? 'Invalid item' : undefined,
            }),
          );
        const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
          .fn()
          .mockResolvedValue({ id: 'id-1' });

        await service.bulkCreate(items, createCallback, {
          validateCallback,
          validateFirst: true,
        });

        expect(validateCallback).toHaveBeenCalledTimes(2);
      });

      it('should not process if validation fails and continueOnError is false', async () => {
        const items = [{ name: 'Invalid' }];
        const validateCallback: ValidateCallback<typeof items[0]> = jest
          .fn()
          .mockResolvedValue({ valid: false, error: 'Invalid' });
        const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
          .fn()
          .mockResolvedValue({ id: 'id-1' });

        const result = await service.bulkCreate(items, createCallback, {
          validateCallback,
          validateFirst: true,
          continueOnError: false,
        });

        expect(result.status).toBe(BulkOperationStatus.FAILED);
        expect(createCallback).not.toHaveBeenCalled();
      });
    });

    describe('status determination', () => {
      it('should return COMPLETED when all succeed', async () => {
        const items = [{ name: '1' }, { name: '2' }];
        const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
          .fn()
          .mockResolvedValue({ id: 'id' });

        const result = await service.bulkCreate(items, createCallback);

        expect(result.status).toBe(BulkOperationStatus.COMPLETED);
      });

      it('should return FAILED when all fail', async () => {
        const items = [{ name: '1' }, { name: '2' }];
        const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
          .fn()
          .mockRejectedValue(new Error('Failed'));

        const result = await service.bulkCreate(items, createCallback);

        expect(result.status).toBe(BulkOperationStatus.FAILED);
      });

      it('should return PARTIAL when some succeed and some fail', async () => {
        const items = [{ name: '1' }, { name: '2' }];
        const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
          .fn()
          .mockResolvedValueOnce({ id: 'id-1' })
          .mockRejectedValueOnce(new Error('Failed'));

        const result = await service.bulkCreate(items, createCallback);

        expect(result.status).toBe(BulkOperationStatus.PARTIAL);
      });
    });
  });

  describe('bulkUpdate', () => {
    describe('successful operations', () => {
      it('should update all items successfully', async () => {
        const dto: BulkUpdateDto = {
          items: [
            { id: 'id-1', data: { name: 'Updated 1' } },
            { id: 'id-2', data: { name: 'Updated 2' } },
          ],
        };
        const updateCallback: UpdateCallback<{ id: string }> = jest
          .fn()
          .mockImplementation((id) => Promise.resolve({ id }));

        const result = await service.bulkUpdate(dto, updateCallback);

        expect(result.status).toBe(BulkOperationStatus.COMPLETED);
        expect(result.total).toBe(2);
        expect(result.successful).toBe(2);
        expect(result.failed).toBe(0);
        expect(updateCallback).toHaveBeenCalledTimes(2);
      });

      it('should pass correct parameters to callback', async () => {
        const dto: BulkUpdateDto = {
          items: [{ id: 'id-1', data: { name: 'Updated' } }],
        };
        const updateCallback: UpdateCallback<{ id: string }> = jest
          .fn()
          .mockResolvedValue({ id: 'id-1' });

        await service.bulkUpdate(dto, updateCallback);

        expect(updateCallback).toHaveBeenCalledWith('id-1', { name: 'Updated' }, 0);
      });
    });

    describe('error handling', () => {
      it('should continue on error by default', async () => {
        const dto: BulkUpdateDto = {
          items: [
            { id: 'id-1', data: { name: 'Update 1' } },
            { id: 'id-2', data: { name: 'Update 2' } },
          ],
        };
        const updateCallback: UpdateCallback<{ id: string }> = jest
          .fn()
          .mockResolvedValueOnce({ id: 'id-1' })
          .mockRejectedValueOnce(new Error('Not found'));

        const result = await service.bulkUpdate(dto, updateCallback);

        expect(result.status).toBe(BulkOperationStatus.PARTIAL);
        expect(result.successful).toBe(1);
        expect(result.failed).toBe(1);
      });

      it('should use dto continueOnError option', async () => {
        const dto: BulkUpdateDto = {
          items: [
            { id: 'id-1', data: { name: 'Update 1' } },
            { id: 'id-2', data: { name: 'Update 2' } },
            { id: 'id-3', data: { name: 'Update 3' } },
          ],
          continueOnError: false,
        };
        const updateCallback: UpdateCallback<{ id: string }> = jest
          .fn()
          .mockResolvedValueOnce({ id: 'id-1' })
          .mockRejectedValueOnce(new Error('Update Error'))
          .mockResolvedValueOnce({ id: 'id-3' });

        // When continueOnError is false, the service throws on error
        await expect(service.bulkUpdate(dto, updateCallback)).rejects.toThrow('Update Error');
      });

      it('should include id in result for each item', async () => {
        const dto: BulkUpdateDto = {
          items: [{ id: 'uuid-123', data: { name: 'Updated' } }],
        };
        const updateCallback: UpdateCallback<{ id: string }> = jest
          .fn()
          .mockResolvedValue({ id: 'uuid-123' });

        const result = await service.bulkUpdate(dto, updateCallback);

        expect(result.results[0].id).toBe('uuid-123');
      });
    });
  });

  describe('bulkDelete', () => {
    describe('successful operations', () => {
      it('should delete all items successfully', async () => {
        const dto: BulkDeleteDto = {
          ids: ['id-1', 'id-2', 'id-3'],
        };
        const deleteCallback: DeleteCallback = jest.fn().mockResolvedValue(true);

        const result = await service.bulkDelete(dto, deleteCallback);

        expect(result.status).toBe(BulkOperationStatus.COMPLETED);
        expect(result.total).toBe(3);
        expect(result.successful).toBe(3);
        expect(result.failed).toBe(0);
        expect(deleteCallback).toHaveBeenCalledTimes(3);
      });

      it('should pass correct parameters to callback', async () => {
        const dto: BulkDeleteDto = {
          ids: ['uuid-123'],
        };
        const deleteCallback: DeleteCallback = jest.fn().mockResolvedValue(true);

        await service.bulkDelete(dto, deleteCallback);

        expect(deleteCallback).toHaveBeenCalledWith('uuid-123', 0);
      });
    });

    describe('error handling', () => {
      it('should continue on error by default', async () => {
        const dto: BulkDeleteDto = {
          ids: ['id-1', 'id-2', 'id-3'],
        };
        const deleteCallback: DeleteCallback = jest
          .fn()
          .mockResolvedValueOnce(true)
          .mockRejectedValueOnce(new Error('Not found'))
          .mockResolvedValueOnce(true);

        const result = await service.bulkDelete(dto, deleteCallback);

        expect(result.status).toBe(BulkOperationStatus.PARTIAL);
        expect(result.successful).toBe(2);
        expect(result.failed).toBe(1);
      });

      it('should use dto continueOnError option', async () => {
        const dto: BulkDeleteDto = {
          ids: ['id-1', 'id-2', 'id-3'],
          continueOnError: false,
        };
        const deleteCallback: DeleteCallback = jest
          .fn()
          .mockResolvedValueOnce(true)
          .mockRejectedValueOnce(new Error('Delete Error'))
          .mockResolvedValueOnce(true);

        // When continueOnError is false, the service throws on error
        await expect(service.bulkDelete(dto, deleteCallback)).rejects.toThrow('Delete Error');
      });

      it('should include id in each result', async () => {
        const dto: BulkDeleteDto = {
          ids: ['uuid-1', 'uuid-2'],
        };
        const deleteCallback: DeleteCallback = jest.fn().mockResolvedValue(true);

        const result = await service.bulkDelete(dto, deleteCallback);

        expect(result.results[0].id).toBe('uuid-1');
        expect(result.results[1].id).toBe('uuid-2');
      });
    });
  });

  describe('batch processing', () => {
    it('should process items in batches', async () => {
      const customService = new BulkOperationService({ batchSize: 2, concurrency: 1 });
      const items = Array.from({ length: 5 }, (_, i) => ({ name: `Item ${i}` }));
      const processOrder: number[] = [];
      const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
        .fn()
        .mockImplementation((item, index) => {
          processOrder.push(index);
          return Promise.resolve({ id: `id-${index}` });
        });

      await customService.bulkCreate(items, createCallback);

      expect(createCallback).toHaveBeenCalledTimes(5);
    });

    it('should respect concurrency limit', async () => {
      const customService = new BulkOperationService({ batchSize: 100, concurrency: 2 });
      let concurrentCount = 0;
      let maxConcurrent = 0;

      const items = Array.from({ length: 4 }, (_, i) => ({ name: `Item ${i}` }));
      const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
        .fn()
        .mockImplementation(async () => {
          concurrentCount++;
          maxConcurrent = Math.max(maxConcurrent, concurrentCount);
          await new Promise((resolve) => setTimeout(resolve, 50));
          concurrentCount--;
          return { id: 'id' };
        });

      await customService.bulkCreate(items, createCallback);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('timeout handling', () => {
    it('should timeout slow operations', async () => {
      const customService = new BulkOperationService({ itemTimeout: 50 });
      const items = [{ name: 'Slow item' }];
      const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
        .fn()
        .mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return { id: 'id' };
        });

      // Timeout errors cause the Promise.all to reject, throwing the error
      await expect(customService.bulkCreate(items, createCallback)).rejects.toThrow(
        'Operation timed out',
      );
    });
  });

  describe('response building', () => {
    it('should not include errorSummary when no errors', async () => {
      const items = [{ name: 'Item 1' }];
      const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
        .fn()
        .mockResolvedValue({ id: 'id-1' });

      const result = await service.bulkCreate(items, createCallback);

      expect(result.errorSummary).toBeUndefined();
    });

    it('should truncate long error messages in summary', async () => {
      const items = [{ name: 'Item 1' }];
      const longError = 'e'.repeat(150);
      const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
        .fn()
        .mockRejectedValue(new Error(longError));

      const result = await service.bulkCreate(items, createCallback);

      const errorKey = Object.keys(result.errorSummary!)[0];
      expect(errorKey.length).toBeLessThanOrEqual(100);
    });

    it('should group similar errors', async () => {
      const items = [{ name: '1' }, { name: '2' }, { name: '3' }];
      const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error A'))
        .mockRejectedValueOnce(new Error('Error B'))
        .mockRejectedValueOnce(new Error('Error A'));

      const result = await service.bulkCreate(items, createCallback);

      expect(result.errorSummary!['Error A']).toBe(2);
      expect(result.errorSummary!['Error B']).toBe(1);
    });
  });
});

describe('Edge cases', () => {
  let service: BulkOperationService;

  beforeEach(() => {
    service = new BulkOperationService();
  });

  it('should handle empty items array for bulkCreate', async () => {
    const items: { name: string }[] = [];
    const createCallback: CreateCallback<{ name: string }, { id: string }> = jest
      .fn()
      .mockResolvedValue({ id: 'id' });

    const result = await service.bulkCreate(items, createCallback);

    expect(result.status).toBe(BulkOperationStatus.COMPLETED);
    expect(result.total).toBe(0);
    expect(result.successful).toBe(0);
    expect(createCallback).not.toHaveBeenCalled();
  });

  it('should handle empty ids array for bulkDelete', async () => {
    const dto: BulkDeleteDto = { ids: [] };
    const deleteCallback: DeleteCallback = jest.fn().mockResolvedValue(true);

    const result = await service.bulkDelete(dto, deleteCallback);

    expect(result.status).toBe(BulkOperationStatus.COMPLETED);
    expect(result.total).toBe(0);
    expect(deleteCallback).not.toHaveBeenCalled();
  });

  it('should handle empty items array for bulkUpdate', async () => {
    const dto: BulkUpdateDto = { items: [] };
    const updateCallback: UpdateCallback<{ id: string }> = jest
      .fn()
      .mockResolvedValue({ id: 'id' });

    const result = await service.bulkUpdate(dto, updateCallback);

    expect(result.status).toBe(BulkOperationStatus.COMPLETED);
    expect(result.total).toBe(0);
    expect(updateCallback).not.toHaveBeenCalled();
  });

  it('should handle single item arrays', async () => {
    const items = [{ name: 'Single' }];
    const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
      .fn()
      .mockResolvedValue({ id: 'id-1' });

    const result = await service.bulkCreate(items, createCallback);

    expect(result.total).toBe(1);
    expect(result.successful).toBe(1);
  });

  it('should handle large number of items', async () => {
    const customService = new BulkOperationService({ batchSize: 50, concurrency: 10 });
    const items = Array.from({ length: 200 }, (_, i) => ({ name: `Item ${i}` }));
    const createCallback: CreateCallback<typeof items[0], { id: string }> = jest
      .fn()
      .mockResolvedValue({ id: 'id' });

    const result = await customService.bulkCreate(items, createCallback);

    expect(result.total).toBe(200);
    expect(result.successful).toBe(200);
    expect(createCallback).toHaveBeenCalledTimes(200);
  });

  it('should preserve item order in results', async () => {
    const items = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
    const createCallback: CreateCallback<typeof items[0], { id: string; name: string }> = jest
      .fn()
      .mockImplementation((item) => Promise.resolve({ id: 'id', name: item.name }));

    const result = await service.bulkCreate(items, createCallback);

    expect(result.results[0].index).toBe(0);
    expect(result.results[1].index).toBe(1);
    expect(result.results[2].index).toBe(2);
  });
});
