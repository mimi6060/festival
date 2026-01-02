/**
 * Festival API - Main Entry Point
 * NestJS backend with Prisma, JWT Auth, and Swagger documentation
 */

// Sentry must be imported FIRST, before any other imports
import './sentry/instrument';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { ConfigService } from './config/config.service';
import { WinstonNestLogger } from './logger/winston-nest.logger';
import { LoggerService } from './logger/logger.service';

/**
 * Custom CSS theme for Swagger UI
 * Professional dark theme with Festival API branding
 */
const SWAGGER_CUSTOM_CSS = `
  /* Hide default Swagger topbar */
  .swagger-ui .topbar {
    display: none;
  }

  /* Custom header styling */
  .swagger-ui .info {
    margin: 30px 0;
  }

  .swagger-ui .info .title {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1a1a2e;
  }

  .swagger-ui .info .description {
    font-size: 1rem;
    line-height: 1.6;
  }

  /* Tag styling */
  .swagger-ui .opblock-tag {
    font-size: 1.2rem;
    font-weight: 600;
    border-bottom: 2px solid #e0e0e0;
  }

  /* Operation blocks */
  .swagger-ui .opblock.opblock-get {
    background: rgba(97, 175, 254, 0.1);
    border-color: #61affe;
  }

  .swagger-ui .opblock.opblock-post {
    background: rgba(73, 204, 144, 0.1);
    border-color: #49cc90;
  }

  .swagger-ui .opblock.opblock-put {
    background: rgba(252, 161, 48, 0.1);
    border-color: #fca130;
  }

  .swagger-ui .opblock.opblock-patch {
    background: rgba(80, 227, 194, 0.1);
    border-color: #50e3c2;
  }

  .swagger-ui .opblock.opblock-delete {
    background: rgba(249, 62, 62, 0.1);
    border-color: #f93e3e;
  }

  /* Try it out button */
  .swagger-ui .btn.try-out__btn {
    background-color: #6366f1;
    border-color: #6366f1;
  }

  .swagger-ui .btn.try-out__btn:hover {
    background-color: #4f46e5;
    border-color: #4f46e5;
  }

  /* Execute button */
  .swagger-ui .btn.execute {
    background-color: #22c55e;
    border-color: #22c55e;
  }

  .swagger-ui .btn.execute:hover {
    background-color: #16a34a;
    border-color: #16a34a;
  }

  /* Model styling */
  .swagger-ui .model-box {
    background: #f8fafc;
    border-radius: 8px;
    padding: 15px;
  }

  /* Response section */
  .swagger-ui .responses-wrapper {
    padding: 15px;
    background: #fafafa;
    border-radius: 8px;
  }

  /* Authorization section */
  .swagger-ui .auth-wrapper {
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .swagger-ui .auth-wrapper .auth-container {
    background: white;
    border-radius: 6px;
    padding: 15px;
  }

  /* Schema section */
  .swagger-ui section.models {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }

  .swagger-ui section.models h4 {
    background: #f1f5f9;
    padding: 15px 20px;
    margin: 0;
  }

  /* Footer branding */
  .swagger-ui .info {
    position: relative;
  }

  /* Improved readability */
  .swagger-ui .markdown p,
  .swagger-ui .markdown li {
    line-height: 1.7;
  }

  /* Custom scrollbar */
  .swagger-ui ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .swagger-ui ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  .swagger-ui ::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  .swagger-ui ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

/**
 * Custom JavaScript for Swagger UI enhancements
 */
const SWAGGER_CUSTOM_JS = `
  // Add copy button to code blocks
  window.addEventListener('load', function() {
    console.log('Festival API Documentation loaded');
  });
`;

async function bootstrap() {
  // Create Winston logger for bootstrap phase
  const winstonLogger = new WinstonNestLogger();

  const app = await NestFactory.create(AppModule, {
    logger: winstonLogger,
    // Enable rawBody for Stripe webhook signature verification
    rawBody: true,
  });

  // Replace NestJS logger with Winston after DI container is ready
  const loggerService = app.get(LoggerService);
  app.useLogger(loggerService);

  // Get configuration service
  const configService = app.get(ConfigService);
  const { port, apiPrefix, corsOrigins } = configService.app;

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for Swagger UI
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Required for Swagger UI
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      noSniff: true,
      xssFilter: true,
    }),
  );

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

A comprehensive REST API for managing festival operations, ticketing, cashless payments, and more.

### Overview

This API provides endpoints for managing all aspects of festival operations:

- **Authentication**: User registration, login, JWT token management, password reset
- **Festivals**: Create, manage, and publish festival events
- **Tickets**: Ticket categories, purchases, QR code generation and validation
- **Cashless**: NFC bracelet management, balance top-ups, payments, and transfers
- **Payments**: Stripe integration for secure online payments and refunds

### Authentication

Most endpoints require JWT authentication. After logging in, include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

Tokens expire after 15 minutes. Use the refresh token endpoint to obtain a new access token.

### Rate Limiting

API requests are rate-limited to prevent abuse:
- Anonymous requests: 100 requests per minute
- Authenticated requests: 1000 requests per minute

### Response Format

All responses follow a standard format:

**Success Response:**
\`\`\`json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message",
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "path": "/api/v1/endpoint",
    "method": "GET"
  }
}
\`\`\`

**Error Response:**
\`\`\`json
{
  "success": false,
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "Human readable error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2025-01-15T10:30:00.000Z"
}
\`\`\`

**Paginated Response:**
\`\`\`json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
\`\`\`

### Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

### Support

For API support, contact the development team or open an issue in the repository.
      `,
      )
      .setVersion('1.0.0')
      .setContact(
        'Festival API Team',
        'https://github.com/festival-api',
        'api-support@festival.io',
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .setTermsOfService('https://festival.io/terms')
      .setExternalDoc('API Documentation', 'https://docs.festival.io')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT Authentication',
          description: 'Enter your JWT token obtained from /auth/login',
          in: 'header',
        },
        'JWT-auth',
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-KEY',
          in: 'header',
          description: 'API Key for service-to-service authentication',
        },
        'api-key',
      )
      .addTag('Auth', 'Authentication and authorization endpoints - login, register, token management')
      .addTag('Users', 'User profile and account management')
      .addTag('Festivals', 'Festival creation and management')
      .addTag('Tickets', 'Ticket management, purchase, and validation')
      .addTag('Ticket Categories', 'Ticket category configuration')
      .addTag('Cashless', 'Cashless payment system - NFC, balance, transactions')
      .addTag('Payments', 'Payment processing with Stripe')
      .addTag('Health', 'API health and status checks')
      .addTag('Analytics', 'Real-time analytics, KPIs, and dashboard data with WebSocket support')
      .addServer(`http://localhost:${port}`, 'Local Development')
      .addServer('https://api.festival.io', 'Production')
      .addServer('https://staging-api.festival.io', 'Staging')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      operationIdFactory: (controllerKey: string, methodKey: string) => {
        return `${controllerKey.replace('Controller', '')}_${methodKey}`;
      },
      deepScanRoutes: true,
    });

    // Setup Swagger UI with custom theme
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
        tryItOutEnabled: true,
        displayOperationId: false,
        defaultModelsExpandDepth: 3,
        defaultModelExpandDepth: 3,
        displayRequestDuration: true,
        syntaxHighlight: {
          activate: true,
          theme: 'monokai',
        },
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'Festival API Documentation',
      customfavIcon: '/assets/favicon.ico',
      customCss: SWAGGER_CUSTOM_CSS,
      customJs: '/assets/swagger-custom.js',
    });

    // Expose OpenAPI JSON endpoint
    app.getHttpAdapter().get('/docs/json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(document);
    });

    // Expose OpenAPI YAML endpoint
    app.getHttpAdapter().get('/docs/yaml', (req, res) => {
      const yaml = require('yaml');
      res.setHeader('Content-Type', 'text/yaml');
      res.send(yaml.stringify(document));
    });

    loggerService.log(
      `Swagger UI available at: http://localhost:${port}/docs`,
      'Bootstrap',
    );
    loggerService.log(
      `OpenAPI JSON available at: http://localhost:${port}/docs/json`,
      'Bootstrap',
    );
    loggerService.log(
      `OpenAPI YAML available at: http://localhost:${port}/docs/yaml`,
      'Bootstrap',
    );
  }

  // Start the server
  await app.listen(port);

  loggerService.log(
    `Application is running on: http://localhost:${port}/${apiPrefix}`,
    'Bootstrap',
  );
  loggerService.log(`Environment: ${configService.app.nodeEnv}`, 'Bootstrap');
}

bootstrap();
