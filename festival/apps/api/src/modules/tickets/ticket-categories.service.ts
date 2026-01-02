/**
 * Ticket Categories Service
 *
 * Handles ticket category management including:
 * - CRUD operations for ticket categories
 * - Festival-scoped category queries
 * - Activation/deactivation of categories
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketCategory, Prisma } from '@prisma/client';
import { CreateTicketCategoryDto, UpdateTicketCategoryDto } from './dto';

// ============================================================================
// Types
// ============================================================================

export interface TicketCategoryEntity {
  id: string;
  festivalId: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
  quota: number;
  soldCount: number;
  maxPerUser: number;
  saleStartDate: Date;
  saleEndDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  availableCount?: number;
  festival?: {
    id: string;
    name: string;
  };
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class TicketCategoriesService {
  private readonly logger = new Logger(TicketCategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new ticket category for a festival
   */
  async create(
    festivalId: string,
    dto: CreateTicketCategoryDto,
  ): Promise<TicketCategoryEntity> {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    if (festival.isDeleted) {
      throw new BadRequestException('Cannot add categories to a deleted festival');
    }

    // Validate sale dates
    const saleStartDate = new Date(dto.saleStartDate);
    const saleEndDate = new Date(dto.saleEndDate);

    if (saleStartDate >= saleEndDate) {
      throw new BadRequestException('Sale start date must be before sale end date');
    }

    if (saleEndDate > festival.endDate) {
      throw new BadRequestException('Sale end date cannot be after festival end date');
    }

    // Check for duplicate name within the festival
    const existingCategory = await this.prisma.ticketCategory.findFirst({
      where: {
        festivalId,
        name: dto.name,
      },
    });

    if (existingCategory) {
      throw new ConflictException(
        `A ticket category with the name "${dto.name}" already exists for this festival`,
      );
    }

    // Create the category
    const category = await this.prisma.ticketCategory.create({
      data: {
        festivalId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        price: dto.price,
        quota: dto.quota,
        maxPerUser: dto.maxPerUser ?? 4,
        saleStartDate,
        saleEndDate,
        isActive: dto.isActive ?? true,
      },
      include: {
        festival: {
          select: { id: true, name: true },
        },
      },
    });

    this.logger.log(
      `Created ticket category "${dto.name}" for festival ${festivalId}`,
    );

    return this.mapToEntity(category);
  }

  /**
   * Get all ticket categories for a festival
   */
  async findAllByFestival(
    festivalId: string,
    options?: {
      includeInactive?: boolean;
      onlyAvailable?: boolean;
    },
  ): Promise<TicketCategoryEntity[]> {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    const where: Prisma.TicketCategoryWhereInput = { festivalId };

    // By default, only return active categories
    if (!options?.includeInactive) {
      where.isActive = true;
    }

    // Filter to only available categories (within sale period and not sold out)
    if (options?.onlyAvailable) {
      const now = new Date();
      where.saleStartDate = { lte: now };
      where.saleEndDate = { gte: now };
    }

    const categories = await this.prisma.ticketCategory.findMany({
      where,
      include: {
        festival: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { type: 'asc' },
        { price: 'asc' },
      ],
    });

    return categories.map((cat) => this.mapToEntity(cat));
  }

  /**
   * Get a single ticket category by ID
   */
  async findOne(id: string): Promise<TicketCategoryEntity> {
    const category = await this.prisma.ticketCategory.findUnique({
      where: { id },
      include: {
        festival: {
          select: { id: true, name: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Ticket category not found');
    }

    return this.mapToEntity(category);
  }

  /**
   * Update a ticket category
   */
  async update(
    id: string,
    dto: UpdateTicketCategoryDto,
  ): Promise<TicketCategoryEntity> {
    const category = await this.prisma.ticketCategory.findUnique({
      where: { id },
      include: {
        festival: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Ticket category not found');
    }

    // Prepare update data
    const updateData: Prisma.TicketCategoryUpdateInput = {};

    if (dto.name !== undefined) {
      // Check for duplicate name
      const existingCategory = await this.prisma.ticketCategory.findFirst({
        where: {
          festivalId: category.festivalId,
          name: dto.name,
          id: { not: id },
        },
      });

      if (existingCategory) {
        throw new ConflictException(
          `A ticket category with the name "${dto.name}" already exists for this festival`,
        );
      }
      updateData.name = dto.name;
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.type !== undefined) {
      updateData.type = dto.type;
    }

    if (dto.price !== undefined) {
      updateData.price = dto.price;
    }

    if (dto.quota !== undefined) {
      // Ensure new quota is not less than sold count
      if (dto.quota < category.soldCount) {
        throw new BadRequestException(
          `Cannot reduce quota below sold count (${category.soldCount})`,
        );
      }
      updateData.quota = dto.quota;
    }

    if (dto.maxPerUser !== undefined) {
      updateData.maxPerUser = dto.maxPerUser;
    }

    // Validate and update sale dates
    const newSaleStartDate = dto.saleStartDate
      ? new Date(dto.saleStartDate)
      : category.saleStartDate;
    const newSaleEndDate = dto.saleEndDate
      ? new Date(dto.saleEndDate)
      : category.saleEndDate;

    if (newSaleStartDate >= newSaleEndDate) {
      throw new BadRequestException('Sale start date must be before sale end date');
    }

    if (newSaleEndDate > category.festival.endDate) {
      throw new BadRequestException('Sale end date cannot be after festival end date');
    }

    if (dto.saleStartDate !== undefined) {
      updateData.saleStartDate = newSaleStartDate;
    }

    if (dto.saleEndDate !== undefined) {
      updateData.saleEndDate = newSaleEndDate;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updatedCategory = await this.prisma.ticketCategory.update({
      where: { id },
      data: updateData,
      include: {
        festival: {
          select: { id: true, name: true },
        },
      },
    });

    this.logger.log(`Updated ticket category ${id}`);

    return this.mapToEntity(updatedCategory);
  }

  /**
   * Delete a ticket category
   */
  async delete(id: string): Promise<void> {
    const category = await this.prisma.ticketCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Ticket category not found');
    }

    // Check if there are any tickets sold for this category
    if (category._count.tickets > 0) {
      throw new ConflictException(
        `Cannot delete category with ${category._count.tickets} existing ticket(s). Deactivate it instead.`,
      );
    }

    await this.prisma.ticketCategory.delete({
      where: { id },
    });

    this.logger.log(`Deleted ticket category ${id}`);
  }

  /**
   * Toggle the active status of a ticket category
   */
  async toggleActive(id: string): Promise<TicketCategoryEntity> {
    const category = await this.prisma.ticketCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Ticket category not found');
    }

    const updatedCategory = await this.prisma.ticketCategory.update({
      where: { id },
      data: {
        isActive: !category.isActive,
      },
      include: {
        festival: {
          select: { id: true, name: true },
        },
      },
    });

    this.logger.log(
      `${updatedCategory.isActive ? 'Activated' : 'Deactivated'} ticket category ${id}`,
    );

    return this.mapToEntity(updatedCategory);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Map Prisma ticket category to entity
   */
  private mapToEntity(category: TicketCategory & { festival?: { id: string; name: string } }): TicketCategoryEntity {
    return {
      id: category.id,
      festivalId: category.festivalId,
      name: category.name,
      description: category.description,
      type: category.type,
      price: Number(category.price),
      quota: category.quota,
      soldCount: category.soldCount,
      maxPerUser: category.maxPerUser,
      saleStartDate: category.saleStartDate,
      saleEndDate: category.saleEndDate,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      availableCount: category.quota - category.soldCount,
      festival: category.festival,
    };
  }
}
