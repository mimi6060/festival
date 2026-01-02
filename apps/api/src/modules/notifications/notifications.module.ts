import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './services/notifications.service';
import { FcmService } from './services/fcm.service';
import { NotificationTemplateService } from './services/notification-template.service';

@Module({
  imports: [ConfigModule],
  providers: [NotificationsService, FcmService, NotificationTemplateService],
  exports: [NotificationsService, FcmService, NotificationTemplateService],
})
export class NotificationsModule {}
