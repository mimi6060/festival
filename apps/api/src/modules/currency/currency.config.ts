/**
 * Currency Module Configuration
 *
 * Central configuration for exchange rate providers and settings.
 * All values can be overridden via environment variables.
 */

import { registerAs } from '@nestjs/config';

export interface CurrencyConfig {
  // Provider Settings
  providers: {
    ecb: {
      enabled: boolean;
      priority: number;
      rateLimitPerHour: number;
    };
    openexchange: {
      enabled: boolean;
      apiKey: string | undefined;
      multiBase: boolean;
      priority: number;
      rateLimitPerHour: number;
    };
    fixer: {
      enabled: boolean;
      apiKey: string | undefined;
      multiBase: boolean;
      useSSL: boolean;
      priority: number;
      rateLimitPerHour: number;
    };
    fallback: {
      enabled: boolean;
      priority: number;
    };
  };

  // Scheduler Settings
  scheduler: {
    enabled: boolean;
    defaultIntervalMs: number;
    businessHoursIntervalMs: number;
    offHoursIntervalMs: number;
    businessHoursStart: number; // UTC hour
    businessHoursEnd: number; // UTC hour
  };

  // Rate Smoothing Settings
  smoothing: {
    enabled: boolean;
    maxChangePercent: number;
    smoothingWeight: number;
  };

  // Alert Settings
  alerts: {
    defaultThreshold: number;
    maxSubscriptionsPerUser: number;
    cooldownMinutes: number;
  };

  // Cache Settings
  cache: {
    rateTtlSeconds: number;
    subscriptionTtlSeconds: number;
  };

  // Fallback Order
  providerPriority: string[];
}

export const currencyConfig = registerAs('currency', (): CurrencyConfig => ({
  providers: {
    ecb: {
      enabled: process.env.ECB_PROVIDER_ENABLED !== 'false',
      priority: 1,
      rateLimitPerHour: parseInt(process.env.ECB_RATE_LIMIT_PER_HOUR || '1000', 10),
    },
    openexchange: {
      enabled: !!process.env.OPENEXCHANGE_API_KEY,
      apiKey: process.env.OPENEXCHANGE_API_KEY,
      multiBase: process.env.OPENEXCHANGE_MULTI_BASE === 'true',
      priority: 2,
      rateLimitPerHour: parseInt(process.env.OPENEXCHANGE_RATE_LIMIT_PER_HOUR || '83', 10),
    },
    fixer: {
      enabled: !!process.env.FIXER_API_KEY,
      apiKey: process.env.FIXER_API_KEY,
      multiBase: process.env.FIXER_MULTI_BASE === 'true',
      useSSL: process.env.FIXER_USE_SSL === 'true',
      priority: 3,
      rateLimitPerHour: parseInt(process.env.FIXER_RATE_LIMIT_PER_HOUR || '4', 10),
    },
    fallback: {
      enabled: true,
      priority: 999,
    },
  },

  scheduler: {
    enabled: process.env.EXCHANGE_RATE_SCHEDULER_ENABLED !== 'false',
    defaultIntervalMs: parseInt(process.env.EXCHANGE_RATE_UPDATE_INTERVAL || '900000', 10), // 15 min
    businessHoursIntervalMs: parseInt(process.env.EXCHANGE_RATE_BUSINESS_INTERVAL || '600000', 10), // 10 min
    offHoursIntervalMs: parseInt(process.env.EXCHANGE_RATE_OFF_HOURS_INTERVAL || '1800000', 10), // 30 min
    businessHoursStart: parseInt(process.env.BUSINESS_HOURS_START_UTC || '7', 10),
    businessHoursEnd: parseInt(process.env.BUSINESS_HOURS_END_UTC || '18', 10),
  },

  smoothing: {
    enabled: process.env.RATE_SMOOTHING_ENABLED !== 'false',
    maxChangePercent: parseFloat(process.env.MAX_RATE_CHANGE_PERCENT || '5'),
    smoothingWeight: parseFloat(process.env.RATE_SMOOTHING_WEIGHT || '0.3'),
  },

  alerts: {
    defaultThreshold: parseFloat(process.env.RATE_ALERT_DEFAULT_THRESHOLD || '2'),
    maxSubscriptionsPerUser: parseInt(process.env.MAX_RATE_SUBSCRIPTIONS_PER_USER || '10', 10),
    cooldownMinutes: parseInt(process.env.RATE_ALERT_COOLDOWN_MINUTES || '60', 10),
  },

  cache: {
    rateTtlSeconds: parseInt(process.env.EXCHANGE_RATE_CACHE_TTL || '900', 10),
    subscriptionTtlSeconds: parseInt(process.env.SUBSCRIPTION_CACHE_TTL || '3600', 10),
  },

  providerPriority: ['ecb', 'openexchange', 'fixer', 'fallback'],
}));

/**
 * Environment variables reference:
 *
 * # ECB Provider (European Central Bank - Free, EUR base only)
 * ECB_PROVIDER_ENABLED=true
 * ECB_RATE_LIMIT_PER_HOUR=1000
 *
 * # Open Exchange Rates
 * OPENEXCHANGE_API_KEY=your_api_key
 * OPENEXCHANGE_MULTI_BASE=false (true for paid plans)
 * OPENEXCHANGE_RATE_LIMIT_PER_HOUR=83 (1000/month)
 *
 * # Fixer.io
 * FIXER_API_KEY=your_api_key
 * FIXER_MULTI_BASE=false (true for paid plans)
 * FIXER_USE_SSL=false (true for paid plans)
 * FIXER_RATE_LIMIT_PER_HOUR=4 (100/month)
 *
 * # Scheduler
 * EXCHANGE_RATE_SCHEDULER_ENABLED=true
 * EXCHANGE_RATE_UPDATE_INTERVAL=900000 (15 minutes in ms)
 * EXCHANGE_RATE_BUSINESS_INTERVAL=600000 (10 minutes in ms)
 * EXCHANGE_RATE_OFF_HOURS_INTERVAL=1800000 (30 minutes in ms)
 * BUSINESS_HOURS_START_UTC=7
 * BUSINESS_HOURS_END_UTC=18
 *
 * # Rate Smoothing
 * RATE_SMOOTHING_ENABLED=true
 * MAX_RATE_CHANGE_PERCENT=5
 * RATE_SMOOTHING_WEIGHT=0.3
 *
 * # Alerts
 * RATE_ALERT_DEFAULT_THRESHOLD=2
 * MAX_RATE_SUBSCRIPTIONS_PER_USER=10
 * RATE_ALERT_COOLDOWN_MINUTES=60
 *
 * # Cache
 * EXCHANGE_RATE_CACHE_TTL=900
 * SUBSCRIPTION_CACHE_TTL=3600
 */
