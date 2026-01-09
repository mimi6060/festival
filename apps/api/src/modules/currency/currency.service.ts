/**
 * Currency Service
 *
 * Handles currency conversion and formatting.
 * Features:
 * - Convert amounts between currencies
 * - Format prices for display
 * - Manage festival currency settings
 * - Support for user currency preferences
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, CacheTag } from '../cache/cache.service';
import { ExchangeRateService, ExchangeRateResult } from './services/exchange-rate.service';
import {
  SupportedCurrency,
  CurrencyInfo,
  PriceDisplayDto,
  MultiCurrencyPriceDto,
  CurrencyConversionResponseDto,
  FestivalCurrencySettingsDto,
  CurrencyInfoDto,
} from './dto';
import { Currency } from '@prisma/client';
import { NotFoundException } from '../../common/exceptions/base.exception';

// Cache TTL
const SETTINGS_CACHE_TTL = 3600; // 1 hour

export interface ConversionOptions {
  /** Round to nearest cent */
  round?: boolean;
  /** Store exchange rate ID for record */
  trackRate?: boolean;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: SupportedCurrency;
  convertedAmount: number;
  convertedCurrency: SupportedCurrency;
  exchangeRate: number;
  exchangeRateId?: string;
  rateTimestamp: Date;
  source: string;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  // ============================================================================
  // Currency Conversion
  // ============================================================================

  /**
   * Convert an amount from one currency to another
   */
  async convert(
    amount: number,
    from: SupportedCurrency,
    to: SupportedCurrency,
    options: ConversionOptions = {},
  ): Promise<ConversionResult> {
    const { round = true, trackRate = false } = options;

    // Same currency, no conversion needed
    if (from === to) {
      return {
        originalAmount: amount,
        originalCurrency: from,
        convertedAmount: amount,
        convertedCurrency: to,
        exchangeRate: 1,
        rateTimestamp: new Date(),
        source: 'identity',
      };
    }

    // Get exchange rate
    const rate = await this.exchangeRateService.getRate(from, to);
    let convertedAmount = amount * rate.rate;

    // Round to appropriate decimal places
    if (round) {
      const decimals = CurrencyInfo[to].decimals;
      convertedAmount = Math.round(convertedAmount * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    return {
      originalAmount: amount,
      originalCurrency: from,
      convertedAmount,
      convertedCurrency: to,
      exchangeRate: rate.rate,
      exchangeRateId: trackRate ? rate.id : undefined,
      rateTimestamp: rate.effectiveAt,
      source: rate.source,
    };
  }

  /**
   * Convert amount for a payment response
   */
  async convertForResponse(
    amount: number,
    from: SupportedCurrency,
    to: SupportedCurrency,
    date?: Date,
  ): Promise<CurrencyConversionResponseDto> {
    const rate = await this.exchangeRateService.getRate(from, to, date);
    const convertedAmount = this.roundAmount(amount * rate.rate, to);

    return {
      originalAmount: amount,
      fromCurrency: from,
      convertedAmount,
      toCurrency: to,
      exchangeRate: rate.rate,
      rateTimestamp: rate.effectiveAt,
      source: rate.source,
    };
  }

  /**
   * Convert amount to festival's base currency
   */
  async convertToFestivalCurrency(
    amount: number,
    fromCurrency: SupportedCurrency,
    festivalId: string,
  ): Promise<ConversionResult> {
    const settings = await this.getFestivalCurrencySettings(festivalId);
    return this.convert(amount, fromCurrency, settings.defaultCurrency, { trackRate: true });
  }

  // ============================================================================
  // Price Formatting
  // ============================================================================

  /**
   * Format a price for display
   */
  formatPrice(
    amount: number,
    currency: SupportedCurrency,
    locale: 'en' | 'fr' = 'fr',
  ): PriceDisplayDto {
    const info = CurrencyInfo[currency];
    const formattedAmount = this.formatNumber(amount, info.decimals, locale);

    let formatted: string;
    if (info.symbolPosition === 'before') {
      formatted = `${info.symbol}${formattedAmount}`;
    } else {
      formatted = `${formattedAmount} ${info.symbol}`;
    }

    return {
      amount,
      currency,
      symbol: info.symbol,
      formatted,
      formattedWithCode: `${formattedAmount} ${currency}`,
    };
  }

  /**
   * Format price with optional conversion to user's preferred currency
   */
  async formatPriceWithConversion(
    amount: number,
    originalCurrency: SupportedCurrency,
    userCurrency?: SupportedCurrency,
    locale: 'en' | 'fr' = 'fr',
  ): Promise<MultiCurrencyPriceDto> {
    const original = this.formatPrice(amount, originalCurrency, locale);

    if (!userCurrency || userCurrency === originalCurrency) {
      return { original };
    }

    const conversion = await this.convert(amount, originalCurrency, userCurrency);
    const converted = this.formatPrice(conversion.convertedAmount, userCurrency, locale);

    return {
      original,
      converted,
      exchangeRate: conversion.exchangeRate,
    };
  }

  /**
   * Format number according to locale
   */
  private formatNumber(amount: number, decimals: number, locale: 'en' | 'fr'): string {
    const fixed = amount.toFixed(decimals);
    const [integer, decimal] = fixed.split('.');

    // Add thousands separator
    const thousandsSep = locale === 'fr' ? ' ' : ',';
    const decimalSep = locale === 'fr' ? ',' : '.';

    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);

    return decimal ? `${formattedInteger}${decimalSep}${decimal}` : formattedInteger;
  }

  /**
   * Round amount to appropriate decimal places for currency
   */
  roundAmount(amount: number, currency: SupportedCurrency): number {
    const decimals = CurrencyInfo[currency].decimals;
    return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  // ============================================================================
  // Festival Currency Settings
  // ============================================================================

  /**
   * Get currency settings for a festival
   */
  async getFestivalCurrencySettings(festivalId: string): Promise<FestivalCurrencySettingsDto> {
    const cacheKey = `festival:${festivalId}:currency_settings`;
    const cached = await this.cacheService.get<FestivalCurrencySettingsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    let settings = await this.prisma.festivalCurrencySettings.findUnique({
      where: { festivalId },
    });

    // Create default settings if not exist
    if (!settings) {
      settings = await this.prisma.festivalCurrencySettings.create({
        data: {
          festivalId,
          defaultCurrency: Currency.EUR,
          supportedCurrencies: [Currency.EUR],
          displayFormat: 'symbol',
          decimalSeparator: ',',
          thousandsSeparator: ' ',
          symbolPosition: 'after',
          autoConvert: true,
        },
      });
    }

    const result: FestivalCurrencySettingsDto = {
      festivalId: settings.festivalId,
      defaultCurrency: settings.defaultCurrency as SupportedCurrency,
      supportedCurrencies: settings.supportedCurrencies as SupportedCurrency[],
      displayFormat: settings.displayFormat,
      decimalSeparator: settings.decimalSeparator,
      thousandsSeparator: settings.thousandsSeparator,
      symbolPosition: settings.symbolPosition,
      autoConvert: settings.autoConvert,
    };

    await this.cacheService.set(cacheKey, result, {
      ttl: SETTINGS_CACHE_TTL,
      tags: [CacheTag.FESTIVAL, CacheTag.CONFIG],
    });

    return result;
  }

  /**
   * Update festival currency settings
   */
  async updateFestivalCurrencySettings(
    festivalId: string,
    updates: Partial<FestivalCurrencySettingsDto>,
  ): Promise<FestivalCurrencySettingsDto> {
    // Ensure settings exist
    await this.getFestivalCurrencySettings(festivalId);

    const updateData: any = {};
    if (updates.defaultCurrency) {
      updateData.defaultCurrency = updates.defaultCurrency as Currency;
    }
    if (updates.supportedCurrencies) {
      updateData.supportedCurrencies = updates.supportedCurrencies as Currency[];
    }
    if (updates.displayFormat) updateData.displayFormat = updates.displayFormat;
    if (updates.decimalSeparator) updateData.decimalSeparator = updates.decimalSeparator;
    if (updates.thousandsSeparator) updateData.thousandsSeparator = updates.thousandsSeparator;
    if (updates.symbolPosition) updateData.symbolPosition = updates.symbolPosition;
    if (typeof updates.autoConvert === 'boolean') updateData.autoConvert = updates.autoConvert;

    const settings = await this.prisma.festivalCurrencySettings.update({
      where: { festivalId },
      data: updateData,
    });

    // Invalidate cache
    await this.cacheService.delete(`festival:${festivalId}:currency_settings`);

    return {
      festivalId: settings.festivalId,
      defaultCurrency: settings.defaultCurrency as SupportedCurrency,
      supportedCurrencies: settings.supportedCurrencies as SupportedCurrency[],
      displayFormat: settings.displayFormat,
      decimalSeparator: settings.decimalSeparator,
      thousandsSeparator: settings.thousandsSeparator,
      symbolPosition: settings.symbolPosition,
      autoConvert: settings.autoConvert,
    };
  }

  /**
   * Check if a currency is supported by a festival
   */
  async isCurrencySupported(festivalId: string, currency: SupportedCurrency): Promise<boolean> {
    const settings = await this.getFestivalCurrencySettings(festivalId);
    return settings.supportedCurrencies.includes(currency);
  }

  // ============================================================================
  // Currency Information
  // ============================================================================

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): CurrencyInfoDto[] {
    return Object.values(SupportedCurrency).map((code) => ({
      code,
      ...CurrencyInfo[code],
    }));
  }

  /**
   * Get currency info by code
   */
  getCurrencyInfo(code: SupportedCurrency): CurrencyInfoDto {
    return {
      code,
      ...CurrencyInfo[code],
    };
  }

  /**
   * Validate if a currency code is supported
   */
  isValidCurrency(code: string): code is SupportedCurrency {
    return Object.values(SupportedCurrency).includes(code as SupportedCurrency);
  }

  /**
   * Parse currency from string (case-insensitive)
   */
  parseCurrency(code: string): SupportedCurrency | null {
    const upper = code.toUpperCase();
    if (this.isValidCurrency(upper)) {
      return upper as SupportedCurrency;
    }
    return null;
  }

  // ============================================================================
  // User Currency Preferences
  // ============================================================================

  /**
   * Get user's preferred display currency
   */
  async getUserDisplayCurrency(userId: string): Promise<SupportedCurrency> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayCurrency: true },
    });

    if (user?.displayCurrency && this.isValidCurrency(user.displayCurrency)) {
      return user.displayCurrency as SupportedCurrency;
    }

    // Default to EUR
    return SupportedCurrency.EUR;
  }

  /**
   * Update user's preferred display currency
   */
  async updateUserDisplayCurrency(
    userId: string,
    currency: SupportedCurrency,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { displayCurrency: currency },
    });
  }
}
