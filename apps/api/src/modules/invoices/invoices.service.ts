/**
 * Invoices Service
 *
 * Core business logic for invoice management:
 * - CRUD operations
 * - Status management
 * - Statistics and reporting
 * - Overdue invoice handling
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceGeneratorService } from './services/invoice-generator.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { InvoiceEmailService } from './services/invoice-email.service';
import { CurrencyService } from '../currency/currency.service';
import { SupportedCurrency } from '../currency/dto';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceFilterDto,
  InvoiceResponseDto,
  InvoiceDetailResponseDto,
  InvoiceStatsDto,
  FormattedPriceDto,
} from './dto';
import { Invoice, InvoiceItem, InvoiceStatus, Prisma } from '@prisma/client';
import {
  NotFoundException,
  ValidationException,
} from '../../common/exceptions/base.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';

type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly generatorService: InvoiceGeneratorService,
    private readonly pdfService: InvoicePdfService,
    private readonly emailService: InvoiceEmailService,
    private readonly currencyService: CurrencyService,
  ) {}

  /**
   * Create a new invoice
   *
   * Optimized: Fetch festival and user in parallel to prevent N+1.
   */
  async create(dto: CreateInvoiceDto): Promise<InvoiceResponseDto> {
    // Optimized: Fetch festival and user in parallel
    const [festival, user] = await Promise.all([
      this.prisma.festival.findUnique({
        where: { id: dto.festivalId },
        select: {
          id: true,
          name: true,
          currency: true,
          contactEmail: true,
          location: true,
          organizerId: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
    ]);

    if (!festival) {
      throw NotFoundException.festival(dto.festivalId);
    }

    if (!user) {
      throw NotFoundException.user(dto.userId);
    }

    // Generate invoice number
    const { invoiceNumber } = await this.generatorService.generateInvoiceNumber(dto.festivalId);

    // Get company info from config
    const companyName = this.configService.get<string>('COMPANY_NAME') || 'Festival Platform SAS';
    const companyAddress = this.configService.get<string>('COMPANY_ADDRESS') || '123 Rue des Festivals, 75001 Paris';
    const companyVatNumber = this.configService.get<string>('COMPANY_TVA');
    const companyEmail = this.configService.get<string>('COMPANY_EMAIL');
    const companyPhone = this.configService.get<string>('COMPANY_PHONE');

    // Calculate invoice totals
    const calculated = this.generatorService.calculateInvoice(
      dto.items,
      dto.taxRate ?? 20,
      dto.taxExempt ?? false,
      dto.reverseCharge ?? false,
    );

    // Handle currency conversion if needed
    let originalSubtotal: number | null = null;
    let originalTax: number | null = null;
    let originalTotal: number | null = null;
    let exchangeRate: number | null = null;

    if (dto.originalCurrency && dto.originalCurrency !== dto.currency) {
      const conversion = await this.currencyService.convert(
        calculated.total,
        dto.originalCurrency as SupportedCurrency,
        dto.currency as SupportedCurrency,
        { trackRate: true },
      );
      originalSubtotal = calculated.subtotal;
      originalTax = calculated.taxAmount;
      originalTotal = calculated.total;
      exchangeRate = conversion.exchangeRate;
    }

    // Create invoice with items
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        festivalId: dto.festivalId,
        userId: dto.userId,
        currency: dto.currency,
        subtotal: calculated.subtotal,
        taxAmount: calculated.taxAmount,
        taxRate: dto.taxRate ?? 20,
        total: calculated.total,
        originalCurrency: dto.originalCurrency,
        originalSubtotal,
        originalTax,
        originalTotal,
        exchangeRate,
        status: InvoiceStatus.DRAFT,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
        dueDate: new Date(dto.dueDate),
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerAddress: dto.customerAddress,
        customerPhone: dto.customerPhone,
        customerVatNumber: dto.customerVatNumber,
        companyName,
        companyAddress,
        companyVatNumber,
        companyEmail,
        companyPhone,
        taxExempt: dto.taxExempt ?? false,
        reverseCharge: dto.reverseCharge ?? false,
        taxCountry: dto.taxCountry,
        paymentId: dto.paymentId,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        termsAndConditions: dto.termsAndConditions,
        locale: dto.locale ?? 'fr',
        metadata: dto.metadata as Prisma.InputJsonValue,
        items: {
          create: calculated.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            itemType: item.itemType,
            itemId: item.itemId,
            metadata: item.metadata as Prisma.InputJsonValue,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    this.logger.log(`Invoice created: ${invoice.invoiceNumber}`);
    return this.mapToResponse(invoice);
  }

  /**
   * Get invoice by ID
   */
  async findOne(id: string): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!invoice) {
      throw new NotFoundException(
        ErrorCodes.INVOICE_NOT_FOUND,
        `Invoice not found: ${id}`,
        { invoiceId: id },
      );
    }

    return this.mapToDetailResponse(invoice);
  }

  /**
   * Get invoice by invoice number
   */
  async findByNumber(invoiceNumber: string): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!invoice) {
      throw new NotFoundException(
        ErrorCodes.INVOICE_NOT_FOUND,
        `Invoice not found: ${invoiceNumber}`,
        { invoiceNumber },
      );
    }

    return this.mapToDetailResponse(invoice);
  }

  /**
   * List invoices with filters
   */
  async findAll(
    filters: InvoiceFilterDto,
  ): Promise<{ data: InvoiceResponseDto[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const {
      festivalId,
      userId,
      status,
      currency,
      search,
      issueDateFrom,
      issueDateTo,
      dueDateFrom,
      dueDateTo,
      minAmount,
      maxAmount,
      overdueOnly,
      page = 1,
      limit = 20,
      sortBy = 'issueDate',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.InvoiceWhereInput = {};

    if (festivalId) {where.festivalId = festivalId;}
    if (userId) {where.userId = userId;}
    if (status) {where.status = status;}
    if (currency) {where.currency = currency;}

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (issueDateFrom || issueDateTo) {
      where.issueDate = {};
      if (issueDateFrom) {where.issueDate.gte = new Date(issueDateFrom);}
      if (issueDateTo) {where.issueDate.lte = new Date(issueDateTo);}
    }

    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) {where.dueDate.gte = new Date(dueDateFrom);}
      if (dueDateTo) {where.dueDate.lte = new Date(dueDateTo);}
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.total = {};
      if (minAmount !== undefined) {where.total.gte = minAmount;}
      if (maxAmount !== undefined) {where.total.lte = maxAmount;}
    }

    if (overdueOnly) {
      where.status = InvoiceStatus.SENT;
      where.dueDate = { lt: new Date() };
    }

    const [total, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: { items: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: invoices.map((inv) => this.mapToResponse(inv)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update invoice
   */
  async update(id: string, dto: UpdateInvoiceDto): Promise<InvoiceResponseDto> {
    const existing = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      throw new NotFoundException(
        ErrorCodes.INVOICE_NOT_FOUND,
        `Invoice not found: ${id}`,
        { invoiceId: id },
      );
    }

    // Don't allow updates to paid or cancelled invoices
    if (existing.status === InvoiceStatus.PAID || existing.status === InvoiceStatus.CANCELLED) {
      throw new ValidationException(
        `Cannot update invoice with status: ${existing.status}`,
        [{ field: 'status', message: `Invoice is ${existing.status.toLowerCase()}` }],
      );
    }

    const updateData: Prisma.InvoiceUpdateInput = {};

    if (dto.status !== undefined) {updateData.status = dto.status;}
    if (dto.dueDate !== undefined) {updateData.dueDate = new Date(dto.dueDate);}
    if (dto.customerName !== undefined) {updateData.customerName = dto.customerName;}
    if (dto.customerEmail !== undefined) {updateData.customerEmail = dto.customerEmail;}
    if (dto.customerAddress !== undefined) {updateData.customerAddress = dto.customerAddress;}
    if (dto.customerPhone !== undefined) {updateData.customerPhone = dto.customerPhone;}
    if (dto.customerVatNumber !== undefined) {updateData.customerVatNumber = dto.customerVatNumber;}
    if (dto.taxExempt !== undefined) {updateData.taxExempt = dto.taxExempt;}
    if (dto.reverseCharge !== undefined) {updateData.reverseCharge = dto.reverseCharge;}
    if (dto.taxCountry !== undefined) {updateData.taxCountry = dto.taxCountry;}
    if (dto.notes !== undefined) {updateData.notes = dto.notes;}
    if (dto.internalNotes !== undefined) {updateData.internalNotes = dto.internalNotes;}
    if (dto.termsAndConditions !== undefined) {updateData.termsAndConditions = dto.termsAndConditions;}
    if (dto.metadata !== undefined) {updateData.metadata = dto.metadata as Prisma.InputJsonValue;}

    // Recalculate totals if tax settings changed
    if (dto.taxRate !== undefined || dto.taxExempt !== undefined || dto.reverseCharge !== undefined) {
      const calculated = this.generatorService.calculateInvoice(
        existing.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          taxRate: item.taxRate ? Number(item.taxRate) : undefined,
          itemType: item.itemType || undefined,
          itemId: item.itemId || undefined,
          metadata: item.metadata as Record<string, unknown>,
          sortOrder: item.sortOrder,
        })),
        dto.taxRate ?? Number(existing.taxRate),
        dto.taxExempt ?? existing.taxExempt,
        dto.reverseCharge ?? existing.reverseCharge,
      );

      updateData.taxRate = dto.taxRate ?? existing.taxRate;
      updateData.subtotal = calculated.subtotal;
      updateData.taxAmount = calculated.taxAmount;
      updateData.total = calculated.total;
    }

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    this.logger.log(`Invoice updated: ${invoice.invoiceNumber}`);
    return this.mapToResponse(invoice);
  }

  /**
   * Delete invoice (only drafts)
   */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        ErrorCodes.INVOICE_NOT_FOUND,
        `Invoice not found: ${id}`,
        { invoiceId: id },
      );
    }

    if (existing.status !== InvoiceStatus.DRAFT) {
      throw new ValidationException(
        `Can only delete draft invoices`,
        [{ field: 'status', message: `Invoice is ${existing.status.toLowerCase()}` }],
      );
    }

    await this.prisma.invoice.delete({ where: { id } });
    this.logger.log(`Invoice deleted: ${existing.invoiceNumber}`);
  }

  /**
   * Send invoice to customer
   */
  async send(id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!invoice) {
      throw new NotFoundException(
        ErrorCodes.INVOICE_NOT_FOUND,
        `Invoice not found: ${id}`,
        { invoiceId: id },
      );
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new ValidationException(
        `Cannot send cancelled invoice`,
        [{ field: 'status', message: 'Invoice is cancelled' }],
      );
    }

    // Send email
    const result = await this.emailService.sendInvoiceEmail(invoice);

    if (!result.success) {
      this.logger.warn(`Failed to send invoice email: ${result.error}`);
    }

    // Update status to SENT
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.SENT,
        sentAt: new Date(),
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    this.logger.log(`Invoice sent: ${invoice.invoiceNumber}`);
    return this.mapToResponse(updated);
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(
    id: string,
    paymentDetails?: { paymentMethod?: string; transactionId?: string },
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!invoice) {
      throw new NotFoundException(
        ErrorCodes.INVOICE_NOT_FOUND,
        `Invoice not found: ${id}`,
        { invoiceId: id },
      );
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new ValidationException(
        `Invoice is already paid`,
        [{ field: 'status', message: 'Invoice is already paid' }],
      );
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new ValidationException(
        `Cannot mark cancelled invoice as paid`,
        [{ field: 'status', message: 'Invoice is cancelled' }],
      );
    }

    // Update status
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    // Send receipt email
    await this.emailService.sendReceiptEmail(updated, {
      paymentMethod: paymentDetails?.paymentMethod,
      transactionId: paymentDetails?.transactionId,
      paidAt: new Date(),
    });

    this.logger.log(`Invoice marked as paid: ${invoice.invoiceNumber}`);
    return this.mapToResponse(updated);
  }

  /**
   * Cancel invoice
   */
  async cancel(id: string, reason?: string): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!invoice) {
      throw new NotFoundException(
        ErrorCodes.INVOICE_NOT_FOUND,
        `Invoice not found: ${id}`,
        { invoiceId: id },
      );
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new ValidationException(
        `Cannot cancel paid invoice`,
        [{ field: 'status', message: 'Invoice is already paid' }],
      );
    }

    // Update status
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelledAt: new Date(),
        internalNotes: reason
          ? `${invoice.internalNotes || ''}\n\nCancellation reason: ${reason}`.trim()
          : invoice.internalNotes,
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    // Send cancellation email
    await this.emailService.sendCancellationEmail(updated, reason);

    this.logger.log(`Invoice cancelled: ${invoice.invoiceNumber}`);
    return this.mapToResponse(updated);
  }

  /**
   * Generate PDF for invoice
   */
  async generatePdf(
    id: string,
    template: 'standard' | 'detailed' | 'minimal' = 'standard',
  ): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!invoice) {
      throw new NotFoundException(
        ErrorCodes.INVOICE_NOT_FOUND,
        `Invoice not found: ${id}`,
        { invoiceId: id },
      );
    }

    return this.pdfService.generatePdf(invoice, { template });
  }

  /**
   * Get invoice statistics
   */
  async getStats(
    festivalId?: string,
    userId?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<InvoiceStatsDto> {
    const where: Prisma.InvoiceWhereInput = {};
    if (festivalId) {where.festivalId = festivalId;}
    if (userId) {where.userId = userId;}
    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) {where.issueDate.gte = dateFrom;}
      if (dateTo) {where.issueDate.lte = dateTo;}
    }

    const now = new Date();

    // Get all invoices for stats
    const invoices = await this.prisma.invoice.findMany({
      where,
      select: {
        id: true,
        status: true,
        total: true,
        taxAmount: true,
        taxRate: true,
        currency: true,
        issueDate: true,
        dueDate: true,
        paidAt: true,
      },
    });

    // Calculate stats
    let totalAmount = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let totalPaymentDays = 0;
    let paidCount = 0;

    const byStatus = {
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
    };

    const byCurrency = new Map<string, { count: number; total: number; paidAmount: number; outstandingAmount: number }>();

    for (const inv of invoices) {
      const total = Number(inv.total);
      totalAmount += total;

      // Status counts
      switch (inv.status) {
        case InvoiceStatus.DRAFT:
          byStatus.draft++;
          break;
        case InvoiceStatus.SENT:
          if (inv.dueDate < now) {
            byStatus.overdue++;
            totalOverdue += total;
          } else {
            byStatus.sent++;
          }
          totalOutstanding += total;
          break;
        case InvoiceStatus.PAID:
          byStatus.paid++;
          totalPaid += total;
          if (inv.paidAt && inv.issueDate) {
            totalPaymentDays += Math.floor((inv.paidAt.getTime() - inv.issueDate.getTime()) / (1000 * 60 * 60 * 24));
            paidCount++;
          }
          break;
        case InvoiceStatus.OVERDUE:
          byStatus.overdue++;
          totalOverdue += total;
          totalOutstanding += total;
          break;
        case InvoiceStatus.CANCELLED:
          byStatus.cancelled++;
          break;
      }

      // Currency breakdown
      const curr = byCurrency.get(inv.currency) || { count: 0, total: 0, paidAmount: 0, outstandingAmount: 0 };
      curr.count++;
      curr.total += total;
      if (inv.status === InvoiceStatus.PAID) {
        curr.paidAmount += total;
      } else if (inv.status === InvoiceStatus.SENT || inv.status === InvoiceStatus.OVERDUE) {
        curr.outstandingAmount += total;
      }
      byCurrency.set(inv.currency, curr);
    }

    const averagePaymentTime = paidCount > 0 ? totalPaymentDays / paidCount : 0;

    return {
      totalInvoices: invoices.length,
      totalAmount,
      totalPaid,
      totalOutstanding,
      totalOverdue,
      averageInvoiceAmount: invoices.length > 0 ? totalAmount / invoices.length : 0,
      averagePaymentTime,
      byStatus,
      byCurrency: Array.from(byCurrency.entries()).map(([currency, data]) => ({
        currency,
        ...data,
      })),
      baseCurrency: 'EUR',
      generatedAt: new Date(),
    };
  }

  /**
   * Check and mark overdue invoices
   */
  async processOverdueInvoices(): Promise<number> {
    const now = new Date();

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.SENT,
        dueDate: { lt: now },
      },
    });

    if (overdueInvoices.length === 0) {
      return 0;
    }

    await this.prisma.invoice.updateMany({
      where: {
        id: { in: overdueInvoices.map((i) => i.id) },
      },
      data: {
        status: InvoiceStatus.OVERDUE,
      },
    });

    this.logger.log(`Marked ${overdueInvoices.length} invoices as overdue`);
    return overdueInvoices.length;
  }

  /**
   * Map invoice to response DTO
   */
  private mapToResponse(invoice: InvoiceWithItems): InvoiceResponseDto {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      festivalId: invoice.festivalId,
      userId: invoice.userId,
      currency: invoice.currency,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      taxRate: Number(invoice.taxRate),
      total: Number(invoice.total),
      originalCurrency: invoice.originalCurrency || undefined,
      originalSubtotal: invoice.originalSubtotal ? Number(invoice.originalSubtotal) : undefined,
      originalTax: invoice.originalTax ? Number(invoice.originalTax) : undefined,
      originalTotal: invoice.originalTotal ? Number(invoice.originalTotal) : undefined,
      exchangeRate: invoice.exchangeRate ? Number(invoice.exchangeRate) : undefined,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt || undefined,
      sentAt: invoice.sentAt || undefined,
      cancelledAt: invoice.cancelledAt || undefined,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerAddress: invoice.customerAddress || undefined,
      customerPhone: invoice.customerPhone || undefined,
      customerVatNumber: invoice.customerVatNumber || undefined,
      companyName: invoice.companyName,
      companyAddress: invoice.companyAddress,
      companyVatNumber: invoice.companyVatNumber || undefined,
      companyEmail: invoice.companyEmail || undefined,
      companyPhone: invoice.companyPhone || undefined,
      taxExempt: invoice.taxExempt,
      reverseCharge: invoice.reverseCharge,
      taxCountry: invoice.taxCountry || undefined,
      paymentId: invoice.paymentId || undefined,
      notes: invoice.notes || undefined,
      pdfUrl: invoice.pdfUrl || undefined,
      locale: invoice.locale,
      items: invoice.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
        taxRate: item.taxRate ? Number(item.taxRate) : undefined,
        taxAmount: item.taxAmount ? Number(item.taxAmount) : undefined,
        itemType: item.itemType || undefined,
        itemId: item.itemId || undefined,
        metadata: item.metadata as Record<string, unknown>,
        sortOrder: item.sortOrder,
        createdAt: item.createdAt,
      })),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  /**
   * Map invoice to detail response DTO
   */
  private mapToDetailResponse(invoice: InvoiceWithItems): InvoiceDetailResponseDto {
    const base = this.mapToResponse(invoice);
    const now = new Date();
    const dueDate = new Date(invoice.dueDate);
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      ...base,
      formattedSubtotal: this.formatPrice(Number(invoice.subtotal), invoice.currency),
      formattedTax: this.formatPrice(Number(invoice.taxAmount), invoice.currency),
      formattedTotal: this.formatPrice(Number(invoice.total), invoice.currency),
      formattedOriginalTotal: invoice.originalTotal && invoice.originalCurrency
        ? this.formatPrice(Number(invoice.originalTotal), invoice.originalCurrency)
        : undefined,
      isOverdue: invoice.status === InvoiceStatus.SENT && daysUntilDue < 0,
      daysUntilDue,
    };
  }

  /**
   * Format price for display
   */
  private formatPrice(amount: number, currency: string): FormattedPriceDto {
    return {
      amount,
      currency,
      formatted: new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
      }).format(amount),
    };
  }
}
