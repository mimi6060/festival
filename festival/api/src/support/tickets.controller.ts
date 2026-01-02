import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  CreateSupportMessageDto,
  SupportTicketQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('support/tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * Create a new support ticket
   * POST /support/tickets
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupportTicketDto,
  ) {
    const ticket = await this.ticketsService.createTicket(user.id, dto);

    return {
      success: true,
      message: 'Support ticket created successfully',
      data: ticket,
    };
  }

  /**
   * Get all tickets (filtered by user or all for staff)
   * GET /support/tickets
   */
  @Get()
  async getTickets(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SupportTicketQueryDto,
  ) {
    const result = await this.ticketsService.findAll(user, query);

    return {
      success: true,
      data: result.tickets,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Get ticket statistics (ADMIN only)
   * GET /support/tickets/stats
   */
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getStats() {
    const stats = await this.ticketsService.getStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get a single ticket by ID
   * GET /support/tickets/:id
   */
  @Get(':id')
  async getTicket(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ticket = await this.ticketsService.findById(id, user);

    return {
      success: true,
      data: ticket,
    };
  }

  /**
   * Update a ticket
   * PUT /support/tickets/:id
   */
  @Put(':id')
  async updateTicket(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    const ticket = await this.ticketsService.updateTicket(id, user, dto);

    return {
      success: true,
      message: 'Ticket updated successfully',
      data: ticket,
    };
  }

  /**
   * Close a ticket
   * POST /support/tickets/:id/close
   */
  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  async closeTicket(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ticket = await this.ticketsService.closeTicket(id, user);

    return {
      success: true,
      message: 'Ticket closed successfully',
      data: ticket,
    };
  }

  /**
   * Reopen a closed ticket
   * POST /support/tickets/:id/reopen
   */
  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  async reopenTicket(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ticket = await this.ticketsService.reopenTicket(id, user);

    return {
      success: true,
      message: 'Ticket reopened successfully',
      data: ticket,
    };
  }

  /**
   * Add a message to a ticket
   * POST /support/tickets/:id/messages
   */
  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @Param('id') ticketId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { message: string },
  ) {
    const dto: CreateSupportMessageDto = {
      ticketId,
      message: body.message,
    };

    const message = await this.ticketsService.addMessage(user, dto);

    return {
      success: true,
      message: 'Message added successfully',
      data: message,
    };
  }

  /**
   * Get messages for a ticket
   * GET /support/tickets/:id/messages
   */
  @Get(':id/messages')
  async getMessages(
    @Param('id') ticketId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const messages = await this.ticketsService.getMessages(ticketId, user);

    return {
      success: true,
      data: messages,
      count: messages.length,
    };
  }
}
