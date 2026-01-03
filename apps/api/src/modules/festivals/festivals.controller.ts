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
} from '@nestjs/swagger';
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
export class FestivalsController {
  /**
   * Create a new festival
   */
  @Post()
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
  async create(@Body() createFestivalDto: CreateFestivalDto): Promise<FestivalResponseDto> {
    return {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: createFestivalDto.name,
      slug: createFestivalDto.slug || 'summer-vibes-festival-2025',
      shortDescription: createFestivalDto.shortDescription,
      description: createFestivalDto.description,
      startDate: new Date(createFestivalDto.startDate),
      endDate: new Date(createFestivalDto.endDate),
      location: createFestivalDto.location,
      status: FestivalStatus.DRAFT,
      capacity: createFestivalDto.capacity,
      coverImage: createFestivalDto.coverImage,
      logo: createFestivalDto.logo,
      primaryColor: createFestivalDto.primaryColor,
      tags: createFestivalDto.tags,
      currency: createFestivalDto.currency || 'EUR',
      timezone: createFestivalDto.timezone || 'UTC',
      organizerId: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get all festivals with filtering and pagination
   */
  @Get()
  @ApiOperation({
    summary: 'List festivals',
    description: 'Returns a paginated list of festivals with optional filtering.',
  })
  @ApiOkResponse({
    description: 'List of festivals',
    type: PaginatedFestivalsResponseDto,
  })
  async findAll(@Query() query: FestivalQueryDto): Promise<PaginatedFestivalsResponseDto> {
    return {
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Summer Vibes Festival 2025',
          slug: 'summer-vibes-festival-2025',
          shortDescription: 'The biggest electronic music festival in France',
          startDate: new Date('2025-07-15T14:00:00.000Z'),
          endDate: new Date('2025-07-17T23:00:00.000Z'),
          location: {
            venueName: 'Parc des Expositions',
            address: '1 Place de la Porte de Versailles',
            city: 'Paris',
            country: 'FR',
            postalCode: '75015',
          },
          status: FestivalStatus.PUBLISHED,
          capacity: 50000,
          currency: 'EUR',
          timezone: 'Europe/Paris',
          organizerId: '550e8400-e29b-41d4-a716-446655440001',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
      page: query.page || 1,
      limit: query.limit || 20,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }

  /**
   * Get festival by ID
   */
  @Get(':id')
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
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FestivalResponseDto> {
    return {
      id,
      name: 'Summer Vibes Festival 2025',
      slug: 'summer-vibes-festival-2025',
      shortDescription: 'The biggest electronic music festival in France',
      description: '## About Summer Vibes\n\nJoin us for 3 days of incredible music...',
      startDate: new Date('2025-07-15T14:00:00.000Z'),
      endDate: new Date('2025-07-17T23:00:00.000Z'),
      location: {
        venueName: 'Parc des Expositions',
        address: '1 Place de la Porte de Versailles',
        city: 'Paris',
        country: 'FR',
        postalCode: '75015',
        latitude: 48.8323,
        longitude: 2.2885,
      },
      status: FestivalStatus.PUBLISHED,
      capacity: 50000,
      coverImage: 'https://cdn.example.com/festivals/summer-vibes-cover.jpg',
      logo: 'https://cdn.example.com/festivals/summer-vibes-logo.png',
      primaryColor: '#FF6B35',
      tags: ['electronic', 'techno', 'house', 'outdoor'],
      currency: 'EUR',
      timezone: 'Europe/Paris',
      organizerId: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get festival by slug
   */
  @Get('by-slug/:slug')
  @ApiOperation({
    summary: 'Get festival by slug',
    description: 'Returns festival information using its URL-friendly slug.',
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
  async findBySlug(@Param('slug') slug: string): Promise<FestivalResponseDto> {
    return {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Summer Vibes Festival 2025',
      slug,
      shortDescription: 'The biggest electronic music festival in France',
      startDate: new Date('2025-07-15T14:00:00.000Z'),
      endDate: new Date('2025-07-17T23:00:00.000Z'),
      location: {
        venueName: 'Parc des Expositions',
        address: '1 Place de la Porte de Versailles',
        city: 'Paris',
        country: 'FR',
        postalCode: '75015',
      },
      status: FestivalStatus.PUBLISHED,
      currency: 'EUR',
      timezone: 'Europe/Paris',
      organizerId: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Update festival
   */
  @Put(':id')
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
  ): Promise<FestivalResponseDto> {
    return {
      id,
      name: updateFestivalDto.name || 'Summer Vibes Festival 2025',
      slug: 'summer-vibes-festival-2025',
      shortDescription: updateFestivalDto.shortDescription || 'The biggest electronic music festival in France',
      startDate: updateFestivalDto.startDate ? new Date(updateFestivalDto.startDate) : new Date('2025-07-15T14:00:00.000Z'),
      endDate: updateFestivalDto.endDate ? new Date(updateFestivalDto.endDate) : new Date('2025-07-17T23:00:00.000Z'),
      location: updateFestivalDto.location || {
        venueName: 'Parc des Expositions',
        address: '1 Place de la Porte de Versailles',
        city: 'Paris',
        country: 'FR',
        postalCode: '75015',
      },
      status: updateFestivalDto.status || FestivalStatus.DRAFT,
      currency: 'EUR',
      timezone: 'Europe/Paris',
      organizerId: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Delete festival
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  async remove(@Param('id', ParseUUIDPipe) _id: string): Promise<void> {
    // Implementation would delete the festival
  }

  /**
   * Get festival statistics
   */
  @Get(':id/stats')
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
  async getStats(@Param('id', ParseUUIDPipe) _id: string): Promise<FestivalStatsDto> {
    return {
      ticketsSold: 25430,
      totalRevenue: 2543000,
      ticketCategories: 5,
      cashlessAccounts: 18500,
      cashlessTransactions: 125000,
      capacityPercentage: 50.86,
      checkInRate: 75.5,
    };
  }

  /**
   * Publish festival
   */
  @Post(':id/publish')
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
  async publish(@Param('id', ParseUUIDPipe) id: string): Promise<FestivalResponseDto> {
    return {
      id,
      name: 'Summer Vibes Festival 2025',
      slug: 'summer-vibes-festival-2025',
      shortDescription: 'The biggest electronic music festival in France',
      startDate: new Date('2025-07-15T14:00:00.000Z'),
      endDate: new Date('2025-07-17T23:00:00.000Z'),
      location: {
        venueName: 'Parc des Expositions',
        address: '1 Place de la Porte de Versailles',
        city: 'Paris',
        country: 'FR',
        postalCode: '75015',
      },
      status: FestivalStatus.PUBLISHED,
      currency: 'EUR',
      timezone: 'Europe/Paris',
      organizerId: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Cancel festival
   */
  @Post(':id/cancel')
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
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<FestivalResponseDto> {
    return {
      id,
      name: 'Summer Vibes Festival 2025',
      slug: 'summer-vibes-festival-2025',
      shortDescription: 'The biggest electronic music festival in France',
      startDate: new Date('2025-07-15T14:00:00.000Z'),
      endDate: new Date('2025-07-17T23:00:00.000Z'),
      location: {
        venueName: 'Parc des Expositions',
        address: '1 Place de la Porte de Versailles',
        city: 'Paris',
        country: 'FR',
        postalCode: '75015',
      },
      status: FestivalStatus.CANCELLED,
      currency: 'EUR',
      timezone: 'Europe/Paris',
      organizerId: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
