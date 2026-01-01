import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProgramService } from './program.service';
import { ArtistsController } from './artists.controller';
import { StagesController } from './stages.controller';
import { PerformancesController } from './performances.controller';

/**
 * Program Module
 *
 * Handles all festival programming functionality:
 * - Artists management (shared across festivals)
 * - Stages management (festival-specific)
 * - Performances scheduling (links artists to stages with time slots)
 * - Program views (by day, by stage, complete)
 */
@Module({
  imports: [PrismaModule],
  controllers: [
    ArtistsController,
    StagesController,
    PerformancesController,
  ],
  providers: [ProgramService],
  exports: [ProgramService],
})
export class ProgramModule {}
