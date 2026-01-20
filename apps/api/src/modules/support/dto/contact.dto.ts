import { IsString, IsEmail, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ContactSubject {
  GENERAL = 'general',
  BILLING = 'billing',
  TECHNICAL = 'technical',
  PARTNERSHIP = 'partnership',
}

export class CreateContactMessageDto {
  @ApiProperty({
    description: 'Sender name',
    example: 'Jean Dupont',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Sender email',
    example: 'jean.dupont@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Message subject category',
    enum: ContactSubject,
    example: ContactSubject.GENERAL,
  })
  @IsEnum(ContactSubject)
  subject!: ContactSubject;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, I have a question about your service...',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({
    description: 'Festival ID if related to a specific festival',
  })
  @IsOptional()
  @IsString()
  festivalId?: string;
}

export class ContactMessageResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  ticketId?: string;
}

export class NewsletterSubscribeDto {
  @ApiProperty({
    description: 'Email address to subscribe',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Preferred language',
    example: 'fr',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string;
}

export class NewsletterResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  alreadySubscribed?: boolean;
}
