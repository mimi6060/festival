import { Module } from '@nestjs/common';
import { CampingController, FestivalCampingController } from './camping.controller';
import { CampingService } from './camping.service';

@Module({
  controllers: [CampingController, FestivalCampingController],
  providers: [CampingService],
  exports: [CampingService],
})
export class CampingModule {}
