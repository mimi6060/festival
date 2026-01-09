/**
 * Exchange Rate Scheduler
 *
 * Manages scheduled exchange rate updates.
 * Features:
 * - Configurable update intervals
 * - Business hours awareness
 * - Provider rate limit handling
 * - Logging and monitoring
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExchangeRateService } from './exchange-rate.service';
import { RateAlertService } from './rate-alert.service';
import { SupportedCurrency } from '../dto';

// Default schedule intervals in milliseconds
const DEFAULT_UPDATE_INTERVAL = 15 * 60 * 1000; // 15 minutes
const BUSINESS_HOURS_INTERVAL = 10 * 60 * 1000; // 10 minutes
const OFF_HOURS_INTERVAL = 30 * 60 * 1000; // 30 minutes

// Business hours definition (UTC)
const BUSINESS_HOURS_START = 7; // 07:00 UTC
const BUSINESS_HOURS_END = 18; // 18:00 UTC

export interface SchedulerStats {
  isRunning: boolean;
  lastUpdate: Date | null;
  nextUpdate: Date | null;
  updateCount: number;
  errorCount: number;
  lastError: string | null;
  currentInterval: number;
  isBusinessHours: boolean;
}

export interface RateChangeLog {
  timestamp: Date;
  currency: SupportedCurrency;
  previousRate: number;
  newRate: number;
  changePercent: number;
  provider: string;
}

@Injectable()
export class ExchangeRateScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExchangeRateScheduler.name);

  // Scheduler state
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastUpdate: Date | null = null;
  private nextUpdate: Date | null = null;
  private updateCount = 0;
  private errorCount = 0;
  private lastError: string | null = null;

  // Rate change tracking
  private previousRates: Map<SupportedCurrency, number> = new Map();
  private rateChangeLogs: RateChangeLog[] = [];
  private readonly maxLogSize = 1000;

  // Configuration
  private readonly enabled: boolean;
  private readonly defaultInterval: number;
  private readonly businessHoursInterval: number;
  private readonly offHoursInterval: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly rateAlertService: RateAlertService,
  ) {
    this.enabled = this.configService.get<boolean>('EXCHANGE_RATE_SCHEDULER_ENABLED', true);
    this.defaultInterval = this.configService.get<number>(
      'EXCHANGE_RATE_UPDATE_INTERVAL',
      DEFAULT_UPDATE_INTERVAL,
    );
    this.businessHoursInterval = this.configService.get<number>(
      'EXCHANGE_RATE_BUSINESS_INTERVAL',
      BUSINESS_HOURS_INTERVAL,
    );
    this.offHoursInterval = this.configService.get<number>(
      'EXCHANGE_RATE_OFF_HOURS_INTERVAL',
      OFF_HOURS_INTERVAL,
    );
  }

  async onModuleInit(): Promise<void> {
    if (this.enabled) {
      await this.start();
    } else {
      this.logger.log('Exchange rate scheduler is disabled');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    this.logger.log('Exchange rate scheduler started');

    // Initial update
    await this.performUpdate();

    // Schedule next update
    this.scheduleNextUpdate();
  }

  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    this.nextUpdate = null;
    this.logger.log('Exchange rate scheduler stopped');
  }

  /**
   * Manually trigger an update
   */
  async triggerUpdate(): Promise<void> {
    this.logger.log('Manual update triggered');
    await this.performUpdate();

    // Reschedule next update
    if (this.isRunning) {
      this.scheduleNextUpdate();
    }
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    return {
      isRunning: this.isRunning,
      lastUpdate: this.lastUpdate,
      nextUpdate: this.nextUpdate,
      updateCount: this.updateCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
      currentInterval: this.getCurrentInterval(),
      isBusinessHours: this.isBusinessHours(),
    };
  }

  /**
   * Get recent rate change logs
   */
  getRateChangeLogs(limit: number = 100): RateChangeLog[] {
    return this.rateChangeLogs.slice(-limit);
  }

  /**
   * Check if currently in business hours
   */
  isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay();

    // Weekend check (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    return hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Perform the rate update
   */
  private async performUpdate(): Promise<void> {
    try {
      // Get current rates before update for comparison
      const ratesBefore = await this.exchangeRateService.getAllRates();

      // Refresh rates
      await this.exchangeRateService.refreshRates();

      // Get new rates
      const ratesAfter = await this.exchangeRateService.getAllRates();

      // Track rate changes
      await this.trackRateChanges(ratesBefore.rates, ratesAfter.rates, ratesAfter.source);

      this.lastUpdate = new Date();
      this.updateCount++;
      this.lastError = null;

      this.logger.log(`Exchange rates updated successfully (update #${this.updateCount})`);
    } catch (error) {
      const err = error as Error;
      this.errorCount++;
      this.lastError = err.message;
      this.logger.error(`Failed to update exchange rates: ${err.message}`);
    }
  }

  /**
   * Track rate changes and trigger alerts
   */
  private async trackRateChanges(
    previousRates: Record<SupportedCurrency, number>,
    newRates: Record<SupportedCurrency, number>,
    provider: string,
  ): Promise<void> {
    for (const currency of Object.values(SupportedCurrency)) {
      const previousRate = previousRates[currency] || this.previousRates.get(currency);
      const newRate = newRates[currency];

      if (!previousRate || !newRate) continue;

      const changePercent = ((newRate - previousRate) / previousRate) * 100;

      // Log the change
      const changeLog: RateChangeLog = {
        timestamp: new Date(),
        currency,
        previousRate,
        newRate,
        changePercent,
        provider,
      };

      this.rateChangeLogs.push(changeLog);

      // Trim log if too large
      if (this.rateChangeLogs.length > this.maxLogSize) {
        this.rateChangeLogs = this.rateChangeLogs.slice(-this.maxLogSize);
      }

      // Update previous rates
      this.previousRates.set(currency, newRate);

      // Log significant changes
      if (Math.abs(changePercent) > 0.1) {
        this.logger.debug(
          `${currency} rate changed: ${previousRate.toFixed(4)} -> ${newRate.toFixed(4)} ` +
          `(${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`,
        );
      }

      // Trigger alert if significant change
      if (Math.abs(changePercent) >= 2) {
        await this.rateAlertService.checkAndTriggerAlerts(currency, previousRate, newRate);
      }
    }
  }

  /**
   * Schedule the next update
   */
  private scheduleNextUpdate(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
    }

    const interval = this.getCurrentInterval();
    this.nextUpdate = new Date(Date.now() + interval);

    this.intervalId = setTimeout(async () => {
      await this.performUpdate();
      if (this.isRunning) {
        this.scheduleNextUpdate();
      }
    }, interval);

    // Prevent interval from keeping Node.js alive
    if (this.intervalId.unref) {
      this.intervalId.unref();
    }

    this.logger.debug(
      `Next update scheduled for ${this.nextUpdate.toISOString()} ` +
      `(interval: ${Math.round(interval / 1000)}s, business hours: ${this.isBusinessHours()})`,
    );
  }

  /**
   * Get current update interval based on time of day
   */
  private getCurrentInterval(): number {
    if (this.isBusinessHours()) {
      return this.businessHoursInterval;
    }
    return this.offHoursInterval;
  }
}
