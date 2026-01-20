import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FaqController } from './controllers/faq.controller';
import { SupportTicketController } from './controllers/support-ticket.controller';
import { LostItemController } from './controllers/lost-item.controller';
import { ContactController } from './controllers/contact.controller';
import { FaqService } from './services/faq.service';
import { SupportTicketService } from './services/support-ticket.service';
import { LostItemService } from './services/lost-item.service';
import { ContactService } from './services/contact.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [ConfigModule, EmailModule],
  controllers: [FaqController, SupportTicketController, LostItemController, ContactController],
  providers: [FaqService, SupportTicketService, LostItemService, ContactService],
  exports: [FaqService, SupportTicketService, LostItemService, ContactService],
})
export class SupportModule {}
