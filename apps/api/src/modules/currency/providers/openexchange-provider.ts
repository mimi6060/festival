/**
 * Open Exchange Rates Provider
 *
 * Exchange rate data from Open Exchange Rates.
 * Free tier: USD base only, 1000 requests/month
 * Paid tiers: Multiple base currencies, more requests
 *
 * @see https://openexchangerates.org/
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BaseExchangeRateProvider,
  ProviderInfo,
  ProviderRateData,
} from './exchange-rate-provider.interface';
import { SupportedCurrency } from '../dto';

const OPENEXCHANGE_API_URL = 'https://openexchangerates.org/api';

@Injectable()
export class OpenExchangeProvider extends BaseExchangeRateProvider {
  private readonly logger = new Logger(OpenExchangeProvider.name);
  private readonly apiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    super();
    this.apiKey = this.configService.get<string>('OPENEXCHANGE_API_KEY');
  }

  getInfo(): ProviderInfo {
    return {
      id: 'openexchange',
      name: 'Open Exchange Rates',
      website: 'https://openexchangerates.org',
      requiresApiKey: true,
      rateLimitPerHour: 83, // ~1000/month = ~33/day = ~1.4/hour, but we allow bursts
      supportedBaseCurrencies: this.apiKey
        ? [SupportedCurrency.EUR, SupportedCurrency.USD, SupportedCurrency.GBP, SupportedCurrency.CHF]
        : [SupportedCurrency.USD], // Free tier only supports USD
      maxHistoricalDays: 365,
      reliabilityScore: 90,
    };
  }

  getPriority(): number {
    return 2; // Second priority
  }

  isAvailable(): boolean {
    return !!this.apiKey && super.isAvailable();
  }

  async fetchRates(baseCurrency: SupportedCurrency): Promise<ProviderRateData> {
    if (!this.apiKey) {
      throw new Error('Open Exchange Rates API key not configured');
    }

    const startTime = Date.now();

    try {
      // Free tier only supports USD base
      const useBase = this.hasMultiBaseSupport() ? baseCurrency : SupportedCurrency.USD;

      const url = `${OPENEXCHANGE_API_URL}/latest.json?app_id=${this.apiKey}&base=${useBase}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FestivalAPI/1.0',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenExchange API returned ${response.status}: ${errorBody}`);
      }

      const data = await response.json() as {
        timestamp: number;
        base: string;
        rates: Record<string, number>;
      };

      let rates = this.filterSupportedCurrencies(data.rates);

      // If we had to use USD base but wanted EUR, convert rates
      if (useBase !== baseCurrency) {
        rates = this.convertBase(rates, useBase, baseCurrency);
      }

      const latencyMs = Date.now() - startTime;
      this.recordSuccess(latencyMs);

      this.logger.debug(`OpenExchange rates fetched in ${latencyMs}ms`);

      return {
        baseCurrency,
        rates,
        timestamp: new Date(data.timestamp * 1000),
        provider: 'openexchange',
        fromCache: false,
      };
    } catch (error) {
      const err = error as Error;
      this.recordError(err);
      this.logger.error(`OpenExchange fetch failed: ${err.message}`);
      throw error;
    }
  }

  async fetchHistoricalRates(
    baseCurrency: SupportedCurrency,
    date: Date,
  ): Promise<ProviderRateData> {
    if (!this.apiKey) {
      throw new Error('Open Exchange Rates API key not configured');
    }

    const startTime = Date.now();

    try {
      const dateStr = this.formatDate(date);
      const useBase = this.hasMultiBaseSupport() ? baseCurrency : SupportedCurrency.USD;

      const url = `${OPENEXCHANGE_API_URL}/historical/${dateStr}.json?app_id=${this.apiKey}&base=${useBase}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FestivalAPI/1.0',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenExchange API returned ${response.status}: ${errorBody}`);
      }

      const data = await response.json() as {
        timestamp: number;
        base: string;
        rates: Record<string, number>;
      };

      let rates = this.filterSupportedCurrencies(data.rates);

      // Convert base if needed
      if (useBase !== baseCurrency) {
        rates = this.convertBase(rates, useBase, baseCurrency);
      }

      const latencyMs = Date.now() - startTime;
      this.recordSuccess(latencyMs);

      return {
        baseCurrency,
        rates,
        timestamp: date,
        provider: 'openexchange',
        fromCache: false,
      };
    } catch (error) {
      const err = error as Error;
      this.recordError(err);
      this.logger.error(`OpenExchange historical fetch failed: ${err.message}`);
      throw error;
    }
  }

  /**
   * Check if we have multi-base support (paid tier)
   */
  private hasMultiBaseSupport(): boolean {
    // Could check account features via API, but for simplicity assume paid tier
    // if API key contains specific prefix or via config
    return this.configService.get<boolean>('OPENEXCHANGE_MULTI_BASE', false);
  }

  /**
   * Filter rates to only include supported currencies
   */
  private filterSupportedCurrencies(rates: Record<string, number>): Record<string, number> {
    const filtered: Record<string, number> = {};
    const supported = Object.values(SupportedCurrency);

    for (const [currency, rate] of Object.entries(rates)) {
      if (supported.includes(currency as SupportedCurrency)) {
        filtered[currency] = rate;
      }
    }

    return filtered;
  }

  /**
   * Convert rates from one base currency to another
   */
  private convertBase(
    rates: Record<string, number>,
    fromBase: SupportedCurrency,
    toBase: SupportedCurrency,
  ): Record<string, number> {
    const conversionRate = rates[toBase];
    if (!conversionRate) {
      throw new Error(`Cannot convert to ${toBase}: rate not available`);
    }

    const converted: Record<string, number> = {};
    for (const [currency, rate] of Object.entries(rates)) {
      if (currency === toBase) {
        converted[currency] = 1.0;
      } else if (currency === fromBase) {
        converted[currency] = 1 / conversionRate;
      } else {
        converted[currency] = rate / conversionRate;
      }
    }

    return converted;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
