import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Header,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  EmailTemplateService,
  EmailTemplateType,
  EmailLanguage,
  SUPPORTED_EMAIL_LANGUAGES,
} from '../services/email-template.service';

/**
 * Email preview response
 */
class EmailPreviewResponse {
  subject!: string;
  html!: string;
  text!: string;
  language!: string;
  templateType!: string;
}

/**
 * Controller for previewing email templates (admin only)
 *
 * Base path: /emails
 *
 * These endpoints are restricted to ADMIN users for testing
 * and previewing email templates before sending.
 */
@ApiTags('Email Templates (Admin)')
@ApiBearerAuth()
@Controller('emails')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class EmailPreviewController {
  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  /**
   * GET /emails/templates
   * List all available email template types
   */
  @Get('templates')
  @ApiOperation({
    summary: 'List email template types',
    description: 'Returns all available email template types.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of template types',
    schema: {
      type: 'object',
      properties: {
        templates: {
          type: 'array',
          items: { type: 'string' },
          example: ['welcome', 'verify-email', 'password-reset'],
        },
      },
    },
  })
  getTemplateTypes(): { templates: EmailTemplateType[] } {
    return {
      templates: this.emailTemplateService.getTemplateTypes(),
    };
  }

  /**
   * GET /emails/languages
   * List all supported languages
   */
  @Get('languages')
  @ApiOperation({
    summary: 'List supported languages',
    description: 'Returns all supported email languages.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of supported languages',
    schema: {
      type: 'object',
      properties: {
        languages: {
          type: 'array',
          items: { type: 'string' },
          example: ['fr', 'en', 'de', 'es', 'it', 'ar'],
        },
        default: {
          type: 'string',
          example: 'fr',
        },
      },
    },
  })
  getSupportedLanguages(): { languages: EmailLanguage[]; default: string } {
    return {
      languages: this.emailTemplateService.getSupportedLanguages(),
      default: 'fr',
    };
  }

  /**
   * GET /emails/preview/:type/:lang
   * Preview an email template with sample data
   */
  @Get('preview/:type/:lang')
  @Header('Content-Type', 'application/json')
  @ApiOperation({
    summary: 'Preview email template',
    description:
      'Renders an email template with sample data. Use this to preview how emails will look before sending.',
  })
  @ApiParam({
    name: 'type',
    description: 'Email template type',
    enum: [
      'welcome',
      'verify-email',
      'password-reset',
      'ticket-confirmation',
      'ticket-reminder',
      'payment-receipt',
      'refund-confirmation',
      'cashless-topup',
      'order-ready',
    ],
  })
  @ApiParam({
    name: 'lang',
    description: 'Language code',
    enum: SUPPORTED_EMAIL_LANGUAGES,
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Response format (json or html). Default: json',
    enum: ['json', 'html'],
  })
  @ApiResponse({
    status: 200,
    description: 'Rendered email template',
    type: EmailPreviewResponse,
  })
  @ApiResponse({ status: 400, description: 'Invalid template type or language' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async previewTemplate(
    @Param('type') type: string,
    @Param('lang') lang: string,
    @Query('format') format: 'json' | 'html' = 'json'
  ): Promise<EmailPreviewResponse | string> {
    // Validate template type
    const validTypes = this.emailTemplateService.getTemplateTypes();
    if (!validTypes.includes(type as EmailTemplateType)) {
      throw new BadRequestException(
        `Invalid template type: ${type}. Valid types: ${validTypes.join(', ')}`
      );
    }

    // Validate and normalize language
    if (!this.emailTemplateService.isLanguageSupported(lang)) {
      throw new BadRequestException(
        `Unsupported language: ${lang}. Supported languages: ${SUPPORTED_EMAIL_LANGUAGES.join(', ')}`
      );
    }

    try {
      const rendered = await this.emailTemplateService.getTemplatePreview(
        type as EmailTemplateType,
        lang as EmailLanguage
      );

      if (format === 'html') {
        return rendered.html;
      }

      return {
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        language: lang,
        templateType: type,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Template not found: ${type}/${lang}`);
    }
  }

  /**
   * GET /emails/preview/:type/:lang/html
   * Preview email template HTML directly (for browser viewing)
   */
  @Get('preview/:type/:lang/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({
    summary: 'Preview email template HTML',
    description:
      'Returns the raw HTML of the email template. Open in browser to see how the email will look.',
  })
  @ApiParam({
    name: 'type',
    description: 'Email template type',
    enum: [
      'welcome',
      'verify-email',
      'password-reset',
      'ticket-confirmation',
      'ticket-reminder',
      'payment-receipt',
      'refund-confirmation',
      'cashless-topup',
      'order-ready',
    ],
  })
  @ApiParam({
    name: 'lang',
    description: 'Language code',
    enum: SUPPORTED_EMAIL_LANGUAGES,
  })
  @ApiResponse({
    status: 200,
    description: 'HTML content of the email',
    schema: { type: 'string' },
  })
  async previewTemplateHtml(
    @Param('type') type: string,
    @Param('lang') lang: string
  ): Promise<string> {
    // Validate template type
    const validTypes = this.emailTemplateService.getTemplateTypes();
    if (!validTypes.includes(type as EmailTemplateType)) {
      throw new BadRequestException(
        `Invalid template type: ${type}. Valid types: ${validTypes.join(', ')}`
      );
    }

    // Validate and normalize language
    if (!this.emailTemplateService.isLanguageSupported(lang)) {
      throw new BadRequestException(
        `Unsupported language: ${lang}. Supported languages: ${SUPPORTED_EMAIL_LANGUAGES.join(', ')}`
      );
    }

    try {
      const rendered = await this.emailTemplateService.getTemplatePreview(
        type as EmailTemplateType,
        lang as EmailLanguage
      );
      return rendered.html;
    } catch {
      throw new NotFoundException(`Template not found: ${type}/${lang}`);
    }
  }

  /**
   * GET /emails/preview/:type/:lang/text
   * Preview email template plain text version
   */
  @Get('preview/:type/:lang/text')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({
    summary: 'Preview email template text',
    description: 'Returns the plain text version of the email template.',
  })
  @ApiParam({
    name: 'type',
    description: 'Email template type',
    enum: [
      'welcome',
      'verify-email',
      'password-reset',
      'ticket-confirmation',
      'ticket-reminder',
      'payment-receipt',
      'refund-confirmation',
      'cashless-topup',
      'order-ready',
    ],
  })
  @ApiParam({
    name: 'lang',
    description: 'Language code',
    enum: SUPPORTED_EMAIL_LANGUAGES,
  })
  @ApiResponse({
    status: 200,
    description: 'Plain text content of the email',
    schema: { type: 'string' },
  })
  async previewTemplateText(
    @Param('type') type: string,
    @Param('lang') lang: string
  ): Promise<string> {
    // Validate template type
    const validTypes = this.emailTemplateService.getTemplateTypes();
    if (!validTypes.includes(type as EmailTemplateType)) {
      throw new BadRequestException(
        `Invalid template type: ${type}. Valid types: ${validTypes.join(', ')}`
      );
    }

    // Validate and normalize language
    if (!this.emailTemplateService.isLanguageSupported(lang)) {
      throw new BadRequestException(
        `Unsupported language: ${lang}. Supported languages: ${SUPPORTED_EMAIL_LANGUAGES.join(', ')}`
      );
    }

    try {
      const rendered = await this.emailTemplateService.getTemplatePreview(
        type as EmailTemplateType,
        lang as EmailLanguage
      );
      return rendered.text;
    } catch {
      throw new NotFoundException(`Template not found: ${type}/${lang}`);
    }
  }

  /**
   * GET /emails/cache/clear
   * Clear email template cache (admin utility)
   */
  @Get('cache/clear')
  @ApiOperation({
    summary: 'Clear template cache',
    description: 'Clears the email template cache. Use after updating template files.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache cleared successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Email template cache cleared' },
      },
    },
  })
  clearCache(): { message: string } {
    this.emailTemplateService.clearCache();
    return { message: 'Email template cache cleared' };
  }
}
