import { Module } from '@nestjs/common';
import { CashlessController } from './cashless.controller';
import { CashlessService } from './cashless.service';
import { PrismaModule } from '../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [CashlessController],
  providers: [CashlessService],
  exports: [CashlessService],
})
export class CashlessModule {}
