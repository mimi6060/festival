import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { LoggerModule } from '../logger/logger.module';
import { ThrottlerModule } from '../throttler/throttler.module';
import { I18nModule } from '../i18n/i18n.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { FestivalModule } from '../festival/festival.module';
import { CashlessModule } from '../cashless/cashless.module';
import { TicketsModule } from '../tickets/tickets.module';
import { PaymentsModule } from '../payments/payments.module';
import { StaffModule } from '../staff/staff.module';
import { PdfModule } from '../pdf/pdf.module';
import { MapModule } from '../map/map.module';
import { HealthModule } from '../health/health.module';
import { MetricsModule } from '../health/metrics.module';
import { AuditModule } from '../audit/audit.module';
import { SecurityModule } from '../security/security.module';
import { UploadModule } from '../upload/upload.module';
import { ProgramModule } from '../program/program.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ZonesModule } from '../zones/zones.module';
import { VendorsModule } from '../vendors/vendors.module';
import { CampingModule } from '../camping/camping.module';
import { MailModule } from '../mail/mail.module';
import { SupportModule } from '../support/support.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SentryModule, SentryUserMiddleware } from '../sentry';
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

    // Caching (Redis)
    CacheModule,

    // Logging (Winston)
    LoggerModule,

    // Rate Limiting with Redis (distributed)
    ThrottlerModule,

    // Internationalization
    I18nModule,

    // Authentication
    AuthModule,

    // Feature modules
    UsersModule,
    FestivalModule,
    CashlessModule,
    TicketsModule,
    PaymentsModule,
    StaffModule,
    PdfModule,
    MapModule,

    // Health checks & Metrics
    HealthModule,
    MetricsModule,

    // Audit & Security
    AuditModule,
    SecurityModule,

    // File Upload
    UploadModule.forRoot(),

    // Program (Artists, Stages, Performances)
    ProgramModule,

    // Notifications (Push + In-app)
    NotificationsModule,

    // Zones (Access Control)
    ZonesModule,

    // Vendors (Food & Drinks)
    VendorsModule,

    // Camping / Accommodation
    CampingModule,

    // Email Service
    MailModule,

    // Support & FAQ
    SupportModule,

    // Analytics (Real-time Dashboard & WebSocket)
    AnalyticsModule,

    // Error Monitoring (Sentry)
    SentryModule,
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
    // Note: CustomThrottlerGuard is registered globally via ThrottlerModule
    // Rate limits: Global(100/min), Auth(5/min), Payment(10/min), Public(200/min), Strict(3/5min)
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply Sentry user context middleware to all routes
    consumer.apply(SentryUserMiddleware).forRoutes('*');
  }
}
