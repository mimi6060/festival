/**
 * European Central Bank (ECB) Exchange Rate Provider
 *
 * Free exchange rate data from the European Central Bank.
 * Base currency is always EUR.
 * Updates daily around 16:00 CET.
 *
 * @see https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  BaseExchangeRateProvider,
  ProviderInfo,
  ProviderRateData,
} from './exchange-rate-provider.interface';
import { SupportedCurrency } from '../dto';

// ECB XML endpoint
const ECB_DAILY_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const ECB_HISTORICAL_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml';

@Injectable()
export class EcbProvider extends BaseExchangeRateProvider {
  private readonly logger = new Logger(EcbProvider.name);

  getInfo(): ProviderInfo {
    return {
      id: 'ecb',
      name: 'European Central Bank',
      website: 'https://www.ecb.europa.eu',
      requiresApiKey: false,
      rateLimitPerHour: 1000, // No strict limit, but be respectful
      supportedBaseCurrencies: [SupportedCurrency.EUR],
      maxHistoricalDays: 90,
      reliabilityScore: 95, // Very reliable but only EUR base
    };
  }

  getPriority(): number {
    return 1; // Highest priority (free and reliable)
  }

  async fetchRates(baseCurrency: SupportedCurrency): Promise<ProviderRateData> {
    if (baseCurrency !== SupportedCurrency.EUR) {
      throw new Error('ECB only supports EUR as base currency');
    }

    const startTime = Date.now();

    try {
      const response = await fetch(ECB_DAILY_URL, {
        headers: {
          'Accept': 'application/xml',
          'User-Agent': 'FestivalAPI/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`ECB API returned ${response.status}: ${response.statusText}`);
      }

      const xml = await response.text();
      const rates = this.parseEcbXml(xml);
      const timestamp = this.extractTimestamp(xml);

      const latencyMs = Date.now() - startTime;
      this.recordSuccess(latencyMs);

      this.logger.debug(`ECB rates fetched in ${latencyMs}ms`);

      return {
        baseCurrency: SupportedCurrency.EUR,
        rates,
        timestamp,
        provider: 'ecb',
        fromCache: false,
      };
    } catch (error) {
      const err = error as Error;
      this.recordError(err);
      this.logger.error(`ECB fetch failed: ${err.message}`);
      throw error;
    }
  }

  async fetchHistoricalRates(
    baseCurrency: SupportedCurrency,
    date: Date,
  ): Promise<ProviderRateData> {
    if (baseCurrency !== SupportedCurrency.EUR) {
      throw new Error('ECB only supports EUR as base currency');
    }

    const startTime = Date.now();

    try {
      const response = await fetch(ECB_HISTORICAL_URL, {
        headers: {
          'Accept': 'application/xml',
          'User-Agent': 'FestivalAPI/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`ECB API returned ${response.status}: ${response.statusText}`);
      }

      const xml = await response.text();
      const historicalData = this.parseHistoricalXml(xml);

      // Find the closest date
      const dateStr = this.formatDate(date);
      let rates = historicalData[dateStr];

      // If exact date not found, find nearest previous date
      if (!rates) {
        const dates = Object.keys(historicalData).sort().reverse();
        for (const d of dates) {
          if (d <= dateStr) {
            rates = historicalData[d];
            break;
          }
        }
      }

      if (!rates) {
        throw new Error(`No historical rates found for ${dateStr}`);
      }

      const latencyMs = Date.now() - startTime;
      this.recordSuccess(latencyMs);

      return {
        baseCurrency: SupportedCurrency.EUR,
        rates,
        timestamp: date,
        provider: 'ecb',
        fromCache: false,
      };
    } catch (error) {
      const err = error as Error;
      this.recordError(err);
      this.logger.error(`ECB historical fetch failed: ${err.message}`);
      throw error;
    }
  }

  /**
   * Parse ECB XML response for current rates
   */
  private parseEcbXml(xml: string): Record<string, number> {
    const rates: Record<string, number> = { EUR: 1.0 };

    // Parse XML using regex (simple approach for known format)
    const cubeRegex = /<Cube currency='([A-Z]{3})' rate='([\d.]+)'\/>/g;
    let match;

    while ((match = cubeRegex.exec(xml)) !== null) {
      const [, currency, rate] = match;
      rates[currency] = parseFloat(rate);
    }

    return rates;
  }

  /**
   * Parse ECB historical XML
   */
  private parseHistoricalXml(xml: string): Record<string, Record<string, number>> {
    const historicalData: Record<string, Record<string, number>> = {};

    // Match time cube with nested currency cubes
    const timeCubeRegex = /<Cube time='(\d{4}-\d{2}-\d{2})'>([\s\S]*?)<\/Cube>/g;
    const currencyRegex = /<Cube currency='([A-Z]{3})' rate='([\d.]+)'\/>/g;

    let timeMatch;
    while ((timeMatch = timeCubeRegex.exec(xml)) !== null) {
      const [, date, content] = timeMatch;
      const rates: Record<string, number> = { EUR: 1.0 };

      let currencyMatch;
      while ((currencyMatch = currencyRegex.exec(content)) !== null) {
        const [, currency, rate] = currencyMatch;
        rates[currency] = parseFloat(rate);
      }

      historicalData[date] = rates;
    }

    return historicalData;
  }

  /**
   * Extract timestamp from ECB XML
   */
  private extractTimestamp(xml: string): Date {
    const timeMatch = xml.match(/<Cube time='(\d{4}-\d{2}-\d{2})'>/);
    if (timeMatch) {
      return new Date(timeMatch[1]);
    }
    return new Date();
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
