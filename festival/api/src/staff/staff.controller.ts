import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  ScheduleQueryDto,
  CheckInOutDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

/**
 * Controller for festival-scoped staff management endpoints
 */
@Controller('festivals/:festivalId/staff')
@UseGuards(JwtAuthGuard)
export class FestivalStaffController {
  constructor(private readonly staffService: StaffService) {}

  /**
   * Create a new staff assignment
   * POST /festivals/:festivalId/staff
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.CREATED)
  async createAssignment(
    @Param('festivalId') festivalId: string,
    @Body() createDto: CreateAssignmentDto,
  ) {
    const assignment = await this.staffService.createAssignment(
      festivalId,
      createDto,
    );

    return {
      success: true,
      message: 'Staff assignment created successfully',
      data: assignment,
    };
  }

  /**
   * Get all staff for a festival
   * GET /festivals/:festivalId/staff
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  async getFestivalStaff(
    @Param('festivalId') festivalId: string,
    @Query('zoneId') zoneId?: string,
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.staffService.getFestivalStaff(festivalId, {
      zoneId,
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });

    return {
      success: true,
      data: result.assignments,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Get staff schedule for a festival
   * GET /festivals/:festivalId/staff/schedule
   */
  @Get('schedule')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF, UserRole.SECURITY, UserRole.CASHIER)
  async getSchedule(
    @Param('festivalId') festivalId: string,
    @Query() queryDto: ScheduleQueryDto,
  ) {
    const schedule = await this.staffService.getSchedule(festivalId, queryDto);

    return {
      success: true,
      data: schedule,
    };
  }

  /**
   * Get staff statistics for a festival
   * GET /festivals/:festivalId/staff/stats
   */
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  async getStaffStats(@Param('festivalId') festivalId: string) {
    const stats = await this.staffService.getStaffStats(festivalId);

    return {
      success: true,
      data: stats,
    };
  }
}

/**
 * Controller for staff assignment management endpoints
 */
@Controller('staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  /**
   * Get my assignments (for staff member)
   * GET /staff/me
   */
  @Get('me')
  async getMyAssignments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('festivalId') festivalId?: string,
    @Query('upcoming') upcoming?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.staffService.getMyAssignments(user.id, {
      festivalId,
      upcoming: upcoming === 'true',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });

    return {
      success: true,
      data: result.assignments,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Get my working hours
   * GET /staff/me/hours
   */
  @Get('me/hours')
  async getMyWorkingHours(
    @CurrentUser() user: AuthenticatedUser,
    @Query('festivalId') festivalId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.staffService.getWorkingHours(user.id, {
      festivalId,
      startDate,
      endDate,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get a specific assignment
   * GET /staff/:id
   */
  @Get(':id')
  async getAssignment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const assignment = await this.staffService.getAssignmentById(id);

    // Staff can only view their own assignments unless they're admin/organizer
    const isOwner = assignment.userId === user.id;
    const isAdmin = [UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role);

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        message: 'You do not have access to this assignment',
      };
    }

    return {
      success: true,
      data: assignment,
    };
  }

  /**
   * Update an assignment
   * PATCH /staff/:id
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  async updateAssignment(
    @Param('id') id: string,
    @Body() updateDto: UpdateAssignmentDto,
  ) {
    const assignment = await this.staffService.updateAssignment(id, updateDto);

    return {
      success: true,
      message: 'Assignment updated successfully',
      data: assignment,
    };
  }

  /**
   * Delete an assignment
   * DELETE /staff/:id
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAssignment(@Param('id') id: string) {
    await this.staffService.deleteAssignment(id);

    return {
      success: true,
      message: 'Assignment deleted successfully',
    };
  }

  /**
   * Check-in for an assignment
   * POST /staff/:id/check-in
   */
  @Post(':id/check-in')
  @HttpCode(HttpStatus.OK)
  async checkIn(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() checkInDto: CheckInOutDto,
  ) {
    const result = await this.staffService.checkIn(id, user.id, checkInDto);

    return {
      success: true,
      message: 'Check-in successful',
      data: {
        assignmentId: result.id,
        checkInTime: result.checkIn,
        location: result.checkInLocation,
      },
    };
  }

  /**
   * Check-out for an assignment
   * POST /staff/:id/check-out
   */
  @Post(':id/check-out')
  @HttpCode(HttpStatus.OK)
  async checkOut(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() checkOutDto: CheckInOutDto,
  ) {
    const result = await this.staffService.checkOut(id, user.id, checkOutDto);

    return {
      success: true,
      message: 'Check-out successful',
      data: {
        assignmentId: result.id,
        checkOutTime: result.checkOut,
        location: result.checkOutLocation,
      },
    };
  }

  /**
   * Get working hours for a specific user (admin only)
   * GET /staff/users/:userId/hours
   */
  @Get('users/:userId/hours')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  async getUserWorkingHours(
    @Param('userId') userId: string,
    @Query('festivalId') festivalId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.staffService.getWorkingHours(userId, {
      festivalId,
      startDate,
      endDate,
    });

    return {
      success: true,
      data: result,
    };
  }
}
