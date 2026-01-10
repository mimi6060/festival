/**
 * Festival Management Platform - API Server
 *
 * This is the main entry point for the NestJS backend application.
 * It configures Swagger/OpenAPI documentation, validation, security headers, and CORS.
 */

import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { AppModule } from './app/app.module';
import {
  ApiVersionGuard,
  ApiVersionHeaderInterceptor,
  API_VERSION_HEADER,
} from './common/versioning';
import { LoggingInterceptor } from './common/interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Disable default logger in favor of Pino (will be initialized via LoggerModule)
    bufferLogs: true,
  });

  // Use Pino logger from LoggerModule
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Global interceptors
  // - LoggingInterceptor: Request/response logging with request ID generation
  // - LoggerErrorInterceptor: Pino error logging integration
  // - ApiVersionHeaderInterceptor: API version header in responses
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new LoggerErrorInterceptor(),
    new ApiVersionHeaderInterceptor()
  );

  // API Versioning guard
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new ApiVersionGuard(reflector));

  // Global prefix for all routes
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Security headers
  app.use(helmet());

  // Cookie parser for httpOnly cookie authentication
  app.use(cookieParser());

  // Response compression middleware (gzip, deflate, br)
  // More efficient than NestJS interceptor - handles streaming and proper chunked encoding
  app.use(
    compression({
      filter: (req, res) => {
        // Don't compress for server-sent events
        if (req.headers['accept'] === 'text/event-stream') {
          return false;
        }
        // Use default compression filter
        return compression.filter(req, res);
      },
      threshold: 1024, // Only compress responses larger than 1KB
      level: 6, // Balanced compression level (1-9)
    })
  );

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:4200',
      'http://localhost:8081',
      'http://192.168.129.10:8081',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Swagger/OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('Festival Management Platform API')
    .setDescription(
      `
# Festival Management Platform API Documentation

Welcome to the comprehensive API documentation for the Festival Management Platform - a multi-tenant system designed to handle festivals from 10,000 to 500,000+ attendees.

## Overview

This API provides endpoints for:
- **Authentication** - User registration, login, JWT token management
- **Festivals** - Multi-tenant festival CRUD operations
- **Tickets** - Ticket categories, purchases, QR code generation and validation
- **Payments** - Stripe integration, payment processing, refunds
- **Cashless** - Digital wallet management, NFC integration, transactions
- **Health** - System health checks and monitoring

## Authentication

Most endpoints require authentication using JWT Bearer tokens. After logging in, include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

API requests are rate-limited to ensure fair usage:
- **Anonymous requests**: 100 requests per minute
- **Authenticated requests**: 1000 requests per minute
- **Payment endpoints**: 10 requests per minute

## Error Responses

All error responses follow a consistent format:

\`\`\`json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2025-01-02T12:00:00.000Z",
  "path": "/api/endpoint"
}
\`\`\`

## API Versioning

The API supports versioning through multiple methods:
- **Header**: Include \`X-API-Version: v1\` or \`X-API-Version: v2\` in your request
- **Query Parameter**: Add \`?api-version=1\` or \`?api-version=2\` to your URL
- **URL Path**: Use \`/api/v1/...\` or \`/api/v2/...\` (for versioned endpoints)

**Default Version:** v1

All responses include the \`X-API-Version\` header indicating the version used.

## Webhooks

The platform supports webhooks for:
- Payment status changes (Stripe webhooks)
- Ticket validation events
- Cashless transaction notifications

Configure webhook endpoints in your festival settings.

## Multi-Tenancy

All festival-related operations are scoped to a specific festival. The festival ID is typically passed in the URL or request body to ensure proper data isolation.

## Support

For API support, contact: api-support@festival-platform.com
    `
    )
    .setVersion('1.0.0')
    .setContact(
      'Festival Platform Team',
      'https://festival-platform.com',
      'api-support@festival-platform.com'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000/api', 'Local Development')
    .addServer('https://api.festival-platform.com', 'Production')
    .addServer('https://staging-api.festival-platform.com', 'Staging')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for webhook authentication',
      },
      'api-key'
    )
    .addGlobalParameters({
      name: API_VERSION_HEADER,
      in: 'header',
      description: 'API Version (v1 or v2). Defaults to v1 if not specified.',
      required: false,
      schema: {
        type: 'string',
        enum: ['v1', 'v2'],
        default: 'v1',
      },
    })
    .addTag('Health', 'System health checks and monitoring endpoints')
    .addTag('Auth', 'Authentication and authorization endpoints')
    .addTag('Users', 'User management operations')
    .addTag('Festivals', 'Festival CRUD operations and management')
    .addTag('Tickets', 'Ticket categories, purchases, and validation')
    .addTag('Payments', 'Payment processing and refunds')
    .addTag('Cashless', 'Digital wallet and NFC operations')
    .addTag('Webhooks', 'Webhook endpoints for external services')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger UI at /api/docs
  SwaggerModule.setup('api/docs', app, document, {
    useGlobalPrefix: false,
    customSiteTitle: 'Festival Platform API Documentation',
    customfavIcon: 'https://festival-platform.com/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .info .title { color: #3b82f6 }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Redirect root to Swagger docs in development
  if (process.env.NODE_ENV !== 'production') {
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.get('/', (_req: unknown, res: { redirect: (url: string) => void }) => {
      res.redirect('/api/docs');
    });
  }

  // Handle shutdown signals for graceful termination
  // Note: enableShutdownHooks() makes NestJS listen for SIGTERM/SIGINT
  // and call OnModuleDestroy hooks (like Prisma disconnect)
  // We add custom handlers for logging purposes only

  process.on('SIGTERM', () => {
    logger.log('Received SIGTERM signal, initiating graceful shutdown...');
  });

  process.on('SIGINT', () => {
    logger.log('Received SIGINT signal, initiating graceful shutdown...');
  });

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error: Error) => {
    logger.error(`Uncaught Exception: ${error.message}`, error.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error(`Unhandled Rejection: ${reason}`);
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/${globalPrefix}`);
  logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(`OpenAPI JSON: http://localhost:${port}/api/docs-json`);
}

bootstrap();
