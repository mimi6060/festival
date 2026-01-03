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
import { ProgramService } from './program.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('api/program')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  /**
   * Get full program for a festival
   */
  @Get()
  async getProgram(
    @Query('festivalId') festivalId: string,
    @Request() req,
  ) {
    const userId = req.user?.id;
    return this.programService.getProgram(festivalId, userId);
  }

  /**
   * Get program for a specific day
   */
  @Get('day/:day')
  async getProgramByDay(
    @Query('festivalId') festivalId: string,
    @Param('day') day: string,
    @Request() req,
  ) {
    const userId = req.user?.id;
    return this.programService.getProgramByDay(festivalId, day, userId);
  }

  /**
   * Get all artists for a festival
   */
  @Get('artists')
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
  async getArtistPerformances(
    @Param('id') id: string,
    @Query('festivalId') festivalId?: string,
  ) {
    return this.programService.getArtistPerformances(id, festivalId);
  }

  /**
   * Get all stages for a festival
   */
  @Get('stages')
  async getStages(@Query('festivalId') festivalId: string) {
    return this.programService.getStages(festivalId);
  }

  /**
   * Get user's favorite artists
   */
  @UseGuards(JwtAuthGuard)
  @Get('favorites')
  async getFavorites(
    @Request() req,
    @Query('festivalId') festivalId: string,
  ) {
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
    @Param('artistId') artistId: string,
  ) {
    return this.programService.toggleFavorite(req.user.id, festivalId, artistId);
  }
}
