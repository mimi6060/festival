import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

/**
 * Ticket data interface for PDF generation
 */
export interface TicketPdfData {
  id: string;
  qrCode: string;
  qrCodeData: string;
  purchasePrice: number;
  status: string;
  createdAt: Date;
  category: {
    name: string;
    type: string;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  festival: {
    id: string;
    name: string;
    location: string;
    address?: string;
    startDate: Date;
    endDate: Date;
    logoUrl?: string;
    contactEmail?: string;
    websiteUrl?: string;
  };
}

/**
 * Payment data interface for invoice PDF generation
 */
export interface PaymentPdfData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  description?: string;
  paidAt?: Date;
  createdAt: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

/**
 * Staff assignment data interface for badge PDF generation
 */
export interface StaffBadgePdfData {
  id: string;
  role: string;
  startTime: Date;
  endTime: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  festival: {
    id: string;
    name: string;
    location: string;
    startDate: Date;
    endDate: Date;
    logoUrl?: string;
  };
  zone?: {
    name: string;
    description?: string;
  };
}

/**
 * Analytics data interface for report PDF generation
 */
export interface AnalyticsPdfData {
  festivalId: string;
  festivalName: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  ticketStats: {
    totalSold: number;
    totalRevenue: number;
    byCategory: Array<{
      name: string;
      sold: number;
      revenue: number;
    }>;
    usageRate: number;
  };
  cashlessStats?: {
    totalTransactions: number;
    totalTopups: number;
    totalPayments: number;
    averageTransaction: number;
  };
  attendanceStats?: {
    peak: number;
    average: number;
    byDay: Array<{
      date: string;
      count: number;
    }>;
  };
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly assetsPath: string;
  private readonly companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    siret?: string;
    tva?: string;
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.assetsPath = path.join(__dirname, '..', 'assets');

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

  /**
   * Generate a ticket PDF with QR code
   */
  async generateTicketPdf(ticketId: string, userId: string): Promise<Buffer> {
    this.logger.log(`Generating ticket PDF for ticket: ${ticketId}`);

    // Fetch ticket with all relations
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: {
          select: {
            name: true,
            type: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
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

    // Verify ownership (except for admin)
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

  /**
   * Generate an invoice PDF for a payment
   */
  async generateInvoicePdf(paymentId: string, userId: string): Promise<Buffer> {
    this.logger.log(`Generating invoice PDF for payment: ${paymentId}`);

    // Fetch payment with relations
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
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

    // Verify ownership (except for admin)
    if (payment.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN') {
        throw new NotFoundException(`Payment with ID ${paymentId} not found`);
      }
    }

    // Build items list from tickets
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

    const paymentData: PaymentPdfData = {
      id: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      description: payment.description ?? undefined,
      paidAt: payment.paidAt ?? undefined,
      createdAt: payment.createdAt,
      user: {
        ...payment.user,
        phone: payment.user.phone ?? undefined,
      },
      items,
    };

    return this.createInvoicePdfDocument(paymentData);
  }

  /**
   * Generate a staff badge PDF
   */
  async generateBadgePdf(assignmentId: string, userId: string): Promise<Buffer> {
    this.logger.log(`Generating badge PDF for assignment: ${assignmentId}`);

    // Fetch staff assignment with relations
    const assignment = await this.prisma.staffAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
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
        zone: {
          select: {
            name: true,
            description: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Staff assignment with ID ${assignmentId} not found`);
    }

    // Verify ownership (except for admin)
    if (assignment.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN' && user?.role !== 'ORGANIZER') {
        throw new NotFoundException(`Staff assignment with ID ${assignmentId} not found`);
      }
    }

    const badgeData: StaffBadgePdfData = {
      id: assignment.id,
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
    };

    return this.createBadgePdfDocument(badgeData);
  }

  /**
   * Generate an analytics report PDF
   */
  async generateReportPdf(festivalId: string, userId: string): Promise<Buffer> {
    this.logger.log(`Generating report PDF for festival: ${festivalId}`);

    // Verify access
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      include: {
        ticketCategories: true,
        tickets: {
          include: {
            category: true,
          },
        },
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
    const soldTickets = festival.tickets.filter(
      t => t.status === 'SOLD' || t.status === 'USED',
    );
    const usedTickets = festival.tickets.filter(t => t.status === 'USED');

    const totalRevenue = soldTickets.reduce(
      (sum, t) => sum + Number(t.purchasePrice),
      0,
    );

    // Group by category
    const byCategory = festival.ticketCategories.map(cat => {
      const catTickets = soldTickets.filter(t => t.categoryId === cat.id);
      return {
        name: cat.name,
        sold: catTickets.length,
        revenue: catTickets.reduce((sum, t) => sum + Number(t.purchasePrice), 0),
      };
    });

    // Cashless stats
    const topups = festival.cashlessTransactions.filter(t => t.type === 'TOPUP');
    const payments = festival.cashlessTransactions.filter(t => t.type === 'PAYMENT');

    const totalTopups = topups.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalPayments = payments.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    const analyticsData: AnalyticsPdfData = {
      festivalId: festival.id,
      festivalName: festival.name,
      generatedAt: new Date(),
      period: {
        startDate: festival.startDate,
        endDate: festival.endDate,
      },
      ticketStats: {
        totalSold: soldTickets.length,
        totalRevenue,
        byCategory,
        usageRate: soldTickets.length > 0
          ? (usedTickets.length / soldTickets.length) * 100
          : 0,
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

  /**
   * Create the ticket PDF document
   */
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
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header with festival name
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor('#1a1a2e')
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
        doc
          .strokeColor('#e0e0e0')
          .lineWidth(1)
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .stroke();

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
          doc.fontSize(10).fillColor('#ff0000').text('QR Code generation failed', { align: 'center' });
          doc.moveDown(2);
        }

        // Ticket code
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#1a1a2e')
          .text(data.qrCode, { align: 'center' });

        doc.moveDown(1.5);

        // Event details section
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#333333')
          .text('EVENT DETAILS', 50);

        doc.moveDown(0.5);

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#666666');

        // Location
        doc.text(`Location: ${data.festival.location}`, 50);
        if (data.festival.address) {
          doc.text(`Address: ${data.festival.address}`, 50);
        }

        // Dates
        const startDate = this.formatDate(data.festival.startDate);
        const endDate = this.formatDate(data.festival.endDate);
        doc.text(`Date: ${startDate} - ${endDate}`, 50);

        doc.moveDown(1);

        // Ticket holder section
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#333333')
          .text('TICKET HOLDER', 50);

        doc.moveDown(0.5);

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#666666')
          .text(`Name: ${data.user.firstName} ${data.user.lastName}`, 50)
          .text(`Email: ${data.user.email}`, 50);

        doc.moveDown(1);

        // Purchase info
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#333333')
          .text('PURCHASE INFORMATION', 50);

        doc.moveDown(0.5);

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#666666')
          .text(`Price: ${data.purchasePrice.toFixed(2)} EUR`, 50)
          .text(`Purchased: ${this.formatDateTime(data.createdAt)}`, 50)
          .text(`Status: ${data.status}`, 50);

        doc.moveDown(2);

        // Divider
        doc
          .strokeColor('#e0e0e0')
          .lineWidth(1)
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .stroke();

        doc.moveDown(1);

        // Terms and conditions summary
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
          .text(
            '- Ce billet est personnel et non cessible. Une piece d\'identite peut etre demandee a l\'entree.',
            50,
          )
          .text(
            '- L\'organisateur se reserve le droit de refuser l\'acces en cas de comportement inapproprie.',
            50,
          )
          .text(
            '- En cas d\'annulation de l\'evenement, le remboursement sera effectue selon les conditions en vigueur.',
            50,
          )
          .text(
            '- La reproduction ou falsification de ce billet est interdite et passible de poursuites judiciaires.',
            50,
          );

        if (data.festival.contactEmail) {
          doc.moveDown(0.5);
          doc.text(`Contact: ${data.festival.contactEmail}`, 50);
        }

        if (data.festival.websiteUrl) {
          doc.text(`Website: ${data.festival.websiteUrl}`, 50);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create the invoice PDF document
   */
  private async createInvoicePdfDocument(data: PaymentPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Invoice - ${data.id}`,
            Author: this.companyInfo.name,
            Subject: `Invoice for payment ${data.id}`,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header - Company info
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .fillColor('#1a1a2e')
          .text(this.companyInfo.name, 50, 50);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text(this.companyInfo.address, 50, 75)
          .text(`Tel: ${this.companyInfo.phone}`, 50)
          .text(`Email: ${this.companyInfo.email}`, 50);

        if (this.companyInfo.siret) {
          doc.text(`SIRET: ${this.companyInfo.siret}`, 50);
        }
        if (this.companyInfo.tva) {
          doc.text(`N TVA: ${this.companyInfo.tva}`, 50);
        }

        // Invoice title and number
        doc
          .fontSize(28)
          .font('Helvetica-Bold')
          .fillColor('#1a1a2e')
          .text('FACTURE', 400, 50, { align: 'right' });

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text(`N: ${data.id.substring(0, 8).toUpperCase()}`, 400, 85, { align: 'right' })
          .text(`Date: ${this.formatDate(data.paidAt || data.createdAt)}`, 400, 100, { align: 'right' });

        doc.moveDown(4);

        // Customer info box
        const customerBoxY = 160;
        doc
          .rect(350, customerBoxY, 195, 80)
          .fillAndStroke('#f5f5f5', '#e0e0e0');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#333333')
          .text('FACTURER A:', 360, customerBoxY + 10);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
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
          .fill('#1a1a2e');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text('Description', tableLeft + 10, tableTop + 8)
          .text('Qty', tableLeft + 300, tableTop + 8, { width: 50, align: 'center' })
          .text('Prix Unit.', tableLeft + 350, tableTop + 8, { width: 70, align: 'right' })
          .text('Total', tableLeft + 430, tableTop + 8, { width: 55, align: 'right' });

        // Table rows
        let currentY = tableTop + 25;
        let rowIndex = 0;

        for (const item of data.items) {
          const rowHeight = 30;
          const bgColor = rowIndex % 2 === 0 ? '#ffffff' : '#f9f9f9';

          doc
            .rect(tableLeft, currentY, 495, rowHeight)
            .fillAndStroke(bgColor, '#e0e0e0');

          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#333333')
            .text(item.description, tableLeft + 10, currentY + 10, { width: 280 })
            .text(item.quantity.toString(), tableLeft + 300, currentY + 10, { width: 50, align: 'center' })
            .text(`${item.unitPrice.toFixed(2)} ${data.currency}`, tableLeft + 350, currentY + 10, { width: 70, align: 'right' })
            .text(`${item.total.toFixed(2)} ${data.currency}`, tableLeft + 430, currentY + 10, { width: 55, align: 'right' });

          currentY += rowHeight;
          rowIndex++;
        }

        // Total section
        currentY += 20;

        doc
          .rect(tableLeft + 300, currentY, 195, 40)
          .fillAndStroke('#f0f0f0', '#e0e0e0');

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#1a1a2e')
          .text('TOTAL TTC:', tableLeft + 310, currentY + 14)
          .text(`${data.amount.toFixed(2)} ${data.currency}`, tableLeft + 430, currentY + 14, { width: 55, align: 'right' });

        // Payment info
        currentY += 60;

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#333333')
          .text('INFORMATIONS DE PAIEMENT', tableLeft, currentY);

        doc.moveDown(0.5);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text(`Methode: ${data.provider}`, tableLeft)
          .text(`Statut: ${data.status}`, tableLeft);

        if (data.paidAt) {
          doc.text(`Date de paiement: ${this.formatDateTime(data.paidAt)}`, tableLeft);
        }

        // Footer
        const footerY = doc.page.height - 80;

        doc
          .fontSize(8)
          .fillColor('#999999')
          .text(
            'Cette facture a ete generee automatiquement. Elle fait office de justificatif de paiement.',
            50,
            footerY,
            { align: 'center', width: 495 },
          );

        doc
          .text(
            `${this.companyInfo.name} - ${this.companyInfo.address}`,
            50,
            footerY + 15,
            { align: 'center', width: 495 },
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create the badge PDF document
   */
  private async createBadgePdfDocument(data: StaffBadgePdfData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        // Badge size (ID card format, slightly larger for printing)
        const doc = new PDFDocument({
          size: [340, 520],
          margin: 20,
          info: {
            Title: `Staff Badge - ${data.user.firstName} ${data.user.lastName}`,
            Author: 'Festival Platform',
            Subject: `Staff badge for ${data.festival.name}`,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = 340;

        // Background color based on role
        const roleColor = this.getRoleColor(data.role);
        doc
          .rect(0, 0, pageWidth, 80)
          .fill(roleColor);

        // Festival name
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text(data.festival.name, 20, 25, { width: pageWidth - 40, align: 'center' });

        // Role badge
        doc
          .fontSize(14)
          .text(data.role, 20, 50, { width: pageWidth - 40, align: 'center' });

        // Staff name (large)
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor('#1a1a2e')
          .text(`${data.user.firstName}`, 20, 100, { width: pageWidth - 40, align: 'center' })
          .text(`${data.user.lastName}`, 20, 130, { width: pageWidth - 40, align: 'center' });

        doc.moveDown(1);

        // QR Code for badge verification
        try {
          const badgeData = JSON.stringify({
            assignmentId: data.id,
            staffId: data.user.id,
            festivalId: data.festival.id,
            role: data.role,
          });

          const qrCodeDataUrl = await QRCode.toDataURL(badgeData, {
            errorCorrectionLevel: 'M',
            width: 150,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' },
          });

          const qrCodeBuffer = Buffer.from(
            qrCodeDataUrl.replace(/^data:image\/png;base64,/, ''),
            'base64',
          );

          const qrX = (pageWidth - 150) / 2;
          doc.image(qrCodeBuffer, qrX, 180, { width: 150 });
        } catch (qrError) {
          this.logger.error('Failed to generate QR code for badge', qrError);
        }

        // Zone info
        doc.moveDown(10);
        const zoneY = 350;

        if (data.zone) {
          doc
            .rect(20, zoneY, pageWidth - 40, 40)
            .fillAndStroke('#f0f0f0', '#e0e0e0');

          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#333333')
            .text('ZONE:', 30, zoneY + 8)
            .fontSize(12)
            .text(data.zone.name, 30, zoneY + 22);
        }

        // Schedule info
        const scheduleY = data.zone ? zoneY + 50 : zoneY;

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text('Horaires:', 20, scheduleY + 10)
          .font('Helvetica-Bold')
          .fillColor('#333333')
          .text(
            `${this.formatTime(data.startTime)} - ${this.formatTime(data.endTime)}`,
            20,
            scheduleY + 25,
          );

        // Event dates
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text('Festival:', 20, scheduleY + 50)
          .font('Helvetica-Bold')
          .fillColor('#333333')
          .text(
            `${this.formatDate(data.festival.startDate)} - ${this.formatDate(data.festival.endDate)}`,
            20,
            scheduleY + 65,
          );

        // Location
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#999999')
          .text(data.festival.location, 20, scheduleY + 90, { width: pageWidth - 40, align: 'center' });

        // Footer
        doc
          .fontSize(8)
          .fillColor('#cccccc')
          .text('Ce badge est personnel et non cessible', 20, 490, { width: pageWidth - 40, align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create the analytics report PDF document
   */
  private async createReportPdfDocument(data: AnalyticsPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Analytics Report - ${data.festivalName}`,
            Author: 'Festival Platform',
            Subject: `Analytics report for ${data.festivalName}`,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor('#1a1a2e')
          .text('RAPPORT ANALYTIQUE', { align: 'center' });

        doc.moveDown(0.5);

        doc
          .fontSize(18)
          .font('Helvetica')
          .fillColor('#666666')
          .text(data.festivalName, { align: 'center' });

        doc.moveDown(0.5);

        doc
          .fontSize(10)
          .fillColor('#999999')
          .text(`Genere le: ${this.formatDateTime(data.generatedAt)}`, { align: 'center' })
          .text(
            `Periode: ${this.formatDate(data.period.startDate)} - ${this.formatDate(data.period.endDate)}`,
            { align: 'center' },
          );

        doc.moveDown(2);

        // Ticket Statistics Section
        this.addReportSection(doc, 'STATISTIQUES BILLETTERIE', '#2563eb');

        doc.moveDown(0.5);

        // Summary metrics
        const metricsY = doc.y;
        const metricWidth = 120;

        this.addMetricBox(doc, 'Billets Vendus', data.ticketStats.totalSold.toString(), 50, metricsY, metricWidth);
        this.addMetricBox(doc, 'Chiffre d\'Affaires', `${data.ticketStats.totalRevenue.toFixed(2)} EUR`, 180, metricsY, metricWidth);
        this.addMetricBox(doc, 'Taux d\'Utilisation', `${data.ticketStats.usageRate.toFixed(1)}%`, 310, metricsY, metricWidth);

        doc.moveDown(6);

        // Sales by category table
        if (data.ticketStats.byCategory.length > 0) {
          doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .fillColor('#333333')
            .text('Ventes par categorie', 50);

          doc.moveDown(0.5);

          const tableTop = doc.y;

          // Table header
          doc
            .rect(50, tableTop, 495, 25)
            .fill('#f0f0f0');

          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#333333')
            .text('Categorie', 60, tableTop + 8)
            .text('Vendus', 300, tableTop + 8, { width: 80, align: 'right' })
            .text('Revenus', 400, tableTop + 8, { width: 80, align: 'right' });

          let rowY = tableTop + 25;
          for (const cat of data.ticketStats.byCategory) {
            doc
              .fontSize(10)
              .font('Helvetica')
              .fillColor('#666666')
              .text(cat.name, 60, rowY + 8)
              .text(cat.sold.toString(), 300, rowY + 8, { width: 80, align: 'right' })
              .text(`${cat.revenue.toFixed(2)} EUR`, 400, rowY + 8, { width: 80, align: 'right' });

            rowY += 25;
          }

          doc.y = rowY + 10;
        }

        doc.moveDown(1);

        // Cashless Statistics Section
        if (data.cashlessStats) {
          this.addReportSection(doc, 'STATISTIQUES CASHLESS', '#10b981');

          doc.moveDown(0.5);

          const cashlessY = doc.y;

          this.addMetricBox(doc, 'Transactions', data.cashlessStats.totalTransactions.toString(), 50, cashlessY, metricWidth);
          this.addMetricBox(doc, 'Total Recharges', `${data.cashlessStats.totalTopups.toFixed(2)} EUR`, 180, cashlessY, metricWidth);
          this.addMetricBox(doc, 'Total Depenses', `${data.cashlessStats.totalPayments.toFixed(2)} EUR`, 310, cashlessY, metricWidth);

          doc.moveDown(6);

          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#666666')
            .text(`Transaction moyenne: ${data.cashlessStats.averageTransaction.toFixed(2)} EUR`, 50);
        }

        doc.moveDown(2);

        // Attendance Statistics (if available)
        if (data.attendanceStats) {
          this.addReportSection(doc, 'STATISTIQUES FREQUENTATION', '#f59e0b');

          doc.moveDown(0.5);

          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#666666')
            .text(`Pic de frequentation: ${data.attendanceStats.peak} personnes`, 50)
            .text(`Frequentation moyenne: ${data.attendanceStats.average} personnes`, 50);
        }

        // Footer
        const footerY = doc.page.height - 50;

        doc
          .fontSize(8)
          .fillColor('#999999')
          .text(
            'Ce rapport a ete genere automatiquement par Festival Platform',
            50,
            footerY,
            { align: 'center', width: 495 },
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add a section header to the report
   */
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

  /**
   * Add a metric box to the report
   */
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
      .fillAndStroke('#f9f9f9', '#e0e0e0');

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text(label, x + 10, y + 10, { width: width - 20, align: 'center' });

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text(value, x + 10, y + 30, { width: width - 20, align: 'center' });
  }

  /**
   * Get color for ticket type
   */
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

  /**
   * Get color for staff role
   */
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

  /**
   * Format date
   */
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Format date and time
   */
  private formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Format time only
   */
  private formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
