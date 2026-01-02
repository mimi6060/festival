import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  CreateSupportMessageDto,
  SupportTicketQueryDto,
} from './dto';
import {
  SupportTicket,
  SupportMessage,
  SupportTicketStatus,
  UserRole,
  Prisma,
} from '@prisma/client';

interface SupportTicketWithRelations extends SupportTicket {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  messages: SupportMessage[];
}

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new support ticket
   */
  async createTicket(
    userId: string,
    dto: CreateSupportTicketDto,
  ): Promise<SupportTicket> {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        description: dto.description,
        festivalId: dto.festivalId,
        priority: dto.priority,
        status: SupportTicketStatus.OPEN,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get tickets for a user (or all tickets for admin)
   */
  async findAll(
    user: AuthenticatedUser,
    query: SupportTicketQueryDto,
  ): Promise<{
    tickets: SupportTicketWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;

    const where: Prisma.SupportTicketWhereInput = {};

    // Only admins and staff can see all tickets
    const staffRoles: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.ORGANIZER];
    if (!staffRoles.includes(user.role)) {
      where.userId = user.id;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.festivalId) {
      where.festivalId = query.festivalId;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Only get the latest message for the list view
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets: tickets as SupportTicketWithRelations[],
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single ticket by ID
   */
  async findById(
    id: string,
    user: AuthenticatedUser,
  ): Promise<SupportTicketWithRelations> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${id} not found`);
    }

    // Check authorization
    const staffRoles: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.ORGANIZER];
    const isOwner = ticket.userId === user.id;
    const isStaff = staffRoles.includes(user.role);

    if (!isOwner && !isStaff) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket as SupportTicketWithRelations;
  }

  /**
   * Update a ticket
   */
  async updateTicket(
    id: string,
    user: AuthenticatedUser,
    dto: UpdateSupportTicketDto,
  ): Promise<SupportTicket> {
    const ticket = await this.findById(id, user);

    // Only staff can update status and assignedTo
    const staffRoles: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.ORGANIZER];
    const isStaff = staffRoles.includes(user.role);
    const isOwner = ticket.userId === user.id;

    if (!isOwner && !isStaff) {
      throw new ForbiddenException('You do not have permission to update this ticket');
    }

    // Regular users can only update subject and description
    const updateData: Prisma.SupportTicketUpdateInput = {};

    if (isOwner) {
      if (dto.subject) updateData.subject = dto.subject;
      if (dto.description) updateData.description = dto.description;
    }

    if (isStaff) {
      if (dto.subject) updateData.subject = dto.subject;
      if (dto.description) updateData.description = dto.description;
      if (dto.status) updateData.status = dto.status;
      if (dto.priority) updateData.priority = dto.priority;
      if (dto.assignedTo) updateData.assignedTo = dto.assignedTo;
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Close a ticket
   */
  async closeTicket(
    id: string,
    user: AuthenticatedUser,
  ): Promise<SupportTicket> {
    const ticket = await this.findById(id, user);

    // Only owner or staff can close
    const staffRoles: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.ORGANIZER];
    const isOwner = ticket.userId === user.id;
    const isStaff = staffRoles.includes(user.role);

    if (!isOwner && !isStaff) {
      throw new ForbiddenException('You do not have permission to close this ticket');
    }

    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new BadRequestException('Ticket is already closed');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: { status: SupportTicketStatus.CLOSED },
    });
  }

  /**
   * Reopen a closed ticket
   */
  async reopenTicket(
    id: string,
    user: AuthenticatedUser,
  ): Promise<SupportTicket> {
    const ticket = await this.findById(id, user);

    if (ticket.status !== SupportTicketStatus.CLOSED) {
      throw new BadRequestException('Ticket is not closed');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: { status: SupportTicketStatus.OPEN },
    });
  }

  /**
   * Add a message to a ticket
   */
  async addMessage(
    user: AuthenticatedUser,
    dto: CreateSupportMessageDto,
  ): Promise<SupportMessage> {
    // Verify ticket exists and user has access
    const ticket = await this.findById(dto.ticketId, user);

    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new BadRequestException('Cannot add messages to a closed ticket');
    }

    // Determine if this is a staff message
    const staffRoles: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.ORGANIZER];
    const isStaff = staffRoles.includes(user.role);

    // Create message and update ticket status
    const [message] = await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: {
          ticketId: dto.ticketId,
          senderId: user.id,
          message: dto.message,
          isStaff,
        },
      }),
      // Update ticket status based on who is replying
      this.prisma.supportTicket.update({
        where: { id: dto.ticketId },
        data: {
          status: isStaff
            ? SupportTicketStatus.WAITING_FOR_USER
            : SupportTicketStatus.IN_PROGRESS,
        },
      }),
    ]);

    return message;
  }

  /**
   * Get messages for a ticket
   */
  async getMessages(
    ticketId: string,
    user: AuthenticatedUser,
  ): Promise<SupportMessage[]> {
    // Verify access
    await this.findById(ticketId, user);

    return this.prisma.supportMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get ticket statistics (ADMIN only)
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<SupportTicketStatus, number>;
    avgResponseTime: number;
    openTickets: number;
  }> {
    const [
      total,
      statusCounts,
      openTickets,
    ] = await Promise.all([
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.supportTicket.count({
        where: {
          status: {
            in: [
              SupportTicketStatus.OPEN,
              SupportTicketStatus.IN_PROGRESS,
              SupportTicketStatus.WAITING_FOR_USER,
            ],
          },
        },
      }),
    ]);

    const byStatus: Record<SupportTicketStatus, number> = {
      [SupportTicketStatus.OPEN]: 0,
      [SupportTicketStatus.IN_PROGRESS]: 0,
      [SupportTicketStatus.WAITING_FOR_USER]: 0,
      [SupportTicketStatus.RESOLVED]: 0,
      [SupportTicketStatus.CLOSED]: 0,
    };

    statusCounts.forEach((sc) => {
      byStatus[sc.status] = sc._count;
    });

    return {
      total,
      byStatus,
      avgResponseTime: 0, // Would need to calculate from message timestamps
      openTickets,
    };
  }
}
