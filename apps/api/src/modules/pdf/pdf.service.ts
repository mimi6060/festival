import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import {
  TicketPdfData,
  InvoicePdfData,
  ReceiptPdfData,
  StaffBadgePdfData,
  ProgramPdfData,
  CampingVoucherPdfData,
  RefundConfirmationPdfData,
  AnalyticsPdfData,
  CompanyInfo,
  DEFAULT_PDF_COLORS,
  PdfColors,
} from './interfaces';

/**
 * PDF Service
 *
 * Generates PDF documents for:
 * - Tickets with QR codes
 * - Invoices with detailed line items and TVA
 * - Receipts for payments
 * - Staff badges with photo and QR verification
 * - Festival programs
 * - Camping vouchers
 * - Refund confirmations
 * - Analytics reports
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly companyInfo: CompanyInfo;
  private readonly colors: PdfColors = DEFAULT_PDF_COLORS;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Company information for invoices (from config or defaults)
    this.companyInfo = {
      name: this.configService.get<string>('COMPANY_NAME') || 'Festival Platform SAS',
      address: this.configService.get<string>('COMPANY_ADDRESS') || '123 Rue des Festivals, 75001 Paris, France',
      phone: this.configService.get<string>('COMPANY_PHONE') || '+33 1 23 45 67 89',
      email: this.configService.get<string>('COMPANY_EMAIL') || 'contact@festival-platform.com',
      siret: this.configService.get<string>('COMPANY_SIRET'),
      tva: this.configService.get<string>('COMPANY_TVA'),
    };
  }

  // ============================================
  // TICKET PDF
  // ============================================

  /**
   * Generate a ticket PDF with QR code
   */
  async generateTicketPdf(ticketId: string, userId: string): Promise<Buffer> {
    this.logger.log(`Generating ticket PDF for ticket: ${ticketId}`);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: { select: { name: true, type: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
        festival: {
          select: {
            id: true,
            name: true,
            location: true,
            address: true,
            startDate: true,
            endDate: true,
            logoUrl: true,
            contactEmail: true,
            websiteUrl: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    // Verify ownership
    if (ticket.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN' && user?.role !== 'ORGANIZER') {
        throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
      }
    }

    const ticketData: TicketPdfData = {
      id: ticket.id,
      qrCode: ticket.qrCode,
      qrCodeData: ticket.qrCodeData,
      purchasePrice: Number(ticket.purchasePrice),
      status: ticket.status,
      createdAt: ticket.createdAt,
      category: ticket.category,
      user: ticket.user,
      festival: {
        ...ticket.festival,
        logoUrl: ticket.festival.logoUrl ?? undefined,
        address: ticket.festival.address ?? undefined,
        contactEmail: ticket.festival.contactEmail ?? undefined,
        websiteUrl: ticket.festival.websiteUrl ?? undefined,
      },
    };

    return this.createTicketPdfDocument(ticketData);
  }

  private async createTicketPdfDocument(data: TicketPdfData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Ticket - ${data.festival.name}`,
            Author: 'Festival Platform',
            Subject: `Ticket ${data.qrCode}`,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer | Uint8Array) => chunks.push(chunk as Buffer));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header with festival name
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text(data.festival.name, { align: 'center' });

        doc.moveDown(0.5);

        // Ticket type badge
        const badgeColor = this.getTicketTypeColor(data.category.type);
        doc
          .fontSize(14)
          .fillColor(badgeColor)
          .text(`${data.category.name} - ${data.category.type}`, { align: 'center' });

        doc.moveDown(1);

        // Divider line
        this.drawDivider(doc);
        doc.moveDown(1);

        // QR Code section
        try {
          const qrCodeDataUrl = await QRCode.toDataURL(data.qrCodeData, {
            errorCorrectionLevel: 'H',
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
          });

          const qrCodeBuffer = Buffer.from(
            qrCodeDataUrl.replace(/^data:image\/png;base64,/, ''),
            'base64',
          );

          const qrX = (doc.page.width - 200) / 2;
          doc.image(qrCodeBuffer, qrX, doc.y, { width: 200 });
          doc.moveDown(12);
        } catch (qrError) {
          this.logger.error('Failed to generate QR code for PDF', qrError);
          doc.fontSize(10).fillColor(this.colors.error).text('QR Code generation failed', { align: 'center' });
          doc.moveDown(2);
        }

        // Ticket code
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text(data.qrCode, { align: 'center' });

        doc.moveDown(1.5);

        // Event details section
        this.addSectionHeader(doc, 'INFORMATIONS EVENEMENT');

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(`Lieu: ${data.festival.location}`, 50);

        if (data.festival.address) {
          doc.text(`Adresse: ${data.festival.address}`, 50);
        }

        doc.text(`Date: ${this.formatDate(data.festival.startDate)} - ${this.formatDate(data.festival.endDate)}`, 50);

        doc.moveDown(1);

        // Ticket holder section
        this.addSectionHeader(doc, 'TITULAIRE DU BILLET');

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(`Nom: ${data.user.firstName} ${data.user.lastName}`, 50)
          .text(`Email: ${data.user.email}`, 50);

        doc.moveDown(1);

        // Purchase info
        this.addSectionHeader(doc, 'INFORMATIONS ACHAT');

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(`Prix: ${data.purchasePrice.toFixed(2)} EUR`, 50)
          .text(`Date d'achat: ${this.formatDateTime(data.createdAt)}`, 50)
          .text(`Statut: ${this.translateTicketStatus(data.status)}`, 50);

        doc.moveDown(2);

        // Divider
        this.drawDivider(doc);
        doc.moveDown(1);

        // Terms and conditions
        this.addTermsAndConditions(doc, data.festival.contactEmail, data.festival.websiteUrl);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================
  // INVOICE PDF
  // ============================================

  /**
   * Generate an invoice PDF for a payment
   */
  async generateInvoicePdf(paymentId: string, userId: string): Promise<Buffer> {
    this.logger.log(`Generating invoice PDF for payment: ${paymentId}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        tickets: {
          include: {
            category: true,
            festival: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    // Verify ownership
    if (payment.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN') {
        throw new NotFoundException(`Payment with ID ${paymentId} not found`);
      }
    }

    // Build items list
    const itemsMap = new Map<string, { description: string; quantity: number; unitPrice: number }>();

    for (const ticket of payment.tickets) {
      const key = `${ticket.festival.name} - ${ticket.category.name}`;
      const existing = itemsMap.get(key);

      if (existing) {
        existing.quantity += 1;
      } else {
        itemsMap.set(key, {
          description: key,
          quantity: 1,
          unitPrice: Number(ticket.purchasePrice),
        });
      }
    }

    const items = Array.from(itemsMap.values()).map(item => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = 0.20; // 20% TVA
    const taxAmount = subtotal * taxRate;

    const invoiceData: InvoicePdfData = {
      id: payment.id,
      invoiceNumber: `FAC-${payment.id.substring(0, 8).toUpperCase()}`,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      description: payment.description ?? undefined,
      paidAt: payment.paidAt ?? undefined,
      createdAt: payment.createdAt,
      user: {
        firstName: payment.user.firstName,
        lastName: payment.user.lastName,
        email: payment.user.email,
        phone: payment.user.phone ?? undefined,
      },
      items,
      taxRate: taxRate * 100,
      taxAmount,
      subtotal,
    };

    return this.createInvoicePdfDocument(invoiceData);
  }

  private async createInvoicePdfDocument(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Facture - ${data.invoiceNumber}`,
            Author: this.companyInfo.name,
            Subject: `Facture pour paiement ${data.id}`,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer | Uint8Array) => chunks.push(chunk as Buffer));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Company header
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text(this.companyInfo.name, 50, 50);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(this.companyInfo.address, 50, 75)
          .text(`Tel: ${this.companyInfo.phone}`, 50)
          .text(`Email: ${this.companyInfo.email}`, 50);

        if (this.companyInfo.siret) {
          doc.text(`SIRET: ${this.companyInfo.siret}`, 50);
        }
        if (this.companyInfo.tva) {
          doc.text(`N TVA: ${this.companyInfo.tva}`, 50);
        }

        // Invoice title
        doc
          .fontSize(28)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text('FACTURE', 400, 50, { align: 'right' });

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(`N: ${data.invoiceNumber}`, 400, 85, { align: 'right' })
          .text(`Date: ${this.formatDate(data.paidAt || data.createdAt)}`, 400, 100, { align: 'right' });

        doc.moveDown(4);

        // Customer box
        const customerBoxY = 160;
        doc
          .rect(350, customerBoxY, 195, 80)
          .fillAndStroke('#f5f5f5', this.colors.border);

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(this.colors.text)
          .text('FACTURER A:', 360, customerBoxY + 10);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(`${data.user.firstName} ${data.user.lastName}`, 360, customerBoxY + 28)
          .text(data.user.email, 360, customerBoxY + 43);

        if (data.user.phone) {
          doc.text(data.user.phone, 360, customerBoxY + 58);
        }

        // Items table
        const tableTop = 280;
        const tableLeft = 50;

        // Table header
        doc
          .rect(tableLeft, tableTop, 495, 25)
          .fill(this.colors.primary);

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text('Description', tableLeft + 10, tableTop + 8)
          .text('Qty', tableLeft + 280, tableTop + 8, { width: 50, align: 'center' })
          .text('Prix Unit. HT', tableLeft + 330, tableTop + 8, { width: 80, align: 'right' })
          .text('Total HT', tableLeft + 420, tableTop + 8, { width: 65, align: 'right' });

        // Table rows
        let currentY = tableTop + 25;
        let rowIndex = 0;

        for (const item of data.items) {
          const rowHeight = 30;
          const bgColor = rowIndex % 2 === 0 ? '#ffffff' : '#f9f9f9';

          doc
            .rect(tableLeft, currentY, 495, rowHeight)
            .fillAndStroke(bgColor, this.colors.border);

          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor(this.colors.text)
            .text(item.description, tableLeft + 10, currentY + 10, { width: 260 })
            .text(item.quantity.toString(), tableLeft + 280, currentY + 10, { width: 50, align: 'center' })
            .text(`${item.unitPrice.toFixed(2)} ${data.currency}`, tableLeft + 330, currentY + 10, { width: 80, align: 'right' })
            .text(`${item.total.toFixed(2)} ${data.currency}`, tableLeft + 420, currentY + 10, { width: 65, align: 'right' });

          currentY += rowHeight;
          rowIndex++;
        }

        // Totals section
        currentY += 20;

        // Subtotal
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.text)
          .text('Sous-total HT:', tableLeft + 330, currentY)
          .text(`${data.subtotal.toFixed(2)} ${data.currency}`, tableLeft + 420, currentY, { width: 65, align: 'right' });

        currentY += 20;

        // TVA
        doc
          .text(`TVA (${data.taxRate}%):`, tableLeft + 330, currentY)
          .text(`${data.taxAmount.toFixed(2)} ${data.currency}`, tableLeft + 420, currentY, { width: 65, align: 'right' });

        currentY += 25;

        // Total TTC box
        doc
          .rect(tableLeft + 300, currentY, 195, 40)
          .fillAndStroke('#f0f0f0', this.colors.border);

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text('TOTAL TTC:', tableLeft + 310, currentY + 14)
          .text(`${data.amount.toFixed(2)} ${data.currency}`, tableLeft + 420, currentY + 14, { width: 65, align: 'right' });

        // Payment info
        currentY += 60;

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(this.colors.text)
          .text('INFORMATIONS DE PAIEMENT', tableLeft, currentY);

        doc.moveDown(0.5);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(`Methode: ${this.translatePaymentProvider(data.provider)}`, tableLeft)
          .text(`Statut: ${this.translatePaymentStatus(data.status)}`, tableLeft);

        if (data.paidAt) {
          doc.text(`Date de paiement: ${this.formatDateTime(data.paidAt)}`, tableLeft);
        }

        // Footer
        this.addInvoiceFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================
  // RECEIPT PDF
  // ============================================

  /**
   * Generate a receipt PDF for a payment
   */
  async generateReceiptPdf(paymentId: string, userId: string): Promise<Buffer> {
    this.logger.log(`Generating receipt PDF for payment: ${paymentId}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        tickets: {
          include: {
            category: true,
            festival: { select: { name: true, location: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    // Verify ownership
    if (payment.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN') {
        throw new NotFoundException(`Payment with ID ${paymentId} not found`);
      }
    }

    const items = payment.tickets.map(ticket => ({
      description: `${ticket.festival.name} - ${ticket.category.name}`,
      quantity: 1,
      unitPrice: Number(ticket.purchasePrice),
      total: Number(ticket.purchasePrice),
    }));

    const festival = payment.tickets[0]?.festival;

    const receiptData: ReceiptPdfData = {
      id: payment.id,
      receiptNumber: `REC-${payment.id.substring(0, 8).toUpperCase()}`,
      amount: Number(payment.amount),
      currency: payment.currency,
      paymentMethod: payment.provider,
      paidAt: payment.paidAt || payment.createdAt,
      user: payment.user,
      items,
      festival: festival ? { name: festival.name, location: festival.location } : undefined,
    };

    return this.createReceiptPdfDocument(receiptData);
  }

  private async createReceiptPdfDocument(data: ReceiptPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Receipt format - narrower
        const doc = new PDFDocument({
          size: [300, 600],
          margin: 20,
          info: {
            Title: `Recu - ${data.receiptNumber}`,
            Author: this.companyInfo.name,
            Subject: `Recu de paiement ${data.id}`,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer | Uint8Array) => chunks.push(chunk as Buffer));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = 300;
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;

        // Header
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text(this.companyInfo.name, { align: 'center', width: contentWidth });

        doc.moveDown(0.3);

        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(this.companyInfo.address, { align: 'center', width: contentWidth });

        doc.moveDown(1);

        // Receipt title
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text('RECU DE PAIEMENT', { align: 'center', width: contentWidth });

        doc.moveDown(0.5);

        // Receipt number and date
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(this.colors.text)
          .text(`N: ${data.receiptNumber}`, { align: 'center' })
          .text(`Date: ${this.formatDateTime(data.paidAt)}`, { align: 'center' });

        doc.moveDown(1);

        // Dashed divider
        this.drawDashedLine(doc, margin, doc.y, pageWidth - margin);
        doc.moveDown(0.5);

        // Customer info
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(this.colors.text)
          .text('Client:');

        doc
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(`${data.user.firstName} ${data.user.lastName}`)
          .text(data.user.email);

        doc.moveDown(0.5);

        // Dashed divider
        this.drawDashedLine(doc, margin, doc.y, pageWidth - margin);
        doc.moveDown(0.5);

        // Items
        for (const item of data.items) {
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor(this.colors.text)
            .text(item.description, margin, doc.y, { width: contentWidth - 60 });

          doc
            .text(`${item.total.toFixed(2)} ${data.currency}`, pageWidth - margin - 60, doc.y - 12, { width: 60, align: 'right' });

          doc.moveDown(0.3);
        }

        doc.moveDown(0.5);

        // Dashed divider
        this.drawDashedLine(doc, margin, doc.y, pageWidth - margin);
        doc.moveDown(0.5);

        // Total
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text('TOTAL:', margin, doc.y, { continued: true })
          .text(`${data.amount.toFixed(2)} ${data.currency}`, { align: 'right' });

        doc.moveDown(1);

        // Payment method
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(`Paye par: ${this.translatePaymentProvider(data.paymentMethod)}`, { align: 'center' });

        doc.moveDown(2);

        // Thank you message
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(this.colors.text)
          .text('Merci pour votre achat!', { align: 'center' });

        if (data.festival) {
          doc.moveDown(0.5);
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor(this.colors.textLight)
            .text(`Rendez-vous a ${data.festival.name}`, { align: 'center' });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================
  // STAFF BADGE PDF
  // ============================================

  /**
   * Generate a staff badge PDF
   */
  async generateBadgePdf(assignmentId: string, userId: string): Promise<Buffer> {
    this.logger.log(`Generating badge PDF for assignment: ${assignmentId}`);

    const assignment = await this.prisma.staffAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        festival: {
          select: {
            id: true,
            name: true,
            location: true,
            startDate: true,
            endDate: true,
            logoUrl: true,
          },
        },
        zone: { select: { name: true, description: true } },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Staff assignment with ID ${assignmentId} not found`);
    }

    // Verify ownership
    if (assignment.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN' && user?.role !== 'ORGANIZER') {
        throw new NotFoundException(`Staff assignment with ID ${assignmentId} not found`);
      }
    }

    // Define permissions based on role
    const permissions = this.getPermissionsForRole(assignment.role);

    const badgeData: StaffBadgePdfData = {
      id: assignment.id,
      badgeNumber: `STAFF-${assignment.id.substring(0, 6).toUpperCase()}`,
      role: assignment.role,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      user: assignment.user,
      festival: {
        ...assignment.festival,
        logoUrl: assignment.festival.logoUrl ?? undefined,
      },
      zone: assignment.zone ? {
        name: assignment.zone.name,
        description: assignment.zone.description ?? undefined,
      } : undefined,
      permissions,
    };

    return this.createBadgePdfDocument(badgeData);
  }

  private async createBadgePdfDocument(data: StaffBadgePdfData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        // Badge format (ID card style)
        const doc = new PDFDocument({
          size: [340, 540],
          margin: 20,
          info: {
            Title: `Badge Staff - ${data.user.firstName} ${data.user.lastName}`,
            Author: 'Festival Platform',
            Subject: `Badge staff pour ${data.festival.name}`,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer | Uint8Array) => chunks.push(chunk as Buffer));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = 340;
        const roleColor = this.getRoleColor(data.role);

        // Header band with role color
        doc
          .rect(0, 0, pageWidth, 80)
          .fill(roleColor);

        // Festival name
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text(data.festival.name, 20, 20, { width: pageWidth - 40, align: 'center' });

        // Role
        doc
          .fontSize(18)
          .text(this.translateRole(data.role), 20, 48, { width: pageWidth - 40, align: 'center' });

        // Badge number
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#ffffff')
          .text(data.badgeNumber, 20, 65, { width: pageWidth - 40, align: 'center' });

        // Photo placeholder (circle)
        const photoY = 100;
        const photoSize = 80;
        const photoX = (pageWidth - photoSize) / 2;

        doc
          .circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2)
          .fillAndStroke('#f0f0f0', this.colors.border);

        doc
          .fontSize(10)
          .fillColor(this.colors.textLight)
          .text('PHOTO', photoX, photoY + photoSize / 2 - 5, { width: photoSize, align: 'center' });

        // Staff name
        doc
          .fontSize(22)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text(data.user.firstName.toUpperCase(), 20, photoY + photoSize + 20, { width: pageWidth - 40, align: 'center' })
          .text(data.user.lastName.toUpperCase(), 20, doc.y, { width: pageWidth - 40, align: 'center' });

        doc.moveDown(1);

        // QR Code for verification
        try {
          const qrData = JSON.stringify({
            type: 'STAFF_BADGE',
            assignmentId: data.id,
            staffId: data.user.id,
            festivalId: data.festival.id,
            role: data.role,
            badgeNumber: data.badgeNumber,
          });

          const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'M',
            width: 120,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' },
          });

          const qrCodeBuffer = Buffer.from(
            qrCodeDataUrl.replace(/^data:image\/png;base64,/, ''),
            'base64',
          );

          const qrX = (pageWidth - 120) / 2;
          doc.image(qrCodeBuffer, qrX, doc.y, { width: 120 });
          doc.moveDown(8);
        } catch (qrError) {
          this.logger.error('Failed to generate QR code for badge', qrError);
          doc.moveDown(2);
        }

        // Zone info
        if (data.zone) {
          doc
            .rect(20, doc.y, pageWidth - 40, 35)
            .fillAndStroke('#f0f0f0', this.colors.border);

          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor(this.colors.text)
            .text('ZONE ASSIGNEE:', 30, doc.y - 27);

          doc
            .fontSize(11)
            .font('Helvetica')
            .text(data.zone.name, 30, doc.y - 13);
        }

        doc.moveDown(2);

        // Schedule
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(`Horaires: ${this.formatTime(data.startTime)} - ${this.formatTime(data.endTime)}`, 20, doc.y, { width: pageWidth - 40, align: 'center' });

        // Festival dates
        doc
          .text(`${this.formatDate(data.festival.startDate)} - ${this.formatDate(data.festival.endDate)}`, { width: pageWidth - 40, align: 'center' });

        // Location
        doc
          .fontSize(8)
          .text(data.festival.location, { width: pageWidth - 40, align: 'center' });

        // Permissions (at bottom)
        if (data.permissions.length > 0) {
          doc.moveDown(1);
          doc
            .fontSize(7)
            .font('Helvetica')
            .fillColor(this.colors.textLight)
            .text(`Acces: ${data.permissions.join(' | ')}`, 20, doc.y, { width: pageWidth - 40, align: 'center' });
        }

        // Footer warning
        doc
          .fontSize(7)
          .fillColor('#cccccc')
          .text('Ce badge est personnel et non cessible', 20, 515, { width: pageWidth - 40, align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================
  // PROGRAM PDF
  // ============================================

  /**
   * Generate a festival program PDF
   */
  async generateProgramPdf(festivalId: string): Promise<Buffer> {
    this.logger.log(`Generating program PDF for festival: ${festivalId}`);

    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      include: {
        stages: {
          include: {
            performances: {
              where: { isCancelled: false },
              include: { artist: true },
              orderBy: { startTime: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    const programData: ProgramPdfData = {
      festival: {
        id: festival.id,
        name: festival.name,
        location: festival.location,
        startDate: festival.startDate,
        endDate: festival.endDate,
        description: festival.description ?? undefined,
        logoUrl: festival.logoUrl ?? undefined,
      },
      stages: festival.stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        description: stage.description ?? undefined,
        performances: stage.performances.map(perf => ({
          id: perf.id,
          artistName: perf.artist.name,
          artistGenre: perf.artist.genre ?? undefined,
          startTime: perf.startTime,
          endTime: perf.endTime,
          description: perf.description ?? undefined,
        })),
      })),
      generatedAt: new Date(),
    };

    return this.createProgramPdfDocument(programData);
  }

  private async createProgramPdfDocument(data: ProgramPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          info: {
            Title: `Programme - ${data.festival.name}`,
            Author: 'Festival Platform',
            Subject: `Programme du festival ${data.festival.name}`,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer | Uint8Array) => chunks.push(chunk as Buffer));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Cover page
        doc.moveDown(8);

        doc
          .fontSize(36)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text(data.festival.name, { align: 'center' });

        doc.moveDown(1);

        doc
          .fontSize(20)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text('PROGRAMME OFFICIEL', { align: 'center' });

        doc.moveDown(2);

        doc
          .fontSize(14)
          .fillColor(this.colors.text)
          .text(`${this.formatDate(data.festival.startDate)} - ${this.formatDate(data.festival.endDate)}`, { align: 'center' })
          .text(data.festival.location, { align: 'center' });

        if (data.festival.description) {
          doc.moveDown(3);
          doc
            .fontSize(11)
            .fillColor(this.colors.textLight)
            .text(data.festival.description, { align: 'center' });
        }

        // Group performances by day
        const performancesByDay = new Map<string, { stage: string; performances: typeof data.stages[0]['performances'] }[]>();

        for (const stage of data.stages) {
          for (const perf of stage.performances) {
            const dayKey = this.formatDate(perf.startTime);
            if (!performancesByDay.has(dayKey)) {
              performancesByDay.set(dayKey, []);
            }
            const dayPerfs = performancesByDay.get(dayKey)!;
            let stageEntry = dayPerfs.find(s => s.stage === stage.name);
            if (!stageEntry) {
              stageEntry = { stage: stage.name, performances: [] };
              dayPerfs.push(stageEntry);
            }
            stageEntry.performances.push(perf);
          }
        }

        // Generate pages for each day
        for (const [day, stages] of performancesByDay) {
          doc.addPage();

          // Day header
          doc
            .rect(40, 40, doc.page.width - 80, 50)
            .fill(this.colors.primary);

          doc
            .fontSize(24)
            .font('Helvetica-Bold')
            .fillColor('#ffffff')
            .text(day, 50, 55, { width: doc.page.width - 100, align: 'center' });

          doc.y = 110;

          // Stages and performances
          for (const stageData of stages) {
            // Stage name
            doc
              .fontSize(16)
              .font('Helvetica-Bold')
              .fillColor(this.colors.accent)
              .text(stageData.stage, 40, doc.y);

            doc.moveDown(0.5);

            // Performances table
            for (const perf of stageData.performances) {
              const time = `${this.formatTime(perf.startTime)} - ${this.formatTime(perf.endTime)}`;

              doc
                .fontSize(10)
                .font('Helvetica-Bold')
                .fillColor(this.colors.text)
                .text(time, 50, doc.y, { continued: true, width: 100 });

              doc
                .font('Helvetica-Bold')
                .text(perf.artistName, { continued: true, width: 200 });

              if (perf.artistGenre) {
                doc
                  .font('Helvetica')
                  .fillColor(this.colors.textLight)
                  .text(` (${perf.artistGenre})`, { width: 150 });
              } else {
                doc.text('');
              }

              doc.moveDown(0.3);

              // Check for page overflow
              if (doc.y > doc.page.height - 100) {
                doc.addPage();
                doc.y = 50;
              }
            }

            doc.moveDown(1);
          }
        }

        // Back cover with info
        doc.addPage();
        doc.moveDown(10);

        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(`Programme genere le ${this.formatDateTime(data.generatedAt)}`, { align: 'center' });

        doc.moveDown(1);

        doc
          .fontSize(10)
          .text('Les horaires sont susceptibles de changer.', { align: 'center' })
          .text('Consultez l\'application pour les mises a jour en temps reel.', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================
  // CAMPING VOUCHER PDF
  // ============================================

  /**
   * Generate a camping voucher PDF
   */
  async generateCampingVoucherPdf(bookingId: string, userId: string): Promise<Buffer> {
    this.logger.log(`Generating camping voucher PDF for booking: ${bookingId}`);

    const booking = await this.prisma.campingBooking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        spot: {
          include: {
            zone: {
              include: {
                festival: { select: { name: true, location: true, startDate: true, endDate: true } },
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Camping booking with ID ${bookingId} not found`);
    }

    // Verify ownership
    if (booking.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN' && user?.role !== 'ORGANIZER') {
        throw new NotFoundException(`Camping booking with ID ${bookingId} not found`);
      }
    }

    const qrCodeData = JSON.stringify({
      type: 'CAMPING_VOUCHER',
      bookingId: booking.id,
      spotId: booking.spotId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
    });

    const voucherData: CampingVoucherPdfData = {
      id: booking.id,
      voucherNumber: `CAMP-${booking.id.substring(0, 8).toUpperCase()}`,
      booking: {
        id: booking.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guestCount: booking.guestCount,
        status: booking.status,
        totalPrice: Number(booking.totalPrice),
      },
      spot: {
        name: `${booking.spot.zone.name} - ${booking.spot.number}`,
        type: booking.spot.zone.type,
        description: booking.spot.zone.description ?? undefined,
        amenities: booking.spot.zone.amenities,
      },
      user: booking.user,
      festival: booking.spot.zone.festival,
      qrCodeData,
    };

    return this.createCampingVoucherPdfDocument(voucherData);
  }

  private async createCampingVoucherPdfDocument(data: CampingVoucherPdfData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Bon Camping - ${data.voucherNumber}`,
            Author: 'Festival Platform',
            Subject: `Bon de camping pour ${data.festival.name}`,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer | Uint8Array) => chunks.push(chunk as Buffer));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text('BON DE CAMPING', { align: 'center' });

        doc.moveDown(0.5);

        doc
          .fontSize(18)
          .font('Helvetica')
          .fillColor(this.colors.text)
          .text(data.festival.name, { align: 'center' });

        doc.moveDown(0.5);

        doc
          .fontSize(12)
          .fillColor(this.colors.textLight)
          .text(data.voucherNumber, { align: 'center' });

        doc.moveDown(1);

        this.drawDivider(doc);
        doc.moveDown(1);

        // QR Code
        try {
          const qrCodeDataUrl = await QRCode.toDataURL(data.qrCodeData, {
            errorCorrectionLevel: 'H',
            width: 180,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
          });

          const qrCodeBuffer = Buffer.from(
            qrCodeDataUrl.replace(/^data:image\/png;base64,/, ''),
            'base64',
          );

          const qrX = (doc.page.width - 180) / 2;
          doc.image(qrCodeBuffer, qrX, doc.y, { width: 180 });
          doc.moveDown(11);
        } catch (qrError) {
          this.logger.error('Failed to generate QR code for camping voucher', qrError);
          doc.moveDown(2);
        }

        doc.moveDown(1);

        // Booking details
        const col1X = 50;

        // Column 1 - Guest info
        this.addSectionHeader(doc, 'TITULAIRE');

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor(this.colors.text)
          .text(`${data.user.firstName} ${data.user.lastName}`, col1X)
          .text(data.user.email, col1X);

        doc.moveDown(1);

        // Column 1 - Dates
        this.addSectionHeader(doc, 'DATES DE SEJOUR');

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor(this.colors.text)
          .text(`Arrivee: ${this.formatDateTime(data.booking.checkIn)}`, col1X)
          .text(`Depart: ${this.formatDateTime(data.booking.checkOut)}`, col1X)
          .text(`Nombre de personnes: ${data.booking.guestCount}`, col1X);

        doc.moveDown(1);

        // Spot info
        this.addSectionHeader(doc, 'EMPLACEMENT');

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor(this.colors.text)
          .text(`Type: ${this.translateAccommodationType(data.spot.type)}`, col1X)
          .text(`Nom: ${data.spot.name}`, col1X);

        if (data.spot.amenities.length > 0) {
          doc.text(`Equipements: ${data.spot.amenities.join(', ')}`, col1X);
        }

        doc.moveDown(1);

        // Price box
        doc
          .rect(col1X, doc.y, 495, 50)
          .fillAndStroke('#f0f0f0', this.colors.border);

        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text('MONTANT TOTAL:', col1X + 20, doc.y - 35)
          .fontSize(18)
          .text(`${data.booking.totalPrice.toFixed(2)} EUR`, col1X + 20, doc.y - 18);

        doc.moveDown(4);

        // Status
        const statusColor = data.booking.status === 'CONFIRMED' ? this.colors.success : this.colors.warning;
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor(statusColor)
          .text(`Statut: ${this.translateBookingStatus(data.booking.status)}`, { align: 'center' });

        doc.moveDown(2);

        this.drawDivider(doc);
        doc.moveDown(1);

        // Instructions
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(this.colors.text)
          .text('INSTRUCTIONS:', col1X);

        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text('- Presentez ce bon a l\'entree du camping', col1X)
          .text('- Le check-in se fait a partir de 14h00', col1X)
          .text('- Le check-out doit etre effectue avant 11h00', col1X)
          .text('- Une piece d\'identite sera demandee', col1X);

        // Footer
        doc
          .fontSize(8)
          .fillColor('#999999')
          .text(
            `${data.festival.name} - ${data.festival.location}`,
            50,
            doc.page.height - 50,
            { align: 'center', width: 495 }
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================
  // REFUND CONFIRMATION PDF
  // ============================================

  /**
   * Generate a refund confirmation PDF
   */
  async generateRefundConfirmationPdf(paymentId: string, userId: string): Promise<Buffer> {
    this.logger.log(`Generating refund confirmation PDF for payment: ${paymentId}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        tickets: {
          include: {
            category: true,
            festival: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    if (payment.status !== 'REFUNDED') {
      throw new NotFoundException(`Payment with ID ${paymentId} is not refunded`);
    }

    // Verify ownership
    if (payment.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN') {
        throw new NotFoundException(`Payment with ID ${paymentId} not found`);
      }
    }

    const items = payment.tickets
      .filter(t => t.status === 'REFUNDED')
      .map(ticket => ({
        description: `${ticket.festival.name} - ${ticket.category.name}`,
        quantity: 1,
        unitPrice: Number(ticket.purchasePrice),
        refundedAmount: Number(ticket.purchasePrice),
      }));

    const refundData: RefundConfirmationPdfData = {
      id: payment.id,
      refundNumber: `RMB-${payment.id.substring(0, 8).toUpperCase()}`,
      originalPaymentId: payment.id,
      originalAmount: Number(payment.amount),
      refundAmount: Number(payment.amount),
      currency: payment.currency,
      reason: (payment.metadata as any)?.refundReason ?? 'Remboursement demande par le client',
      refundedAt: payment.refundedAt || new Date(),
      user: payment.user,
      items,
      refundMethod: payment.provider,
    };

    return this.createRefundConfirmationPdfDocument(refundData);
  }

  private async createRefundConfirmationPdfDocument(data: RefundConfirmationPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Confirmation Remboursement - ${data.refundNumber}`,
            Author: this.companyInfo.name,
            Subject: `Confirmation de remboursement ${data.refundNumber}`,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer | Uint8Array) => chunks.push(chunk as Buffer));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Company header
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text(this.companyInfo.name, 50, 50);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(this.companyInfo.address, 50, 72);

        // Title
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text('CONFIRMATION DE REMBOURSEMENT', 50, 120);

        doc.moveDown(0.5);

        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor(this.colors.text)
          .text(`Reference: ${data.refundNumber}`, 50)
          .text(`Date: ${this.formatDateTime(data.refundedAt)}`, 50);

        doc.moveDown(2);

        // Refund status badge
        doc
          .rect(50, doc.y, 150, 30)
          .fill(this.colors.success);

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text('REMBOURSE', 55, doc.y - 22);

        doc.moveDown(2);

        // Customer info
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(this.colors.text)
          .text('BENEFICIAIRE:', 50);

        doc
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(`${data.user.firstName} ${data.user.lastName}`)
          .text(data.user.email);

        doc.moveDown(1.5);

        // Reason
        if (data.reason) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor(this.colors.text)
            .text('MOTIF DU REMBOURSEMENT:', 50);

          doc
            .font('Helvetica')
            .fillColor(this.colors.textLight)
            .text(data.reason);

          doc.moveDown(1.5);
        }

        // Items table
        const tableTop = doc.y;
        const tableLeft = 50;

        doc
          .rect(tableLeft, tableTop, 495, 25)
          .fill(this.colors.primary);

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text('Article', tableLeft + 10, tableTop + 8)
          .text('Montant rembourse', tableLeft + 400, tableTop + 8, { width: 85, align: 'right' });

        let currentY = tableTop + 25;

        for (const item of data.items) {
          doc
            .rect(tableLeft, currentY, 495, 25)
            .fillAndStroke('#f9f9f9', this.colors.border);

          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor(this.colors.text)
            .text(item.description, tableLeft + 10, currentY + 8, { width: 380 })
            .text(`${item.refundedAmount.toFixed(2)} ${data.currency}`, tableLeft + 400, currentY + 8, { width: 85, align: 'right' });

          currentY += 25;
        }

        // Total
        currentY += 10;
        doc
          .rect(tableLeft + 300, currentY, 195, 40)
          .fillAndStroke('#f0f0f0', this.colors.border);

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text('TOTAL REMBOURSE:', tableLeft + 310, currentY + 14)
          .text(`${data.refundAmount.toFixed(2)} ${data.currency}`, tableLeft + 400, currentY + 14, { width: 85, align: 'right' });

        currentY += 60;

        // Refund method
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(this.colors.text)
          .text('METHODE DE REMBOURSEMENT:', 50, currentY);

        doc
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(`Le montant sera credite sur votre moyen de paiement original (${this.translatePaymentProvider(data.refundMethod)}).`)
          .text('Delai habituel: 5 a 10 jours ouvrables.');

        doc.moveDown(2);

        // Reference info
        doc
          .fontSize(9)
          .fillColor(this.colors.textLight)
          .text(`Reference paiement original: ${data.originalPaymentId.substring(0, 8).toUpperCase()}`);

        // Footer
        doc
          .fontSize(8)
          .fillColor('#999999')
          .text(
            'Ce document fait office de confirmation de remboursement. Conservez-le pour vos archives.',
            50,
            doc.page.height - 60,
            { align: 'center', width: 495 }
          );

        doc
          .text(
            `${this.companyInfo.name} - ${this.companyInfo.email}`,
            50,
            doc.page.height - 45,
            { align: 'center', width: 495 }
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================
  // ANALYTICS REPORT PDF
  // ============================================

  /**
   * Generate an analytics report PDF
   */
  async generateReportPdf(festivalId: string, userId: string): Promise<Buffer> {
    this.logger.log(`Generating report PDF for festival: ${festivalId}`);

    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      include: {
        ticketCategories: true,
        tickets: { include: { category: true } },
        cashlessTransactions: true,
      },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    // Check authorization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && festival.organizerId !== userId) {
      throw new NotFoundException(`Festival with ID ${festivalId} not found`);
    }

    // Calculate statistics
    const soldTickets = festival.tickets.filter(t => t.status === 'SOLD' || t.status === 'USED');
    const usedTickets = festival.tickets.filter(t => t.status === 'USED');
    const totalRevenue = soldTickets.reduce((sum, t) => sum + Number(t.purchasePrice), 0);

    const byCategory = festival.ticketCategories.map(cat => {
      const catTickets = soldTickets.filter(t => t.categoryId === cat.id);
      return {
        name: cat.name,
        sold: catTickets.length,
        revenue: catTickets.reduce((sum, t) => sum + Number(t.purchasePrice), 0),
      };
    });

    const topups = festival.cashlessTransactions.filter(t => t.type === 'TOPUP');
    const payments = festival.cashlessTransactions.filter(t => t.type === 'PAYMENT');
    const totalTopups = topups.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalPayments = payments.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    const analyticsData: AnalyticsPdfData = {
      festivalId: festival.id,
      festivalName: festival.name,
      generatedAt: new Date(),
      period: { startDate: festival.startDate, endDate: festival.endDate },
      ticketStats: {
        totalSold: soldTickets.length,
        totalRevenue,
        byCategory,
        usageRate: soldTickets.length > 0 ? (usedTickets.length / soldTickets.length) * 100 : 0,
      },
      cashlessStats: {
        totalTransactions: festival.cashlessTransactions.length,
        totalTopups,
        totalPayments,
        averageTransaction: festival.cashlessTransactions.length > 0
          ? (totalTopups + totalPayments) / festival.cashlessTransactions.length
          : 0,
      },
    };

    return this.createReportPdfDocument(analyticsData);
  }

  private async createReportPdfDocument(data: AnalyticsPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Rapport Analytique - ${data.festivalName}`,
            Author: 'Festival Platform',
            Subject: `Rapport analytique pour ${data.festivalName}`,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer | Uint8Array) => chunks.push(chunk as Buffer));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text('RAPPORT ANALYTIQUE', { align: 'center' });

        doc.moveDown(0.5);

        doc
          .fontSize(18)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(data.festivalName, { align: 'center' });

        doc.moveDown(0.5);

        doc
          .fontSize(10)
          .fillColor('#999999')
          .text(`Genere le: ${this.formatDateTime(data.generatedAt)}`, { align: 'center' })
          .text(`Periode: ${this.formatDate(data.period.startDate)} - ${this.formatDate(data.period.endDate)}`, { align: 'center' });

        doc.moveDown(2);

        // Ticket Statistics Section
        this.addReportSection(doc, 'STATISTIQUES BILLETTERIE', '#2563eb');
        doc.moveDown(0.5);

        const metricsY = doc.y;
        const metricWidth = 140;

        this.addMetricBox(doc, 'Billets Vendus', data.ticketStats.totalSold.toString(), 50, metricsY, metricWidth);
        this.addMetricBox(doc, 'Chiffre d\'Affaires', `${data.ticketStats.totalRevenue.toFixed(2)} EUR`, 200, metricsY, metricWidth);
        this.addMetricBox(doc, 'Taux d\'Utilisation', `${data.ticketStats.usageRate.toFixed(1)}%`, 350, metricsY, metricWidth);

        doc.moveDown(6);

        // Sales by category
        if (data.ticketStats.byCategory.length > 0) {
          doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .fillColor(this.colors.text)
            .text('Ventes par categorie', 50);

          doc.moveDown(0.5);

          const tableTop = doc.y;

          doc
            .rect(50, tableTop, 495, 25)
            .fill('#f0f0f0');

          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor(this.colors.text)
            .text('Categorie', 60, tableTop + 8)
            .text('Vendus', 300, tableTop + 8, { width: 80, align: 'right' })
            .text('Revenus', 400, tableTop + 8, { width: 80, align: 'right' });

          let rowY = tableTop + 25;
          for (const cat of data.ticketStats.byCategory) {
            doc
              .fontSize(10)
              .font('Helvetica')
              .fillColor(this.colors.textLight)
              .text(cat.name, 60, rowY + 8)
              .text(cat.sold.toString(), 300, rowY + 8, { width: 80, align: 'right' })
              .text(`${cat.revenue.toFixed(2)} EUR`, 400, rowY + 8, { width: 80, align: 'right' });

            rowY += 25;
          }

          doc.y = rowY + 10;
        }

        doc.moveDown(1);

        // Cashless Statistics
        if (data.cashlessStats) {
          this.addReportSection(doc, 'STATISTIQUES CASHLESS', '#10b981');
          doc.moveDown(0.5);

          const cashlessY = doc.y;

          this.addMetricBox(doc, 'Transactions', data.cashlessStats.totalTransactions.toString(), 50, cashlessY, metricWidth);
          this.addMetricBox(doc, 'Total Recharges', `${data.cashlessStats.totalTopups.toFixed(2)} EUR`, 200, cashlessY, metricWidth);
          this.addMetricBox(doc, 'Total Depenses', `${data.cashlessStats.totalPayments.toFixed(2)} EUR`, 350, cashlessY, metricWidth);

          doc.moveDown(6);

          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor(this.colors.textLight)
            .text(`Transaction moyenne: ${data.cashlessStats.averageTransaction.toFixed(2)} EUR`, 50);
        }

        // Footer
        doc
          .fontSize(8)
          .fillColor('#999999')
          .text(
            'Ce rapport a ete genere automatiquement par Festival Platform',
            50,
            doc.page.height - 50,
            { align: 'center', width: 495 }
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private drawDivider(doc: PDFKit.PDFDocument): void {
    doc
      .strokeColor(this.colors.border)
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
  }

  private drawDashedLine(doc: PDFKit.PDFDocument, x1: number, y: number, x2: number): void {
    doc
      .strokeColor(this.colors.border)
      .lineWidth(1)
      .dash(5, { space: 3 })
      .moveTo(x1, y)
      .lineTo(x2, y)
      .stroke()
      .undash();
  }

  private addSectionHeader(doc: PDFKit.PDFDocument, title: string): void {
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text(title, 50);

    doc.moveDown(0.5);
  }

  private addReportSection(doc: PDFKit.PDFDocument, title: string, color: string): void {
    doc
      .rect(50, doc.y, 495, 30)
      .fill(color);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text(title, 60, doc.y - 22);
  }

  private addMetricBox(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    x: number,
    y: number,
    width: number,
  ): void {
    doc
      .rect(x, y, width, 60)
      .fillAndStroke('#f9f9f9', this.colors.border);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.colors.textLight)
      .text(label, x + 10, y + 10, { width: width - 20, align: 'center' });

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text(value, x + 10, y + 30, { width: width - 20, align: 'center' });
  }

  private addTermsAndConditions(doc: PDFKit.PDFDocument, contactEmail?: string, websiteUrl?: string): void {
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#999999')
      .text('CONDITIONS GENERALES (Resume)', 50);

    doc.moveDown(0.3);

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text('- Ce billet est personnel et non cessible. Une piece d\'identite peut etre demandee a l\'entree.', 50)
      .text('- L\'organisateur se reserve le droit de refuser l\'acces en cas de comportement inapproprie.', 50)
      .text('- En cas d\'annulation de l\'evenement, le remboursement sera effectue selon les conditions en vigueur.', 50)
      .text('- La reproduction ou falsification de ce billet est interdite et passible de poursuites judiciaires.', 50);

    if (contactEmail) {
      doc.moveDown(0.5);
      doc.text(`Contact: ${contactEmail}`, 50);
    }

    if (websiteUrl) {
      doc.text(`Website: ${websiteUrl}`, 50);
    }
  }

  private addInvoiceFooter(doc: PDFKit.PDFDocument): void {
    const footerY = doc.page.height - 80;

    doc
      .fontSize(8)
      .fillColor('#999999')
      .text(
        'Cette facture a ete generee automatiquement. Elle fait office de justificatif de paiement.',
        50,
        footerY,
        { align: 'center', width: 495 }
      );

    doc
      .text(
        `${this.companyInfo.name} - ${this.companyInfo.address}`,
        50,
        footerY + 15,
        { align: 'center', width: 495 }
      );
  }

  private getTicketTypeColor(type: string): string {
    const colors: Record<string, string> = {
      STANDARD: '#3b82f6',
      VIP: '#f59e0b',
      BACKSTAGE: '#8b5cf6',
      CAMPING: '#10b981',
      PARKING: '#6b7280',
      COMBO: '#ef4444',
    };
    return colors[type] || '#3b82f6';
  }

  private getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      ADMIN: '#dc2626',
      ORGANIZER: '#7c3aed',
      STAFF: '#2563eb',
      CASHIER: '#059669',
      SECURITY: '#d97706',
    };
    return colors[role] || '#2563eb';
  }

  private getPermissionsForRole(role: string): string[] {
    const permissions: Record<string, string[]> = {
      ADMIN: ['TOUTES ZONES', 'BACKSTAGE', 'GESTION'],
      ORGANIZER: ['TOUTES ZONES', 'BACKSTAGE', 'GESTION'],
      STAFF: ['ZONE ASSIGNEE'],
      CASHIER: ['CAISSE', 'ZONE PUBLIQUE'],
      SECURITY: ['TOUTES ZONES', 'CONTROLE'],
    };
    return permissions[role] || ['ZONE PUBLIQUE'];
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private translateTicketStatus(status: string): string {
    const translations: Record<string, string> = {
      AVAILABLE: 'Disponible',
      RESERVED: 'Reserve',
      SOLD: 'Vendu',
      USED: 'Utilise',
      CANCELLED: 'Annule',
      REFUNDED: 'Rembourse',
    };
    return translations[status] || status;
  }

  private translatePaymentStatus(status: string): string {
    const translations: Record<string, string> = {
      PENDING: 'En attente',
      PROCESSING: 'En cours',
      COMPLETED: 'Complete',
      FAILED: 'Echoue',
      REFUNDED: 'Rembourse',
      CANCELLED: 'Annule',
    };
    return translations[status] || status;
  }

  private translatePaymentProvider(provider: string): string {
    const translations: Record<string, string> = {
      STRIPE: 'Carte bancaire (Stripe)',
      PAYPAL: 'PayPal',
      BANK_TRANSFER: 'Virement bancaire',
      CASH: 'Especes',
    };
    return translations[provider] || provider;
  }

  private translateRole(role: string): string {
    const translations: Record<string, string> = {
      ADMIN: 'ADMINISTRATEUR',
      ORGANIZER: 'ORGANISATEUR',
      STAFF: 'STAFF',
      CASHIER: 'CAISSIER',
      SECURITY: 'SECURITE',
    };
    return translations[role] || role;
  }

  private translateAccommodationType(type: string): string {
    const translations: Record<string, string> = {
      TENT: 'Tente',
      CARAVAN: 'Caravane',
      GLAMPING: 'Glamping',
      CABIN: 'Cabane',
      CAMPERVAN: 'Camping-car',
    };
    return translations[type] || type;
  }

  private translateBookingStatus(status: string): string {
    const translations: Record<string, string> = {
      PENDING: 'En attente',
      CONFIRMED: 'Confirme',
      CHECKED_IN: 'Enregistre',
      CHECKED_OUT: 'Parti',
      CANCELLED: 'Annule',
      NO_SHOW: 'Non presente',
    };
    return translations[status] || status;
  }
}
