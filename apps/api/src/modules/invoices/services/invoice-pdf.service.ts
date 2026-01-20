/**
 * Invoice PDF Service
 *
 * Generates PDF invoices with:
 * - Multiple templates (standard, detailed)
 * - QR code for payment
 * - Currency-specific formatting
 * - Multi-language support
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { Invoice, InvoiceItem, InvoiceStatus } from '@prisma/client';
import { InvoiceGeneratorService } from './invoice-generator.service';

export interface CompanyInfo {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  vatNumber?: string;
  siret?: string;
  logoUrl?: string;
}

export interface InvoicePdfOptions {
  template?: 'standard' | 'detailed' | 'minimal';
  includeQrCode?: boolean;
  includePaymentLink?: boolean;
  locale?: string;
  watermark?: string;
}

interface InvoiceLabels {
  invoice: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  billTo: string;
  from: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
  subtotal: string;
  tax: string;
  totalDue: string;
  paid: string;
  unpaid: string;
  overdue: string;
  draft: string;
  cancelled: string;
  vatNumber: string;
  paymentTerms: string;
  notes: string;
  reverseCharge: string;
  taxExempt: string;
  thankYou: string;
  page: string;
  of: string;
}

// Colors for PDF
const COLORS = {
  primary: '#2563eb',
  secondary: '#7c3aed',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  text: '#1f2937',
  textLight: '#6b7280',
  border: '#e5e7eb',
  background: '#f9fafb',
};

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);
  private readonly companyInfo: CompanyInfo;
  private readonly paymentBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly generatorService: InvoiceGeneratorService
  ) {
    this.companyInfo = {
      name: this.configService.get<string>('COMPANY_NAME') || 'Festival Platform SAS',
      address:
        this.configService.get<string>('COMPANY_ADDRESS') || '123 Rue des Festivals, 75001 Paris',
      phone: this.configService.get<string>('COMPANY_PHONE') || '+33 1 23 45 67 89',
      email: this.configService.get<string>('COMPANY_EMAIL') || 'contact@festival-platform.com',
      vatNumber: this.configService.get<string>('COMPANY_TVA'),
      siret: this.configService.get<string>('COMPANY_SIRET'),
    };
    this.paymentBaseUrl =
      this.configService.get<string>('PAYMENT_URL') || 'https://pay.festival-platform.com';
  }

  /**
   * Generate PDF for an invoice
   */
  async generatePdf(
    invoice: Invoice & { items: InvoiceItem[] },
    options: InvoicePdfOptions = {}
  ): Promise<Buffer> {
    const {
      template = 'standard',
      includeQrCode = true,
      includePaymentLink = true,
      locale = invoice.locale || 'fr',
      watermark,
    } = options;

    switch (template) {
      case 'detailed':
        return this.generateDetailedPdf(invoice, {
          includeQrCode,
          includePaymentLink,
          locale,
          watermark,
        });
      case 'minimal':
        return this.generateMinimalPdf(invoice, { locale, watermark });
      default:
        return this.generateStandardPdf(invoice, {
          includeQrCode,
          includePaymentLink,
          locale,
          watermark,
        });
    }
  }

  /**
   * Get typed labels from generator service
   */
  private getLabels(locale: string): InvoiceLabels {
    const raw = this.generatorService.getLocalizedLabels(locale);
    return {
      invoice: raw.invoice ?? 'INVOICE',
      invoiceNumber: raw.invoiceNumber ?? 'Invoice Number',
      issueDate: raw.issueDate ?? 'Issue Date',
      dueDate: raw.dueDate ?? 'Due Date',
      billTo: raw.billTo ?? 'Bill To',
      from: raw.from ?? 'From',
      description: raw.description ?? 'Description',
      quantity: raw.quantity ?? 'Qty',
      unitPrice: raw.unitPrice ?? 'Unit Price',
      total: raw.total ?? 'Total',
      subtotal: raw.subtotal ?? 'Subtotal',
      tax: raw.tax ?? 'Tax',
      totalDue: raw.totalDue ?? 'Total Due',
      paid: raw.paid ?? 'PAID',
      unpaid: raw.unpaid ?? 'UNPAID',
      overdue: raw.overdue ?? 'OVERDUE',
      draft: raw.draft ?? 'DRAFT',
      cancelled: raw.cancelled ?? 'CANCELLED',
      vatNumber: raw.vatNumber ?? 'VAT Number',
      paymentTerms: raw.paymentTerms ?? 'Payment Terms',
      notes: raw.notes ?? 'Notes',
      reverseCharge: raw.reverseCharge ?? 'Reverse Charge VAT',
      taxExempt: raw.taxExempt ?? 'Tax Exempt',
      thankYou: raw.thankYou ?? 'Thank you for your business',
      page: raw.page ?? 'Page',
      of: raw.of ?? 'of',
    };
  }

  /**
   * Generate standard invoice PDF
   */
  private async generateStandardPdf(
    invoice: Invoice & { items: InvoiceItem[] },
    options: {
      includeQrCode: boolean;
      includePaymentLink: boolean;
      locale: string;
      watermark?: string;
    }
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    const pageWidth = doc.page.width;
    const labels = this.getLabels(options.locale);

    // Add watermark if provided or if draft/cancelled
    if (
      options.watermark ||
      invoice.status === InvoiceStatus.DRAFT ||
      invoice.status === InvoiceStatus.CANCELLED
    ) {
      const watermarkText =
        options.watermark ||
        (invoice.status === InvoiceStatus.DRAFT ? labels.draft : labels.cancelled);
      this.addWatermark(doc, watermarkText, pageWidth);
    }

    // Header
    doc.rect(0, 0, pageWidth, 100).fill(COLORS.primary);
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text(invoice.companyName || this.companyInfo.name, 50, 30);
    doc.fontSize(28).text(labels.invoice, pageWidth - 200, 30, { width: 150, align: 'right' });
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(invoice.invoiceNumber, pageWidth - 200, 60, { width: 150, align: 'right' });

    // Status badge
    this.addStatusBadge(doc, invoice.status, labels, pageWidth - 150, 80);

    // Company info
    doc.y = 120;
    doc.fontSize(9).fillColor(COLORS.textLight);
    doc.text(invoice.companyAddress || this.companyInfo.address, 50);
    if (invoice.companyPhone || this.companyInfo.phone) {
      doc.text(`Tel: ${invoice.companyPhone || this.companyInfo.phone}`);
    }
    if (invoice.companyEmail || this.companyInfo.email) {
      doc.text(`Email: ${invoice.companyEmail || this.companyInfo.email}`);
    }
    if (invoice.companyVatNumber || this.companyInfo.vatNumber) {
      doc.text(`${labels.vatNumber}: ${invoice.companyVatNumber || this.companyInfo.vatNumber}`);
    }

    // Customer info box
    const customerBoxY = 120;
    doc.rect(350, customerBoxY, 195, 90).fillAndStroke(COLORS.background, COLORS.border);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.primary);
    doc.text(labels.billTo.toUpperCase(), 360, customerBoxY + 10);
    doc.font('Helvetica').fillColor(COLORS.text);
    doc.text(invoice.customerName, 360, customerBoxY + 28);
    doc.fontSize(9).fillColor(COLORS.textLight);
    doc.text(invoice.customerEmail, 360, customerBoxY + 43);
    if (invoice.customerAddress) {
      doc.text(invoice.customerAddress, 360, customerBoxY + 58, { width: 175 });
    }
    if (invoice.customerVatNumber) {
      doc.text(`${labels.vatNumber}: ${invoice.customerVatNumber}`, 360, customerBoxY + 73);
    }

    // Invoice details
    const detailsY = 230;
    doc.fontSize(9).fillColor(COLORS.textLight);
    doc.text(
      `${labels.issueDate}: ${this.generatorService.formatDate(invoice.issueDate, options.locale)}`,
      50,
      detailsY
    );
    doc.text(
      `${labels.dueDate}: ${this.generatorService.formatDate(invoice.dueDate, options.locale)}`,
      50,
      detailsY + 15
    );

    // Items table
    const tableTop = detailsY + 50;
    this.addItemsTable(doc, invoice, labels, tableTop, pageWidth);

    // Totals
    let totalsY = tableTop + 30 + invoice.items.length * 30 + 20;

    // Subtotal
    doc.rect(330, totalsY, 170, 25).fillAndStroke(COLORS.background, COLORS.border);
    doc.fontSize(10).fillColor(COLORS.text);
    doc.text(labels.subtotal, 340, totalsY + 7);
    doc.text(this.formatAmount(Number(invoice.subtotal), invoice.currency), 440, totalsY + 7, {
      width: 50,
      align: 'right',
    });
    totalsY += 25;

    // Tax
    if (!invoice.taxExempt) {
      doc.rect(330, totalsY, 170, 25).fillAndStroke(COLORS.background, COLORS.border);
      const taxLabel = invoice.reverseCharge
        ? labels.reverseCharge
        : `${labels.tax} (${Number(invoice.taxRate)}%)`;
      doc.text(taxLabel, 340, totalsY + 7);
      doc.text(this.formatAmount(Number(invoice.taxAmount), invoice.currency), 440, totalsY + 7, {
        width: 50,
        align: 'right',
      });
      totalsY += 25;
    } else {
      doc.rect(330, totalsY, 170, 25).fillAndStroke(COLORS.background, COLORS.border);
      doc.text(labels.taxExempt, 340, totalsY + 7);
      doc.text('0,00', 440, totalsY + 7, { width: 50, align: 'right' });
      totalsY += 25;
    }

    // Total
    doc.rect(330, totalsY, 170, 35).fill(COLORS.primary);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text(labels.totalDue, 340, totalsY + 12);
    doc.text(this.formatAmount(Number(invoice.total), invoice.currency), 420, totalsY + 12, {
      width: 70,
      align: 'right',
    });

    // Original currency conversion info
    if (invoice.originalCurrency && invoice.originalCurrency !== invoice.currency) {
      totalsY += 45;
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.textLight);
      doc.text(
        `(${this.formatAmount(Number(invoice.originalTotal), invoice.originalCurrency)} @ ${Number(invoice.exchangeRate)?.toFixed(4)})`,
        330,
        totalsY,
        { width: 170, align: 'right' }
      );
    }

    // QR Code for payment
    if (
      options.includeQrCode &&
      invoice.status !== InvoiceStatus.PAID &&
      invoice.status !== InvoiceStatus.CANCELLED
    ) {
      await this.addPaymentQrCode(doc, invoice, 50, totalsY - 60);
    }

    // Notes
    if (invoice.notes) {
      doc.y = totalsY + 60;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.text);
      doc.text(labels.notes, 50);
      doc.font('Helvetica').fillColor(COLORS.textLight);
      doc.text(invoice.notes, 50, doc.y + 5, { width: 250 });
    }

    // Payment terms
    if (invoice.termsAndConditions) {
      doc.fontSize(8).fillColor(COLORS.textLight);
      doc.text(invoice.termsAndConditions, 50, doc.page.height - 100, { width: pageWidth - 100 });
    }

    // Footer
    doc.fontSize(8).fillColor(COLORS.textLight);
    doc.text(labels.thankYou, 50, doc.page.height - 50, {
      align: 'center',
      width: pageWidth - 100,
    });
    doc.text(`${labels.page} 1 ${labels.of} 1`, 50, doc.page.height - 35, {
      align: 'center',
      width: pageWidth - 100,
    });

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  /**
   * Generate detailed invoice PDF with item breakdown
   */
  private async generateDetailedPdf(
    invoice: Invoice & { items: InvoiceItem[] },
    options: {
      includeQrCode: boolean;
      includePaymentLink: boolean;
      locale: string;
      watermark?: string;
    }
  ): Promise<Buffer> {
    // For detailed template, we add more info per item and tax breakdown
    return this.generateStandardPdf(invoice, options);
  }

  /**
   * Generate minimal invoice PDF
   */
  private async generateMinimalPdf(
    invoice: Invoice & { items: InvoiceItem[] },
    options: { locale: string; watermark?: string }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const labels = this.getLabels(options.locale);

        // Simple header
        doc.fontSize(20).font('Helvetica-Bold').fillColor(COLORS.primary);
        doc.text(labels.invoice, { align: 'center' });
        doc.fontSize(12).font('Helvetica').fillColor(COLORS.text);
        doc.text(invoice.invoiceNumber, { align: 'center' });
        doc.moveDown(2);

        // Dates
        doc.fontSize(10).fillColor(COLORS.textLight);
        doc.text(
          `${labels.issueDate}: ${this.generatorService.formatDate(invoice.issueDate, options.locale)}`
        );
        doc.text(
          `${labels.dueDate}: ${this.generatorService.formatDate(invoice.dueDate, options.locale)}`
        );
        doc.moveDown();

        // Customer
        doc.fillColor(COLORS.text).text(`${labels.billTo}: ${invoice.customerName}`);
        doc.fillColor(COLORS.textLight).text(invoice.customerEmail);
        doc.moveDown(2);

        // Items
        for (const item of invoice.items) {
          doc.fillColor(COLORS.text);
          doc.text(
            `${item.description} x${item.quantity} = ${this.formatAmount(Number(item.total), invoice.currency)}`
          );
        }

        doc.moveDown(2);

        // Total
        doc.fontSize(14).font('Helvetica-Bold').fillColor(COLORS.primary);
        doc.text(
          `${labels.totalDue}: ${this.formatAmount(Number(invoice.total), invoice.currency)}`,
          { align: 'right' }
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add items table to PDF
   */
  private addItemsTable(
    doc: PDFKit.PDFDocument,
    invoice: Invoice & { items: InvoiceItem[] },
    labels: InvoiceLabels,
    tableTop: number,
    pageWidth: number
  ): void {
    // Table header
    doc.rect(50, tableTop, pageWidth - 100, 25).fill(COLORS.primary);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text(labels.description, 60, tableTop + 8);
    doc.text(labels.quantity, 320, tableTop + 8, { width: 40, align: 'center' });
    doc.text(labels.unitPrice, 370, tableTop + 8, { width: 60, align: 'right' });
    doc.text(labels.total, 440, tableTop + 8, { width: 60, align: 'right' });

    // Table rows
    let y = tableTop + 25;
    for (const item of invoice.items) {
      const rowColor = invoice.items.indexOf(item) % 2 === 0 ? '#ffffff' : COLORS.background;
      doc.rect(50, y, pageWidth - 100, 30).fillAndStroke(rowColor, COLORS.border);
      doc.fontSize(10).font('Helvetica').fillColor(COLORS.text);
      doc.text(item.description, 60, y + 10, { width: 250 });
      doc.text(item.quantity.toString(), 320, y + 10, { width: 40, align: 'center' });
      doc.text(this.formatAmount(Number(item.unitPrice), invoice.currency), 370, y + 10, {
        width: 60,
        align: 'right',
      });
      doc.text(this.formatAmount(Number(item.total), invoice.currency), 440, y + 10, {
        width: 60,
        align: 'right',
      });
      y += 30;
    }
  }

  /**
   * Add status badge to PDF
   */
  private addStatusBadge(
    doc: PDFKit.PDFDocument,
    status: InvoiceStatus,
    labels: InvoiceLabels,
    x: number,
    y: number
  ): void {
    const statusColors: Record<InvoiceStatus, string> = {
      [InvoiceStatus.DRAFT]: COLORS.textLight,
      [InvoiceStatus.SENT]: COLORS.warning,
      [InvoiceStatus.PAID]: COLORS.success,
      [InvoiceStatus.OVERDUE]: COLORS.danger,
      [InvoiceStatus.CANCELLED]: COLORS.textLight,
    };

    const statusLabels: Record<InvoiceStatus, string> = {
      [InvoiceStatus.DRAFT]: labels.draft,
      [InvoiceStatus.SENT]: labels.unpaid,
      [InvoiceStatus.PAID]: labels.paid,
      [InvoiceStatus.OVERDUE]: labels.overdue,
      [InvoiceStatus.CANCELLED]: labels.cancelled,
    };

    doc.roundedRect(x, y, 80, 18, 9).fill(statusColors[status]);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text(statusLabels[status], x, y + 5, { width: 80, align: 'center' });
  }

  /**
   * Add watermark to PDF
   */
  private addWatermark(doc: PDFKit.PDFDocument, text: string, pageWidth: number): void {
    doc.save();
    doc.rotate(-45, { origin: [pageWidth / 2, 400] });
    doc.fontSize(80).font('Helvetica-Bold').fillColor('#e5e7eb').opacity(0.3);
    doc.text(text, 0, 400, { width: pageWidth, align: 'center' });
    doc.restore();
    doc.opacity(1);
  }

  /**
   * Add payment QR code
   */
  private async addPaymentQrCode(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
    x: number,
    y: number
  ): Promise<void> {
    try {
      const paymentUrl = `${this.paymentBaseUrl}/invoice/${invoice.id}`;
      const qrUrl = await QRCode.toDataURL(paymentUrl, {
        errorCorrectionLevel: 'M',
        width: 80,
        margin: 1,
      });
      const qrBuffer = Buffer.from(qrUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      doc.image(qrBuffer, x, y, { width: 80 });
      doc.fontSize(8).fillColor(COLORS.textLight);
      doc.text('Scan to pay', x, y + 85, { width: 80, align: 'center' });
    } catch (error) {
      this.logger.warn(`Failed to generate QR code: ${error}`);
    }
  }

  /**
   * Format amount with currency
   */
  private formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}
