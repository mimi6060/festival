import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
  Request,
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
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { FestivalsService } from './festivals.service';
import {
  CreateFestivalDto,
  UpdateFestivalDto,
  FestivalResponseDto,
  FestivalQueryDto,
  FestivalStatsDto,
  FestivalStatus,
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
import { Cacheable, CacheEvict, CacheTag } from '../cache';
import { AllVersions, API_VERSION_HEADER } from '../../common/versioning';

/**
 * Paginated festivals response
 */
class PaginatedFestivalsResponseDto {
  data!: FestivalResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
  hasNextPage!: boolean;
  hasPreviousPage!: boolean;
}

/**
 * Festivals Controller
 *
 * Manages festival CRUD operations and related functionality.
 * Festivals are the core entity in this multi-tenant platform.
 */
@ApiTags('Festivals')
@Controller('festivals')
@AllVersions()
@ApiHeader({
  name: API_VERSION_HEADER,
  description: 'API Version (v1 or v2)',
  required: false,
  schema: { type: 'string', enum: ['v1', 'v2'], default: 'v1' },
})
export class FestivalsController {
  constructor(private readonly festivalsService: FestivalsService) {}

  /**
   * Create a new festival
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @CacheEvict({ tags: [CacheTag.FESTIVAL] })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new festival',
    description: 'Creates a new festival. The authenticated user becomes the festival organizer.',
  })
  @ApiCreatedResponse({
    description: 'Festival created successfully',
    type: FestivalResponseDto,
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
    description: 'Festival with this slug already exists',
    type: ErrorResponseDto,
  })
  async create(
    @Body() createFestivalDto: CreateFestivalDto,
    @Request() req: { user: { sub: string } }
  ) {
    return this.festivalsService.create(createFestivalDto, req.user.sub);
  }

  /**
   * Get all published festivals (PUBLIC)
   */
  @Get()
  @Public()
  @RateLimit({
    limit: 100,
    windowSeconds: 60, // 100 requests per minute
    keyPrefix: 'festivals:list',
    errorMessage: 'Too many requests. Please try again later.',
  })
  @Cacheable({
    key: { prefix: 'festivals:list', paramIndices: [0] },
    ttl: 300, // 5 minutes
    tags: [CacheTag.FESTIVAL],
  })
  @ApiOperation({
    summary: 'List festivals',
    description: 'Returns a paginated list of published festivals. Public endpoint.',
  })
  @ApiOkResponse({
    description: 'List of festivals',
    type: PaginatedFestivalsResponseDto,
  })
  async findAll(@Query() query: FestivalQueryDto) {
    // By default, only show published festivals for public access
    if (!query.status) {
      query.status = FestivalStatus.PUBLISHED;
    }
    return this.festivalsService.findAll(query);
  }

  /**
   * Get festival by ID
   */
  @Get(':id')
  @Public()
  @RateLimit({
    limit: 100,
    windowSeconds: 60, // 100 requests per minute
    keyPrefix: 'festivals:get',
    errorMessage: 'Too many requests. Please try again later.',
  })
  @ApiOperation({
    summary: 'Get festival by ID',
    description: 'Returns detailed information about a specific festival.',
  })
  @ApiParam({
    name: 'id',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Festival details',
    type: FestivalResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Festival not found',
    type: NotFoundResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.festivalsService.findOne(id);
  }

  /**
   * Get festival by slug (PUBLIC)
   */
  @Get('by-slug/:slug')
  @Public()
  @RateLimit({
    limit: 100,
    windowSeconds: 60, // 100 requests per minute
    keyPrefix: 'festivals:get-by-slug',
    errorMessage: 'Too many requests. Please try again later.',
  })
  @ApiOperation({
    summary: 'Get festival by slug',
    description: 'Returns festival information using its URL-friendly slug. Public endpoint.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Festival slug',
    example: 'summer-vibes-festival-2025',
  })
  @ApiOkResponse({
    description: 'Festival details',
    type: FestivalResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Festival not found',
    type: NotFoundResponseDto,
  })
  async findBySlug(@Param('slug') slug: string) {
    return this.festivalsService.findBySlug(slug);
  }

  /**
   * Update festival
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @CacheEvict({ tags: [CacheTag.FESTIVAL] })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update festival',
    description: 'Updates an existing festival.',
  })
  @ApiParam({
    name: 'id',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Festival updated successfully',
    type: FestivalResponseDto,
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
    description: 'Festival not found',
    type: NotFoundResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFestivalDto: UpdateFestivalDto,
    @Request() req: { user: { sub: string } }
  ) {
    return this.festivalsService.update(id, updateFestivalDto, req.user.sub);
  }

  /**
   * Delete festival
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @CacheEvict({ tags: [CacheTag.FESTIVAL] })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete festival',
    description: 'Permanently deletes a festival.',
  })
  @ApiParam({
    name: 'id',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'Festival deleted successfully',
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
    description: 'Festival not found',
    type: NotFoundResponseDto,
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { sub: string } }
  ): Promise<void> {
    await this.festivalsService.remove(id, req.user.sub);
  }

  /**
   * Get festival statistics
   */
  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get festival statistics',
    description: 'Returns comprehensive statistics for a festival.',
  })
  @ApiParam({
    name: 'id',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Festival statistics',
    type: FestivalStatsDto,
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
    description: 'Festival not found',
    type: NotFoundResponseDto,
  })
  async getStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.festivalsService.getStats(id);
  }

  /**
   * Publish festival
   */
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @CacheEvict({ tags: [CacheTag.FESTIVAL] })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Publish festival',
    description: 'Changes the festival status from DRAFT to PUBLISHED.',
  })
  @ApiParam({
    name: 'id',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Festival published',
    type: FestivalResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Festival is not in DRAFT status',
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
    description: 'Festival not found',
    type: NotFoundResponseDto,
  })
  async publish(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: { sub: string } }) {
    return this.festivalsService.updateStatus(id, FestivalStatus.PUBLISHED, req.user.sub);
  }

  /**
   * Cancel festival
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @CacheEvict({ tags: [CacheTag.FESTIVAL] })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Cancel festival',
    description: 'Cancels a festival and initiates refund process.',
  })
  @ApiParam({
    name: 'id',
    description: 'Festival UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Festival cancelled',
    type: FestivalResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Festival cannot be cancelled',
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
  async cancel(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: { sub: string } }) {
    return this.festivalsService.updateStatus(id, FestivalStatus.CANCELLED, req.user.sub);
  }
}
