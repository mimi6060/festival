/**
 * Invoice Email Service
 *
 * Handles email notifications for invoices:
 * - Send invoice to customer
 * - Payment reminders for overdue invoices
 * - Receipt emails on payment
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../email/email.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceGeneratorService } from './invoice-generator.service';
import { Invoice, InvoiceItem } from '@prisma/client';

export interface SendInvoiceEmailOptions {
  includePaymentLink?: boolean;
  customSubject?: string;
  customMessage?: string;
  cc?: string[];
  bcc?: string[];
}

export interface ReminderEmailOptions {
  reminderNumber?: number;
  customMessage?: string;
  urgencyLevel?: 'gentle' | 'standard' | 'urgent';
}

@Injectable()
export class InvoiceEmailService {
  private readonly logger = new Logger(InvoiceEmailService.name);
  private readonly paymentBaseUrl: string;
  private readonly companyName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly pdfService: InvoicePdfService,
    private readonly generatorService: InvoiceGeneratorService,
  ) {
    this.paymentBaseUrl = this.configService.get<string>('PAYMENT_URL') || 'https://pay.festival-platform.com';
    this.companyName = this.configService.get<string>('COMPANY_NAME') || 'Festival Platform';
  }

  /**
   * Send invoice email to customer
   */
  async sendInvoiceEmail(
    invoice: Invoice & { items: InvoiceItem[] },
    options: SendInvoiceEmailOptions = {},
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { includePaymentLink = true, customSubject, customMessage, cc, bcc } = options;

    try {
      // Generate PDF
      const pdfBuffer = await this.pdfService.generatePdf(invoice, {
        includeQrCode: includePaymentLink,
        includePaymentLink,
        locale: invoice.locale || 'fr',
      });

      // Build email context
      const labels = this.generatorService.getLocalizedLabels(invoice.locale || 'fr');
      const paymentUrl = `${this.paymentBaseUrl}/invoice/${invoice.id}`;

      const subject = customSubject ||
        this.getSubjectByLocale(invoice.locale || 'fr', 'invoice', { invoiceNumber: invoice.invoiceNumber });

      const context = {
        customerName: invoice.customerName,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: this.generatorService.formatDate(invoice.issueDate, invoice.locale || 'fr'),
        dueDate: this.generatorService.formatDate(invoice.dueDate, invoice.locale || 'fr'),
        total: this.formatAmount(Number(invoice.total), invoice.currency),
        currency: invoice.currency,
        paymentUrl,
        includePaymentLink,
        customMessage,
        companyName: invoice.companyName || this.companyName,
        items: invoice.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: this.formatAmount(Number(item.unitPrice), invoice.currency),
          total: this.formatAmount(Number(item.total), invoice.currency),
        })),
        subtotal: this.formatAmount(Number(invoice.subtotal), invoice.currency),
        taxAmount: this.formatAmount(Number(invoice.taxAmount), invoice.currency),
        taxRate: Number(invoice.taxRate),
        notes: invoice.notes,
        labels,
      };

      // Send email
      const result = await this.emailService.sendEmail({
        to: invoice.customerEmail,
        subject,
        template: 'invoice',
        context,
        cc,
        bcc,
        attachments: [
          {
            filename: `facture-${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      if (result.success) {
        this.logger.log(`Invoice email sent successfully: ${invoice.invoiceNumber} to ${invoice.customerEmail}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send invoice email: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send payment reminder email
   */
  async sendReminderEmail(
    invoice: Invoice & { items: InvoiceItem[] },
    options: ReminderEmailOptions = {},
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { reminderNumber = 1, customMessage, urgencyLevel = 'standard' } = options;

    try {
      const labels = this.generatorService.getLocalizedLabels(invoice.locale || 'fr');
      const paymentUrl = `${this.paymentBaseUrl}/invoice/${invoice.id}`;

      // Calculate days overdue
      const now = new Date();
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      const subject = this.getSubjectByLocale(invoice.locale || 'fr', 'reminder', {
        invoiceNumber: invoice.invoiceNumber,
        reminderNumber,
        urgencyLevel,
      });

      const context = {
        customerName: invoice.customerName,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: this.generatorService.formatDate(invoice.issueDate, invoice.locale || 'fr'),
        dueDate: this.generatorService.formatDate(invoice.dueDate, invoice.locale || 'fr'),
        total: this.formatAmount(Number(invoice.total), invoice.currency),
        currency: invoice.currency,
        daysOverdue,
        reminderNumber,
        urgencyLevel,
        paymentUrl,
        customMessage,
        companyName: invoice.companyName || this.companyName,
        labels,
      };

      const result = await this.emailService.sendEmail({
        to: invoice.customerEmail,
        subject,
        template: 'invoice-reminder',
        context,
      });

      if (result.success) {
        this.logger.log(`Payment reminder sent: ${invoice.invoiceNumber} (Reminder #${reminderNumber})`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send reminder email: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send payment receipt email
   */
  async sendReceiptEmail(
    invoice: Invoice & { items: InvoiceItem[] },
    paymentDetails?: {
      paymentMethod?: string;
      transactionId?: string;
      paidAt?: Date;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Generate receipt PDF
      const pdfBuffer = await this.pdfService.generatePdf(invoice, {
        template: 'standard',
        includeQrCode: false,
        includePaymentLink: false,
        locale: invoice.locale || 'fr',
      });

      const labels = this.generatorService.getLocalizedLabels(invoice.locale || 'fr');

      const subject = this.getSubjectByLocale(invoice.locale || 'fr', 'receipt', {
        invoiceNumber: invoice.invoiceNumber,
      });

      const context = {
        customerName: invoice.customerName,
        invoiceNumber: invoice.invoiceNumber,
        total: this.formatAmount(Number(invoice.total), invoice.currency),
        currency: invoice.currency,
        paidAt: paymentDetails?.paidAt
          ? this.generatorService.formatDate(paymentDetails.paidAt, invoice.locale || 'fr')
          : this.generatorService.formatDate(new Date(), invoice.locale || 'fr'),
        paymentMethod: paymentDetails?.paymentMethod || 'Card',
        transactionId: paymentDetails?.transactionId,
        companyName: invoice.companyName || this.companyName,
        items: invoice.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          total: this.formatAmount(Number(item.total), invoice.currency),
        })),
        labels,
      };

      const result = await this.emailService.sendEmail({
        to: invoice.customerEmail,
        subject,
        template: 'invoice-receipt',
        context,
        attachments: [
          {
            filename: `recu-${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      if (result.success) {
        this.logger.log(`Receipt email sent: ${invoice.invoiceNumber}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send receipt email: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send invoice cancelled notification
   */
  async sendCancellationEmail(
    invoice: Invoice & { items: InvoiceItem[] },
    reason?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const labels = this.generatorService.getLocalizedLabels(invoice.locale || 'fr');

      const subject = this.getSubjectByLocale(invoice.locale || 'fr', 'cancelled', {
        invoiceNumber: invoice.invoiceNumber,
      });

      const context = {
        customerName: invoice.customerName,
        invoiceNumber: invoice.invoiceNumber,
        total: this.formatAmount(Number(invoice.total), invoice.currency),
        reason,
        companyName: invoice.companyName || this.companyName,
        labels,
      };

      const result = await this.emailService.sendEmail({
        to: invoice.customerEmail,
        subject,
        template: 'invoice-cancelled',
        context,
      });

      if (result.success) {
        this.logger.log(`Cancellation email sent: ${invoice.invoiceNumber}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send cancellation email: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get localized email subject
   */
  private getSubjectByLocale(
    locale: string,
    type: 'invoice' | 'reminder' | 'receipt' | 'cancelled',
    params: Record<string, unknown>,
  ): string {
    const subjects: Record<string, Record<string, string>> = {
      fr: {
        invoice: `Facture ${params.invoiceNumber} - ${this.companyName}`,
        reminder: `Rappel de paiement - Facture ${params.invoiceNumber}`,
        receipt: `Confirmation de paiement - Facture ${params.invoiceNumber}`,
        cancelled: `Annulation de facture - ${params.invoiceNumber}`,
      },
      en: {
        invoice: `Invoice ${params.invoiceNumber} - ${this.companyName}`,
        reminder: `Payment Reminder - Invoice ${params.invoiceNumber}`,
        receipt: `Payment Confirmation - Invoice ${params.invoiceNumber}`,
        cancelled: `Invoice Cancelled - ${params.invoiceNumber}`,
      },
      de: {
        invoice: `Rechnung ${params.invoiceNumber} - ${this.companyName}`,
        reminder: `Zahlungserinnerung - Rechnung ${params.invoiceNumber}`,
        receipt: `Zahlungsbestatigung - Rechnung ${params.invoiceNumber}`,
        cancelled: `Rechnung storniert - ${params.invoiceNumber}`,
      },
      es: {
        invoice: `Factura ${params.invoiceNumber} - ${this.companyName}`,
        reminder: `Recordatorio de pago - Factura ${params.invoiceNumber}`,
        receipt: `Confirmacion de pago - Factura ${params.invoiceNumber}`,
        cancelled: `Factura anulada - ${params.invoiceNumber}`,
      },
      it: {
        invoice: `Fattura ${params.invoiceNumber} - ${this.companyName}`,
        reminder: `Promemoria di pagamento - Fattura ${params.invoiceNumber}`,
        receipt: `Conferma di pagamento - Fattura ${params.invoiceNumber}`,
        cancelled: `Fattura annullata - ${params.invoiceNumber}`,
      },
      nl: {
        invoice: `Factuur ${params.invoiceNumber} - ${this.companyName}`,
        reminder: `Betalingsherinnering - Factuur ${params.invoiceNumber}`,
        receipt: `Betalingsbevestiging - Factuur ${params.invoiceNumber}`,
        cancelled: `Factuur geannuleerd - ${params.invoiceNumber}`,
      },
    };

    const localeSubjects = subjects[locale] ?? subjects['en'] ?? subjects['en']!;
    return localeSubjects?.[type] ?? subjects['en']![type]!;
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
