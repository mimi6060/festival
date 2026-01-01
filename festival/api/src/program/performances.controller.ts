import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ProgramService } from './program.service';
import {
  CreatePerformanceDto,
  UpdatePerformanceDto,
  PerformanceQueryDto,
  PerformanceResponseDto,
  PaginatedPerformancesDto,
} from './dto/performance.dto';
import {
  FestivalProgramDto,
  ProgramByDayDto,
  ProgramByStageDto,
} from './dto/program.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Performances Controller
 *
 * Handles all performance-related HTTP endpoints.
 * Performances are festival-specific (via stages).
 */
@ApiTags('program')
@Controller('festivals/:festivalId')
export class PerformancesController {
  constructor(private readonly programService: ProgramService) {}

  // ==================== PROGRAM VIEWS ====================

  /**
   * Get complete festival program
   * Public endpoint
   */
  @Get('program')
  @Public()
  @ApiOperation({
    summary: 'Get complete festival program',
    description: 'Returns the complete program with all stages and performances.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Festival program',
    type: FestivalProgramDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async getProgram(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
  ): Promise<FestivalProgramDto> {
    return this.programService.getFestivalProgram(festivalId);
  }

  /**
   * Get festival program grouped by day
   * Public endpoint
   */
  @Get('program/by-day')
  @Public()
  @ApiOperation({
    summary: 'Get festival program by day',
    description: 'Returns the program organized by day.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Festival program by day',
    type: ProgramByDayDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async getProgramByDay(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
  ): Promise<ProgramByDayDto> {
    return this.programService.getProgramByDay(festivalId);
  }

  /**
   * Get festival program grouped by stage
   * Public endpoint
   */
  @Get('program/by-stage')
  @Public()
  @ApiOperation({
    summary: 'Get festival program by stage',
    description: 'Returns the program organized by stage.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Festival program by stage',
    type: ProgramByStageDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  async getProgramByStage(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
  ): Promise<ProgramByStageDto> {
    return this.programService.getProgramByStage(festivalId);
  }

  // ==================== PERFORMANCES CRUD ====================

  /**
   * Create a new performance
   * Only ADMIN and ORGANIZER can create performances
   */
  @Post('performances')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new performance',
    description: 'Creates a new performance for a festival. Accessible by ADMIN and ORGANIZER roles.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Performance created successfully',
    type: PerformanceResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data or time range' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Artist or Stage not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Performance overlaps with existing one' })
  async create(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Body() createPerformanceDto: CreatePerformanceDto,
  ): Promise<PerformanceResponseDto> {
    return this.programService.createPerformance(festivalId, createPerformanceDto);
  }

  /**
   * Get all performances for a festival
   * Public endpoint
   */
  @Get('performances')
  @Public()
  @ApiOperation({
    summary: 'List all performances for a festival',
    description: 'Returns a paginated list of performances. Can filter by artist, stage, date.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of performances',
    type: PaginatedPerformancesDto,
  })
  async findAll(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Query() query: PerformanceQueryDto,
  ): Promise<PaginatedPerformancesDto> {
    return this.programService.findAllPerformances(festivalId, query);
  }

  /**
   * Get a performance by ID
   * Public endpoint
   */
  @Get('performances/:performanceId')
  @Public()
  @ApiOperation({
    summary: 'Get a performance by ID',
    description: 'Returns detailed information about a specific performance.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiParam({
    name: 'performanceId',
    description: 'Performance UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance details',
    type: PerformanceResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Performance not found' })
  async findOne(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Param('performanceId', ParseUUIDPipe) performanceId: string,
  ): Promise<PerformanceResponseDto> {
    return this.programService.findPerformanceById(festivalId, performanceId);
  }

  /**
   * Update a performance
   * Only ADMIN and ORGANIZER can update performances
   */
  @Patch('performances/:performanceId')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a performance',
    description: 'Updates a performance. Can also be used to cancel a performance.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiParam({
    name: 'performanceId',
    description: 'Performance UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance updated successfully',
    type: PerformanceResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data or time range' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Performance not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Performance overlaps with existing one' })
  async update(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Param('performanceId', ParseUUIDPipe) performanceId: string,
    @Body() updatePerformanceDto: UpdatePerformanceDto,
  ): Promise<PerformanceResponseDto> {
    return this.programService.updatePerformance(festivalId, performanceId, updatePerformanceDto);
  }

  /**
   * Delete a performance
   * Only ADMIN can delete performances
   */
  @Delete('performances/:performanceId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a performance',
    description: 'Deletes a performance. Only accessible by ADMIN.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiParam({
    name: 'performanceId',
    description: 'Performance UUID',
    type: String,
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Performance deleted successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - requires ADMIN role' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Performance not found' })
  async remove(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Param('performanceId', ParseUUIDPipe) performanceId: string,
  ): Promise<void> {
    return this.programService.deletePerformance(festivalId, performanceId);
  }
}
