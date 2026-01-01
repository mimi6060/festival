import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { HttpLoggingMiddleware } from './http-logging.middleware';

@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware, HttpLoggingMiddleware)
      .forRoutes('*');
  }
}
