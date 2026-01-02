import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateFaqCategoryDto,
  UpdateFaqCategoryDto,
  CreateFaqItemDto,
  UpdateFaqItemDto,
  FaqQueryDto,
  FaqCategoryResponseDto,
  FaqItemResponseDto,
} from '../dto/faq.dto';

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== FAQ Categories =====

  async createCategory(dto: CreateFaqCategoryDto): Promise<FaqCategoryResponseDto> {
    // Get next order if not provided
    const order = dto.order ?? (await this.getNextCategoryOrder());

    return this.prisma.faqCategory.create({
      data: {
        name: dto.name,
        order,
      },
    });
  }

  async findAllCategories(includeItems = false): Promise<FaqCategoryResponseDto[]> {
    return this.prisma.faqCategory.findMany({
      orderBy: { order: 'asc' },
      include: includeItems
        ? {
            items: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            },
          }
        : undefined,
    });
  }

  async findCategoryById(id: string): Promise<FaqCategoryResponseDto> {
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

  async updateCategory(
    id: string,
    dto: UpdateFaqCategoryDto,
  ): Promise<FaqCategoryResponseDto> {
    await this.findCategoryById(id);

    return this.prisma.faqCategory.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: string): Promise<void> {
    await this.findCategoryById(id);

    // Check if category has items
    const itemCount = await this.prisma.faqItem.count({
      where: { categoryId: id },
    });

    if (itemCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${itemCount} FAQ items. Delete or move items first.`,
      );
    }

    await this.prisma.faqCategory.delete({
      where: { id },
    });
  }

  async reorderCategories(
    categoryIds: string[],
  ): Promise<FaqCategoryResponseDto[]> {
    // Update order for each category
    await this.prisma.$transaction(
      categoryIds.map((id, index) =>
        this.prisma.faqCategory.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return this.findAllCategories();
  }

  private async getNextCategoryOrder(): Promise<number> {
    const lastCategory = await this.prisma.faqCategory.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return (lastCategory?.order ?? -1) + 1;
  }

  // ===== FAQ Items =====

  async createItem(dto: CreateFaqItemDto): Promise<FaqItemResponseDto> {
    // Verify category exists
    const category = await this.prisma.faqCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `FAQ category with ID ${dto.categoryId} not found`,
      );
    }

    // Get next order if not provided
    const order = dto.order ?? (await this.getNextItemOrder(dto.categoryId));

    return this.prisma.faqItem.create({
      data: {
        categoryId: dto.categoryId,
        question: dto.question,
        answer: dto.answer,
        order,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAllItems(query: FaqQueryDto): Promise<FaqItemResponseDto[]> {
    const where: any = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.activeOnly !== false) {
      where.isActive = true;
    }

    if (query.search) {
      where.OR = [
        { question: { contains: query.search, mode: 'insensitive' } },
        { answer: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.faqItem.findMany({
      where,
      orderBy: [{ category: { order: 'asc' } }, { order: 'asc' }],
      include: {
        category: true,
      },
    });
  }

  async findItemById(id: string): Promise<FaqItemResponseDto> {
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

  async updateItem(id: string, dto: UpdateFaqItemDto): Promise<FaqItemResponseDto> {
    await this.findItemById(id);

    // If changing category, verify it exists
    if (dto.categoryId) {
      const category = await this.prisma.faqCategory.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new NotFoundException(
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

  async deleteItem(id: string): Promise<void> {
    await this.findItemById(id);

    await this.prisma.faqItem.delete({
      where: { id },
    });
  }

  async toggleItemActive(id: string): Promise<FaqItemResponseDto> {
    const item = await this.findItemById(id);

    return this.prisma.faqItem.update({
      where: { id },
      data: { isActive: !item.isActive },
      include: {
        category: true,
      },
    });
  }

  async reorderItems(
    categoryId: string,
    itemIds: string[],
  ): Promise<FaqItemResponseDto[]> {
    // Verify all items belong to the category
    const items = await this.prisma.faqItem.findMany({
      where: { id: { in: itemIds } },
    });

    const invalidItems = items.filter((item) => item.categoryId !== categoryId);
    if (invalidItems.length > 0) {
      throw new BadRequestException(
        'Some items do not belong to the specified category',
      );
    }

    // Update order for each item
    await this.prisma.$transaction(
      itemIds.map((id, index) =>
        this.prisma.faqItem.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return this.prisma.faqItem.findMany({
      where: { categoryId },
      orderBy: { order: 'asc' },
    });
  }

  private async getNextItemOrder(categoryId: string): Promise<number> {
    const lastItem = await this.prisma.faqItem.findFirst({
      where: { categoryId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return (lastItem?.order ?? -1) + 1;
  }

  // ===== Public FAQ =====

  async getPublicFaq(): Promise<FaqCategoryResponseDto[]> {
    return this.prisma.faqCategory.findMany({
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
  }

  async searchFaq(searchTerm: string): Promise<FaqItemResponseDto[]> {
    return this.prisma.faqItem.findMany({
      where: {
        isActive: true,
        OR: [
          { question: { contains: searchTerm, mode: 'insensitive' } },
          { answer: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      orderBy: { order: 'asc' },
      include: {
        category: true,
      },
    });
  }
}
