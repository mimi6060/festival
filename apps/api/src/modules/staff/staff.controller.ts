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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StaffService, type AuthenticatedUser } from './staff.service';
import {
  CreateStaffMemberDto,
  UpdateStaffMemberDto,
  CreateShiftDto,
  UpdateShiftDto,
  CheckInDto,
  CheckOutDto,
} from './dto';
import { UserRole } from '@prisma/client';

@ApiTags('Staff')
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Create a new staff member assignment' })
  @ApiResponse({ status: 201, description: 'Staff member created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createStaffMember(
    @Body() dto: CreateStaffMemberDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.staffService.createStaffMember(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a staff member by ID' })
  @ApiResponse({ status: 200, description: 'Staff member details' })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  async getStaffMember(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.getStaffMember(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Update a staff member' })
  @ApiResponse({ status: 200, description: 'Staff member updated successfully' })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  async updateStaffMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffMemberDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.staffService.updateStaffMember(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a staff member assignment' })
  @ApiResponse({ status: 204, description: 'Staff member deleted successfully' })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  async deleteStaffMember(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.staffService.deleteStaffMember(id, user);
  }

  // ============== Shifts ==============

  @Post(':staffId/shifts')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Create a shift for a staff member' })
  @ApiResponse({ status: 201, description: 'Shift created successfully' })
  async createShift(
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: CreateShiftDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.staffService.createShift({ ...dto, staffMemberId: staffId }, user);
  }

  @Get(':staffId/shifts')
  @ApiOperation({ summary: 'Get shifts for a staff member' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getShifts(
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.staffService.getShifts(staffId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Put('shifts/:shiftId')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Update a shift' })
  @ApiResponse({ status: 200, description: 'Shift updated successfully' })
  async updateShift(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: UpdateShiftDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.staffService.updateShift(shiftId, dto, user);
  }

  @Delete('shifts/:shiftId')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a shift' })
  async deleteShift(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.staffService.deleteShift(shiftId, user);
  }

  // ============== Check-in/Check-out ==============

  @Post('shifts/:shiftId/checkin')
  @ApiOperation({ summary: 'Check in for a shift' })
  @ApiResponse({ status: 200, description: 'Checked in successfully' })
  @ApiResponse({ status: 400, description: 'Already checked in' })
  async checkIn(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: CheckInDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.staffService.checkIn(shiftId, dto, user.id);
  }

  @Post('shifts/:shiftId/checkout')
  @ApiOperation({ summary: 'Check out from a shift' })
  @ApiResponse({ status: 200, description: 'Checked out successfully' })
  @ApiResponse({ status: 400, description: 'Not checked in or already checked out' })
  async checkOut(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: CheckOutDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.staffService.checkOut(shiftId, dto, user.id);
  }

  // ============== Staff Dashboard ==============

  @Get('me/dashboard')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF, UserRole.CASHIER, UserRole.SECURITY)
  @ApiOperation({ summary: 'Get personal staff dashboard with KPIs' })
  @ApiResponse({ status: 200, description: 'Staff dashboard data' })
  @ApiQuery({ name: 'festivalId', required: true })
  async getMyDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query('festivalId', ParseUUIDPipe) festivalId: string
  ) {
    return this.staffService.getStaffDashboard(user.id, festivalId);
  }

  @Get('me/shift')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF, UserRole.CASHIER, UserRole.SECURITY)
  @ApiOperation({ summary: 'Get current active shift' })
  @ApiResponse({ status: 200, description: 'Current shift info or null' })
  @ApiQuery({ name: 'festivalId', required: true })
  async getMyCurrentShift(
    @CurrentUser() user: AuthenticatedUser,
    @Query('festivalId', ParseUUIDPipe) festivalId: string
  ) {
    return this.staffService.getCurrentShift(user.id, festivalId);
  }
}

// ============== Festival Staff Controller ==============

@ApiTags('Festival Staff')
@Controller('festivals/:festivalId/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FestivalStaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'Get all staff members for a festival' })
  @ApiQuery({ name: 'department', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getStaffMembers(
    @Param('festivalId', ParseUUIDPipe) festivalId: string,
    @Query('department') department?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.staffService.getStaffMembers(festivalId, {
      department,
      role,
      isActive: isActive ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Get staff statistics for a festival' })
  async getStaffStats(@Param('festivalId', ParseUUIDPipe) festivalId: string) {
    return this.staffService.getStaffStats(festivalId);
  }
}
