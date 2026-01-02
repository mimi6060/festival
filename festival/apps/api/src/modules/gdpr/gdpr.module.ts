import { Module } from '@nestjs/common';
import { GdprController, GdprAdminController } from './gdpr.controller';
import { GdprService } from './gdpr.service';

@Module({
  controllers: [GdprController, GdprAdminController],
  providers: [GdprService],
  exports: [GdprService],
})
export class GdprModule {}
