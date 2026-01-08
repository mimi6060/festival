/**
 * PromoCodesService Unit Tests
 *
 * Comprehensive tests for promo code functionality including:
 * - Promo code creation
 * - Promo code retrieval (by ID, code, list)
 * - Promo code validation (expiry, usage limit, min amount, festival scope)
 * - Promo code application
 * - Promo code deactivation
 * - Promo code statistics
 * - Discount types (PERCENTAGE, FIXED_AMOUNT)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PromoCodesService } from './promo-codes.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

// Define DiscountType enum locally for tests (matches Prisma schema)
enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

// ============================================================================
// Test Fixtures
// ============================================================================

const mockFestival = {
  id: 'festival-uuid-123',
  name: 'Summer Festival 2026',
  slug: 'summer-festival-2026',
};

const mockPromoCode = {
  id: 'promo-uuid-123',
  code: 'SUMMER20',
  discountType: DiscountType.PERCENTAGE,
  discountValue: 20,
  maxUses: 100,
  currentUses: 50,
  minAmount: 50,
  expiresAt: new Date('2026-12-31T23:59:59Z'),
  isActive: true,
  festivalId: mockFestival.id,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  festival: mockFestival,
};

const mockFixedPromoCode = {
  id: 'promo-uuid-456',
  code: 'FLAT10',
  discountType: DiscountType.FIXED_AMOUNT,
  discountValue: 10,
  maxUses: null,
  currentUses: 25,
  minAmount: null,
  expiresAt: null,
  isActive: true,
  festivalId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  festival: null,
};

const mockExpiredPromoCode = {
  ...mockPromoCode,
  id: 'promo-expired-uuid',
  code: 'EXPIRED20',
  expiresAt: new Date('2024-01-01T00:00:00Z'),
};

const mockExhaustedPromoCode = {
  ...mockPromoCode,
  id: 'promo-exhausted-uuid',
  code: 'EXHAUSTED',
  maxUses: 100,
  currentUses: 100,
};

const mockInactivePromoCode = {
  ...mockPromoCode,
  id: 'promo-inactive-uuid',
  code: 'INACTIVE',
  isActive: false,
};

// ============================================================================
// Mock Setup
// ============================================================================

describe('PromoCodesService', () => {
  let service: PromoCodesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    promoCode: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    festival: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoCodesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PromoCodesService>(PromoCodesService);
    prismaService = module.get(PrismaService);

    // Default transaction implementation
    mockPrismaService.$transaction.mockImplementation(async (callback) => {
      return callback(mockPrismaService);
    });
  });

  // ==========================================================================
  // Create Promo Code Tests
  // ==========================================================================

  describe('create', () => {
    it('should create a promo code successfully', async () => {
      // Arrange
      const createDto = {
        code: 'NEWCODE',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        maxUses: 50,
        minAmount: 30,
        expiresAt: '2026-12-31T23:59:59Z',
        isActive: true,
      };

      mockPrismaService.promoCode.findUnique.mockResolvedValue(null);
      mockPrismaService.promoCode.create.mockResolvedValue({
        ...createDto,
        id: 'new-promo-uuid',
        code: 'NEWCODE',
        currentUses: 0,
        festivalId: null,
        expiresAt: new Date('2026-12-31T23:59:59Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        festival: null,
      });

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result.code).toBe('NEWCODE');
      expect(result.discountType).toBe(DiscountType.PERCENTAGE);
      expect(result.discountValue).toBe(15);
      expect(mockPrismaService.promoCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'NEWCODE',
          discountType: DiscountType.PERCENTAGE,
          discountValue: 15,
        }),
        include: expect.any(Object),
      });
    });

    it('should uppercase the promo code', async () => {
      // Arrange
      const createDto = {
        code: 'lowercase',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
      };

      mockPrismaService.promoCode.findUnique.mockResolvedValue(null);
      mockPrismaService.promoCode.create.mockResolvedValue({
        ...createDto,
        id: 'new-promo-uuid',
        code: 'LOWERCASE',
        currentUses: 0,
        maxUses: null,
        minAmount: null,
        festivalId: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        festival: null,
      });

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result.code).toBe('LOWERCASE');
      expect(mockPrismaService.promoCode.findUnique).toHaveBeenCalledWith({
        where: { code: 'LOWERCASE' },
      });
    });

    it('should throw ConflictException if code already exists', async () => {
      // Arrange
      const createDto = {
        code: 'SUMMER20',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
      };

      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Le code promo "SUMMER20" existe déjà'
      );
    });

    it('should throw BadRequestException if percentage > 100', async () => {
      // Arrange
      const createDto = {
        code: 'INVALID',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 150,
      };

      mockPrismaService.promoCode.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'La réduction en pourcentage ne peut pas dépasser 100%'
      );
    });

    it('should allow percentage of exactly 100', async () => {
      // Arrange
      const createDto = {
        code: 'FREECODE',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 100,
      };

      mockPrismaService.promoCode.findUnique.mockResolvedValue(null);
      mockPrismaService.promoCode.create.mockResolvedValue({
        ...createDto,
        id: 'new-promo-uuid',
        code: 'FREECODE',
        currentUses: 0,
        maxUses: null,
        minAmount: null,
        festivalId: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        festival: null,
      });

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result.discountValue).toBe(100);
    });

    it('should throw NotFoundException if festival does not exist', async () => {
      // Arrange
      const createDto = {
        code: 'FESTCODE',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        festivalId: 'non-existent-festival',
      };

      mockPrismaService.promoCode.findUnique.mockResolvedValue(null);
      mockPrismaService.festival.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should create promo code with festival association', async () => {
      // Arrange
      const createDto = {
        code: 'FEST20',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        festivalId: mockFestival.id,
      };

      mockPrismaService.promoCode.findUnique.mockResolvedValue(null);
      mockPrismaService.festival.findUnique.mockResolvedValue(mockFestival);
      mockPrismaService.promoCode.create.mockResolvedValue({
        ...createDto,
        id: 'new-promo-uuid',
        code: 'FEST20',
        currentUses: 0,
        maxUses: null,
        minAmount: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        festival: mockFestival,
      });

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result.festivalId).toBe(mockFestival.id);
      expect(result.festival).toEqual(mockFestival);
    });

    it('should create FIXED_AMOUNT promo code', async () => {
      // Arrange
      const createDto = {
        code: 'FLAT50',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 50,
      };

      mockPrismaService.promoCode.findUnique.mockResolvedValue(null);
      mockPrismaService.promoCode.create.mockResolvedValue({
        ...createDto,
        id: 'new-promo-uuid',
        code: 'FLAT50',
        currentUses: 0,
        maxUses: null,
        minAmount: null,
        festivalId: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        festival: null,
      });

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result.discountType).toBe(DiscountType.FIXED_AMOUNT);
      expect(result.discountValue).toBe(50);
    });
  });

  // ==========================================================================
  // Find All Tests
  // ==========================================================================

  describe('findAll', () => {
    it('should return paginated list of promo codes', async () => {
      // Arrange
      mockPrismaService.promoCode.findMany.mockResolvedValue([
        mockPromoCode,
        mockFixedPromoCode,
      ]);
      mockPrismaService.promoCode.count.mockResolvedValue(2);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
    });

    it('should filter by festivalId', async () => {
      // Arrange
      mockPrismaService.promoCode.findMany.mockResolvedValue([mockPromoCode]);
      mockPrismaService.promoCode.count.mockResolvedValue(1);

      // Act
      const result = await service.findAll({ festivalId: mockFestival.id });

      // Assert
      expect(mockPrismaService.promoCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            festivalId: mockFestival.id,
          }),
        })
      );
      expect(result.data).toHaveLength(1);
    });

    it('should filter by isActive true', async () => {
      // Arrange
      mockPrismaService.promoCode.findMany.mockResolvedValue([mockPromoCode]);
      mockPrismaService.promoCode.count.mockResolvedValue(1);

      // Act
      await service.findAll({ isActive: true });

      // Assert
      expect(mockPrismaService.promoCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should filter by isActive false', async () => {
      // Arrange
      mockPrismaService.promoCode.findMany.mockResolvedValue([
        mockInactivePromoCode,
      ]);
      mockPrismaService.promoCode.count.mockResolvedValue(1);

      // Act
      await service.findAll({ isActive: false });

      // Assert
      expect(mockPrismaService.promoCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: false,
          }),
        })
      );
    });

    it('should apply pagination parameters', async () => {
      // Arrange
      mockPrismaService.promoCode.findMany.mockResolvedValue([]);
      mockPrismaService.promoCode.count.mockResolvedValue(100);

      // Act
      const result = await service.findAll({ page: 3, limit: 20 });

      // Assert
      expect(mockPrismaService.promoCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (page 3 - 1) * 20
          take: 20,
        })
      );
      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(5);
    });

    it('should return empty array when no promo codes exist', async () => {
      // Arrange
      mockPrismaService.promoCode.findMany.mockResolvedValue([]);
      mockPrismaService.promoCode.count.mockResolvedValue(0);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should order by createdAt desc', async () => {
      // Arrange
      mockPrismaService.promoCode.findMany.mockResolvedValue([]);
      mockPrismaService.promoCode.count.mockResolvedValue(0);

      // Act
      await service.findAll();

      // Assert
      expect(mockPrismaService.promoCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  // ==========================================================================
  // Find One Tests
  // ==========================================================================

  describe('findOne', () => {
    it('should return promo code by ID', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

      // Act
      const result = await service.findOne(mockPromoCode.id);

      // Assert
      expect(result.id).toBe(mockPromoCode.id);
      expect(result.code).toBe(mockPromoCode.code);
    });

    it('should throw NotFoundException if promo code not found', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should include festival relation', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

      // Act
      const result = await service.findOne(mockPromoCode.id);

      // Assert
      expect(result.festival).toEqual(mockFestival);
    });
  });

  // ==========================================================================
  // Find By Code Tests
  // ==========================================================================

  describe('findByCode', () => {
    it('should return promo code by code (case insensitive)', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

      // Act
      const result = await service.findByCode('summer20');

      // Assert
      expect(result.code).toBe('SUMMER20');
      expect(mockPrismaService.promoCode.findUnique).toHaveBeenCalledWith({
        where: { code: 'SUMMER20' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if code not found', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByCode('INVALID')).rejects.toThrow(
        NotFoundException
      );
      await expect(service.findByCode('INVALID')).rejects.toThrow(
        'Code promo "INVALID" non trouvé'
      );
    });
  });

  // ==========================================================================
  // Update Tests
  // ==========================================================================

  describe('update', () => {
    it('should update promo code successfully', async () => {
      // Arrange
      const updateDto = { discountValue: 25 };
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);
      mockPrismaService.promoCode.update.mockResolvedValue({
        ...mockPromoCode,
        discountValue: 25,
      });

      // Act
      const result = await service.update(mockPromoCode.id, updateDto);

      // Assert
      expect(result.discountValue).toBe(25);
    });

    it('should uppercase code when updating', async () => {
      // Arrange
      const updateDto = { code: 'newcode' };
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);
      mockPrismaService.promoCode.findFirst.mockResolvedValue(null);
      mockPrismaService.promoCode.update.mockResolvedValue({
        ...mockPromoCode,
        code: 'NEWCODE',
      });

      // Act
      const result = await service.update(mockPromoCode.id, updateDto);

      // Assert
      expect(result.code).toBe('NEWCODE');
    });

    it('should throw ConflictException if new code already exists', async () => {
      // Arrange
      const updateDto = { code: 'FLAT10' };
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);
      mockPrismaService.promoCode.findFirst.mockResolvedValue(mockFixedPromoCode);

      // Act & Assert
      await expect(
        service.update(mockPromoCode.id, updateDto)
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if promo code not found', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('non-existent', { discountValue: 10 })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if percentage > 100 on update', async () => {
      // Arrange
      const updateDto = {
        discountType: DiscountType.PERCENTAGE,
        discountValue: 150,
      };
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

      // Act & Assert
      await expect(
        service.update(mockPromoCode.id, updateDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow same code to be kept', async () => {
      // Arrange
      const updateDto = { code: 'SUMMER20' };
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);
      mockPrismaService.promoCode.findFirst.mockResolvedValue(null);
      mockPrismaService.promoCode.update.mockResolvedValue(mockPromoCode);

      // Act
      const result = await service.update(mockPromoCode.id, updateDto);

      // Assert
      expect(result.code).toBe('SUMMER20');
    });

    it('should update isActive to deactivate', async () => {
      // Arrange
      const updateDto = { isActive: false };
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);
      mockPrismaService.promoCode.update.mockResolvedValue({
        ...mockPromoCode,
        isActive: false,
      });

      // Act
      const result = await service.update(mockPromoCode.id, updateDto);

      // Assert
      expect(result.isActive).toBe(false);
    });
  });

  // ==========================================================================
  // Remove Tests
  // ==========================================================================

  describe('remove', () => {
    it('should delete promo code successfully', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);
      mockPrismaService.promoCode.delete.mockResolvedValue(mockPromoCode);

      // Act
      const result = await service.remove(mockPromoCode.id);

      // Assert
      expect(result.id).toBe(mockPromoCode.id);
      expect(mockPrismaService.promoCode.delete).toHaveBeenCalledWith({
        where: { id: mockPromoCode.id },
      });
    });

    it('should throw NotFoundException if promo code not found', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ==========================================================================
  // Validate Promo Code Tests
  // ==========================================================================

  describe('validate', () => {
    describe('basic validation', () => {
      it('should return valid result for valid promo code', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

        // Act
        const result = await service.validate({
          code: 'SUMMER20',
          amount: 100,
          festivalId: mockFestival.id,
        });

        // Assert
        expect(result.valid).toBe(true);
        expect(result.promoCode?.code).toBe('SUMMER20');
        expect(result.discountAmount).toBe(20); // 20% of 100
        expect(result.finalAmount).toBe(80);
      });

      it('should return invalid for non-existent code', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(null);

        // Act
        const result = await service.validate({
          code: 'INVALID',
          amount: 100,
        });

        // Assert
        expect(result.valid).toBe(false);
        expect(result.error).toContain('invalide');
      });

      it('should be case insensitive', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

        // Act
        const result = await service.validate({
          code: 'summer20',
          amount: 100,
          festivalId: mockFestival.id,
        });

        // Assert
        expect(result.valid).toBe(true);
        expect(mockPrismaService.promoCode.findUnique).toHaveBeenCalledWith({
          where: { code: 'SUMMER20' },
        });
      });
    });

    describe('expiry validation', () => {
      it('should return invalid for expired code', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(
          mockExpiredPromoCode
        );

        // Act
        const result = await service.validate({
          code: 'EXPIRED20',
          amount: 100,
        });

        // Assert
        expect(result.valid).toBe(false);
        expect(result.error).toContain('expiré');
      });

      it('should accept code without expiry date', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(
          mockFixedPromoCode
        );

        // Act
        const result = await service.validate({
          code: 'FLAT10',
          amount: 100,
        });

        // Assert
        expect(result.valid).toBe(true);
      });
    });

    describe('usage limit validation', () => {
      it('should return invalid for exhausted code', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(
          mockExhaustedPromoCode
        );

        // Act
        const result = await service.validate({
          code: 'EXHAUSTED',
          amount: 100,
        });

        // Assert
        expect(result.valid).toBe(false);
        expect(result.error).toContain("maximum d'utilisations");
      });

      it('should accept code with unlimited uses', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(
          mockFixedPromoCode
        );

        // Act
        const result = await service.validate({
          code: 'FLAT10',
          amount: 100,
        });

        // Assert
        expect(result.valid).toBe(true);
      });

      it('should accept code not yet at max uses', async () => {
        // Arrange
        const codeNearLimit = {
          ...mockPromoCode,
          currentUses: 99,
          maxUses: 100,
        };
        mockPrismaService.promoCode.findUnique.mockResolvedValue(codeNearLimit);

        // Act
        const result = await service.validate({
          code: 'SUMMER20',
          amount: 100,
          festivalId: mockFestival.id,
        });

        // Assert
        expect(result.valid).toBe(true);
      });
    });

    describe('minimum amount validation', () => {
      it('should return invalid if amount below minimum', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

        // Act
        const result = await service.validate({
          code: 'SUMMER20',
          amount: 30, // Below minAmount of 50
          festivalId: mockFestival.id,
        });

        // Assert
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Montant minimum');
      });

      it('should accept amount equal to minimum', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

        // Act
        const result = await service.validate({
          code: 'SUMMER20',
          amount: 50, // Equal to minAmount
          festivalId: mockFestival.id,
        });

        // Assert
        expect(result.valid).toBe(true);
      });

      it('should accept code without minimum amount requirement', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(
          mockFixedPromoCode
        );

        // Act
        const result = await service.validate({
          code: 'FLAT10',
          amount: 10,
        });

        // Assert
        expect(result.valid).toBe(true);
      });
    });

    describe('festival scope validation', () => {
      it('should return invalid for wrong festival', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

        // Act
        const result = await service.validate({
          code: 'SUMMER20',
          amount: 100,
          festivalId: 'different-festival-id',
        });

        // Assert
        expect(result.valid).toBe(false);
        expect(result.error).toContain("n'est pas valable pour ce festival");
      });

      it('should accept global code for any festival', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(
          mockFixedPromoCode
        );

        // Act
        const result = await service.validate({
          code: 'FLAT10',
          amount: 100,
          festivalId: 'any-festival-id',
        });

        // Assert
        expect(result.valid).toBe(true);
      });

      it('should accept festival-scoped code without festivalId in request', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

        // Act
        const result = await service.validate({
          code: 'SUMMER20',
          amount: 100,
          // No festivalId in request
        });

        // Assert
        expect(result.valid).toBe(true);
      });
    });

    describe('inactive code validation', () => {
      it('should return invalid for inactive code', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(
          mockInactivePromoCode
        );

        // Act
        const result = await service.validate({
          code: 'INACTIVE',
          amount: 100,
        });

        // Assert
        expect(result.valid).toBe(false);
        expect(result.error).toContain("n'est plus actif");
      });
    });

    describe('discount calculation - PERCENTAGE', () => {
      it('should calculate percentage discount correctly', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

        // Act
        const result = await service.validate({
          code: 'SUMMER20',
          amount: 150,
          festivalId: mockFestival.id,
        });

        // Assert
        expect(result.discountAmount).toBe(30); // 20% of 150
        expect(result.finalAmount).toBe(120);
      });

      it('should calculate 100% discount', async () => {
        // Arrange
        const fullDiscountCode = {
          ...mockPromoCode,
          discountValue: 100,
        };
        mockPrismaService.promoCode.findUnique.mockResolvedValue(
          fullDiscountCode
        );

        // Act
        const result = await service.validate({
          code: 'SUMMER20',
          amount: 100,
          festivalId: mockFestival.id,
        });

        // Assert
        expect(result.discountAmount).toBe(100);
        expect(result.finalAmount).toBe(0);
      });

      it('should round discount to 2 decimal places', async () => {
        // Arrange
        const oddPercentCode = {
          ...mockPromoCode,
          discountValue: 33,
        };
        mockPrismaService.promoCode.findUnique.mockResolvedValue(oddPercentCode);

        // Act
        const result = await service.validate({
          code: 'SUMMER20',
          amount: 100,
          festivalId: mockFestival.id,
        });

        // Assert
        expect(result.discountAmount).toBe(33);
        expect(result.finalAmount).toBe(67);
      });
    });

    describe('discount calculation - FIXED_AMOUNT', () => {
      it('should calculate fixed amount discount correctly', async () => {
        // Arrange
        mockPrismaService.promoCode.findUnique.mockResolvedValue(
          mockFixedPromoCode
        );

        // Act
        const result = await service.validate({
          code: 'FLAT10',
          amount: 100,
        });

        // Assert
        expect(result.discountAmount).toBe(10);
        expect(result.finalAmount).toBe(90);
      });

      it('should cap fixed discount at order amount', async () => {
        // Arrange
        const highFixedCode = {
          ...mockFixedPromoCode,
          discountValue: 100,
        };
        mockPrismaService.promoCode.findUnique.mockResolvedValue(highFixedCode);

        // Act
        const result = await service.validate({
          code: 'FLAT10',
          amount: 50,
        });

        // Assert
        expect(result.discountAmount).toBe(50); // Capped at order amount
        expect(result.finalAmount).toBe(0);
      });

      it('should return 0 final amount when discount exceeds order', async () => {
        // Arrange
        const highFixedCode = {
          ...mockFixedPromoCode,
          discountValue: 200,
        };
        mockPrismaService.promoCode.findUnique.mockResolvedValue(highFixedCode);

        // Act
        const result = await service.validate({
          code: 'FLAT10',
          amount: 100,
        });

        // Assert
        expect(result.discountAmount).toBe(100);
        expect(result.finalAmount).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Apply Promo Code Tests
  // ==========================================================================

  describe('apply', () => {
    it('should apply promo code and increment usage', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);
      mockPrismaService.promoCode.update.mockResolvedValue({
        ...mockPromoCode,
        currentUses: 51,
      });

      // Act
      const result = await service.apply({
        code: 'SUMMER20',
        amount: 100,
        festivalId: mockFestival.id,
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should return invalid for non-existent code', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.apply({
        code: 'INVALID',
        amount: 100,
      });

      // Assert
      expect(result.valid).toBe(false);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should return invalid if validation fails', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(
        mockExpiredPromoCode
      );

      // Act
      const result = await service.apply({
        code: 'EXPIRED20',
        amount: 100,
      });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expiré');
    });

    it('should handle race condition with transaction', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique
        .mockResolvedValueOnce(mockPromoCode) // First call for validation
        .mockResolvedValueOnce(mockExhaustedPromoCode); // Second call in transaction - now exhausted

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        // Simulate race condition where code gets exhausted during transaction
        const txMock = {
          promoCode: {
            findUnique: jest.fn().mockResolvedValue(mockExhaustedPromoCode),
            update: jest.fn(),
          },
        };
        return callback(txMock);
      });

      // Act
      const result = await service.apply({
        code: 'SUMMER20',
        amount: 100,
        festivalId: mockFestival.id,
      });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toContain("maximum d'utilisations");
    });

    it('should handle transaction error gracefully', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const txMock = {
          promoCode: {
            findUnique: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
          },
        };
        return callback(txMock);
      });

      // Act
      const result = await service.apply({
        code: 'SUMMER20',
        amount: 100,
        festivalId: mockFestival.id,
      });

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Code promo non trouvé');
    });

    it('should rethrow unexpected errors', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);
      mockPrismaService.$transaction.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(
        service.apply({
          code: 'SUMMER20',
          amount: 100,
          festivalId: mockFestival.id,
        })
      ).rejects.toThrow('Database connection failed');
    });
  });

  // ==========================================================================
  // Get Stats Tests
  // ==========================================================================

  describe('getStats', () => {
    it('should return statistics for promo code', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

      // Act
      const result = await service.getStats(mockPromoCode.id);

      // Assert
      expect(result.id).toBe(mockPromoCode.id);
      expect(result.code).toBe('SUMMER20');
      expect(result.currentUses).toBe(50);
      expect(result.maxUses).toBe(100);
      expect(result.usageRate).toBe(50);
      expect(result.isActive).toBe(true);
      expect(result.isExpired).toBe(false);
      expect(result.isExhausted).toBe(false);
      expect(result.remainingUses).toBe(50);
    });

    it('should throw NotFoundException for non-existent code', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getStats('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should correctly identify expired code', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(
        mockExpiredPromoCode
      );

      // Act
      const result = await service.getStats(mockExpiredPromoCode.id);

      // Assert
      expect(result.isExpired).toBe(true);
    });

    it('should correctly identify exhausted code', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(
        mockExhaustedPromoCode
      );

      // Act
      const result = await service.getStats(mockExhaustedPromoCode.id);

      // Assert
      expect(result.isExhausted).toBe(true);
      expect(result.remainingUses).toBe(0);
    });

    it('should return null remainingUses for unlimited code', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(
        mockFixedPromoCode
      );

      // Act
      const result = await service.getStats(mockFixedPromoCode.id);

      // Assert
      expect(result.maxUses).toBeNull();
      expect(result.remainingUses).toBeNull();
      expect(result.usageRate).toBe(0);
    });

    it('should calculate usage rate correctly', async () => {
      // Arrange
      const partiallyUsedCode = {
        ...mockPromoCode,
        currentUses: 75,
        maxUses: 100,
      };
      mockPrismaService.promoCode.findUnique.mockResolvedValue(partiallyUsedCode);

      // Act
      const result = await service.getStats(partiallyUsedCode.id);

      // Assert
      expect(result.usageRate).toBe(75);
      expect(result.remainingUses).toBe(25);
    });

    it('should correctly identify inactive code', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(
        mockInactivePromoCode
      );

      // Act
      const result = await service.getStats(mockInactivePromoCode.id);

      // Assert
      expect(result.isActive).toBe(false);
    });

    it('should return isExpired false for code without expiry', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(
        mockFixedPromoCode
      );

      // Act
      const result = await service.getStats(mockFixedPromoCode.id);

      // Assert
      expect(result.isExpired).toBe(false);
    });
  });

  // ==========================================================================
  // Edge Cases and Special Scenarios
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle zero amount validation', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

      // Act
      const result = await service.validate({
        code: 'SUMMER20',
        amount: 0,
        festivalId: mockFestival.id,
      });

      // Assert - minAmount check should fail (0 < 50)
      expect(result.valid).toBe(false);
    });

    it('should handle very large amounts', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

      // Act
      const result = await service.validate({
        code: 'SUMMER20',
        amount: 1000000,
        festivalId: mockFestival.id,
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(200000); // 20% of 1000000
      expect(result.finalAmount).toBe(800000);
    });

    it('should handle decimal amounts', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(mockPromoCode);

      // Act
      const result = await service.validate({
        code: 'SUMMER20',
        amount: 99.99,
        festivalId: mockFestival.id,
      });

      // Assert
      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(20);
      expect(result.finalAmount).toBe(79.99);
    });

    it('should handle special characters in code search', async () => {
      // Arrange
      mockPrismaService.promoCode.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.validate({
        code: 'TEST-CODE_123',
        amount: 100,
      });

      // Assert
      expect(result.valid).toBe(false);
      expect(mockPrismaService.promoCode.findUnique).toHaveBeenCalledWith({
        where: { code: 'TEST-CODE_123' },
      });
    });
  });
});
