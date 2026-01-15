/**
 * UsersService Unit Tests
 *
 * Comprehensive tests for user management functionality including:
 * - CRUD operations
 * - Soft delete and hard delete (GDPR compliance)
 * - Role changes
 * - Ban/Unban functionality
 * - Search and pagination
 * - Access control validation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService, AuthenticatedUser, AuditAction } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import {
  adminUser,
  regularUser,
  bannedUser,
  organizerUser,
  VALID_PASSWORD,
} from '../../test/fixtures';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// ============================================================================
// Mock Setup
// ============================================================================

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password-mock'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('UsersService', () => {
  let usersService: UsersService;
  let _prismaService: jest.Mocked<PrismaService>;

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

  const _mockOrganizerUser: AuthenticatedUser = {
    id: organizerUser.id,
    email: organizerUser.email,
    role: UserRole.ORGANIZER,
    status: UserStatus.ACTIVE,
    firstName: organizerUser.firstName,
    lastName: organizerUser.lastName,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    ticket: {
      count: jest.fn(),
    },
    payment: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    _prismaService = module.get(PrismaService);
  });

  // ==========================================================================
  // CREATE Tests
  // ==========================================================================

  describe('create', () => {
    const validCreateDto = {
      email: 'newuser@test.com',
      password: VALID_PASSWORD,
      firstName: 'New',
      lastName: 'User',
      phone: '+33612345678',
      role: UserRole.USER,
      skipEmailVerification: false,
    };

    it('should successfully create a new user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: validCreateDto.email.toLowerCase(),
        firstName: validCreateDto.firstName,
        lastName: validCreateDto.lastName,
        phone: validCreateDto.phone,
        role: UserRole.USER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      // Act
      const result = await usersService.create(validCreateDto, mockAdminUser);

      // Assert
      expect(result.email).toBe(validCreateDto.email.toLowerCase());
      expect(result.firstName).toBe(validCreateDto.firstName);
      expect(result.role).toBe(UserRole.USER);
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(validCreateDto.password, 12);
    });

    it('should create user with ACTIVE status when skipEmailVerification is true', async () => {
      // Arrange
      const dto = { ...validCreateDto, skipEmailVerification: true };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });

      // Act
      const result = await usersService.create(dto, mockAdminUser);

      // Assert
      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user-id',
        email: validCreateDto.email.toLowerCase(),
      });

      // Act & Assert
      await expect(usersService.create(validCreateDto, mockAdminUser)).rejects.toThrow(
        ConflictException
      );
      await expect(usersService.create(validCreateDto, mockAdminUser)).rejects.toThrow(
        'Email is already in use'
      );
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const dto = { ...validCreateDto, email: 'TEST@EXAMPLE.COM' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'test@example.com',
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.USER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });

      // Act
      await usersService.create(dto, mockAdminUser);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should trim whitespace from name fields', async () => {
      // Arrange
      const dto = {
        ...validCreateDto,
        firstName: '  John  ',
        lastName: '  Doe  ',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: dto.email.toLowerCase(),
        firstName: 'John',
        lastName: 'Doe',
        phone: dto.phone,
        role: UserRole.USER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });

      // Act
      await usersService.create(dto, mockAdminUser);

      // Assert
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
          }),
        })
      );
    });

    it('should create user with specified role', async () => {
      // Arrange
      const dto = { ...validCreateDto, role: UserRole.ORGANIZER };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.ORGANIZER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });

      // Act
      const result = await usersService.create(dto, mockAdminUser);

      // Assert
      expect(result.role).toBe(UserRole.ORGANIZER);
    });
  });

  // ==========================================================================
  // FIND ALL Tests
  // ==========================================================================

  describe('findAll', () => {
    const mockUsers = [
      {
        id: 'user-1',
        email: 'user1@test.com',
        firstName: 'User',
        lastName: 'One',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'user-2',
        email: 'user2@test.com',
        firstName: 'User',
        lastName: 'Two',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return paginated list of users', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);

      // Act
      const result = await usersService.findAll({ page: 1, limit: 10 } as any, mockAdminUser);

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should exclude soft-deleted users by default', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);

      // Act
      await usersService.findAll({ page: 1, limit: 10 } as any, mockAdminUser);

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
          }),
        })
      );
    });

    it('should filter by role when provided', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      // Act
      await usersService.findAll(
        { page: 1, limit: 10, role: UserRole.ADMIN } as any,
        mockAdminUser
      );

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: UserRole.ADMIN,
          }),
        })
      );
    });

    it('should filter by status when provided', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      // Act
      await usersService.findAll(
        { page: 1, limit: 10, status: UserStatus.BANNED } as any,
        mockAdminUser
      );

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: UserStatus.BANNED,
          }),
        })
      );
    });

    it('should filter by email when provided', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      // Act
      await usersService.findAll(
        { page: 1, limit: 10, email: 'test@example.com' } as any,
        mockAdminUser
      );

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: { contains: 'test@example.com', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should search across email, firstName, lastName when search provided', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      // Act
      await usersService.findAll({ page: 1, limit: 10, search: 'jean' } as any, mockAdminUser);

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { email: { contains: 'jean', mode: 'insensitive' } },
              { firstName: { contains: 'jean', mode: 'insensitive' } },
              { lastName: { contains: 'jean', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should filter by festivalId when provided', async () => {
      // Arrange
      const festivalId = 'festival-uuid';
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      // Act
      await usersService.findAll({ page: 1, limit: 10, festivalId } as any, mockAdminUser);

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tickets: { some: { festivalId } },
          }),
        })
      );
    });

    it('should apply sorting', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      // Act
      await usersService.findAll(
        { page: 1, limit: 10, sortBy: 'email', sortOrder: 'asc' } as any,
        mockAdminUser
      );

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { email: 'asc' },
        })
      );
    });

    it('should calculate correct pagination values', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(25);

      // Act
      const result = await usersService.findAll(
        { page: 2, limit: 10, skip: 10, take: 10 } as any,
        mockAdminUser
      );

      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });

  // ==========================================================================
  // FIND ONE Tests
  // ==========================================================================

  describe('findOne', () => {
    it('should return user when admin accesses any user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        firstName: regularUser.firstName,
        lastName: regularUser.lastName,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await usersService.findOne(regularUser.id, mockAdminUser);

      // Assert
      expect(result.id).toBe(regularUser.id);
      expect(result.email).toBe(regularUser.email);
    });

    it('should return user when user accesses own profile', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        firstName: regularUser.firstName,
        lastName: regularUser.lastName,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await usersService.findOne(regularUser.id, mockRegularUser);

      // Assert
      expect(result.id).toBe(regularUser.id);
    });

    it('should throw ForbiddenException when user accesses other user profile', async () => {
      // Arrange & Act & Assert
      await expect(usersService.findOne('other-user-id', mockRegularUser)).rejects.toThrow(
        ForbiddenException
      );
      await expect(usersService.findOne('other-user-id', mockRegularUser)).rejects.toThrow(
        'You can only access your own profile'
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(usersService.findOne('non-existent-id', mockAdminUser)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException for soft-deleted user when non-admin accesses', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        firstName: regularUser.firstName,
        lastName: regularUser.lastName,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        isDeleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act & Assert
      await expect(usersService.findOne(regularUser.id, mockRegularUser)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should allow admin to view soft-deleted user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        firstName: regularUser.firstName,
        lastName: regularUser.lastName,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        isDeleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await usersService.findOne(regularUser.id, mockAdminUser);

      // Assert
      expect(result.id).toBe(regularUser.id);
    });

    it('should log audit when admin views other user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        firstName: regularUser.firstName,
        lastName: regularUser.lastName,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await usersService.findOne(regularUser.id, mockAdminUser);

      // Assert
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: AuditAction.USER_VIEWED,
            entityId: regularUser.id,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // FIND BY EMAIL Tests
  // ==========================================================================

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        firstName: regularUser.firstName,
        lastName: regularUser.lastName,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await usersService.findByEmail(regularUser.email);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.email).toBe(regularUser.email);
    });

    it('should return null when user not found', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // Act
      const result = await usersService.findByEmail('nonexistent@test.com');

      // Assert
      expect(result).toBeNull();
    });

    it('should exclude soft-deleted users by default', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // Act
      await usersService.findByEmail(regularUser.email);

      // Assert
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
          }),
        })
      );
    });

    it('should include soft-deleted users when specified', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        isDeleted: true,
      });

      // Act
      await usersService.findByEmail(regularUser.email, true);

      // Assert
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            email: regularUser.email.toLowerCase(),
          },
        })
      );
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // Act
      await usersService.findByEmail('TEST@EXAMPLE.COM');

      // Assert
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: 'test@example.com',
          }),
        })
      );
    });
  });

  // ==========================================================================
  // UPDATE Tests
  // ==========================================================================

  describe('update', () => {
    it('should successfully update user profile', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        firstName: regularUser.firstName,
        lastName: regularUser.lastName,
        passwordHash: 'old-hash',
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        firstName: 'Updated',
        lastName: 'Name',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await usersService.update(
        regularUser.id,
        { firstName: 'Updated', lastName: 'Name' },
        mockAdminUser
      );

      // Assert
      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
    });

    it('should throw ForbiddenException when user updates other user profile', async () => {
      // Act & Assert
      await expect(
        usersService.update('other-user-id', { firstName: 'Hacker' }, mockRegularUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        usersService.update('non-existent-id', { firstName: 'Test' }, mockAdminUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when changing to existing email', async () => {
      // Arrange
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          id: regularUser.id,
          email: regularUser.email,
        })
        .mockResolvedValueOnce({
          id: 'other-user-id',
          email: 'existing@test.com',
        });

      // Act & Assert
      await expect(
        usersService.update(regularUser.id, { email: 'existing@test.com' }, mockAdminUser)
      ).rejects.toThrow(ConflictException);
    });

    it('should require current password when non-admin changes password', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        passwordHash: 'current-hash',
      });

      // Act & Assert
      await expect(
        usersService.update(regularUser.id, { password: 'NewPassword123!' }, mockRegularUser)
      ).rejects.toThrow(BadRequestException);
      await expect(
        usersService.update(regularUser.id, { password: 'NewPassword123!' }, mockRegularUser)
      ).rejects.toThrow('Current password is required to change password');
    });

    it('should throw BadRequestException when current password is incorrect', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        passwordHash: 'current-hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      // Act & Assert
      await expect(
        usersService.update(
          regularUser.id,
          { password: 'NewPassword123!', currentPassword: 'WrongPassword' },
          mockRegularUser
        )
      ).rejects.toThrow(BadRequestException);
      await expect(
        usersService.update(
          regularUser.id,
          { password: 'NewPassword123!', currentPassword: 'WrongPassword' },
          mockRegularUser
        )
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should allow admin to change password without current password', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        passwordHash: 'current-hash',
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        firstName: regularUser.firstName,
        lastName: regularUser.lastName,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await usersService.update(
        regularUser.id,
        { password: 'NewPassword123!' },
        mockAdminUser
      );

      // Assert
      expect(result).toBeDefined();
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12);
    });

    it('should not update if no changes provided', async () => {
      // Arrange
      const user = {
        id: regularUser.id,
        email: regularUser.email,
        firstName: regularUser.firstName,
        lastName: regularUser.lastName,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      // Act
      const result = await usersService.update(regularUser.id, {}, mockAdminUser);

      // Assert
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should invalidate email verification when email changes', async () => {
      // Arrange
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          id: regularUser.id,
          email: regularUser.email,
        })
        .mockResolvedValueOnce(null); // New email not taken
      mockPrismaService.user.update.mockResolvedValue({
        id: regularUser.id,
        email: 'new@test.com',
        emailVerified: false,
        firstName: regularUser.firstName,
        lastName: regularUser.lastName,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await usersService.update(regularUser.id, { email: 'new@test.com' }, mockAdminUser);

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@test.com',
            emailVerified: false,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // SOFT DELETE Tests
  // ==========================================================================

  describe('softDelete', () => {
    it('should successfully soft delete a user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        role: UserRole.USER,
        isDeleted: false,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: regularUser.id,
        isDeleted: true,
        deletedAt: new Date(),
      });

      // Act
      const result = await usersService.softDelete(regularUser.id, mockAdminUser);

      // Assert
      expect(result.message).toContain('has been deleted');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isDeleted: true,
            refreshToken: null,
          }),
        })
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(usersService.softDelete('non-existent-id', mockAdminUser)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when trying to delete another admin', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'other-admin-id',
        email: 'otheradmin@test.com',
        role: UserRole.ADMIN,
        isDeleted: false,
      });

      // Act & Assert
      await expect(usersService.softDelete('other-admin-id', mockAdminUser)).rejects.toThrow(
        ForbiddenException
      );
      await expect(usersService.softDelete('other-admin-id', mockAdminUser)).rejects.toThrow(
        'Cannot delete another admin'
      );
    });

    it('should throw ForbiddenException when trying to delete self', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockAdminUser.id,
        email: mockAdminUser.email,
        role: UserRole.ADMIN,
        isDeleted: false,
      });

      // Act & Assert
      await expect(usersService.softDelete(mockAdminUser.id, mockAdminUser)).rejects.toThrow(
        ForbiddenException
      );
      await expect(usersService.softDelete(mockAdminUser.id, mockAdminUser)).rejects.toThrow(
        'Cannot delete your own account'
      );
    });

    it('should throw BadRequestException when user is already deleted', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        role: UserRole.USER,
        isDeleted: true,
      });

      // Act & Assert
      await expect(usersService.softDelete(regularUser.id, mockAdminUser)).rejects.toThrow(
        BadRequestException
      );
      await expect(usersService.softDelete(regularUser.id, mockAdminUser)).rejects.toThrow(
        'User is already deleted'
      );
    });

    it('should invalidate refresh token on soft delete', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        role: UserRole.USER,
        isDeleted: false,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: regularUser.id,
        isDeleted: true,
        refreshToken: null,
      });

      // Act
      await usersService.softDelete(regularUser.id, mockAdminUser);

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refreshToken: null,
          }),
        })
      );
    });

    it('should create audit log for soft delete', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        role: UserRole.USER,
        isDeleted: false,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: regularUser.id,
        isDeleted: true,
      });

      // Act
      await usersService.softDelete(regularUser.id, mockAdminUser);

      // Assert
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: AuditAction.USER_SOFT_DELETED,
            entityId: regularUser.id,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // HARD DELETE Tests
  // ==========================================================================

  describe('hardDelete', () => {
    it('should permanently delete a user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        role: UserRole.USER,
      });
      mockPrismaService.user.delete.mockResolvedValue({
        id: regularUser.id,
      });

      // Act
      const result = await usersService.hardDelete(regularUser.id, mockAdminUser);

      // Assert
      expect(result.message).toContain('has been permanently deleted');
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: regularUser.id },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(usersService.hardDelete('non-existent-id', mockAdminUser)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when trying to hard delete an admin', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'other-admin-id',
        email: 'otheradmin@test.com',
        role: UserRole.ADMIN,
      });

      // Act & Assert
      await expect(usersService.hardDelete('other-admin-id', mockAdminUser)).rejects.toThrow(
        ForbiddenException
      );
      await expect(usersService.hardDelete('other-admin-id', mockAdminUser)).rejects.toThrow(
        'Cannot permanently delete an admin account'
      );
    });

    it('should throw ForbiddenException when trying to hard delete self', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockAdminUser.id,
        email: mockAdminUser.email,
        role: UserRole.ADMIN,
      });

      // Act & Assert
      await expect(usersService.hardDelete(mockAdminUser.id, mockAdminUser)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should create audit log before deletion', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        role: UserRole.USER,
      });
      mockPrismaService.user.delete.mockResolvedValue({ id: regularUser.id });

      // Act
      await usersService.hardDelete(regularUser.id, mockAdminUser);

      // Assert
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: AuditAction.USER_HARD_DELETED,
            entityId: regularUser.id,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // CHANGE ROLE Tests
  // ==========================================================================

  describe('changeRole', () => {
    it('should successfully change user role', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        role: UserRole.USER,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        firstName: regularUser.firstName,
        lastName: regularUser.lastName,
        role: UserRole.ORGANIZER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await usersService.changeRole(
        regularUser.id,
        { role: UserRole.ORGANIZER, reason: 'Promoted to organizer' },
        mockAdminUser
      );

      // Assert
      expect(result.role).toBe(UserRole.ORGANIZER);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        usersService.changeRole('non-existent-id', { role: UserRole.ORGANIZER }, mockAdminUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when changing own role', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockAdminUser.id,
        email: mockAdminUser.email,
        role: UserRole.ADMIN,
      });

      // Act & Assert
      await expect(
        usersService.changeRole(mockAdminUser.id, { role: UserRole.USER }, mockAdminUser)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        usersService.changeRole(mockAdminUser.id, { role: UserRole.USER }, mockAdminUser)
      ).rejects.toThrow('Cannot change your own role');
    });

    it('should throw ForbiddenException when demoting another admin', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'other-admin-id',
        email: 'otheradmin@test.com',
        role: UserRole.ADMIN,
      });

      // Act & Assert
      await expect(
        usersService.changeRole('other-admin-id', { role: UserRole.USER }, mockAdminUser)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        usersService.changeRole('other-admin-id', { role: UserRole.USER }, mockAdminUser)
      ).rejects.toThrow('Cannot demote another admin');
    });

    it('should create audit log for role change', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        role: UserRole.USER,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        firstName: regularUser.firstName,
        lastName: regularUser.lastName,
        role: UserRole.ORGANIZER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await usersService.changeRole(
        regularUser.id,
        { role: UserRole.ORGANIZER, reason: 'Promoted' },
        mockAdminUser
      );

      // Assert
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: AuditAction.USER_ROLE_CHANGED,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // SEARCH Tests
  // ==========================================================================

  describe('search', () => {
    it('should return empty array when query is less than 2 characters', async () => {
      // Act
      const result = await usersService.search({ q: 'a' }, mockAdminUser);

      // Assert
      expect(result).toEqual([]);
      expect(mockPrismaService.user.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array when query is empty', async () => {
      // Act
      const result = await usersService.search({ q: '' }, mockAdminUser);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return matching users', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          email: 'jean@test.com',
          firstName: 'Jean',
          lastName: 'Dupont',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Act
      const result = await usersService.search({ q: 'jean' }, mockAdminUser);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('Jean');
    });

    it('should exclude soft-deleted users', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      await usersService.search({ q: 'test' }, mockAdminUser);

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
          }),
        })
      );
    });

    it('should respect limit parameter', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      await usersService.search({ q: 'test', limit: 5 }, mockAdminUser);

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });

    it('should search across email, firstName, lastName', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      await usersService.search({ q: 'test' }, mockAdminUser);

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { email: { contains: 'test', mode: 'insensitive' } },
              { firstName: { contains: 'test', mode: 'insensitive' } },
              { lastName: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });
  });

  // ==========================================================================
  // BAN Tests
  // ==========================================================================

  describe('ban', () => {
    it('should successfully ban a user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: regularUser.id,
        status: UserStatus.BANNED,
      });

      // Act
      const result = await usersService.ban(
        regularUser.id,
        { reason: 'Violation of terms' },
        mockAdminUser
      );

      // Assert
      expect(result.message).toContain('has been banned');
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        usersService.ban('non-existent-id', { reason: 'Test' }, mockAdminUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when banning an admin', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'other-admin-id',
        email: 'otheradmin@test.com',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });

      // Act & Assert
      await expect(
        usersService.ban('other-admin-id', { reason: 'Test' }, mockAdminUser)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        usersService.ban('other-admin-id', { reason: 'Test' }, mockAdminUser)
      ).rejects.toThrow('Cannot ban an admin');
    });

    it('should throw ForbiddenException when banning self', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockAdminUser.id,
        email: mockAdminUser.email,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });

      // Act & Assert
      await expect(
        usersService.ban(mockAdminUser.id, { reason: 'Test' }, mockAdminUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when user is already banned', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        role: UserRole.USER,
        status: UserStatus.BANNED,
      });

      // Act & Assert
      await expect(
        usersService.ban(regularUser.id, { reason: 'Test' }, mockAdminUser)
      ).rejects.toThrow(BadRequestException);
      await expect(
        usersService.ban(regularUser.id, { reason: 'Test' }, mockAdminUser)
      ).rejects.toThrow('User is already banned');
    });

    it('should invalidate refresh token on ban', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: regularUser.id,
        status: UserStatus.BANNED,
        refreshToken: null,
      });

      // Act
      await usersService.ban(regularUser.id, { reason: 'Violation' }, mockAdminUser);

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refreshToken: null,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // UNBAN Tests
  // ==========================================================================

  describe('unban', () => {
    it('should successfully unban a user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: bannedUser.id,
        email: bannedUser.email,
        status: UserStatus.BANNED,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: bannedUser.id,
        status: UserStatus.ACTIVE,
      });

      // Act
      const result = await usersService.unban(
        bannedUser.id,
        { reason: 'Completed ban period' },
        mockAdminUser
      );

      // Assert
      expect(result.message).toContain('has been unbanned');
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(usersService.unban('non-existent-id', {}, mockAdminUser)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when user is not banned', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        status: UserStatus.ACTIVE,
      });

      // Act & Assert
      await expect(usersService.unban(regularUser.id, {}, mockAdminUser)).rejects.toThrow(
        BadRequestException
      );
      await expect(usersService.unban(regularUser.id, {}, mockAdminUser)).rejects.toThrow(
        'User is not banned'
      );
    });

    it('should set status to ACTIVE after unbanning', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: bannedUser.id,
        email: bannedUser.email,
        status: UserStatus.BANNED,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: bannedUser.id,
        status: UserStatus.ACTIVE,
      });

      // Act
      await usersService.unban(bannedUser.id, {}, mockAdminUser);

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: UserStatus.ACTIVE,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // DEACTIVATE Tests
  // ==========================================================================

  describe('deactivate', () => {
    it('should successfully deactivate a user', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: regularUser.id,
        status: UserStatus.INACTIVE,
      });

      // Act
      const result = await usersService.deactivate(regularUser.id, mockAdminUser);

      // Assert
      expect(result.message).toContain('has been deactivated');
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(usersService.deactivate('non-existent-id', mockAdminUser)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when deactivating another admin', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'other-admin-id',
        email: 'otheradmin@test.com',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });

      // Act & Assert
      await expect(usersService.deactivate('other-admin-id', mockAdminUser)).rejects.toThrow(
        ForbiddenException
      );
      await expect(usersService.deactivate('other-admin-id', mockAdminUser)).rejects.toThrow(
        'Cannot deactivate another admin'
      );
    });

    it('should throw ForbiddenException when deactivating self', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockAdminUser.id,
        email: mockAdminUser.email,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });

      // Act & Assert
      await expect(usersService.deactivate(mockAdminUser.id, mockAdminUser)).rejects.toThrow(
        ForbiddenException
      );
      await expect(usersService.deactivate(mockAdminUser.id, mockAdminUser)).rejects.toThrow(
        'Cannot deactivate your own account'
      );
    });
  });

  // ==========================================================================
  // GET ACTIVITY Tests
  // ==========================================================================

  describe('getActivity', () => {
    it('should return user activity history', async () => {
      // Arrange
      const createdAt = new Date('2024-01-01');
      const lastLoginAt = new Date('2024-01-15');
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        createdAt,
        lastLoginAt,
        status: UserStatus.ACTIVE,
        _count: {
          tickets: 3,
          payments: 2,
          auditLogs: 1,
        },
      });
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        {
          id: 'audit-1',
          action: AuditAction.USER_UPDATED,
          newValue: { firstName: 'Updated' },
          createdAt: new Date('2024-01-10'),
          userId: mockAdminUser.id,
        },
      ]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);
      mockPrismaService.ticket.count.mockResolvedValue(3);
      mockPrismaService.payment.count.mockResolvedValue(2);

      // Act
      const result = await usersService.getActivity(regularUser.id, mockAdminUser);

      // Assert
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.some((a) => a.action === 'ACCOUNT_CREATED')).toBe(true);
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(usersService.getActivity('non-existent-id', mockAdminUser)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should include ticket and payment summaries', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        createdAt: new Date(),
        lastLoginAt: null,
        status: UserStatus.ACTIVE,
        _count: {
          tickets: 5,
          payments: 3,
          auditLogs: 0,
        },
      });
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);
      mockPrismaService.ticket.count.mockResolvedValue(5);
      mockPrismaService.payment.count.mockResolvedValue(3);

      // Act
      const result = await usersService.getActivity(regularUser.id, mockAdminUser);

      // Assert
      expect(result.items.some((a) => a.action === 'TICKETS_SUMMARY')).toBe(true);
      expect(result.items.some((a) => a.action === 'PAYMENTS_SUMMARY')).toBe(true);
    });

    it('should sort activities by date descending', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: regularUser.id,
        email: regularUser.email,
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-20'),
        status: UserStatus.ACTIVE,
        _count: {
          tickets: 0,
          payments: 0,
          auditLogs: 1,
        },
      });
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        {
          id: 'audit-1',
          action: AuditAction.USER_UPDATED,
          newValue: {},
          createdAt: new Date('2024-01-10'),
          userId: mockAdminUser.id,
        },
      ]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);
      mockPrismaService.ticket.count.mockResolvedValue(0);
      mockPrismaService.payment.count.mockResolvedValue(0);

      // Act
      const result = await usersService.getActivity(regularUser.id, mockAdminUser);

      // Assert
      // Activities should be sorted from newest to oldest
      for (let i = 0; i < result.items.length - 1; i++) {
        expect(result.items[i].performedAt.getTime()).toBeGreaterThanOrEqual(
          result.items[i + 1].performedAt.getTime()
        );
      }
    });
  });

  // ==========================================================================
  // EMAIL EXISTS Tests
  // ==========================================================================

  describe('emailExists', () => {
    it('should return true when email exists', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(1);

      // Act
      const result = await usersService.emailExists(regularUser.email);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(0);

      // Act
      const result = await usersService.emailExists('nonexistent@test.com');

      // Assert
      expect(result).toBe(false);
    });

    it('should exclude soft-deleted users by default', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(0);

      // Act
      await usersService.emailExists(regularUser.email);

      // Assert
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          email: regularUser.email.toLowerCase(),
          isDeleted: false,
        },
      });
    });

    it('should include soft-deleted users when specified', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(1);

      // Act
      await usersService.emailExists(regularUser.email, true);

      // Assert
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          email: regularUser.email.toLowerCase(),
        },
      });
    });
  });
});
