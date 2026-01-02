import { Module } from '@nestjs/common';
import { FaqController } from './controllers/faq.controller';
import { SupportTicketController } from './controllers/support-ticket.controller';
import { LostItemController } from './controllers/lost-item.controller';
import { FaqService } from './services/faq.service';
import { SupportTicketService } from './services/support-ticket.service';
import { LostItemService } from './services/lost-item.service';

@Module({
  controllers: [FaqController, SupportTicketController, LostItemController],
  providers: [FaqService, SupportTicketService, LostItemService],
  exports: [FaqService, SupportTicketService, LostItemService],
})
export class SupportModule {}
