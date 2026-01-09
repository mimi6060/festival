import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { EmailPreviewController } from './controllers/email-preview.controller';
import { NotificationsService } from './services/notifications.service';
import { FcmService } from './services/fcm.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { EmailTemplateService } from './services/email-template.service';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationsController, EmailPreviewController],
  providers: [NotificationsService, FcmService, NotificationTemplateService, EmailTemplateService],
  exports: [NotificationsService, FcmService, NotificationTemplateService, EmailTemplateService],
})
export class NotificationsModule {}
