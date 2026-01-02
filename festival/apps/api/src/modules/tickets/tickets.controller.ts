import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { TicketsService } from './tickets.service';
import {
  PurchaseTicketsDto,
  TicketResponseDto,
  GetUserTicketsQueryDto,
  ValidateTicketDto,
  ScanTicketDto,
  ValidationResultDto,
  QrCodeImageResponseDto,
} from './dto';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
  UnauthorizedResponseDto,
  ForbiddenResponseDto,
  NotFoundResponseDto,
  ConflictResponseDto,
} from '../../common/dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * Interface representing the authenticated user from JWT payload
 */
interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

/**
 * Tickets Controller
 *
 * Manages ticket operations including purchase, validation, scanning, and QR code generation.
 * Tickets are the entry pass for festival attendees.
 */
@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * Purchase tickets for a festival
   */
  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Purchase tickets',
    description: `
Purchase one or more tickets for a festival.

**Authentication Required:** Yes

**Validation Rules:**
- Festival must be PUBLISHED and not yet ended
- Ticket category must be active and within sale dates
- User cannot exceed maximum tickets per category
- Sufficient ticket quota must be available

**What Happens:**
1. Validates festival and category availability
2. Checks user's existing ticket count
3. Creates tickets with unique QR codes
4. Updates sold count on category

**Returns:** Array of created tickets with QR codes
    `,
  })
  @ApiCreatedResponse({
    description: 'Tickets purchased successfully',
    type: [TicketResponseDto],
  })
  @ApiBadRequestResponse({
    description: 'Validation error or business rule violation',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
    type: UnauthorizedResponseDto,
  })
  @ApiConflictResponse({
    description: 'Tickets sold out or insufficient availability',
    type: ConflictResponseDto,
  })
  async purchaseTickets(
    @CurrentUser() user: AuthenticatedUser,
    @Body() purchaseTicketsDto: PurchaseTicketsDto,
  ): Promise<TicketResponseDto[]> {
    return this.ticketsService.purchaseTickets(user.id, purchaseTicketsDto);
  }

  /**
   * Get current user's tickets
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: "Get user's tickets",
    description: `
Returns all tickets owned by the authenticated user.

**Authentication Required:** Yes

**Filtering:**
- Optionally filter by festival ID

**Sorting:**
Results are sorted by creation date (newest first).
    `,
  })
  @ApiOkResponse({
    description: 'List of user tickets',
    type: [TicketResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
    type: UnauthorizedResponseDto,
  })
  async getUserTickets(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetUserTicketsQueryDto,
  ): Promise<TicketResponseDto[]> {
    return this.ticketsService.getUserTickets(user.id, query.festivalId);
  }

  /**
   * Get ticket by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get ticket by ID',
    description: `
Returns detailed information about a specific ticket.

**Authentication Required:** Yes

**Access Rules:**
- Users can only access their own tickets
- Staff and admins can access any ticket
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Ticket UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Ticket details',
    type: TicketResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Cannot access another user\'s ticket',
    type: ForbiddenResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Ticket not found',
    type: NotFoundResponseDto,
  })
  async getTicketById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TicketResponseDto> {
    // Staff and admins can view any ticket
    const userId = [UserRole.ADMIN, UserRole.STAFF, UserRole.SECURITY].includes(user.role)
      ? undefined
      : user.id;
    return this.ticketsService.getTicketById(id, userId);
  }

  /**
   * Validate a ticket QR code
   */
  @Post(':id/validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Validate ticket QR code',
    description: `
Validates a ticket QR code without marking it as used.

**Use Cases:**
- Pre-check before entry
- Verify ticket authenticity
- Check zone access permissions

**Returns:**
- Valid/invalid status
- Ticket details if valid
- Access permissions for specified zone
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Ticket UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Validation result',
    type: ValidationResultDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
    type: UnauthorizedResponseDto,
  })
  async validateTicket(
    @Param('id', ParseUUIDPipe) _id: string,
    @Body() validateTicketDto: ValidateTicketDto,
  ): Promise<ValidationResultDto> {
    return this.ticketsService.validateTicket(validateTicketDto);
  }

  /**
   * Scan ticket at entry point
   */
  @Post(':id/scan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.SECURITY)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Scan ticket at entry',
    description: `
Scans a ticket at an entry point and marks it as used.

**Required Role:** ADMIN, STAFF, or SECURITY

**Process:**
1. Validates the ticket QR code
2. Checks if ticket is already used
3. Verifies zone access if specified
4. Marks ticket as USED with timestamp
5. Logs the entry for audit

**Zone Access:**
If a zone ID is provided, checks:
- Ticket type has permission for zone
- Zone is not at capacity
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Ticket UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Scan result',
    type: ValidationResultDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions (requires STAFF role)',
    type: ForbiddenResponseDto,
  })
  async scanTicket(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) _id: string,
    @Body() scanTicketDto: ScanTicketDto,
  ): Promise<ValidationResultDto> {
    return this.ticketsService.scanTicket(
      scanTicketDto.qrCode,
      user.id,
      scanTicketDto.zoneId,
    );
  }

  /**
   * Cancel a ticket
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Cancel ticket',
    description: `
Cancels a ticket and initiates refund process.

**Authentication Required:** Yes

**Restrictions:**
- Only the ticket owner can cancel
- Cannot cancel used tickets
- Cannot cancel after festival has started

**What Happens:**
1. Ticket status changes to CANCELLED
2. Category sold count is decremented
3. Refund process is initiated (separate flow)
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Ticket UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Ticket cancelled successfully',
    type: TicketResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Cannot cancel - ticket already used or festival started',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Cannot cancel another user\'s ticket',
    type: ForbiddenResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Ticket not found',
    type: NotFoundResponseDto,
  })
  async cancelTicket(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TicketResponseDto> {
    return this.ticketsService.cancelTicket(id, user.id);
  }

  /**
   * Get ticket QR code image
   */
  @Get(':id/qr')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get QR code image',
    description: `
Returns the QR code image for a ticket as a base64 data URL.

**Authentication Required:** Yes

**Access Rules:**
- Users can only get QR codes for their own tickets

**Response:**
Returns a data URL that can be directly used in an img tag:
\`\`\`html
<img src="data:image/png;base64,..." />
\`\`\`
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Ticket UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'QR code image data',
    type: QrCodeImageResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Cannot access another user\'s ticket QR code',
    type: ForbiddenResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Ticket not found',
    type: NotFoundResponseDto,
  })
  async getTicketQrCode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QrCodeImageResponseDto> {
    const qrCodeImage = await this.ticketsService.getTicketQrCodeImage(id, user.id);
    return { qrCodeImage };
  }
}
