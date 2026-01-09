/**
 * Exchange Rate Service
 *
 * Enhanced service for fetching and managing exchange rates.
 * Features:
 * - Provider failover with priority ordering
 * - Rate smoothing to avoid sudden jumps
 * - Rate confidence scoring
 * - Historical rate tracking
 * - Redis caching with 15 min TTL
 * - Database fallback if all providers fail
 */

import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService, CacheTag } from '../../cache/cache.service';
import { SupportedCurrency } from '../dto';
import { Currency } from '@prisma/client';
import {
  IExchangeRateProvider,
  EXCHANGE_RATE_PROVIDERS,
  ProviderRateData,
  ProviderHealth,
} from '../providers';

// Cache TTL in seconds
const RATE_CACHE_TTL = 900; // 15 minutes

// Rate smoothing configuration
const SMOOTHING_WEIGHT = 0.3; // Weight for new rate (0.3 = 30% new, 70% old)
const MAX_RATE_CHANGE_PERCENT = 5; // Maximum allowed rate change before flagging

export interface ExchangeRateResult {
  baseCurrency: SupportedCurrency;
  targetCurrency: SupportedCurrency;
  rate: number;
  inverseRate: number;
  source: string;
  effectiveAt: Date;
  id?: string;
  confidence?: number;
  smoothed?: boolean;
}

export interface RatesBatch {
  baseCurrency: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
  source: string;
  timestamp: Date;
  provider?: string;
  confidence?: number;
}

export interface LiveRatesResponse {
  baseCurrency: SupportedCurrency;
  rates: Record<SupportedCurrency, {
    rate: number;
    change24h?: number;
    changePercent24h?: number;
    confidence: number;
  }>;
  provider: string;
  timestamp: Date;
  nextUpdate: Date;
  fromCache: boolean;
}

export interface VolatilityMetrics {
  currency: SupportedCurrency;
  period: string;
  averageRate: number;
  minRate: number;
  maxRate: number;
  standardDeviation: number;
  volatilityIndex: number; // 0-100 scale
  changePercent: number;
}

export interface ProviderStatus {
  id: string;
  name: string;
  available: boolean;
  priority: number;
  health: ProviderHealth;
  lastUsed?: Date;
}

@Injectable()
export class ExchangeRateService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly baseCurrency = SupportedCurrency.EUR;

  // Provider tracking
  private lastUsedProvider: string | null = null;
  private lastFetchTimestamp: Date | null = null;
  private consecutiveFailures: Record<string, number> = {};

  // Rate smoothing cache
  private previousRates: Record<string, number> = {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    @Inject(EXCHANGE_RATE_PROVIDERS)
    private readonly providers: IExchangeRateProvider[],
  ) {
    // Sort providers by priority
    this.providers.sort((a, b) => a.getPriority() - b.getPriority());
  }

  /**
   * Initialize exchange rates on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.refreshRates();
      this.logger.log('Exchange rates initialized');
    } catch (error) {
      this.logger.warn(`Failed to initialize exchange rates: ${(error as Error).message}`);
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Exchange rate service shutting down');
  }

  /**
   * Get exchange rate for a currency pair
   */
  async getRate(
    from: SupportedCurrency,
    to: SupportedCurrency,
    date?: Date,
  ): Promise<ExchangeRateResult> {
    // Same currency, no conversion needed
    if (from === to) {
      return {
        baseCurrency: from,
        targetCurrency: to,
        rate: 1,
        inverseRate: 1,
        source: 'identity',
        effectiveAt: new Date(),
        confidence: 100,
      };
    }

    // Try to get from cache first
    const cacheKey = `exchange_rate:${from}:${to}`;
    const cached = await this.cacheService.get<ExchangeRateResult>(cacheKey);
    if (cached && !date) {
      return cached;
    }

    // Try to get from database
    const dbRate = await this.getRateFromDatabase(from, to, date);
    if (dbRate) {
      // Cache the result
      if (!date) {
        await this.cacheService.set(cacheKey, dbRate, {
          ttl: RATE_CACHE_TTL,
          tags: [CacheTag.CONFIG],
        });
      }
      return dbRate;
    }

    // If we need EUR as intermediate currency
    if (from !== SupportedCurrency.EUR && to !== SupportedCurrency.EUR) {
      // Cross-rate: EUR -> from -> to
      const fromRate = await this.getRate(SupportedCurrency.EUR, from, date);
      const toRate = await this.getRate(SupportedCurrency.EUR, to, date);
      const crossRate = toRate.rate / fromRate.rate;

      // Calculate confidence as minimum of the two rates
      const confidence = Math.min(fromRate.confidence || 80, toRate.confidence || 80);

      return {
        baseCurrency: from,
        targetCurrency: to,
        rate: crossRate,
        inverseRate: 1 / crossRate,
        source: 'cross-rate',
        effectiveAt: new Date(),
        confidence,
      };
    }

    // Fallback rates from fallback provider
    const fallbackRate = await this.getFallbackRate(from, to);
    this.logger.warn(`Using fallback rate for ${from}->${to}: ${fallbackRate}`);

    return {
      baseCurrency: from,
      targetCurrency: to,
      rate: fallbackRate,
      inverseRate: 1 / fallbackRate,
      source: 'fallback',
      effectiveAt: new Date(),
      confidence: 50,
    };
  }

  /**
   * Get all current exchange rates from base currency
   */
  async getAllRates(): Promise<RatesBatch> {
    const cacheKey = `exchange_rates:all:${this.baseCurrency}`;
    const cached = await this.cacheService.get<RatesBatch>(cacheKey);
    if (cached) {
      return cached;
    }

    const rates: Record<SupportedCurrency, number> = {
      [SupportedCurrency.EUR]: 1.0,
      [SupportedCurrency.USD]: 1.0,
      [SupportedCurrency.GBP]: 1.0,
      [SupportedCurrency.CHF]: 1.0,
    };

    // Fetch rates for each supported currency
    for (const currency of Object.values(SupportedCurrency)) {
      if (currency === this.baseCurrency) {
        rates[currency] = 1.0;
        continue;
      }

      const rate = await this.getRate(this.baseCurrency, currency);
      rates[currency] = rate.rate;
    }

    const result: RatesBatch = {
      baseCurrency: this.baseCurrency,
      rates,
      source: 'mixed',
      timestamp: new Date(),
    };

    await this.cacheService.set(cacheKey, result, {
      ttl: RATE_CACHE_TTL,
      tags: [CacheTag.CONFIG],
    });

    return result;
  }

  /**
   * Get live rates with metadata
   */
  async getLiveRates(baseCurrency: SupportedCurrency = SupportedCurrency.EUR): Promise<LiveRatesResponse> {
    const cacheKey = `live_rates:${baseCurrency}`;
    const cached = await this.cacheService.get<LiveRatesResponse>(cacheKey);

    if (cached) {
      return { ...cached, fromCache: true };
    }

    // Fetch fresh rates
    const rateData = await this.fetchFromProviders(baseCurrency);

    // Get 24h old rates for comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const rates: Record<SupportedCurrency, {
      rate: number;
      change24h?: number;
      changePercent24h?: number;
      confidence: number;
    }> = {} as any;

    for (const currency of Object.values(SupportedCurrency)) {
      const currentRate = rateData.rates[currency] || 1;
      const oldRate = await this.getRateFromDatabase(baseCurrency, currency, yesterday);

      let change24h: number | undefined;
      let changePercent24h: number | undefined;

      if (oldRate) {
        change24h = currentRate - oldRate.rate;
        changePercent24h = ((currentRate - oldRate.rate) / oldRate.rate) * 100;
      }

      rates[currency] = {
        rate: currentRate,
        change24h,
        changePercent24h,
        confidence: this.calculateConfidence(rateData.provider, currency),
      };
    }

    const result: LiveRatesResponse = {
      baseCurrency,
      rates,
      provider: rateData.provider,
      timestamp: rateData.timestamp,
      nextUpdate: new Date(Date.now() + RATE_CACHE_TTL * 1000),
      fromCache: false,
    };

    await this.cacheService.set(cacheKey, result, {
      ttl: RATE_CACHE_TTL,
      tags: [CacheTag.CONFIG],
    });

    return result;
  }

  /**
   * Refresh exchange rates from external providers
   */
  async refreshRates(): Promise<void> {
    try {
      const rates = await this.fetchFromProviders(this.baseCurrency);
      const smoothedRates = this.applyRateSmoothing(rates);
      await this.storeRates(smoothedRates);
      await this.invalidateRateCache();
      this.lastFetchTimestamp = new Date();
      this.logger.log(`Exchange rates refreshed from ${rates.provider}`);
    } catch (error) {
      this.logger.error(`Failed to refresh rates: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Manually set an exchange rate
   */
  async setManualRate(
    baseCurrency: SupportedCurrency,
    targetCurrency: SupportedCurrency,
    rate: number,
  ): Promise<ExchangeRateResult> {
    const inverseRate = 1 / rate;

    const dbRate = await this.prisma.exchangeRate.create({
      data: {
        baseCurrency: baseCurrency as Currency,
        targetCurrency: targetCurrency as Currency,
        rate,
        inverseRate,
        source: 'manual',
        effectiveAt: new Date(),
        isActive: true,
      },
    });

    // Invalidate cache
    await this.invalidateRateCache();

    return {
      id: dbRate.id,
      baseCurrency,
      targetCurrency,
      rate: Number(dbRate.rate),
      inverseRate: Number(dbRate.inverseRate),
      source: dbRate.source,
      effectiveAt: dbRate.effectiveAt,
      confidence: 100, // Manual rates have full confidence
    };
  }

  /**
   * Get historical rates for a currency pair
   */
  async getHistoricalRates(
    baseCurrency: SupportedCurrency,
    targetCurrency: SupportedCurrency,
    startDate: Date,
    endDate: Date,
  ): Promise<ExchangeRateResult[]> {
    const rates = await this.prisma.exchangeRate.findMany({
      where: {
        baseCurrency: baseCurrency as Currency,
        targetCurrency: targetCurrency as Currency,
        effectiveAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { effectiveAt: 'asc' },
    });

    return rates.map((r) => ({
      id: r.id,
      baseCurrency: r.baseCurrency as SupportedCurrency,
      targetCurrency: r.targetCurrency as SupportedCurrency,
      rate: Number(r.rate),
      inverseRate: Number(r.inverseRate),
      source: r.source,
      effectiveAt: r.effectiveAt,
    }));
  }

  /**
   * Get historical rates for a single currency
   */
  async getHistoricalRatesForCurrency(
    currency: SupportedCurrency,
    days: number = 30,
  ): Promise<ExchangeRateResult[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getHistoricalRates(this.baseCurrency, currency, startDate, endDate);
  }

  /**
   * Get volatility metrics for a currency
   */
  async getVolatilityMetrics(
    currency: SupportedCurrency,
    days: number = 30,
  ): Promise<VolatilityMetrics> {
    const historicalRates = await this.getHistoricalRatesForCurrency(currency, days);

    if (historicalRates.length === 0) {
      return {
        currency,
        period: `${days}d`,
        averageRate: 0,
        minRate: 0,
        maxRate: 0,
        standardDeviation: 0,
        volatilityIndex: 0,
        changePercent: 0,
      };
    }

    const rates = historicalRates.map((r) => r.rate);
    const averageRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);

    // Calculate standard deviation
    const squaredDiffs = rates.map((r) => Math.pow(r - averageRate, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / rates.length;
    const standardDeviation = Math.sqrt(avgSquaredDiff);

    // Volatility index (coefficient of variation normalized to 0-100)
    const coefficientOfVariation = (standardDeviation / averageRate) * 100;
    const volatilityIndex = Math.min(100, coefficientOfVariation * 10);

    // Percent change over period
    const firstRate = rates[0];
    const lastRate = rates[rates.length - 1];
    const changePercent = ((lastRate - firstRate) / firstRate) * 100;

    return {
      currency,
      period: `${days}d`,
      averageRate,
      minRate,
      maxRate,
      standardDeviation,
      volatilityIndex,
      changePercent,
    };
  }

  /**
   * Get provider statuses
   */
  getProviderStatuses(): ProviderStatus[] {
    return this.providers.map((provider) => ({
      id: provider.getInfo().id,
      name: provider.getInfo().name,
      available: provider.isAvailable(),
      priority: provider.getPriority(),
      health: provider.getHealth(),
      lastUsed: this.lastUsedProvider === provider.getInfo().id
        ? this.lastFetchTimestamp || undefined
        : undefined,
    }));
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Fetch rates from providers with failover
   */
  private async fetchFromProviders(baseCurrency: SupportedCurrency): Promise<ProviderRateData> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      const info = provider.getInfo();

      // Skip unavailable providers
      if (!provider.isAvailable()) {
        this.logger.debug(`Provider ${info.id} is not available, skipping`);
        continue;
      }

      // Skip providers with too many consecutive failures
      if ((this.consecutiveFailures[info.id] || 0) >= 3) {
        this.logger.debug(`Provider ${info.id} has too many failures, skipping`);
        continue;
      }

      try {
        const data = await provider.fetchRates(baseCurrency);
        this.consecutiveFailures[info.id] = 0;
        this.lastUsedProvider = info.id;
        this.logger.debug(`Successfully fetched rates from ${info.id}`);
        return data;
      } catch (error) {
        const err = error as Error;
        this.consecutiveFailures[info.id] = (this.consecutiveFailures[info.id] || 0) + 1;
        errors.push(`${info.id}: ${err.message}`);
        this.logger.warn(`Provider ${info.id} failed: ${err.message}`);
      }
    }

    throw new Error(`All providers failed: ${errors.join('; ')}`);
  }

  /**
   * Apply rate smoothing to avoid sudden jumps
   */
  private applyRateSmoothing(data: ProviderRateData): ProviderRateData {
    const smoothedRates: Record<string, number> = {};

    for (const [currency, newRate] of Object.entries(data.rates)) {
      const key = `${data.baseCurrency}:${currency}`;
      const previousRate = this.previousRates[key];

      if (previousRate) {
        // Calculate percent change
        const changePercent = Math.abs((newRate - previousRate) / previousRate) * 100;

        if (changePercent > MAX_RATE_CHANGE_PERCENT) {
          // Apply exponential smoothing
          smoothedRates[currency] =
            SMOOTHING_WEIGHT * newRate + (1 - SMOOTHING_WEIGHT) * previousRate;
          this.logger.warn(
            `Rate for ${currency} changed ${changePercent.toFixed(2)}%, applying smoothing`,
          );
        } else {
          smoothedRates[currency] = newRate;
        }
      } else {
        smoothedRates[currency] = newRate;
      }

      // Update previous rates
      this.previousRates[key] = smoothedRates[currency];
    }

    return {
      ...data,
      rates: smoothedRates,
    };
  }

  /**
   * Calculate confidence score for a rate
   */
  private calculateConfidence(provider: string, currency: SupportedCurrency): number {
    // Base confidence by provider
    const providerConfidence: Record<string, number> = {
      ecb: 95,
      openexchange: 90,
      fixer: 85,
      fallback: 50,
    };

    let confidence = providerConfidence[provider] || 70;

    // Reduce confidence for cross-rates
    if (this.baseCurrency !== SupportedCurrency.EUR && currency !== this.baseCurrency) {
      confidence -= 5;
    }

    // Check provider health
    const providerObj = this.providers.find((p) => p.getInfo().id === provider);
    if (providerObj) {
      const health = providerObj.getHealth();
      if (health.lastError && health.lastSuccess) {
        if (health.lastError > health.lastSuccess) {
          confidence -= 10;
        }
      }
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Store rates in database
   */
  private async storeRates(batch: ProviderRateData): Promise<void> {
    const now = new Date();

    // Deactivate old rates
    await this.prisma.exchangeRate.updateMany({
      where: {
        baseCurrency: batch.baseCurrency as Currency,
        isActive: true,
      },
      data: {
        isActive: false,
        expiresAt: now,
      },
    });

    // Insert new rates
    const createData = Object.entries(batch.rates)
      .filter(([currency]) => currency !== batch.baseCurrency)
      .map(([currency, rate]) => ({
        baseCurrency: batch.baseCurrency as Currency,
        targetCurrency: currency as Currency,
        rate,
        inverseRate: 1 / rate,
        source: batch.provider,
        effectiveAt: now,
        isActive: true,
      }));

    await this.prisma.exchangeRate.createMany({
      data: createData,
    });
  }

  /**
   * Get rate from database
   */
  private async getRateFromDatabase(
    from: SupportedCurrency,
    to: SupportedCurrency,
    date?: Date,
  ): Promise<ExchangeRateResult | null> {
    // Direct rate: from -> to
    let rate = await this.prisma.exchangeRate.findFirst({
      where: {
        baseCurrency: from as Currency,
        targetCurrency: to as Currency,
        isActive: date ? undefined : true,
        effectiveAt: date ? { lte: date } : undefined,
      },
      orderBy: { effectiveAt: 'desc' },
    });

    if (rate) {
      return {
        id: rate.id,
        baseCurrency: from,
        targetCurrency: to,
        rate: Number(rate.rate),
        inverseRate: Number(rate.inverseRate),
        source: rate.source,
        effectiveAt: rate.effectiveAt,
        confidence: this.calculateConfidence(rate.source, to),
      };
    }

    // Inverse rate: to -> from (use inverse)
    rate = await this.prisma.exchangeRate.findFirst({
      where: {
        baseCurrency: to as Currency,
        targetCurrency: from as Currency,
        isActive: date ? undefined : true,
        effectiveAt: date ? { lte: date } : undefined,
      },
      orderBy: { effectiveAt: 'desc' },
    });

    if (rate) {
      return {
        id: rate.id,
        baseCurrency: from,
        targetCurrency: to,
        rate: Number(rate.inverseRate),
        inverseRate: Number(rate.rate),
        source: rate.source,
        effectiveAt: rate.effectiveAt,
        confidence: this.calculateConfidence(rate.source, to),
      };
    }

    return null;
  }

  /**
   * Get fallback rate for a currency pair using fallback provider
   */
  private async getFallbackRate(from: SupportedCurrency, to: SupportedCurrency): Promise<number> {
    const fallbackProvider = this.providers.find((p) => p.getInfo().id === 'fallback');

    if (fallbackProvider) {
      try {
        const data = await fallbackProvider.fetchRates(from);
        return data.rates[to] || 1;
      } catch (error) {
        this.logger.error(`Fallback provider failed: ${(error as Error).message}`);
      }
    }

    // Ultimate fallback
    return 1;
  }

  /**
   * Invalidate rate cache
   */
  private async invalidateRateCache(): Promise<void> {
    await this.cacheService.deletePattern('exchange_rate:*');
    await this.cacheService.deletePattern('exchange_rates:*');
    await this.cacheService.deletePattern('live_rates:*');
  }
}
