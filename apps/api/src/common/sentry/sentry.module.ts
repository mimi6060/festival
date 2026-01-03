import { Module, Global } from '@nestjs/common';
import { SentryService } from './sentry.service';
import { SentryExceptionFilter } from './sentry.filter';
import { APP_FILTER } from '@nestjs/core';

@Global()
@Module({
  providers: [
    SentryService,
    {
      provide: APP_FILTER,
      useClass: SentryExceptionFilter,
    },
  ],
  exports: [SentryService],
})
export class SentryModule {}
