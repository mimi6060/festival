import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Supported currencies
 */
export enum SupportedCurrency {
  EUR = 'EUR',
  USD = 'USD',
  GBP = 'GBP',
  CHF = 'CHF',
}

/**
 * Currency metadata for display
 */
export const CurrencyInfo: Record<
  SupportedCurrency,
  {
    code: string;
    symbol: string;
    name: string;
    nameFr: string;
    decimals: number;
    symbolPosition: 'before' | 'after';
  }
> = {
  [SupportedCurrency.EUR]: {
    code: 'EUR',
    symbol: '\u20AC',
    name: 'Euro',
    nameFr: 'Euro',
    decimals: 2,
    symbolPosition: 'after',
  },
  [SupportedCurrency.USD]: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    nameFr: 'Dollar americain',
    decimals: 2,
    symbolPosition: 'before',
  },
  [SupportedCurrency.GBP]: {
    code: 'GBP',
    symbol: '\u00A3',
    name: 'British Pound',
    nameFr: 'Livre sterling',
    decimals: 2,
    symbolPosition: 'before',
  },
  [SupportedCurrency.CHF]: {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Swiss Franc',
    nameFr: 'Franc suisse',
    decimals: 2,
    symbolPosition: 'before',
  },
};

// ============================================================================
// Currency Conversion DTOs
// ============================================================================

/**
 * Request to convert an amount between currencies
 */
export class CurrencyConversionDto {
  @ApiProperty({
    description: 'Amount to convert',
    example: 100.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({
    description: 'Source currency (ISO 4217)',
    enum: SupportedCurrency,
    example: SupportedCurrency.EUR,
  })
  @IsEnum(SupportedCurrency)
  fromCurrency!: SupportedCurrency;

  @ApiProperty({
    description: 'Target currency (ISO 4217)',
    enum: SupportedCurrency,
    example: SupportedCurrency.USD,
  })
  @IsEnum(SupportedCurrency)
  toCurrency!: SupportedCurrency;

  @ApiPropertyOptional({
    description: 'Date for historical rate (defaults to current)',
    example: '2025-01-09T12:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}

/**
 * Response for currency conversion
 */
export class CurrencyConversionResponseDto {
  @ApiProperty({
    description: 'Original amount',
    example: 100.0,
  })
  originalAmount!: number;

  @ApiProperty({
    description: 'Source currency',
    example: 'EUR',
  })
  fromCurrency!: string;

  @ApiProperty({
    description: 'Converted amount',
    example: 108.5,
  })
  convertedAmount!: number;

  @ApiProperty({
    description: 'Target currency',
    example: 'USD',
  })
  toCurrency!: string;

  @ApiProperty({
    description: 'Exchange rate used',
    example: 1.085,
  })
  exchangeRate!: number;

  @ApiProperty({
    description: 'Rate effective timestamp',
    example: '2025-01-09T12:00:00.000Z',
  })
  rateTimestamp!: Date;

  @ApiProperty({
    description: 'Rate source',
    example: 'api',
  })
  source!: string;
}

// ============================================================================
// Exchange Rate DTOs
// ============================================================================

/**
 * Exchange rate response
 */
export class ExchangeRateDto {
  @ApiProperty({
    description: 'Rate ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Base currency',
    enum: SupportedCurrency,
    example: SupportedCurrency.EUR,
  })
  baseCurrency!: SupportedCurrency;

  @ApiProperty({
    description: 'Target currency',
    enum: SupportedCurrency,
    example: SupportedCurrency.USD,
  })
  targetCurrency!: SupportedCurrency;

  @ApiProperty({
    description: 'Exchange rate (base to target)',
    example: 1.085,
  })
  rate!: number;

  @ApiProperty({
    description: 'Inverse rate (target to base)',
    example: 0.9217,
  })
  inverseRate!: number;

  @ApiProperty({
    description: 'Rate source',
    example: 'api',
  })
  source!: string;

  @ApiProperty({
    description: 'When this rate became effective',
    example: '2025-01-09T12:00:00.000Z',
  })
  effectiveAt!: Date;

  @ApiProperty({
    description: 'Whether this rate is currently active',
    example: true,
  })
  isActive!: boolean;
}

/**
 * Create exchange rate manually
 */
export class CreateExchangeRateDto {
  @ApiProperty({
    description: 'Base currency',
    enum: SupportedCurrency,
    example: SupportedCurrency.EUR,
  })
  @IsEnum(SupportedCurrency)
  baseCurrency!: SupportedCurrency;

  @ApiProperty({
    description: 'Target currency',
    enum: SupportedCurrency,
    example: SupportedCurrency.USD,
  })
  @IsEnum(SupportedCurrency)
  targetCurrency!: SupportedCurrency;

  @ApiProperty({
    description: 'Exchange rate',
    example: 1.085,
    minimum: 0,
  })
  @IsNumber()
  @Min(0.000001)
  @Type(() => Number)
  rate!: number;

  @ApiPropertyOptional({
    description: 'Rate source',
    example: 'manual',
    default: 'manual',
  })
  @IsOptional()
  @IsString()
  source?: string;
}

/**
 * All exchange rates response
 */
export class ExchangeRatesResponseDto {
  @ApiProperty({
    description: 'Base currency for all rates',
    example: 'EUR',
  })
  baseCurrency!: string;

  @ApiProperty({
    description: 'Timestamp when rates were fetched',
    example: '2025-01-09T12:00:00.000Z',
  })
  timestamp!: Date;

  @ApiProperty({
    description: 'Exchange rates keyed by currency code',
    example: { USD: 1.085, GBP: 0.845, CHF: 0.935 },
  })
  rates!: Record<string, number>;

  @ApiProperty({
    description: 'Rate source',
    example: 'api',
  })
  source!: string;
}

// ============================================================================
// Price Display DTOs
// ============================================================================

/**
 * Formatted price for display
 */
export class PriceDisplayDto {
  @ApiProperty({
    description: 'Raw amount',
    example: 99.99,
  })
  amount!: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'EUR',
  })
  currency!: string;

  @ApiProperty({
    description: 'Currency symbol',
    example: '\u20AC',
  })
  symbol!: string;

  @ApiProperty({
    description: 'Formatted price string',
    example: '99,99 \u20AC',
  })
  formatted!: string;

  @ApiProperty({
    description: 'Formatted with currency code',
    example: '99.99 EUR',
  })
  formattedWithCode!: string;
}

/**
 * Price with multiple currency displays
 */
export class MultiCurrencyPriceDto {
  @ApiProperty({
    description: 'Original price',
    type: PriceDisplayDto,
  })
  original!: PriceDisplayDto;

  @ApiPropertyOptional({
    description: 'Converted price (if different currency requested)',
    type: PriceDisplayDto,
  })
  converted?: PriceDisplayDto;

  @ApiPropertyOptional({
    description: 'Exchange rate used for conversion',
    example: 1.085,
  })
  exchangeRate?: number;
}

// ============================================================================
// Festival Currency Settings DTOs
// ============================================================================

/**
 * Currency settings for a festival
 */
export class FestivalCurrencySettingsDto {
  @ApiProperty({
    description: 'Festival ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  festivalId!: string;

  @ApiProperty({
    description: 'Default currency',
    enum: SupportedCurrency,
    example: SupportedCurrency.EUR,
  })
  defaultCurrency!: SupportedCurrency;

  @ApiProperty({
    description: 'Supported currencies',
    enum: SupportedCurrency,
    isArray: true,
    example: [SupportedCurrency.EUR, SupportedCurrency.USD],
  })
  supportedCurrencies!: SupportedCurrency[];

  @ApiProperty({
    description: 'Display format',
    example: 'symbol',
    enum: ['symbol', 'code', 'both'],
  })
  displayFormat!: string;

  @ApiProperty({
    description: 'Decimal separator',
    example: ',',
  })
  decimalSeparator!: string;

  @ApiProperty({
    description: 'Thousands separator',
    example: ' ',
  })
  thousandsSeparator!: string;

  @ApiProperty({
    description: 'Symbol position',
    example: 'after',
    enum: ['before', 'after'],
  })
  symbolPosition!: string;

  @ApiProperty({
    description: 'Auto-convert prices for users',
    example: true,
  })
  autoConvert!: boolean;
}

/**
 * Update festival currency settings
 */
export class UpdateFestivalCurrencySettingsDto {
  @ApiPropertyOptional({
    description: 'Default currency',
    enum: SupportedCurrency,
    example: SupportedCurrency.EUR,
  })
  @IsOptional()
  @IsEnum(SupportedCurrency)
  defaultCurrency?: SupportedCurrency;

  @ApiPropertyOptional({
    description: 'Supported currencies',
    enum: SupportedCurrency,
    isArray: true,
    example: [SupportedCurrency.EUR, SupportedCurrency.USD],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SupportedCurrency, { each: true })
  supportedCurrencies?: SupportedCurrency[];

  @ApiPropertyOptional({
    description: 'Display format',
    example: 'symbol',
    enum: ['symbol', 'code', 'both'],
  })
  @IsOptional()
  @IsString()
  displayFormat?: string;

  @ApiPropertyOptional({
    description: 'Decimal separator',
    example: ',',
  })
  @IsOptional()
  @IsString()
  decimalSeparator?: string;

  @ApiPropertyOptional({
    description: 'Thousands separator',
    example: ' ',
  })
  @IsOptional()
  @IsString()
  thousandsSeparator?: string;

  @ApiPropertyOptional({
    description: 'Symbol position',
    example: 'after',
    enum: ['before', 'after'],
  })
  @IsOptional()
  @IsString()
  symbolPosition?: string;

  @ApiPropertyOptional({
    description: 'Auto-convert prices for users',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  autoConvert?: boolean;
}

// ============================================================================
// Currency Info DTOs
// ============================================================================

/**
 * Currency information
 */
export class CurrencyInfoDto {
  @ApiProperty({
    description: 'Currency code',
    example: 'EUR',
  })
  code!: string;

  @ApiProperty({
    description: 'Currency symbol',
    example: '\u20AC',
  })
  symbol!: string;

  @ApiProperty({
    description: 'Currency name (English)',
    example: 'Euro',
  })
  name!: string;

  @ApiProperty({
    description: 'Currency name (French)',
    example: 'Euro',
  })
  nameFr!: string;

  @ApiProperty({
    description: 'Number of decimal places',
    example: 2,
  })
  decimals!: number;

  @ApiProperty({
    description: 'Symbol position',
    example: 'after',
    enum: ['before', 'after'],
  })
  symbolPosition!: 'before' | 'after';
}

/**
 * List of all supported currencies
 */
export class SupportedCurrenciesResponseDto {
  @ApiProperty({
    description: 'List of supported currencies',
    type: [CurrencyInfoDto],
  })
  currencies!: CurrencyInfoDto[];

  @ApiProperty({
    description: 'Base currency for exchange rates',
    example: 'EUR',
  })
  baseCurrency!: string;
}

// ============================================================================
// Live Rates DTOs
// ============================================================================

/**
 * Individual live rate data
 */
export class LiveRateDataDto {
  @ApiProperty({
    description: 'Exchange rate',
    example: 1.085,
  })
  rate!: number;

  @ApiPropertyOptional({
    description: '24-hour change in absolute terms',
    example: 0.005,
  })
  change24h?: number;

  @ApiPropertyOptional({
    description: '24-hour change in percent',
    example: 0.46,
  })
  changePercent24h?: number;

  @ApiProperty({
    description: 'Confidence score (0-100)',
    example: 95,
  })
  confidence!: number;
}

/**
 * Live rates response
 */
export class LiveRatesResponseDto {
  @ApiProperty({
    description: 'Base currency',
    example: 'EUR',
  })
  baseCurrency!: string;

  @ApiProperty({
    description: 'Exchange rates with metadata',
    type: 'object',
    additionalProperties: { type: 'object' },
  })
  rates!: Record<string, LiveRateDataDto>;

  @ApiProperty({
    description: 'Provider used for rates',
    example: 'ecb',
  })
  provider!: string;

  @ApiProperty({
    description: 'Timestamp when rates were fetched',
    example: '2026-01-09T12:00:00.000Z',
  })
  timestamp!: Date;

  @ApiProperty({
    description: 'Next scheduled update',
    example: '2026-01-09T12:15:00.000Z',
  })
  nextUpdate!: Date;

  @ApiProperty({
    description: 'Whether response is from cache',
    example: false,
  })
  fromCache!: boolean;
}

// ============================================================================
// Historical Rates DTOs
// ============================================================================

/**
 * Historical rate entry
 */
export class HistoricalRateEntryDto {
  @ApiProperty({
    description: 'Date of the rate',
    example: '2026-01-08T00:00:00.000Z',
  })
  date!: Date;

  @ApiProperty({
    description: 'Exchange rate',
    example: 1.082,
  })
  rate!: number;

  @ApiProperty({
    description: 'Rate source',
    example: 'ecb',
  })
  source!: string;
}

/**
 * Historical rates response
 */
export class HistoricalRatesResponseDto {
  @ApiProperty({
    description: 'Base currency',
    example: 'EUR',
  })
  baseCurrency!: string;

  @ApiProperty({
    description: 'Target currency',
    example: 'USD',
  })
  targetCurrency!: string;

  @ApiProperty({
    description: 'Period in days',
    example: 30,
  })
  period!: number;

  @ApiProperty({
    description: 'Historical rates',
    type: [HistoricalRateEntryDto],
  })
  rates!: HistoricalRateEntryDto[];
}

// ============================================================================
// Rate Alert DTOs
// ============================================================================

/**
 * Create rate alert subscription
 */
export class CreateRateAlertDto {
  @ApiProperty({
    description: 'Currency to monitor',
    enum: SupportedCurrency,
    example: SupportedCurrency.USD,
  })
  @IsEnum(SupportedCurrency)
  currency!: SupportedCurrency;

  @ApiPropertyOptional({
    description: 'Alert type (increase, decrease, or both)',
    example: 'both',
    enum: ['increase', 'decrease', 'both'],
    default: 'both',
  })
  @IsOptional()
  @IsString()
  type?: 'increase' | 'decrease' | 'both';

  @ApiPropertyOptional({
    description: 'Threshold percentage for alert',
    example: 2.0,
    minimum: 0.1,
    maximum: 50,
    default: 2.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  threshold?: number;

  @ApiPropertyOptional({
    description: 'Festival ID to scope the alert',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  festivalId?: string;
}

/**
 * Rate alert subscription response
 */
export class RateAlertSubscriptionDto {
  @ApiProperty({
    description: 'Subscription ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId!: string;

  @ApiPropertyOptional({
    description: 'Festival ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  festivalId?: string;

  @ApiProperty({
    description: 'Currency being monitored',
    enum: SupportedCurrency,
    example: SupportedCurrency.USD,
  })
  currency!: SupportedCurrency;

  @ApiProperty({
    description: 'Alert type',
    example: 'both',
    enum: ['increase', 'decrease', 'both'],
  })
  type!: 'increase' | 'decrease' | 'both';

  @ApiProperty({
    description: 'Threshold percentage',
    example: 2.0,
  })
  threshold!: number;

  @ApiProperty({
    description: 'Whether alert is enabled',
    example: true,
  })
  enabled!: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-01-09T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Last time alert was triggered',
    example: '2026-01-09T12:00:00.000Z',
  })
  lastTriggered?: Date;
}

// ============================================================================
// Volatility DTOs
// ============================================================================

/**
 * Volatility metrics response
 */
export class VolatilityMetricsDto {
  @ApiProperty({
    description: 'Currency',
    enum: SupportedCurrency,
    example: SupportedCurrency.USD,
  })
  currency!: SupportedCurrency;

  @ApiProperty({
    description: 'Time period',
    example: '30d',
  })
  period!: string;

  @ApiProperty({
    description: 'Average rate over period',
    example: 1.085,
  })
  averageRate!: number;

  @ApiProperty({
    description: 'Minimum rate over period',
    example: 1.070,
  })
  minRate!: number;

  @ApiProperty({
    description: 'Maximum rate over period',
    example: 1.095,
  })
  maxRate!: number;

  @ApiProperty({
    description: 'Standard deviation',
    example: 0.008,
  })
  standardDeviation!: number;

  @ApiProperty({
    description: 'Volatility index (0-100)',
    example: 7.3,
  })
  volatilityIndex!: number;

  @ApiProperty({
    description: 'Percent change over period',
    example: 0.92,
  })
  changePercent!: number;
}

/**
 * All currencies volatility response
 */
export class AllVolatilityResponseDto {
  @ApiProperty({
    description: 'Period in days',
    example: 30,
  })
  period!: number;

  @ApiProperty({
    description: 'Volatility metrics by currency',
    type: [VolatilityMetricsDto],
  })
  currencies!: VolatilityMetricsDto[];
}

// ============================================================================
// Provider Status DTOs
// ============================================================================

/**
 * Provider health info
 */
export class ProviderHealthDto {
  @ApiProperty({
    description: 'Whether provider is available',
    example: true,
  })
  available!: boolean;

  @ApiPropertyOptional({
    description: 'Last successful request',
    example: '2026-01-09T12:00:00.000Z',
  })
  lastSuccess?: Date;

  @ApiPropertyOptional({
    description: 'Last error timestamp',
    example: '2026-01-09T11:00:00.000Z',
  })
  lastError?: Date;

  @ApiPropertyOptional({
    description: 'Last error message',
    example: 'Connection timeout',
  })
  lastErrorMessage?: string;

  @ApiProperty({
    description: 'Requests in current window',
    example: 5,
  })
  requestsInWindow!: number;

  @ApiProperty({
    description: 'Rate limit remaining',
    example: 995,
  })
  rateLimitRemaining!: number;

  @ApiProperty({
    description: 'Average latency in ms',
    example: 150,
  })
  averageLatencyMs!: number;
}

/**
 * Provider status
 */
export class ProviderStatusDto {
  @ApiProperty({
    description: 'Provider ID',
    example: 'ecb',
  })
  id!: string;

  @ApiProperty({
    description: 'Provider name',
    example: 'European Central Bank',
  })
  name!: string;

  @ApiProperty({
    description: 'Whether provider is available',
    example: true,
  })
  available!: boolean;

  @ApiProperty({
    description: 'Provider priority (lower = higher)',
    example: 1,
  })
  priority!: number;

  @ApiProperty({
    description: 'Provider health',
    type: ProviderHealthDto,
  })
  health!: ProviderHealthDto;

  @ApiPropertyOptional({
    description: 'Last time this provider was used',
    example: '2026-01-09T12:00:00.000Z',
  })
  lastUsed?: Date;
}

/**
 * Scheduler stats
 */
export class SchedulerStatsDto {
  @ApiProperty({
    description: 'Whether scheduler is running',
    example: true,
  })
  isRunning!: boolean;

  @ApiPropertyOptional({
    description: 'Last update timestamp',
    example: '2026-01-09T12:00:00.000Z',
  })
  lastUpdate?: Date;

  @ApiPropertyOptional({
    description: 'Next scheduled update',
    example: '2026-01-09T12:15:00.000Z',
  })
  nextUpdate?: Date;

  @ApiProperty({
    description: 'Total update count',
    example: 150,
  })
  updateCount!: number;

  @ApiProperty({
    description: 'Total error count',
    example: 3,
  })
  errorCount!: number;

  @ApiPropertyOptional({
    description: 'Last error message',
    example: 'Provider timeout',
  })
  lastError?: string;

  @ApiProperty({
    description: 'Current update interval in ms',
    example: 600000,
  })
  currentInterval!: number;

  @ApiProperty({
    description: 'Whether currently in business hours',
    example: true,
  })
  isBusinessHours!: boolean;

  @ApiProperty({
    description: 'Provider statuses',
    type: [ProviderStatusDto],
  })
  providers!: ProviderStatusDto[];
}
