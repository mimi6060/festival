import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PrismaModule } from '../../prisma';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, ConfigModule, EmailModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
