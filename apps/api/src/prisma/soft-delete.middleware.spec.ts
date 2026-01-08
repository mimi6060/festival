/**
 * Soft Delete Middleware Tests
 *
 * Tests for the Prisma soft delete middleware functionality.
 */

import { Prisma } from '@prisma/client';
import {
  createSoftDeleteFindMiddleware,
  createSoftDeleteMiddleware,
  isSoftDeleteModel,
  SOFT_DELETE_MODELS,
} from './soft-delete.middleware';

describe('SoftDeleteMiddleware', () => {
  describe('isSoftDeleteModel', () => {
    it('should return true for User model', () => {
      expect(isSoftDeleteModel('User')).toBe(true);
    });

    it('should return true for Festival model', () => {
      expect(isSoftDeleteModel('Festival')).toBe(true);
    });

    it('should return true for Ticket model', () => {
      expect(isSoftDeleteModel('Ticket')).toBe(true);
    });

    it('should return true for TicketCategory model', () => {
      expect(isSoftDeleteModel('TicketCategory')).toBe(true);
    });

    it('should return true for Payment model', () => {
      expect(isSoftDeleteModel('Payment')).toBe(true);
    });

    it('should return true for Artist model', () => {
      expect(isSoftDeleteModel('Artist')).toBe(true);
    });

    it('should return true for Vendor model', () => {
      expect(isSoftDeleteModel('Vendor')).toBe(true);
    });

    it('should return true for VendorOrder model', () => {
      expect(isSoftDeleteModel('VendorOrder')).toBe(true);
    });

    it('should return false for non-soft-delete models', () => {
      expect(isSoftDeleteModel('Zone')).toBe(false);
      expect(isSoftDeleteModel('Stage')).toBe(false);
      expect(isSoftDeleteModel('Performance')).toBe(false);
      expect(isSoftDeleteModel('AuditLog')).toBe(false);
    });

    it('should return false for invalid model names', () => {
      expect(isSoftDeleteModel('InvalidModel')).toBe(false);
      expect(isSoftDeleteModel('')).toBe(false);
    });
  });

  describe('SOFT_DELETE_MODELS', () => {
    it('should contain all expected models', () => {
      expect(SOFT_DELETE_MODELS).toContain('User');
      expect(SOFT_DELETE_MODELS).toContain('Festival');
      expect(SOFT_DELETE_MODELS).toContain('Ticket');
      expect(SOFT_DELETE_MODELS).toContain('TicketCategory');
      expect(SOFT_DELETE_MODELS).toContain('Payment');
      expect(SOFT_DELETE_MODELS).toContain('Artist');
      expect(SOFT_DELETE_MODELS).toContain('Vendor');
      expect(SOFT_DELETE_MODELS).toContain('VendorOrder');
    });

    it('should have exactly 8 models', () => {
      expect(SOFT_DELETE_MODELS.length).toBe(8);
    });
  });

  describe('createSoftDeleteFindMiddleware', () => {
    let middleware: Prisma.Middleware;
    let mockNext: jest.Mock;

    beforeEach(() => {
      middleware = createSoftDeleteFindMiddleware();
      mockNext = jest.fn().mockResolvedValue({ id: '1' });
    });

    it('should pass through for non-soft-delete models', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'Zone',
        action: 'findMany',
        args: { where: {} },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(params);
    });

    it('should pass through for non-find operations', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'User',
        action: 'create',
        args: { data: { email: 'test@test.com' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(params);
    });

    it('should add isDeleted: false filter to findMany', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'User',
        action: 'findMany',
        args: { where: { role: 'USER' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            where: expect.objectContaining({
              role: 'USER',
              isDeleted: false,
            }),
          }),
        })
      );
    });

    it('should add isDeleted: false filter to findFirst', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'Ticket',
        action: 'findFirst',
        args: { where: { id: '123' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            where: expect.objectContaining({
              id: '123',
              isDeleted: false,
            }),
          }),
        })
      );
    });

    it('should convert findUnique to findFirst with isDeleted filter', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'Festival',
        action: 'findUnique',
        args: { where: { id: '123' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'findFirst',
          args: expect.objectContaining({
            where: expect.objectContaining({
              id: '123',
              isDeleted: false,
            }),
          }),
        })
      );
    });

    it('should convert findUniqueOrThrow to findFirstOrThrow with isDeleted filter', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'Payment',
        action: 'findUniqueOrThrow',
        args: { where: { id: '123' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'findFirstOrThrow',
          args: expect.objectContaining({
            where: expect.objectContaining({
              id: '123',
              isDeleted: false,
            }),
          }),
        })
      );
    });

    it('should add isDeleted filter to count', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'Vendor',
        action: 'count',
        args: { where: { festivalId: '456' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            where: expect.objectContaining({
              festivalId: '456',
              isDeleted: false,
            }),
          }),
        })
      );
    });

    it('should skip filter when includeDeleted is true', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'User',
        action: 'findMany',
        args: { where: { role: 'ADMIN' }, includeDeleted: true },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            where: { role: 'ADMIN' },
          }),
        })
      );
      // includeDeleted should be removed from args
      expect(mockNext.mock.calls[0][0].args.includeDeleted).toBeUndefined();
    });

    it('should filter only deleted when onlyDeleted is true', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'Artist',
        action: 'findMany',
        args: { where: {}, onlyDeleted: true },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            where: expect.objectContaining({
              isDeleted: true,
            }),
          }),
        })
      );
      // onlyDeleted should be removed from args
      expect(mockNext.mock.calls[0][0].args.onlyDeleted).toBeUndefined();
    });

    it('should handle empty args', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'TicketCategory',
        action: 'findMany',
        args: {},
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            where: { isDeleted: false },
          }),
        })
      );
    });

    it('should handle undefined args', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'VendorOrder',
        action: 'findMany',
        args: undefined,
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            where: { isDeleted: false },
          }),
        })
      );
    });

    it('should add filter to aggregate operation', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'Payment',
        action: 'aggregate',
        args: { where: { status: 'COMPLETED' }, _sum: { amount: true } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            where: expect.objectContaining({
              status: 'COMPLETED',
              isDeleted: false,
            }),
          }),
        })
      );
    });

    it('should add filter to groupBy operation', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'Ticket',
        action: 'groupBy',
        args: { by: ['status'], where: { festivalId: '123' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            where: expect.objectContaining({
              festivalId: '123',
              isDeleted: false,
            }),
          }),
        })
      );
    });
  });

  describe('createSoftDeleteMiddleware', () => {
    let middleware: Prisma.Middleware;
    let mockNext: jest.Mock;

    beforeEach(() => {
      middleware = createSoftDeleteMiddleware();
      mockNext = jest.fn().mockResolvedValue({ id: '1', isDeleted: true });
    });

    it('should pass through for non-soft-delete models', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'Stage',
        action: 'delete',
        args: { where: { id: '123' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(params);
    });

    it('should convert delete to soft delete update', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'User',
        action: 'delete',
        args: { where: { id: '123' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          args: expect.objectContaining({
            where: { id: '123' },
            data: expect.objectContaining({
              isDeleted: true,
              deletedAt: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should convert deleteMany to soft delete updateMany', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'Ticket',
        action: 'deleteMany',
        args: { where: { festivalId: '456', status: 'CANCELLED' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'updateMany',
          args: expect.objectContaining({
            where: { festivalId: '456', status: 'CANCELLED' },
            data: expect.objectContaining({
              isDeleted: true,
              deletedAt: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should perform hard delete when hardDelete is true', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'Festival',
        action: 'delete',
        args: { where: { id: '789' }, hardDelete: true },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      // Should still be delete action
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          args: expect.objectContaining({
            where: { id: '789' },
          }),
        })
      );
      // hardDelete should be removed from args
      expect(mockNext.mock.calls[0][0].args.hardDelete).toBeUndefined();
    });

    it('should perform hard deleteMany when hardDelete is true', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'Payment',
        action: 'deleteMany',
        args: { where: { status: 'FAILED' }, hardDelete: true },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      // Should still be deleteMany action
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'deleteMany',
          args: expect.objectContaining({
            where: { status: 'FAILED' },
          }),
        })
      );
      // hardDelete should be removed from args
      expect(mockNext.mock.calls[0][0].args.hardDelete).toBeUndefined();
    });

    it('should pass through for create operations', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'Artist',
        action: 'create',
        args: { data: { name: 'Test Artist' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(params);
    });

    it('should pass through for update operations', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'Vendor',
        action: 'update',
        args: { where: { id: '123' }, data: { name: 'Updated Vendor' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(params);
    });

    it('should pass through for find operations', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'VendorOrder',
        action: 'findMany',
        args: { where: { status: 'PENDING' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(params);
    });

    it('should set deletedAt to current date on soft delete', async () => {
      const beforeTest = new Date();

      const params: Prisma.MiddlewareParams = {
        model: 'TicketCategory',
        action: 'delete',
        args: { where: { id: '123' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      const afterTest = new Date();
      const deletedAt = mockNext.mock.calls[0][0].args.data.deletedAt;

      expect(deletedAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(deletedAt.getTime()).toBeLessThanOrEqual(afterTest.getTime());
    });

    it('should handle delete with empty args', async () => {
      const params: Prisma.MiddlewareParams = {
        model: 'User',
        action: 'delete',
        args: { where: { id: '123' } },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
        })
      );
    });
  });
});
