import { Controller, Get, Param, Query, UseGuards, HttpStatus, SetMetadata } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiSecurity,
  ApiExtraModels,
} from '@nestjs/swagger';
import { PublicApiService } from './public-api.service';
import {
  ApiKeyAuthGuard,
  REQUIRE_API_KEY_AUTH,
  API_KEY_SCOPES,
} from '../api-keys/guards/api-key-auth.guard';
import {
  PublicFestivalDto,
  PublicArtistDto,
  PublicStageDto,
  PublicPerformanceDto,
  PublicVenueDto,
  PublicTicketCategoryDto,
  PublicFestivalsQueryDto,
  PublicArtistsQueryDto,
  PublicScheduleQueryDto,
  PublicPaginationDto,
  PublicPaginatedResponseDto,
} from './dto/public-api.dto';

// Decorators
const RequireApiKey = () => SetMetadata(REQUIRE_API_KEY_AUTH, true);
const ApiKeyScopes = (...scopes: string[]) => SetMetadata(API_KEY_SCOPES, scopes);

@ApiTags('Public API')
@ApiSecurity('api-key')
@ApiExtraModels(
  PublicFestivalDto,
  PublicArtistDto,
  PublicStageDto,
  PublicPerformanceDto,
  PublicVenueDto,
  PublicTicketCategoryDto
)
@UseGuards(ApiKeyAuthGuard)
@RequireApiKey()
@ApiKeyScopes('READ')
@Controller('public')
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  // ==========================================================================
  // Festivals
  // ==========================================================================

  @Get('festivals')
  @ApiOperation({
    summary: 'List all festivals',
    description: `
Returns a paginated list of festivals.

**Filters:**
- \`status\`: Filter by festival status (upcoming, ongoing, past)
- \`country\`: Filter by country code (ISO 3166-1 alpha-2)
- \`search\`: Search by festival name, description, or city

**Pagination:**
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 20, max: 100)
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of festivals',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  async getFestivals(
    @Query() query: PublicFestivalsQueryDto
  ): Promise<PublicPaginatedResponseDto<PublicFestivalDto>> {
    return this.publicApiService.getFestivals(query);
  }

  @Get('festivals/:id')
  @ApiOperation({
    summary: 'Get festival by ID',
    description: 'Returns detailed information about a specific festival.',
  })
  @ApiParam({ name: 'id', description: 'Festival ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Festival details',
    type: PublicFestivalDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Festival not found',
  })
  async getFestivalById(@Param('id') id: string): Promise<PublicFestivalDto> {
    return this.publicApiService.getFestivalById(id);
  }

  // ==========================================================================
  // Artists
  // ==========================================================================

  @Get('festivals/:festivalId/artists')
  @ApiOperation({
    summary: 'List artists for a festival',
    description: `
Returns a paginated list of artists performing at the festival.

**Filters:**
- \`genre\`: Filter by genre
- \`search\`: Search by artist name

**Pagination:**
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 20, max: 100)
    `,
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of artists',
  })
  async getArtists(
    @Param('festivalId') festivalId: string,
    @Query() query: PublicArtistsQueryDto
  ): Promise<PublicPaginatedResponseDto<PublicArtistDto>> {
    return this.publicApiService.getArtists(festivalId, query);
  }

  @Get('festivals/:festivalId/artists/:artistId')
  @ApiOperation({
    summary: 'Get artist by ID',
    description: 'Returns detailed information about a specific artist.',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiParam({ name: 'artistId', description: 'Artist ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Artist details',
    type: PublicArtistDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Artist not found',
  })
  async getArtistById(
    @Param('festivalId') festivalId: string,
    @Param('artistId') artistId: string
  ): Promise<PublicArtistDto> {
    return this.publicApiService.getArtistById(festivalId, artistId);
  }

  // ==========================================================================
  // Schedule
  // ==========================================================================

  @Get('festivals/:festivalId/schedule')
  @ApiOperation({
    summary: 'Get festival schedule',
    description: `
Returns a paginated list of performances (schedule) for the festival.

**Filters:**
- \`date\`: Filter by date (YYYY-MM-DD)
- \`stageId\`: Filter by stage ID
- \`artistId\`: Filter by artist ID

**Pagination:**
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 50, max: 100)
    `,
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Festival schedule',
  })
  async getSchedule(
    @Param('festivalId') festivalId: string,
    @Query() query: PublicScheduleQueryDto
  ): Promise<PublicPaginatedResponseDto<PublicPerformanceDto>> {
    return this.publicApiService.getSchedule(festivalId, query);
  }

  // ==========================================================================
  // Stages
  // ==========================================================================

  @Get('festivals/:festivalId/stages')
  @ApiOperation({
    summary: 'List stages for a festival',
    description: 'Returns a paginated list of stages at the festival.',
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of stages',
  })
  async getStages(
    @Param('festivalId') festivalId: string,
    @Query() query: PublicPaginationDto
  ): Promise<PublicPaginatedResponseDto<PublicStageDto>> {
    return this.publicApiService.getStages(festivalId, query);
  }

  // ==========================================================================
  // Venues / POIs
  // ==========================================================================

  @Get('festivals/:festivalId/venues')
  @ApiOperation({
    summary: 'List venues and points of interest',
    description: `
Returns a paginated list of venues and points of interest (stages, food stands, restrooms, etc.).
    `,
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of venues/POIs',
  })
  async getVenues(
    @Param('festivalId') festivalId: string,
    @Query() query: PublicPaginationDto
  ): Promise<PublicPaginatedResponseDto<PublicVenueDto>> {
    return this.publicApiService.getVenues(festivalId, query);
  }

  // ==========================================================================
  // Tickets
  // ==========================================================================

  @Get('festivals/:festivalId/tickets')
  @ApiOperation({
    summary: 'List available ticket categories',
    description: `
Returns a list of ticket categories available for purchase.
Includes pricing, availability, and sale dates.
    `,
  })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of ticket categories',
    type: [PublicTicketCategoryDto],
  })
  async getTicketCategories(
    @Param('festivalId') festivalId: string
  ): Promise<PublicTicketCategoryDto[]> {
    return this.publicApiService.getTicketCategories(festivalId);
  }
}
