import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  CANCELLED = 'CANCELLED',
}

export enum CampaignType {
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  REMINDER = 'REMINDER',
  PROMOTION = 'PROMOTION',
  THANK_YOU = 'THANK_YOU',
  SURVEY = 'SURVEY',
}

export class SegmentFilter {
  @ApiPropertyOptional({ description: 'Ticket category IDs to target' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ticketCategoryIds?: string[];

  @ApiPropertyOptional({ description: 'Only users who purchased after this date' })
  @IsOptional()
  @IsDateString()
  purchasedAfter?: string;

  @ApiPropertyOptional({ description: 'Only users who purchased before this date' })
  @IsOptional()
  @IsDateString()
  purchasedBefore?: string;

  @ApiPropertyOptional({ description: 'Only users with cashless accounts' })
  @IsOptional()
  hasCashless?: boolean;

  @ApiPropertyOptional({ description: 'Only VIP ticket holders' })
  @IsOptional()
  isVip?: boolean;
}

export class CreateCampaignDto {
  @ApiProperty({ description: 'Festival ID' })
  @IsString()
  @IsNotEmpty()
  festivalId: string;

  @ApiProperty({ description: 'Campaign name (internal)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Email subject line' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'Campaign type', enum: CampaignType })
  @IsEnum(CampaignType)
  type: CampaignType;

  @ApiProperty({ description: 'HTML content of the email' })
  @IsString()
  @IsNotEmpty()
  htmlContent: string;

  @ApiPropertyOptional({ description: 'Plain text content' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ description: 'Scheduled send time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Segment filters for targeting' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SegmentFilter)
  segment?: SegmentFilter;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ enum: CampaignType })
  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SegmentFilter)
  segment?: SegmentFilter;
}

export class CampaignResponseDto {
  id: string;
  festivalId: string;
  name: string;
  subject: string;
  type: CampaignType;
  status: CampaignStatus;
  htmlContent: string;
  textContent?: string;
  segment?: SegmentFilter;
  scheduledAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  stats: CampaignStats;
}

export class CampaignStats {
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

export class CampaignPreviewDto {
  @ApiProperty({ description: 'Email address to send preview to' })
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class CampaignTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: CampaignType })
  @IsEnum(CampaignType)
  type: CampaignType;

  @ApiProperty({ description: 'Default subject' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'HTML template' })
  @IsString()
  @IsNotEmpty()
  htmlContent: string;

  @ApiPropertyOptional({ description: 'Text template' })
  @IsOptional()
  @IsString()
  textContent?: string;
}
