import { Module } from '@nestjs/common';
import { CashlessController } from './cashless.controller';
import { CashlessService } from './cashless.service';

@Module({
  controllers: [CashlessController],
  providers: [CashlessService],
  exports: [CashlessService],
})
export class CashlessModule {}
