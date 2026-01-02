import { Module } from '@nestjs/common';
import {
  CampingSpotsController,
  CampingBookingsController,
  FestivalCampingController,
} from './camping.controller';
import { CampingService } from './camping.service';

@Module({
  controllers: [
    CampingSpotsController,
    CampingBookingsController,
    FestivalCampingController,
  ],
  providers: [CampingService],
  exports: [CampingService],
})
export class CampingModule {}
