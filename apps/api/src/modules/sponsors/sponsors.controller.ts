import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SponsorsService } from './sponsors.service';
import { CreateSponsorDto, UpdateSponsorDto, SponsorResponseDto } from './dto/sponsor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SponsorTier } from '@prisma/client';

@ApiTags('Sponsors')
@Controller('festivals/:festivalId/sponsors')
export class SponsorsController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new sponsor for a festival' })
  @ApiResponse({ status: 201, description: 'Sponsor created', type: SponsorResponseDto })
  create(@Param('festivalId') festivalId: string, @Body() createSponsorDto: CreateSponsorDto) {
    return this.sponsorsService.create(festivalId, createSponsorDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all sponsors for a festival' })
  @ApiQuery({ name: 'tier', required: false, enum: SponsorTier })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of sponsors', type: [SponsorResponseDto] })
  findAll(
    @Param('festivalId') festivalId: string,
    @Query('tier') tier?: SponsorTier,
    @Query('activeOnly') activeOnly?: string
  ) {
    return this.sponsorsService.findAll(festivalId, tier, activeOnly !== 'false');
  }

  @Get('by-tier')
  @Public()
  @ApiOperation({ summary: 'Get sponsors grouped by tier' })
  @ApiResponse({ status: 200, description: 'Sponsors grouped by tier' })
  getByTier(@Param('festivalId') festivalId: string) {
    return this.sponsorsService.getByTier(festivalId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a specific sponsor' })
  @ApiResponse({ status: 200, description: 'Sponsor details', type: SponsorResponseDto })
  findOne(@Param('id') id: string) {
    return this.sponsorsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a sponsor' })
  @ApiResponse({ status: 200, description: 'Sponsor updated', type: SponsorResponseDto })
  update(@Param('id') id: string, @Body() updateSponsorDto: UpdateSponsorDto) {
    return this.sponsorsService.update(id, updateSponsorDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a sponsor' })
  @ApiResponse({ status: 200, description: 'Sponsor deleted' })
  remove(@Param('id') id: string) {
    return this.sponsorsService.remove(id);
  }
}
