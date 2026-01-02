import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CashlessService } from './cashless.service';

@Module({
  imports: [PrismaModule],
  providers: [CashlessService],
  exports: [CashlessService],
})
export class CashlessModule {}
