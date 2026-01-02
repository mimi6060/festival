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
  frontendUrl: string;
}

export interface QrCodeConfig {
  baseUrl: string;
}

export interface MailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  supportEmail: string;
}

export interface RedisConfig {
  url: string;
  host: string;
  port: number;
  password?: string;
}

export interface UploadConfig {
  /** Storage type: 'local' or 's3' */
  storageType: 'local' | 's3';
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Maximum image size in bytes */
  maxImageSize: number;
  /** Local storage path (for local storage) */
  localPath: string;
  /** Base URL for serving files (for local storage) */
  baseUrl: string;
  /** S3 configuration (for S3 storage) */
  s3: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
    signedUrlExpiry: number;
  };
}

export interface Configuration {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  stripe: StripeConfig;
  qrCode: QrCodeConfig;
  mail: MailConfig;
  redis: RedisConfig;
  upload: UploadConfig;
}

export default (): Configuration => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:4200'],
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
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
  mail: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '"Festival App" <noreply@festival.com>',
    supportEmail: process.env.EMAIL_SUPPORT || 'support@festival.com',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  upload: {
    storageType: (process.env.STORAGE_TYPE as 'local' | 's3') || 'local',
    maxFileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760', 10), // 10MB
    maxImageSize: parseInt(process.env.UPLOAD_MAX_IMAGE_SIZE || '5242880', 10), // 5MB
    localPath: process.env.UPLOAD_LOCAL_PATH || './uploads',
    baseUrl: process.env.UPLOAD_BASE_URL || '/uploads',
    s3: {
      bucket: process.env.AWS_BUCKET || '',
      region: process.env.AWS_REGION || 'eu-west-1',
      accessKeyId: process.env.AWS_ACCESS_KEY || '',
      secretAccessKey: process.env.AWS_SECRET_KEY || '',
      endpoint: process.env.AWS_ENDPOINT || undefined,
      signedUrlExpiry: parseInt(process.env.AWS_SIGNED_URL_EXPIRY || '3600', 10),
    },
  },
});
