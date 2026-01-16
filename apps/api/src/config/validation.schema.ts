/**
 * Environment Variables Validation Schema
 *
 * Uses Joi for comprehensive validation of all environment variables.
 * Ensures the application fails fast if required configuration is missing.
 */

import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // ==========================================================================
  // APPLICATION
  // ==========================================================================
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  APP_NAME: Joi.string().default('Festival Platform'),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),
  API_URL: Joi.string().uri().default('http://localhost:3333'),
  ADMIN_URL: Joi.string().uri().default('http://localhost:4201'),
  PORT: Joi.number().port().default(3333),
  API_PREFIX: Joi.string().default('api'),
  API_VERSION: Joi.string().default('v1'),
  DEBUG: Joi.boolean().default(false),

  // ==========================================================================
  // DATABASE - PostgreSQL
  // ==========================================================================
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_NAME: Joi.string().default('festival_db'),
  DATABASE_USER: Joi.string().default('festival_user'),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_URL: Joi.string().required(),
  DATABASE_POOL_MIN: Joi.number().min(1).default(2),
  DATABASE_POOL_MAX: Joi.number().min(1).default(10),
  DATABASE_CONNECTION_TIMEOUT: Joi.number().default(30000),
  DATABASE_SSL_ENABLED: Joi.boolean().default(false),
  DATABASE_SSL_REJECT_UNAUTHORIZED: Joi.boolean().default(true),

  // ==========================================================================
  // REDIS
  // ==========================================================================
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().min(0).max(15).default(0),
  REDIS_URL: Joi.string().default('redis://localhost:6379/0'),
  REDIS_TLS_ENABLED: Joi.boolean().default(false),
  REDIS_CLUSTER_ENABLED: Joi.boolean().default(false),
  REDIS_CLUSTER_NODES: Joi.string().allow('').default(''),
  CACHE_TTL: Joi.number().default(3600),
  CACHE_MAX_ITEMS: Joi.number().default(10000),

  // ==========================================================================
  // JWT AUTHENTICATION
  // ==========================================================================
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.number().default(900), // 15 minutes in seconds
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  JWT_ISSUER: Joi.string().default('festival-api'),
  JWT_AUDIENCE: Joi.string().default('festival-app'),
  JWT_ALGORITHM: Joi.string()
    .valid('HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512')
    .default('HS256'),
  BCRYPT_SALT_ROUNDS: Joi.number().min(4).max(16).default(12),
  SESSION_SECRET: Joi.string().allow('').default(''),
  SESSION_MAX_AGE: Joi.number().default(86400000),

  // ==========================================================================
  // QR CODE & TICKETS
  // ==========================================================================
  QR_CODE_SECRET: Joi.string().min(32).required(),

  // ==========================================================================
  // OAUTH (Optional)
  // ==========================================================================
  GOOGLE_OAUTH_ENABLED: Joi.boolean().default(false),
  GOOGLE_CLIENT_ID: Joi.string().allow('').default(''),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').default(''),
  GOOGLE_CALLBACK_URL: Joi.string().allow('').default(''),
  GITHUB_OAUTH_ENABLED: Joi.boolean().default(false),
  GITHUB_CLIENT_ID: Joi.string().allow('').default(''),
  GITHUB_CLIENT_SECRET: Joi.string().allow('').default(''),
  GITHUB_CALLBACK_URL: Joi.string().allow('').default(''),
  FACEBOOK_OAUTH_ENABLED: Joi.boolean().default(false),
  FACEBOOK_APP_ID: Joi.string().allow('').default(''),
  FACEBOOK_APP_SECRET: Joi.string().allow('').default(''),
  FACEBOOK_CALLBACK_URL: Joi.string().allow('').default(''),
  APPLE_OAUTH_ENABLED: Joi.boolean().default(false),
  APPLE_CLIENT_ID: Joi.string().allow('').default(''),
  APPLE_TEAM_ID: Joi.string().allow('').default(''),
  APPLE_KEY_ID: Joi.string().allow('').default(''),
  APPLE_PRIVATE_KEY: Joi.string().allow('').default(''),
  APPLE_CALLBACK_URL: Joi.string().allow('').default(''),

  // ==========================================================================
  // STRIPE PAYMENTS
  // ==========================================================================
  STRIPE_SECRET_KEY: Joi.string()
    .pattern(/^sk_(test|live)_/)
    .required(),
  STRIPE_PUBLISHABLE_KEY: Joi.string()
    .pattern(/^pk_(test|live)_/)
    .required(),
  STRIPE_WEBHOOK_SECRET: Joi.string()
    .pattern(/^whsec_/)
    .required(),
  STRIPE_CURRENCY: Joi.string().length(3).lowercase().default('eur'),
  STRIPE_CONNECT_ENABLED: Joi.boolean().default(false),
  STRIPE_CONNECT_CLIENT_ID: Joi.string().allow('').default(''),
  PAYMENT_MIN_AMOUNT: Joi.number().min(0).default(100),
  PAYMENT_MAX_AMOUNT: Joi.number().min(100).default(100000000),

  // ==========================================================================
  // EMAIL - SMTP
  // ==========================================================================
  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().port().default(1025),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASSWORD: Joi.string().allow('').default(''),
  SMTP_FROM_NAME: Joi.string().default('Festival Platform'),
  SMTP_FROM_EMAIL: Joi.string().email().default('noreply@festival-platform.com'),
  SMTP_REPLY_TO: Joi.string().email().allow('').default(''),
  EMAIL_TEMPLATES_PATH: Joi.string().default('./templates/email'),
  EMAIL_QUEUE_ENABLED: Joi.boolean().default(false),
  EMAIL_MAX_RETRIES: Joi.number().min(0).default(3),

  // ==========================================================================
  // FILE STORAGE
  // ==========================================================================
  STORAGE_TYPE: Joi.string().valid('local', 's3', 'minio').default('local'),
  UPLOAD_LOCAL_PATH: Joi.string().default('./uploads'),
  UPLOAD_BASE_URL: Joi.string().default('/uploads'),
  AWS_REGION: Joi.string().default('eu-west-3'),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
  AWS_S3_BUCKET: Joi.string().default('festival-uploads'),
  AWS_S3_ENDPOINT: Joi.string().allow('').default(''),
  AWS_S3_PUBLIC_URL: Joi.string().allow('').default(''),
  UPLOAD_MAX_SIZE: Joi.number().default(10485760),
  UPLOAD_MAX_IMAGE_SIZE: Joi.number().default(5242880),
  UPLOAD_ALLOWED_MIME_TYPES: Joi.string().default(
    'image/jpeg,image/png,image/gif,image/webp,application/pdf'
  ),
  AWS_SIGNED_URL_EXPIRY: Joi.number().default(3600),

  // ==========================================================================
  // PUSH NOTIFICATIONS
  // ==========================================================================
  FIREBASE_ENABLED: Joi.boolean().default(false),
  FIREBASE_PROJECT_ID: Joi.string().allow('').default(''),
  FIREBASE_PRIVATE_KEY: Joi.string().allow('').default(''),
  FIREBASE_CLIENT_EMAIL: Joi.string().allow('').default(''),
  FIREBASE_DATABASE_URL: Joi.string().allow('').default(''),
  FIREBASE_CONFIG: Joi.string().allow('').default(''),
  APNS_ENABLED: Joi.boolean().default(false),
  APNS_KEY_ID: Joi.string().allow('').default(''),
  APNS_TEAM_ID: Joi.string().allow('').default(''),
  APNS_BUNDLE_ID: Joi.string().allow('').default(''),
  APNS_PRODUCTION: Joi.boolean().default(false),

  // ==========================================================================
  // EXTERNAL SERVICES
  // ==========================================================================
  SENTRY_ENABLED: Joi.boolean().default(false),
  SENTRY_DSN: Joi.string().allow('').default(''),
  SENTRY_ENVIRONMENT: Joi.string().default('development'),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0.1),
  SENTRY_PROFILES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0.1),
  GOOGLE_MAPS_API_KEY: Joi.string().allow('').default(''),
  TWILIO_ENABLED: Joi.boolean().default(false),
  TWILIO_ACCOUNT_SID: Joi.string().allow('').default(''),
  TWILIO_AUTH_TOKEN: Joi.string().allow('').default(''),
  TWILIO_PHONE_NUMBER: Joi.string().allow('').default(''),

  // ==========================================================================
  // SECURITY
  // ==========================================================================
  CORS_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:4201'),
  RATE_LIMIT_ENABLED: Joi.boolean().default(true),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: Joi.boolean().default(false),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(10),
  CSRF_ENABLED: Joi.boolean().default(true),
  CSRF_SECRET: Joi.string().allow('').default(''),
  QR_SECRET: Joi.string().min(32).required(),
  ENCRYPTION_KEY: Joi.string().min(32).allow('').default(''),

  // ==========================================================================
  // LOGGING & MONITORING
  // ==========================================================================
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('debug'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('pretty'),
  LOG_DIR: Joi.string().default('./logs'),
  LOG_RETENTION_DAYS: Joi.number().default(30),
  LOG_REQUESTS: Joi.boolean().default(true),
  LOG_RESPONSES: Joi.boolean().default(false),
  LOG_BODY: Joi.boolean().default(false),
  PROMETHEUS_ENABLED: Joi.boolean().default(true),
  PROMETHEUS_PORT: Joi.number().port().default(9090),
  PROMETHEUS_PATH: Joi.string().default('/metrics'),

  // ==========================================================================
  // FEATURE FLAGS
  // ==========================================================================
  FEATURE_REGISTRATION_ENABLED: Joi.boolean().default(true),
  FEATURE_PAYMENT_ENABLED: Joi.boolean().default(true),
  FEATURE_CASHLESS_ENABLED: Joi.boolean().default(true),
  FEATURE_PUSH_NOTIFICATIONS_ENABLED: Joi.boolean().default(false),
  FEATURE_SMS_NOTIFICATIONS_ENABLED: Joi.boolean().default(false),
  FEATURE_OAUTH_ENABLED: Joi.boolean().default(false),
  FEATURE_API_DOCS_ENABLED: Joi.boolean().default(true),
  FEATURE_GRAPHQL_ENABLED: Joi.boolean().default(false),

  // ==========================================================================
  // QUEUE
  // ==========================================================================
  QUEUE_ENABLED: Joi.boolean().default(true),
  QUEUE_DEFAULT_JOB_OPTIONS_ATTEMPTS: Joi.number().default(3),
  QUEUE_DEFAULT_JOB_OPTIONS_BACKOFF: Joi.number().default(5000),
  QUEUE_DEFAULT_JOB_OPTIONS_REMOVE_ON_COMPLETE: Joi.boolean().default(true),
  QUEUE_DEFAULT_JOB_OPTIONS_REMOVE_ON_FAIL: Joi.boolean().default(false),

  // ==========================================================================
  // ADMIN
  // ==========================================================================
  ADMIN_EMAIL: Joi.string().email().default('admin@festival-platform.com'),
  ADMIN_PASSWORD: Joi.string().min(8).default('admin_secure_password_change_me'),
  ADMIN_FIRST_NAME: Joi.string().default('Admin'),
  ADMIN_LAST_NAME: Joi.string().default('System'),

  // ==========================================================================
  // SWAGGER
  // ==========================================================================
  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_TITLE: Joi.string().default('Festival Platform API'),
  SWAGGER_DESCRIPTION: Joi.string().default(
    'API documentation for the Festival Management Platform'
  ),
  SWAGGER_VERSION: Joi.string().default('1.0.0'),
  SWAGGER_PATH: Joi.string().default('api/docs'),

  // ==========================================================================
  // TESTING
  // ==========================================================================
  TEST_DATABASE_URL: Joi.string().allow('').default(''),
  TEST_REDIS_URL: Joi.string().allow('').default(''),
  E2E_BASE_URL: Joi.string().default('http://localhost:3333'),
  E2E_TIMEOUT: Joi.number().default(30000),
});

/**
 * Validation options for ConfigModule
 */
export const validationOptions = {
  allowUnknown: true, // Allow environment variables not defined in schema
  abortEarly: false, // Report all validation errors, not just the first one
  cache: true, // Cache validation results for performance
};
