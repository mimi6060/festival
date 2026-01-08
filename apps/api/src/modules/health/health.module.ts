import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { StripeHealthIndicator } from './indicators/stripe.health';
import { FcmHealthIndicator } from './indicators/fcm.health';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, PrismaModule, CacheModule, NotificationsModule],
  controllers: [HealthController],
  providers: [
    PrismaHealthIndicator,
    RedisHealthIndicator,
    StripeHealthIndicator,
    FcmHealthIndicator,
  ],
  exports: [PrismaHealthIndicator, RedisHealthIndicator, StripeHealthIndicator, FcmHealthIndicator],
})
export class HealthModule {}
