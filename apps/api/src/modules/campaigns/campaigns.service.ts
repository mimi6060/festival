import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { QueueService } from '../queue/queue.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignStatus,
  CampaignPreviewDto,
  SegmentFilter,
  CampaignStats,
} from './dto/campaign.dto';
import { Prisma } from '@prisma/client';

// In-memory campaign store (in production, use a database table)
interface Campaign {
  id: string;
  festivalId: string;
  name: string;
  subject: string;
  type: string;
  status: CampaignStatus;
  htmlContent: string;
  textContent?: string;
  segment?: SegmentFilter;
  scheduledAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  stats: CampaignStats;
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private campaigns = new Map<string, Campaign>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly queueService: QueueService
  ) {}

  /**
   * Create a new campaign
   */
  async create(dto: CreateCampaignDto, userId: string): Promise<Campaign> {
    // Verify festival exists
    const festival = await this.prisma.festival.findUnique({
      where: { id: dto.festivalId },
    });

    if (!festival) {
      throw new NotFoundException(`Festival ${dto.festivalId} not found`);
    }

    const campaign: Campaign = {
      id: `campaign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      festivalId: dto.festivalId,
      name: dto.name,
      subject: dto.subject,
      type: dto.type,
      status: dto.scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
      htmlContent: dto.htmlContent,
      textContent: dto.textContent,
      segment: dto.segment,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalRecipients: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        unsubscribed: 0,
      },
    };

    this.campaigns.set(campaign.id, campaign);
    this.logger.log(`Campaign ${campaign.id} created by user ${userId}`);

    // Calculate recipient count
    const recipientCount = await this.getRecipientCount(dto.festivalId, dto.segment);
    campaign.stats.totalRecipients = recipientCount;

    return campaign;
  }

  /**
   * Get campaign by ID
   */
  async findById(id: string): Promise<Campaign> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }
    return campaign;
  }

  /**
   * List campaigns for a festival
   */
  async findByFestival(
    festivalId: string,
    options?: { status?: CampaignStatus; page?: number; limit?: number }
  ): Promise<{ data: Campaign[]; total: number }> {
    let campaigns = Array.from(this.campaigns.values()).filter((c) => c.festivalId === festivalId);

    if (options?.status) {
      campaigns = campaigns.filter((c) => c.status === options.status);
    }

    campaigns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = campaigns.length;
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const start = (page - 1) * limit;

    return {
      data: campaigns.slice(start, start + limit),
      total,
    };
  }

  /**
   * Update campaign
   */
  async update(id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findById(id);

    if (campaign.status === CampaignStatus.SENDING || campaign.status === CampaignStatus.SENT) {
      throw new BadRequestException('Cannot update a campaign that is sending or already sent');
    }

    Object.assign(campaign, {
      ...dto,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : campaign.scheduledAt,
      updatedAt: new Date(),
    });

    if (dto.scheduledAt && campaign.status === CampaignStatus.DRAFT) {
      campaign.status = CampaignStatus.SCHEDULED;
    }

    if (dto.segment) {
      campaign.stats.totalRecipients = await this.getRecipientCount(
        campaign.festivalId,
        dto.segment
      );
    }

    this.campaigns.set(id, campaign);
    return campaign;
  }

  /**
   * Delete campaign
   */
  async delete(id: string): Promise<void> {
    const campaign = await this.findById(id);

    if (campaign.status === CampaignStatus.SENDING) {
      throw new BadRequestException('Cannot delete a campaign that is currently sending');
    }

    this.campaigns.delete(id);
    this.logger.log(`Campaign ${id} deleted`);
  }

  /**
   * Send preview email
   */
  async sendPreview(id: string, dto: CampaignPreviewDto): Promise<void> {
    const campaign = await this.findById(id);

    await this.emailService.sendEmail({
      to: dto.email,
      subject: `[Preview] ${campaign.subject}`,
      html: campaign.htmlContent,
      text: campaign.textContent,
    });

    this.logger.log(`Preview sent for campaign ${id} to ${dto.email}`);
  }

  /**
   * Send campaign immediately or schedule it
   */
  async send(id: string): Promise<Campaign> {
    const campaign = await this.findById(id);

    if (campaign.status === CampaignStatus.SENDING || campaign.status === CampaignStatus.SENT) {
      throw new BadRequestException('Campaign has already been sent or is sending');
    }

    campaign.status = CampaignStatus.SENDING;
    campaign.updatedAt = new Date();
    this.campaigns.set(id, campaign);

    // Queue the campaign for batch sending
    await this.queueService.addJob('email-campaign', {
      campaignId: id,
      festivalId: campaign.festivalId,
      subject: campaign.subject,
      htmlContent: campaign.htmlContent,
      textContent: campaign.textContent,
      segment: campaign.segment,
    });

    this.logger.log(`Campaign ${id} queued for sending`);
    return campaign;
  }

  /**
   * Cancel a scheduled campaign
   */
  async cancel(id: string): Promise<Campaign> {
    const campaign = await this.findById(id);

    if (campaign.status === CampaignStatus.SENT) {
      throw new BadRequestException('Cannot cancel a campaign that has already been sent');
    }

    if (campaign.status === CampaignStatus.SENDING) {
      // In real implementation, would cancel the queue job
      this.logger.warn(`Attempting to cancel sending campaign ${id}`);
    }

    campaign.status = CampaignStatus.CANCELLED;
    campaign.updatedAt = new Date();
    this.campaigns.set(id, campaign);

    return campaign;
  }

  /**
   * Get available templates
   */
  getTemplates() {
    return [
      {
        id: 'announcement',
        name: 'Announcement',
        type: 'ANNOUNCEMENT',
        subject: '📢 Important Update - {{festivalName}}',
        description: 'General announcements and updates',
      },
      {
        id: 'reminder',
        name: 'Event Reminder',
        type: 'REMINDER',
        subject: '⏰ Reminder: {{festivalName}} is Coming Soon!',
        description: 'Remind attendees about upcoming events',
      },
      {
        id: 'promotion',
        name: 'Special Offer',
        type: 'PROMOTION',
        subject: '🎉 Exclusive Offer for {{festivalName}}',
        description: 'Promotional emails with special offers',
      },
      {
        id: 'thank-you',
        name: 'Thank You',
        type: 'THANK_YOU',
        subject: '🙏 Thank You for Attending {{festivalName}}',
        description: 'Post-event thank you messages',
      },
      {
        id: 'survey',
        name: 'Feedback Survey',
        type: 'SURVEY',
        subject: '📝 Share Your Experience at {{festivalName}}',
        description: 'Request feedback from attendees',
      },
    ];
  }

  /**
   * Get recipient count based on segment filters
   */
  private async getRecipientCount(festivalId: string, segment?: SegmentFilter): Promise<number> {
    const where: Prisma.TicketWhereInput = {
      festivalId,
      user: { isNot: null },
    };

    if (segment?.ticketCategoryIds?.length) {
      where.categoryId = { in: segment.ticketCategoryIds };
    }

    if (segment?.purchasedAfter) {
      where.createdAt = { gte: new Date(segment.purchasedAfter) };
    }

    if (segment?.purchasedBefore) {
      where.createdAt = { ...(where.createdAt as object), lte: new Date(segment.purchasedBefore) };
    }

    // Count unique users with tickets matching the criteria
    const tickets = await this.prisma.ticket.findMany({
      where,
      select: { userId: true },
      distinct: ['userId'],
    });

    return tickets.length;
  }

  /**
   * Update campaign stats (called by queue processor)
   */
  async updateStats(id: string, stats: Partial<CampaignStats>): Promise<void> {
    const campaign = this.campaigns.get(id);
    if (campaign) {
      campaign.stats = { ...campaign.stats, ...stats };
      if (stats.sent && stats.sent >= campaign.stats.totalRecipients) {
        campaign.status = CampaignStatus.SENT;
        campaign.sentAt = new Date();
      }
      campaign.updatedAt = new Date();
      this.campaigns.set(id, campaign);
    }
  }
}
