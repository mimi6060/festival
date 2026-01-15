import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiHeader } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AllVersions, API_VERSION_HEADER } from '../../common/versioning';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import {
  PurchaseTicketsDto,
  GuestPurchaseDto,
  ValidateTicketDto,
  TransferTicketDto,
  GetUserTicketsDto,
} from './dto/tickets.dto';

@ApiTags('Tickets')
@Controller('api/tickets')
@AllVersions()
@ApiHeader({
  name: API_VERSION_HEADER,
  description: 'API Version (v1 or v2)',
  required: false,
  schema: { type: 'string', enum: ['v1', 'v2'], default: 'v1' },
})
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserTickets(@Request() req, @Query() query: GetUserTicketsDto) {
    return this.ticketsService.getUserTickets(req.user.id, {
      festivalId: query.festivalId,
      page: query.page,
      limit: query.limit,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getTicketById(@Request() req, @Param('id') id: string) {
    return this.ticketsService.getTicketById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/qrcode')
  async getTicketQrCode(@Request() req, @Param('id') id: string) {
    const qrCodeImage = await this.ticketsService.getTicketQrCodeImage(id, req.user.id);
    return { qrCode: qrCodeImage };
  }

  @UseGuards(JwtAuthGuard)
  @Post('purchase')
  @RateLimit({
    limit: 10,
    windowSeconds: 60, // 10 requests per minute per user
    keyPrefix: 'tickets:purchase',
    perUser: true,
    errorMessage: 'Too many purchase attempts. Please try again later.',
  })
  @HttpCode(HttpStatus.CREATED)
  async purchaseTickets(@Request() req, @Body() dto: PurchaseTicketsDto) {
    return this.ticketsService.purchaseTickets(req.user.id, dto);
  }

  @Post('guest-purchase')
  @RateLimit({
    limit: 10,
    windowSeconds: 60, // 10 requests per minute
    keyPrefix: 'tickets:guest-purchase',
    errorMessage: 'Too many purchase attempts. Please try again later.',
  })
  @HttpCode(HttpStatus.CREATED)
  async guestPurchaseTickets(@Body() dto: GuestPurchaseDto) {
    return this.ticketsService.guestPurchaseTickets(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.SECURITY, UserRole.ADMIN, UserRole.ORGANIZER)
  @RateLimit({
    limit: 120,
    windowSeconds: 60, // 120 requests per minute (2 per second for scanning)
    keyPrefix: 'tickets:validate',
    perUser: true,
    errorMessage: 'Too many validation requests. Please slow down.',
  })
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateTicket(@Body() dto: ValidateTicketDto) {
    return this.ticketsService.validateTicket(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.SECURITY, UserRole.ADMIN, UserRole.ORGANIZER)
  @RateLimit({
    limit: 120,
    windowSeconds: 60, // 120 requests per minute (2 per second for scanning)
    keyPrefix: 'tickets:scan',
    perUser: true,
    errorMessage: 'Too many scan requests. Please slow down.',
  })
  @Post(':id/scan')
  @HttpCode(HttpStatus.OK)
  async scanTicket(@Request() req, @Param('id') qrCode: string, @Query('zoneId') zoneId?: string) {
    return this.ticketsService.scanTicket(qrCode, req.user.id, zoneId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async cancelTicket(@Request() req, @Param('id') id: string) {
    return this.ticketsService.cancelTicket(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/transfer')
  @HttpCode(HttpStatus.OK)
  async transferTicket(@Request() req, @Param('id') id: string, @Body() dto: TransferTicketDto) {
    return this.ticketsService.transferTicket(id, req.user.id, dto.recipientEmail);
  }
}
