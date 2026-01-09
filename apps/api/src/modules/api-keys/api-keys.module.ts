/**
 * API Keys Module
 *
 * Provides API key management functionality including:
 * - API key creation and management
 * - API key validation and authentication
 * - Tier-based rate limiting integration
 *
 * @module ApiKeysModule
 */

import { Module } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyAuthGuard],
  exports: [ApiKeysService, ApiKeyAuthGuard],
})
export class ApiKeysModule {}
