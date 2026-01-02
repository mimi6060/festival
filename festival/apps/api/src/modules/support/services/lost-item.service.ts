import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CreateLostItemDto,
  UpdateLostItemDto,
  ClaimLostItemDto,
  MarkAsFoundDto,
  LostItemQueryDto,
  LostItemResponseDto,
  LostItemStatisticsDto,
  LostItemStatus,
} from '../dto/lost-item.dto';

@Injectable()
export class LostItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ===== CRUD Operations =====

  async create(
    reporterId: string,
    dto: CreateLostItemDto,
  ): Promise<LostItemResponseDto> {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: dto.festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${dto.festivalId} not found`);
    }

    const lostItem = await this.prisma.lostItem.create({
      data: {
        festivalId: dto.festivalId,
        reportedBy: reporterId,
        description: dto.description,
        location: dto.location,
        contactInfo: dto.contactInfo,
        imageUrl: dto.imageUrl,
        status: LostItemStatus.REPORTED,
      },
    });

    this.eventEmitter.emit('support.lost-item.reported', {
      itemId: lostItem.id,
      festivalId: dto.festivalId,
      reporterId,
    });

    return this.formatResponse(lostItem);
  }

  async findAll(
    query: LostItemQueryDto,
    userId?: string,
  ): Promise<{ items: LostItemResponseDto[]; total: number }> {
    const where: any = {};

    if (query.festivalId) {
      where.festivalId = query.festivalId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.myItemsOnly && userId) {
      where.reportedBy = userId;
    }

    if (query.search) {
      where.description = { contains: query.search, mode: 'insensitive' };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.lostItem.findMany({
        where,
        orderBy: { createdAt: query.sortOrder || 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lostItem.count({ where }),
    ]);

    return {
      items: items.map((item) => this.formatResponse(item)),
      total,
    };
  }

  async findById(id: string): Promise<LostItemResponseDto> {
    const item = await this.prisma.lostItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Lost item with ID ${id} not found`);
    }

    return this.formatResponse(item);
  }

  async update(
    id: string,
    dto: UpdateLostItemDto,
    userId: string,
    isStaff = false,
  ): Promise<LostItemResponseDto> {
    const item = await this.prisma.lostItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Lost item with ID ${id} not found`);
    }

    // Only reporter or staff can update
    if (!isStaff && item.reportedBy !== userId) {
      throw new ForbiddenException('You can only update your own reported items');
    }

    const updated = await this.prisma.lostItem.update({
      where: { id },
      data: dto,
    });

    return this.formatResponse(updated);
  }

  async delete(id: string, userId: string, isStaff = false): Promise<void> {
    const item = await this.prisma.lostItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Lost item with ID ${id} not found`);
    }

    // Only reporter or staff can delete
    if (!isStaff && item.reportedBy !== userId) {
      throw new ForbiddenException('You can only delete your own reported items');
    }

    await this.prisma.lostItem.delete({
      where: { id },
    });
  }

  // ===== Status Operations =====

  async markAsFound(
    id: string,
    staffId: string,
    dto: MarkAsFoundDto,
  ): Promise<LostItemResponseDto> {
    const item = await this.prisma.lostItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Lost item with ID ${id} not found`);
    }

    if (item.status !== LostItemStatus.REPORTED) {
      throw new BadRequestException(
        `Item is already ${item.status.toLowerCase()}`,
      );
    }

    const updated = await this.prisma.lostItem.update({
      where: { id },
      data: {
        status: LostItemStatus.FOUND,
        foundBy: staffId,
        location: dto.foundLocation,
      },
    });

    this.eventEmitter.emit('support.lost-item.found', {
      itemId: id,
      foundBy: staffId,
      reportedBy: item.reportedBy,
    });

    return this.formatResponse(updated);
  }

  async claim(
    id: string,
    claimantId: string,
    dto: ClaimLostItemDto,
  ): Promise<LostItemResponseDto> {
    const item = await this.prisma.lostItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Lost item with ID ${id} not found`);
    }

    if (item.status !== LostItemStatus.FOUND) {
      throw new BadRequestException(
        'Only found items can be claimed. Current status: ' + item.status,
      );
    }

    // Note: In a real system, staff would verify the claim before marking as returned
    // Here we just record the claim request
    const updated = await this.prisma.lostItem.update({
      where: { id },
      data: {
        contactInfo: dto.contactInfo || item.contactInfo,
        // Store claim info in a note or separate table in production
      },
    });

    this.eventEmitter.emit('support.lost-item.claim-requested', {
      itemId: id,
      claimantId,
      proofOfOwnership: dto.proofOfOwnership,
    });

    return this.formatResponse(updated);
  }

  async markAsReturned(
    id: string,
    staffId: string,
  ): Promise<LostItemResponseDto> {
    const item = await this.prisma.lostItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Lost item with ID ${id} not found`);
    }

    if (item.status !== LostItemStatus.FOUND) {
      throw new BadRequestException(
        'Only found items can be marked as returned',
      );
    }

    const updated = await this.prisma.lostItem.update({
      where: { id },
      data: {
        status: LostItemStatus.RETURNED,
        claimedAt: new Date(),
      },
    });

    this.eventEmitter.emit('support.lost-item.returned', {
      itemId: id,
      staffId,
    });

    return this.formatResponse(updated);
  }

  async markAsUnclaimed(id: string): Promise<LostItemResponseDto> {
    const item = await this.prisma.lostItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Lost item with ID ${id} not found`);
    }

    const updated = await this.prisma.lostItem.update({
      where: { id },
      data: {
        status: LostItemStatus.UNCLAIMED,
      },
    });

    return this.formatResponse(updated);
  }

  // ===== Public Queries =====

  async getFoundItems(festivalId: string): Promise<LostItemResponseDto[]> {
    const items = await this.prisma.lostItem.findMany({
      where: {
        festivalId,
        status: LostItemStatus.FOUND,
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => this.formatResponse(item));
  }

  async getMyReportedItems(userId: string): Promise<LostItemResponseDto[]> {
    const items = await this.prisma.lostItem.findMany({
      where: { reportedBy: userId },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => this.formatResponse(item));
  }

  // ===== Statistics =====

  async getStatistics(festivalId?: string): Promise<LostItemStatisticsDto> {
    const where: any = festivalId ? { festivalId } : {};

    const [totalReported, totalFound, totalReturned, totalUnclaimed] =
      await Promise.all([
        this.prisma.lostItem.count({ where }),
        this.prisma.lostItem.count({
          where: { ...where, status: LostItemStatus.FOUND },
        }),
        this.prisma.lostItem.count({
          where: { ...where, status: LostItemStatus.RETURNED },
        }),
        this.prisma.lostItem.count({
          where: { ...where, status: LostItemStatus.UNCLAIMED },
        }),
      ]);

    const returnRate =
      totalReported > 0 ? (totalReturned / totalReported) * 100 : 0;

    // Stats by festival
    const byFestivalData = await this.prisma.lostItem.groupBy({
      by: ['festivalId', 'status'],
      _count: true,
    });

    // Get festival names
    const festivalIds = [...new Set(byFestivalData.map((f) => f.festivalId))];
    const festivals = await this.prisma.festival.findMany({
      where: { id: { in: festivalIds } },
      select: { id: true, name: true },
    });

    const byFestivalMap = new Map<
      string,
      { reported: number; found: number; returned: number }
    >();

    byFestivalData.forEach((item) => {
      if (!byFestivalMap.has(item.festivalId)) {
        byFestivalMap.set(item.festivalId, { reported: 0, found: 0, returned: 0 });
      }
      const stats = byFestivalMap.get(item.festivalId)!;
      stats.reported += item._count;
      if (item.status === LostItemStatus.FOUND) {
        stats.found += item._count;
      }
      if (item.status === LostItemStatus.RETURNED) {
        stats.returned += item._count;
      }
    });

    const byFestival = Array.from(byFestivalMap.entries()).map(
      ([festivalId, stats]) => ({
        festivalId,
        festivalName:
          festivals.find((f) => f.id === festivalId)?.name || 'Unknown',
        ...stats,
      }),
    );

    return {
      totalReported,
      totalFound,
      totalReturned,
      totalUnclaimed,
      returnRate: Math.round(returnRate * 10) / 10,
      byFestival,
    };
  }

  // ===== Helpers =====

  private formatResponse(item: any): LostItemResponseDto {
    return {
      id: item.id,
      festivalId: item.festivalId,
      reportedBy: item.reportedBy,
      description: item.description,
      location: item.location,
      status: item.status,
      foundBy: item.foundBy,
      contactInfo: item.contactInfo,
      imageUrl: item.imageUrl,
      claimedAt: item.claimedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
