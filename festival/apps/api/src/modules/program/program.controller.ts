import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProgramService } from './program.service';
import {
  CreateArtistDto,
  UpdateArtistDto,
  CreateStageDto,
  UpdateStageDto,
  CreatePerformanceDto,
  UpdatePerformanceDto,
  QueryArtistsDto,
  QueryLineupDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Program')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  // ==================== ARTIST ENDPOINTS ====================

  @Get('artists')
  @Public()
  @ApiOperation({ summary: 'List all artists with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of artists' })
  async findAllArtists(@Query() query: QueryArtistsDto) {
    return this.programService.findAllArtists(query);
  }

  @Post('artists')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new artist' })
  @ApiResponse({ status: 201, description: 'Artist created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN or ORGANIZER role' })
  async createArtist(@Body() dto: CreateArtistDto) {
    return this.programService.createArtist(dto);
  }

  @Get('artists/genres')
  @Public()
  @ApiOperation({ summary: 'Get all unique genres' })
  @ApiResponse({ status: 200, description: 'List of genres' })
  async getGenres() {
    return this.programService.getGenres();
  }

  @Get('artists/:id')
  @Public()
  @ApiOperation({ summary: 'Get artist by ID' })
  @ApiParam({ name: 'id', description: 'Artist ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Artist details' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  async findArtistById(@Param('id') id: string) {
    return this.programService.findArtistById(id);
  }

  @Put('artists/:id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update artist' })
  @ApiParam({ name: 'id', description: 'Artist ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Artist updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  async updateArtist(@Param('id') id: string, @Body() dto: UpdateArtistDto) {
    return this.programService.updateArtist(id, dto);
  }

  @Delete('artists/:id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete artist' })
  @ApiParam({ name: 'id', description: 'Artist ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Artist deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete artist with performances' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  async deleteArtist(@Param('id') id: string) {
    await this.programService.deleteArtist(id);
  }

  // ==================== STAGE ENDPOINTS ====================

  @Get('festivals/:festivalId/stages')
  @Public()
  @ApiOperation({ summary: 'List all stages for a festival' })
  @ApiParam({ name: 'festivalId', description: 'Festival ID (UUID)' })
  @ApiResponse({ status: 200, description: 'List of stages' })
  @ApiResponse({ status: 404, description: 'Festival not found' })
  async findStagesByFestival(@Param('festivalId') festivalId: string) {
    return this.programService.findStagesByFestival(festivalId);
  }

  @Post('festivals/:festivalId/stages')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new stage for a festival' })
  @ApiParam({ name: 'festivalId', description: 'Festival ID (UUID)' })
  @ApiResponse({ status: 201, description: 'Stage created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Festival not found' })
  @ApiResponse({ status: 409, description: 'Stage name already exists' })
  async createStage(
    @Param('festivalId') festivalId: string,
    @Body() dto: CreateStageDto,
  ) {
    return this.programService.createStage(festivalId, dto);
  }

  @Get('stages/:id')
  @Public()
  @ApiOperation({ summary: 'Get stage by ID with performances' })
  @ApiParam({ name: 'id', description: 'Stage ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Stage details with performances' })
  @ApiResponse({ status: 404, description: 'Stage not found' })
  async findStageById(@Param('id') id: string) {
    return this.programService.findStageById(id);
  }

  @Put('stages/:id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update stage' })
  @ApiParam({ name: 'id', description: 'Stage ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Stage updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Stage not found' })
  @ApiResponse({ status: 409, description: 'Stage name already exists' })
  async updateStage(@Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.programService.updateStage(id, dto);
  }

  @Delete('stages/:id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete stage' })
  @ApiParam({ name: 'id', description: 'Stage ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Stage deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete stage with performances' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Stage not found' })
  async deleteStage(@Param('id') id: string) {
    await this.programService.deleteStage(id);
  }

  // ==================== PERFORMANCE / LINEUP ENDPOINTS ====================

  @Get('festivals/:festivalId/lineup')
  @Public()
  @ApiOperation({ summary: 'Get festival lineup (performances)' })
  @ApiParam({ name: 'festivalId', description: 'Festival ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Festival lineup with performances' })
  @ApiResponse({ status: 404, description: 'Festival not found' })
  async findFestivalLineup(
    @Param('festivalId') festivalId: string,
    @Query() query: QueryLineupDto,
  ) {
    return this.programService.findFestivalLineup(festivalId, query);
  }

  @Get('festivals/:festivalId/artists')
  @Public()
  @ApiOperation({ summary: 'Get all artists performing at a festival' })
  @ApiParam({ name: 'festivalId', description: 'Festival ID (UUID)' })
  @ApiResponse({ status: 200, description: 'List of artists for the festival' })
  @ApiResponse({ status: 404, description: 'Festival not found' })
  async findArtistsByFestival(@Param('festivalId') festivalId: string) {
    return this.programService.getArtistsByFestival(festivalId);
  }

  @Post('festivals/:festivalId/performances')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a performance to the festival lineup' })
  @ApiParam({ name: 'festivalId', description: 'Festival ID (UUID)' })
  @ApiResponse({ status: 201, description: 'Performance created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or time conflict' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Festival, Artist, or Stage not found' })
  @ApiResponse({ status: 409, description: 'Schedule conflict' })
  async createPerformance(
    @Param('festivalId') festivalId: string,
    @Body() dto: CreatePerformanceDto,
  ) {
    return this.programService.createPerformance(festivalId, dto);
  }

  @Get('performances/:id')
  @Public()
  @ApiOperation({ summary: 'Get performance by ID' })
  @ApiParam({ name: 'id', description: 'Performance ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Performance details' })
  @ApiResponse({ status: 404, description: 'Performance not found' })
  async findPerformanceById(@Param('id') id: string) {
    return this.programService.findPerformanceById(id);
  }

  @Put('performances/:id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update performance' })
  @ApiParam({ name: 'id', description: 'Performance ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Performance updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or time conflict' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Performance not found' })
  @ApiResponse({ status: 409, description: 'Schedule conflict' })
  async updatePerformance(
    @Param('id') id: string,
    @Body() dto: UpdatePerformanceDto,
  ) {
    return this.programService.updatePerformance(id, dto);
  }

  @Delete('performances/:id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete performance' })
  @ApiParam({ name: 'id', description: 'Performance ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Performance deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Performance not found' })
  async deletePerformance(@Param('id') id: string) {
    await this.programService.deletePerformance(id);
  }

  @Patch('performances/:id/cancel')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a performance (soft delete)' })
  @ApiParam({ name: 'id', description: 'Performance ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Performance cancelled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Performance not found' })
  async cancelPerformance(@Param('id') id: string) {
    return this.programService.cancelPerformance(id);
  }
}
