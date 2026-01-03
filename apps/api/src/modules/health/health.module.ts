import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { StripeHealthIndicator } from './indicators/stripe.health';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [ConfigModule, PrismaModule, CacheModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator, StripeHealthIndicator],
  exports: [PrismaHealthIndicator, RedisHealthIndicator, StripeHealthIndicator],
})
export class HealthModule {}
