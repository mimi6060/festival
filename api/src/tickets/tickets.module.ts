import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TicketsController, FestivalTicketsController } from './tickets.controller';
import { TicketCategoriesController } from './ticket-categories.controller';
import { TicketsService } from './tickets.service';
import { TicketCategoriesService } from './ticket-categories.service';

@Module({
  imports: [ConfigModule],
  controllers: [
    TicketsController,
    FestivalTicketsController,
    TicketCategoriesController,
  ],
  providers: [TicketsService, TicketCategoriesService],
  exports: [TicketsService, TicketCategoriesService],
})
export class TicketsModule {}
