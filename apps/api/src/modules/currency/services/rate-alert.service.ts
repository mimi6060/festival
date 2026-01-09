/**
 * Rate Alert Service
 *
 * Manages exchange rate alerts and notifications.
 * Features:
 * - Alert when rate changes exceed threshold
 * - Notify organizers of significant changes
 * - Track rate volatility
 * - Alert subscription management
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService, CacheTag } from '../../cache/cache.service';
import { SupportedCurrency } from '../dto';

// Default alert threshold (percentage)
const DEFAULT_ALERT_THRESHOLD = 2.0;

// Cache TTL
const SUBSCRIPTION_CACHE_TTL = 3600; // 1 hour

export interface RateAlert {
  id: string;
  currency: SupportedCurrency;
  type: 'increase' | 'decrease' | 'both';
  threshold: number;
  previousRate: number;
  currentRate: number;
  changePercent: number;
  triggeredAt: Date;
  notified: boolean;
}

export interface AlertSubscription {
  id: string;
  userId: string;
  festivalId?: string;
  currency: SupportedCurrency;
  type: 'increase' | 'decrease' | 'both';
  threshold: number;
  enabled: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

export interface CreateAlertSubscriptionDto {
  userId: string;
  festivalId?: string;
  currency: SupportedCurrency;
  type?: 'increase' | 'decrease' | 'both';
  threshold?: number;
}

export interface RateAlertStats {
  totalAlerts24h: number;
  alertsByCurrency: Record<SupportedCurrency, number>;
  largestChange: {
    currency: SupportedCurrency;
    changePercent: number;
    timestamp: Date;
  } | null;
  activeSubscriptions: number;
}

@Injectable()
export class RateAlertService {
  private readonly logger = new Logger(RateAlertService.name);

  // In-memory alert storage (for current session)
  private recentAlerts: RateAlert[] = [];
  private readonly maxAlertHistory = 500;

  // Alert callback handlers
  private alertHandlers: ((alert: RateAlert) => Promise<void>)[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Check rates and trigger alerts if thresholds are exceeded
   */
  async checkAndTriggerAlerts(
    currency: SupportedCurrency,
    previousRate: number,
    currentRate: number,
  ): Promise<RateAlert[]> {
    const changePercent = ((currentRate - previousRate) / previousRate) * 100;
    const absChange = Math.abs(changePercent);

    // Get all active subscriptions for this currency
    const subscriptions = await this.getActiveSubscriptions(currency);

    const triggeredAlerts: RateAlert[] = [];

    for (const subscription of subscriptions) {
      // Check if threshold is met
      if (absChange < subscription.threshold) continue;

      // Check direction match
      if (subscription.type === 'increase' && changePercent <= 0) continue;
      if (subscription.type === 'decrease' && changePercent >= 0) continue;

      // Create alert
      const alert: RateAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        currency,
        type: changePercent > 0 ? 'increase' : 'decrease',
        threshold: subscription.threshold,
        previousRate,
        currentRate,
        changePercent,
        triggeredAt: new Date(),
        notified: false,
      };

      triggeredAlerts.push(alert);

      // Log the alert
      this.logger.warn(
        `Rate alert triggered for ${currency}: ` +
        `${previousRate.toFixed(4)} -> ${currentRate.toFixed(4)} ` +
        `(${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`,
      );

      // Update subscription last triggered
      await this.updateSubscriptionLastTriggered(subscription.id);
    }

    // Store alerts in memory
    this.recentAlerts.push(...triggeredAlerts);
    if (this.recentAlerts.length > this.maxAlertHistory) {
      this.recentAlerts = this.recentAlerts.slice(-this.maxAlertHistory);
    }

    // Notify handlers
    for (const alert of triggeredAlerts) {
      await this.notifyHandlers(alert);
    }

    return triggeredAlerts;
  }

  /**
   * Create a new alert subscription
   */
  async createSubscription(dto: CreateAlertSubscriptionDto): Promise<AlertSubscription> {
    const subscription = await this.prisma.rateAlertSubscription.create({
      data: {
        userId: dto.userId,
        festivalId: dto.festivalId,
        currency: dto.currency,
        alertType: dto.type || 'both',
        threshold: dto.threshold || DEFAULT_ALERT_THRESHOLD,
        enabled: true,
      },
    });

    // Invalidate cache
    await this.cacheService.delete(`rate_subscriptions:${dto.currency}`);

    return {
      id: subscription.id,
      userId: subscription.userId,
      festivalId: subscription.festivalId || undefined,
      currency: subscription.currency as SupportedCurrency,
      type: subscription.alertType as 'increase' | 'decrease' | 'both',
      threshold: Number(subscription.threshold),
      enabled: subscription.enabled,
      createdAt: subscription.createdAt,
      lastTriggered: subscription.lastTriggered || undefined,
    };
  }

  /**
   * Get user's subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<AlertSubscription[]> {
    const subscriptions = await this.prisma.rateAlertSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map((s) => ({
      id: s.id,
      userId: s.userId,
      festivalId: s.festivalId || undefined,
      currency: s.currency as SupportedCurrency,
      type: s.alertType as 'increase' | 'decrease' | 'both',
      threshold: Number(s.threshold),
      enabled: s.enabled,
      createdAt: s.createdAt,
      lastTriggered: s.lastTriggered || undefined,
    }));
  }

  /**
   * Update a subscription
   */
  async updateSubscription(
    id: string,
    updates: Partial<Pick<AlertSubscription, 'type' | 'threshold' | 'enabled'>>,
  ): Promise<AlertSubscription> {
    const subscription = await this.prisma.rateAlertSubscription.update({
      where: { id },
      data: {
        alertType: updates.type,
        threshold: updates.threshold,
        enabled: updates.enabled,
      },
    });

    // Invalidate cache
    await this.cacheService.delete(`rate_subscriptions:${subscription.currency}`);

    return {
      id: subscription.id,
      userId: subscription.userId,
      festivalId: subscription.festivalId || undefined,
      currency: subscription.currency as SupportedCurrency,
      type: subscription.alertType as 'increase' | 'decrease' | 'both',
      threshold: Number(subscription.threshold),
      enabled: subscription.enabled,
      createdAt: subscription.createdAt,
      lastTriggered: subscription.lastTriggered || undefined,
    };
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(id: string): Promise<void> {
    const subscription = await this.prisma.rateAlertSubscription.delete({
      where: { id },
    });

    // Invalidate cache
    await this.cacheService.delete(`rate_subscriptions:${subscription.currency}`);
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 50): RateAlert[] {
    return this.recentAlerts.slice(-limit);
  }

  /**
   * Get alerts for a specific currency
   */
  getAlertsForCurrency(currency: SupportedCurrency, limit: number = 50): RateAlert[] {
    return this.recentAlerts
      .filter((a) => a.currency === currency)
      .slice(-limit);
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): RateAlertStats {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const alerts24h = this.recentAlerts.filter((a) => a.triggeredAt >= yesterday);

    const alertsByCurrency: Record<SupportedCurrency, number> = {
      [SupportedCurrency.EUR]: 0,
      [SupportedCurrency.USD]: 0,
      [SupportedCurrency.GBP]: 0,
      [SupportedCurrency.CHF]: 0,
    };

    for (const alert of alerts24h) {
      alertsByCurrency[alert.currency]++;
    }

    // Find largest change
    let largestChange: RateAlertStats['largestChange'] = null;
    for (const alert of alerts24h) {
      if (!largestChange || Math.abs(alert.changePercent) > Math.abs(largestChange.changePercent)) {
        largestChange = {
          currency: alert.currency,
          changePercent: alert.changePercent,
          timestamp: alert.triggeredAt,
        };
      }
    }

    return {
      totalAlerts24h: alerts24h.length,
      alertsByCurrency,
      largestChange,
      activeSubscriptions: 0, // Will be updated by caller if needed
    };
  }

  /**
   * Register an alert handler
   */
  registerAlertHandler(handler: (alert: RateAlert) => Promise<void>): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Clear all alert handlers
   */
  clearAlertHandlers(): void {
    this.alertHandlers = [];
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Get active subscriptions for a currency
   */
  private async getActiveSubscriptions(currency: SupportedCurrency): Promise<AlertSubscription[]> {
    const cacheKey = `rate_subscriptions:${currency}`;
    const cached = await this.cacheService.get<AlertSubscription[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const subscriptions = await this.prisma.rateAlertSubscription.findMany({
      where: {
        currency,
        enabled: true,
      },
    });

    const result = subscriptions.map((s) => ({
      id: s.id,
      userId: s.userId,
      festivalId: s.festivalId || undefined,
      currency: s.currency as SupportedCurrency,
      type: s.alertType as 'increase' | 'decrease' | 'both',
      threshold: Number(s.threshold),
      enabled: s.enabled,
      createdAt: s.createdAt,
      lastTriggered: s.lastTriggered || undefined,
    }));

    await this.cacheService.set(cacheKey, result, {
      ttl: SUBSCRIPTION_CACHE_TTL,
      tags: [CacheTag.CONFIG],
    });

    return result;
  }

  /**
   * Update subscription's last triggered time
   */
  private async updateSubscriptionLastTriggered(id: string): Promise<void> {
    try {
      await this.prisma.rateAlertSubscription.update({
        where: { id },
        data: { lastTriggered: new Date() },
      });
    } catch (error) {
      this.logger.error(`Failed to update subscription: ${(error as Error).message}`);
    }
  }

  /**
   * Notify all registered handlers
   */
  private async notifyHandlers(alert: RateAlert): Promise<void> {
    for (const handler of this.alertHandlers) {
      try {
        await handler(alert);
        alert.notified = true;
      } catch (error) {
        this.logger.error(`Alert handler failed: ${(error as Error).message}`);
      }
    }
  }
}
