import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSponsorDto, UpdateSponsorDto } from './dto/sponsor.dto';
import { SponsorTier } from '@prisma/client';

@Injectable()
export class SponsorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(festivalId: string, createSponsorDto: CreateSponsorDto) {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    return this.prisma.sponsor.create({
      data: {
        ...createSponsorDto,
        festivalId,
        startDate: createSponsorDto.startDate ? new Date(createSponsorDto.startDate) : undefined,
        endDate: createSponsorDto.endDate ? new Date(createSponsorDto.endDate) : undefined,
      },
    });
  }

  async findAll(festivalId: string, tier?: SponsorTier, activeOnly = true) {
    return this.prisma.sponsor.findMany({
      where: {
        festivalId,
        ...(tier && { tier }),
        ...(activeOnly && { isActive: true }),
      },
      orderBy: [{ tier: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const sponsor = await this.prisma.sponsor.findUnique({
      where: { id },
      include: {
        festival: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!sponsor) {
      throw new NotFoundException(`Sponsor with ID ${id} not found`);
    }

    return sponsor;
  }

  async update(id: string, updateSponsorDto: UpdateSponsorDto) {
    // Verify sponsor exists
    await this.findOne(id);

    return this.prisma.sponsor.update({
      where: { id },
      data: {
        ...updateSponsorDto,
        startDate: updateSponsorDto.startDate ? new Date(updateSponsorDto.startDate) : undefined,
        endDate: updateSponsorDto.endDate ? new Date(updateSponsorDto.endDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    // Verify sponsor exists
    await this.findOne(id);

    return this.prisma.sponsor.delete({
      where: { id },
    });
  }

  async getByTier(festivalId: string) {
    const sponsors = await this.findAll(festivalId);

    // Group by tier
    const grouped = {
      PLATINUM: sponsors.filter((s) => s.tier === 'PLATINUM'),
      GOLD: sponsors.filter((s) => s.tier === 'GOLD'),
      SILVER: sponsors.filter((s) => s.tier === 'SILVER'),
      BRONZE: sponsors.filter((s) => s.tier === 'BRONZE'),
      PARTNER: sponsors.filter((s) => s.tier === 'PARTNER'),
    };

    return grouped;
  }
}
