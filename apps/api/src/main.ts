/**
 * Festival Management Platform - API Server
 *
 * This is the main entry point for the NestJS backend application.
 * It configures Swagger/OpenAPI documentation, validation, security headers, and CORS.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4200'],
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
    }),
  );

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Swagger/OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('Festival Management Platform API')
    .setDescription(`
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
    `)
    .setVersion('1.0.0')
    .setContact('Festival Platform Team', 'https://festival-platform.com', 'api-support@festival-platform.com')
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
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for webhook authentication',
      },
      'api-key',
    )
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

  // Handle shutdown signals for graceful termination
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      Logger.log(`Received ${signal}, shutting down gracefully...`);
      await app.close();
      process.exit(0);
    });
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`Application is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  Logger.log(`OpenAPI JSON: http://localhost:${port}/api/docs-json`);
}

bootstrap();
