/**
 * Invoices Controller
 *
 * API endpoints for multi-currency invoice management:
 * - CRUD operations
 * - PDF generation
 * - Email sending
 * - Statistics
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { TaxService } from './services/tax.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceFilterDto,
} from './dto';
import type {
  InvoiceResponseDto,
  InvoiceDetailResponseDto,
  InvoiceStatsDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly taxService: TaxService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({
    summary: 'Create a new invoice',
    description: 'Create a multi-currency invoice with line items. Supports tax calculation, currency conversion, and B2B reverse charge.',
  })
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Festival or user not found',
  })
  async create(@Body() dto: CreateInvoiceDto): Promise<InvoiceResponseDto> {
    return this.invoicesService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({
    summary: 'List invoices with filters',
    description: 'Get paginated list of invoices with various filter options.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of invoices',
  })
  async findAll(@Query() filters: InvoiceFilterDto) {
    return this.invoicesService.findAll(filters);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({
    summary: 'Get invoice statistics',
    description: 'Get aggregated statistics for invoices including totals, status breakdown, and currency distribution.',
  })
  @ApiQuery({
    name: 'festivalId',
    required: false,
    description: 'Filter by festival',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Start date for statistics',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'End date for statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice statistics',
  })
  async getStats(
    @Query('festivalId') festivalId?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<InvoiceStatsDto> {
    return this.invoicesService.getStats(
      festivalId,
      userId,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
  }

  @Get('tax-rates')
  @ApiOperation({
    summary: 'Get VAT rates by country',
    description: 'Get all available VAT/tax rates for supported countries.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tax rates by country',
  })
  getTaxRates() {
    return {
      rates: this.taxService.getAllRates(),
      euRates: this.taxService.getEuRates(),
    };
  }

  @Get('tax-rates/:countryCode')
  @ApiOperation({
    summary: 'Get VAT rate for a specific country',
    description: 'Get VAT/tax rate details for a specific country code.',
  })
  @ApiParam({
    name: 'countryCode',
    description: 'ISO 2-letter country code',
    example: 'FR',
  })
  @ApiResponse({
    status: 200,
    description: 'Tax rate for the country',
  })
  @ApiResponse({
    status: 404,
    description: 'Country not found',
  })
  getTaxRate(@Param('countryCode') countryCode: string) {
    const rate = this.taxService.getVatRate(countryCode);
    if (!rate) {
      return { error: 'Country not found', countryCode };
    }
    return rate;
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.USER)
  @ApiOperation({
    summary: 'Get invoice by ID',
    description: 'Get detailed invoice information including items and formatted prices.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice details',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async findOne(@Param('id') id: string): Promise<InvoiceDetailResponseDto> {
    return this.invoicesService.findOne(id);
  }

  @Get(':id/pdf')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.USER)
  @ApiOperation({
    summary: 'Download invoice PDF',
    description: 'Generate and download PDF for an invoice. Supports multiple templates.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
  })
  @ApiQuery({
    name: 'template',
    required: false,
    enum: ['standard', 'detailed', 'minimal'],
    description: 'PDF template to use',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF file',
    content: {
      'application/pdf': {},
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async downloadPdf(
    @Param('id') id: string,
    @Query('template') template: 'standard' | 'detailed' | 'minimal' = 'standard',
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findOne(id);
    const pdfBuffer = await this.invoicesService.generatePdf(id, template);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="facture-${invoice.invoiceNumber}.pdf"`,
    );
    res.send(pdfBuffer);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({
    summary: 'Send invoice to customer',
    description: 'Send invoice via email to the customer. Updates status to SENT.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice sent successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot send cancelled invoice',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async send(@Param('id') id: string): Promise<InvoiceResponseDto> {
    return this.invoicesService.send(id);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({
    summary: 'Mark invoice as paid',
    description: 'Mark an invoice as paid and send receipt email to customer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice marked as paid',
  })
  @ApiResponse({
    status: 400,
    description: 'Invoice is already paid or cancelled',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async markAsPaid(
    @Param('id') id: string,
    @Body() body?: { paymentMethod?: string; transactionId?: string },
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.markAsPaid(id, body);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({
    summary: 'Cancel invoice',
    description: 'Cancel an invoice and send cancellation notification to customer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice cancelled',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel paid invoice',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async cancel(
    @Param('id') id: string,
    @Body() body?: { reason?: string },
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.cancel(id, body?.reason);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({
    summary: 'Update invoice',
    description: 'Update invoice details. Cannot update paid or cancelled invoices.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice updated',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot update paid or cancelled invoice',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({
    summary: 'Delete draft invoice',
    description: 'Delete an invoice. Only draft invoices can be deleted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Invoice deleted',
  })
  @ApiResponse({
    status: 400,
    description: 'Can only delete draft invoices',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async delete(@Param('id') id: string): Promise<void> {
    return this.invoicesService.delete(id);
  }

  @Post('validate-vat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate VAT number format',
    description: 'Validate the format of a VAT number for a given country.',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
  })
  validateVat(@Body() body: { vatNumber: string }) {
    return this.taxService.validateVatFormat(body.vatNumber);
  }

  @Post('calculate-tax')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate tax for an amount',
    description: 'Calculate tax for a given amount based on country and options.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tax calculation result',
  })
  calculateTax(
    @Body()
    body: {
      amount: number;
      countryCode: string;
      useReducedRate?: boolean;
      customRate?: number;
      isB2B?: boolean;
      sellerCountry?: string;
      customerVatNumber?: string;
    },
  ) {
    return this.taxService.calculateTax(body.amount, body.countryCode, {
      useReducedRate: body.useReducedRate,
      customRate: body.customRate,
      isB2B: body.isB2B,
      sellerCountry: body.sellerCountry,
      customerVatNumber: body.customerVatNumber,
    });
  }

  @Post('process-overdue')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Process overdue invoices',
    description: 'Mark all overdue invoices as OVERDUE status. Usually run by a scheduled job.',
  })
  @ApiResponse({
    status: 200,
    description: 'Number of invoices marked as overdue',
  })
  async processOverdue() {
    const count = await this.invoicesService.processOverdueInvoices();
    return { processed: count };
  }
}
