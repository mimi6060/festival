/**
 * FAQ Service Unit Tests
 *
 * Comprehensive tests for FAQ functionality including:
 * - FAQ Category CRUD
 * - FAQ Item CRUD
 * - Category reordering
 * - Item reordering
 * - Public FAQ access
 * - Search functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FaqService } from './faq.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  CreateFaqCategoryDto,
  UpdateFaqCategoryDto,
  CreateFaqItemDto,
  UpdateFaqItemDto,
  FaqQueryDto,
} from '../dto/faq.dto';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockCategory1 = {
  id: 'category-1',
  name: 'Billetterie',
  order: 0,
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-01T10:00:00Z'),
};

const mockCategory2 = {
  id: 'category-2',
  name: 'Paiements',
  order: 1,
  createdAt: new Date('2026-01-02T10:00:00Z'),
  updatedAt: new Date('2026-01-02T10:00:00Z'),
};

const mockCategory3 = {
  id: 'category-3',
  name: 'Cashless',
  order: 2,
  createdAt: new Date('2026-01-03T10:00:00Z'),
  updatedAt: new Date('2026-01-03T10:00:00Z'),
};

const mockFaqItem1 = {
  id: 'faq-1',
  categoryId: mockCategory1.id,
  question: 'Comment acheter un billet ?',
  answer: 'Vous pouvez acheter un billet en ligne sur notre site...',
  order: 0,
  isActive: true,
  createdAt: new Date('2026-01-01T11:00:00Z'),
  updatedAt: new Date('2026-01-01T11:00:00Z'),
};

const mockFaqItem2 = {
  id: 'faq-2',
  categoryId: mockCategory1.id,
  question: 'Puis-je annuler mon billet ?',
  answer: 'Oui, vous pouvez annuler votre billet...',
  order: 1,
  isActive: true,
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
};

const mockFaqItem3 = {
  id: 'faq-3',
  categoryId: mockCategory2.id,
  question: 'Quels moyens de paiement acceptez-vous ?',
  answer: 'Nous acceptons Visa, Mastercard, et PayPal...',
  order: 0,
  isActive: true,
  createdAt: new Date('2026-01-02T11:00:00Z'),
  updatedAt: new Date('2026-01-02T11:00:00Z'),
};

const mockInactiveItem = {
  id: 'faq-4',
  categoryId: mockCategory1.id,
  question: 'Question obsolete',
  answer: 'Reponse obsolete...',
  order: 2,
  isActive: false,
  createdAt: new Date('2026-01-01T13:00:00Z'),
  updatedAt: new Date('2026-01-01T13:00:00Z'),
};

// ============================================================================
// Test Suite
// ============================================================================

describe('FaqService', () => {
  let service: FaqService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    faqCategory: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    faqItem: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaqService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FaqService>(FaqService);
    prismaService = module.get(PrismaService);
  });

  // ==========================================================================
  // FAQ Category CRUD Tests
  // ==========================================================================

  describe('createCategory', () => {
    it('should create a category successfully', async () => {
      // Arrange
      const createDto: CreateFaqCategoryDto = { name: 'Nouvelle Category' };
      mockPrismaService.faqCategory.findFirst.mockResolvedValue({ order: 2 });
      mockPrismaService.faqCategory.create.mockResolvedValue({
        ...mockCategory1,
        id: 'new-category',
        name: createDto.name,
        order: 3,
      });

      // Act
      const result = await service.createCategory(createDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
    });

    it('should use specified order if provided', async () => {
      // Arrange
      const createDto: CreateFaqCategoryDto = { name: 'Nouvelle Category', order: 5 };
      mockPrismaService.faqCategory.create.mockResolvedValue({
        ...mockCategory1,
        id: 'new-category',
        name: createDto.name,
        order: 5,
      });

      // Act
      await service.createCategory(createDto);

      // Assert
      expect(mockPrismaService.faqCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          order: 5,
        }),
      });
    });

    it('should auto-calculate order if not provided', async () => {
      // Arrange
      const createDto: CreateFaqCategoryDto = { name: 'Nouvelle Category' };
      mockPrismaService.faqCategory.findFirst.mockResolvedValue({ order: 2 });
      mockPrismaService.faqCategory.create.mockResolvedValue({
        ...mockCategory1,
        order: 3,
      });

      // Act
      await service.createCategory(createDto);

      // Assert
      expect(mockPrismaService.faqCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          order: 3, // last order (2) + 1
        }),
      });
    });

    it('should start at order 0 for first category', async () => {
      // Arrange
      const createDto: CreateFaqCategoryDto = { name: 'First Category' };
      mockPrismaService.faqCategory.findFirst.mockResolvedValue(null);
      mockPrismaService.faqCategory.create.mockResolvedValue({
        ...mockCategory1,
        order: 0,
      });

      // Act
      await service.createCategory(createDto);

      // Assert
      expect(mockPrismaService.faqCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          order: 0,
        }),
      });
    });
  });

  describe('findAllCategories', () => {
    it('should return all categories ordered by order', async () => {
      // Arrange
      mockPrismaService.faqCategory.findMany.mockResolvedValue([
        mockCategory1,
        mockCategory2,
        mockCategory3,
      ]);

      // Act
      const result = await service.findAllCategories();

      // Assert
      expect(result).toHaveLength(3);
      expect(mockPrismaService.faqCategory.findMany).toHaveBeenCalledWith({
        orderBy: { order: 'asc' },
        include: undefined,
      });
    });

    it('should include items when includeItems is true', async () => {
      // Arrange
      const categoryWithItems = {
        ...mockCategory1,
        items: [mockFaqItem1, mockFaqItem2],
      };
      mockPrismaService.faqCategory.findMany.mockResolvedValue([categoryWithItems]);

      // Act
      const result = await service.findAllCategories(true);

      // Assert
      expect(result[0].items).toHaveLength(2);
      expect(mockPrismaService.faqCategory.findMany).toHaveBeenCalledWith({
        orderBy: { order: 'asc' },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
          },
        },
      });
    });

    it('should return empty array when no categories exist', async () => {
      // Arrange
      mockPrismaService.faqCategory.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findAllCategories();

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findCategoryById', () => {
    it('should return category by ID with items', async () => {
      // Arrange
      const categoryWithItems = {
        ...mockCategory1,
        items: [mockFaqItem1, mockFaqItem2],
      };
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(categoryWithItems);

      // Act
      const result = await service.findCategoryById(mockCategory1.id);

      // Assert
      expect(result.id).toBe(mockCategory1.id);
      expect(result.items).toHaveLength(2);
    });

    it('should throw NotFoundException when category not found', async () => {
      // Arrange
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findCategoryById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateCategory', () => {
    it('should update category successfully', async () => {
      // Arrange
      const updateDto: UpdateFaqCategoryDto = { name: 'Updated Name' };
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(mockCategory1);
      mockPrismaService.faqCategory.update.mockResolvedValue({
        ...mockCategory1,
        name: 'Updated Name',
      });

      // Act
      const result = await service.updateCategory(mockCategory1.id, updateDto);

      // Assert
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when category not found', async () => {
      // Arrange
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateCategory('non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update order when specified', async () => {
      // Arrange
      const updateDto: UpdateFaqCategoryDto = { order: 10 };
      const categoryWithItems = { ...mockCategory1, items: [] };
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(categoryWithItems);
      mockPrismaService.faqCategory.update.mockResolvedValue({
        ...mockCategory1,
        order: 10,
      });

      // Act
      await service.updateCategory(mockCategory1.id, updateDto);

      // Assert
      expect(mockPrismaService.faqCategory.update).toHaveBeenCalledWith({
        where: { id: mockCategory1.id },
        data: { order: 10 },
      });
    });
  });

  describe('deleteCategory', () => {
    it('should delete category successfully when empty', async () => {
      // Arrange
      const categoryWithItems = { ...mockCategory1, items: [] };
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(categoryWithItems);
      mockPrismaService.faqItem.count.mockResolvedValue(0);
      mockPrismaService.faqCategory.delete.mockResolvedValue(mockCategory1);

      // Act
      await service.deleteCategory(mockCategory1.id);

      // Assert
      expect(mockPrismaService.faqCategory.delete).toHaveBeenCalledWith({
        where: { id: mockCategory1.id },
      });
    });

    it('should throw BadRequestException when category has items', async () => {
      // Arrange
      const categoryWithItems = { ...mockCategory1, items: [mockFaqItem1] };
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(categoryWithItems);
      mockPrismaService.faqItem.count.mockResolvedValue(2);

      // Act & Assert
      await expect(service.deleteCategory(mockCategory1.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when category not found', async () => {
      // Arrange
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteCategory('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reorderCategories', () => {
    it('should reorder categories successfully', async () => {
      // Arrange
      const categoryIds = [mockCategory3.id, mockCategory1.id, mockCategory2.id];
      mockPrismaService.$transaction.mockResolvedValue([]);
      mockPrismaService.faqCategory.findMany.mockResolvedValue([
        { ...mockCategory3, order: 0 },
        { ...mockCategory1, order: 1 },
        { ...mockCategory2, order: 2 },
      ]);

      // Act
      const result = await service.reorderCategories(categoryIds);

      // Assert
      expect(result[0].order).toBe(0);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should assign correct order based on array position', async () => {
      // Arrange
      const categoryIds = [mockCategory2.id, mockCategory1.id];
      mockPrismaService.$transaction.mockImplementation((updates) => Promise.all(updates));
      mockPrismaService.faqCategory.update.mockResolvedValue({});
      mockPrismaService.faqCategory.findMany.mockResolvedValue([]);

      // Act
      await service.reorderCategories(categoryIds);

      // Assert
      expect(mockPrismaService.$transaction).toHaveBeenCalledWith([
        expect.any(Object), // update for first category with order 0
        expect.any(Object), // update for second category with order 1
      ]);
    });
  });

  // ==========================================================================
  // FAQ Item CRUD Tests
  // ==========================================================================

  describe('createItem', () => {
    it('should create an item successfully', async () => {
      // Arrange
      const createDto: CreateFaqItemDto = {
        categoryId: mockCategory1.id,
        question: 'New question?',
        answer: 'New answer.',
      };
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(mockCategory1);
      mockPrismaService.faqItem.findFirst.mockResolvedValue({ order: 1 });
      mockPrismaService.faqItem.create.mockResolvedValue({
        ...mockFaqItem1,
        id: 'new-item',
        question: createDto.question,
        answer: createDto.answer,
        order: 2,
      });

      // Act
      const result = await service.createItem(createDto);

      // Assert
      expect(result.question).toBe(createDto.question);
    });

    it('should throw NotFoundException when category not found', async () => {
      // Arrange
      const createDto: CreateFaqItemDto = {
        categoryId: 'non-existent',
        question: 'Question?',
        answer: 'Answer.',
      };
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createItem(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should use default isActive true', async () => {
      // Arrange
      const createDto: CreateFaqItemDto = {
        categoryId: mockCategory1.id,
        question: 'Question?',
        answer: 'Answer.',
      };
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(mockCategory1);
      mockPrismaService.faqItem.findFirst.mockResolvedValue(null);
      mockPrismaService.faqItem.create.mockResolvedValue({
        ...mockFaqItem1,
        isActive: true,
      });

      // Act
      await service.createItem(createDto);

      // Assert
      expect(mockPrismaService.faqItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: true,
        }),
      });
    });

    it('should auto-calculate order within category', async () => {
      // Arrange
      const createDto: CreateFaqItemDto = {
        categoryId: mockCategory1.id,
        question: 'Question?',
        answer: 'Answer.',
      };
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(mockCategory1);
      mockPrismaService.faqItem.findFirst.mockResolvedValue({ order: 5 });
      mockPrismaService.faqItem.create.mockResolvedValue({
        ...mockFaqItem1,
        order: 6,
      });

      // Act
      await service.createItem(createDto);

      // Assert
      expect(mockPrismaService.faqItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          order: 6,
        }),
      });
    });

    it('should allow specifying isActive as false', async () => {
      // Arrange
      const createDto: CreateFaqItemDto = {
        categoryId: mockCategory1.id,
        question: 'Draft question?',
        answer: 'Draft answer.',
        isActive: false,
      };
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(mockCategory1);
      mockPrismaService.faqItem.findFirst.mockResolvedValue(null);
      mockPrismaService.faqItem.create.mockResolvedValue({
        ...mockFaqItem1,
        isActive: false,
      });

      // Act
      await service.createItem(createDto);

      // Assert
      expect(mockPrismaService.faqItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: false,
        }),
      });
    });
  });

  describe('findAllItems', () => {
    it('should return all active items by default', async () => {
      // Arrange
      const query: FaqQueryDto = {};
      mockPrismaService.faqItem.findMany.mockResolvedValue([mockFaqItem1, mockFaqItem2]);

      // Act
      const result = await service.findAllItems(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrismaService.faqItem.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: true,
        }),
        orderBy: expect.any(Array),
        include: expect.any(Object),
      });
    });

    it('should filter by category ID', async () => {
      // Arrange
      const query: FaqQueryDto = { categoryId: mockCategory1.id };
      mockPrismaService.faqItem.findMany.mockResolvedValue([mockFaqItem1, mockFaqItem2]);

      // Act
      await service.findAllItems(query);

      // Assert
      expect(mockPrismaService.faqItem.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          categoryId: mockCategory1.id,
        }),
        orderBy: expect.any(Array),
        include: expect.any(Object),
      });
    });

    it('should include inactive items when activeOnly is false', async () => {
      // Arrange
      const query: FaqQueryDto = { activeOnly: false };
      mockPrismaService.faqItem.findMany.mockResolvedValue([
        mockFaqItem1,
        mockFaqItem2,
        mockInactiveItem,
      ]);

      // Act
      const result = await service.findAllItems(query);

      // Assert
      expect(result).toHaveLength(3);
      expect(mockPrismaService.faqItem.findMany).toHaveBeenCalledWith({
        where: expect.not.objectContaining({
          isActive: true,
        }),
        orderBy: expect.any(Array),
        include: expect.any(Object),
      });
    });

    it('should search in question and answer', async () => {
      // Arrange
      const query: FaqQueryDto = { search: 'billet' };
      mockPrismaService.faqItem.findMany.mockResolvedValue([mockFaqItem1, mockFaqItem2]);

      // Act
      await service.findAllItems(query);

      // Assert
      expect(mockPrismaService.faqItem.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: [
            { question: { contains: 'billet', mode: 'insensitive' } },
            { answer: { contains: 'billet', mode: 'insensitive' } },
          ],
        }),
        orderBy: expect.any(Array),
        include: expect.any(Object),
      });
    });

    it('should order by category order then item order', async () => {
      // Arrange
      const query: FaqQueryDto = {};
      mockPrismaService.faqItem.findMany.mockResolvedValue([]);

      // Act
      await service.findAllItems(query);

      // Assert
      expect(mockPrismaService.faqItem.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: [{ category: { order: 'asc' } }, { order: 'asc' }],
        include: { category: true },
      });
    });
  });

  describe('findItemById', () => {
    it('should return item by ID with category', async () => {
      // Arrange
      const itemWithCategory = {
        ...mockFaqItem1,
        category: mockCategory1,
      };
      mockPrismaService.faqItem.findUnique.mockResolvedValue(itemWithCategory);

      // Act
      const result = await service.findItemById(mockFaqItem1.id);

      // Assert
      expect(result.id).toBe(mockFaqItem1.id);
      expect(result.category).toBeDefined();
    });

    it('should throw NotFoundException when item not found', async () => {
      // Arrange
      mockPrismaService.faqItem.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findItemById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateItem', () => {
    it('should update item successfully', async () => {
      // Arrange
      const updateDto: UpdateFaqItemDto = { question: 'Updated question?' };
      const itemWithCategory = { ...mockFaqItem1, category: mockCategory1 };
      mockPrismaService.faqItem.findUnique.mockResolvedValue(itemWithCategory);
      mockPrismaService.faqItem.update.mockResolvedValue({
        ...mockFaqItem1,
        question: 'Updated question?',
        category: mockCategory1,
      });

      // Act
      const result = await service.updateItem(mockFaqItem1.id, updateDto);

      // Assert
      expect(result.question).toBe('Updated question?');
    });

    it('should throw NotFoundException when item not found', async () => {
      // Arrange
      mockPrismaService.faqItem.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateItem('non-existent', { question: 'Test?' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should verify new category exists when changing category', async () => {
      // Arrange
      const updateDto: UpdateFaqItemDto = { categoryId: mockCategory2.id };
      const itemWithCategory = { ...mockFaqItem1, category: mockCategory1 };
      mockPrismaService.faqItem.findUnique.mockResolvedValue(itemWithCategory);
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(mockCategory2);
      mockPrismaService.faqItem.update.mockResolvedValue({
        ...mockFaqItem1,
        categoryId: mockCategory2.id,
        category: mockCategory2,
      });

      // Act
      await service.updateItem(mockFaqItem1.id, updateDto);

      // Assert
      expect(mockPrismaService.faqCategory.findUnique).toHaveBeenCalledWith({
        where: { id: mockCategory2.id },
      });
    });

    it('should throw NotFoundException when new category not found', async () => {
      // Arrange
      const updateDto: UpdateFaqItemDto = { categoryId: 'non-existent' };
      const itemWithCategory = { ...mockFaqItem1, category: mockCategory1 };
      mockPrismaService.faqItem.findUnique.mockResolvedValue(itemWithCategory);
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateItem(mockFaqItem1.id, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteItem', () => {
    it('should delete item successfully', async () => {
      // Arrange
      const itemWithCategory = { ...mockFaqItem1, category: mockCategory1 };
      mockPrismaService.faqItem.findUnique.mockResolvedValue(itemWithCategory);
      mockPrismaService.faqItem.delete.mockResolvedValue(mockFaqItem1);

      // Act
      await service.deleteItem(mockFaqItem1.id);

      // Assert
      expect(mockPrismaService.faqItem.delete).toHaveBeenCalledWith({
        where: { id: mockFaqItem1.id },
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      // Arrange
      mockPrismaService.faqItem.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteItem('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleItemActive', () => {
    it('should toggle active to inactive', async () => {
      // Arrange
      const itemWithCategory = { ...mockFaqItem1, isActive: true, category: mockCategory1 };
      mockPrismaService.faqItem.findUnique.mockResolvedValue(itemWithCategory);
      mockPrismaService.faqItem.update.mockResolvedValue({
        ...mockFaqItem1,
        isActive: false,
        category: mockCategory1,
      });

      // Act
      const result = await service.toggleItemActive(mockFaqItem1.id);

      // Assert
      expect(result.isActive).toBe(false);
    });

    it('should toggle inactive to active', async () => {
      // Arrange
      const inactiveItemWithCategory = { ...mockInactiveItem, category: mockCategory1 };
      mockPrismaService.faqItem.findUnique.mockResolvedValue(inactiveItemWithCategory);
      mockPrismaService.faqItem.update.mockResolvedValue({
        ...mockInactiveItem,
        isActive: true,
        category: mockCategory1,
      });

      // Act
      const result = await service.toggleItemActive(mockInactiveItem.id);

      // Assert
      expect(result.isActive).toBe(true);
    });
  });

  describe('reorderItems', () => {
    it('should reorder items within category successfully', async () => {
      // Arrange
      const categoryId = mockCategory1.id;
      const itemIds = [mockFaqItem2.id, mockFaqItem1.id];
      mockPrismaService.faqItem.findMany
        .mockResolvedValueOnce([mockFaqItem1, mockFaqItem2]) // For validation
        .mockResolvedValueOnce([
          { ...mockFaqItem2, order: 0 },
          { ...mockFaqItem1, order: 1 },
        ]); // For return
      mockPrismaService.$transaction.mockResolvedValue([]);

      // Act
      const result = await service.reorderItems(categoryId, itemIds);

      // Assert
      expect(result[0].order).toBe(0);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when items belong to different category', async () => {
      // Arrange
      const categoryId = mockCategory1.id;
      const itemIds = [mockFaqItem1.id, mockFaqItem3.id]; // faqItem3 belongs to category2
      mockPrismaService.faqItem.findMany.mockResolvedValue([
        mockFaqItem1,
        mockFaqItem3,
      ]);

      // Act & Assert
      await expect(
        service.reorderItems(categoryId, itemIds),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Public FAQ Tests
  // ==========================================================================

  describe('getPublicFaq', () => {
    it('should return all categories with active items only', async () => {
      // Arrange
      const categoriesWithActiveItems = [
        { ...mockCategory1, items: [mockFaqItem1, mockFaqItem2] },
        { ...mockCategory2, items: [mockFaqItem3] },
      ];
      mockPrismaService.faqCategory.findMany.mockResolvedValue(categoriesWithActiveItems);

      // Act
      const result = await service.getPublicFaq();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].items).toHaveLength(2);
    });

    it('should order categories and items correctly', async () => {
      // Arrange
      mockPrismaService.faqCategory.findMany.mockResolvedValue([]);

      // Act
      await service.getPublicFaq();

      // Assert
      expect(mockPrismaService.faqCategory.findMany).toHaveBeenCalledWith({
        orderBy: { order: 'asc' },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              question: true,
              answer: true,
              order: true,
              categoryId: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    });

    it('should return empty categories when no items exist', async () => {
      // Arrange
      const categoryWithNoItems = { ...mockCategory1, items: [] };
      mockPrismaService.faqCategory.findMany.mockResolvedValue([categoryWithNoItems]);

      // Act
      const result = await service.getPublicFaq();

      // Assert
      expect(result[0].items).toHaveLength(0);
    });
  });

  describe('searchFaq', () => {
    it('should search in question and answer', async () => {
      // Arrange
      const itemsWithCategory = [
        { ...mockFaqItem1, category: mockCategory1 },
        { ...mockFaqItem2, category: mockCategory1 },
      ];
      mockPrismaService.faqItem.findMany.mockResolvedValue(itemsWithCategory);

      // Act
      const result = await service.searchFaq('billet');

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrismaService.faqItem.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { question: { contains: 'billet', mode: 'insensitive' } },
            { answer: { contains: 'billet', mode: 'insensitive' } },
          ],
        },
        orderBy: { order: 'asc' },
        include: { category: true },
      });
    });

    it('should only search active items', async () => {
      // Arrange
      mockPrismaService.faqItem.findMany.mockResolvedValue([]);

      // Act
      await service.searchFaq('obsolete');

      // Assert
      expect(mockPrismaService.faqItem.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: true,
        }),
        orderBy: { order: 'asc' },
        include: { category: true },
      });
    });

    it('should return empty array for no matches', async () => {
      // Arrange
      mockPrismaService.faqItem.findMany.mockResolvedValue([]);

      // Act
      const result = await service.searchFaq('nonexistent');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle special characters in search term', async () => {
      // Arrange
      mockPrismaService.faqItem.findMany.mockResolvedValue([]);

      // Act
      await service.searchFaq("test's \"query\"");

      // Assert
      expect(mockPrismaService.faqItem.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { question: { contains: "test's \"query\"", mode: 'insensitive' } },
            { answer: { contains: "test's \"query\"", mode: 'insensitive' } },
          ],
        },
        orderBy: { order: 'asc' },
        include: { category: true },
      });
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty category name gracefully', async () => {
      // Note: In reality, validation would catch this, but testing edge case
      const createDto: CreateFaqCategoryDto = { name: '' };
      mockPrismaService.faqCategory.findFirst.mockResolvedValue(null);
      mockPrismaService.faqCategory.create.mockResolvedValue({
        ...mockCategory1,
        name: '',
      });

      // Act
      const result = await service.createCategory(createDto);

      // Assert
      expect(result.name).toBe('');
    });

    it('should handle very long question text', async () => {
      // Arrange
      const longQuestion = 'Q'.repeat(1000);
      const createDto: CreateFaqItemDto = {
        categoryId: mockCategory1.id,
        question: longQuestion,
        answer: 'Short answer.',
      };
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(mockCategory1);
      mockPrismaService.faqItem.findFirst.mockResolvedValue(null);
      mockPrismaService.faqItem.create.mockResolvedValue({
        ...mockFaqItem1,
        question: longQuestion,
      });

      // Act
      const result = await service.createItem(createDto);

      // Assert
      expect(result.question).toBe(longQuestion);
    });

    it('should handle unicode characters in FAQ content', async () => {
      // Arrange
      const unicodeQuestion = 'Comment utiliser le cashless? 你好世界 🎵';
      const createDto: CreateFaqItemDto = {
        categoryId: mockCategory1.id,
        question: unicodeQuestion,
        answer: 'Reponse avec accents: cafe, etait, etre',
      };
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(mockCategory1);
      mockPrismaService.faqItem.findFirst.mockResolvedValue(null);
      mockPrismaService.faqItem.create.mockResolvedValue({
        ...mockFaqItem1,
        question: unicodeQuestion,
      });

      // Act
      const result = await service.createItem(createDto);

      // Assert
      expect(result.question).toBe(unicodeQuestion);
    });

    it('should handle concurrent category updates', async () => {
      // Arrange
      const categoryWithItems = { ...mockCategory1, items: [] };
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(categoryWithItems);
      mockPrismaService.faqCategory.update.mockResolvedValue({
        ...mockCategory1,
        name: 'Updated',
      });

      // Act - Simulate concurrent updates
      const update1 = service.updateCategory(mockCategory1.id, { name: 'Update1' });
      const update2 = service.updateCategory(mockCategory1.id, { name: 'Update2' });

      // Assert - Both should complete (Prisma handles locking)
      await expect(Promise.all([update1, update2])).resolves.toBeDefined();
    });

    it('should handle reordering with empty array', async () => {
      // Arrange
      mockPrismaService.$transaction.mockResolvedValue([]);
      mockPrismaService.faqCategory.findMany.mockResolvedValue([]);

      // Act
      const result = await service.reorderCategories([]);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle category with many items', async () => {
      // Arrange
      const manyItems = Array.from({ length: 100 }, (_, i) => ({
        ...mockFaqItem1,
        id: `faq-${i}`,
        order: i,
      }));
      const categoryWithManyItems = {
        ...mockCategory1,
        items: manyItems,
      };
      mockPrismaService.faqCategory.findUnique.mockResolvedValue(categoryWithManyItems);

      // Act
      const result = await service.findCategoryById(mockCategory1.id);

      // Assert
      expect(result.items).toHaveLength(100);
    });

    it('should handle search with empty string', async () => {
      // Arrange
      mockPrismaService.faqItem.findMany.mockResolvedValue([]);

      // Act
      const result = await service.searchFaq('');

      // Assert
      expect(result).toHaveLength(0);
    });
  });
});
