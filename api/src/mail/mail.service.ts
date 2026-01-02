import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';

export interface MailUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface MailTicket {
  id: string;
  qrCode: string;
  categoryName: string;
  price: number;
  purchasedAt: Date;
}

export interface MailFestival {
  id: string;
  name: string;
  description?: string;
  location: string;
  startDate: Date;
  endDate: Date;
  imageUrl?: string;
}

export interface MailPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
  paymentMethod?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly frontendUrl: string;
  private readonly supportEmail: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {
    this.frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:4200';
    this.supportEmail = this.configService.get<string>('mail.supportEmail') || 'support@festival.com';
  }

  /**
   * Translate a key with the specified language.
   */
  private t(key: string, lang: string, args?: Record<string, unknown>): string {
    return this.i18n.t(key, { lang, args }) as string;
  }

  /**
   * Sends email verification link to new users.
   */
  async sendVerificationEmail(user: MailUser, token: string, lang: string = 'fr'): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: this.t('emails.verification.subject', lang),
        template: 'verification',
        context: {
          firstName: user.firstName,
          lastName: user.lastName,
          verificationUrl,
          supportEmail: this.supportEmail,
          currentYear: new Date().getFullYear(),
          // Translated content
          greeting: this.t('emails.common.greeting', lang, { firstName: user.firstName }),
          title: this.t('emails.verification.title', lang),
          body: this.t('emails.verification.body', lang),
          buttonText: this.t('emails.verification.button', lang),
          expiryText: this.t('emails.verification.expiry', lang, { hours: 24 }),
          ignoreText: this.t('emails.verification.ignoreIfNotYou', lang),
          footer: this.t('emails.common.footer', lang),
          doNotReply: this.t('emails.common.doNotReply', lang),
        },
      });

      this.logger.log(`Verification email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${user.email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sends password reset link to users.
   */
  async sendPasswordResetEmail(user: MailUser, token: string, lang: string = 'fr'): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: this.t('emails.passwordReset.subject', lang),
        template: 'password-reset',
        context: {
          firstName: user.firstName,
          lastName: user.lastName,
          resetUrl,
          expirationHours: 1,
          supportEmail: this.supportEmail,
          currentYear: new Date().getFullYear(),
          // Translated content
          greeting: this.t('emails.common.greeting', lang, { firstName: user.firstName }),
          title: this.t('emails.passwordReset.title', lang),
          body: this.t('emails.passwordReset.body', lang),
          buttonText: this.t('emails.passwordReset.button', lang),
          expiryText: this.t('emails.passwordReset.expiry', lang, { hours: 1 }),
          ignoreText: this.t('emails.passwordReset.ignoreIfNotYou', lang),
          footer: this.t('emails.common.footer', lang),
          doNotReply: this.t('emails.common.doNotReply', lang),
        },
      });

      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${user.email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sends ticket purchase confirmation with ticket details.
   */
  async sendTicketConfirmation(
    user: MailUser,
    tickets: MailTicket[],
    festival: MailFestival,
    lang: string = 'fr',
  ): Promise<void> {
    const totalAmount = tickets.reduce((sum, ticket) => sum + ticket.price, 0);
    const ticketsUrl = `${this.frontendUrl}/tickets`;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: this.t('emails.ticketPurchase.subject', lang),
        template: 'ticket-confirmation',
        context: {
          firstName: user.firstName,
          lastName: user.lastName,
          festival: {
            ...festival,
            startDate: this.formatDate(festival.startDate, lang),
            endDate: this.formatDate(festival.endDate, lang),
          },
          tickets: tickets.map((ticket) => ({
            ...ticket,
            price: this.formatCurrency(ticket.price, 'EUR', lang),
            purchasedAt: this.formatDateTime(ticket.purchasedAt, lang),
          })),
          ticketCount: tickets.length,
          totalAmount: this.formatCurrency(totalAmount, 'EUR', lang),
          ticketsUrl,
          supportEmail: this.supportEmail,
          currentYear: new Date().getFullYear(),
          // Translated content
          greeting: this.t('emails.common.greeting', lang, { firstName: user.firstName }),
          title: this.t('emails.ticketPurchase.title', lang),
          body: this.t('emails.ticketPurchase.body', lang),
          orderNumberLabel: this.t('emails.ticketPurchase.orderNumber', lang, { orderNumber: tickets[0]?.id || '' }),
          ticketDetailsLabel: this.t('emails.ticketPurchase.ticketDetails', lang),
          quantityLabel: this.t('emails.ticketPurchase.quantity', lang, { quantity: tickets.length }),
          priceLabel: this.t('emails.ticketPurchase.price', lang, { amount: this.formatCurrency(totalAmount, 'EUR', lang) }),
          buttonText: this.t('emails.ticketPurchase.downloadButton', lang),
          qrCodeInfo: this.t('emails.ticketPurchase.qrCodeInfo', lang),
          footer: this.t('emails.common.footer', lang),
          doNotReply: this.t('emails.common.doNotReply', lang),
        },
      });

      this.logger.log(`Ticket confirmation email sent to ${user.email} for ${tickets.length} tickets`);
    } catch (error) {
      this.logger.error(`Failed to send ticket confirmation to ${user.email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sends payment receipt after successful payment.
   */
  async sendPaymentReceipt(user: MailUser, payment: MailPayment): Promise<void> {
    const paymentsUrl = `${this.frontendUrl}/payments`;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `Payment Receipt - ${this.formatCurrency(payment.amount)}`,
        template: 'payment-receipt',
        context: {
          firstName: user.firstName,
          lastName: user.lastName,
          payment: {
            ...payment,
            amount: this.formatCurrency(payment.amount),
            createdAt: this.formatDateTime(payment.createdAt),
          },
          paymentsUrl,
          supportEmail: this.supportEmail,
          currentYear: new Date().getFullYear(),
        },
      });

      this.logger.log(`Payment receipt sent to ${user.email} for payment ${payment.id}`);
    } catch (error) {
      this.logger.error(`Failed to send payment receipt to ${user.email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sends cashless top-up confirmation.
   */
  async sendCashlessTopupConfirmation(user: MailUser, amount: number, newBalance: number, lang: string = 'fr'): Promise<void> {
    const cashlessUrl = `${this.frontendUrl}/cashless`;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: this.t('emails.cashlessTopup.subject', lang),
        template: 'cashless-topup',
        context: {
          firstName: user.firstName,
          lastName: user.lastName,
          amount: this.formatCurrency(amount, 'EUR', lang),
          topupDate: this.formatDateTime(new Date(), lang),
          cashlessUrl,
          supportEmail: this.supportEmail,
          currentYear: new Date().getFullYear(),
          // Translated content
          greeting: this.t('emails.common.greeting', lang, { firstName: user.firstName }),
          title: this.t('emails.cashlessTopup.title', lang),
          body: this.t('emails.cashlessTopup.body', lang),
          amountLabel: this.t('emails.cashlessTopup.amount', lang, { amount: this.formatCurrency(amount, 'EUR', lang) }),
          newBalanceLabel: this.t('emails.cashlessTopup.newBalance', lang, { balance: this.formatCurrency(newBalance, 'EUR', lang) }),
          footer: this.t('emails.common.footer', lang),
          doNotReply: this.t('emails.common.doNotReply', lang),
        },
      });

      this.logger.log(`Cashless top-up confirmation sent to ${user.email} for ${amount}`);
    } catch (error) {
      this.logger.error(`Failed to send cashless top-up confirmation to ${user.email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sends festival reminder before the event starts.
   */
  async sendFestivalReminder(user: MailUser, festival: MailFestival): Promise<void> {
    const festivalUrl = `${this.frontendUrl}/festivals/${festival.id}`;
    const ticketsUrl = `${this.frontendUrl}/tickets`;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `Reminder: ${festival.name} is Coming Up!`,
        template: 'festival-reminder',
        context: {
          firstName: user.firstName,
          lastName: user.lastName,
          festival: {
            ...festival,
            startDate: this.formatDate(festival.startDate),
            endDate: this.formatDate(festival.endDate),
          },
          daysUntil: this.getDaysUntil(festival.startDate),
          festivalUrl,
          ticketsUrl,
          supportEmail: this.supportEmail,
          currentYear: new Date().getFullYear(),
        },
      });

      this.logger.log(`Festival reminder sent to ${user.email} for ${festival.name}`);
    } catch (error) {
      this.logger.error(`Failed to send festival reminder to ${user.email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sends ticket with PDF attachment.
   */
  async sendTicketPdf(
    user: MailUser,
    ticket: MailTicket,
    festival: MailFestival,
    pdfBuffer: Buffer,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `Your Ticket for ${festival.name}`,
        template: 'ticket-confirmation',
        context: {
          firstName: user.firstName,
          lastName: user.lastName,
          festival: {
            ...festival,
            startDate: this.formatDate(festival.startDate),
            endDate: this.formatDate(festival.endDate),
          },
          tickets: [
            {
              ...ticket,
              price: this.formatCurrency(ticket.price),
              purchasedAt: this.formatDateTime(ticket.purchasedAt),
            },
          ],
          ticketCount: 1,
          totalAmount: this.formatCurrency(ticket.price),
          ticketsUrl: `${this.frontendUrl}/tickets`,
          supportEmail: this.supportEmail,
          currentYear: new Date().getFullYear(),
          hasPdfAttachment: true,
        },
        attachments: [
          {
            filename: `ticket-${ticket.id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      this.logger.log(`Ticket PDF sent to ${user.email} for ticket ${ticket.id}`);
    } catch (error) {
      this.logger.error(`Failed to send ticket PDF to ${user.email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Formats a number as currency (EUR by default).
   */
  private formatCurrency(amount: number, currency: string = 'EUR', lang: string = 'fr'): string {
    const locale = lang === 'en' ? 'en-US' : 'fr-FR';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount / 100); // Assuming amount is in cents
  }

  /**
   * Formats a date for display.
   */
  private formatDate(date: Date, lang: string = 'fr'): string {
    const locale = lang === 'en' ? 'en-US' : 'fr-FR';
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  }

  /**
   * Formats a date and time for display.
   */
  private formatDateTime(date: Date, lang: string = 'fr'): string {
    const locale = lang === 'en' ? 'en-US' : 'fr-FR';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  /**
   * Calculates days until a date.
   */
  private getDaysUntil(date: Date): number {
    const now = new Date();
    const target = new Date(date);
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
