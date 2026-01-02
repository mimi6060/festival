import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationTemplate, NotificationType } from '@prisma/client';
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
} from '../dto';

@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationTemplateDto): Promise<NotificationTemplate> {
    const existing = await this.prisma.notificationTemplate.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Template '${dto.name}' already exists`);
    }

    return this.prisma.notificationTemplate.create({
      data: dto,
    });
  }

  async update(
    id: string,
    dto: UpdateNotificationTemplateDto,
  ): Promise<NotificationTemplate> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template not found`);
    }

    return this.prisma.notificationTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string): Promise<void> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template not found`);
    }

    await this.prisma.notificationTemplate.delete({
      where: { id },
    });
  }

  async getById(id: string): Promise<NotificationTemplate | null> {
    return this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
  }

  async getByName(name: string): Promise<NotificationTemplate | null> {
    return this.prisma.notificationTemplate.findUnique({
      where: { name },
    });
  }

  async getByType(type: NotificationType): Promise<NotificationTemplate[]> {
    return this.prisma.notificationTemplate.findMany({
      where: { type, isActive: true },
    });
  }

  async getAll(includeInactive = false): Promise<NotificationTemplate[]> {
    return this.prisma.notificationTemplate.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async seedDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        name: 'ticket_purchased',
        type: NotificationType.TICKET_PURCHASED,
        titleTemplate: 'Billet confirme !',
        bodyTemplate:
          'Votre billet {{ticketType}} pour {{festivalName}} a ete confirme. Retrouvez votre QR code dans l\'app.',
        defaultActionUrl: '/tickets',
      },
      {
        name: 'payment_success',
        type: NotificationType.PAYMENT_SUCCESS,
        titleTemplate: 'Paiement reussi',
        bodyTemplate: 'Votre paiement de {{amount}} EUR a ete confirme.',
        defaultActionUrl: '/payments',
      },
      {
        name: 'payment_failed',
        type: NotificationType.PAYMENT_FAILED,
        titleTemplate: 'Echec du paiement',
        bodyTemplate:
          'Votre paiement de {{amount}} EUR a echoue. Veuillez reessayer.',
        defaultActionUrl: '/payments',
      },
      {
        name: 'cashless_topup',
        type: NotificationType.CASHLESS_TOPUP,
        titleTemplate: 'Compte recharge',
        bodyTemplate:
          'Votre compte cashless a ete credite de {{amount}} EUR. Solde: {{balance}} EUR.',
        defaultActionUrl: '/cashless',
      },
      {
        name: 'artist_reminder',
        type: NotificationType.ARTIST_REMINDER,
        titleTemplate: '{{artistName}} bientot sur scene !',
        bodyTemplate:
          '{{artistName}} commence dans {{minutes}} minutes sur la scene {{stageName}}.',
        defaultActionUrl: '/program',
      },
      {
        name: 'schedule_change',
        type: NotificationType.SCHEDULE_CHANGE,
        titleTemplate: 'Changement de programme',
        bodyTemplate:
          '{{artistName}} a ete deplace. Nouvelle heure: {{newTime}} sur {{stageName}}.',
        defaultActionUrl: '/program',
      },
      {
        name: 'festival_update',
        type: NotificationType.FESTIVAL_UPDATE,
        titleTemplate: 'Info {{festivalName}}',
        bodyTemplate: '{{message}}',
        defaultActionUrl: '/info',
      },
      {
        name: 'security_alert',
        type: NotificationType.SECURITY_ALERT,
        titleTemplate: 'Alerte Securite',
        bodyTemplate: '{{message}}',
        defaultActionUrl: '/info',
      },
      {
        name: 'vendor_order_ready',
        type: NotificationType.VENDOR_ORDER,
        titleTemplate: 'Commande prete !',
        bodyTemplate:
          'Votre commande #{{orderNumber}} chez {{vendorName}} est prete a etre recuperee.',
        defaultActionUrl: '/orders/{{orderId}}',
      },
      {
        name: 'promo',
        type: NotificationType.PROMO,
        titleTemplate: '{{title}}',
        bodyTemplate: '{{message}}',
        defaultActionUrl: '/promotions',
      },
    ];

    for (const template of defaultTemplates) {
      const existing = await this.prisma.notificationTemplate.findUnique({
        where: { name: template.name },
      });

      if (!existing) {
        await this.prisma.notificationTemplate.create({
          data: template,
        });
        this.logger.log(`Created default template: ${template.name}`);
      }
    }
  }
}
