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
  CreateStageDto,
  UpdateStageDto,
  StageQueryDto,
  StageResponseDto,
  PaginatedStagesDto,
} from './dto/stage.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Stages Controller
 *
 * Handles all stage-related HTTP endpoints.
 * Stages are festival-specific.
 */
@ApiTags('stages')
@Controller('festivals/:festivalId/stages')
export class StagesController {
  constructor(private readonly programService: ProgramService) {}

  /**
   * Create a new stage for a festival
   * Only ADMIN and ORGANIZER can create stages
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new stage',
    description: 'Creates a new stage for a festival. Accessible by ADMIN and ORGANIZER roles.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Stage created successfully',
    type: StageResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Festival not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Stage name already exists in festival' })
  async create(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Body() createStageDto: CreateStageDto,
  ): Promise<StageResponseDto> {
    return this.programService.createStage(festivalId, createStageDto);
  }

  /**
   * Get all stages for a festival
   * Public endpoint
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'List all stages for a festival',
    description: 'Returns a paginated list of stages for a festival.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of stages',
    type: PaginatedStagesDto,
  })
  async findAll(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Query() query: StageQueryDto,
  ): Promise<PaginatedStagesDto> {
    return this.programService.findAllStages(festivalId, query);
  }

  /**
   * Get a stage by ID
   * Public endpoint
   */
  @Get(':stageId')
  @Public()
  @ApiOperation({
    summary: 'Get a stage by ID',
    description: 'Returns detailed information about a specific stage.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiParam({
    name: 'stageId',
    description: 'Stage UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stage details',
    type: StageResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Stage not found' })
  async findOne(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ): Promise<StageResponseDto> {
    return this.programService.findStageById(festivalId, stageId);
  }

  /**
   * Update a stage
   * Only ADMIN and ORGANIZER can update stages
   */
  @Patch(':stageId')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a stage',
    description: 'Updates a stage. Accessible by ADMIN and ORGANIZER roles.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiParam({
    name: 'stageId',
    description: 'Stage UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stage updated successfully',
    type: StageResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Stage not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Stage name already exists in festival' })
  async update(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() updateStageDto: UpdateStageDto,
  ): Promise<StageResponseDto> {
    return this.programService.updateStage(festivalId, stageId, updateStageDto);
  }

  /**
   * Delete a stage
   * Only ADMIN can delete stages
   */
  @Delete(':stageId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a stage',
    description: 'Deletes a stage. Only accessible by ADMIN. Cannot delete if stage has performances.',
  })
  @ApiParam({
    name: 'festivalId',
    description: 'Festival UUID',
    type: String,
  })
  @ApiParam({
    name: 'stageId',
    description: 'Stage UUID',
    type: String,
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Stage deleted successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot delete stage with performances' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - requires ADMIN role' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Stage not found' })
  async remove(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ): Promise<void> {
    return this.programService.deleteStage(festivalId, stageId);
  }
}
