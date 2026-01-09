/**
 * Exchange Rate Provider Interface
 *
 * Defines the contract for exchange rate providers.
 * All providers must implement this interface to be used
 * in the provider failover chain.
 */

import { SupportedCurrency } from '../dto';

/**
 * Provider metadata
 */
export interface ProviderInfo {
  /** Unique provider identifier */
  id: string;
  /** Provider display name */
  name: string;
  /** Provider website URL */
  website: string;
  /** Whether the provider requires an API key */
  requiresApiKey: boolean;
  /** Rate limits per hour */
  rateLimitPerHour: number;
  /** Supported base currencies */
  supportedBaseCurrencies: SupportedCurrency[];
  /** Maximum historical data days */
  maxHistoricalDays: number;
  /** Provider reliability score (0-100) */
  reliabilityScore: number;
}

/**
 * Raw rate data from provider
 */
export interface ProviderRateData {
  /** Base currency for the rates */
  baseCurrency: SupportedCurrency;
  /** Exchange rates keyed by currency code */
  rates: Record<string, number>;
  /** Timestamp when rates were last updated by provider */
  timestamp: Date;
  /** Provider identifier */
  provider: string;
  /** Whether the data is from cache */
  fromCache: boolean;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  /** Whether the provider is available */
  available: boolean;
  /** Last successful request timestamp */
  lastSuccess?: Date;
  /** Last error timestamp */
  lastError?: Date;
  /** Last error message */
  lastErrorMessage?: string;
  /** Requests made in current window */
  requestsInWindow: number;
  /** Rate limit remaining */
  rateLimitRemaining: number;
  /** Response latency in ms */
  averageLatencyMs: number;
}

/**
 * Exchange Rate Provider Interface
 *
 * All exchange rate data providers must implement this interface.
 * The system supports multiple providers for failover and reliability.
 */
export interface IExchangeRateProvider {
  /**
   * Get provider metadata
   */
  getInfo(): ProviderInfo;

  /**
   * Get current exchange rates
   * @param baseCurrency - The base currency for rates
   * @returns Promise with rate data
   */
  fetchRates(baseCurrency: SupportedCurrency): Promise<ProviderRateData>;

  /**
   * Get historical rates for a specific date
   * @param baseCurrency - The base currency for rates
   * @param date - The date to fetch rates for
   * @returns Promise with rate data
   */
  fetchHistoricalRates(
    baseCurrency: SupportedCurrency,
    date: Date,
  ): Promise<ProviderRateData>;

  /**
   * Check provider health and availability
   * @returns Provider health status
   */
  getHealth(): ProviderHealth;

  /**
   * Check if provider is currently available
   * @returns True if provider can be used
   */
  isAvailable(): boolean;

  /**
   * Test provider connectivity
   * @returns True if connection is successful
   */
  testConnection(): Promise<boolean>;

  /**
   * Get the priority for this provider (lower = higher priority)
   */
  getPriority(): number;
}

/**
 * Abstract base class for providers
 */
export abstract class BaseExchangeRateProvider implements IExchangeRateProvider {
  protected health: ProviderHealth = {
    available: true,
    requestsInWindow: 0,
    rateLimitRemaining: 0,
    averageLatencyMs: 0,
  };

  protected latencies: number[] = [];
  protected readonly maxLatencyHistory = 10;

  abstract getInfo(): ProviderInfo;
  abstract fetchRates(baseCurrency: SupportedCurrency): Promise<ProviderRateData>;
  abstract fetchHistoricalRates(
    baseCurrency: SupportedCurrency,
    date: Date,
  ): Promise<ProviderRateData>;
  abstract getPriority(): number;

  getHealth(): ProviderHealth {
    return { ...this.health };
  }

  isAvailable(): boolean {
    const info = this.getInfo();
    return this.health.available && this.health.requestsInWindow < info.rateLimitPerHour;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.fetchRates(SupportedCurrency.EUR);
      return true;
    } catch {
      return false;
    }
  }

  protected recordSuccess(latencyMs: number): void {
    this.health.available = true;
    this.health.lastSuccess = new Date();
    this.health.requestsInWindow++;
    this.recordLatency(latencyMs);
  }

  protected recordError(error: Error): void {
    this.health.lastError = new Date();
    this.health.lastErrorMessage = error.message;
    // Don't immediately mark as unavailable - let the service decide
  }

  protected recordLatency(ms: number): void {
    this.latencies.push(ms);
    if (this.latencies.length > this.maxLatencyHistory) {
      this.latencies.shift();
    }
    this.health.averageLatencyMs =
      this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }

  protected resetRateLimit(): void {
    this.health.requestsInWindow = 0;
    const info = this.getInfo();
    this.health.rateLimitRemaining = info.rateLimitPerHour;
  }
}

/**
 * Provider token for dependency injection
 */
export const EXCHANGE_RATE_PROVIDERS = 'EXCHANGE_RATE_PROVIDERS';
