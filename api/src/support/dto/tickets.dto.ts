import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { SupportTicketStatus, Priority } from '@prisma/client';

// ============= Support Ticket DTOs =============

export class CreateSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUUID()
  @IsOptional()
  festivalId?: string;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;
}

export class UpdateSupportTicketDto {
  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SupportTicketStatus)
  @IsOptional()
  status?: SupportTicketStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;
}

// ============= Support Message DTOs =============

export class CreateSupportMessageDto {
  @IsUUID()
  @IsNotEmpty()
  ticketId: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class SupportTicketQueryDto {
  @IsEnum(SupportTicketStatus)
  @IsOptional()
  status?: SupportTicketStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsUUID()
  @IsOptional()
  festivalId?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;
}
