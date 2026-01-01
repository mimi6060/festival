export interface DatabaseConfig {
  url: string;
}

export interface JwtConfig {
  secret: string;
  refreshSecret: string;
  expiresIn: string;
  refreshExpiresIn: string;
  issuer: string;
  audience: string;
}

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  currency: string;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
}

export interface QrCodeConfig {
  baseUrl: string;
}

export interface Configuration {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  stripe: StripeConfig;
  qrCode: QrCodeConfig;
}

export default (): Configuration => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:4200'],
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://festival:festival@localhost:5432/festival?schema=public',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'festival-api',
    audience: process.env.JWT_AUDIENCE || 'festival-app',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    currency: process.env.STRIPE_CURRENCY || 'eur',
  },
  qrCode: {
    baseUrl: process.env.QR_CODE_BASE_URL || 'http://localhost:3000/api/tickets/validate',
  },
});
