import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { LanguagesService } from './languages.service';
import {
  CreateFestivalLanguageSettingsDto,
  UpdateLanguageSettingsDto,
  UpsertLocalizedContentDto,
  SupportedLanguage,
  FestivalLanguageSettingsResponseDto,
  LocalizedContentResponseDto,
  LanguageInfoDto,
} from './dto';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
  UnauthorizedResponseDto,
  ForbiddenResponseDto,
  NotFoundResponseDto,
} from '../../common/dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { AllVersions, API_VERSION_HEADER } from '../../common/versioning';

/**
 * Languages Controller
 *
 * Manages per-festival language settings and localized content.
 */
@ApiTags('Languages')
@Controller('festivals/:festivalId/languages')
@AllVersions()
@ApiHeader({
  name: API_VERSION_HEADER,
  description: 'API Version (v1 or v2)',
  required: false,
  schema: { type: 'string', enum: ['v1', 'v2'], default: 'v1' },
})
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  // ============================================================
  // Language Settings Endpoints
  // ============================================================

  /**
   * Create language settings for a festival
   */
  @Post('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create language settings',
    description: 'Creates language settings for a festival. Only organizers can create settings.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiCreatedResponse({
    description: 'Language settings created successfully',
    type: FestivalLanguageSettingsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions',
    type: ForbiddenResponseDto,
  })
  @ApiConflictResponse({
    description: 'Language settings already exist',
    type: ErrorResponseDto,
  })
  async createSettings(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Body() dto: Omit<CreateFestivalLanguageSettingsDto, 'festivalId'>
  ): Promise<FestivalLanguageSettingsResponseDto> {
    return this.languagesService.createLanguageSettings({
      ...dto,
      festivalId,
    } as CreateFestivalLanguageSettingsDto);
  }

  /**
   * Get language settings for a festival (PUBLIC)
   */
  @Get('settings')
  @Public()
  @RateLimit({
    limit: 100,
    windowSeconds: 60,
    keyPrefix: 'languages:settings:get',
    errorMessage: 'Too many requests. Please try again later.',
  })
  @ApiOperation({
    summary: 'Get language settings',
    description: 'Returns language settings for a festival. Public endpoint.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Language settings',
    type: FestivalLanguageSettingsResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Settings not found',
    type: NotFoundResponseDto,
  })
  async getSettings(
    @Param('festivalId', ParseUUIDPipe) festivalId: string
  ): Promise<FestivalLanguageSettingsResponseDto> {
    return this.languagesService.getOrCreateLanguageSettings(festivalId);
  }

  /**
   * Update language settings for a festival
   */
  @Put('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update language settings',
    description: 'Updates language settings for a festival.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Language settings updated successfully',
    type: FestivalLanguageSettingsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Not the festival organizer',
    type: ForbiddenResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Settings not found',
    type: NotFoundResponseDto,
  })
  async updateSettings(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Body() dto: UpdateLanguageSettingsDto
  ): Promise<FestivalLanguageSettingsResponseDto> {
    return this.languagesService.updateLanguageSettings(festivalId, dto);
  }

  /**
   * Delete language settings for a festival
   */
  @Delete('settings')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete language settings',
    description: 'Deletes language settings and all localized content for a festival.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'Language settings deleted successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Not the festival organizer',
    type: ForbiddenResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Settings not found',
    type: NotFoundResponseDto,
  })
  async deleteSettings(@Param('festivalId', ParseUUIDPipe) festivalId: string): Promise<void> {
    await this.languagesService.deleteLanguageSettings(festivalId);
  }

  // ============================================================
  // Supported Languages Endpoints
  // ============================================================

  /**
   * Get supported languages for a festival (PUBLIC)
   */
  @Get()
  @Public()
  @RateLimit({
    limit: 100,
    windowSeconds: 60,
    keyPrefix: 'languages:list',
    errorMessage: 'Too many requests. Please try again later.',
  })
  @ApiOperation({
    summary: 'Get supported languages',
    description: 'Returns the list of supported languages for a festival. Public endpoint.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'List of supported languages',
    type: [LanguageInfoDto],
  })
  async getSupportedLanguages(
    @Param('festivalId', ParseUUIDPipe) festivalId: string
  ): Promise<LanguageInfoDto[]> {
    return this.languagesService.getSupportedLanguages(festivalId);
  }

  // ============================================================
  // Localized Content Endpoints
  // ============================================================

  /**
   * Get all localized content for a festival
   */
  @Get('content')
  @Public()
  @RateLimit({
    limit: 100,
    windowSeconds: 60,
    keyPrefix: 'languages:content:all',
    errorMessage: 'Too many requests. Please try again later.',
  })
  @ApiOperation({
    summary: 'Get all localized content',
    description: 'Returns all localized content for a festival.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'All localized content',
    type: [LocalizedContentResponseDto],
  })
  @ApiNotFoundResponse({
    description: 'Settings not found',
    type: NotFoundResponseDto,
  })
  async getAllContent(
    @Param('festivalId', ParseUUIDPipe) festivalId: string
  ): Promise<LocalizedContentResponseDto[]> {
    return this.languagesService.getAllLocalizedContent(festivalId);
  }

  /**
   * Get localized content for a specific language (PUBLIC)
   */
  @Get('content/:lang')
  @Public()
  @RateLimit({
    limit: 100,
    windowSeconds: 60,
    keyPrefix: 'languages:content:get',
    errorMessage: 'Too many requests. Please try again later.',
  })
  @ApiOperation({
    summary: 'Get localized content',
    description:
      'Returns localized content for a festival in a specific language. Public endpoint.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'lang',
    description: 'Language code',
    enum: SupportedLanguage,
    example: 'FR',
  })
  @ApiOkResponse({
    description: 'Localized content',
    type: LocalizedContentResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Content not found for this language',
    type: NotFoundResponseDto,
  })
  async getContent(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Param('lang', new ParseEnumPipe(SupportedLanguage)) lang: SupportedLanguage
  ): Promise<LocalizedContentResponseDto> {
    return this.languagesService.getLocalizedContent(festivalId, lang);
  }

  /**
   * Create or update localized content
   */
  @Put('content/:lang')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upsert localized content',
    description: 'Creates or updates localized content for a festival in a specific language.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'lang',
    description: 'Language code',
    enum: SupportedLanguage,
    example: 'FR',
  })
  @ApiOkResponse({
    description: 'Localized content upserted successfully',
    type: LocalizedContentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or language not supported',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Not the festival organizer',
    type: ForbiddenResponseDto,
  })
  async upsertContent(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Param('lang', new ParseEnumPipe(SupportedLanguage)) lang: SupportedLanguage,
    @Body() dto: UpsertLocalizedContentDto
  ): Promise<LocalizedContentResponseDto> {
    return this.languagesService.upsertLocalizedContent(festivalId, lang, dto);
  }

  /**
   * Delete localized content for a specific language
   */
  @Delete('content/:lang')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete localized content',
    description:
      'Deletes localized content for a specific language. Cannot delete default language content.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'lang',
    description: 'Language code',
    enum: SupportedLanguage,
    example: 'EN',
  })
  @ApiResponse({
    status: 204,
    description: 'Localized content deleted successfully',
  })
  @ApiBadRequestResponse({
    description: 'Cannot delete default language content',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Not the festival organizer',
    type: ForbiddenResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Content not found',
    type: NotFoundResponseDto,
  })
  async deleteContent(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Param('lang', new ParseEnumPipe(SupportedLanguage)) lang: SupportedLanguage
  ): Promise<void> {
    await this.languagesService.deleteLocalizedContent(festivalId, lang);
  }
}
