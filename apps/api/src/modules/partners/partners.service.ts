import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto';
import { PartnerType } from '@prisma/client';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(festivalId: string, createPartnerDto: CreatePartnerDto) {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    return this.prisma.partner.create({
      data: {
        ...createPartnerDto,
        festivalId,
      },
    });
  }

  async findAll(festivalId: string, type?: PartnerType, activeOnly = true) {
    return this.prisma.partner.findMany({
      where: {
        festivalId,
        ...(type && { type }),
        ...(activeOnly && { isActive: true }),
      },
      orderBy: [{ type: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      include: {
        festival: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!partner) {
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }

    return partner;
  }

  async update(id: string, updatePartnerDto: UpdatePartnerDto) {
    // Verify partner exists
    await this.findOne(id);

    return this.prisma.partner.update({
      where: { id },
      data: updatePartnerDto,
    });
  }

  async remove(id: string) {
    // Verify partner exists
    await this.findOne(id);

    return this.prisma.partner.delete({
      where: { id },
    });
  }

  async getByType(festivalId: string) {
    const partners = await this.findAll(festivalId);

    // Group by type
    const grouped: Record<string, typeof partners> = {};
    for (const partner of partners) {
      if (!grouped[partner.type]) {
        grouped[partner.type] = [];
      }
      grouped[partner.type].push(partner);
    }

    return grouped;
  }
}
