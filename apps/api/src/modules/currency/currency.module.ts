/**
 * Currency Module
 *
 * Provides multi-currency support for the Festival platform:
 * - Currency conversion with real-time exchange rates
 * - Multiple exchange rate providers with failover
 * - Price formatting for different locales
 * - Festival-specific currency settings
 * - Rate alerts and volatility tracking
 * - Scheduled rate updates
 * - Redis-cached exchange rates (15 min TTL)
 * - Database fallback for rate storage
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import { ExchangeRateService } from './services/exchange-rate.service';
import { ExchangeRateScheduler } from './services/exchange-rate-scheduler';
import { RateAlertService } from './services/rate-alert.service';
import {
  EXCHANGE_RATE_PROVIDERS,
  EcbProvider,
  OpenExchangeProvider,
  FixerProvider,
  FallbackProvider,
} from './providers';
import { currencyConfig } from './currency.config';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(currencyConfig),
    PrismaModule,
  ],
  controllers: [CurrencyController],
  providers: [
    // Services
    CurrencyService,
    ExchangeRateService,
    ExchangeRateScheduler,
    RateAlertService,

    // Providers
    EcbProvider,
    OpenExchangeProvider,
    FixerProvider,
    FallbackProvider,

    // Provider injection token
    {
      provide: EXCHANGE_RATE_PROVIDERS,
      useFactory: (
        ecbProvider: EcbProvider,
        openExchangeProvider: OpenExchangeProvider,
        fixerProvider: FixerProvider,
        fallbackProvider: FallbackProvider,
        configService: ConfigService,
      ) => {
        const providers: any[] = [];

        // Add ECB provider if enabled
        if (configService.get<boolean>('currency.providers.ecb.enabled', true)) {
          providers.push(ecbProvider);
        }

        // Add OpenExchange provider if API key is configured
        if (configService.get<string>('currency.providers.openexchange.apiKey')) {
          providers.push(openExchangeProvider);
        }

        // Add Fixer provider if API key is configured
        if (configService.get<string>('currency.providers.fixer.apiKey')) {
          providers.push(fixerProvider);
        }

        // Always add fallback provider
        providers.push(fallbackProvider);

        return providers;
      },
      inject: [
        EcbProvider,
        OpenExchangeProvider,
        FixerProvider,
        FallbackProvider,
        ConfigService,
      ],
    },
  ],
  exports: [
    CurrencyService,
    ExchangeRateService,
    ExchangeRateScheduler,
    RateAlertService,
  ],
})
export class CurrencyModule {}
