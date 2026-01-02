import { Module } from '@nestjs/common';
import { ZonesController, FestivalZonesController } from './zones.controller';
import { ZonesService } from './zones.service';

@Module({
  controllers: [ZonesController, FestivalZonesController],
  providers: [ZonesService],
  exports: [ZonesService],
})
export class ZonesModule {}
