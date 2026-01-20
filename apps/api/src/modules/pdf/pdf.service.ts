import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { FinancialReportPdfData, CompanyInfo, DEFAULT_PDF_COLORS, PdfColors } from './interfaces';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly companyInfo: CompanyInfo;
  private readonly colors: PdfColors = DEFAULT_PDF_COLORS;
  private readonly qrSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.companyInfo = {
      name: this.configService.get<string>('COMPANY_NAME') || 'Festival Platform SAS',
      address:
        this.configService.get<string>('COMPANY_ADDRESS') || '123 Rue des Festivals, 75001 Paris',
      phone: this.configService.get<string>('COMPANY_PHONE') || '+33 1 23 45 67 89',
      email: this.configService.get<string>('COMPANY_EMAIL') || 'contact@festival-platform.com',
      siret: this.configService.get<string>('COMPANY_SIRET'),
      tva: this.configService.get<string>('COMPANY_TVA'),
    };
    this.qrSecret = this.configService.get<string>('QR_SECRET') || 'secret';
  }

  async generateTicketPdf(ticketId: string, _userId: string): Promise<Buffer> {
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
      throw new NotFoundException('Ticket not found');
    }
    return this.createTicketPdf(ticket);
  }

  private async createTicketPdf(ticket: any): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const pageWidth = doc.page.width;
    doc.rect(0, 0, pageWidth, 120).fill(this.colors.primary);
    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text(ticket.festival.name.toUpperCase(), 40, 35, { width: pageWidth - 80, align: 'center' });

    const hash = crypto
      .createHmac('sha256', this.qrSecret)
      .update(ticket.id)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();
    try {
      const qrData = JSON.stringify({ id: ticket.id, code: ticket.qrCode, hash, v: 2 });
      const qrUrl = await QRCode.toDataURL(qrData, { errorCorrectionLevel: 'H', width: 200 });
      const qrBuffer = Buffer.from(qrUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      doc.image(qrBuffer, (pageWidth - 200) / 2, 150, { width: 200 });
    } catch {
      /* QR generation failed, continue without QR code */
    }

    doc.y = 380;
    doc.fontSize(18).fillColor(this.colors.primary).text(ticket.qrCode, { align: 'center' });
    doc
      .fontSize(9)
      .fillColor(this.colors.textLight)
      .text('Hash: ' + hash, { align: 'center' });
    doc.moveDown(2);
    doc
      .fontSize(11)
      .fillColor(this.colors.text)
      .text('Lieu: ' + ticket.festival.location, 60);
    doc.text(
      'Date: ' +
        this.formatDate(ticket.festival.startDate) +
        ' - ' +
        this.formatDate(ticket.festival.endDate),
      60
    );
    doc.text('Titulaire: ' + ticket.user.firstName + ' ' + ticket.user.lastName, 60);
    doc.text('Email: ' + ticket.user.email, 60);
    doc.text('Prix: ' + Number(ticket.purchasePrice).toFixed(2) + ' EUR', 60);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  async generateInvoicePdf(paymentId: string, _userId: string): Promise<Buffer> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true, tickets: { include: { category: true, festival: true } } },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return this.createInvoicePdf(payment);
  }

  private async createInvoicePdf(payment: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        const invoiceNum =
          'FAC-' + new Date().getFullYear() + '-' + payment.id.substring(0, 8).toUpperCase();

        doc.rect(0, 0, pageWidth, 100).fill(this.colors.primary);
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text(this.companyInfo.name, 50, 30);
        doc.fontSize(28).text('FACTURE', pageWidth - 200, 30, { width: 150, align: 'right' });
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(invoiceNum, pageWidth - 200, 60, { width: 150, align: 'right' });

        doc.y = 120;
        doc.fontSize(9).fillColor(this.colors.textLight).text(this.companyInfo.address, 50);
        doc.text('Tel: ' + this.companyInfo.phone);
        doc.text('Email: ' + this.companyInfo.email);
        if (this.companyInfo.siret) {
          doc.text('SIRET: ' + this.companyInfo.siret);
        }
        if (this.companyInfo.tva) {
          doc.text('TVA: ' + this.companyInfo.tva);
        }

        doc.rect(350, 120, 195, 70).fillAndStroke('#f8f8f8', this.colors.border);
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text('FACTURER A', 360, 130);
        doc
          .font('Helvetica')
          .fillColor(this.colors.text)
          .text(payment.user.firstName + ' ' + payment.user.lastName, 360, 148);
        doc.fillColor(this.colors.textLight).text(payment.user.email, 360, 163);

        const tableTop = 220;
        doc.rect(50, tableTop, pageWidth - 100, 25).fill(this.colors.primary);
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text('Description', 60, tableTop + 8);
        doc.text('Qte', 320, tableTop + 8, { width: 40, align: 'center' });
        doc.text('P.U. HT', 370, tableTop + 8, { width: 60, align: 'right' });
        doc.text('Total TTC', 440, tableTop + 8, { width: 60, align: 'right' });

        let y = tableTop + 25;
        const itemsMap = new Map<string, { desc: string; qty: number; price: number }>();
        for (const t of payment.tickets) {
          const key = t.festival.name + ' - ' + t.category.name;
          const ex = itemsMap.get(key);
          if (ex) {
            ex.qty++;
          } else {
            itemsMap.set(key, { desc: key, qty: 1, price: Number(t.purchasePrice) });
          }
        }

        for (const item of itemsMap.values()) {
          doc.rect(50, y, pageWidth - 100, 30).fillAndStroke('#f9f9f9', this.colors.border);
          doc.fontSize(10).font('Helvetica').fillColor(this.colors.text);
          doc.text(item.desc, 60, y + 10, { width: 250 });
          doc.text(item.qty.toString(), 320, y + 10, { width: 40, align: 'center' });
          doc.text((item.price / 1.2).toFixed(2), 370, y + 10, { width: 60, align: 'right' });
          doc.text((item.qty * item.price).toFixed(2), 440, y + 10, { width: 60, align: 'right' });
          y += 30;
        }

        const total = Number(payment.amount);
        const ht = total / 1.2;
        const tva = total - ht;

        y += 15;
        doc.rect(330, y, 170, 25).fillAndStroke('#f5f5f5', this.colors.border);
        doc
          .fontSize(10)
          .fillColor(this.colors.text)
          .text('Sous-total HT:', 340, y + 7);
        doc.text(ht.toFixed(2) + ' ' + payment.currency, 440, y + 7, { width: 50, align: 'right' });
        y += 25;
        doc.rect(330, y, 170, 25).fillAndStroke('#f5f5f5', this.colors.border);
        doc.text('TVA (20%):', 340, y + 7);
        doc.text(tva.toFixed(2) + ' ' + payment.currency, 440, y + 7, {
          width: 50,
          align: 'right',
        });
        y += 25;
        doc.rect(330, y, 170, 35).fill(this.colors.primary);
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text('TOTAL TTC:', 340, y + 12);
        doc.text(total.toFixed(2) + ' ' + payment.currency, 420, y + 12, {
          width: 70,
          align: 'right',
        });

        doc
          .fontSize(8)
          .fillColor('#999999')
          .text('Facture generee automatiquement.', 50, doc.page.height - 50, {
            align: 'center',
            width: pageWidth - 100,
          });
        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  async generateBadgePdf(
    assignmentId: string,
    userId: string,
    photoBuffer?: Buffer
  ): Promise<Buffer> {
    const assignment = await this.prisma.staffAssignment.findUnique({
      where: { id: assignmentId },
      include: { user: true, festival: true, zone: true },
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    return this.createBadgePdf(assignment, photoBuffer);
  }

  private async createBadgePdf(assignment: any, photoBuffer?: Buffer): Promise<Buffer> {
    const doc = new PDFDocument({ size: [340, 540], margin: 0 });
    const pageWidth = 340;
    const roleColors: Record<string, string> = {
      ADMIN: '#dc2626',
      ORGANIZER: '#7c3aed',
      STAFF: '#2563eb',
      CASHIER: '#059669',
      SECURITY: '#d97706',
    };
    const roleColor = roleColors[assignment.role] || '#2563eb';
    const accessLevels: Record<string, string> = {
      ADMIN: 'FULL',
      ORGANIZER: 'FULL',
      SECURITY: 'HIGH',
      CASHIER: 'MEDIUM',
      STAFF: 'LOW',
    };
    const accessLevel = accessLevels[assignment.role] || 'LOW';
    const accessColors: Record<string, string> = {
      LOW: '#6b7280',
      MEDIUM: '#3b82f6',
      HIGH: '#f59e0b',
      FULL: '#dc2626',
    };

    doc.rect(0, 0, pageWidth, 90).fill(roleColor);
    doc.rect(0, 90, pageWidth, 8).fill(accessColors[accessLevel]);
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text(assignment.festival.name.toUpperCase(), 15, 15, {
        width: pageWidth - 30,
        align: 'center',
      });
    const roleNames: Record<string, string> = {
      ADMIN: 'ADMINISTRATEUR',
      ORGANIZER: 'ORGANISATEUR',
      STAFF: 'STAFF',
      CASHIER: 'CAISSIER',
      SECURITY: 'SECURITE',
    };
    doc
      .fontSize(20)
      .text(roleNames[assignment.role] || assignment.role, 15, 40, {
        width: pageWidth - 30,
        align: 'center',
      });
    doc
      .fontSize(9)
      .font('Helvetica')
      .text('STAFF-' + assignment.id.substring(0, 6).toUpperCase(), 15, 70, {
        width: pageWidth - 30,
        align: 'center',
      });

    const photoY = 115,
      photoSize = 100,
      photoX = (pageWidth - photoSize) / 2;
    if (photoBuffer) {
      doc.save();
      doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2).clip();
      doc.image(photoBuffer, photoX, photoY, { width: photoSize, height: photoSize });
      doc.restore();
      doc
        .circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2 + 2)
        .lineWidth(3)
        .stroke(roleColor);
    } else {
      doc
        .circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2)
        .fillAndStroke('#e0e0e0', this.colors.border);
      doc
        .fontSize(11)
        .fillColor(this.colors.textLight)
        .text('PHOTO', photoX, photoY + photoSize / 2 - 5, { width: photoSize, align: 'center' });
    }

    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text(assignment.user.firstName.toUpperCase(), 15, photoY + photoSize + 20, {
        width: pageWidth - 30,
        align: 'center',
      });
    doc
      .fontSize(20)
      .text(assignment.user.lastName.toUpperCase(), 15, doc.y, {
        width: pageWidth - 30,
        align: 'center',
      });

    if (assignment.zone) {
      const infoBoxY = doc.y + 15;
      doc
        .roundedRect(20, infoBoxY, pageWidth - 40, 40, 5)
        .fillAndStroke('#f5f5f5', this.colors.border);
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor(this.colors.textLight)
        .text('ZONE ASSIGNEE', 30, infoBoxY + 8);
      doc
        .fontSize(12)
        .fillColor(this.colors.text)
        .text(assignment.zone.name, 30, infoBoxY + 22);
      doc.y = infoBoxY + 50;
    }

    try {
      const qrData = JSON.stringify({
        type: 'STAFF',
        id: assignment.id,
        staff: assignment.userId,
        role: assignment.role,
        level: accessLevel,
      });
      const qrUrl = await QRCode.toDataURL(qrData, { errorCorrectionLevel: 'M', width: 100 });
      const qrBuffer = Buffer.from(qrUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      doc.image(qrBuffer, (pageWidth - 100) / 2, doc.y + 10, { width: 100 });
      doc.y += 120;
    } catch {
      /* QR generation failed, continue without QR code */
    }

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(this.colors.textLight)
      .text(
        'Valide: ' +
          this.formatDate(assignment.startTime) +
          ' - ' +
          this.formatDate(assignment.endTime),
        15,
        doc.y,
        { width: pageWidth - 30, align: 'center' }
      );
    const levelBadgeX = (pageWidth - 120) / 2;
    doc.roundedRect(levelBadgeX, doc.y + 10, 120, 22, 11).fill(accessColors[accessLevel]);
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('ACCES ' + accessLevel, levelBadgeX, doc.y + 16, { width: 120, align: 'center' });
    doc
      .fontSize(6)
      .fillColor('#aaaaaa')
      .text('Badge personnel et non cessible', 15, 515, { width: pageWidth - 30, align: 'center' });

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  async generateProgramPdf(festivalId: string): Promise<Buffer> {
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
      throw new NotFoundException('Festival not found');
    }
    return this.createProgramPdf(festival);
  }

  private async createProgramPdf(festival: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        doc.rect(0, 0, pageWidth, 350).fill(this.colors.primary);
        doc.circle(pageWidth - 100, 80, 150).fill(this.colors.accent);
        doc.circle(100, 300, 120).fill(this.colors.secondary);
        doc
          .fontSize(48)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text(festival.name.toUpperCase(), 40, 100, { width: pageWidth - 80, align: 'center' });
        doc
          .fontSize(24)
          .font('Helvetica')
          .text('PROGRAMME OFFICIEL', 40, 180, { width: pageWidth - 80, align: 'center' });
        doc
          .fontSize(16)
          .text(
            this.formatDate(festival.startDate) + ' - ' + this.formatDate(festival.endDate),
            40,
            230,
            { width: pageWidth - 80, align: 'center' }
          );
        doc
          .fontSize(14)
          .fillColor('#cccccc')
          .text(festival.location, 40, 260, { width: pageWidth - 80, align: 'center' });
        if (festival.description) {
          doc
            .fontSize(11)
            .fillColor(this.colors.textLight)
            .text(festival.description, 60, 400, { width: pageWidth - 120, align: 'center' });
        }

        const stageColors = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#d97706'];
        const performancesByDay = new Map<
          string,
          { stage: string; color: string; perfs: any[] }[]
        >();

        for (let i = 0; i < festival.stages.length; i++) {
          const stage = festival.stages[i];
          const color = stageColors[i % stageColors.length];
          for (const perf of stage.performances) {
            const dayKey = this.formatDate(perf.startTime);
            if (!performancesByDay.has(dayKey)) {
              performancesByDay.set(dayKey, []);
            }
            const dayPerfs = performancesByDay.get(dayKey)!;
            let stageEntry = dayPerfs.find((s) => s.stage === stage.name);
            if (!stageEntry) {
              stageEntry = { stage: stage.name, color, perfs: [] };
              dayPerfs.push(stageEntry);
            }
            stageEntry.perfs.push(perf);
          }
        }

        for (const [day, stages] of performancesByDay) {
          doc.addPage();
          doc.rect(0, 0, pageWidth, 80).fill(this.colors.primary);
          doc.fontSize(32).font('Helvetica-Bold').fillColor('#ffffff').text(day, 40, 25);
          doc.fontSize(12).font('Helvetica').text(festival.name, 40, 55);
          doc.y = 100;

          for (const stageData of stages) {
            doc.rect(40, doc.y, pageWidth - 80, 35).fill(stageData.color);
            doc
              .fontSize(14)
              .font('Helvetica-Bold')
              .fillColor('#ffffff')
              .text(stageData.stage.toUpperCase(), 55, doc.y - 25);
            doc.y += 10;

            for (const perf of stageData.perfs) {
              const perfY = doc.y;
              doc
                .fontSize(10)
                .font('Helvetica-Bold')
                .fillColor(stageData.color)
                .text(
                  this.formatTime(perf.startTime) + ' - ' + this.formatTime(perf.endTime),
                  50,
                  perfY,
                  { width: 90 }
                );
              doc
                .fontSize(12)
                .fillColor(this.colors.text)
                .text(perf.artist.name, 150, perfY, { width: 250 });
              if (perf.artist.genre) {
                doc
                  .fontSize(9)
                  .font('Helvetica')
                  .fillColor(this.colors.textLight)
                  .text(perf.artist.genre, 150, perfY + 15, { width: 250 });
              }
              doc.y = perfY + (perf.artist.genre ? 35 : 25);
              if (doc.y > doc.page.height - 100) {
                doc.addPage();
                doc.y = 50;
              }
            }
            doc.moveDown();
          }
        }

        doc.addPage();
        doc.rect(0, doc.page.height - 200, pageWidth, 200).fill(this.colors.primary);
        doc
          .fontSize(14)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text('Programme genere le ' + this.formatDateTime(new Date()), 40, 300, {
            width: pageWidth - 80,
            align: 'center',
          });
        doc.moveDown(2);
        doc
          .fontSize(11)
          .text('Les horaires sont susceptibles de changer.', {
            align: 'center',
            width: pageWidth - 80,
          });
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text(festival.name, 40, doc.page.height - 120, {
            width: pageWidth - 80,
            align: 'center',
          });
        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  async generateFinancialReportPdf(festivalId: string, userId: string): Promise<Buffer> {
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      include: {
        ticketCategories: true,
        tickets: { include: { category: true } },
        cashlessTransactions: true,
        vendorOrders: { include: { vendor: true } },
        campingBookings: { include: { spot: { include: { zone: true } } } },
      },
    });
    if (!festival) {
      throw new NotFoundException('Festival not found');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, firstName: true, lastName: true },
    });
    if (user?.role !== 'ADMIN' && festival.organizerId !== userId) {
      throw new NotFoundException('Festival not found');
    }

    const soldTickets = festival.tickets.filter((t) => t.status === 'SOLD' || t.status === 'USED');
    const ticketRevenue = soldTickets.reduce((sum, t) => sum + Number(t.purchasePrice), 0);
    const topups = festival.cashlessTransactions.filter((t) => t.type === 'TOPUP');
    const payments = festival.cashlessTransactions.filter((t) => t.type === 'PAYMENT');
    const totalTopups = topups.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalPayments = payments.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const cashlessCommission = totalPayments * 0.02;
    const vendorSales = festival.vendorOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const vendorCommission = vendorSales * 0.1;
    const campingRevenue = festival.campingBookings
      .filter((b) => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
      .reduce((sum, b) => sum + Number(b.totalPrice), 0);
    const totalRevenue = ticketRevenue + cashlessCommission + vendorCommission + campingRevenue;
    const refundedTickets = festival.tickets.filter((t) => t.status === 'REFUNDED');
    const refundAmount = refundedTickets.reduce((sum, t) => sum + Number(t.purchasePrice), 0);

    return this.createFinancialReportPdf({
      festivalId: festival.id,
      festivalName: festival.name,
      generatedAt: new Date(),
      generatedBy: user?.firstName + ' ' + user?.lastName,
      period: { startDate: festival.startDate, endDate: festival.endDate },
      summary: {
        totalRevenue,
        totalExpenses: 0,
        netProfit: totalRevenue,
        profitMargin: 100,
        currency: 'EUR',
      },
      revenueBreakdown: {
        ticketSales: {
          total: ticketRevenue,
          byCategory: festival.ticketCategories.map((c) => ({
            name: c.name,
            quantity: soldTickets.filter((t) => t.categoryId === c.id).length,
            revenue: soldTickets
              .filter((t) => t.categoryId === c.id)
              .reduce((s, t) => s + Number(t.purchasePrice), 0),
            avgPrice: 0,
          })),
        },
        cashless: {
          totalTopups,
          totalPayments,
          commission: cashlessCommission,
          netRevenue: cashlessCommission,
        },
        vendors: { totalSales: vendorSales, commission: vendorCommission, byVendor: [] },
        camping: {
          totalBookings: festival.campingBookings.length,
          revenue: campingRevenue,
          byType: [],
        },
      },
      taxSummary: {
        totalTaxCollected: totalRevenue - totalRevenue / 1.2,
        byRate: [
          {
            rate: 20,
            taxableBase: totalRevenue / 1.2,
            taxAmount: totalRevenue - totalRevenue / 1.2,
          },
        ],
      },
      paymentMethods: [
        { method: 'STRIPE', count: soldTickets.length, total: ticketRevenue, percentage: 100 },
      ],
      refunds: {
        count: refundedTickets.length,
        totalAmount: refundAmount,
        byReason: [{ reason: 'Annulation', count: refundedTickets.length, amount: refundAmount }],
      },
    });
  }

  private async createFinancialReportPdf(data: FinancialReportPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        doc.rect(0, 0, pageWidth, 150).fill(this.colors.primary);
        doc
          .fontSize(28)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text('RAPPORT FINANCIER', 40, 40);
        doc.fontSize(20).font('Helvetica').text(data.festivalName, 40, 80);
        doc
          .fontSize(12)
          .text(
            'Periode: ' +
              this.formatDate(data.period.startDate) +
              ' - ' +
              this.formatDate(data.period.endDate),
            40,
            115
          );

        doc.y = 180;
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text('Genere le: ' + this.formatDateTime(data.generatedAt));
        doc.text('Par: ' + data.generatedBy);
        doc.moveDown(2);

        const boxWidth = (pageWidth - 100) / 3;
        const summaryY = doc.y;
        this.addMetricBox(
          doc,
          "Chiffre d'Affaires",
          data.summary.totalRevenue.toFixed(2) + ' EUR',
          40,
          summaryY,
          boxWidth,
          this.colors.success
        );
        this.addMetricBox(
          doc,
          'Benefice Net',
          data.summary.netProfit.toFixed(2) + ' EUR',
          40 + boxWidth + 10,
          summaryY,
          boxWidth,
          this.colors.primary
        );
        this.addMetricBox(
          doc,
          'Marge',
          data.summary.profitMargin.toFixed(1) + '%',
          40 + (boxWidth + 10) * 2,
          summaryY,
          boxWidth,
          this.colors.accent
        );
        doc.y = summaryY + 90;

        doc.rect(40, doc.y, pageWidth - 80, 30).fill(this.colors.accent);
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text('REPARTITION REVENUS', 55, doc.y - 22);
        doc.moveDown();

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor(this.colors.text)
          .text('Billetterie: ' + data.revenueBreakdown.ticketSales.total.toFixed(2) + ' EUR', 50);
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(
            'Cashless: Recharges ' +
              data.revenueBreakdown.cashless.totalTopups.toFixed(2) +
              ' EUR | Paiements ' +
              data.revenueBreakdown.cashless.totalPayments.toFixed(2) +
              ' EUR',
            50
          );
        doc.text(
          'Vendors: Ventes ' +
            data.revenueBreakdown.vendors.totalSales.toFixed(2) +
            ' EUR | Commission ' +
            data.revenueBreakdown.vendors.commission.toFixed(2) +
            ' EUR',
          50
        );
        doc.text('Camping: ' + data.revenueBreakdown.camping.revenue.toFixed(2) + ' EUR', 50);
        doc.moveDown(2);

        doc.rect(40, doc.y, pageWidth - 80, 30).fill('#059669');
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text('RESUME TVA', 55, doc.y - 22);
        doc.moveDown();
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.text)
          .text(
            'Total TVA collectee: ' + data.taxSummary.totalTaxCollected.toFixed(2) + ' EUR',
            50
          );
        doc.moveDown(2);

        doc.rect(40, doc.y, pageWidth - 80, 30).fill('#dc2626');
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text('REMBOURSEMENTS', 55, doc.y - 22);
        doc.moveDown();
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.text)
          .text(
            data.refunds.count +
              ' remboursements pour ' +
              data.refunds.totalAmount.toFixed(2) +
              ' EUR',
            50
          );

        doc
          .fontSize(8)
          .fillColor('#999999')
          .text('Rapport genere automatiquement.', 40, doc.page.height - 50, {
            align: 'center',
            width: pageWidth - 80,
          });
        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  private addMetricBox(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    x: number,
    y: number,
    width: number,
    color: string
  ): void {
    doc.roundedRect(x, y, width, 70, 5).fillAndStroke('#f8f8f8', this.colors.border);
    doc.rect(x, y, width, 5).fill(color);
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.colors.textLight)
      .text(label, x + 15, y + 20, { width: width - 30, align: 'center' });
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(color)
      .text(value, x + 10, y + 40, { width: width - 20, align: 'center' });
  }

  async generateReceiptPdf(paymentId: string, _userId: string): Promise<Buffer> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true, tickets: { include: { category: true, festival: true } } },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return this.createReceiptPdf(payment);
  }

  private async createReceiptPdf(payment: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: [300, 500], margin: 20 });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text(this.companyInfo.name, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).text('RECU DE PAIEMENT', { align: 'center' });
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(this.colors.text)
          .text('N: REC-' + payment.id.substring(0, 8).toUpperCase(), { align: 'center' });
        doc.text('Date: ' + this.formatDateTime(payment.paidAt || payment.createdAt), {
          align: 'center',
        });
        doc.moveDown();

        for (const t of payment.tickets) {
          doc.text(
            t.festival.name +
              ' - ' +
              t.category.name +
              ': ' +
              Number(t.purchasePrice).toFixed(2) +
              ' ' +
              payment.currency
          );
        }
        doc.moveDown();
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('TOTAL: ' + Number(payment.amount).toFixed(2) + ' ' + payment.currency, {
            align: 'center',
          });
        doc.moveDown(2);
        doc.fontSize(10).text('Merci pour votre achat!', { align: 'center' });
        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  async generateCampingVoucherPdf(bookingId: string, _userId: string): Promise<Buffer> {
    const booking = await this.prisma.campingBooking.findUnique({
      where: { id: bookingId },
      include: { user: true, spot: { include: { zone: { include: { festival: true } } } } },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return this.createCampingVoucherPdf(booking);
  }

  private async createCampingVoucherPdf(booking: any): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

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
      .text(booking.spot.zone.festival.name, { align: 'center' });
    doc
      .fontSize(12)
      .fillColor(this.colors.textLight)
      .text('CAMP-' + booking.id.substring(0, 8).toUpperCase(), { align: 'center' });
    doc.moveDown(2);

    try {
      const qrData = JSON.stringify({ type: 'CAMPING', bookingId: booking.id });
      const qrUrl = await QRCode.toDataURL(qrData, { errorCorrectionLevel: 'H', width: 150 });
      const qrBuffer = Buffer.from(qrUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      doc.image(qrBuffer, (doc.page.width - 150) / 2, doc.y, { width: 150 });
      doc.y += 170;
    } catch {
      /* QR generation failed, continue without QR code */
    }

    doc.fontSize(11).font('Helvetica-Bold').fillColor(this.colors.text).text('TITULAIRE', 50);
    doc
      .font('Helvetica')
      .text(booking.user.firstName + ' ' + booking.user.lastName, 50)
      .text(booking.user.email, 50);
    doc.moveDown();
    doc.font('Helvetica-Bold').text('DATES', 50);
    doc
      .font('Helvetica')
      .text('Arrivee: ' + this.formatDateTime(booking.checkIn), 50)
      .text('Depart: ' + this.formatDateTime(booking.checkOut), 50);
    doc.moveDown();
    doc.font('Helvetica-Bold').text('EMPLACEMENT', 50);
    doc
      .font('Helvetica')
      .text('Type: ' + booking.spot.zone.type, 50)
      .text('Nom: ' + booking.spot.zone.name + ' - ' + booking.spot.number, 50);
    doc.moveDown(2);
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text('TOTAL: ' + Number(booking.totalPrice).toFixed(2) + ' EUR', { align: 'center' });

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  async generateRefundConfirmationPdf(paymentId: string, _userId: string): Promise<Buffer> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true, tickets: { include: { category: true, festival: true } } },
    });
    if (payment?.status !== 'REFUNDED') {
      throw new NotFoundException('Payment not found or not refunded');
    }
    return this.createRefundConfirmationPdf(payment);
  }

  private async createRefundConfirmationPdf(payment: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text(this.companyInfo.name, 50, 50);
        doc.fontSize(24).text('CONFIRMATION DE REMBOURSEMENT', 50, 100);
        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor(this.colors.text)
          .text('Reference: RMB-' + payment.id.substring(0, 8).toUpperCase(), 50, 130);
        doc.text('Date: ' + this.formatDateTime(payment.refundedAt || new Date()), 50, 145);
        doc.moveDown(2);

        doc.rect(50, doc.y, 150, 30).fill(this.colors.success);
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text('REMBOURSE', 55, doc.y - 22);
        doc.moveDown(2);

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(this.colors.text)
          .text('BENEFICIAIRE:', 50);
        doc
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(payment.user.firstName + ' ' + payment.user.lastName)
          .text(payment.user.email);
        doc.moveDown();

        for (const t of payment.tickets.filter((t: any) => t.status === 'REFUNDED')) {
          doc.text(
            t.festival.name +
              ' - ' +
              t.category.name +
              ': ' +
              Number(t.purchasePrice).toFixed(2) +
              ' ' +
              payment.currency
          );
        }
        doc.moveDown(2);
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text('TOTAL REMBOURSE: ' + Number(payment.amount).toFixed(2) + ' ' + payment.currency, {
            align: 'center',
          });
        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  async generateReportPdf(festivalId: string, userId: string): Promise<Buffer> {
    return this.generateFinancialReportPdf(festivalId, userId);
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
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
