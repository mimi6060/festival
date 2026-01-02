import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CashlessService } from './cashless.service';
import { CashlessController } from './cashless.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CashlessController],
  providers: [CashlessService],
  exports: [CashlessService],
})
export class CashlessModule {}
