import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StatusController } from './status.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [StatusController],
})
export class StatusModule {}
