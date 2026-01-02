import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProgramService } from './program.service';
import { ArtistsController } from './artists.controller';
import { ArtistsUploadController } from './artists-upload.controller';
import { StagesController } from './stages.controller';
import { PerformancesController } from './performances.controller';

/**
 * Program Module
 *
 * Handles all festival programming functionality:
 * - Artists management (shared across festivals)
 * - Artist image uploads
 * - Stages management (festival-specific)
 * - Performances scheduling (links artists to stages with time slots)
 * - Program views (by day, by stage, complete)
 *
 * Dependencies:
 * - PrismaModule for database access
 * - UploadModule (global) for file uploads
 */
@Module({
  imports: [PrismaModule],
  controllers: [
    ArtistsController,
    ArtistsUploadController,
    StagesController,
    PerformancesController,
  ],
  providers: [ProgramService],
  exports: [ProgramService],
})
export class ProgramModule {}
