import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { FestivalsController } from './festivals.controller';
import { FestivalsService } from './festivals.service';
import { CacheInterceptor } from '../cache';

@Module({
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
