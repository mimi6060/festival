/**
 * Fixer.io Exchange Rate Provider
 *
 * Exchange rate data from Fixer.io (by APILayer).
 * Free tier: EUR base only, 100 requests/month
 * Paid tiers: Multiple base currencies, more requests, SSL
 *
 * @see https://fixer.io/
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BaseExchangeRateProvider,
  ProviderInfo,
  ProviderRateData,
} from './exchange-rate-provider.interface';
import { SupportedCurrency } from '../dto';

const FIXER_API_URL = 'http://data.fixer.io/api';
const FIXER_API_URL_SSL = 'https://data.fixer.io/api';

@Injectable()
export class FixerProvider extends BaseExchangeRateProvider {
  private readonly logger = new Logger(FixerProvider.name);
  private readonly apiKey: string | undefined;
  private readonly useSSL: boolean;

  constructor(private readonly configService: ConfigService) {
    super();
    this.apiKey = this.configService.get<string>('FIXER_API_KEY');
    this.useSSL = this.configService.get<boolean>('FIXER_USE_SSL', false);
  }

  getInfo(): ProviderInfo {
    return {
      id: 'fixer',
      name: 'Fixer.io',
      website: 'https://fixer.io',
      requiresApiKey: true,
      rateLimitPerHour: 4, // ~100/month = ~3.3/day, but we allow small bursts
      supportedBaseCurrencies: this.hasMultiBaseSupport()
        ? [SupportedCurrency.EUR, SupportedCurrency.USD, SupportedCurrency.GBP, SupportedCurrency.CHF]
        : [SupportedCurrency.EUR], // Free tier only supports EUR
      maxHistoricalDays: 365,
      reliabilityScore: 85,
    };
  }

  getPriority(): number {
    return 3; // Third priority
  }

  isAvailable(): boolean {
    return !!this.apiKey && super.isAvailable();
  }

  async fetchRates(baseCurrency: SupportedCurrency): Promise<ProviderRateData> {
    if (!this.apiKey) {
      throw new Error('Fixer.io API key not configured');
    }

    const startTime = Date.now();

    try {
      // Free tier only supports EUR base
      const useBase = this.hasMultiBaseSupport() ? baseCurrency : SupportedCurrency.EUR;
      const baseUrl = this.useSSL ? FIXER_API_URL_SSL : FIXER_API_URL;
      const symbols = Object.values(SupportedCurrency).join(',');

      const url = `${baseUrl}/latest?access_key=${this.apiKey}&base=${useBase}&symbols=${symbols}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FestivalAPI/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Fixer API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as {
        success: boolean;
        timestamp: number;
        base: string;
        date: string;
        rates: Record<string, number>;
        error?: { code: number; type: string; info: string };
      };

      if (!data.success) {
        throw new Error(`Fixer API error: ${data.error?.info || 'Unknown error'}`);
      }

      let rates = this.filterSupportedCurrencies(data.rates);

      // If we had to use EUR base but wanted different base, convert rates
      if (useBase !== baseCurrency) {
        rates = this.convertBase(rates, useBase, baseCurrency);
      }

      const latencyMs = Date.now() - startTime;
      this.recordSuccess(latencyMs);

      this.logger.debug(`Fixer rates fetched in ${latencyMs}ms`);

      return {
        baseCurrency,
        rates,
        timestamp: new Date(data.timestamp * 1000),
        provider: 'fixer',
        fromCache: false,
      };
    } catch (error) {
      const err = error as Error;
      this.recordError(err);
      this.logger.error(`Fixer fetch failed: ${err.message}`);
      throw error;
    }
  }

  async fetchHistoricalRates(
    baseCurrency: SupportedCurrency,
    date: Date,
  ): Promise<ProviderRateData> {
    if (!this.apiKey) {
      throw new Error('Fixer.io API key not configured');
    }

    const startTime = Date.now();

    try {
      const dateStr = this.formatDate(date);
      const useBase = this.hasMultiBaseSupport() ? baseCurrency : SupportedCurrency.EUR;
      const baseUrl = this.useSSL ? FIXER_API_URL_SSL : FIXER_API_URL;
      const symbols = Object.values(SupportedCurrency).join(',');

      const url = `${baseUrl}/${dateStr}?access_key=${this.apiKey}&base=${useBase}&symbols=${symbols}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FestivalAPI/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Fixer API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as {
        success: boolean;
        timestamp: number;
        historical: boolean;
        base: string;
        date: string;
        rates: Record<string, number>;
        error?: { code: number; type: string; info: string };
      };

      if (!data.success) {
        throw new Error(`Fixer API error: ${data.error?.info || 'Unknown error'}`);
      }

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
        timestamp: new Date(data.date),
        provider: 'fixer',
        fromCache: false,
      };
    } catch (error) {
      const err = error as Error;
      this.recordError(err);
      this.logger.error(`Fixer historical fetch failed: ${err.message}`);
      throw error;
    }
  }

  /**
   * Check if we have multi-base support (paid tier)
   */
  private hasMultiBaseSupport(): boolean {
    return this.configService.get<boolean>('FIXER_MULTI_BASE', false);
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
