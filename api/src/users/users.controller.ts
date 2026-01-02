import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import {
  BanUserDto,
  ChangeRoleDto,
  UnbanUserDto,
  UpdateUserDto,
  UserQueryDto,
  UserSearchDto,
} from './dto';
import {
  UserActivityEntry,
  UserResponse,
  UsersService,
} from './users.service';

/**
 * Users controller handling all user management endpoints.
 * Base path: /users
 *
 * Access control:
 * - Most endpoints are ADMIN only
 * - GET /users/:id and PATCH /users/:id allow self-access
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users
   * Get paginated list of users with filters.
   * Admin only.
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'List all users (Admin)',
    description:
      'Returns a paginated list of users with optional filters for role, status, and search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async findAll(
    @Query() query: UserQueryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<UserResponse>> {
    return this.usersService.findAll(query, currentUser);
  }

  /**
   * GET /users/search
   * Search users by email or name.
   * Admin only - useful for autocomplete.
   */
  @Get('search')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Search users (Admin)',
    description:
      'Search users by email or name. Returns up to 10 results. Useful for autocomplete.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of matching users',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async search(
    @Query() query: UserSearchDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponse[]> {
    return this.usersService.search(query, currentUser);
  }

  /**
   * GET /users/:id
   * Get user details.
   * Admin can view any user, users can only view themselves.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get user details',
    description:
      'Returns user details. Admins can view any user, regular users can only view their own profile.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'User details',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot access this user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponse> {
    return this.usersService.findOne(id, currentUser);
  }

  /**
   * PATCH /users/:id
   * Update user profile.
   * Admin can update any user, users can only update themselves.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Updates user profile. Admins can update any user, regular users can only update their own profile.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated user details',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot update this user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponse> {
    return this.usersService.update(id, dto, currentUser);
  }

  /**
   * DELETE /users/:id
   * Deactivate a user (soft delete).
   * Admin only.
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate user (Admin)',
    description:
      'Deactivates a user account (soft delete). The user will not be able to log in.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'User deactivated successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot deactivate this user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.usersService.deactivate(id, currentUser);
  }

  /**
   * PATCH /users/:id/role
   * Change user role.
   * Admin only.
   */
  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Change user role (Admin)',
    description:
      'Changes the role of a user. Cannot change own role or demote another admin.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated user with new role',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot change this role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponse> {
    return this.usersService.changeRole(id, dto, currentUser);
  }

  /**
   * POST /users/:id/ban
   * Ban a user.
   * Admin only.
   */
  @Post(':id/ban')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ban user (Admin)',
    description:
      'Bans a user account. The user will not be able to log in. Cannot ban admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'User banned successfully',
  })
  @ApiResponse({ status: 400, description: 'User is already banned' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot ban this user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async ban(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BanUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.usersService.ban(id, dto, currentUser);
  }

  /**
   * POST /users/:id/unban
   * Unban a user.
   * Admin only.
   */
  @Post(':id/unban')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unban user (Admin)',
    description: 'Removes the ban from a user account, restoring their access.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'User unbanned successfully',
  })
  @ApiResponse({ status: 400, description: 'User is not banned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unban(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UnbanUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.usersService.unban(id, dto, currentUser);
  }

  /**
   * GET /users/:id/activity
   * Get user activity history.
   * Admin only.
   */
  @Get(':id/activity')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get user activity (Admin)',
    description:
      'Returns the activity history for a user, including logins, purchases, and admin actions.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'User activity history',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserActivityEntry[]> {
    return this.usersService.getActivity(id, currentUser);
  }
}
