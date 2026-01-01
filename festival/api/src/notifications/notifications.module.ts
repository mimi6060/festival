import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { NotificationsController, AdminNotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { NotificationsProcessor } from './notifications.processor';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueueAsync({
      name: 'notifications',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
          password: configService.get<string>('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService, PushService, NotificationsProcessor],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}
