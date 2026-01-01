import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { PurchaseTicketsDto, ValidateTicketDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, TicketStatus } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * Purchase tickets
   * POST /tickets/purchase
   */
  @Post('purchase')
  @HttpCode(HttpStatus.CREATED)
  async purchase(
    @CurrentUser() user: AuthenticatedUser,
    @Body() purchaseDto: PurchaseTicketsDto,
  ) {
    const result = await this.ticketsService.purchaseTickets(
      user.id,
      purchaseDto,
    );

    return {
      success: true,
      message: `Successfully purchased ${result.tickets.length} ticket(s)`,
      data: {
        tickets: result.tickets.map((t) => ({
          id: t.id,
          qrCode: t.qrCode,
          status: t.status,
          purchasePrice: t.purchasePrice,
        })),
        payment: {
          id: result.payment.id,
          amount: result.totalAmount,
          status: result.payment.status,
        },
        totalAmount: result.totalAmount,
      },
    };
  }

  /**
   * Get my tickets
   * GET /tickets/me
   */
  @Get('me')
  async getMyTickets(@CurrentUser() user: AuthenticatedUser) {
    const tickets = await this.ticketsService.getMyTickets(user.id);

    return {
      success: true,
      data: tickets,
      count: tickets.length,
    };
  }

  /**
   * Get ticket detail with QR code
   * GET /tickets/:id
   */
  @Get(':id')
  async getTicket(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ticket = await this.ticketsService.getTicketById(
      id,
      user.id,
      user.role,
    );

    return {
      success: true,
      data: ticket,
    };
  }

  /**
   * Validate ticket at entrance (STAFF only)
   * POST /tickets/:id/validate
   */
  @Post(':id/validate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.SECURITY)
  @HttpCode(HttpStatus.OK)
  async validateTicket(
    @Param('id') id: string,
    @Body() validateDto: ValidateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.ticketsService.validateTicket(
      validateDto,
      user.id,
    );

    return {
      success: result.valid,
      message: result.message,
      data: result.ticket,
    };
  }

  /**
   * Cancel ticket
   * POST /tickets/:id/cancel
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelTicket(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.ticketsService.cancelTicket(
      id,
      user.id,
      user.role,
    );

    return {
      success: true,
      message: result.message,
      data: {
        ticket: {
          id: result.ticket.id,
          status: result.ticket.status,
        },
        refund: {
          amount: result.refundAmount,
          percentage: result.refundPercentage,
        },
      },
    };
  }
}

/**
 * Controller for festival-scoped ticket endpoints
 */
@Controller('festivals/:festivalId/tickets')
@UseGuards(JwtAuthGuard)
export class FestivalTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * Get all tickets for a festival (ADMIN only)
   * GET /festivals/:festivalId/tickets
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  async getFestivalTickets(
    @Param('festivalId') festivalId: string,
    @Query('status') status?: TicketStatus,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.ticketsService.getFestivalTickets(festivalId, {
      status,
      categoryId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });

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
   * Get ticket statistics for a festival
   * GET /festivals/:festivalId/tickets/stats
   */
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  async getTicketStats(@Param('festivalId') festivalId: string) {
    const stats = await this.ticketsService.getTicketStats(festivalId);

    return {
      success: true,
      data: stats,
    };
  }
}
