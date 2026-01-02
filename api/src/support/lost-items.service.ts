import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLostItemDto,
  UpdateLostItemDto,
  LostItemQueryDto,
  ClaimLostItemDto,
} from './dto';
import { LostItem, LostItemStatus, UserRole, Prisma } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class LostItemsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Report a lost item
   */
  async reportLostItem(
    userId: string,
    dto: CreateLostItemDto,
  ): Promise<LostItem> {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: dto.festivalId },
    });

    if (!festival) {
      throw new BadRequestException(
        `Festival with ID ${dto.festivalId} not found`,
      );
    }

    return this.prisma.lostItem.create({
      data: {
        festivalId: dto.festivalId,
        reportedBy: userId,
        description: dto.description,
        location: dto.location,
        contactInfo: dto.contactInfo,
        imageUrl: dto.imageUrl,
        status: LostItemStatus.REPORTED,
      },
    });
  }

  /**
   * Get all lost items with filtering
   */
  async findAll(
    query: LostItemQueryDto,
  ): Promise<{
    items: LostItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;

    const where: Prisma.LostItemWhereInput = {};

    if (query.festivalId) {
      where.festivalId = query.festivalId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.lostItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lostItem.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Get lost items reported by a specific user
   */
  async findByUser(userId: string): Promise<LostItem[]> {
    return this.prisma.lostItem.findMany({
      where: { reportedBy: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single lost item by ID
   */
  async findById(id: string): Promise<LostItem> {
    const item = await this.prisma.lostItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Lost item with ID ${id} not found`);
    }

    return item;
  }

  /**
   * Update a lost item
   */
  async updateLostItem(
    id: string,
    user: AuthenticatedUser,
    dto: UpdateLostItemDto,
  ): Promise<LostItem> {
    const item = await this.findById(id);

    // Only reporter or staff can update
    const staffRoles: UserRole[] = [
      UserRole.ADMIN,
      UserRole.STAFF,
      UserRole.SECURITY,
    ];
    const isReporter = item.reportedBy === user.id;
    const isStaff = staffRoles.includes(user.role);

    if (!isReporter && !isStaff) {
      throw new ForbiddenException(
        'You do not have permission to update this item',
      );
    }

    // Regular users can only update description, location, and contact info
    const updateData: Prisma.LostItemUpdateInput = {};

    if (isReporter && !isStaff) {
      if (dto.description) updateData.description = dto.description;
      if (dto.location) updateData.location = dto.location;
      if (dto.contactInfo) updateData.contactInfo = dto.contactInfo;
      if (dto.imageUrl) updateData.imageUrl = dto.imageUrl;
    }

    // Staff can update all fields
    if (isStaff) {
      if (dto.description) updateData.description = dto.description;
      if (dto.location) updateData.location = dto.location;
      if (dto.status) updateData.status = dto.status;
      if (dto.foundBy) updateData.foundBy = dto.foundBy;
      if (dto.contactInfo) updateData.contactInfo = dto.contactInfo;
      if (dto.imageUrl) updateData.imageUrl = dto.imageUrl;
    }

    return this.prisma.lostItem.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Mark an item as found (STAFF only)
   */
  async markAsFound(
    id: string,
    user: AuthenticatedUser,
    foundBy?: string,
  ): Promise<LostItem> {
    const item = await this.findById(id);

    const staffRoles: UserRole[] = [
      UserRole.ADMIN,
      UserRole.STAFF,
      UserRole.SECURITY,
    ];

    if (!staffRoles.includes(user.role)) {
      throw new ForbiddenException('Only staff can mark items as found');
    }

    if (item.status === LostItemStatus.FOUND) {
      throw new BadRequestException('Item is already marked as found');
    }

    if (item.status === LostItemStatus.RETURNED) {
      throw new BadRequestException('Item has already been returned');
    }

    return this.prisma.lostItem.update({
      where: { id },
      data: {
        status: LostItemStatus.FOUND,
        foundBy: foundBy || user.id,
      },
    });
  }

  /**
   * Claim a found item
   */
  async claimItem(
    id: string,
    user: AuthenticatedUser,
    dto: ClaimLostItemDto,
  ): Promise<LostItem> {
    const item = await this.findById(id);

    const staffRoles: UserRole[] = [
      UserRole.ADMIN,
      UserRole.STAFF,
      UserRole.SECURITY,
    ];

    if (!staffRoles.includes(user.role)) {
      throw new ForbiddenException('Only staff can process claims');
    }

    if (item.status !== LostItemStatus.FOUND) {
      throw new BadRequestException('Only found items can be claimed');
    }

    return this.prisma.lostItem.update({
      where: { id },
      data: {
        status: LostItemStatus.RETURNED,
        claimedAt: new Date(),
        contactInfo: `Claimed by: ${dto.claimantName}, Contact: ${dto.claimantContact}${dto.description ? `, Notes: ${dto.description}` : ''}`,
      },
    });
  }

  /**
   * Mark unclaimed items after festival ends
   */
  async markUnclaimed(
    festivalId: string,
    user: AuthenticatedUser,
  ): Promise<number> {
    const staffRoles: UserRole[] = [UserRole.ADMIN, UserRole.ORGANIZER];

    if (!staffRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Only admins and organizers can mark items as unclaimed',
      );
    }

    const result = await this.prisma.lostItem.updateMany({
      where: {
        festivalId,
        status: { in: [LostItemStatus.REPORTED, LostItemStatus.FOUND] },
      },
      data: {
        status: LostItemStatus.UNCLAIMED,
      },
    });

    return result.count;
  }

  /**
   * Delete a lost item report
   */
  async deleteLostItem(id: string, user: AuthenticatedUser): Promise<void> {
    const item = await this.findById(id);

    // Only reporter or admin can delete
    const isReporter = item.reportedBy === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isReporter && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to delete this item',
      );
    }

    await this.prisma.lostItem.delete({
      where: { id },
    });
  }

  /**
   * Get statistics for lost items at a festival
   */
  async getStats(festivalId: string): Promise<{
    total: number;
    byStatus: Record<LostItemStatus, number>;
    returnRate: number;
  }> {
    const [total, statusCounts] = await Promise.all([
      this.prisma.lostItem.count({ where: { festivalId } }),
      this.prisma.lostItem.groupBy({
        by: ['status'],
        where: { festivalId },
        _count: true,
      }),
    ]);

    const byStatus: Record<LostItemStatus, number> = {
      [LostItemStatus.REPORTED]: 0,
      [LostItemStatus.FOUND]: 0,
      [LostItemStatus.RETURNED]: 0,
      [LostItemStatus.UNCLAIMED]: 0,
    };

    statusCounts.forEach((sc) => {
      byStatus[sc.status] = sc._count;
    });

    const returned = byStatus[LostItemStatus.RETURNED];
    const returnRate = total > 0 ? Math.round((returned / total) * 100) : 0;

    return {
      total,
      byStatus,
      returnRate,
    };
  }
}
