import { Module } from '@nestjs/common';
import { MapController, PoiController } from './map.controller';
import { MapService } from './map.service';

@Module({
  controllers: [MapController, PoiController],
  providers: [MapService],
  exports: [MapService],
})
export class MapModule {}
