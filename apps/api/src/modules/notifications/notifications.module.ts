import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { FcmService } from './services/fcm.service';
import { NotificationTemplateService } from './services/notification-template.service';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, FcmService, NotificationTemplateService],
  exports: [NotificationsService, FcmService, NotificationTemplateService],
})
export class NotificationsModule {}
