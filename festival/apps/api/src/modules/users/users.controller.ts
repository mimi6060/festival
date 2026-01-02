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
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { UserEntity, UserActivityEntry } from './entities';
import { UsersService } from './users.service';
import type { AuthenticatedUser, PaginatedResponse } from './users.service';
import {
  BanUserDto,
  ChangeRoleDto,
  CreateUserDto,
  UnbanUserDto,
  UpdateUserDto,
  UserQueryDto,
  UserSearchDto,
  UserSortBy,
  SortOrder,
} from './dto';

// Import decorators - adjust paths as needed for your project structure
// These should come from a common/shared module
const Roles = (...roles: UserRole[]) => {
  return (_target: object, _key?: string | symbol, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata('roles', roles, descriptor?.value || _target);
    return descriptor || _target;
  };
};

const CurrentUser = () => {
  return (_target: object, _key: string | symbol, _parameterIndex: number) => {
    // Parameter decorator - handled by the framework
  };
};

/**
 * Users controller handling all user management endpoints.
 * Base path: /users
 *
 * Access control:
 * - Most endpoints are ADMIN only
 * - GET /users/:id and PATCH /users/:id allow self-access
 * - All actions are logged for audit
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /users
   * Create a new user.
   * Admin only.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create a new user (Admin)',
    description:
      'Creates a new user account. Regular users should use the /auth/register endpoint. Admin can specify role and skip email verification.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserEntity> {
    return this.usersService.create(dto, currentUser);
  }

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
      'Returns a paginated list of users with optional filters for role, status, festival, and search.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'festivalId', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: UserSortBy })
  @ApiQuery({ name: 'sortOrder', required: false, enum: SortOrder })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async findAll(
    @Query() query: UserQueryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PaginatedResponse<UserEntity>> {
    return this.usersService.findAll(query, currentUser);
  }

  /**
   * GET /users/search
   * Search users by email or name.
   * Admin only - useful for autocomplete.
   */
  @Get('search')
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Search users (Admin)',
    description:
      'Search users by email or name. Returns up to 10 results. Useful for autocomplete/lookup.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query (min 2 characters)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max results (1-50)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of matching users',
    type: [UserEntity],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async search(
    @Query() query: UserSearchDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserEntity[]> {
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
    type: UserEntity,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot access this user',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserEntity> {
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
      'Updates user profile. Admins can update any user, regular users can only update their own profile. Password change requires current password for non-admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Updated user details',
    type: UserEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot update this user',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserEntity> {
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
      'Deactivates a user account (soft delete). The user will not be able to log in. Cannot deactivate admins or yourself.',
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
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User jean@example.com has been deactivated' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot deactivate this user',
  })
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
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute (sensitive)
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
  @ApiBody({ type: ChangeRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Updated user with new role',
    type: UserEntity,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot change this role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserEntity> {
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
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute (sensitive)
  @ApiOperation({
    summary: 'Ban user (Admin)',
    description:
      'Bans a user account. The user will not be able to log in. Cannot ban admins or yourself. Reason is required for audit.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: BanUserDto })
  @ApiResponse({
    status: 200,
    description: 'User banned successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User jean@example.com has been banned' },
      },
    },
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
  @ApiBody({ type: UnbanUserDto })
  @ApiResponse({
    status: 200,
    description: 'User unbanned successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User jean@example.com has been unbanned' },
      },
    },
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
      'Returns the activity history for a user, including logins, purchases, role changes, and admin actions.',
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
