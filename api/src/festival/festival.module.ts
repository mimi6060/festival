import { Module } from '@nestjs/common';
import { FestivalController } from './festival.controller';
import { FestivalUploadController } from './festival-upload.controller';
import { FestivalService } from './festival.service';

/**
 * Festival Module
 *
 * Provides festival management functionality including:
 * - CRUD operations for festivals
 * - Multi-tenant support (organizer ownership)
 * - Status management and publishing
 * - Statistics and analytics
 * - Image uploads (logo, banner)
 *
 * Dependencies:
 * - PrismaModule (global) for database access
 * - UploadModule (global) for file uploads
 *
 * Controllers:
 * - FestivalController: REST API endpoints
 * - FestivalUploadController: Image upload endpoints
 *
 * Providers:
 * - FestivalService: Business logic
 */
@Module({
  controllers: [FestivalController, FestivalUploadController],
  providers: [FestivalService],
  exports: [FestivalService],
})
export class FestivalModule {}
