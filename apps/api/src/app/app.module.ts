import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Configuration
import { validationSchema, validationOptions } from '../config';

// Core modules
import { PrismaModule } from '../modules/prisma';
import { AuthModule } from '../modules/auth';
import { HealthModule } from '../modules/health';
import { CacheModule } from '../modules/cache';
import { LoggerModule } from '../modules/logger';

// Feature modules
import { UsersModule } from '../modules/users';
import { FestivalsModule } from '../modules/festivals';
import { VendorsModule } from '../modules/vendors';
import { ZonesModule } from '../modules/zones';
import { StaffModule } from '../modules/staff';
import { CampingModule } from '../modules/camping';
import { TicketsModule } from '../modules/tickets';
import { CashlessModule } from '../modules/cashless';
import { ProgramModule } from '../modules/program';

// Service modules
import { EmailModule } from '../modules/email';
import { NotificationsModule } from '../modules/notifications';
import { PdfModule } from '../modules/pdf';
import { AnalyticsModule } from '../modules/analytics';
import { SupportModule } from '../modules/support';
import { GdprModule } from '../modules/gdpr';

// Guards
import { RateLimitGuard } from '../common/guards';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema,
      validationOptions,
    }),
    EventEmitterModule.forRoot(),

    // Logger (must be imported early for proper logging)
    LoggerModule,

    // Core modules
    PrismaModule,
    AuthModule,
    HealthModule,
    CacheModule,

    // Feature modules
    UsersModule,
    FestivalsModule,
    VendorsModule,
    ZonesModule,
    StaffModule,
    CampingModule,
    TicketsModule,
    CashlessModule,
    ProgramModule,

    // Service modules
    EmailModule,
    NotificationsModule,
    PdfModule,
    AnalyticsModule,
    SupportModule,
    GdprModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limit guard - applies to all routes
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
