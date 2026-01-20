import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import {
  CreateContactMessageDto,
  ContactMessageResponseDto,
  NewsletterSubscribeDto,
  NewsletterResponseDto,
  ContactSubject,
} from '../dto/contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly newsletterEmails = new Map<
    string,
    { email: string; language: string; subscribedAt: Date }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Handle contact form submission
   * Creates a support-like record and sends notification emails
   */
  async handleContactForm(dto: CreateContactMessageDto): Promise<ContactMessageResponseDto> {
    try {
      // Generate a ticket reference ID for tracking
      const ticketId = `CONTACT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Log the contact message (in production, would save to database)
      this.logger.log(
        `Contact form received: ${ticketId} from ${dto.email}, subject: ${dto.subject}`
      );

      // Send confirmation email to the user
      await this.sendContactConfirmationEmail(dto, ticketId);

      // Notify the support team
      await this.notifySupportTeam(dto, ticketId);

      return {
        success: true,
        message:
          'Votre message a ete envoye avec succes. Nous vous repondrons dans les plus brefs delais.',
        ticketId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process contact form: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Send confirmation email to the person who submitted the contact form
   */
  private async sendContactConfirmationEmail(
    dto: CreateContactMessageDto,
    ticketId: string
  ): Promise<void> {
    const subjectLabels: Record<ContactSubject, string> = {
      [ContactSubject.GENERAL]: 'Question generale',
      [ContactSubject.BILLING]: 'Facturation',
      [ContactSubject.TECHNICAL]: 'Support technique',
      [ContactSubject.PARTNERSHIP]: 'Partenariat',
    };

    try {
      // Use the email service to send confirmation
      const result = await this.emailService.sendEmail({
        to: dto.email,
        subject: `Confirmation de votre message - ${ticketId}`,
        template: 'contact-confirmation',
        context: {
          name: dto.name,
          ticketId,
          subjectType: subjectLabels[dto.subject],
          message: dto.message.substring(0, 200) + (dto.message.length > 200 ? '...' : ''),
          lang_fr: true,
        },
      });

      if (result.success) {
        this.logger.log(`Contact confirmation email sent to ${dto.email}`);
      } else {
        this.logger.warn(`Failed to send contact confirmation email: ${result.error}`);
      }
    } catch (error) {
      // Don't fail the request if email fails, just log it
      this.logger.warn(
        `Email service error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Notify the support team about new contact form submission
   */
  private async notifySupportTeam(dto: CreateContactMessageDto, ticketId: string): Promise<void> {
    const supportEmail =
      this.configService.get<string>('SUPPORT_EMAIL') || 'support@festival-platform.com';
    const slackWebhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');

    // Send email to support team
    try {
      const result = await this.emailService.sendEmail({
        to: supportEmail,
        subject: `[Contact Form] ${dto.subject.toUpperCase()} - ${dto.name}`,
        template: 'contact-notification',
        context: {
          ticketId,
          name: dto.name,
          email: dto.email,
          subject: dto.subject,
          message: dto.message,
          festivalId: dto.festivalId || 'N/A',
          timestamp: new Date().toISOString(),
        },
      });

      if (result.success) {
        this.logger.log(`Support team notified via email for ${ticketId}`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to notify support via email: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Send Slack notification if webhook is configured
    if (slackWebhookUrl) {
      try {
        await this.sendSlackNotification(slackWebhookUrl, {
          text: `New contact form submission`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `New Contact: ${dto.subject.toUpperCase()}`,
              },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*From:*\n${dto.name}` },
                { type: 'mrkdwn', text: `*Email:*\n${dto.email}` },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Message:*\n${dto.message.substring(0, 500)}${dto.message.length > 500 ? '...' : ''}`,
              },
            },
            {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: `Ticket ID: \`${ticketId}\`` }],
            },
          ],
        });
        this.logger.log(`Slack notification sent for ${ticketId}`);
      } catch (error) {
        this.logger.warn(
          `Failed to send Slack notification: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Subscribe to newsletter
   * Stores email in memory (in production, would use a proper database table or email service like Mailchimp)
   */
  async subscribeNewsletter(dto: NewsletterSubscribeDto): Promise<NewsletterResponseDto> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check if already subscribed
    if (this.newsletterEmails.has(normalizedEmail)) {
      return {
        success: true,
        message: 'Cette adresse email est deja inscrite a notre newsletter.',
        alreadySubscribed: true,
      };
    }

    // Store subscription
    this.newsletterEmails.set(normalizedEmail, {
      email: normalizedEmail,
      language: dto.language || 'fr',
      subscribedAt: new Date(),
    });

    this.logger.log(`Newsletter subscription: ${normalizedEmail}`);

    // Send welcome email
    try {
      await this.emailService.sendEmail({
        to: normalizedEmail,
        subject: 'Bienvenue dans notre newsletter !',
        template: 'newsletter-welcome',
        context: {
          email: normalizedEmail,
          lang_fr: true,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send newsletter welcome email: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Notify team about new subscriber
    const slackWebhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');
    if (slackWebhookUrl) {
      try {
        await this.sendSlackNotification(slackWebhookUrl, {
          text: `New newsletter subscriber: ${normalizedEmail}`,
        });
      } catch {
        // Silent fail for notifications
      }
    }

    return {
      success: true,
      message: 'Inscription reussie ! Vous recevrez bientot nos actualites.',
      alreadySubscribed: false,
    };
  }

  /**
   * Send Slack webhook notification
   */
  private async sendSlackNotification(
    webhookUrl: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }
  }

  /**
   * Get newsletter subscriber count (admin endpoint)
   */
  getNewsletterStats(): { total: number; recent: number } {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let recentCount = 0;
    this.newsletterEmails.forEach((sub) => {
      if (sub.subscribedAt >= weekAgo) {
        recentCount++;
      }
    });

    return {
      total: this.newsletterEmails.size,
      recent: recentCount,
    };
  }
}
