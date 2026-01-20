import { Controller, Post, Body, Logger, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../auth/decorators/public.decorator';
import { EmailService } from '../../email/email.service';
import {
  CreateContactMessageDto,
  ContactMessageResponseDto,
  NewsletterSubscribeDto,
  NewsletterResponseDto,
} from '../dto/contact.dto';
import { ContactService } from '../services/contact.service';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(
    private readonly contactService: ContactService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService
  ) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Submit a contact form message',
    description:
      'Public endpoint for submitting contact form messages. Creates a support ticket and sends notification emails.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Message submitted successfully',
    type: ContactMessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  async submitContactForm(
    @Body() dto: CreateContactMessageDto
  ): Promise<ContactMessageResponseDto> {
    this.logger.log(`Contact form submitted by ${dto.email}`);
    return this.contactService.handleContactForm(dto);
  }

  @Public()
  @Post('newsletter')
  @ApiOperation({
    summary: 'Subscribe to newsletter',
    description:
      'Public endpoint for newsletter subscription. Stores email and sends confirmation.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Subscription successful',
    type: NewsletterResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid email address',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already subscribed',
  })
  async subscribeNewsletter(@Body() dto: NewsletterSubscribeDto): Promise<NewsletterResponseDto> {
    this.logger.log(`Newsletter subscription request for ${dto.email}`);
    return this.contactService.subscribeNewsletter(dto);
  }
}
