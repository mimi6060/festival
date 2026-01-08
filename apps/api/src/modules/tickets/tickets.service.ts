/**
 * Tickets Service
 *
 * Handles ticket-related business logic including:
 * - Ticket purchase
 * - QR code generation and validation
 * - Ticket scanning at entry points
 * - User ticket management
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  TicketStatus,
  TicketType,
  FestivalStatus,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

// Import BusinessException pattern
import {
  NotFoundException,
  ForbiddenException,
  ValidationException,
} from '../../common/exceptions/base.exception';
import {
  TicketSoldOutException,
  TicketQuotaExceededException,
  TicketSaleNotStartedException,
  TicketSaleEndedException,
  TicketAlreadyUsedException,
  TicketTransferFailedException,
  FestivalCancelledException,
  FestivalEndedException,
} from '../../common/exceptions/business.exception';
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
    private readonly configService: ConfigService,
    private readonly emailService: EmailService
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

    this.validatePurchaseQuantity(quantity);

    const [festival, category] = await this.fetchFestivalAndCategory(festivalId, categoryId);

    this.validateFestivalForPurchase(festival, festivalId);
    this.validateCategoryForPurchase(category, categoryId, festivalId);
    this.validateSalePeriod(category);
    this.validateTicketAvailability(category, categoryId, quantity);

    await this.validateUserQuota(userId, categoryId, quantity, category.maxPerUser);

    const tickets = await this.createTicketsInTransaction(
      userId,
      festivalId,
      categoryId,
      quantity,
      category
    );

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
   * Get user's tickets with pagination
   */
  async getUserTickets(
    userId: string,
    options?: { festivalId?: string; page?: number; limit?: number }
  ): Promise<{
    items: TicketEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }> {
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.TicketWhereInput = { userId };

    if (options?.festivalId) {
      where.festivalId = options.festivalId;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
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
        skip,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: tickets.map(this.mapToEntity),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
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
      throw NotFoundException.ticket(ticketId);
    }

    if (userId && ticket.userId !== userId) {
      throw ForbiddenException.resourceForbidden(`ticket:${ticketId}`);
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
      throw NotFoundException.ticket(ticketId);
    }

    if (ticket.userId !== userId) {
      throw ForbiddenException.resourceForbidden(`ticket:${ticketId}`);
    }

    if (ticket.status !== TicketStatus.SOLD) {
      throw new TicketAlreadyUsedException(ticketId, ticket.usedAt || new Date());
    }

    // Check if cancellation is allowed (e.g., before festival starts)
    const now = new Date();
    if (now >= ticket.festival.startDate) {
      throw new TicketSaleEndedException(ticket.festival.startDate);
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
   * Transfer a ticket to another user
   */
  async transferTicket(
    ticketId: string,
    fromUserId: string,
    toUserEmail: string
  ): Promise<TicketEntity> {
    const normalizedEmail = toUserEmail.toLowerCase().trim();

    const ticket = await this.fetchTicketForTransfer(ticketId);
    this.validateTicketOwnership(ticket, ticketId, fromUserId);
    this.validateTicketStatusForTransfer(ticket, ticketId);
    this.validateFestivalStatusForTransfer(ticket);
    this.validateNotSelfTransfer(ticket, ticketId, normalizedEmail);

    const recipientUser = await this.findOrCreateRecipient(normalizedEmail);
    await this.validateRecipientQuota(recipientUser.id, ticket, ticketId);

    const updatedTicket = await this.executeTicketTransfer(ticketId, fromUserId, recipientUser.id);

    this.logger.log(
      `Ticket ${ticketId} transferred from ${ticket.user.email} to ${normalizedEmail}`
    );

    await this.sendTransferNotification(normalizedEmail, recipientUser, ticket);

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

  // ============================================================================
  // Purchase Ticket Helper Methods
  // ============================================================================

  /**
   * Validate purchase quantity is at least 1
   */
  private validatePurchaseQuantity(quantity: number): void {
    if (quantity < 1) {
      throw new ValidationException('Quantity must be at least 1', [
        { field: 'quantity', message: 'Quantity must be at least 1', value: quantity },
      ]);
    }
  }

  /**
   * Fetch festival and category in parallel
   */
  private async fetchFestivalAndCategory(
    festivalId: string,
    categoryId: string
  ): Promise<[any, any]> {
    return Promise.all([
      this.prisma.festival.findUnique({ where: { id: festivalId } }),
      this.prisma.ticketCategory.findUnique({ where: { id: categoryId } }),
    ]);
  }

  /**
   * Validate festival status for ticket purchase
   */
  private validateFestivalForPurchase(festival: any, festivalId: string): void {
    if (!festival) {
      throw NotFoundException.festival(festivalId);
    }

    if (festival.isDeleted) {
      throw new FestivalCancelledException(festivalId);
    }

    if (festival.status === FestivalStatus.CANCELLED) {
      throw new FestivalCancelledException(festivalId);
    }

    if (festival.status === FestivalStatus.COMPLETED) {
      throw new FestivalEndedException(festivalId, festival.endDate);
    }
  }

  /**
   * Validate category exists and belongs to the festival
   */
  private validateCategoryForPurchase(category: any, categoryId: string, festivalId: string): void {
    if (!category) {
      throw NotFoundException.ticketCategory(categoryId);
    }

    if (category.festivalId !== festivalId) {
      throw new ValidationException('Category does not belong to this festival', [
        {
          field: 'categoryId',
          message: 'Category does not belong to this festival',
          value: categoryId,
        },
      ]);
    }

    if (!category.isActive) {
      throw new TicketSoldOutException(categoryId, category.name);
    }
  }

  /**
   * Validate sale period is active
   */
  private validateSalePeriod(category: any): void {
    const now = new Date();

    if (now < category.saleStartDate) {
      throw new TicketSaleNotStartedException(category.saleStartDate);
    }

    if (now > category.saleEndDate) {
      throw new TicketSaleEndedException(category.saleEndDate);
    }
  }

  /**
   * Validate ticket availability
   */
  private validateTicketAvailability(category: any, categoryId: string, quantity: number): void {
    const availableTickets = category.quota - category.soldCount;

    if (availableTickets < quantity) {
      if (availableTickets === 0) {
        throw new TicketSoldOutException(categoryId, category.name);
      }
      throw new TicketQuotaExceededException(availableTickets, quantity);
    }
  }

  /**
   * Validate user hasn't exceeded max tickets per user
   */
  private async validateUserQuota(
    userId: string,
    categoryId: string,
    quantity: number,
    maxPerUser: number
  ): Promise<void> {
    const userTicketCount = await this.prisma.ticket.count({
      where: {
        userId,
        categoryId,
        status: { in: [TicketStatus.SOLD, TicketStatus.RESERVED] },
      },
    });

    if (userTicketCount + quantity > maxPerUser) {
      throw new TicketQuotaExceededException(maxPerUser, userTicketCount + quantity);
    }
  }

  /**
   * Create tickets in a database transaction
   */
  private async createTicketsInTransaction(
    userId: string,
    festivalId: string,
    categoryId: string,
    quantity: number,
    category: any
  ): Promise<TicketEntity[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.ticketCategory.update({
        where: { id: categoryId },
        data: { soldCount: { increment: quantity } },
      });

      const ticketDataArray = this.generateTicketDataArray(
        userId,
        festivalId,
        categoryId,
        quantity,
        category
      );

      await tx.ticket.createMany({ data: ticketDataArray });

      const createdTickets = await tx.ticket.findMany({
        where: { id: { in: ticketDataArray.map((t) => t.id) } },
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
  }

  /**
   * Generate ticket data array for batch insert
   */
  private generateTicketDataArray(
    userId: string,
    festivalId: string,
    categoryId: string,
    quantity: number,
    category: any
  ): {
    id: string;
    festivalId: string;
    categoryId: string;
    userId: string;
    qrCode: string;
    qrCodeData: string;
    status: TicketStatus;
    purchasePrice: any;
  }[] {
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

    return ticketDataArray;
  }

  // ============================================================================
  // Transfer Ticket Helper Methods
  // ============================================================================

  /**
   * Fetch ticket with all relations needed for transfer
   */
  private async fetchTicketForTransfer(ticketId: string): Promise<any> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
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
      throw NotFoundException.ticket(ticketId);
    }

    return ticket;
  }

  /**
   * Validate ticket belongs to the sender
   */
  private validateTicketOwnership(ticket: any, ticketId: string, userId: string): void {
    if (ticket.userId !== userId) {
      throw ForbiddenException.resourceForbidden(`ticket:${ticketId}`);
    }
  }

  /**
   * Validate ticket status allows transfer
   */
  private validateTicketStatusForTransfer(ticket: any, ticketId: string): void {
    if (ticket.status === TicketStatus.USED) {
      throw new TicketAlreadyUsedException(ticketId, ticket.usedAt || new Date());
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      throw new TicketTransferFailedException(ticketId, 'Ticket has been cancelled');
    }

    if (ticket.status === TicketStatus.REFUNDED) {
      throw new TicketTransferFailedException(ticketId, 'Ticket has been refunded');
    }
  }

  /**
   * Validate festival status allows transfer
   */
  private validateFestivalStatusForTransfer(ticket: any): void {
    if (ticket.festival.status === FestivalStatus.CANCELLED) {
      throw new FestivalCancelledException(ticket.festivalId);
    }

    if (ticket.festival.status === FestivalStatus.COMPLETED) {
      throw new FestivalEndedException(ticket.festivalId, ticket.festival.endDate);
    }
  }

  /**
   * Validate user is not transferring to themselves
   */
  private validateNotSelfTransfer(ticket: any, ticketId: string, recipientEmail: string): void {
    if (ticket.user.email.toLowerCase() === recipientEmail) {
      throw new TicketTransferFailedException(ticketId, 'Cannot transfer ticket to yourself');
    }
  }

  /**
   * Find or create recipient user
   */
  private async findOrCreateRecipient(email: string): Promise<any> {
    let recipientUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!recipientUser) {
      recipientUser = await this.prisma.user.create({
        data: {
          email,
          passwordHash: '',
          firstName: '',
          lastName: '',
          role: UserRole.USER,
          status: UserStatus.PENDING_VERIFICATION,
          emailVerified: false,
        },
      });

      this.logger.log(`Created new user ${email} for ticket transfer`);
    }

    return recipientUser;
  }

  /**
   * Validate recipient hasn't exceeded quota for this category
   */
  private async validateRecipientQuota(
    recipientId: string,
    ticket: any,
    ticketId: string
  ): Promise<void> {
    const recipientTicketCount = await this.prisma.ticket.count({
      where: {
        userId: recipientId,
        categoryId: ticket.categoryId,
        status: { in: [TicketStatus.SOLD, TicketStatus.RESERVED] },
      },
    });

    if (recipientTicketCount >= ticket.category.maxPerUser) {
      throw new TicketTransferFailedException(
        ticketId,
        `Recipient has reached maximum tickets for this category (${ticket.category.maxPerUser})`
      );
    }
  }

  /**
   * Execute the ticket transfer update
   */
  private async executeTicketTransfer(
    ticketId: string,
    fromUserId: string,
    toUserId: string
  ): Promise<any> {
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        userId: toUserId,
        transferredFromUserId: fromUserId,
        transferredAt: new Date(),
      },
      include: {
        festival: {
          select: { id: true, name: true, startDate: true, endDate: true, location: true },
        },
        category: {
          select: { id: true, name: true, type: true },
        },
      },
    });
  }

  /**
   * Send transfer notification email (non-blocking)
   */
  private async sendTransferNotification(
    recipientEmail: string,
    recipientUser: any,
    ticket: any
  ): Promise<void> {
    try {
      await this.emailService.sendTicketTransferEmail(recipientEmail, {
        recipientFirstName: recipientUser.firstName || undefined,
        senderFirstName: ticket.user.firstName,
        senderLastName: ticket.user.lastName,
        senderEmail: ticket.user.email,
        festivalName: ticket.festival.name,
        ticketType: ticket.category.name,
        ticketCode: ticket.qrCode,
        eventDate: ticket.festival.startDate,
        eventLocation: ticket.festival.location || undefined,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send transfer notification email to ${recipientEmail}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // ============================================================================
  // Entity Mapping
  // ============================================================================

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

  // ============================================================================
  // Soft Delete Operations
  // ============================================================================

  /**
   * Soft delete a ticket
   * Sets isDeleted=true and deletedAt=now()
   */
  async softDeleteTicket(
    ticketId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId },
      include: { festival: true },
      includeDeleted: true,
    } as any);

    if (!ticket) {
      throw NotFoundException.ticket(ticketId);
    }

    if (ticket.userId !== userId) {
      throw ForbiddenException.resourceForbidden(`ticket:${ticketId}`);
    }

    if (ticket.isDeleted) {
      throw new ValidationException('Ticket is already deleted', [
        { field: 'ticketId', message: 'Ticket is already deleted', value: ticketId },
      ]);
    }

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    this.logger.log(`Ticket ${ticketId} soft deleted by user ${userId}`);

    return {
      success: true,
      message: `Ticket ${ticketId} has been deleted`,
    };
  }

  /**
   * Restore a soft-deleted ticket
   * Sets isDeleted=false and deletedAt=null
   */
  async restoreTicket(ticketId: string, userId: string): Promise<TicketEntity> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId },
      include: {
        festival: {
          select: { id: true, name: true, startDate: true, endDate: true, status: true },
        },
        category: {
          select: { id: true, name: true, type: true },
        },
      },
      includeDeleted: true,
    } as any);

    if (!ticket) {
      throw NotFoundException.ticket(ticketId);
    }

    if (ticket.userId !== userId) {
      throw ForbiddenException.resourceForbidden(`ticket:${ticketId}`);
    }

    if (!ticket.isDeleted) {
      throw new ValidationException('Ticket is not deleted', [
        { field: 'ticketId', message: 'Ticket is not deleted', value: ticketId },
      ]);
    }

    // Check if festival is still active
    if (ticket.festival.status === FestivalStatus.CANCELLED) {
      throw new FestivalCancelledException(ticket.festivalId);
    }

    if (ticket.festival.status === FestivalStatus.COMPLETED) {
      throw new FestivalEndedException(ticket.festivalId, ticket.festival.endDate);
    }

    const restoredTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        isDeleted: false,
        deletedAt: null,
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

    this.logger.log(`Ticket ${ticketId} restored by user ${userId}`);

    return this.mapToEntity(restoredTicket);
  }

  /**
   * Get all soft-deleted tickets for a user
   */
  async getDeletedTickets(
    userId: string,
    options?: { page?: number; limit?: number; festivalId?: string }
  ): Promise<{
    items: TicketEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      isDeleted: true,
    };

    if (options?.festivalId) {
      where.festivalId = options.festivalId;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          festival: {
            select: { id: true, name: true, startDate: true, endDate: true },
          },
          category: {
            select: { id: true, name: true, type: true },
          },
        },
        skip,
        take: limit,
        orderBy: { deletedAt: 'desc' },
        includeDeleted: true,
      } as any),
      this.prisma.ticket.count({
        where,
        includeDeleted: true,
      } as any),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: tickets.map(this.mapToEntity),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Hard delete a soft-deleted ticket (permanent deletion)
   * Only for admin use
   */
  async hardDeleteTicket(ticketId: string): Promise<{ success: boolean; message: string }> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId },
      includeDeleted: true,
    } as any);

    if (!ticket) {
      throw NotFoundException.ticket(ticketId);
    }

    // Permanently delete the ticket
    await (this.prisma.ticket.delete as any)({
      where: { id: ticketId },
      hardDelete: true,
    });

    this.logger.warn(`Ticket ${ticketId} permanently deleted`);

    return {
      success: true,
      message: `Ticket ${ticketId} has been permanently deleted`,
    };
  }
}
