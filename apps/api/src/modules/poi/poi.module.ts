import { Module } from '@nestjs/common';
import { PoiController, FestivalPoiController } from './poi.controller';
import { PoiService } from './poi.service';

@Module({
  controllers: [PoiController, FestivalPoiController],
  providers: [PoiService],
  exports: [PoiService],
})
export class PoiModule {}
