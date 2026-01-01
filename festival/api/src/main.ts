/**
 * Festival API - Main Entry Point
 * NestJS backend with Prisma, JWT Auth, and Swagger documentation
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    // Enable rawBody for Stripe webhook signature verification
    rawBody: true,
  });

  // Get configuration service
  const configService = app.get(ConfigService);
  const { port, apiPrefix, corsOrigins } = configService.app;

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // CORS configuration
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-ID',
      'X-Requested-With',
    ],
    credentials: true,
  });

  // Global validation pipe (works alongside CustomValidationPipe)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation setup
  if (!configService.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Festival API')
      .setDescription(
        `
## Festival Management API

This API provides endpoints for managing festival operations including:

- **Authentication**: User registration, login, JWT token management
- **Tickets**: Ticket categories, purchases, QR code validation
- **Cashless**: NFC bracelet management, top-ups, payments, transfers
- **Payments**: Stripe integration for online payments

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

### Response Format

All responses follow a standard format:

\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/endpoint",
    "method": "GET"
  }
}
\`\`\`
      `,
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Authentication and authorization endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Tickets', 'Ticket management and validation')
      .addTag('Cashless', 'Cashless payment and NFC management')
      .addTag('Payments', 'Payment processing with Stripe')
      .addTag('Festivals', 'Festival management')
      .addServer(`http://localhost:${port}`, 'Local Development')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
      customSiteTitle: 'Festival API Documentation',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { font-size: 2rem }
      `,
    });

    Logger.log(
      `Swagger documentation available at: http://localhost:${port}/docs`,
      'Bootstrap',
    );
  }

  // Start the server
  await app.listen(port);

  Logger.log(
    `Application is running on: http://localhost:${port}/${apiPrefix}`,
    'Bootstrap',
  );
  Logger.log(`Environment: ${configService.app.nodeEnv}`, 'Bootstrap');
}

bootstrap();
