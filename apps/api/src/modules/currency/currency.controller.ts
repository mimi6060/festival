/**
 * Currency Controller
 *
 * REST API endpoints for currency operations:
 * - Get supported currencies
 * - Get exchange rates (current and historical)
 * - Get live rates with metadata
 * - Convert amounts
 * - Manage festival currency settings
 * - Rate alerts and volatility metrics
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { ExchangeRateService } from './services/exchange-rate.service';
import { ExchangeRateScheduler } from './services/exchange-rate-scheduler';
import { RateAlertService } from './services/rate-alert.service';
import {
  SupportedCurrency,
  CurrencyConversionDto,
  CurrencyConversionResponseDto,
  ExchangeRateDto,
  ExchangeRatesResponseDto,
  CreateExchangeRateDto,
  SupportedCurrenciesResponseDto,
  PriceDisplayDto,
  FestivalCurrencySettingsDto,
  UpdateFestivalCurrencySettingsDto,
  LiveRatesResponseDto,
  HistoricalRatesResponseDto,
  CreateRateAlertDto,
  RateAlertSubscriptionDto,
  VolatilityMetricsDto,
  AllVolatilityResponseDto,
  SchedulerStatsDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Currency')
@Controller('currency')
export class CurrencyController {
  constructor(
    private readonly currencyService: CurrencyService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly exchangeRateScheduler: ExchangeRateScheduler,
    private readonly rateAlertService: RateAlertService
  ) {}

  // ============================================================================
  // Public Endpoints
  // ============================================================================

  @Get('supported')
  @ApiOperation({ summary: 'Get all supported currencies' })
  @ApiResponse({
    status: 200,
    description: 'List of supported currencies',
    type: SupportedCurrenciesResponseDto,
  })
  getSupportedCurrencies(): SupportedCurrenciesResponseDto {
    return {
      currencies: this.currencyService.getSupportedCurrencies(),
      baseCurrency: SupportedCurrency.EUR,
    };
  }

  @Get('rates')
  @ApiOperation({ summary: 'Get current exchange rates' })
  @ApiQuery({
    name: 'base',
    required: false,
    enum: SupportedCurrency,
    description: 'Base currency (defaults to EUR)',
  })
  @ApiResponse({
    status: 200,
    description: 'Current exchange rates',
    type: ExchangeRatesResponseDto,
  })
  async getExchangeRates(
    @Query('base') base?: SupportedCurrency
  ): Promise<ExchangeRatesResponseDto> {
    const ratesBatch = await this.exchangeRateService.getAllRates();

    // If base currency is different, convert rates
    if (base && base !== SupportedCurrency.EUR) {
      const baseRate = ratesBatch.rates[base];
      const convertedRates: Record<string, number> = {};

      for (const [currency, rate] of Object.entries(ratesBatch.rates)) {
        if (currency === base) {
          convertedRates[currency] = 1.0;
        } else {
          convertedRates[currency] = rate / baseRate;
        }
      }

      return {
        baseCurrency: base,
        timestamp: ratesBatch.timestamp,
        rates: convertedRates,
        source: ratesBatch.source,
      };
    }

    return {
      baseCurrency: ratesBatch.baseCurrency,
      timestamp: ratesBatch.timestamp,
      rates: ratesBatch.rates,
      source: ratesBatch.source,
    };
  }

  @Get('rates/live')
  @ApiOperation({ summary: 'Get live rates with metadata and 24h changes' })
  @ApiQuery({
    name: 'base',
    required: false,
    enum: SupportedCurrency,
    description: 'Base currency (defaults to EUR)',
  })
  @ApiResponse({
    status: 200,
    description: 'Live exchange rates with metadata',
    type: LiveRatesResponseDto,
  })
  async getLiveRates(@Query('base') base?: SupportedCurrency): Promise<LiveRatesResponseDto> {
    const liveRates = await this.exchangeRateService.getLiveRates(base || SupportedCurrency.EUR);

    return {
      baseCurrency: liveRates.baseCurrency,
      rates: liveRates.rates,
      provider: liveRates.provider,
      timestamp: liveRates.timestamp,
      nextUpdate: liveRates.nextUpdate,
      fromCache: liveRates.fromCache,
    };
  }

  @Get('rates/history/:currency')
  @ApiOperation({ summary: 'Get historical rates for a currency' })
  @ApiParam({ name: 'currency', enum: SupportedCurrency, description: 'Target currency' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days (defaults to 30, max 365)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historical exchange rates',
    type: HistoricalRatesResponseDto,
  })
  async getHistoricalRatesForCurrency(
    @Param('currency') currency: SupportedCurrency,
    @Query('days') days?: number
  ): Promise<HistoricalRatesResponseDto> {
    const daysNum = Math.min(Math.max(days || 30, 1), 365);
    const rates = await this.exchangeRateService.getHistoricalRatesForCurrency(currency, daysNum);

    return {
      baseCurrency: SupportedCurrency.EUR,
      targetCurrency: currency,
      period: daysNum,
      rates: rates.map((r) => ({
        date: r.effectiveAt,
        rate: r.rate,
        source: r.source,
      })),
    };
  }

  @Get('rates/volatility')
  @ApiOperation({ summary: 'Get volatility metrics for all currencies' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days for calculation (defaults to 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Volatility metrics for all currencies',
    type: AllVolatilityResponseDto,
  })
  async getAllVolatilityMetrics(@Query('days') days?: number): Promise<AllVolatilityResponseDto> {
    const daysNum = Math.min(Math.max(days || 30, 7), 365);

    const currencies: VolatilityMetricsDto[] = [];
    for (const currency of Object.values(SupportedCurrency)) {
      if (currency === SupportedCurrency.EUR) {
        continue;
      }
      const metrics = await this.exchangeRateService.getVolatilityMetrics(currency, daysNum);
      currencies.push(metrics);
    }

    return {
      period: daysNum,
      currencies,
    };
  }

  @Get('rates/volatility/:currency')
  @ApiOperation({ summary: 'Get volatility metrics for a currency' })
  @ApiParam({ name: 'currency', enum: SupportedCurrency, description: 'Currency' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days for calculation (defaults to 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Volatility metrics',
    type: VolatilityMetricsDto,
  })
  async getVolatilityMetrics(
    @Param('currency') currency: SupportedCurrency,
    @Query('days') days?: number
  ): Promise<VolatilityMetricsDto> {
    const daysNum = Math.min(Math.max(days || 30, 7), 365);
    return this.exchangeRateService.getVolatilityMetrics(currency, daysNum);
  }

  @Get('rates/:from/:to')
  @ApiOperation({ summary: 'Get exchange rate for a currency pair' })
  @ApiParam({ name: 'from', enum: SupportedCurrency, description: 'Source currency' })
  @ApiParam({ name: 'to', enum: SupportedCurrency, description: 'Target currency' })
  @ApiResponse({
    status: 200,
    description: 'Exchange rate for the currency pair',
    type: ExchangeRateDto,
  })
  async getExchangeRate(
    @Param('from') from: SupportedCurrency,
    @Param('to') to: SupportedCurrency
  ): Promise<ExchangeRateDto> {
    const rate = await this.exchangeRateService.getRate(from, to);

    return {
      id: rate.id || '',
      baseCurrency: rate.baseCurrency,
      targetCurrency: rate.targetCurrency,
      rate: rate.rate,
      inverseRate: rate.inverseRate,
      source: rate.source,
      effectiveAt: rate.effectiveAt,
      isActive: true,
    };
  }

  @Post('convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert an amount between currencies' })
  @ApiResponse({
    status: 200,
    description: 'Conversion result',
    type: CurrencyConversionResponseDto,
  })
  async convertAmount(@Body() dto: CurrencyConversionDto): Promise<CurrencyConversionResponseDto> {
    const date = dto.date ? new Date(dto.date) : undefined;
    return this.currencyService.convertForResponse(
      dto.amount,
      dto.fromCurrency,
      dto.toCurrency,
      date
    );
  }

  @Get('format/:amount/:currency')
  @ApiOperation({ summary: 'Format a price for display' })
  @ApiParam({ name: 'amount', type: Number, description: 'Amount to format' })
  @ApiParam({ name: 'currency', enum: SupportedCurrency, description: 'Currency code' })
  @ApiQuery({
    name: 'locale',
    required: false,
    enum: ['en', 'fr'],
    description: 'Locale for formatting (defaults to fr)',
  })
  @ApiResponse({
    status: 200,
    description: 'Formatted price',
    type: PriceDisplayDto,
  })
  formatPrice(
    @Param('amount') amount: number,
    @Param('currency') currency: SupportedCurrency,
    @Query('locale') locale?: 'en' | 'fr'
  ): PriceDisplayDto {
    return this.currencyService.formatPrice(Number(amount), currency, locale || 'fr');
  }

  // ============================================================================
  // Rate Alerts (Protected)
  // ============================================================================

  @Post('rates/alerts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to rate alerts' })
  @ApiResponse({
    status: 201,
    description: 'Alert subscription created',
    type: RateAlertSubscriptionDto,
  })
  async createRateAlert(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRateAlertDto
  ): Promise<RateAlertSubscriptionDto> {
    const subscription = await this.rateAlertService.createSubscription({
      userId: user.id,
      currency: dto.currency,
      type: dto.type,
      threshold: dto.threshold,
      festivalId: dto.festivalId,
    });

    return subscription;
  }

  @Get('rates/alerts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my rate alert subscriptions' })
  @ApiResponse({
    status: 200,
    description: 'List of alert subscriptions',
    type: [RateAlertSubscriptionDto],
  })
  async getMyRateAlerts(
    @CurrentUser() user: AuthenticatedUser
  ): Promise<RateAlertSubscriptionDto[]> {
    return this.rateAlertService.getUserSubscriptions(user.id);
  }

  @Delete('rates/alerts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a rate alert subscription' })
  @ApiParam({ name: 'id', description: 'Alert subscription ID' })
  @ApiResponse({
    status: 204,
    description: 'Subscription deleted',
  })
  async deleteRateAlert(@Param('id') id: string): Promise<void> {
    await this.rateAlertService.deleteSubscription(id);
  }

  // ============================================================================
  // Festival Currency Settings (Protected)
  // ============================================================================

  @Get('festivals/:festivalId/settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get festival currency settings' })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiResponse({
    status: 200,
    description: 'Festival currency settings',
    type: FestivalCurrencySettingsDto,
  })
  async getFestivalCurrencySettings(
    @Param('festivalId') festivalId: string
  ): Promise<FestivalCurrencySettingsDto> {
    return this.currencyService.getFestivalCurrencySettings(festivalId);
  }

  @Put('festivals/:festivalId/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update festival currency settings' })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiResponse({
    status: 200,
    description: 'Updated festival currency settings',
    type: FestivalCurrencySettingsDto,
  })
  async updateFestivalCurrencySettings(
    @Param('festivalId') festivalId: string,
    @Body() dto: UpdateFestivalCurrencySettingsDto
  ): Promise<FestivalCurrencySettingsDto> {
    return this.currencyService.updateFestivalCurrencySettings(festivalId, dto);
  }

  // ============================================================================
  // Admin Endpoints (Protected)
  // ============================================================================

  @Get('rates/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get exchange rate scheduler status and provider health' })
  @ApiResponse({
    status: 200,
    description: 'Scheduler and provider status',
    type: SchedulerStatsDto,
  })
  getSchedulerStatus(): SchedulerStatsDto {
    const stats = this.exchangeRateScheduler.getStats();
    const providers = this.exchangeRateService.getProviderStatuses();

    return {
      isRunning: stats.isRunning,
      lastUpdate: stats.lastUpdate || undefined,
      nextUpdate: stats.nextUpdate || undefined,
      updateCount: stats.updateCount,
      errorCount: stats.errorCount,
      lastError: stats.lastError || undefined,
      currentInterval: stats.currentInterval,
      isBusinessHours: stats.isBusinessHours,
      providers,
    };
  }

  @Post('rates/refresh')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually refresh exchange rates from providers' })
  @ApiResponse({
    status: 200,
    description: 'Exchange rates refreshed',
  })
  async refreshRates(): Promise<{ message: string; timestamp: Date }> {
    await this.exchangeRateScheduler.triggerUpdate();
    return {
      message: 'Exchange rates refreshed successfully',
      timestamp: new Date(),
    };
  }

  @Post('rates/manual')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually set an exchange rate' })
  @ApiResponse({
    status: 201,
    description: 'Exchange rate created',
    type: ExchangeRateDto,
  })
  async createManualRate(@Body() dto: CreateExchangeRateDto): Promise<ExchangeRateDto> {
    const rate = await this.exchangeRateService.setManualRate(
      dto.baseCurrency,
      dto.targetCurrency,
      dto.rate
    );

    return {
      id: rate.id || '',
      baseCurrency: rate.baseCurrency,
      targetCurrency: rate.targetCurrency,
      rate: rate.rate,
      inverseRate: rate.inverseRate,
      source: dto.source || 'manual',
      effectiveAt: rate.effectiveAt,
      isActive: true,
    };
  }

  @Get('rates/history/:from/:to')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get historical exchange rates for a currency pair' })
  @ApiParam({ name: 'from', enum: SupportedCurrency, description: 'Source currency' })
  @ApiParam({ name: 'to', enum: SupportedCurrency, description: 'Target currency' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'Historical exchange rates',
    type: [ExchangeRateDto],
  })
  async getHistoricalRates(
    @Param('from') from: SupportedCurrency,
    @Param('to') to: SupportedCurrency,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<ExchangeRateDto[]> {
    const rates = await this.exchangeRateService.getHistoricalRates(
      from,
      to,
      new Date(startDate),
      new Date(endDate)
    );

    return rates.map((r) => ({
      id: r.id || '',
      baseCurrency: r.baseCurrency,
      targetCurrency: r.targetCurrency,
      rate: r.rate,
      inverseRate: r.inverseRate,
      source: r.source,
      effectiveAt: r.effectiveAt,
      isActive: false,
    }));
  }
}
