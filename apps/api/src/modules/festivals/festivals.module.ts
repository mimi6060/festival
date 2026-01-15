import { Module, forwardRef } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { FestivalsController } from './festivals.controller';
import { FestivalsService } from './festivals.service';
import { ICalExportService } from './ical-export.service';
import { CacheInterceptor } from '../cache';
import { LanguagesModule } from '../languages';

@Module({
  imports: [forwardRef(() => LanguagesModule)],
  controllers: [FestivalsController],
  providers: [
    FestivalsService,
    ICalExportService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
  exports: [FestivalsService, ICalExportService],
})
export class FestivalsModule {}
