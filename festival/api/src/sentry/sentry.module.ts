import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { SentryExceptionFilter } from './sentry.filter';
import { SentryInterceptor } from './sentry.interceptor';
import { SentryService } from './sentry.service';

@Global()
@Module({
  providers: [
    SentryService,
    {
      provide: APP_FILTER,
      useClass: SentryExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
    },
  ],
  exports: [SentryService],
})
export class SentryModule {}
