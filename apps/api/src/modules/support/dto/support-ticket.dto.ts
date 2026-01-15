import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Enums matching Prisma schema
export enum SupportTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_USER = 'WAITING_FOR_USER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// ===== Support Ticket DTOs =====

export class CreateSupportTicketDto {
  @ApiPropertyOptional({ description: 'Festival ID (optional)' })
  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @ApiProperty({
    description: 'Ticket subject',
    example: 'Probleme de paiement',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  subject!: string;

  @ApiProperty({
    description: 'Ticket description',
    example: 'Mon paiement a ete refuse mais le montant a ete debite...',
  })
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  description!: string;

  @ApiPropertyOptional({
    description: 'Priority level',
    enum: Priority,
    default: Priority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}

export class UpdateSupportTicketDto {
  @ApiPropertyOptional({
    description: 'Ticket status',
    enum: SupportTicketStatus,
  })
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @ApiPropertyOptional({
    description: 'Priority level',
    enum: Priority,
  })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Assigned staff user ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}

export class AssignTicketDto {
  @ApiProperty({ description: 'Staff user ID to assign' })
  @IsUUID()
  staffId!: string;
}

export class ChangeTicketStatusDto {
  @ApiProperty({
    description: 'New status',
    enum: SupportTicketStatus,
  })
  @IsEnum(SupportTicketStatus)
  status!: SupportTicketStatus;

  @ApiPropertyOptional({ description: 'Status change reason' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// ===== Support Message DTOs =====

export class CreateSupportMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Merci de votre reponse. Voici les details supplementaires...',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  message!: string;

  @ApiPropertyOptional({
    description: 'Attachment URLs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class SupportMessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ticketId!: string;

  @ApiProperty()
  senderId!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  isStaff!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'Sender details' })
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export class SupportTicketResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional()
  festivalId?: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: SupportTicketStatus })
  status!: SupportTicketStatus;

  @ApiProperty({ enum: Priority })
  priority!: Priority;

  @ApiPropertyOptional()
  assignedTo?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: () => [SupportMessageResponseDto] })
  messages?: SupportMessageResponseDto[];

  @ApiPropertyOptional({ description: 'User details' })
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Assigned staff details' })
  assignedStaff?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// ===== Query DTOs =====

export class SupportTicketQueryDto {
  @ApiPropertyOptional({ description: 'Filter by festival ID' })
  @IsOptional()
  @IsUUID()
  festivalId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: SupportTicketStatus,
  })
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: Priority,
  })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Filter by assigned staff ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Show unassigned tickets only' })
  @IsOptional()
  @Type(() => Boolean)
  unassignedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Search in subject and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

// ===== SLA & Statistics DTOs =====

export class SlaConfigDto {
  @ApiProperty({ description: 'SLA for LOW priority (hours)', example: 72 })
  @IsInt()
  @Min(1)
  lowPriorityHours!: number;

  @ApiProperty({ description: 'SLA for MEDIUM priority (hours)', example: 24 })
  @IsInt()
  @Min(1)
  mediumPriorityHours!: number;

  @ApiProperty({ description: 'SLA for HIGH priority (hours)', example: 8 })
  @IsInt()
  @Min(1)
  highPriorityHours!: number;

  @ApiProperty({ description: 'SLA for URGENT priority (hours)', example: 2 })
  @IsInt()
  @Min(1)
  urgentPriorityHours!: number;
}

export class TicketStatisticsDto {
  @ApiProperty()
  totalTickets!: number;

  @ApiProperty()
  openTickets!: number;

  @ApiProperty()
  inProgressTickets!: number;

  @ApiProperty()
  resolvedTickets!: number;

  @ApiProperty()
  closedTickets!: number;

  @ApiProperty()
  averageResolutionTimeHours!: number;

  @ApiProperty()
  slaBreaches!: number;

  @ApiProperty({ type: Object })
  byPriority!: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };

  @ApiProperty({ type: Object })
  byStaff!: {
    staffId: string;
    staffName: string;
    assignedCount: number;
    resolvedCount: number;
  }[];
}
