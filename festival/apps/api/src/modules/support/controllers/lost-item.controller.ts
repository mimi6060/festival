import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { LostItemService } from '../services/lost-item.service';
import {
  CreateLostItemDto,
  UpdateLostItemDto,
  ClaimLostItemDto,
  MarkAsFoundDto,
  LostItemQueryDto,
  LostItemResponseDto,
  LostItemStatisticsDto,
} from '../dto/lost-item.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

@ApiTags('Lost Items')
@Controller('support/lost-items')
export class LostItemController {
  constructor(private readonly lostItemService: LostItemService) {}

  // ===== Public Endpoints =====

  @Public()
  @Get('found/:festivalId')
  @ApiOperation({ summary: 'Get found items for a festival (public)' })
  @ApiParam({ name: 'festivalId', description: 'Festival ID' })
  @ApiResponse({
    status: 200,
    description: 'Found items retrieved successfully',
    type: [LostItemResponseDto],
  })
  async getFoundItems(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
  ): Promise<LostItemResponseDto[]> {
    return this.lostItemService.getFoundItems(festivalId);
  }

  // ===== Authenticated User Endpoints =====

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Report a lost item' })
  @ApiResponse({
    status: 201,
    description: 'Lost item reported successfully',
    type: LostItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Festival not found' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLostItemDto,
  ): Promise<LostItemResponseDto> {
    return this.lostItemService.create(user.id, dto);
  }

  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get lost items with filters' })
  @ApiResponse({
    status: 200,
    description: 'Lost items retrieved successfully',
  })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: LostItemQueryDto,
  ): Promise<{ items: LostItemResponseDto[]; total: number }> {
    return this.lostItemService.findAll(query, user.id);
  }

  @ApiBearerAuth()
  @Get('my-items')
  @ApiOperation({ summary: 'Get my reported lost items' })
  @ApiResponse({
    status: 200,
    description: 'Items retrieved successfully',
    type: [LostItemResponseDto],
  })
  async getMyItems(
    @CurrentUser() user: AuthUser,
  ): Promise<LostItemResponseDto[]> {
    return this.lostItemService.getMyReportedItems(user.id);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get a lost item by ID' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Item retrieved successfully',
    type: LostItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LostItemResponseDto> {
    return this.lostItemService.findById(id);
  }

  @ApiBearerAuth()
  @Put(':id')
  @ApiOperation({ summary: 'Update a lost item' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Item updated successfully',
    type: LostItemResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLostItemDto,
  ): Promise<LostItemResponseDto> {
    const isStaff = this.isStaffRole(user.role);
    return this.lostItemService.update(id, dto, user.id, isStaff);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lost item report' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({ status: 204, description: 'Item deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const isStaff = this.isStaffRole(user.role);
    return this.lostItemService.delete(id, user.id, isStaff);
  }

  @ApiBearerAuth()
  @Post(':id/claim')
  @ApiOperation({ summary: 'Claim a found item' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Claim submitted successfully',
    type: LostItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Item cannot be claimed' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async claim(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClaimLostItemDto,
  ): Promise<LostItemResponseDto> {
    return this.lostItemService.claim(id, user.id, dto);
  }

  // ===== Staff/Admin Endpoints =====

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF, UserRole.SECURITY)
  @Patch(':id/found')
  @ApiOperation({ summary: 'Mark an item as found (staff only)' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Item marked as found',
    type: LostItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Item already processed' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async markAsFound(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkAsFoundDto,
  ): Promise<LostItemResponseDto> {
    return this.lostItemService.markAsFound(id, user.id, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF, UserRole.SECURITY)
  @Patch(':id/returned')
  @ApiOperation({ summary: 'Mark an item as returned to owner (staff only)' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Item marked as returned',
    type: LostItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Item not in FOUND status' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async markAsReturned(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LostItemResponseDto> {
    return this.lostItemService.markAsReturned(id, user.id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @Patch(':id/unclaimed')
  @ApiOperation({ summary: 'Mark an item as unclaimed (staff only)' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Item marked as unclaimed',
    type: LostItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async markAsUnclaimed(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LostItemResponseDto> {
    return this.lostItemService.markAsUnclaimed(id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Get('admin/statistics')
  @ApiOperation({ summary: 'Get lost item statistics' })
  @ApiQuery({ name: 'festivalId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: LostItemStatisticsDto,
  })
  async getStatistics(
    @Query('festivalId') festivalId?: string,
  ): Promise<LostItemStatisticsDto> {
    return this.lostItemService.getStatistics(festivalId);
  }

  // ===== Helpers =====

  private isStaffRole(role: UserRole): boolean {
    return (
      [
        UserRole.ADMIN,
        UserRole.ORGANIZER,
        UserRole.STAFF,
        UserRole.SECURITY,
      ] as UserRole[]
    ).includes(role);
  }
}
