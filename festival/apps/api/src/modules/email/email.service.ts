import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Email configuration interface
 */
export interface EmailConfig {
  from: string;
  replyTo?: string;
}

/**
 * Email send options
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, unknown>;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

/**
 * Email Service
 *
 * Handles email sending using nodemailer with Handlebars templates.
 * Supports:
 * - Template-based emails with Handlebars
 * - Attachments (PDFs, images, etc.)
 * - HTML and text versions
 * - CC/BCC recipients
 * - Custom reply-to addresses
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private templates = new Map<string, HandlebarsTemplateDelegate>();
  private readonly templateDir: string;
  private readonly config: EmailConfig;
  private isEnabled = false;

  constructor(private readonly configService: ConfigService) {
    this.templateDir = path.join(__dirname, 'templates');
    this.config = {
      from: this.configService.get<string>('SMTP_FROM') || 'Festival Platform <noreply@festival-platform.com>',
      replyTo: this.configService.get<string>('SMTP_REPLY_TO'),
    };
  }

  onModuleInit() {
    this.initializeTransporter();
    this.loadTemplates();
    this.registerHelpers();
  }

  /**
   * Initialize the nodemailer transporter
   */
  private initializeTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !port) {
      this.logger.warn('SMTP not configured. Email sending will be disabled.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
        tls: {
          rejectUnauthorized: this.configService.get<boolean>('SMTP_TLS_REJECT_UNAUTHORIZED', true),
        },
      });

      this.isEnabled = true;
      this.logger.log('Email transporter initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize email transporter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load all email templates from the templates directory
   */
  private loadTemplates(): void {
    try {
      if (!fs.existsSync(this.templateDir)) {
        this.logger.warn(`Template directory not found: ${this.templateDir}`);
        return;
      }

      // Load partials first
      const partialsDir = path.join(this.templateDir, 'partials');
      if (fs.existsSync(partialsDir)) {
        const partialFiles = fs.readdirSync(partialsDir);
        partialFiles.forEach((file) => {
          if (file.endsWith('.hbs')) {
            const partialName = file.replace('.hbs', '');
            const partialContent = fs.readFileSync(
              path.join(partialsDir, file),
              'utf-8',
            );
            handlebars.registerPartial(partialName, partialContent);
            this.logger.debug(`Loaded partial: ${partialName}`);
          }
        });
      }

      // Load layouts
      const layoutsDir = path.join(this.templateDir, 'layouts');
      if (fs.existsSync(layoutsDir)) {
        const layoutFiles = fs.readdirSync(layoutsDir);
        layoutFiles.forEach((file) => {
          if (file.endsWith('.hbs')) {
            const layoutName = `layout-${file.replace('.hbs', '')}`;
            const layoutContent = fs.readFileSync(
              path.join(layoutsDir, file),
              'utf-8',
            );
            handlebars.registerPartial(layoutName, layoutContent);
            this.logger.debug(`Loaded layout: ${layoutName}`);
          }
        });
      }

      // Load main templates
      const templateFiles = fs.readdirSync(this.templateDir);
      templateFiles.forEach((file) => {
        if (file.endsWith('.hbs')) {
          const templateName = file.replace('.hbs', '');
          const templateContent = fs.readFileSync(
            path.join(this.templateDir, file),
            'utf-8',
          );
          this.templates.set(templateName, handlebars.compile(templateContent));
          this.logger.debug(`Loaded template: ${templateName}`);
        }
      });

      this.logger.log(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      this.logger.error(`Failed to load email templates: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Format date helper
    handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      if (!date) {return '';}
      const d = new Date(date);

      switch (format) {
        case 'short':
          return d.toLocaleDateString('fr-FR');
        case 'long':
          return d.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        case 'datetime':
          return d.toLocaleString('fr-FR');
        case 'time':
          return d.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          });
        default:
          return d.toLocaleDateString('fr-FR');
      }
    });

    // Format currency helper
    handlebars.registerHelper('formatCurrency', (amount: number, currency = 'EUR') => {
      if (amount === undefined || amount === null) {return '';}
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
      }).format(amount);
    });

    // Conditional helper
    handlebars.registerHelper('ifEquals', function (this: unknown, arg1: unknown, arg2: unknown, options: Handlebars.HelperOptions) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    // Uppercase helper
    handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    // Lowercase helper
    handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    // Capitalize helper
    handlebars.registerHelper('capitalize', (str: string) => {
      return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
    });

    // Truncate helper
    handlebars.registerHelper('truncate', (str: string, length: number) => {
      if (!str) {return '';}
      if (str.length <= length) {return str;}
      return str.substring(0, length) + '...';
    });

    this.logger.debug('Registered Handlebars helpers');
  }

  /**
   * Check if email service is enabled
   */
  isEmailEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Send an email using a template
   */
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isEnabled || !this.transporter) {
      this.logger.warn('Email sending is disabled');
      return { success: false, error: 'Email service is not configured' };
    }

    try {
      const template = this.templates.get(options.template);
      if (!template) {
        throw new Error(`Template '${options.template}' not found`);
      }

      // Render the template with context
      const html = template({
        ...options.context,
        currentYear: new Date().getFullYear(),
        companyName: this.configService.get<string>('COMPANY_NAME') || 'Festival Platform',
        websiteUrl: this.configService.get<string>('WEBSITE_URL') || 'https://festival-platform.com',
      });

      // Generate plain text version (basic HTML stripping)
      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const mailOptions: nodemailer.SendMailOptions = {
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        html,
        text,
        replyTo: options.replyTo || this.config.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${options.to}: ${result.messageId}`);

      return { success: true, messageId: result.messageId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send a welcome email
   */
  async sendWelcomeEmail(to: string, context: { firstName: string; lastName: string; email: string }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      to,
      subject: 'Bienvenue sur Festival Platform!',
      template: 'welcome',
      context,
    });
  }

  /**
   * Send a verification email
   */
  async sendVerificationEmail(to: string, context: { firstName: string; verificationUrl: string; expiresIn: string }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      to,
      subject: 'Verifiez votre adresse email',
      template: 'verify-email',
      context,
    });
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(to: string, context: { firstName: string; resetUrl: string; expiresIn: string }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      to,
      subject: 'Reinitialisation de votre mot de passe',
      template: 'password-reset',
      context,
    });
  }

  /**
   * Send a ticket confirmation email
   */
  async sendTicketConfirmationEmail(
    to: string,
    context: {
      firstName: string;
      lastName: string;
      festivalName: string;
      ticketType: string;
      ticketCode: string;
      eventDate: Date;
      eventLocation: string;
      purchasePrice: number;
      currency: string;
    },
    ticketPdf?: Buffer,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const attachments = ticketPdf
      ? [
          {
            filename: `ticket-${context.ticketCode}.pdf`,
            content: ticketPdf,
            contentType: 'application/pdf',
          },
        ]
      : undefined;

    return this.sendEmail({
      to,
      subject: `Votre billet pour ${context.festivalName}`,
      template: 'ticket-confirmation',
      context,
      attachments,
    });
  }

  /**
   * Send a payment confirmation email
   */
  async sendPaymentConfirmationEmail(
    to: string,
    context: {
      firstName: string;
      lastName: string;
      paymentId: string;
      amount: number;
      currency: string;
      paymentMethod: string;
      items: { name: string; quantity: number; price: number }[];
      festivalName?: string;
    },
    invoicePdf?: Buffer,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const attachments = invoicePdf
      ? [
          {
            filename: `facture-${context.paymentId.substring(0, 8)}.pdf`,
            content: invoicePdf,
            contentType: 'application/pdf',
          },
        ]
      : undefined;

    return this.sendEmail({
      to,
      subject: 'Confirmation de paiement',
      template: 'payment-confirmation',
      context: {
        ...context,
        totalAmount: context.amount,
      },
      attachments,
    });
  }

  /**
   * Send a refund confirmation email
   */
  async sendRefundConfirmationEmail(
    to: string,
    context: {
      firstName: string;
      lastName: string;
      refundId: string;
      amount: number;
      currency: string;
      reason?: string;
      festivalName?: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      to,
      subject: 'Confirmation de remboursement',
      template: 'refund-confirmation',
      context,
    });
  }

  /**
   * Send a cashless topup confirmation email
   */
  async sendCashlessTopupEmail(
    to: string,
    context: {
      firstName: string;
      amount: number;
      currency: string;
      newBalance: number;
      festivalName: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      to,
      subject: 'Recharge cashless confirmee',
      template: 'cashless-topup',
      context,
    });
  }

  /**
   * Send a staff assignment notification email
   */
  async sendStaffAssignmentEmail(
    to: string,
    context: {
      firstName: string;
      lastName: string;
      festivalName: string;
      role: string;
      department?: string;
      startDate: Date;
      endDate: Date;
      zone?: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      to,
      subject: `Affectation staff - ${context.festivalName}`,
      template: 'staff-assignment',
      context,
    });
  }

  /**
   * Send a support ticket response email
   */
  async sendSupportTicketResponseEmail(
    to: string,
    context: {
      firstName: string;
      ticketId: string;
      ticketSubject: string;
      responseMessage: string;
      staffName?: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      to,
      subject: `Re: ${context.ticketSubject}`,
      template: 'support-response',
      context,
    });
  }

  /**
   * Verify the SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error(`SMTP verification failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}
