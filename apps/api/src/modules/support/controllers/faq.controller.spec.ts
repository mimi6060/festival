/**
 * FAQ Controller Unit Tests
 *
 * Comprehensive tests for FAQ endpoints including:
 * - GET /faq (public)
 * - GET /faq/search (public)
 * - POST /admin/faq/categories
 * - GET /admin/faq/categories
 * - GET /admin/faq/categories/:id
 * - PUT /admin/faq/categories/:id
 * - DELETE /admin/faq/categories/:id
 * - PATCH /admin/faq/categories/reorder
 * - POST /admin/faq/items
 * - GET /admin/faq/items
 * - GET /admin/faq/items/:id
 * - PUT /admin/faq/items/:id
 * - DELETE /admin/faq/items/:id
 * - PATCH /admin/faq/items/:id/toggle
 * - PATCH /admin/faq/categories/:categoryId/items/reorder
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FaqController } from './faq.controller';
import { FaqService } from '../services/faq.service';
import {
  CreateFaqCategoryDto,
  UpdateFaqCategoryDto,
  CreateFaqItemDto,
  UpdateFaqItemDto,
  FaqQueryDto,
  FaqCategoryResponseDto,
  FaqItemResponseDto,
} from '../dto/faq.dto';

// ============================================================================
// Mock Setup
// ============================================================================

describe('FaqController', () => {
  let controller: FaqController;

  // Mock category response
  const mockCategory: FaqCategoryResponseDto = {
    id: 'category-uuid-00000000-0000-0000-0000-000000000001',
    name: 'Billetterie',
    order: 1,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockCategoryWithItems: FaqCategoryResponseDto = {
    ...mockCategory,
    items: [
      {
        id: 'item-uuid-00000000-0000-0000-0000-000000000001',
        categoryId: mockCategory.id,
        question: 'Comment acheter un billet ?',
        answer: 'Vous pouvez acheter un billet en ligne sur notre site...',
        order: 1,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      },
    ],
  };

  // Mock item response
  const mockItem: FaqItemResponseDto = {
    id: 'item-uuid-00000000-0000-0000-0000-000000000001',
    categoryId: mockCategory.id,
    question: 'Comment acheter un billet ?',
    answer: 'Vous pouvez acheter un billet en ligne sur notre site...',
    order: 1,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockFaqService = {
    getPublicFaq: jest.fn(),
    searchFaq: jest.fn(),
    createCategory: jest.fn(),
    findAllCategories: jest.fn(),
    findCategoryById: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
    reorderCategories: jest.fn(),
    createItem: jest.fn(),
    findAllItems: jest.fn(),
    findItemById: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
    toggleItemActive: jest.fn(),
    reorderItems: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaqController],
      providers: [{ provide: FaqService, useValue: mockFaqService }],
    }).compile();

    controller = module.get<FaqController>(FaqController);
  });

  // ==========================================================================
  // GET /faq Tests (Public)
  // ==========================================================================

  describe('GET /faq', () => {
    it('should return public FAQ with categories and items', async () => {
      // Arrange
      const mockFaq = [mockCategoryWithItems];
      mockFaqService.getPublicFaq.mockResolvedValue(mockFaq);

      // Act
      const result = await controller.getPublicFaq();

      // Assert
      expect(result).toEqual(mockFaq);
      expect(mockFaqService.getPublicFaq).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no FAQ exists', async () => {
      // Arrange
      mockFaqService.getPublicFaq.mockResolvedValue([]);

      // Act
      const result = await controller.getPublicFaq();

      // Assert
      expect(result).toEqual([]);
    });

    it('should return multiple categories with items', async () => {
      // Arrange
      const mockFaq = [
        mockCategoryWithItems,
        {
          ...mockCategory,
          id: 'category-uuid-00000000-0000-0000-0000-000000000002',
          name: 'Paiements',
          order: 2,
          items: [],
        },
      ];
      mockFaqService.getPublicFaq.mockResolvedValue(mockFaq);

      // Act
      const result = await controller.getPublicFaq();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Billetterie');
      expect(result[1].name).toBe('Paiements');
    });
  });

  // ==========================================================================
  // GET /faq/search Tests (Public)
  // ==========================================================================

  describe('GET /faq/search', () => {
    it('should search FAQ items by term', async () => {
      // Arrange
      const searchTerm = 'billet';
      mockFaqService.searchFaq.mockResolvedValue([mockItem]);

      // Act
      const result = await controller.searchFaq(searchTerm);

      // Assert
      expect(result).toEqual([mockItem]);
      expect(mockFaqService.searchFaq).toHaveBeenCalledWith(searchTerm);
    });

    it('should return empty array when no results found', async () => {
      // Arrange
      mockFaqService.searchFaq.mockResolvedValue([]);

      // Act
      const result = await controller.searchFaq('nonexistent');

      // Assert
      expect(result).toEqual([]);
    });

    it('should return multiple matching items', async () => {
      // Arrange
      const mockItems = [
        mockItem,
        { ...mockItem, id: 'item-2', question: 'Comment modifier mon billet ?' },
      ];
      mockFaqService.searchFaq.mockResolvedValue(mockItems);

      // Act
      const result = await controller.searchFaq('billet');

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  // ==========================================================================
  // POST /admin/faq/categories Tests
  // ==========================================================================

  describe('POST /admin/faq/categories', () => {
    it('should create a new FAQ category', async () => {
      // Arrange
      const dto: CreateFaqCategoryDto = {
        name: 'Nouvelle Categorie',
        order: 5,
      };
      mockFaqService.createCategory.mockResolvedValue({
        ...mockCategory,
        name: dto.name,
        order: dto.order,
      });

      // Act
      const result = await controller.createCategory(dto);

      // Assert
      expect(result.name).toBe(dto.name);
      expect(result.order).toBe(dto.order);
      expect(mockFaqService.createCategory).toHaveBeenCalledWith(dto);
    });

    it('should create category without order (default)', async () => {
      // Arrange
      const dto: CreateFaqCategoryDto = { name: 'Sans Ordre' };
      mockFaqService.createCategory.mockResolvedValue({
        ...mockCategory,
        name: dto.name,
        order: 0,
      });

      // Act
      const result = await controller.createCategory(dto);

      // Assert
      expect(result.name).toBe(dto.name);
      expect(mockFaqService.createCategory).toHaveBeenCalledWith(dto);
    });

    it('should propagate error for duplicate category name', async () => {
      // Arrange
      const dto: CreateFaqCategoryDto = { name: 'Billetterie' };
      const error = new BadRequestException('Category name already exists');
      mockFaqService.createCategory.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createCategory(dto)).rejects.toThrow('Category name already exists');
    });
  });

  // ==========================================================================
  // GET /admin/faq/categories Tests
  // ==========================================================================

  describe('GET /admin/faq/categories', () => {
    it('should return all categories without items', async () => {
      // Arrange
      mockFaqService.findAllCategories.mockResolvedValue([mockCategory]);

      // Act
      const result = await controller.getAllCategories();

      // Assert
      expect(result).toEqual([mockCategory]);
      expect(mockFaqService.findAllCategories).toHaveBeenCalledWith(undefined);
    });

    it('should return all categories with items when includeItems is true', async () => {
      // Arrange
      mockFaqService.findAllCategories.mockResolvedValue([mockCategoryWithItems]);

      // Act
      const result = await controller.getAllCategories(true);

      // Assert
      expect(result).toEqual([mockCategoryWithItems]);
      expect(result[0].items).toBeDefined();
      expect(mockFaqService.findAllCategories).toHaveBeenCalledWith(true);
    });

    it('should return empty array when no categories exist', async () => {
      // Arrange
      mockFaqService.findAllCategories.mockResolvedValue([]);

      // Act
      const result = await controller.getAllCategories();

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET /admin/faq/categories/:id Tests
  // ==========================================================================

  describe('GET /admin/faq/categories/:id', () => {
    it('should return a category by ID', async () => {
      // Arrange
      mockFaqService.findCategoryById.mockResolvedValue(mockCategory);

      // Act
      const result = await controller.getCategoryById(mockCategory.id);

      // Assert
      expect(result).toEqual(mockCategory);
      expect(mockFaqService.findCategoryById).toHaveBeenCalledWith(mockCategory.id);
    });

    it('should propagate NotFoundException for non-existent category', async () => {
      // Arrange
      const error = new NotFoundException('Category not found');
      mockFaqService.findCategoryById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getCategoryById('non-existent-id')).rejects.toThrow(
        'Category not found'
      );
    });
  });

  // ==========================================================================
  // PUT /admin/faq/categories/:id Tests
  // ==========================================================================

  describe('PUT /admin/faq/categories/:id', () => {
    it('should update a category', async () => {
      // Arrange
      const dto: UpdateFaqCategoryDto = { name: 'Updated Name', order: 10 };
      mockFaqService.updateCategory.mockResolvedValue({
        ...mockCategory,
        ...dto,
      });

      // Act
      const result = await controller.updateCategory(mockCategory.id, dto);

      // Assert
      expect(result.name).toBe(dto.name);
      expect(result.order).toBe(dto.order);
      expect(mockFaqService.updateCategory).toHaveBeenCalledWith(mockCategory.id, dto);
    });

    it('should update only the name', async () => {
      // Arrange
      const dto: UpdateFaqCategoryDto = { name: 'Only Name Update' };
      mockFaqService.updateCategory.mockResolvedValue({
        ...mockCategory,
        name: dto.name,
      });

      // Act
      const result = await controller.updateCategory(mockCategory.id, dto);

      // Assert
      expect(result.name).toBe(dto.name);
    });

    it('should propagate NotFoundException for non-existent category', async () => {
      // Arrange
      const dto: UpdateFaqCategoryDto = { name: 'Update' };
      const error = new NotFoundException('Category not found');
      mockFaqService.updateCategory.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.updateCategory('non-existent-id', dto)).rejects.toThrow(
        'Category not found'
      );
    });
  });

  // ==========================================================================
  // DELETE /admin/faq/categories/:id Tests
  // ==========================================================================

  describe('DELETE /admin/faq/categories/:id', () => {
    it('should delete a category', async () => {
      // Arrange
      mockFaqService.deleteCategory.mockResolvedValue(undefined);

      // Act
      const result = await controller.deleteCategory(mockCategory.id);

      // Assert
      expect(result).toBeUndefined();
      expect(mockFaqService.deleteCategory).toHaveBeenCalledWith(mockCategory.id);
    });

    it('should propagate NotFoundException for non-existent category', async () => {
      // Arrange
      const error = new NotFoundException('Category not found');
      mockFaqService.deleteCategory.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteCategory('non-existent-id')).rejects.toThrow(
        'Category not found'
      );
    });

    it('should propagate BadRequestException when category has items', async () => {
      // Arrange
      const error = new BadRequestException('Cannot delete category with items');
      mockFaqService.deleteCategory.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteCategory(mockCategory.id)).rejects.toThrow(
        'Cannot delete category with items'
      );
    });
  });

  // ==========================================================================
  // PATCH /admin/faq/categories/reorder Tests
  // ==========================================================================

  describe('PATCH /admin/faq/categories/reorder', () => {
    it('should reorder categories', async () => {
      // Arrange
      const categoryIds = ['cat-1', 'cat-2', 'cat-3'];
      const reorderedCategories = categoryIds.map((id, index) => ({
        ...mockCategory,
        id,
        order: index,
      }));
      mockFaqService.reorderCategories.mockResolvedValue(reorderedCategories);

      // Act
      const result = await controller.reorderCategories({ categoryIds });

      // Assert
      expect(result).toHaveLength(3);
      expect(mockFaqService.reorderCategories).toHaveBeenCalledWith(categoryIds);
    });

    it('should handle empty array', async () => {
      // Arrange
      mockFaqService.reorderCategories.mockResolvedValue([]);

      // Act
      const result = await controller.reorderCategories({ categoryIds: [] });

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // POST /admin/faq/items Tests
  // ==========================================================================

  describe('POST /admin/faq/items', () => {
    it('should create a new FAQ item', async () => {
      // Arrange
      const dto: CreateFaqItemDto = {
        categoryId: mockCategory.id,
        question: 'Nouvelle question ?',
        answer: 'Voici la reponse detaillee...',
        order: 1,
        isActive: true,
      };
      mockFaqService.createItem.mockResolvedValue({
        ...mockItem,
        ...dto,
      });

      // Act
      const result = await controller.createItem(dto);

      // Assert
      expect(result.question).toBe(dto.question);
      expect(result.answer).toBe(dto.answer);
      expect(mockFaqService.createItem).toHaveBeenCalledWith(dto);
    });

    it('should create item with default isActive', async () => {
      // Arrange
      const dto: CreateFaqItemDto = {
        categoryId: mockCategory.id,
        question: 'Question sans isActive ?',
        answer: 'Reponse sans isActive specifie...',
      };
      mockFaqService.createItem.mockResolvedValue({
        ...mockItem,
        ...dto,
        isActive: true,
      });

      // Act
      const result = await controller.createItem(dto);

      // Assert
      expect(result.isActive).toBe(true);
    });

    it('should propagate NotFoundException for non-existent category', async () => {
      // Arrange
      const dto: CreateFaqItemDto = {
        categoryId: 'non-existent-category',
        question: 'Question ?',
        answer: 'Reponse...',
      };
      const error = new NotFoundException('Category not found');
      mockFaqService.createItem.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createItem(dto)).rejects.toThrow('Category not found');
    });
  });

  // ==========================================================================
  // GET /admin/faq/items Tests
  // ==========================================================================

  describe('GET /admin/faq/items', () => {
    it('should return all items without filters', async () => {
      // Arrange
      const query: FaqQueryDto = {};
      mockFaqService.findAllItems.mockResolvedValue([mockItem]);

      // Act
      const result = await controller.getAllItems(query);

      // Assert
      expect(result).toEqual([mockItem]);
      expect(mockFaqService.findAllItems).toHaveBeenCalledWith(query);
    });

    it('should return items filtered by category', async () => {
      // Arrange
      const query: FaqQueryDto = { categoryId: mockCategory.id };
      mockFaqService.findAllItems.mockResolvedValue([mockItem]);

      // Act
      const result = await controller.getAllItems(query);

      // Assert
      expect(result).toEqual([mockItem]);
      expect(mockFaqService.findAllItems).toHaveBeenCalledWith(query);
    });

    it('should return only active items', async () => {
      // Arrange
      const query: FaqQueryDto = { activeOnly: true };
      mockFaqService.findAllItems.mockResolvedValue([mockItem]);

      // Act
      const result = await controller.getAllItems(query);

      // Assert
      expect(result).toEqual([mockItem]);
    });

    it('should search items by term', async () => {
      // Arrange
      const query: FaqQueryDto = { search: 'billet' };
      mockFaqService.findAllItems.mockResolvedValue([mockItem]);

      // Act
      const _result = await controller.getAllItems(query);

      // Assert
      expect(mockFaqService.findAllItems).toHaveBeenCalledWith(query);
    });
  });

  // ==========================================================================
  // GET /admin/faq/items/:id Tests
  // ==========================================================================

  describe('GET /admin/faq/items/:id', () => {
    it('should return an item by ID', async () => {
      // Arrange
      mockFaqService.findItemById.mockResolvedValue(mockItem);

      // Act
      const result = await controller.getItemById(mockItem.id);

      // Assert
      expect(result).toEqual(mockItem);
      expect(mockFaqService.findItemById).toHaveBeenCalledWith(mockItem.id);
    });

    it('should propagate NotFoundException for non-existent item', async () => {
      // Arrange
      const error = new NotFoundException('Item not found');
      mockFaqService.findItemById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getItemById('non-existent-id')).rejects.toThrow('Item not found');
    });
  });

  // ==========================================================================
  // PUT /admin/faq/items/:id Tests
  // ==========================================================================

  describe('PUT /admin/faq/items/:id', () => {
    it('should update an item', async () => {
      // Arrange
      const dto: UpdateFaqItemDto = {
        question: 'Question mise a jour ?',
        answer: 'Reponse mise a jour...',
      };
      mockFaqService.updateItem.mockResolvedValue({
        ...mockItem,
        ...dto,
      });

      // Act
      const result = await controller.updateItem(mockItem.id, dto);

      // Assert
      expect(result.question).toBe(dto.question);
      expect(result.answer).toBe(dto.answer);
      expect(mockFaqService.updateItem).toHaveBeenCalledWith(mockItem.id, dto);
    });

    it('should update item category', async () => {
      // Arrange
      const newCategoryId = 'new-category-uuid';
      const dto: UpdateFaqItemDto = { categoryId: newCategoryId };
      mockFaqService.updateItem.mockResolvedValue({
        ...mockItem,
        categoryId: newCategoryId,
      });

      // Act
      const result = await controller.updateItem(mockItem.id, dto);

      // Assert
      expect(result.categoryId).toBe(newCategoryId);
    });

    it('should propagate NotFoundException for non-existent item', async () => {
      // Arrange
      const dto: UpdateFaqItemDto = { question: 'Update' };
      const error = new NotFoundException('Item not found');
      mockFaqService.updateItem.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.updateItem('non-existent-id', dto)).rejects.toThrow('Item not found');
    });
  });

  // ==========================================================================
  // DELETE /admin/faq/items/:id Tests
  // ==========================================================================

  describe('DELETE /admin/faq/items/:id', () => {
    it('should delete an item', async () => {
      // Arrange
      mockFaqService.deleteItem.mockResolvedValue(undefined);

      // Act
      const result = await controller.deleteItem(mockItem.id);

      // Assert
      expect(result).toBeUndefined();
      expect(mockFaqService.deleteItem).toHaveBeenCalledWith(mockItem.id);
    });

    it('should propagate NotFoundException for non-existent item', async () => {
      // Arrange
      const error = new NotFoundException('Item not found');
      mockFaqService.deleteItem.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteItem('non-existent-id')).rejects.toThrow('Item not found');
    });
  });

  // ==========================================================================
  // PATCH /admin/faq/items/:id/toggle Tests
  // ==========================================================================

  describe('PATCH /admin/faq/items/:id/toggle', () => {
    it('should toggle item active status from true to false', async () => {
      // Arrange
      mockFaqService.toggleItemActive.mockResolvedValue({
        ...mockItem,
        isActive: false,
      });

      // Act
      const result = await controller.toggleItemActive(mockItem.id);

      // Assert
      expect(result.isActive).toBe(false);
      expect(mockFaqService.toggleItemActive).toHaveBeenCalledWith(mockItem.id);
    });

    it('should toggle item active status from false to true', async () => {
      // Arrange
      mockFaqService.toggleItemActive.mockResolvedValue({
        ...mockItem,
        isActive: true,
      });

      // Act
      const result = await controller.toggleItemActive(mockItem.id);

      // Assert
      expect(result.isActive).toBe(true);
    });

    it('should propagate NotFoundException for non-existent item', async () => {
      // Arrange
      const error = new NotFoundException('Item not found');
      mockFaqService.toggleItemActive.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.toggleItemActive('non-existent-id')).rejects.toThrow(
        'Item not found'
      );
    });
  });

  // ==========================================================================
  // PATCH /admin/faq/categories/:categoryId/items/reorder Tests
  // ==========================================================================

  describe('PATCH /admin/faq/categories/:categoryId/items/reorder', () => {
    it('should reorder items within a category', async () => {
      // Arrange
      const categoryId = mockCategory.id;
      const itemIds = ['item-1', 'item-2', 'item-3'];
      const reorderedItems = itemIds.map((id, index) => ({
        ...mockItem,
        id,
        order: index,
      }));
      mockFaqService.reorderItems.mockResolvedValue(reorderedItems);

      // Act
      const result = await controller.reorderItems(categoryId, { itemIds });

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].order).toBe(0);
      expect(result[1].order).toBe(1);
      expect(result[2].order).toBe(2);
      expect(mockFaqService.reorderItems).toHaveBeenCalledWith(categoryId, itemIds);
    });

    it('should handle empty item list', async () => {
      // Arrange
      mockFaqService.reorderItems.mockResolvedValue([]);

      // Act
      const result = await controller.reorderItems(mockCategory.id, { itemIds: [] });

      // Assert
      expect(result).toEqual([]);
    });

    it('should propagate NotFoundException for non-existent category', async () => {
      // Arrange
      const error = new NotFoundException('Category not found');
      mockFaqService.reorderItems.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.reorderItems('non-existent-id', { itemIds: ['item-1'] })
      ).rejects.toThrow('Category not found');
    });
  });
});
