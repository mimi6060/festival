import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { FaqController } from './faq.controller';
import { TicketsController } from './tickets.controller';
import { LostItemsController } from './lost-items.controller';

// Services
import { FaqService } from './faq.service';
import { TicketsService } from './tickets.service';
import { LostItemsService } from './lost-items.service';

@Module({
  imports: [ConfigModule],
  controllers: [
    FaqController,
    TicketsController,
    LostItemsController,
  ],
  providers: [
    FaqService,
    TicketsService,
    LostItemsService,
  ],
  exports: [
    FaqService,
    TicketsService,
    LostItemsService,
  ],
})
export class SupportModule {}
