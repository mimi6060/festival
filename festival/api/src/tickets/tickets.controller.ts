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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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

@ApiTags('Tickets')
@ApiBearerAuth('JWT-auth')
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
  @ApiOperation({
    summary: 'Purchase tickets for a festival',
    description: `
Initiates a ticket purchase for the authenticated user.

**Process:**
1. Validates ticket availability for selected categories
2. Reserves tickets temporarily (15 minutes)
3. Creates payment session (Stripe)
4. Returns payment URL for completion

**Important Notes:**
- Tickets are only confirmed after successful payment
- Maximum 10 tickets per category per user
- Prices are locked at purchase time
- QR codes are generated after payment confirmation

**Payment Flow:**
1. User receives payment session URL
2. Complete payment on Stripe
3. Webhook confirms payment
4. Tickets are issued with QR codes
5. Confirmation email sent to user
    `,
    operationId: 'tickets_purchase',
  })
  @ApiBody({
    type: PurchaseTicketsDto,
    description: 'Ticket purchase details',
    examples: {
      standard: {
        summary: 'Standard purchase',
        description: 'Purchase 2 tickets from one category',
        value: {
          festivalId: '550e8400-e29b-41d4-a716-446655440000',
          items: [
            {
              categoryId: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 2,
            },
          ],
          paymentProvider: 'STRIPE',
        },
      },
      multi_category: {
        summary: 'Multi-category purchase',
        description: 'Purchase from multiple categories',
        value: {
          festivalId: '550e8400-e29b-41d4-a716-446655440000',
          items: [
            {
              categoryId: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 2,
            },
            {
              categoryId: '550e8400-e29b-41d4-a716-446655440002',
              quantity: 1,
            },
          ],
          paymentProvider: 'STRIPE',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Purchase initiated successfully',
    schema: {
      example: {
        success: true,
        message: 'Successfully purchased 3 ticket(s)',
        data: {
          tickets: [
            {
              id: '550e8400-e29b-41d4-a716-446655440010',
              qrCode: 'FEST-2025-XXXXXX',
              status: 'VALID',
              purchasePrice: 89.99,
            },
          ],
          payment: {
            id: '550e8400-e29b-41d4-a716-446655440020',
            amount: 179.98,
            status: 'PENDING',
          },
          totalAmount: 179.98,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid purchase data or tickets unavailable',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'Insufficient tickets available in category',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
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
  @ApiOperation({
    summary: 'Get current user tickets',
    description: `
Returns all tickets owned by the authenticated user.

**Included Information:**
- Ticket details (ID, QR code, status)
- Festival and category information
- Purchase date and price
- Validation history (if used)

**Ticket Statuses:**
- VALID: Can be used at festival
- USED: Already scanned at entrance
- CANCELLED: Ticket was cancelled
- EXPIRED: Festival has ended
- REFUNDED: Payment was refunded
    `,
    operationId: 'tickets_get_my_tickets',
  })
  @ApiOkResponse({
    description: 'User tickets retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            qrCode: 'FEST-2025-ABC123',
            status: 'VALID',
            purchasePrice: 89.99,
            festival: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Rock en Seine 2025',
              startDate: '2025-08-22T14:00:00.000Z',
            },
            category: {
              id: '550e8400-e29b-41d4-a716-446655440001',
              name: 'Pass 3 Jours',
              type: 'FULL_PASS',
            },
            purchasedAt: '2025-01-15T10:30:00.000Z',
          },
        ],
        count: 1,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
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
  @ApiOperation({
    summary: 'Get ticket details',
    description: `
Returns detailed information about a specific ticket.

**Access Control:**
- Users can only view their own tickets
- Staff/Admin can view any ticket

**Includes:**
- Full ticket details
- QR code data for entrance scanning
- Festival and category information
- Purchase and validation history
    `,
    operationId: 'tickets_get_ticket',
  })
  @ApiParam({
    name: 'id',
    description: 'Ticket UUID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  @ApiOkResponse({
    description: 'Ticket details retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440010',
          qrCode: 'FEST-2025-ABC123',
          qrCodeData: 'data:image/png;base64,...',
          status: 'VALID',
          purchasePrice: 89.99,
          festival: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Rock en Seine 2025',
            startDate: '2025-08-22T14:00:00.000Z',
            endDate: '2025-08-24T23:59:00.000Z',
            location: 'Domaine national de Saint-Cloud',
          },
          category: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Pass 3 Jours',
            type: 'FULL_PASS',
            description: 'Acces complet aux 3 jours du festival',
          },
          owner: {
            firstName: 'Jean',
            lastName: 'Dupont',
            email: 'jean.dupont@example.com',
          },
          purchasedAt: '2025-01-15T10:30:00.000Z',
          validatedAt: null,
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Ticket not found',
  })
  @ApiForbiddenResponse({
    description: 'Not authorized to view this ticket',
  })
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
  @ApiOperation({
    summary: 'Validate ticket at entrance',
    description: `
Validates a ticket at festival entrance by scanning its QR code.

**Access:** ADMIN, STAFF, SECURITY roles only

**Validation Process:**
1. Decode QR code data
2. Verify ticket exists and is valid
3. Check ticket hasn't been used
4. Optionally validate zone access
5. Mark ticket as USED

**Response Includes:**
- Validation result (valid/invalid)
- Ticket holder information
- Any access restrictions
    `,
    operationId: 'tickets_validate',
  })
  @ApiParam({
    name: 'id',
    description: 'Ticket UUID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  @ApiBody({
    type: ValidateTicketDto,
    description: 'QR code data from ticket scan',
    examples: {
      basic: {
        summary: 'Basic validation',
        value: {
          qrCodeData: 'FEST-2025-ABC123-CHECKSUM',
        },
      },
      zone: {
        summary: 'Zone-specific validation',
        value: {
          qrCodeData: 'FEST-2025-ABC123-CHECKSUM',
          zoneId: '550e8400-e29b-41d4-a716-446655440099',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Ticket validation result',
    schema: {
      example: {
        success: true,
        message: 'Ticket validated successfully',
        data: {
          id: '550e8400-e29b-41d4-a716-446655440010',
          categoryName: 'Pass 3 Jours',
          categoryType: 'FULL_PASS',
          userName: 'Jean Dupont',
          userEmail: 'jean.dupont@example.com',
          festivalName: 'Rock en Seine 2025',
          status: 'USED',
          validatedAt: '2025-08-22T14:15:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ticket or already used',
    schema: {
      example: {
        success: false,
        message: 'Ticket has already been used',
        data: {
          id: '550e8400-e29b-41d4-a716-446655440010',
          status: 'USED',
          validatedAt: '2025-08-22T14:15:00.000Z',
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - requires STAFF role',
  })
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
  @ApiOperation({
    summary: 'Cancel a ticket',
    description: `
Cancels a ticket and initiates refund process.

**Refund Policy:**
- More than 30 days before festival: 100% refund
- 15-30 days before: 75% refund
- 7-14 days before: 50% refund
- Less than 7 days: No refund

**Note:** Some ticket types may be non-refundable.
    `,
    operationId: 'tickets_cancel',
  })
  @ApiParam({
    name: 'id',
    description: 'Ticket UUID to cancel',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  @ApiOkResponse({
    description: 'Ticket cancelled successfully',
    schema: {
      example: {
        success: true,
        message: 'Ticket cancelled. Refund of 75% will be processed.',
        data: {
          ticket: {
            id: '550e8400-e29b-41d4-a716-446655440010',
            status: 'CANCELLED',
          },
          refund: {
            amount: 67.49,
            percentage: 75,
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Ticket cannot be cancelled',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'Ticket has already been used and cannot be cancelled',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Ticket not found',
  })
  @ApiForbiddenResponse({
    description: 'Not authorized to cancel this ticket',
  })
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
@ApiTags('Tickets')
@ApiBearerAuth('JWT-auth')
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
  @ApiOperation({
    summary: 'Get all tickets for a festival',
    description: `
Returns paginated list of all tickets for a specific festival.

**Access:** ADMIN and ORGANIZER roles only

**Filters:**
- By status (VALID, USED, CANCELLED, etc.)
- By category
- Pagination support

**Use Cases:**
- Dashboard statistics
- Entry control monitoring
- Sales reporting
    `,
    operationId: 'tickets_get_festival_tickets',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by ticket status',
    required: false,
    enum: TicketStatus,
  })
  @ApiQuery({
    name: 'categoryId',
    description: 'Filter by category UUID',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (1-based)',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per page',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiOkResponse({
    description: 'Festival tickets retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            qrCode: 'FEST-2025-ABC123',
            status: 'VALID',
            owner: {
              id: '550e8400-e29b-41d4-a716-446655440001',
              firstName: 'Jean',
              lastName: 'Dupont',
            },
            category: {
              name: 'Pass 3 Jours',
            },
            purchasedAt: '2025-01-15T10:30:00.000Z',
          },
        ],
        pagination: {
          total: 15000,
          page: 1,
          limit: 50,
          totalPages: 300,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions',
  })
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
  @ApiOperation({
    summary: 'Get ticket statistics for a festival',
    description: `
Returns comprehensive ticket statistics for a festival.

**Access:** ADMIN and ORGANIZER roles only

**Statistics Include:**
- Total tickets sold by category
- Revenue breakdown
- Usage statistics (scanned vs pending)
- Cancellation/refund rates
- Real-time entry count
    `,
    operationId: 'tickets_get_stats',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Ticket statistics retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          totalSold: 15000,
          totalRevenue: 1500000.0,
          byCategory: [
            {
              categoryId: '550e8400-e29b-41d4-a716-446655440001',
              categoryName: 'Pass 3 Jours',
              sold: 10000,
              revenue: 899900.0,
              quota: 25000,
              remaining: 15000,
            },
            {
              categoryId: '550e8400-e29b-41d4-a716-446655440002',
              categoryName: 'Pass VIP',
              sold: 5000,
              revenue: 600100.0,
              quota: 5000,
              remaining: 0,
            },
          ],
          byStatus: {
            VALID: 14500,
            USED: 0,
            CANCELLED: 400,
            REFUNDED: 100,
          },
          utilizationRate: 37.5,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions',
  })
  async getTicketStats(@Param('festivalId') festivalId: string) {
    const stats = await this.ticketsService.getTicketStats(festivalId);

    return {
      success: true,
      data: stats,
    };
  }
}
