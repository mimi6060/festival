/**
 * UsersController Unit Tests
 *
 * Comprehensive tests for user management endpoints including:
 * - CRUD operations with RBAC
 * - Input validation
 * - Authorization checks
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService, AuthenticatedUser, PaginatedResponse } from './users.service';
import { UserEntity } from './entities';
import { UserRole, UserStatus } from '@prisma/client';
import {
  adminUser,
  regularUser,
  bannedUser,
  organizerUser,
  VALID_PASSWORD,
} from '../../test/fixtures';

// ============================================================================
// Mock Setup
// ============================================================================

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  // Mock authenticated users for testing
  const mockAdminUser: AuthenticatedUser = {
    id: adminUser.id,
    email: adminUser.email,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    firstName: adminUser.firstName,
    lastName: adminUser.lastName,
  };

  const mockRegularUser: AuthenticatedUser = {
    id: regularUser.id,
    email: regularUser.email,
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    firstName: regularUser.firstName,
    lastName: regularUser.lastName,
  };

  const mockOrganizerUser: AuthenticatedUser = {
    id: organizerUser.id,
    email: organizerUser.email,
    role: UserRole.ORGANIZER,
    status: UserStatus.ACTIVE,
    firstName: organizerUser.firstName,
    lastName: organizerUser.lastName,
  };

  // Mock UserEntity for responses
  const mockUserEntity = new UserEntity({
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    phone: '+33612345678',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-15'),
  });

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    changeRole: jest.fn(),
    ban: jest.fn(),
    unban: jest.fn(),
    getActivity: jest.fn(),
    search: jest.fn(),
    softDelete: jest.fn(),
    hardDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  // ==========================================================================
  // Controller Initialization
  // ==========================================================================

  describe('initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ==========================================================================
  // POST /users - Create User Tests
  // ==========================================================================

  describe('create (POST /users)', () => {
    const validCreateDto = {
      email: 'newuser@test.com',
      password: VALID_PASSWORD,
      firstName: 'New',
      lastName: 'User',
      role: UserRole.USER,
    };

    it('should create a new user when called by admin', async () => {
      // Arrange
      mockUsersService.create.mockResolvedValue(mockUserEntity);

      // Act
      const result = await controller.create(validCreateDto, mockAdminUser);

      // Assert
      expect(result).toBe(mockUserEntity);
      expect(mockUsersService.create).toHaveBeenCalledWith(
        validCreateDto,
        mockAdminUser,
      );
    });

    it('should pass the correct DTO to service', async () => {
      // Arrange
      mockUsersService.create.mockResolvedValue(mockUserEntity);

      // Act
      await controller.create(validCreateDto, mockAdminUser);

      // Assert
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validCreateDto.email,
          password: validCreateDto.password,
          firstName: validCreateDto.firstName,
          lastName: validCreateDto.lastName,
        }),
        mockAdminUser,
      );
    });

    it('should create user with specified role', async () => {
      // Arrange
      const dtoWithRole = { ...validCreateDto, role: UserRole.ORGANIZER };
      const organizerEntity = new UserEntity({
        ...mockUserEntity,
        role: UserRole.ORGANIZER,
      });
      mockUsersService.create.mockResolvedValue(organizerEntity);

      // Act
      const result = await controller.create(dtoWithRole, mockAdminUser);

      // Assert
      expect(result.role).toBe(UserRole.ORGANIZER);
    });

    it('should create user with skipEmailVerification when specified', async () => {
      // Arrange
      const dtoWithSkip = { ...validCreateDto, skipEmailVerification: true };
      mockUsersService.create.mockResolvedValue(mockUserEntity);

      // Act
      await controller.create(dtoWithSkip, mockAdminUser);

      // Assert
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          skipEmailVerification: true,
        }),
        mockAdminUser,
      );
    });
  });

  // ==========================================================================
  // GET /users - List Users Tests
  // ==========================================================================

  describe('findAll (GET /users)', () => {
    const mockPaginatedResponse: PaginatedResponse<UserEntity> = {
      items: [mockUserEntity],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    it('should return paginated list of users', async () => {
      // Arrange
      mockUsersService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(
        { page: 1, limit: 10 } as any,
        mockAdminUser,
      );

      // Assert
      expect(result).toBe(mockPaginatedResponse);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should pass query parameters to service', async () => {
      // Arrange
      const query = {
        page: 2,
        limit: 20,
        role: UserRole.ORGANIZER,
        status: UserStatus.ACTIVE,
        search: 'test',
      };
      mockUsersService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(query as any, mockAdminUser);

      // Assert
      expect(mockUsersService.findAll).toHaveBeenCalledWith(
        query,
        mockAdminUser,
      );
    });

    it('should support filtering by email', async () => {
      // Arrange
      const query = { page: 1, limit: 10, email: 'test@example.com' };
      mockUsersService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(query as any, mockAdminUser);

      // Assert
      expect(mockUsersService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
        mockAdminUser,
      );
    });

    it('should support filtering by festivalId', async () => {
      // Arrange
      const festivalId = 'festival-uuid';
      const query = { page: 1, limit: 10, festivalId };
      mockUsersService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(query as any, mockAdminUser);

      // Assert
      expect(mockUsersService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ festivalId }),
        mockAdminUser,
      );
    });

    it('should support sorting options', async () => {
      // Arrange
      const query = { page: 1, limit: 10, sortBy: 'email', sortOrder: 'asc' };
      mockUsersService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(query as any, mockAdminUser);

      // Assert
      expect(mockUsersService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'email', sortOrder: 'asc' }),
        mockAdminUser,
      );
    });
  });

  // ==========================================================================
  // GET /users/search - Search Users Tests
  // ==========================================================================

  describe('search (GET /users/search)', () => {
    it('should return matching users', async () => {
      // Arrange
      mockUsersService.search.mockResolvedValue([mockUserEntity]);

      // Act
      const result = await controller.search({ q: 'test' }, mockAdminUser);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockUserEntity);
    });

    it('should pass search query to service', async () => {
      // Arrange
      mockUsersService.search.mockResolvedValue([]);

      // Act
      await controller.search({ q: 'jean dupont' }, mockAdminUser);

      // Assert
      expect(mockUsersService.search).toHaveBeenCalledWith(
        { q: 'jean dupont' },
        mockAdminUser,
      );
    });

    it('should respect limit parameter', async () => {
      // Arrange
      mockUsersService.search.mockResolvedValue([]);

      // Act
      await controller.search({ q: 'test', limit: 5 }, mockAdminUser);

      // Assert
      expect(mockUsersService.search).toHaveBeenCalledWith(
        { q: 'test', limit: 5 },
        mockAdminUser,
      );
    });

    it('should return empty array when no matches', async () => {
      // Arrange
      mockUsersService.search.mockResolvedValue([]);

      // Act
      const result = await controller.search(
        { q: 'nonexistent' },
        mockAdminUser,
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET /users/:id - Get User Tests
  // ==========================================================================

  describe('findOne (GET /users/:id)', () => {
    it('should return user details for admin', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUserEntity);

      // Act
      const result = await controller.findOne(
        'test-user-id',
        mockAdminUser,
      );

      // Assert
      expect(result).toBe(mockUserEntity);
    });

    it('should allow user to view own profile', async () => {
      // Arrange
      const ownUserEntity = new UserEntity({
        ...mockUserEntity,
        id: regularUser.id,
        email: regularUser.email,
      });
      mockUsersService.findOne.mockResolvedValue(ownUserEntity);

      // Act
      const result = await controller.findOne(
        regularUser.id,
        mockRegularUser,
      );

      // Assert
      expect(result).toBe(ownUserEntity);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(
        regularUser.id,
        mockRegularUser,
      );
    });

    it('should pass user ID to service', async () => {
      // Arrange
      const userId = 'specific-user-id';
      mockUsersService.findOne.mockResolvedValue(mockUserEntity);

      // Act
      await controller.findOne(userId, mockAdminUser);

      // Assert
      expect(mockUsersService.findOne).toHaveBeenCalledWith(
        userId,
        mockAdminUser,
      );
    });
  });

  // ==========================================================================
  // PATCH /users/:id - Update User Tests
  // ==========================================================================

  describe('update (PATCH /users/:id)', () => {
    const updateDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user profile for admin', async () => {
      // Arrange
      const updatedEntity = new UserEntity({
        ...mockUserEntity,
        firstName: 'Updated',
        lastName: 'Name',
      });
      mockUsersService.update.mockResolvedValue(updatedEntity);

      // Act
      const result = await controller.update(
        'test-user-id',
        updateDto,
        mockAdminUser,
      );

      // Assert
      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
    });

    it('should allow user to update own profile', async () => {
      // Arrange
      mockUsersService.update.mockResolvedValue(mockUserEntity);

      // Act
      await controller.update(regularUser.id, updateDto, mockRegularUser);

      // Assert
      expect(mockUsersService.update).toHaveBeenCalledWith(
        regularUser.id,
        updateDto,
        mockRegularUser,
      );
    });

    it('should pass update DTO to service', async () => {
      // Arrange
      const fullUpdateDto = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'new@email.com',
        phone: '+33698765432',
      };
      mockUsersService.update.mockResolvedValue(mockUserEntity);

      // Act
      await controller.update('test-user-id', fullUpdateDto, mockAdminUser);

      // Assert
      expect(mockUsersService.update).toHaveBeenCalledWith(
        'test-user-id',
        fullUpdateDto,
        mockAdminUser,
      );
    });

    it('should support password update', async () => {
      // Arrange
      const passwordDto = {
        password: 'NewPassword123!',
        currentPassword: 'OldPassword123!',
      };
      mockUsersService.update.mockResolvedValue(mockUserEntity);

      // Act
      await controller.update(regularUser.id, passwordDto, mockRegularUser);

      // Assert
      expect(mockUsersService.update).toHaveBeenCalledWith(
        regularUser.id,
        expect.objectContaining({
          password: 'NewPassword123!',
          currentPassword: 'OldPassword123!',
        }),
        mockRegularUser,
      );
    });
  });

  // ==========================================================================
  // DELETE /users/:id - Deactivate User Tests
  // ==========================================================================

  describe('deactivate (DELETE /users/:id)', () => {
    it('should deactivate a user', async () => {
      // Arrange
      mockUsersService.deactivate.mockResolvedValue({
        message: 'User test@example.com has been deactivated',
      });

      // Act
      const result = await controller.deactivate(
        'test-user-id',
        mockAdminUser,
      );

      // Assert
      expect(result.message).toContain('has been deactivated');
    });

    it('should pass user ID and current user to service', async () => {
      // Arrange
      mockUsersService.deactivate.mockResolvedValue({ message: 'Success' });

      // Act
      await controller.deactivate('test-user-id', mockAdminUser);

      // Assert
      expect(mockUsersService.deactivate).toHaveBeenCalledWith(
        'test-user-id',
        mockAdminUser,
      );
    });
  });

  // ==========================================================================
  // PATCH /users/:id/role - Change Role Tests
  // ==========================================================================

  describe('changeRole (PATCH /users/:id/role)', () => {
    it('should change user role', async () => {
      // Arrange
      const updatedEntity = new UserEntity({
        ...mockUserEntity,
        role: UserRole.ORGANIZER,
      });
      mockUsersService.changeRole.mockResolvedValue(updatedEntity);

      // Act
      const result = await controller.changeRole(
        'test-user-id',
        { role: UserRole.ORGANIZER },
        mockAdminUser,
      );

      // Assert
      expect(result.role).toBe(UserRole.ORGANIZER);
    });

    it('should pass role change DTO to service', async () => {
      // Arrange
      const roleDto = { role: UserRole.STAFF, reason: 'Promoted to staff' };
      mockUsersService.changeRole.mockResolvedValue(mockUserEntity);

      // Act
      await controller.changeRole('test-user-id', roleDto, mockAdminUser);

      // Assert
      expect(mockUsersService.changeRole).toHaveBeenCalledWith(
        'test-user-id',
        roleDto,
        mockAdminUser,
      );
    });

    it('should support all user roles', async () => {
      // Arrange
      const roles = [
        UserRole.USER,
        UserRole.ORGANIZER,
        UserRole.STAFF,
        UserRole.CASHIER,
        UserRole.SECURITY,
        UserRole.ADMIN,
      ];

      for (const role of roles) {
        mockUsersService.changeRole.mockResolvedValue(
          new UserEntity({ ...mockUserEntity, role }),
        );

        // Act
        const result = await controller.changeRole(
          'test-user-id',
          { role },
          mockAdminUser,
        );

        // Assert
        expect(result.role).toBe(role);
      }
    });
  });

  // ==========================================================================
  // POST /users/:id/ban - Ban User Tests
  // ==========================================================================

  describe('ban (POST /users/:id/ban)', () => {
    it('should ban a user', async () => {
      // Arrange
      mockUsersService.ban.mockResolvedValue({
        message: 'User test@example.com has been banned',
      });

      // Act
      const result = await controller.ban(
        'test-user-id',
        { reason: 'Violation of terms' },
        mockAdminUser,
      );

      // Assert
      expect(result.message).toContain('has been banned');
    });

    it('should pass ban DTO with reason to service', async () => {
      // Arrange
      const banDto = { reason: 'Fraudulent activity' };
      mockUsersService.ban.mockResolvedValue({ message: 'Success' });

      // Act
      await controller.ban('test-user-id', banDto, mockAdminUser);

      // Assert
      expect(mockUsersService.ban).toHaveBeenCalledWith(
        'test-user-id',
        banDto,
        mockAdminUser,
      );
    });
  });

  // ==========================================================================
  // POST /users/:id/unban - Unban User Tests
  // ==========================================================================

  describe('unban (POST /users/:id/unban)', () => {
    it('should unban a user', async () => {
      // Arrange
      mockUsersService.unban.mockResolvedValue({
        message: 'User test@example.com has been unbanned',
      });

      // Act
      const result = await controller.unban(
        bannedUser.id,
        { reason: 'Ban period completed' },
        mockAdminUser,
      );

      // Assert
      expect(result.message).toContain('has been unbanned');
    });

    it('should pass unban DTO to service', async () => {
      // Arrange
      const unbanDto = { reason: 'Appeal approved' };
      mockUsersService.unban.mockResolvedValue({ message: 'Success' });

      // Act
      await controller.unban(bannedUser.id, unbanDto, mockAdminUser);

      // Assert
      expect(mockUsersService.unban).toHaveBeenCalledWith(
        bannedUser.id,
        unbanDto,
        mockAdminUser,
      );
    });

    it('should allow unban without reason', async () => {
      // Arrange
      mockUsersService.unban.mockResolvedValue({ message: 'Success' });

      // Act
      await controller.unban(bannedUser.id, {}, mockAdminUser);

      // Assert
      expect(mockUsersService.unban).toHaveBeenCalledWith(
        bannedUser.id,
        {},
        mockAdminUser,
      );
    });
  });

  // ==========================================================================
  // GET /users/:id/activity - Get Activity Tests
  // ==========================================================================

  describe('getActivity (GET /users/:id/activity)', () => {
    const mockActivities = [
      {
        id: 'activity-1',
        action: 'ACCOUNT_CREATED',
        details: 'User account was created',
        performedBy: 'SYSTEM',
        performedAt: new Date('2024-01-01'),
      },
      {
        id: 'activity-2',
        action: 'USER_UPDATED',
        details: 'Profile updated',
        performedBy: adminUser.email,
        performedAt: new Date('2024-01-15'),
      },
    ];

    it('should return user activity history', async () => {
      // Arrange
      mockUsersService.getActivity.mockResolvedValue(mockActivities);

      // Act
      const result = await controller.getActivity(
        'test-user-id',
        mockAdminUser,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('ACCOUNT_CREATED');
    });

    it('should pass user ID to service', async () => {
      // Arrange
      mockUsersService.getActivity.mockResolvedValue([]);

      // Act
      await controller.getActivity('specific-user-id', mockAdminUser);

      // Assert
      expect(mockUsersService.getActivity).toHaveBeenCalledWith(
        'specific-user-id',
        mockAdminUser,
      );
    });

    it('should return empty array when no activities', async () => {
      // Arrange
      mockUsersService.getActivity.mockResolvedValue([]);

      // Act
      const result = await controller.getActivity(
        'test-user-id',
        mockAdminUser,
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // RBAC (Role-Based Access Control) Tests
  // ==========================================================================

  describe('RBAC - Role-Based Access Control', () => {
    describe('Admin-only endpoints', () => {
      it('create should be called with admin user', async () => {
        // Arrange
        mockUsersService.create.mockResolvedValue(mockUserEntity);

        // Act
        await controller.create(
          { email: 'new@test.com', password: VALID_PASSWORD, firstName: 'New', lastName: 'User' },
          mockAdminUser,
        );

        // Assert
        expect(mockUsersService.create).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ role: UserRole.ADMIN }),
        );
      });

      it('findAll should be called with admin user', async () => {
        // Arrange
        mockUsersService.findAll.mockResolvedValue({
          items: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        });

        // Act
        await controller.findAll({ page: 1, limit: 10 } as any, mockAdminUser);

        // Assert
        expect(mockUsersService.findAll).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ role: UserRole.ADMIN }),
        );
      });

      it('search should be called with admin user', async () => {
        // Arrange
        mockUsersService.search.mockResolvedValue([]);

        // Act
        await controller.search({ q: 'test' }, mockAdminUser);

        // Assert
        expect(mockUsersService.search).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ role: UserRole.ADMIN }),
        );
      });

      it('deactivate should be called with admin user', async () => {
        // Arrange
        mockUsersService.deactivate.mockResolvedValue({ message: 'Success' });

        // Act
        await controller.deactivate('user-id', mockAdminUser);

        // Assert
        expect(mockUsersService.deactivate).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ role: UserRole.ADMIN }),
        );
      });

      it('changeRole should be called with admin user', async () => {
        // Arrange
        mockUsersService.changeRole.mockResolvedValue(mockUserEntity);

        // Act
        await controller.changeRole(
          'user-id',
          { role: UserRole.ORGANIZER },
          mockAdminUser,
        );

        // Assert
        expect(mockUsersService.changeRole).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ role: UserRole.ADMIN }),
        );
      });

      it('ban should be called with admin user', async () => {
        // Arrange
        mockUsersService.ban.mockResolvedValue({ message: 'Success' });

        // Act
        await controller.ban(
          'user-id',
          { reason: 'Violation' },
          mockAdminUser,
        );

        // Assert
        expect(mockUsersService.ban).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ role: UserRole.ADMIN }),
        );
      });

      it('unban should be called with admin user', async () => {
        // Arrange
        mockUsersService.unban.mockResolvedValue({ message: 'Success' });

        // Act
        await controller.unban('user-id', {}, mockAdminUser);

        // Assert
        expect(mockUsersService.unban).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ role: UserRole.ADMIN }),
        );
      });

      it('getActivity should be called with admin user', async () => {
        // Arrange
        mockUsersService.getActivity.mockResolvedValue([]);

        // Act
        await controller.getActivity('user-id', mockAdminUser);

        // Assert
        expect(mockUsersService.getActivity).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ role: UserRole.ADMIN }),
        );
      });
    });

    describe('Self-access endpoints', () => {
      it('findOne allows self-access', async () => {
        // Arrange
        mockUsersService.findOne.mockResolvedValue(mockUserEntity);

        // Act
        await controller.findOne(regularUser.id, mockRegularUser);

        // Assert
        expect(mockUsersService.findOne).toHaveBeenCalledWith(
          regularUser.id,
          mockRegularUser,
        );
      });

      it('update allows self-access', async () => {
        // Arrange
        mockUsersService.update.mockResolvedValue(mockUserEntity);

        // Act
        await controller.update(
          regularUser.id,
          { firstName: 'Updated' },
          mockRegularUser,
        );

        // Assert
        expect(mockUsersService.update).toHaveBeenCalledWith(
          regularUser.id,
          expect.anything(),
          mockRegularUser,
        );
      });
    });

    describe('Non-admin role tests', () => {
      it('organizer role is passed correctly', async () => {
        // Arrange
        mockUsersService.findOne.mockResolvedValue(mockUserEntity);

        // Act
        await controller.findOne(organizerUser.id, mockOrganizerUser);

        // Assert
        expect(mockUsersService.findOne).toHaveBeenCalledWith(
          organizerUser.id,
          expect.objectContaining({ role: UserRole.ORGANIZER }),
        );
      });

      it('regular user role is passed correctly', async () => {
        // Arrange
        mockUsersService.findOne.mockResolvedValue(mockUserEntity);

        // Act
        await controller.findOne(regularUser.id, mockRegularUser);

        // Assert
        expect(mockUsersService.findOne).toHaveBeenCalledWith(
          regularUser.id,
          expect.objectContaining({ role: UserRole.USER }),
        );
      });
    });
  });

  // ==========================================================================
  // Input Validation Tests
  // ==========================================================================

  describe('Input Validation', () => {
    it('should pass UUID parameter to service', async () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockUsersService.findOne.mockResolvedValue(mockUserEntity);

      // Act
      await controller.findOne(validUuid, mockAdminUser);

      // Assert
      expect(mockUsersService.findOne).toHaveBeenCalledWith(
        validUuid,
        mockAdminUser,
      );
    });

    it('should pass all create DTO fields to service', async () => {
      // Arrange
      const fullDto = {
        email: 'full@test.com',
        password: VALID_PASSWORD,
        firstName: 'Full',
        lastName: 'Test',
        phone: '+33612345678',
        role: UserRole.STAFF,
        skipEmailVerification: true,
      };
      mockUsersService.create.mockResolvedValue(mockUserEntity);

      // Act
      await controller.create(fullDto, mockAdminUser);

      // Assert
      expect(mockUsersService.create).toHaveBeenCalledWith(
        fullDto,
        mockAdminUser,
      );
    });

    it('should pass all update DTO fields to service', async () => {
      // Arrange
      const fullUpdateDto = {
        email: 'updated@test.com',
        firstName: 'Updated',
        lastName: 'User',
        phone: '+33698765432',
        password: 'NewPassword123!',
        currentPassword: 'OldPassword123!',
      };
      mockUsersService.update.mockResolvedValue(mockUserEntity);

      // Act
      await controller.update('user-id', fullUpdateDto, mockAdminUser);

      // Assert
      expect(mockUsersService.update).toHaveBeenCalledWith(
        'user-id',
        fullUpdateDto,
        mockAdminUser,
      );
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should propagate NotFoundException from service', async () => {
      // Arrange
      const error = new Error('User not found');
      mockUsersService.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.findOne('non-existent-id', mockAdminUser),
      ).rejects.toThrow('User not found');
    });

    it('should propagate ConflictException from service', async () => {
      // Arrange
      const error = new Error('Email already in use');
      mockUsersService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.create(
          { email: 'existing@test.com', password: VALID_PASSWORD, firstName: 'Test', lastName: 'User' },
          mockAdminUser,
        ),
      ).rejects.toThrow('Email already in use');
    });

    it('should propagate ForbiddenException from service', async () => {
      // Arrange
      const error = new Error('You can only access your own profile');
      mockUsersService.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.findOne('other-user-id', mockRegularUser),
      ).rejects.toThrow('You can only access your own profile');
    });

    it('should propagate BadRequestException from service', async () => {
      // Arrange
      const error = new Error('User is already banned');
      mockUsersService.ban.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.ban(
          bannedUser.id,
          { reason: 'Test' },
          mockAdminUser,
        ),
      ).rejects.toThrow('User is already banned');
    });
  });

  // ==========================================================================
  // Return Type Tests
  // ==========================================================================

  describe('Return Types', () => {
    it('create should return UserEntity', async () => {
      // Arrange
      mockUsersService.create.mockResolvedValue(mockUserEntity);

      // Act
      const result = await controller.create(
        { email: 'test@test.com', password: VALID_PASSWORD, firstName: 'Test', lastName: 'User' },
        mockAdminUser,
      );

      // Assert
      expect(result).toBeInstanceOf(UserEntity);
    });

    it('findAll should return PaginatedResponse', async () => {
      // Arrange
      const paginatedResponse: PaginatedResponse<UserEntity> = {
        items: [mockUserEntity],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockUsersService.findAll.mockResolvedValue(paginatedResponse);

      // Act
      const result = await controller.findAll(
        { page: 1, limit: 10 } as any,
        mockAdminUser,
      );

      // Assert
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
    });

    it('search should return UserEntity array', async () => {
      // Arrange
      mockUsersService.search.mockResolvedValue([mockUserEntity]);

      // Act
      const result = await controller.search({ q: 'test' }, mockAdminUser);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toBeInstanceOf(UserEntity);
    });

    it('findOne should return UserEntity', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUserEntity);

      // Act
      const result = await controller.findOne('user-id', mockAdminUser);

      // Assert
      expect(result).toBeInstanceOf(UserEntity);
    });

    it('update should return UserEntity', async () => {
      // Arrange
      mockUsersService.update.mockResolvedValue(mockUserEntity);

      // Act
      const result = await controller.update(
        'user-id',
        { firstName: 'Updated' },
        mockAdminUser,
      );

      // Assert
      expect(result).toBeInstanceOf(UserEntity);
    });

    it('deactivate should return message object', async () => {
      // Arrange
      mockUsersService.deactivate.mockResolvedValue({ message: 'Success' });

      // Act
      const result = await controller.deactivate('user-id', mockAdminUser);

      // Assert
      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
    });

    it('changeRole should return UserEntity', async () => {
      // Arrange
      mockUsersService.changeRole.mockResolvedValue(mockUserEntity);

      // Act
      const result = await controller.changeRole(
        'user-id',
        { role: UserRole.ORGANIZER },
        mockAdminUser,
      );

      // Assert
      expect(result).toBeInstanceOf(UserEntity);
    });

    it('ban should return message object', async () => {
      // Arrange
      mockUsersService.ban.mockResolvedValue({ message: 'Banned' });

      // Act
      const result = await controller.ban(
        'user-id',
        { reason: 'Violation' },
        mockAdminUser,
      );

      // Assert
      expect(result).toHaveProperty('message');
    });

    it('unban should return message object', async () => {
      // Arrange
      mockUsersService.unban.mockResolvedValue({ message: 'Unbanned' });

      // Act
      const result = await controller.unban('user-id', {}, mockAdminUser);

      // Assert
      expect(result).toHaveProperty('message');
    });

    it('getActivity should return activity array', async () => {
      // Arrange
      mockUsersService.getActivity.mockResolvedValue([]);

      // Act
      const result = await controller.getActivity('user-id', mockAdminUser);

      // Assert
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
