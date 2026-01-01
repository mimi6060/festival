import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import {
  BanUserDto,
  ChangeRoleDto,
  UnbanUserDto,
  UpdateUserDto,
  UserQueryDto,
  UserSearchDto,
} from './dto';

/**
 * User response interface (without sensitive data).
 */
export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

/**
 * User activity log entry.
 */
export interface UserActivityEntry {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  performedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit log action types.
 */
export enum AuditAction {
  USER_UPDATED = 'USER_UPDATED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_BANNED = 'USER_BANNED',
  USER_UNBANNED = 'USER_UNBANNED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_VIEWED = 'USER_VIEWED',
  USER_SEARCHED = 'USER_SEARCHED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly bcryptSaltRounds = 12;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs an audit action for admin operations.
   * In a production environment, this would write to a separate audit table.
   */
  private async logAudit(
    action: AuditAction,
    targetUserId: string,
    performedBy: AuthenticatedUser,
    details: Record<string, unknown>,
  ): Promise<void> {
    const logEntry = {
      action,
      targetUserId,
      performedById: performedBy.id,
      performedByEmail: performedBy.email,
      performedByRole: performedBy.role,
      details,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(`[AUDIT] ${JSON.stringify(logEntry)}`);

    // TODO: In production, store audit logs in a database table
    // await this.prisma.auditLog.create({ data: logEntry });
  }

  /**
   * Select fields for user queries (excludes sensitive data).
   */
  private get userSelect() {
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
      lastLoginAt: true,
    };
  }

  /**
   * Validates if the requesting user can access/modify the target user.
   * Returns true if:
   * - The requesting user is an ADMIN
   * - The requesting user is accessing their own data (for self-access endpoints)
   */
  private canAccessUser(
    requestingUser: AuthenticatedUser,
    targetUserId: string,
    requireAdmin: boolean = false,
  ): boolean {
    if (requestingUser.role === UserRole.ADMIN) {
      return true;
    }

    if (requireAdmin) {
      return false;
    }

    return requestingUser.id === targetUserId;
  }

  /**
   * Get paginated list of users with filters.
   * Admin only.
   */
  async findAll(
    query: UserQueryDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<UserResponse>> {
    // Build where clause for filters
    const where: Record<string, unknown> = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.email) {
      where.email = {
        contains: query.email.toLowerCase(),
        mode: 'insensitive',
      };
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: Record<string, string> = {};
    orderBy[query.sortBy || 'createdAt'] = query.sortOrder || 'desc';

    // Execute queries in parallel
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: this.userSelect,
        skip: query.skip,
        take: query.take,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    await this.logAudit(AuditAction.USER_SEARCHED, 'multiple', currentUser, {
      filters: query,
      resultsCount: users.length,
    });

    return new PaginatedResponseDto(
      users,
      total,
      query.page || 1,
      query.limit || 10,
    );
  }

  /**
   * Search users by email or name.
   * Admin only - used for autocomplete/lookup.
   */
  async search(
    query: UserSearchDto,
    currentUser: AuthenticatedUser,
  ): Promise<UserResponse[]> {
    if (!query.q || query.q.trim().length < 2) {
      return [];
    }

    const searchTerm = query.q.trim();

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: this.userSelect,
      take: query.limit || 10,
      orderBy: { email: 'asc' },
    });

    await this.logAudit(AuditAction.USER_SEARCHED, 'search', currentUser, {
      searchTerm,
      resultsCount: users.length,
    });

    return users;
  }

  /**
   * Get user by ID.
   * Admin can view any user, users can only view themselves.
   */
  async findOne(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<UserResponse> {
    if (!this.canAccessUser(currentUser, id)) {
      throw new ForbiddenException('You can only access your own profile');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Log only admin views of other users
    if (currentUser.id !== id) {
      await this.logAudit(AuditAction.USER_VIEWED, id, currentUser, {
        viewedUserId: id,
        viewedUserEmail: user.email,
      });
    }

    return user;
  }

  /**
   * Update user profile.
   * Admin can update any user, users can only update themselves.
   */
  async update(
    id: string,
    dto: UpdateUserDto,
    currentUser: AuthenticatedUser,
  ): Promise<UserResponse> {
    if (!this.canAccessUser(currentUser, id)) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updateData: Record<string, unknown> = {};

    // Handle email change
    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const normalizedEmail = dto.email.toLowerCase().trim();

      // Check if email is already taken
      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        throw new ConflictException('Email is already in use');
      }

      updateData.email = normalizedEmail;
      updateData.emailVerified = false; // Require re-verification
    }

    // Handle password change
    if (dto.password) {
      // Users must provide current password to change their own password
      if (currentUser.id === id) {
        if (!dto.currentPassword) {
          throw new BadRequestException(
            'Current password is required to change password',
          );
        }

        const isCurrentPasswordValid = await bcrypt.compare(
          dto.currentPassword,
          user.passwordHash,
        );

        if (!isCurrentPasswordValid) {
          throw new BadRequestException('Current password is incorrect');
        }
      }

      updateData.passwordHash = await bcrypt.hash(
        dto.password,
        this.bcryptSaltRounds,
      );
    }

    // Handle other fields
    if (dto.firstName) {
      updateData.firstName = dto.firstName.trim();
    }

    if (dto.lastName) {
      updateData.lastName = dto.lastName.trim();
    }

    if (dto.phone !== undefined) {
      updateData.phone = dto.phone?.trim() || null;
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      return this.findOne(id, currentUser);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: this.userSelect,
    });

    // Log the update
    const changedFields = Object.keys(updateData).filter(
      (k) => k !== 'passwordHash',
    );
    if (dto.password) {
      changedFields.push('password');
    }

    await this.logAudit(
      dto.password ? AuditAction.PASSWORD_CHANGED : AuditAction.USER_UPDATED,
      id,
      currentUser,
      {
        changedFields,
        targetUserEmail: user.email,
      },
    );

    return updatedUser;
  }

  /**
   * Deactivate (soft delete) a user.
   * Admin only.
   */
  async deactivate(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Prevent deactivating another admin
    if (user.role === UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Cannot deactivate another admin');
    }

    // Prevent self-deactivation
    if (currentUser.id === id) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.INACTIVE,
        refreshToken: null, // Invalidate sessions
      },
    });

    await this.logAudit(AuditAction.USER_DEACTIVATED, id, currentUser, {
      targetUserEmail: user.email,
      previousStatus: user.status,
    });

    return { message: `User ${user.email} has been deactivated` };
  }

  /**
   * Change user role.
   * Admin only.
   */
  async changeRole(
    id: string,
    dto: ChangeRoleDto,
    currentUser: AuthenticatedUser,
  ): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Prevent changing own role
    if (currentUser.id === id) {
      throw new ForbiddenException('Cannot change your own role');
    }

    // Prevent demoting another admin
    if (user.role === UserRole.ADMIN && dto.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Cannot demote another admin');
    }

    const previousRole = user.role;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: this.userSelect,
    });

    await this.logAudit(AuditAction.USER_ROLE_CHANGED, id, currentUser, {
      targetUserEmail: user.email,
      previousRole,
      newRole: dto.role,
      reason: dto.reason,
    });

    this.logger.log(
      `Role changed for user ${user.email}: ${previousRole} -> ${dto.role} by ${currentUser.email}`,
    );

    return updatedUser;
  }

  /**
   * Ban a user.
   * Admin only.
   */
  async ban(
    id: string,
    dto: BanUserDto,
    currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Prevent banning an admin
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot ban an admin');
    }

    // Prevent self-ban
    if (currentUser.id === id) {
      throw new ForbiddenException('Cannot ban yourself');
    }

    if (user.status === UserStatus.BANNED) {
      throw new BadRequestException('User is already banned');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.BANNED,
        refreshToken: null, // Invalidate all sessions
      },
    });

    await this.logAudit(AuditAction.USER_BANNED, id, currentUser, {
      targetUserEmail: user.email,
      previousStatus: user.status,
      reason: dto.reason,
    });

    this.logger.warn(
      `User ${user.email} banned by ${currentUser.email}. Reason: ${dto.reason}`,
    );

    return { message: `User ${user.email} has been banned` };
  }

  /**
   * Unban a user.
   * Admin only.
   */
  async unban(
    id: string,
    dto: UnbanUserDto,
    currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, status: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.status !== UserStatus.BANNED) {
      throw new BadRequestException('User is not banned');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.ACTIVE,
      },
    });

    await this.logAudit(AuditAction.USER_UNBANNED, id, currentUser, {
      targetUserEmail: user.email,
      reason: dto.reason,
    });

    this.logger.log(`User ${user.email} unbanned by ${currentUser.email}`);

    return { message: `User ${user.email} has been unbanned` };
  }

  /**
   * Get user activity history.
   * Admin only.
   * Note: This is a placeholder - in production, this would query an audit log table.
   */
  async getActivity(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<UserActivityEntry[]> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        createdAt: true,
        lastLoginAt: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.logAudit(AuditAction.USER_VIEWED, id, currentUser, {
      action: 'view_activity',
      targetUserEmail: user.email,
    });

    // TODO: In production, query the audit log table
    // For now, return basic activity based on available data
    const activities: UserActivityEntry[] = [
      {
        id: `${user.id}-created`,
        action: 'ACCOUNT_CREATED',
        details: 'User account was created',
        performedBy: 'SYSTEM',
        performedAt: user.createdAt,
      },
    ];

    if (user.lastLoginAt) {
      activities.push({
        id: `${user.id}-last-login`,
        action: 'LAST_LOGIN',
        details: 'User logged in',
        performedBy: user.email,
        performedAt: user.lastLoginAt,
      });
    }

    // Get user's tickets count
    const ticketCount = await this.prisma.ticket.count({
      where: { userId: id },
    });

    if (ticketCount > 0) {
      activities.push({
        id: `${user.id}-tickets`,
        action: 'TICKETS_PURCHASED',
        details: `User has ${ticketCount} ticket(s)`,
        performedBy: user.email,
        performedAt: user.createdAt,
      });
    }

    // Get user's payments count
    const paymentCount = await this.prisma.payment.count({
      where: { userId: id },
    });

    if (paymentCount > 0) {
      activities.push({
        id: `${user.id}-payments`,
        action: 'PAYMENTS_MADE',
        details: `User has ${paymentCount} payment(s)`,
        performedBy: user.email,
        performedAt: user.createdAt,
      });
    }

    // Sort by date descending
    return activities.sort(
      (a, b) => b.performedAt.getTime() - a.performedAt.getTime(),
    );
  }
}
