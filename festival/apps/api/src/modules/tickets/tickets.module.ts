import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TicketCategoriesService } from './ticket-categories.service';
import {
  FestivalTicketCategoriesController,
  TicketCategoriesController,
} from './ticket-categories.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    TicketsController,
    FestivalTicketCategoriesController,
    TicketCategoriesController,
  ],
  providers: [TicketsService, TicketCategoriesService],
  exports: [TicketsService, TicketCategoriesService],
})
export class TicketsModule {}
