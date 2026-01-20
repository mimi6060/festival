import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProgramService } from './program.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { ProgramSearchDto, PaginatedProgramSearchResponse } from './dto/program-search.dto';

@ApiTags('Program')
@Controller('program')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  /**
   * Search the festival program
   * Supports filtering by query string, genre, date, and stage
   */
  @Get('search')
  @ApiOperation({
    summary: 'Search festival program',
    description:
      'Search performances with multiple filters including artist name, genre, date, and stage. Returns paginated results.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated search results',
    type: PaginatedProgramSearchResponse,
  })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @RateLimit({
    limit: 100,
    windowSeconds: 60, // 100 requests per minute
    keyPrefix: 'program:search',
    errorMessage: 'Too many search requests. Please try again later.',
  })
  async searchProgram(
    @Query() searchDto: ProgramSearchDto,
    @Request() req
  ): Promise<PaginatedProgramSearchResponse> {
    const userId = req.user?.id;
    return this.programService.searchProgram(searchDto, userId);
  }

  /**
   * Get full program for a festival
   */
  @Get()
  @RateLimit({
    limit: 100,
    windowSeconds: 60, // 100 requests per minute
    keyPrefix: 'program:list',
    errorMessage: 'Too many requests. Please try again later.',
  })
  async getProgram(@Query('festivalId') festivalId: string, @Request() req) {
    const userId = req.user?.id;
    return this.programService.getProgram(festivalId, userId);
  }

  /**
   * Get program for a specific day
   */
  @Get('day/:day')
  @RateLimit({
    limit: 100,
    windowSeconds: 60, // 100 requests per minute
    keyPrefix: 'program:day',
    errorMessage: 'Too many requests. Please try again later.',
  })
  async getProgramByDay(
    @Query('festivalId') festivalId: string,
    @Param('day') day: string,
    @Request() req
  ) {
    const userId = req.user?.id;
    return this.programService.getProgramByDay(festivalId, day, userId);
  }

  /**
   * Get all artists for a festival
   */
  @Get('artists')
  @RateLimit({
    limit: 100,
    windowSeconds: 60, // 100 requests per minute
    keyPrefix: 'program:artists',
    errorMessage: 'Too many requests. Please try again later.',
  })
  async getArtists(@Query('festivalId') festivalId: string) {
    return this.programService.getArtists(festivalId);
  }

  /**
   * Get artist by ID
   */
  @Get('artists/:id')
  async getArtistById(@Param('id') id: string) {
    return this.programService.getArtistById(id);
  }

  /**
   * Get performances for an artist
   */
  @Get('artists/:id/performances')
  async getArtistPerformances(@Param('id') id: string, @Query('festivalId') festivalId?: string) {
    return this.programService.getArtistPerformances(id, festivalId);
  }

  /**
   * Get all stages for a festival
   */
  @Get('stages')
  @RateLimit({
    limit: 100,
    windowSeconds: 60, // 100 requests per minute
    keyPrefix: 'program:stages',
    errorMessage: 'Too many requests. Please try again later.',
  })
  async getStages(@Query('festivalId') festivalId: string) {
    return this.programService.getStages(festivalId);
  }

  /**
   * Get user's favorite artists
   */
  @UseGuards(JwtAuthGuard)
  @Get('favorites')
  async getFavorites(@Request() req, @Query('festivalId') festivalId: string) {
    return this.programService.getFavorites(req.user.id, festivalId);
  }

  /**
   * Toggle favorite artist
   */
  @UseGuards(JwtAuthGuard)
  @Post('favorites/:artistId')
  @HttpCode(HttpStatus.OK)
  async toggleFavorite(
    @Request() req,
    @Query('festivalId') festivalId: string,
    @Param('artistId') artistId: string
  ) {
    return this.programService.toggleFavorite(req.user.id, festivalId, artistId);
  }
}
