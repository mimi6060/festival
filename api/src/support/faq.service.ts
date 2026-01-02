import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFaqCategoryDto,
  UpdateFaqCategoryDto,
  CreateFaqItemDto,
  UpdateFaqItemDto,
} from './dto';
import { FaqCategory, FaqItem } from '@prisma/client';

interface FaqCategoryWithItems extends FaqCategory {
  items: FaqItem[];
}

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  // ============= FAQ Categories =============

  /**
   * Get all FAQ categories with their items
   */
  async findAllCategories(): Promise<FaqCategoryWithItems[]> {
    return this.prisma.faqCategory.findMany({
      include: {
        items: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Get a single FAQ category by ID
   */
  async findCategoryById(id: string): Promise<FaqCategoryWithItems> {
    const category = await this.prisma.faqCategory.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`FAQ category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * Create a new FAQ category
   */
  async createCategory(dto: CreateFaqCategoryDto): Promise<FaqCategory> {
    // Get max order to set new category at the end
    const maxOrderCategory = await this.prisma.faqCategory.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const order = dto.order ?? (maxOrderCategory?.order ?? 0) + 1;

    return this.prisma.faqCategory.create({
      data: {
        name: dto.name,
        order,
      },
    });
  }

  /**
   * Update a FAQ category
   */
  async updateCategory(
    id: string,
    dto: UpdateFaqCategoryDto,
  ): Promise<FaqCategory> {
    await this.findCategoryById(id);

    return this.prisma.faqCategory.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete a FAQ category
   */
  async deleteCategory(id: string): Promise<void> {
    await this.findCategoryById(id);

    await this.prisma.faqCategory.delete({
      where: { id },
    });
  }

  /**
   * Reorder FAQ categories
   */
  async reorderCategories(
    categoryIds: string[],
  ): Promise<FaqCategory[]> {
    const updates = categoryIds.map((id, index) =>
      this.prisma.faqCategory.update({
        where: { id },
        data: { order: index },
      }),
    );

    return this.prisma.$transaction(updates);
  }

  // ============= FAQ Items =============

  /**
   * Get all FAQ items (optionally filtered by category)
   */
  async findAllItems(categoryId?: string): Promise<FaqItem[]> {
    const where = categoryId ? { categoryId, isActive: true } : { isActive: true };

    return this.prisma.faqItem.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [{ category: { order: 'asc' } }, { order: 'asc' }],
    });
  }

  /**
   * Get a single FAQ item by ID
   */
  async findItemById(id: string): Promise<FaqItem> {
    const item = await this.prisma.faqItem.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`FAQ item with ID ${id} not found`);
    }

    return item;
  }

  /**
   * Create a new FAQ item
   */
  async createItem(dto: CreateFaqItemDto): Promise<FaqItem> {
    // Verify category exists
    const category = await this.prisma.faqCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new BadRequestException(
        `FAQ category with ID ${dto.categoryId} not found`,
      );
    }

    // Get max order within category
    const maxOrderItem = await this.prisma.faqItem.findFirst({
      where: { categoryId: dto.categoryId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const order = dto.order ?? (maxOrderItem?.order ?? 0) + 1;

    return this.prisma.faqItem.create({
      data: {
        categoryId: dto.categoryId,
        question: dto.question,
        answer: dto.answer,
        order,
        isActive: dto.isActive ?? true,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * Update a FAQ item
   */
  async updateItem(id: string, dto: UpdateFaqItemDto): Promise<FaqItem> {
    await this.findItemById(id);

    // If changing category, verify new category exists
    if (dto.categoryId) {
      const category = await this.prisma.faqCategory.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new BadRequestException(
          `FAQ category with ID ${dto.categoryId} not found`,
        );
      }
    }

    return this.prisma.faqItem.update({
      where: { id },
      data: dto,
      include: {
        category: true,
      },
    });
  }

  /**
   * Delete a FAQ item
   */
  async deleteItem(id: string): Promise<void> {
    await this.findItemById(id);

    await this.prisma.faqItem.delete({
      where: { id },
    });
  }

  /**
   * Reorder FAQ items within a category
   */
  async reorderItems(
    categoryId: string,
    itemIds: string[],
  ): Promise<FaqItem[]> {
    // Verify all items belong to the category
    const items = await this.prisma.faqItem.findMany({
      where: {
        id: { in: itemIds },
        categoryId,
      },
    });

    if (items.length !== itemIds.length) {
      throw new BadRequestException(
        'Some items do not exist or do not belong to this category',
      );
    }

    const updates = itemIds.map((id, index) =>
      this.prisma.faqItem.update({
        where: { id },
        data: { order: index },
      }),
    );

    return this.prisma.$transaction(updates);
  }

  /**
   * Search FAQ items by question or answer
   */
  async searchItems(query: string): Promise<FaqItem[]> {
    return this.prisma.faqItem.findMany({
      where: {
        isActive: true,
        OR: [
          { question: { contains: query, mode: 'insensitive' } },
          { answer: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        category: true,
      },
      orderBy: [{ category: { order: 'asc' } }, { order: 'asc' }],
    });
  }
}
