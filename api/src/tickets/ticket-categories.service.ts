import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { TicketCategory, Prisma } from '@prisma/client';

@Injectable()
export class TicketCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new ticket category for a festival
   */
  async create(
    festivalId: string,
    createCategoryDto: CreateCategoryDto,
  ): Promise<TicketCategory> {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    // Validate dates
    const saleStartDate = new Date(createCategoryDto.saleStartDate);
    const saleEndDate = new Date(createCategoryDto.saleEndDate);

    if (saleStartDate >= saleEndDate) {
      throw new BadRequestException(
        'Sale start date must be before sale end date',
      );
    }

    if (saleEndDate > festival.endDate) {
      throw new BadRequestException(
        'Sale end date cannot be after festival end date',
      );
    }

    // Check for duplicate category name in the same festival
    const existingCategory = await this.prisma.ticketCategory.findFirst({
      where: {
        festivalId,
        name: createCategoryDto.name,
      },
    });

    if (existingCategory) {
      throw new ConflictException(
        `A category with name "${createCategoryDto.name}" already exists for this festival`,
      );
    }

    return this.prisma.ticketCategory.create({
      data: {
        festivalId,
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        type: createCategoryDto.type,
        price: new Prisma.Decimal(createCategoryDto.price),
        quota: createCategoryDto.quota,
        maxPerUser: createCategoryDto.maxPerUser ?? 4,
        saleStartDate,
        saleEndDate,
        isActive: createCategoryDto.isActive ?? true,
      },
    });
  }

  /**
   * Get all ticket categories for a festival
   */
  async findAllByFestival(
    festivalId: string,
    includeInactive = false,
  ): Promise<TicketCategory[]> {
    const where: Prisma.TicketCategoryWhereInput = {
      festivalId,
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.prisma.ticketCategory.findMany({
      where,
      orderBy: [{ type: 'asc' }, { price: 'asc' }],
    });
  }

  /**
   * Get a single ticket category by ID
   */
  async findOne(id: string): Promise<TicketCategory> {
    const category = await this.prisma.ticketCategory.findUnique({
      where: { id },
      include: {
        festival: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Ticket category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * Update a ticket category
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<TicketCategory> {
    const category = await this.findOne(id);

    // Validate dates if provided
    if (updateCategoryDto.saleStartDate || updateCategoryDto.saleEndDate) {
      const saleStartDate = updateCategoryDto.saleStartDate
        ? new Date(updateCategoryDto.saleStartDate)
        : category.saleStartDate;
      const saleEndDate = updateCategoryDto.saleEndDate
        ? new Date(updateCategoryDto.saleEndDate)
        : category.saleEndDate;

      if (saleStartDate >= saleEndDate) {
        throw new BadRequestException(
          'Sale start date must be before sale end date',
        );
      }
    }

    // Validate quota if provided
    if (updateCategoryDto.quota !== undefined) {
      if (updateCategoryDto.quota < category.soldCount) {
        throw new BadRequestException(
          `Cannot reduce quota below sold count (${category.soldCount})`,
        );
      }
    }

    const updateData: Prisma.TicketCategoryUpdateInput = {};

    if (updateCategoryDto.name !== undefined) {
      updateData.name = updateCategoryDto.name;
    }
    if (updateCategoryDto.description !== undefined) {
      updateData.description = updateCategoryDto.description;
    }
    if (updateCategoryDto.type !== undefined) {
      updateData.type = updateCategoryDto.type;
    }
    if (updateCategoryDto.price !== undefined) {
      updateData.price = new Prisma.Decimal(updateCategoryDto.price);
    }
    if (updateCategoryDto.quota !== undefined) {
      updateData.quota = updateCategoryDto.quota;
    }
    if (updateCategoryDto.maxPerUser !== undefined) {
      updateData.maxPerUser = updateCategoryDto.maxPerUser;
    }
    if (updateCategoryDto.saleStartDate !== undefined) {
      updateData.saleStartDate = new Date(updateCategoryDto.saleStartDate);
    }
    if (updateCategoryDto.saleEndDate !== undefined) {
      updateData.saleEndDate = new Date(updateCategoryDto.saleEndDate);
    }
    if (updateCategoryDto.isActive !== undefined) {
      updateData.isActive = updateCategoryDto.isActive;
    }

    return this.prisma.ticketCategory.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete a ticket category (only if no tickets sold)
   */
  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    if (category.soldCount > 0) {
      throw new BadRequestException(
        'Cannot delete category with sold tickets. Deactivate it instead.',
      );
    }

    await this.prisma.ticketCategory.delete({
      where: { id },
    });
  }

  /**
   * Get category availability info
   */
  async getAvailability(id: string): Promise<{
    category: TicketCategory;
    available: number;
    isOnSale: boolean;
    percentageSold: number;
  }> {
    const category = await this.findOne(id);
    const now = new Date();

    const available = category.quota - category.soldCount;
    const isOnSale =
      category.isActive &&
      now >= category.saleStartDate &&
      now <= category.saleEndDate &&
      available > 0;

    const percentageSold =
      category.quota > 0
        ? Math.round((category.soldCount / category.quota) * 100)
        : 0;

    return {
      category,
      available,
      isOnSale,
      percentageSold,
    };
  }

  /**
   * Check if user can purchase tickets from this category
   */
  async canUserPurchase(
    categoryId: string,
    userId: string,
    requestedQuantity: number,
  ): Promise<{ canPurchase: boolean; reason?: string }> {
    const category = await this.findOne(categoryId);
    const now = new Date();

    // Check if category is active
    if (!category.isActive) {
      return { canPurchase: false, reason: 'This ticket category is not active' };
    }

    // Check sale period
    if (now < category.saleStartDate) {
      return { canPurchase: false, reason: 'Ticket sales have not started yet' };
    }

    if (now > category.saleEndDate) {
      return { canPurchase: false, reason: 'Ticket sales have ended' };
    }

    // Check availability
    const available = category.quota - category.soldCount;
    if (available < requestedQuantity) {
      return {
        canPurchase: false,
        reason: `Only ${available} tickets available`,
      };
    }

    // Check user's existing tickets for this category
    const userTicketCount = await this.prisma.ticket.count({
      where: {
        categoryId,
        userId,
        status: { in: ['SOLD', 'RESERVED'] },
      },
    });

    if (userTicketCount + requestedQuantity > category.maxPerUser) {
      return {
        canPurchase: false,
        reason: `Maximum ${category.maxPerUser} tickets per user. You already have ${userTicketCount}`,
      };
    }

    return { canPurchase: true };
  }
}
