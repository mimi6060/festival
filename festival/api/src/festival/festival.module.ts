import { Module } from '@nestjs/common';
import { FestivalController } from './festival.controller';
import { FestivalService } from './festival.service';

/**
 * Festival Module
 *
 * Provides festival management functionality including:
 * - CRUD operations for festivals
 * - Multi-tenant support (organizer ownership)
 * - Status management and publishing
 * - Statistics and analytics
 *
 * Dependencies:
 * - PrismaModule (global) for database access
 *
 * Controllers:
 * - FestivalController: REST API endpoints
 *
 * Providers:
 * - FestivalService: Business logic
 */
@Module({
  controllers: [FestivalController],
  providers: [FestivalService],
  exports: [FestivalService],
})
export class FestivalModule {}
