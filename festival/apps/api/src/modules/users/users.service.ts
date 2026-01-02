import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntity, UserActivityEntry } from './entities';
import {
  BanUserDto,
  ChangeRoleDto,
  CreateUserDto,
  UnbanUserDto,
  UpdateUserDto,
  UserQueryDto,
  UserSearchDto,
} from './dto';

/**
 * Authenticated user interface for request context.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  firstName: string;
  lastName: string;
}

/**
 * Paginated response interface.
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Audit log action types.
 */
export enum AuditAction {
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_BANNED = 'USER_BANNED',
  USER_UNBANNED = 'USER_UNBANNED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_VIEWED = 'USER_VIEWED',
  USER_SEARCHED = 'USER_SEARCHED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
}

/**
 * Users service for managing user accounts.
 *
 * Features:
 * - CRUD operations with proper authorization
 * - Pagination, filtering, and sorting
 * - Role-based access control (RBAC)
 * - Ban/Unban functionality
 * - Activity history
 * - Audit logging
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly bcryptSaltRounds = 12;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Select fields for user queries (excludes sensitive data).
   */
  private get userSelect(): Prisma.UserSelect {
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
      updatedAt: true,
      lastLoginAt: true,
      // Exclude sensitive fields
      passwordHash: false,
      refreshToken: false,
    };
  }

  /**
   * Logs an audit action for admin operations.
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

    // Store in AuditLog table
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: performedBy.id,
          action: action,
          entityType: 'User',
          entityId: targetUserId,
          oldValue: details.previousValue as Prisma.InputJsonValue || Prisma.JsonNull,
          newValue: details.newValue as Prisma.InputJsonValue || Prisma.JsonNull,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to store audit log: ${error}`);
    }
  }

  /**
   * Validates if the requesting user can access/modify the target user.
   */
  private canAccessUser(
    requestingUser: AuthenticatedUser,
    targetUserId: string,
    requireAdmin = false,
  ): boolean {
    // Admin can access everything
    if (requestingUser.role === UserRole.ADMIN) {
      return true;
    }

    // If admin is required, deny access
    if (requireAdmin) {
      return false;
    }

    // Users can access their own data
    return requestingUser.id === targetUserId;
  }

  /**
   * Create a new user (admin only).
   */
  async create(
    dto: CreateUserDto,
    currentUser: AuthenticatedUser,
  ): Promise<UserEntity> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptSaltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim() || null,
        role: dto.role || UserRole.USER,
        status: dto.skipEmailVerification
          ? UserStatus.ACTIVE
          : UserStatus.PENDING_VERIFICATION,
        emailVerified: dto.skipEmailVerification || false,
      },
      select: this.userSelect,
    });

    await this.logAudit(AuditAction.USER_CREATED, user.id, currentUser, {
      newUserEmail: normalizedEmail,
      newUserRole: dto.role || UserRole.USER,
      skipEmailVerification: dto.skipEmailVerification,
    });

    this.logger.log(
      `User ${normalizedEmail} created by admin ${currentUser.email}`,
    );

    return new UserEntity(user);
  }

  /**
   * Get paginated list of users with filters.
   * Admin only.
   */
  async findAll(
    query: UserQueryDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedResponse<UserEntity>> {
    // Build where clause for filters
    const where: Prisma.UserWhereInput = {};

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

    // Filter by festival (users who have tickets for this festival)
    if (query.festivalId) {
      where.tickets = {
        some: {
          festivalId: query.festivalId,
        },
      };
    }

    // Build orderBy clause
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
    };

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

    return {
      items: users.map((user) => new UserEntity(user)),
      total,
      page: query.page || 1,
      limit: query.limit || 10,
      totalPages: Math.ceil(total / (query.limit || 10)),
    };
  }

  /**
   * Search users by email or name (autocomplete).
   * Admin only.
   */
  async search(
    query: UserSearchDto,
    currentUser: AuthenticatedUser,
  ): Promise<UserEntity[]> {
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

    return users.map((user) => new UserEntity(user));
  }

  /**
   * Get user by ID.
   * Admin can view any user, users can only view themselves.
   */
  async findOne(id: string, currentUser: AuthenticatedUser): Promise<UserEntity> {
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

    return new UserEntity(user);
  }

  /**
   * Update user profile.
   * Admin can update any user, users can only update themselves.
   */
  async update(
    id: string,
    dto: UpdateUserDto,
    currentUser: AuthenticatedUser,
  ): Promise<UserEntity> {
    if (!this.canAccessUser(currentUser, id)) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updateData: Prisma.UserUpdateInput = {};
    const changedFields: string[] = [];

    // Handle email change
    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const normalizedEmail = dto.email.toLowerCase().trim();

      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        throw new ConflictException('Email is already in use');
      }

      updateData.email = normalizedEmail;
      updateData.emailVerified = false; // Require re-verification
      changedFields.push('email');
    }

    // Handle password change
    if (dto.password) {
      // Non-admin users must provide current password
      if (currentUser.id === id && currentUser.role !== UserRole.ADMIN) {
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
      changedFields.push('password');
    }

    // Handle other fields
    if (dto.firstName) {
      updateData.firstName = dto.firstName.trim();
      changedFields.push('firstName');
    }

    if (dto.lastName) {
      updateData.lastName = dto.lastName.trim();
      changedFields.push('lastName');
    }

    if (dto.phone !== undefined) {
      updateData.phone = dto.phone?.trim() || null;
      changedFields.push('phone');
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      return new UserEntity(user);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: this.userSelect,
    });

    await this.logAudit(
      changedFields.includes('password')
        ? AuditAction.PASSWORD_CHANGED
        : AuditAction.USER_UPDATED,
      id,
      currentUser,
      {
        changedFields,
        targetUserEmail: user.email,
      },
    );

    return new UserEntity(updatedUser);
  }

  /**
   * Soft delete (deactivate) a user.
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

    this.logger.log(`User ${user.email} deactivated by ${currentUser.email}`);

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
  ): Promise<UserEntity> {
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

    return new UserEntity(updatedUser);
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

    // Get audit logs for this user
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { entityId: id, entityType: 'User' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const activities: UserActivityEntry[] = [
      {
        id: `${user.id}-created`,
        action: 'ACCOUNT_CREATED',
        details: 'User account was created',
        performedBy: 'SYSTEM',
        performedAt: user.createdAt,
      },
    ];

    // Add audit log entries
    for (const log of auditLogs) {
      activities.push({
        id: log.id,
        action: log.action,
        details: JSON.stringify(log.newValue),
        performedBy: log.userId || 'SYSTEM',
        performedAt: log.createdAt,
        ipAddress: log.ipAddress || undefined,
        userAgent: log.userAgent || undefined,
      });
    }

    if (user.lastLoginAt) {
      activities.push({
        id: `${user.id}-last-login`,
        action: 'LAST_LOGIN',
        details: 'User logged in',
        performedBy: user.email,
        performedAt: user.lastLoginAt,
      });
    }

    // Get user's related data counts
    const [ticketCount, paymentCount] = await Promise.all([
      this.prisma.ticket.count({ where: { userId: id } }),
      this.prisma.payment.count({ where: { userId: id } }),
    ]);

    if (ticketCount > 0) {
      activities.push({
        id: `${user.id}-tickets`,
        action: 'TICKETS_SUMMARY',
        details: `User has purchased ${ticketCount} ticket(s)`,
        performedBy: 'SYSTEM',
        performedAt: new Date(),
      });
    }

    if (paymentCount > 0) {
      activities.push({
        id: `${user.id}-payments`,
        action: 'PAYMENTS_SUMMARY',
        details: `User has made ${paymentCount} payment(s)`,
        performedBy: 'SYSTEM',
        performedAt: new Date(),
      });
    }

    await this.logAudit(AuditAction.USER_VIEWED, id, currentUser, {
      action: 'view_activity',
      targetUserEmail: user.email,
    });

    // Sort by date descending
    return activities.sort(
      (a, b) => b.performedAt.getTime() - a.performedAt.getTime(),
    );
  }

  /**
   * Find user by email (for internal use).
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: this.userSelect,
    });

    return user ? new UserEntity(user) : null;
  }

  /**
   * Check if email exists (for validation).
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  }
}
