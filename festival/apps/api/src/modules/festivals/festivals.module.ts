import { Module } from '@nestjs/common';
import { FestivalsController } from './festivals.controller';

@Module({
  controllers: [FestivalsController],
  providers: [],
  exports: [],
})
export class FestivalsModule {}
