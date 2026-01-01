import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TicketCategoriesService } from './ticket-categories.service';
import { PurchaseTicketsDto, ValidateTicketDto, ValidateTicketResponseDto } from './dto';
import { Ticket, TicketStatus, PaymentStatus, Prisma, UserRole } from '@prisma/client';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

interface TicketPayload {
  ticketId: string;
  festivalId: string;
  categoryId: string;
  userId: string;
  timestamp: number;
  signature: string;
}

interface TicketWithRelations extends Ticket {
  category: {
    name: string;
    type: string;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  festival: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
}

@Injectable()
export class TicketsService {
  private readonly qrSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly categoriesService: TicketCategoriesService,
  ) {
    // Get secret from config, fallback to generated one (should always be set in production)
    this.qrSecret =
      this.configService.get<string>('QR_CODE_SECRET') ||
      crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a signed payload for QR code
   */
  private generateSignedPayload(
    ticketId: string,
    festivalId: string,
    categoryId: string,
    userId: string,
  ): string {
    const timestamp = Date.now();
    const dataToSign = `${ticketId}:${festivalId}:${categoryId}:${userId}:${timestamp}`;

    const signature = crypto
      .createHmac('sha256', this.qrSecret)
      .update(dataToSign)
      .digest('hex');

    const payload: TicketPayload = {
      ticketId,
      festivalId,
      categoryId,
      userId,
      timestamp,
      signature,
    };

    // Encode as base64 for compact QR code
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Verify a signed QR code payload
   */
  private verifyPayload(encodedPayload: string): {
    valid: boolean;
    payload?: TicketPayload;
    error?: string;
  } {
    try {
      const decoded = Buffer.from(encodedPayload, 'base64').toString('utf8');
      const payload: TicketPayload = JSON.parse(decoded);

      const dataToSign = `${payload.ticketId}:${payload.festivalId}:${payload.categoryId}:${payload.userId}:${payload.timestamp}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.qrSecret)
        .update(dataToSign)
        .digest('hex');

      if (payload.signature !== expectedSignature) {
        return { valid: false, error: 'Invalid signature - potential fraud attempt' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: 'Invalid QR code format' };
    }
  }

  /**
   * Generate QR code image as base64 data URL
   */
  async generateQRCode(payload: string): Promise<string> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'H', // High error correction for better readability
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      return qrCodeDataUrl;
    } catch (error) {
      throw new BadRequestException('Failed to generate QR code');
    }
  }

  /**
   * Purchase tickets
   */
  async purchaseTickets(
    userId: string,
    purchaseDto: PurchaseTicketsDto,
  ): Promise<{ tickets: Ticket[]; payment: any; totalAmount: number }> {
    const { festivalId, items, paymentProvider } = purchaseDto;

    // Verify festival exists and is published
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    if (festival.status !== 'PUBLISHED' && festival.status !== 'ONGOING') {
      throw new BadRequestException('Tickets are not available for this festival');
    }

    // Validate all items and calculate total
    let totalAmount = 0;
    const validatedItems: Array<{
      category: any;
      quantity: number;
    }> = [];

    for (const item of items) {
      const canPurchase = await this.categoriesService.canUserPurchase(
        item.categoryId,
        userId,
        item.quantity,
      );

      if (!canPurchase.canPurchase) {
        throw new BadRequestException(canPurchase.reason);
      }

      const category = await this.categoriesService.findOne(item.categoryId);

      // Verify category belongs to the festival
      if (category.festivalId !== festivalId) {
        throw new BadRequestException(
          `Category ${category.name} does not belong to this festival`,
        );
      }

      totalAmount += Number(category.price) * item.quantity;
      validatedItems.push({ category, quantity: item.quantity });
    }

    // Use transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          userId,
          amount: new Prisma.Decimal(totalAmount),
          currency: festival.currency,
          status: PaymentStatus.COMPLETED, // Simplified - in production, integrate with payment provider
          provider: paymentProvider,
          description: `Ticket purchase for ${festival.name}`,
          paidAt: new Date(),
          metadata: {
            festivalId,
            itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
          },
        },
      });

      const tickets: Ticket[] = [];

      // Create tickets for each item
      for (const validatedItem of validatedItems) {
        const { category, quantity } = validatedItem;

        for (let i = 0; i < quantity; i++) {
          // Generate unique QR code
          const ticketId = crypto.randomUUID();
          const qrCodePayload = this.generateSignedPayload(
            ticketId,
            festivalId,
            category.id,
            userId,
          );

          const ticket = await tx.ticket.create({
            data: {
              id: ticketId,
              festivalId,
              categoryId: category.id,
              userId,
              qrCode: `TKT-${ticketId.substring(0, 8).toUpperCase()}`,
              qrCodeData: qrCodePayload,
              status: TicketStatus.SOLD,
              purchasePrice: category.price,
              paymentId: payment.id,
            },
          });

          tickets.push(ticket);
        }

        // Update sold count
        await tx.ticketCategory.update({
          where: { id: category.id },
          data: { soldCount: { increment: quantity } },
        });
      }

      // Update festival attendee count
      await tx.festival.update({
        where: { id: festivalId },
        data: {
          currentAttendees: {
            increment: tickets.length,
          },
        },
      });

      return { tickets, payment, totalAmount };
    });
  }

  /**
   * Get user's tickets
   */
  async getMyTickets(userId: string): Promise<TicketWithRelations[]> {
    return this.prisma.ticket.findMany({
      where: { userId },
      include: {
        category: {
          select: {
            name: true,
            type: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        festival: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as unknown as TicketWithRelations[];
  }

  /**
   * Get single ticket with QR code
   */
  async getTicketById(
    ticketId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<TicketWithRelations & { qrCodeImage: string }> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: {
          select: {
            name: true,
            type: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        festival: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    // Only owner or staff/admin can view ticket details
    const isOwner = ticket.userId === userId;
    const staffRoles: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.ORGANIZER];
    const isStaffOrAdmin = staffRoles.includes(userRole);

    if (!isOwner && !isStaffOrAdmin) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    // Generate QR code image
    const qrCodeImage = await this.generateQRCode(ticket.qrCodeData);

    return {
      ...(ticket as unknown as TicketWithRelations),
      qrCodeImage,
    };
  }

  /**
   * Validate ticket at entrance (STAFF only)
   */
  async validateTicket(
    validateDto: ValidateTicketDto,
    staffId: string,
  ): Promise<ValidateTicketResponseDto> {
    const { qrCodeData, zoneId } = validateDto;

    // Verify the QR code signature
    const verification = this.verifyPayload(qrCodeData);

    if (!verification.valid) {
      return {
        valid: false,
        message: verification.error || 'Invalid QR code',
      };
    }

    const { ticketId } = verification.payload!;

    // Find the ticket
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: {
          select: {
            name: true,
            type: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        festival: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      return {
        valid: false,
        message: 'Ticket not found',
      };
    }

    // Check ticket status
    if (ticket.status === TicketStatus.USED) {
      return {
        valid: false,
        message: `Ticket already used at ${ticket.usedAt?.toISOString()}`,
        ticket: {
          id: ticket.id,
          categoryName: ticket.category.name,
          categoryType: ticket.category.type,
          userName: `${ticket.user.firstName} ${ticket.user.lastName}`,
          userEmail: ticket.user.email,
          festivalName: ticket.festival.name,
          status: ticket.status,
        },
      };
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      return {
        valid: false,
        message: 'Ticket has been cancelled',
        ticket: {
          id: ticket.id,
          categoryName: ticket.category.name,
          categoryType: ticket.category.type,
          userName: `${ticket.user.firstName} ${ticket.user.lastName}`,
          userEmail: ticket.user.email,
          festivalName: ticket.festival.name,
          status: ticket.status,
        },
      };
    }

    if (ticket.status === TicketStatus.REFUNDED) {
      return {
        valid: false,
        message: 'Ticket has been refunded',
        ticket: {
          id: ticket.id,
          categoryName: ticket.category.name,
          categoryType: ticket.category.type,
          userName: `${ticket.user.firstName} ${ticket.user.lastName}`,
          userEmail: ticket.user.email,
          festivalName: ticket.festival.name,
          status: ticket.status,
        },
      };
    }

    // Check zone access if zoneId provided
    if (zoneId) {
      const zone = await this.prisma.zone.findUnique({
        where: { id: zoneId },
      });

      if (zone && zone.requiresTicketType.length > 0) {
        if (!zone.requiresTicketType.includes(ticket.category.type as any)) {
          return {
            valid: false,
            message: `This ticket type (${ticket.category.type}) does not grant access to ${zone.name}`,
            ticket: {
              id: ticket.id,
              categoryName: ticket.category.name,
              categoryType: ticket.category.type,
              userName: `${ticket.user.firstName} ${ticket.user.lastName}`,
              userEmail: ticket.user.email,
              festivalName: ticket.festival.name,
              status: ticket.status,
            },
          };
        }
      }
    }

    // Mark ticket as used
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.USED,
        usedAt: new Date(),
        usedByStaffId: staffId,
      },
    });

    return {
      valid: true,
      message: 'Ticket validated successfully',
      ticket: {
        id: ticket.id,
        categoryName: ticket.category.name,
        categoryType: ticket.category.type,
        userName: `${ticket.user.firstName} ${ticket.user.lastName}`,
        userEmail: ticket.user.email,
        festivalName: ticket.festival.name,
        status: TicketStatus.USED,
      },
    };
  }

  /**
   * Cancel ticket with refund rules
   */
  async cancelTicket(
    ticketId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{
    ticket: Ticket;
    refundAmount: number;
    refundPercentage: number;
    message: string;
  }> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        festival: true,
        category: true,
        payment: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    // Check authorization
    const isOwner = ticket.userId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to cancel this ticket');
    }

    // Check if ticket can be cancelled
    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException('Cannot cancel a ticket that has already been used');
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException('Ticket is already cancelled');
    }

    if (ticket.status === TicketStatus.REFUNDED) {
      throw new BadRequestException('Ticket has already been refunded');
    }

    // Calculate refund based on time until festival
    const now = new Date();
    const festivalStart = new Date(ticket.festival.startDate);
    const daysUntilFestival = Math.ceil(
      (festivalStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    let refundPercentage: number;
    let message: string;

    if (daysUntilFestival > 30) {
      refundPercentage = 100;
      message = 'Full refund - more than 30 days before festival';
    } else if (daysUntilFestival > 14) {
      refundPercentage = 75;
      message = '75% refund - 14-30 days before festival';
    } else if (daysUntilFestival > 7) {
      refundPercentage = 50;
      message = '50% refund - 7-14 days before festival';
    } else if (daysUntilFestival > 0) {
      refundPercentage = 25;
      message = '25% refund - less than 7 days before festival';
    } else {
      refundPercentage = 0;
      message = 'No refund - festival has already started';
    }

    const refundAmount = (Number(ticket.purchasePrice) * refundPercentage) / 100;

    // Update ticket and related records
    const updatedTicket = await this.prisma.$transaction(async (tx) => {
      // Update ticket status
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: refundPercentage > 0 ? TicketStatus.REFUNDED : TicketStatus.CANCELLED,
        },
      });

      // Decrement sold count
      await tx.ticketCategory.update({
        where: { id: ticket.categoryId },
        data: { soldCount: { decrement: 1 } },
      });

      // Decrement festival attendee count
      await tx.festival.update({
        where: { id: ticket.festivalId },
        data: { currentAttendees: { decrement: 1 } },
      });

      // In production, trigger actual refund through payment provider here
      if (refundAmount > 0 && ticket.payment) {
        await tx.payment.update({
          where: { id: ticket.payment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            refundedAt: new Date(),
            metadata: {
              ...(ticket.payment.metadata as object || {}),
              refundAmount,
              refundPercentage,
              refundReason: message,
            },
          },
        });
      }

      return updated;
    });

    return {
      ticket: updatedTicket,
      refundAmount,
      refundPercentage,
      message,
    };
  }

  /**
   * Get all tickets for a festival (ADMIN)
   */
  async getFestivalTickets(
    festivalId: string,
    options?: {
      status?: TicketStatus;
      categoryId?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    tickets: TicketWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { status, categoryId, page = 1, limit = 50 } = options || {};

    const where: Prisma.TicketWhereInput = {
      festivalId,
    };

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          category: {
            select: {
              name: true,
              type: true,
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          festival: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      tickets: tickets as unknown as TicketWithRelations[],
      total,
      page,
      limit,
    };
  }

  /**
   * Get ticket statistics for a festival
   */
  async getTicketStats(festivalId: string): Promise<{
    totalSold: number;
    totalRevenue: number;
    byCategory: Array<{
      categoryId: string;
      categoryName: string;
      categoryType: string;
      sold: number;
      quota: number;
      revenue: number;
      percentageSold: number;
    }>;
    byStatus: Record<TicketStatus, number>;
    usageRate: number;
  }> {
    // Get categories with stats
    const categories = await this.prisma.ticketCategory.findMany({
      where: { festivalId },
      include: {
        tickets: {
          select: {
            status: true,
            purchasePrice: true,
          },
        },
      },
    });

    // Get status counts
    const statusCounts = await this.prisma.ticket.groupBy({
      by: ['status'],
      where: { festivalId },
      _count: true,
    });

    const byStatus: Record<TicketStatus, number> = {
      [TicketStatus.AVAILABLE]: 0,
      [TicketStatus.RESERVED]: 0,
      [TicketStatus.SOLD]: 0,
      [TicketStatus.USED]: 0,
      [TicketStatus.CANCELLED]: 0,
      [TicketStatus.REFUNDED]: 0,
    };

    statusCounts.forEach((sc) => {
      byStatus[sc.status] = sc._count;
    });

    let totalSold = 0;
    let totalRevenue = 0;

    const byCategory = categories.map((cat) => {
      const validStatuses: TicketStatus[] = [TicketStatus.SOLD, TicketStatus.USED];
      const soldTickets = cat.tickets.filter((t) =>
        validStatuses.includes(t.status),
      );
      const revenue = soldTickets.reduce(
        (sum, t) => sum + Number(t.purchasePrice),
        0,
      );

      totalSold += cat.soldCount;
      totalRevenue += revenue;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryType: cat.type,
        sold: cat.soldCount,
        quota: cat.quota,
        revenue,
        percentageSold:
          cat.quota > 0 ? Math.round((cat.soldCount / cat.quota) * 100) : 0,
      };
    });

    const usedCount = byStatus[TicketStatus.USED];
    const validTickets = byStatus[TicketStatus.SOLD] + byStatus[TicketStatus.USED];
    const usageRate = validTickets > 0 ? Math.round((usedCount / validTickets) * 100) : 0;

    return {
      totalSold,
      totalRevenue,
      byCategory,
      byStatus,
      usageRate,
    };
  }
}
