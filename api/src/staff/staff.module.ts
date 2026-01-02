import { Module } from '@nestjs/common';
import { StaffController, FestivalStaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  controllers: [StaffController, FestivalStaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
