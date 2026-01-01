import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import {
  AppConfig,
  DatabaseConfig,
  JwtConfig,
  StripeConfig,
  QrCodeConfig,
} from './configuration';

@Injectable()
export class ConfigService {
  constructor(private readonly configService: NestConfigService) {}

  get app(): AppConfig {
    return this.configService.get<AppConfig>('app')!;
  }

  get database(): DatabaseConfig {
    return this.configService.get<DatabaseConfig>('database')!;
  }

  get jwt(): JwtConfig {
    return this.configService.get<JwtConfig>('jwt')!;
  }

  get stripe(): StripeConfig {
    return this.configService.get<StripeConfig>('stripe')!;
  }

  get qrCode(): QrCodeConfig {
    return this.configService.get<QrCodeConfig>('qrCode')!;
  }

  get isDevelopment(): boolean {
    return this.app.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.app.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.app.nodeEnv === 'test';
  }
}
