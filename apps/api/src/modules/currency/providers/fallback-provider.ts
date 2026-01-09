/**
 * Fallback Static Rates Provider
 *
 * Provides hardcoded exchange rates as a last resort
 * when all other providers fail. These rates are approximate
 * and should only be used for emergency fallback.
 *
 * Rates are updated manually and may not reflect current market conditions.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  BaseExchangeRateProvider,
  ProviderInfo,
  ProviderRateData,
} from './exchange-rate-provider.interface';
import { SupportedCurrency } from '../dto';

/**
 * Static fallback rates with EUR as base
 * These rates should be updated periodically to reflect market conditions
 * Last updated: 2026-01-09
 */
const FALLBACK_RATES: Record<SupportedCurrency, Record<SupportedCurrency, number>> = {
  [SupportedCurrency.EUR]: {
    [SupportedCurrency.EUR]: 1.0,
    [SupportedCurrency.USD]: 1.085,
    [SupportedCurrency.GBP]: 0.855,
    [SupportedCurrency.CHF]: 0.945,
  },
  [SupportedCurrency.USD]: {
    [SupportedCurrency.EUR]: 0.9217,
    [SupportedCurrency.USD]: 1.0,
    [SupportedCurrency.GBP]: 0.788,
    [SupportedCurrency.CHF]: 0.871,
  },
  [SupportedCurrency.GBP]: {
    [SupportedCurrency.EUR]: 1.170,
    [SupportedCurrency.USD]: 1.269,
    [SupportedCurrency.GBP]: 1.0,
    [SupportedCurrency.CHF]: 1.105,
  },
  [SupportedCurrency.CHF]: {
    [SupportedCurrency.EUR]: 1.058,
    [SupportedCurrency.USD]: 1.148,
    [SupportedCurrency.GBP]: 0.905,
    [SupportedCurrency.CHF]: 1.0,
  },
};

/**
 * Date when fallback rates were last updated
 */
const FALLBACK_RATES_DATE = new Date('2026-01-09T00:00:00Z');

@Injectable()
export class FallbackProvider extends BaseExchangeRateProvider {
  private readonly logger = new Logger(FallbackProvider.name);
  private warningLogged = false;

  getInfo(): ProviderInfo {
    return {
      id: 'fallback',
      name: 'Static Fallback Rates',
      website: 'internal',
      requiresApiKey: false,
      rateLimitPerHour: Number.MAX_SAFE_INTEGER, // No limit
      supportedBaseCurrencies: [
        SupportedCurrency.EUR,
        SupportedCurrency.USD,
        SupportedCurrency.GBP,
        SupportedCurrency.CHF,
      ],
      maxHistoricalDays: 0, // No historical data
      reliabilityScore: 50, // Low reliability score
    };
  }

  getPriority(): number {
    return 999; // Lowest priority - only use as last resort
  }

  isAvailable(): boolean {
    return true; // Always available
  }

  async fetchRates(baseCurrency: SupportedCurrency): Promise<ProviderRateData> {
    // Log a warning (once) that fallback rates are being used
    if (!this.warningLogged) {
      this.logger.warn(
        'Using static fallback exchange rates. ' +
        'These rates may not reflect current market conditions. ' +
        'Please check external provider configurations.',
      );
      this.warningLogged = true;
    }

    const startTime = Date.now();

    const rates = { ...FALLBACK_RATES[baseCurrency] };

    const latencyMs = Date.now() - startTime;
    this.recordSuccess(latencyMs);

    return {
      baseCurrency,
      rates,
      timestamp: FALLBACK_RATES_DATE,
      provider: 'fallback',
      fromCache: false,
    };
  }

  async fetchHistoricalRates(
    baseCurrency: SupportedCurrency,
    date: Date,
  ): Promise<ProviderRateData> {
    // Fallback provider doesn't have historical data
    // Return the static rates with a warning
    this.logger.warn(
      `Historical rates requested for ${date.toISOString()} but fallback provider ` +
      'does not support historical data. Returning static rates.',
    );

    return this.fetchRates(baseCurrency);
  }

  async testConnection(): Promise<boolean> {
    // Always returns true - static data is always available
    return true;
  }

  /**
   * Get the date when fallback rates were last updated
   */
  getRatesDate(): Date {
    return FALLBACK_RATES_DATE;
  }

  /**
   * Get all available fallback rates
   */
  getAllRates(): Record<SupportedCurrency, Record<SupportedCurrency, number>> {
    return { ...FALLBACK_RATES };
  }

  /**
   * Check how stale the fallback rates are
   */
  getRatesAgeDays(): number {
    const now = new Date();
    const diff = now.getTime() - FALLBACK_RATES_DATE.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Returns warning if rates are too old
   */
  getStaleWarning(): string | null {
    const ageDays = this.getRatesAgeDays();
    if (ageDays > 30) {
      return `Fallback rates are ${ageDays} days old. Consider updating them.`;
    }
    if (ageDays > 7) {
      return `Fallback rates are ${ageDays} days old.`;
    }
    return null;
  }
}
