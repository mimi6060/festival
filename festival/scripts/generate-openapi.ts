/**
 * Script to generate OpenAPI documentation
 *
 * This script bootstraps the NestJS application and extracts
 * the OpenAPI specification to JSON and YAML files.
 *
 * Usage: npm run docs:generate
 */

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// Import the AppModule - adjust path if needed
async function generateOpenApiSpec() {
  console.log('Starting OpenAPI documentation generation...\n');

  try {
    // Dynamic import to handle the module path
    const { AppModule } = await import('../api/src/app/app.module');

    // Create a minimal application instance
    const app = await NestFactory.create(AppModule, {
      logger: false, // Suppress logs during generation
    });

    // Configure Swagger with the same settings as main.ts
    const config = new DocumentBuilder()
      .setTitle('Festival API')
      .setDescription(`
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

### Response Format

All responses follow a standard format with success, data, and optional pagination fields.
      `)
      .setVersion('1.0.0')
      .setContact(
        'Festival API Team',
        'https://github.com/festival-api',
        'api-support@festival.io',
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
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
      .addTag('Auth', 'Authentication and authorization endpoints')
      .addTag('Users', 'User profile and account management')
      .addTag('Festivals', 'Festival creation and management')
      .addTag('Tickets', 'Ticket management, purchase, and validation')
      .addTag('Ticket Categories', 'Ticket category configuration')
      .addTag('Cashless', 'Cashless payment system - NFC, balance, transactions')
      .addTag('Payments', 'Payment processing with Stripe')
      .addTag('Health', 'API health and status checks')
      .addServer('http://localhost:3000', 'Local Development')
      .addServer('https://api.festival.io', 'Production')
      .addServer('https://staging-api.festival.io', 'Staging')
      .build();

    // Generate the OpenAPI document
    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) => {
        return `${controllerKey.replace('Controller', '')}_${methodKey}`;
      },
      deepScanRoutes: true,
    });

    // Ensure docs directory exists
    const docsDir = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    // Write JSON file
    const jsonPath = path.join(docsDir, 'openapi.json');
    fs.writeFileSync(jsonPath, JSON.stringify(document, null, 2));
    console.log(`OpenAPI JSON written to: ${jsonPath}`);

    // Write YAML file
    const yamlPath = path.join(docsDir, 'openapi.yaml');
    fs.writeFileSync(yamlPath, yaml.stringify(document));
    console.log(`OpenAPI YAML written to: ${yamlPath}`);

    // Print some stats
    const paths = Object.keys(document.paths || {});
    const schemas = Object.keys(document.components?.schemas || {});

    console.log('\n--- OpenAPI Specification Summary ---');
    console.log(`API Version: ${document.info.version}`);
    console.log(`Total Endpoints: ${paths.length}`);
    console.log(`Total Schemas: ${schemas.length}`);
    console.log(`Tags: ${document.tags?.map((t: any) => t.name).join(', ')}`);
    console.log('-------------------------------------\n');

    await app.close();
    console.log('OpenAPI documentation generated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error generating OpenAPI documentation:', error);
    process.exit(1);
  }
}

generateOpenApiSpec();
