import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../logger/logger.module';
import { AuthModule } from '../auth/auth.module';
import { FestivalModule } from '../festival/festival.module';
import { CashlessModule } from '../cashless/cashless.module';
import { TicketsModule } from '../tickets/tickets.module';
import { PaymentsModule } from '../payments/payments.module';
import { HealthModule } from '../health/health.module';
import { MetricsModule } from '../health/metrics.module';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule,

    // Database
    PrismaModule,

    // Logging (Winston)
    LoggerModule,

    // Authentication
    AuthModule,

    // Feature modules
    FestivalModule,
    CashlessModule,
    TicketsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },

    // Global guards - JWT authentication and role-based access control
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
