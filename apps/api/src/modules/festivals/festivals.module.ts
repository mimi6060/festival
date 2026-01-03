import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { FestivalsController } from './festivals.controller';
import { FestivalsService } from './festivals.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CacheInterceptor } from '../cache';

@Module({
  imports: [PrismaModule],
  controllers: [FestivalsController],
  providers: [
    FestivalsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
  exports: [FestivalsService],
})
export class FestivalsModule {}
