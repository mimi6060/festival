import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import {
  PrismaHealthIndicator,
  RedisHealthIndicator,
  StripeHealthIndicator,
} from './indicators';

@Module({
  imports: [TerminusModule, ConfigModule],
  controllers: [HealthController],
  providers: [
    PrismaHealthIndicator,
    RedisHealthIndicator,
    StripeHealthIndicator,
  ],
  exports: [
    PrismaHealthIndicator,
    RedisHealthIndicator,
    StripeHealthIndicator,
  ],
})
export class HealthModule {}
