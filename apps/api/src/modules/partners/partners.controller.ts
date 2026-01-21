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
import { PartnersService } from './partners.service';
import { CreatePartnerDto, UpdatePartnerDto, PartnerResponseDto } from './dto/partner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { PartnerType } from '@prisma/client';

@ApiTags('Partners')
@Controller('festivals/:festivalId/partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new partner for a festival' })
  @ApiResponse({ status: 201, description: 'Partner created', type: PartnerResponseDto })
  create(@Param('festivalId') festivalId: string, @Body() createPartnerDto: CreatePartnerDto) {
    return this.partnersService.create(festivalId, createPartnerDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all partners for a festival' })
  @ApiQuery({ name: 'type', required: false, enum: PartnerType })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of partners', type: [PartnerResponseDto] })
  findAll(
    @Param('festivalId') festivalId: string,
    @Query('type') type?: PartnerType,
    @Query('activeOnly') activeOnly?: string
  ) {
    return this.partnersService.findAll(festivalId, type, activeOnly !== 'false');
  }

  @Get('by-type')
  @Public()
  @ApiOperation({ summary: 'Get partners grouped by type' })
  @ApiResponse({ status: 200, description: 'Partners grouped by type' })
  getByType(@Param('festivalId') festivalId: string) {
    return this.partnersService.getByType(festivalId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a specific partner' })
  @ApiResponse({ status: 200, description: 'Partner details', type: PartnerResponseDto })
  findOne(@Param('id') id: string) {
    return this.partnersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a partner' })
  @ApiResponse({ status: 200, description: 'Partner updated', type: PartnerResponseDto })
  update(@Param('id') id: string, @Body() updatePartnerDto: UpdatePartnerDto) {
    return this.partnersService.update(id, updatePartnerDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a partner' })
  @ApiResponse({ status: 200, description: 'Partner deleted' })
  remove(@Param('id') id: string) {
    return this.partnersService.remove(id);
  }
}
