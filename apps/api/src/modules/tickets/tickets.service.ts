/**
 * Tickets Service
 *
 * Handles ticket-related business logic including:
 * - Ticket purchase
 * - QR code generation and validation
 * - Ticket scanning at entry points
 * - User ticket management
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketStatus, TicketType, FestivalStatus, Prisma } from '@prisma/client';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '@festival/utils';
// ============================================================================
// Types
// ============================================================================

export interface PurchaseTicketDto {
  festivalId: string;
  categoryId: string;
  quantity: number;
}

export interface ValidateTicketDto {
  qrCode: string;
  zoneId?: string;
}

export interface TicketEntity {
  id: string;
  festivalId: string;
  categoryId: string;
  userId: string;
  qrCode: string;
  status: TicketStatus;
  purchasePrice: number;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  festival?: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
  category?: {
    id: string;
    name: string;
    type: TicketType;
  };
}

export interface ValidationResult {
  valid: boolean;
  ticket?: TicketEntity;
  message: string;
  accessGranted?: boolean;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  private readonly qrSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    // Validate QR code secret is configured and meets minimum security requirements
    const qrSecret = this.configService.getOrThrow<string>('QR_CODE_SECRET');

    if (qrSecret.length < 32) {
      throw new Error('QR_CODE_SECRET must be at least 32 characters for security');
    }

    this.qrSecret = qrSecret;
  }

  /**
   * Purchase tickets for a festival
   */
  async purchaseTickets(userId: string, dto: PurchaseTicketDto): Promise<TicketEntity[]> {
    const { festivalId, categoryId, quantity } = dto;

    // Validate quantity
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    // Get festival and category
    const [festival, category] = await Promise.all([
      this.prisma.festival.findUnique({
        where: { id: festivalId },
      }),
      this.prisma.ticketCategory.findUnique({
        where: { id: categoryId },
      }),
    ]);

    if (!festival) {
      throw new NotFoundException('Festival not found');
    }

    if (festival.isDeleted) {
      throw new BadRequestException('Festival is no longer available');
    }

    if (festival.status === FestivalStatus.CANCELLED) {
      throw new BadRequestException('Festival has been cancelled');
    }

    if (festival.status === FestivalStatus.COMPLETED) {
      throw new BadRequestException('Festival has already ended');
    }

    if (!category) {
      throw new NotFoundException('Ticket category not found');
    }

    if (category.festivalId !== festivalId) {
      throw new BadRequestException('Category does not belong to this festival');
    }

    if (!category.isActive) {
      throw new BadRequestException('Ticket category is not available');
    }

    // Check sale dates
    const now = new Date();
    if (now < category.saleStartDate) {
      throw new BadRequestException('Ticket sales have not started yet');
    }

    if (now > category.saleEndDate) {
      throw new BadRequestException('Ticket sales have ended');
    }

    // Check availability
    const availableTickets = category.quota - category.soldCount;
    if (availableTickets < quantity) {
      if (availableTickets === 0) {
        throw new ConflictException('Tickets are sold out');
      }
      throw new ConflictException(`Only ${availableTickets} tickets available`);
    }

    // Check max per user
    const userTicketCount = await this.prisma.ticket.count({
      where: {
        userId,
        categoryId,
        status: { in: [TicketStatus.SOLD, TicketStatus.RESERVED] },
      },
    });

    if (userTicketCount + quantity > category.maxPerUser) {
      throw new BadRequestException(
        `Maximum ${category.maxPerUser} tickets per user for this category`
      );
    }

    // Create tickets in a transaction
    const tickets = await this.prisma.$transaction(async (tx) => {
      // Update sold count
      await tx.ticketCategory.update({
        where: { id: categoryId },
        data: { soldCount: { increment: quantity } },
      });

      // Pre-generate ticket data for batch insert
      const ticketDataArray = [];
      for (let i = 0; i < quantity; i++) {
        const ticketId = uuidv4();
        const qrCode = this.generateQrCode(ticketId, festivalId, category.type);

        ticketDataArray.push({
          id: ticketId,
          festivalId,
          categoryId,
          userId,
          qrCode: qrCode.code,
          qrCodeData: qrCode.signedData,
          status: TicketStatus.SOLD,
          purchasePrice: category.price,
        });
      }

      // Batch insert tickets
      await tx.ticket.createMany({
        data: ticketDataArray,
      });

      // Retrieve created tickets with relations
      const createdTickets = await tx.ticket.findMany({
        where: {
          id: { in: ticketDataArray.map((t) => t.id) },
        },
        include: {
          festival: {
            select: { id: true, name: true, startDate: true, endDate: true },
          },
          category: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return createdTickets.map(this.mapToEntity);
    });

    this.logger.log(`User ${userId} purchased ${quantity} ticket(s) for festival ${festivalId}`);

    return tickets;
  }

  /**
   * Validate a ticket QR code
   */
  async validateTicket(dto: ValidateTicketDto, _staffId?: string): Promise<ValidationResult> {
    const { qrCode, zoneId } = dto;

    // Find ticket by QR code
    const ticket = await this.prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        festival: true,
        category: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!ticket) {
      return {
        valid: false,
        message: 'Invalid ticket - QR code not found',
      };
    }

    // Check ticket status
    if (ticket.status === TicketStatus.CANCELLED) {
      return {
        valid: false,
        ticket: this.mapToEntity(ticket),
        message: 'Ticket has been cancelled',
      };
    }

    if (ticket.status === TicketStatus.REFUNDED) {
      return {
        valid: false,
        ticket: this.mapToEntity(ticket),
        message: 'Ticket has been refunded',
      };
    }

    if (ticket.status === TicketStatus.USED) {
      return {
        valid: false,
        ticket: this.mapToEntity(ticket),
        message: `Ticket already used on ${ticket.usedAt?.toISOString()}`,
      };
    }

    // Check festival is active
    const now = new Date();
    if (ticket.festival.status !== FestivalStatus.ONGOING) {
      if (now < ticket.festival.startDate) {
        return {
          valid: true,
          ticket: this.mapToEntity(ticket),
          message: 'Ticket is valid but festival has not started yet',
          accessGranted: false,
        };
      }
      if (now > ticket.festival.endDate) {
        return {
          valid: false,
          ticket: this.mapToEntity(ticket),
          message: 'Festival has ended',
        };
      }
    }

    // Check zone access if specified
    if (zoneId) {
      const zone = await this.prisma.zone.findUnique({
        where: { id: zoneId },
      });

      if (!zone) {
        return {
          valid: false,
          message: 'Invalid zone',
        };
      }

      const ticketType = ticket.category.type;
      if (zone.requiresTicketType.length > 0 && !zone.requiresTicketType.includes(ticketType)) {
        return {
          valid: true,
          ticket: this.mapToEntity(ticket),
          message: `Ticket type ${ticketType} does not have access to ${zone.name}`,
          accessGranted: false,
        };
      }

      // Check zone capacity
      if (zone.capacity && zone.currentOccupancy >= zone.capacity) {
        return {
          valid: true,
          ticket: this.mapToEntity(ticket),
          message: `Zone ${zone.name} is at full capacity`,
          accessGranted: false,
        };
      }
    }

    return {
      valid: true,
      ticket: this.mapToEntity(ticket),
      message: 'Ticket is valid',
      accessGranted: true,
    };
  }

  /**
   * Scan ticket at entry point (marks as used)
   */
  async scanTicket(qrCode: string, staffId: string, zoneId?: string): Promise<ValidationResult> {
    // First validate
    const validation = await this.validateTicket({ qrCode, zoneId }, staffId);

    if (!validation.valid || !validation.accessGranted) {
      return validation;
    }

    // Mark ticket as used
    const ticket = await this.prisma.ticket.update({
      where: { qrCode },
      data: {
        status: TicketStatus.USED,
        usedAt: new Date(),
        usedByStaffId: staffId,
      },
      include: {
        festival: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
        category: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    // Log zone access if applicable
    if (zoneId) {
      await this.prisma.zoneAccessLog.create({
        data: {
          zoneId,
          ticketId: ticket.id,
          action: 'ENTRY',
          performedById: staffId,
        },
      });

      // Update zone occupancy
      await this.prisma.zone.update({
        where: { id: zoneId },
        data: { currentOccupancy: { increment: 1 } },
      });
    }

    this.logger.log(`Ticket ${ticket.id} scanned by staff ${staffId}`);

    return {
      valid: true,
      ticket: this.mapToEntity(ticket),
      message: 'Entry granted',
      accessGranted: true,
    };
  }

  /**
   * Get user's tickets
   */
  async getUserTickets(userId: string, festivalId?: string): Promise<TicketEntity[]> {
    const where: Prisma.TicketWhereInput = { userId };

    if (festivalId) {
      where.festivalId = festivalId;
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        festival: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
        category: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map(this.mapToEntity);
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(ticketId: string, userId?: string): Promise<TicketEntity> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        festival: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
        category: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (userId && ticket.userId !== userId) {
      throw new ForbiddenException('You can only access your own tickets');
    }

    return this.mapToEntity(ticket);
  }

  /**
   * Cancel a ticket
   */
  async cancelTicket(ticketId: string, userId: string): Promise<TicketEntity> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        festival: true,
        category: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own tickets');
    }

    if (ticket.status !== TicketStatus.SOLD) {
      throw new BadRequestException('Only unused tickets can be cancelled');
    }

    // Check if cancellation is allowed (e.g., before festival starts)
    const now = new Date();
    if (now >= ticket.festival.startDate) {
      throw new BadRequestException('Cannot cancel tickets after festival has started');
    }

    // Cancel ticket and update category sold count
    const [updatedTicket] = await this.prisma.$transaction([
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.CANCELLED },
        include: {
          festival: {
            select: { id: true, name: true, startDate: true, endDate: true },
          },
          category: {
            select: { id: true, name: true, type: true },
          },
        },
      }),
      this.prisma.ticketCategory.update({
        where: { id: ticket.categoryId },
        data: { soldCount: { decrement: 1 } },
      }),
    ]);

    this.logger.log(`Ticket ${ticketId} cancelled by user ${userId}`);

    return this.mapToEntity(updatedTicket);
  }

  /**
   * Get ticket QR code image
   */
  async getTicketQrCodeImage(ticketId: string, userId?: string): Promise<string> {
    const ticket = await this.getTicketById(ticketId, userId);

    // Generate QR code image as base64
    const qrCodeDataUrl = await QRCode.toDataURL(ticket.qrCode, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return qrCodeDataUrl;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate unique QR code for a ticket
   */
  private generateQrCode(
    ticketId: string,
    festivalId: string,
    ticketType: TicketType
  ): { code: string; signedData: string } {
    const timestamp = Date.now();
    const payload = {
      ticketId,
      festivalId,
      type: ticketType,
      timestamp,
    };

    // Create signature
    const dataToSign = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', this.qrSecret)
      .update(dataToSign)
      .digest('hex')
      .substring(0, 16);

    // Create readable QR code
    const code = `QR-${ticketId.substring(0, 8)}-${signature}`.toUpperCase();
    const signedData = JSON.stringify({ ...payload, signature });

    return { code, signedData };
  }

  /**
   * Generate QR code data for display
   */
  private async generateQrCodeData(
    ticketId: string,
    festivalId: string,
    ticketType: TicketType
  ): Promise<string> {
    const payload = {
      ticketId,
      festivalId,
      type: ticketType,
      version: 1,
    };

    return JSON.stringify(payload);
  }

  /**
   * Map Prisma ticket to entity
   */
  private mapToEntity(ticket: {
    id: string;
    festivalId: string;
    categoryId: string;
    userId: string;
    qrCode: string;
    status: TicketStatus;
    purchasePrice: number | Prisma.Decimal;
    usedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    festival?: { id: string; name: string; startDate: Date; endDate: Date };
    category?: { id: string; name: string; type: TicketType };
  }): TicketEntity {
    return {
      id: ticket.id,
      festivalId: ticket.festivalId,
      categoryId: ticket.categoryId,
      userId: ticket.userId,
      qrCode: ticket.qrCode,
      status: ticket.status,
      purchasePrice: Number(ticket.purchasePrice),
      usedAt: ticket.usedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      festival: ticket.festival
        ? {
            id: ticket.festival.id,
            name: ticket.festival.name,
            startDate: ticket.festival.startDate,
            endDate: ticket.festival.endDate,
          }
        : undefined,
      category: ticket.category
        ? {
            id: ticket.category.id,
            name: ticket.category.name,
            type: ticket.category.type,
          }
        : undefined,
    };
  }
}
