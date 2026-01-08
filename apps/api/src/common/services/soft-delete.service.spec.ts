/**
 * Soft Delete Service Tests
 *
 * Tests for the common soft delete service functionality.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SoftDeleteService } from './soft-delete.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SOFT_DELETE_MODELS } from '../../prisma/soft-delete.middleware';

describe('SoftDeleteService', () => {
  let service: SoftDeleteService;
  let prisma: any;

  // Create shared mock functions that persist across tests
  const createMockPrismaModel = () => ({
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  });

  const mockPrisma: any = {
    user: createMockPrismaModel(),
    festival: createMockPrismaModel(),
    ticket: createMockPrismaModel(),
    ticketCategory: createMockPrismaModel(),
    payment: createMockPrismaModel(),
    artist: createMockPrismaModel(),
    vendor: createMockPrismaModel(),
    vendorOrder: createMockPrismaModel(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoftDeleteService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SoftDeleteService>(SoftDeleteService);
    prisma = mockPrisma;

    // Reset all mocks
    Object.values(mockPrisma).forEach((model: any) => {
      Object.values(model).forEach((method) => {
        if (typeof method === 'function' && 'mockReset' in method) {
          (method as jest.Mock).mockReset();
        }
      });
    });
  });

  describe('isSoftDeleteModel', () => {
    it('should return true for all soft delete models', () => {
      SOFT_DELETE_MODELS.forEach((model) => {
        expect(service.isSoftDeleteModel(model)).toBe(true);
      });
    });

    it('should return false for non-soft-delete models', () => {
      expect(service.isSoftDeleteModel('Zone')).toBe(false);
      expect(service.isSoftDeleteModel('Stage')).toBe(false);
      expect(service.isSoftDeleteModel('InvalidModel')).toBe(false);
    });
  });

  describe('softDelete', () => {
    const testId = 'test-user-id';

    it('should soft delete a user successfully', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: testId,
        email: 'test@test.com',
        isDeleted: false,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: testId,
        isDeleted: true,
        deletedAt: new Date(),
      });

      const result = await service.softDelete('User', testId);

      expect(result.success).toBe(true);
      expect(result.id).toBe(testId);
      expect(result.deletedAt).toBeInstanceOf(Date);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: testId },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if record does not exist', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.softDelete('User', testId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if record is already deleted', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: testId,
        isDeleted: true,
      });

      await expect(service.softDelete('User', testId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid model', async () => {
      await expect(service.softDelete('InvalidModel' as any, testId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('restore', () => {
    const testId = 'test-festival-id';

    it('should restore a soft-deleted festival successfully', async () => {
      (prisma.festival.findFirst as jest.Mock).mockResolvedValue({
        id: testId,
        name: 'Test Festival',
        isDeleted: true,
        deletedAt: new Date(),
      });
      (prisma.festival.update as jest.Mock).mockResolvedValue({
        id: testId,
        isDeleted: false,
        deletedAt: null,
      });

      const result = await service.restore('Festival', testId);

      expect(result.success).toBe(true);
      expect(result.id).toBe(testId);
      expect(result.restoredAt).toBeInstanceOf(Date);
      expect(prisma.festival.update).toHaveBeenCalledWith({
        where: { id: testId },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });
    });

    it('should throw NotFoundException if record does not exist', async () => {
      (prisma.festival.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.restore('Festival', testId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if record is not deleted', async () => {
      (prisma.festival.findFirst as jest.Mock).mockResolvedValue({
        id: testId,
        isDeleted: false,
      });

      await expect(service.restore('Festival', testId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid model', async () => {
      await expect(service.restore('InvalidModel' as any, testId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('hardDelete', () => {
    const testId = 'test-ticket-id';

    it('should permanently delete a record', async () => {
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue({
        id: testId,
        isDeleted: true,
      });
      (prisma.ticket.delete as jest.Mock).mockResolvedValue({
        id: testId,
      });

      const result = await service.hardDelete('Ticket', testId);

      expect(result.success).toBe(true);
      expect(prisma.ticket.delete).toHaveBeenCalledWith({
        where: { id: testId },
        hardDelete: true,
      });
    });

    it('should throw NotFoundException if record does not exist', async () => {
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.hardDelete('Ticket', testId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid model', async () => {
      await expect(service.hardDelete('InvalidModel' as any, testId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('findDeleted', () => {
    it('should return paginated soft-deleted records', async () => {
      const mockRecords = [
        { id: '1', isDeleted: true },
        { id: '2', isDeleted: true },
      ];
      (prisma.payment.findMany as jest.Mock).mockResolvedValue(mockRecords);
      (prisma.payment.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findDeleted<{ id: string }>('Payment', {
        skip: 0,
        take: 10,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: { isDeleted: true },
        skip: 0,
        take: 10,
        orderBy: { deletedAt: 'desc' },
        includeDeleted: true,
      });
    });

    it('should apply additional where filters', async () => {
      (prisma.artist.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.artist.count as jest.Mock).mockResolvedValue(0);

      await service.findDeleted('Artist', {
        where: { genre: 'Rock' },
      });

      expect(prisma.artist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isDeleted: true, genre: 'Rock' },
        })
      );
    });

    it('should throw BadRequestException for invalid model', async () => {
      await expect(service.findDeleted('InvalidModel' as any, {})).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('countAllDeleted', () => {
    it('should return counts for all soft delete models', async () => {
      // Setup counts for each model
      (prisma.user.count as jest.Mock).mockResolvedValue(5);
      (prisma.festival.count as jest.Mock).mockResolvedValue(2);
      (prisma.ticket.count as jest.Mock).mockResolvedValue(10);
      (prisma.ticketCategory.count as jest.Mock).mockResolvedValue(3);
      (prisma.payment.count as jest.Mock).mockResolvedValue(8);
      (prisma.artist.count as jest.Mock).mockResolvedValue(1);
      (prisma.vendor.count as jest.Mock).mockResolvedValue(4);
      (prisma.vendorOrder.count as jest.Mock).mockResolvedValue(6);

      const result = await service.countAllDeleted();

      expect(result).toHaveLength(8);
      expect(result.find((r) => r.model === 'User')?.count).toBe(5);
      expect(result.find((r) => r.model === 'Festival')?.count).toBe(2);
      expect(result.find((r) => r.model === 'Ticket')?.count).toBe(10);
    });
  });

  describe('restoreAll', () => {
    it('should restore all soft-deleted records for a model', async () => {
      (prisma.vendor.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await service.restoreAll('Vendor');

      expect(result.count).toBe(5);
      expect(prisma.vendor.updateMany).toHaveBeenCalledWith({
        where: { isDeleted: true },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
        includeDeleted: true,
      });
    });

    it('should throw BadRequestException for invalid model', async () => {
      await expect(service.restoreAll('InvalidModel' as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('purgeDeleted', () => {
    it('should permanently delete all soft-deleted records', async () => {
      (prisma.vendorOrder.count as jest.Mock).mockResolvedValue(3);
      (prisma.vendorOrder.deleteMany as jest.Mock).mockResolvedValue({
        count: 3,
      });

      const result = await service.purgeDeleted('VendorOrder');

      expect(result.count).toBe(3);
      expect(prisma.vendorOrder.deleteMany).toHaveBeenCalledWith({
        where: { isDeleted: true },
        hardDelete: true,
        includeDeleted: true,
      });
    });

    it('should return zero count if no records to purge', async () => {
      (prisma.ticketCategory.count as jest.Mock).mockResolvedValue(0);

      const result = await service.purgeDeleted('TicketCategory');

      expect(result.count).toBe(0);
      expect(prisma.ticketCategory.deleteMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid model', async () => {
      await expect(service.purgeDeleted('InvalidModel' as any)).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
