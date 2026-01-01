import { Module } from '@nestjs/common';
import { ZonesController, FestivalZonesController } from './zones.controller';
import { ZonesService } from './zones.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ZonesController, FestivalZonesController],
  providers: [ZonesService],
  exports: [ZonesService],
})
export class ZonesModule {}
