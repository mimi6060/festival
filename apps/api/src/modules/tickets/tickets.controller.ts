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
import { UserRole } from '@prisma/client';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PurchaseTicketsDto, GuestPurchaseDto, ValidateTicketDto } from './dto/tickets.dto';

@Controller('api/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserTickets(@Request() req, @Query('festivalId') festivalId?: string) {
    return this.ticketsService.getUserTickets(req.user.id, festivalId);
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
  async purchaseTickets(@Request() req, @Body() dto: PurchaseTicketsDto) {
    return this.ticketsService.purchaseTickets(req.user.id, dto);
  }

  @Post('guest-purchase')
  @HttpCode(HttpStatus.CREATED)
  async guestPurchaseTickets(@Body() dto: GuestPurchaseDto) {
    return this.ticketsService.guestPurchaseTickets(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.SECURITY, UserRole.ADMIN, UserRole.ORGANIZER)
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateTicket(@Body() dto: ValidateTicketDto) {
    return this.ticketsService.validateTicket(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.SECURITY, UserRole.ADMIN, UserRole.ORGANIZER)
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
}
