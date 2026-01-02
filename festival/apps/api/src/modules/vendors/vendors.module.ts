import { Module } from '@nestjs/common';
import { VendorsController, UserOrdersController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  controllers: [VendorsController, UserOrdersController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
