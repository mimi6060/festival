import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsGateway } from './analytics.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule, // Uses existing Redis-based cache module
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>('jwt.secret');
        return {
          secret,
          signOptions: {
            expiresIn: 900, // 15 minutes in seconds
          },
        };
      },
    }),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsGateway],
  exports: [AnalyticsService, AnalyticsGateway],
})
export class AnalyticsModule {}
