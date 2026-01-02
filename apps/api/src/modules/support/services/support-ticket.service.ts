import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  CreateSupportMessageDto,
  ChangeTicketStatusDto,
  SupportTicketQueryDto,
  SupportTicketResponseDto,
  SupportMessageResponseDto,
  SupportTicketStatus,
  Priority,
  TicketStatisticsDto,
  SlaConfigDto,
} from '../dto/support-ticket.dto';

// Default SLA configuration (in hours)
const DEFAULT_SLA: SlaConfigDto = {
  lowPriorityHours: 72,
  mediumPriorityHours: 24,
  highPriorityHours: 8,
  urgentPriorityHours: 2,
};

@Injectable()
export class SupportTicketService {
  private slaConfig: SlaConfigDto = DEFAULT_SLA;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ===== Ticket CRUD =====

  async create(
    userId: string,
    dto: CreateSupportTicketDto,
  ): Promise<SupportTicketResponseDto> {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        festivalId: dto.festivalId,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority || Priority.MEDIUM,
        status: SupportTicketStatus.OPEN,
      },
      include: this.getTicketIncludes(),
    });

    // Emit event for notifications
    this.eventEmitter.emit('support.ticket.created', {
      ticketId: ticket.id,
      userId,
      subject: dto.subject,
      priority: dto.priority || Priority.MEDIUM,
    });

    // Auto-assign based on rules (optional)
    await this.tryAutoAssign(ticket.id, dto.priority || Priority.MEDIUM);

    return this.formatTicketResponse(ticket);
  }

  async findAll(
    query: SupportTicketQueryDto,
    userId?: string,
    isStaff = false,
  ): Promise<{ tickets: SupportTicketResponseDto[]; total: number }> {
    const where: any = {};

    // Non-staff can only see their own tickets
    if (!isStaff && userId) {
      where.userId = userId;
    }

    if (query.festivalId) {
      where.festivalId = query.festivalId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.assignedTo) {
      where.assignedTo = query.assignedTo;
    }

    if (query.unassignedOnly) {
      where.assignedTo = null;
    }

    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
      // Default: urgent first, then by creation date
      orderBy.createdAt = 'desc';
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: this.getTicketIncludes(),
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets: tickets.map((t) => this.formatTicketResponse(t)),
      total,
    };
  }

  async findById(
    id: string,
    userId?: string,
    isStaff = false,
  ): Promise<SupportTicketResponseDto> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        ...this.getTicketIncludes(),
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${id} not found`);
    }

    // Check access
    if (!isStaff && userId && ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return this.formatTicketResponse(ticket);
  }

  async update(
    id: string,
    dto: UpdateSupportTicketDto,
    performedBy: string,
  ): Promise<SupportTicketResponseDto> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${id} not found`);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: dto,
      include: this.getTicketIncludes(),
    });

    // Emit events based on changes
    if (dto.status && dto.status !== ticket.status) {
      this.eventEmitter.emit('support.ticket.status-changed', {
        ticketId: id,
        oldStatus: ticket.status,
        newStatus: dto.status,
        changedBy: performedBy,
      });
    }

    if (dto.assignedTo && dto.assignedTo !== ticket.assignedTo) {
      this.eventEmitter.emit('support.ticket.assigned', {
        ticketId: id,
        assignedTo: dto.assignedTo,
        assignedBy: performedBy,
      });
    }

    return this.formatTicketResponse(updated);
  }

  async changeStatus(
    id: string,
    dto: ChangeTicketStatusDto,
    performedBy: string,
  ): Promise<SupportTicketResponseDto> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${id} not found`);
    }

    // Validate status transitions
    this.validateStatusTransition(ticket.status as SupportTicketStatus, dto.status);

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status: dto.status },
      include: this.getTicketIncludes(),
    });

    // Add system message for status change
    await this.prisma.supportMessage.create({
      data: {
        ticketId: id,
        senderId: performedBy,
        message: `Statut change de ${ticket.status} a ${dto.status}${dto.reason ? `. Raison: ${dto.reason}` : ''}`,
        isStaff: true,
      },
    });

    this.eventEmitter.emit('support.ticket.status-changed', {
      ticketId: id,
      oldStatus: ticket.status,
      newStatus: dto.status,
      reason: dto.reason,
      changedBy: performedBy,
    });

    return this.formatTicketResponse(updated);
  }

  async assign(
    id: string,
    staffId: string,
    assignedBy: string,
  ): Promise<SupportTicketResponseDto> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${id} not found`);
    }

    // Verify staff exists and has appropriate role
    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundException(`Staff user with ID ${staffId} not found`);
    }

    const allowedRoles = ['ADMIN', 'ORGANIZER', 'STAFF'];
    if (!allowedRoles.includes(staff.role)) {
      throw new BadRequestException('User cannot be assigned support tickets');
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        assignedTo: staffId,
        status:
          ticket.status === SupportTicketStatus.OPEN
            ? SupportTicketStatus.IN_PROGRESS
            : ticket.status,
      },
      include: this.getTicketIncludes(),
    });

    this.eventEmitter.emit('support.ticket.assigned', {
      ticketId: id,
      assignedTo: staffId,
      assignedBy,
    });

    return this.formatTicketResponse(updated);
  }

  // ===== Messages =====

  async addMessage(
    ticketId: string,
    senderId: string,
    dto: CreateSupportMessageDto,
    isStaff = false,
  ): Promise<SupportMessageResponseDto> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${ticketId} not found`);
    }

    // Check access
    if (!isStaff && ticket.userId !== senderId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    // Create message
    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderId,
        message: dto.message,
        isStaff,
      },
    });

    // Update ticket status based on who sent the message
    const newStatus = isStaff
      ? SupportTicketStatus.WAITING_FOR_USER
      : SupportTicketStatus.IN_PROGRESS;

    if (
      ticket.status !== SupportTicketStatus.RESOLVED &&
      ticket.status !== SupportTicketStatus.CLOSED
    ) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: newStatus },
      });
    }

    // Emit event for real-time updates
    this.eventEmitter.emit('support.message.created', {
      ticketId,
      messageId: message.id,
      senderId,
      isStaff,
    });

    return this.formatMessageResponse(message);
  }

  async getMessages(
    ticketId: string,
    userId: string,
    isStaff = false,
  ): Promise<SupportMessageResponseDto[]> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${ticketId} not found`);
    }

    // Check access
    if (!isStaff && ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    const messages = await this.prisma.supportMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => this.formatMessageResponse(m));
  }

  // ===== Auto-assignment =====

  private async tryAutoAssign(
    ticketId: string,
    priority: Priority,
  ): Promise<void> {
    // Find available staff with least tickets
    const staffWithTicketCount = await this.prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'STAFF'] },
        status: 'ACTIVE',
      },
      include: {
        _count: {
          select: {
            supportTickets: {
              where: {
                status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER'] },
              },
            },
          },
        },
      },
      orderBy: {
        supportTickets: { _count: 'asc' },
      },
      take: 1,
    });

    // For urgent tickets, always auto-assign
    if (priority === Priority.URGENT && staffWithTicketCount.length > 0) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          assignedTo: staffWithTicketCount[0].id,
          status: SupportTicketStatus.IN_PROGRESS,
        },
      });

      this.eventEmitter.emit('support.ticket.auto-assigned', {
        ticketId,
        assignedTo: staffWithTicketCount[0].id,
      });
    }
  }

  // ===== SLA Management =====

  getSlaDeadline(priority: Priority, createdAt: Date): Date {
    let hours: number;

    switch (priority) {
      case Priority.URGENT:
        hours = this.slaConfig.urgentPriorityHours;
        break;
      case Priority.HIGH:
        hours = this.slaConfig.highPriorityHours;
        break;
      case Priority.MEDIUM:
        hours = this.slaConfig.mediumPriorityHours;
        break;
      case Priority.LOW:
      default:
        hours = this.slaConfig.lowPriorityHours;
    }

    return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
  }

  async getSlaBreachers(): Promise<SupportTicketResponseDto[]> {
    const now = new Date();

    // Get all open tickets
    const openTickets = await this.prisma.supportTicket.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER'] },
      },
      include: this.getTicketIncludes(),
    });

    // Filter tickets that have breached SLA
    const breachers = openTickets.filter((ticket) => {
      const deadline = this.getSlaDeadline(
        ticket.priority as Priority,
        ticket.createdAt,
      );
      return now > deadline;
    });

    return breachers.map((t) => this.formatTicketResponse(t));
  }

  updateSlaConfig(config: SlaConfigDto): void {
    this.slaConfig = config;
  }

  // ===== Statistics =====

  async getStatistics(festivalId?: string): Promise<TicketStatisticsDto> {
    const where: any = festivalId ? { festivalId } : {};

    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      byPriorityData,
    ] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.count({
        where: { ...where, status: 'OPEN' },
      }),
      this.prisma.supportTicket.count({
        where: { ...where, status: 'IN_PROGRESS' },
      }),
      this.prisma.supportTicket.count({
        where: { ...where, status: 'RESOLVED' },
      }),
      this.prisma.supportTicket.count({
        where: { ...where, status: 'CLOSED' },
      }),
      this.prisma.supportTicket.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
    ]);

    // Calculate average resolution time
    const resolvedTicketsData = await this.prisma.supportTicket.findMany({
      where: { ...where, status: { in: ['RESOLVED', 'CLOSED'] } },
      select: { createdAt: true, updatedAt: true },
    });

    let avgResolutionTime = 0;
    if (resolvedTicketsData.length > 0) {
      const totalTime = resolvedTicketsData.reduce((sum, ticket) => {
        return (
          sum + (ticket.updatedAt.getTime() - ticket.createdAt.getTime())
        );
      }, 0);
      avgResolutionTime = totalTime / resolvedTicketsData.length / (1000 * 60 * 60);
    }

    // Count SLA breaches
    const slaBreaches = (await this.getSlaBreachers()).length;

    // Stats by staff
    const byStaffData = await this.prisma.supportTicket.groupBy({
      by: ['assignedTo'],
      where: { ...where, assignedTo: { not: null } },
      _count: true,
    });

    const byPriority = {
      low: byPriorityData.find((p) => p.priority === 'LOW')?._count || 0,
      medium: byPriorityData.find((p) => p.priority === 'MEDIUM')?._count || 0,
      high: byPriorityData.find((p) => p.priority === 'HIGH')?._count || 0,
      urgent: byPriorityData.find((p) => p.priority === 'URGENT')?._count || 0,
    };

    // Get staff names
    const staffIds = byStaffData
      .map((s) => s.assignedTo)
      .filter(Boolean) as string[];
    const staffUsers = await this.prisma.user.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const byStaff = byStaffData.map((s) => {
      const staff = staffUsers.find((u) => u.id === s.assignedTo);
      return {
        staffId: s.assignedTo || '',
        staffName: staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown',
        assignedCount: s._count,
        resolvedCount: 0, // Would need additional query
      };
    });

    return {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      averageResolutionTimeHours: Math.round(avgResolutionTime * 10) / 10,
      slaBreaches,
      byPriority,
      byStaff,
    };
  }

  // ===== Helpers =====

  private getTicketIncludes() {
    return {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    };
  }

  private formatTicketResponse(ticket: any): SupportTicketResponseDto {
    return {
      id: ticket.id,
      userId: ticket.userId,
      festivalId: ticket.festivalId,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      assignedTo: ticket.assignedTo,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      user: ticket.user,
      messages: ticket.messages?.map((m: any) => this.formatMessageResponse(m)),
    };
  }

  private formatMessageResponse(message: any): SupportMessageResponseDto {
    return {
      id: message.id,
      ticketId: message.ticketId,
      senderId: message.senderId,
      message: message.message,
      isStaff: message.isStaff,
      createdAt: message.createdAt,
    };
  }

  private validateStatusTransition(
    current: SupportTicketStatus,
    next: SupportTicketStatus,
  ): void {
    const validTransitions: Record<SupportTicketStatus, SupportTicketStatus[]> = {
      [SupportTicketStatus.OPEN]: [
        SupportTicketStatus.IN_PROGRESS,
        SupportTicketStatus.CLOSED,
      ],
      [SupportTicketStatus.IN_PROGRESS]: [
        SupportTicketStatus.WAITING_FOR_USER,
        SupportTicketStatus.RESOLVED,
        SupportTicketStatus.CLOSED,
      ],
      [SupportTicketStatus.WAITING_FOR_USER]: [
        SupportTicketStatus.IN_PROGRESS,
        SupportTicketStatus.RESOLVED,
        SupportTicketStatus.CLOSED,
      ],
      [SupportTicketStatus.RESOLVED]: [
        SupportTicketStatus.IN_PROGRESS,
        SupportTicketStatus.CLOSED,
      ],
      [SupportTicketStatus.CLOSED]: [SupportTicketStatus.IN_PROGRESS],
    };

    if (!validTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Cannot transition from ${current} to ${next}`,
      );
    }
  }
}
