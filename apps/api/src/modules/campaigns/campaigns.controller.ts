import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CampaignsService } from './campaigns.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignPreviewDto,
  CampaignStatus,
} from './dto/campaign.dto';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

@ApiTags('Campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Create a new email campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  async create(@Body() dto: CreateCampaignDto, @CurrentUser() user: AuthUser) {
    return this.campaignsService.create(dto, user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({ summary: 'List campaigns for a festival' })
  @ApiQuery({ name: 'festivalId', required: true })
  @ApiQuery({ name: 'status', required: false, enum: CampaignStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('festivalId') festivalId: string,
    @Query('status') status?: CampaignStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.campaignsService.findByFestival(festivalId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('templates')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Get available campaign templates' })
  getTemplates() {
    return this.campaignsService.getTemplates();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, description: 'Campaign details' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async findById(@Param('id') id: string) {
    return this.campaignsService.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Update a campaign' })
  @ApiResponse({ status: 200, description: 'Campaign updated' })
  @ApiResponse({ status: 400, description: 'Cannot update sent campaign' })
  async update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a campaign' })
  @ApiResponse({ status: 204, description: 'Campaign deleted' })
  async delete(@Param('id') id: string) {
    return this.campaignsService.delete(id);
  }

  @Post(':id/preview')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a preview email' })
  @ApiResponse({ status: 200, description: 'Preview sent' })
  async sendPreview(@Param('id') id: string, @Body() dto: CampaignPreviewDto) {
    await this.campaignsService.sendPreview(id, dto);
    return { message: 'Preview sent successfully' };
  }

  @Post(':id/send')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send campaign to all recipients' })
  @ApiResponse({ status: 200, description: 'Campaign queued for sending' })
  @ApiResponse({ status: 400, description: 'Campaign already sent' })
  async send(@Param('id') id: string) {
    return this.campaignsService.send(id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a scheduled campaign' })
  @ApiResponse({ status: 200, description: 'Campaign cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel sent campaign' })
  async cancel(@Param('id') id: string) {
    return this.campaignsService.cancel(id);
  }
}
