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
  CreateArtistDto,
  UpdateArtistDto,
  ArtistQueryDto,
  ArtistResponseDto,
  PaginatedArtistsDto,
} from './dto/artist.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Artists Controller
 *
 * Handles all artist-related HTTP endpoints.
 * Artists are shared across festivals (not festival-specific).
 */
@ApiTags('artists')
@Controller('artists')
export class ArtistsController {
  constructor(private readonly programService: ProgramService) {}

  /**
   * Create a new artist
   * Only ADMIN and ORGANIZER can create artists
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new artist',
    description: 'Creates a new artist. Accessible by ADMIN and ORGANIZER roles.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Artist created successfully',
    type: ArtistResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - requires ADMIN or ORGANIZER role' })
  async create(@Body() createArtistDto: CreateArtistDto): Promise<ArtistResponseDto> {
    return this.programService.createArtist(createArtistDto);
  }

  /**
   * Get all artists with filters and pagination
   * Public endpoint
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'List all artists',
    description: 'Returns a paginated list of artists. Can filter by name, genre.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of artists',
    type: PaginatedArtistsDto,
  })
  async findAll(@Query() query: ArtistQueryDto): Promise<PaginatedArtistsDto> {
    return this.programService.findAllArtists(query);
  }

  /**
   * Get an artist by ID
   * Public endpoint
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get an artist by ID',
    description: 'Returns detailed information about a specific artist.',
  })
  @ApiParam({
    name: 'id',
    description: 'Artist UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Artist details',
    type: ArtistResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Artist not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ArtistResponseDto> {
    return this.programService.findArtistById(id);
  }

  /**
   * Update an artist
   * Only ADMIN and ORGANIZER can update artists
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update an artist',
    description: 'Updates an artist. Accessible by ADMIN and ORGANIZER roles.',
  })
  @ApiParam({
    name: 'id',
    description: 'Artist UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Artist updated successfully',
    type: ArtistResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Artist not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateArtistDto: UpdateArtistDto,
  ): Promise<ArtistResponseDto> {
    return this.programService.updateArtist(id, updateArtistDto);
  }

  /**
   * Delete an artist
   * Only ADMIN can delete artists
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete an artist',
    description: 'Deletes an artist. Only accessible by ADMIN. Cannot delete if artist has performances.',
  })
  @ApiParam({
    name: 'id',
    description: 'Artist UUID',
    type: String,
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Artist deleted successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot delete artist with performances' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - requires ADMIN role' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Artist not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.programService.deleteArtist(id);
  }
}
