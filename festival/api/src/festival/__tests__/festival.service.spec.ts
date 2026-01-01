import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { FestivalStatus, UserRole, UserStatus, TicketStatus, TransactionType } from '@prisma/client';
import { FestivalService } from '../festival.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFestivalDto } from '../dto/create-festival.dto';
import { UpdateFestivalDto, UpdateFestivalStatusDto } from '../dto/update-festival.dto';
import { FestivalQueryDto, FestivalSortField, SortOrder } from '../dto/festival-query.dto';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';

describe('FestivalService', () => {
  let service: FestivalService;
  let prismaService: jest.Mocked<PrismaService>;

  // Mock data
  const mockOrganizer: AuthenticatedUser = {
    id: 'organizer-123',
    email: 'organizer@example.com',
    role: UserRole.ORGANIZER,
    status: UserStatus.ACTIVE,
    firstName: 'John',
    lastName: 'Organizer',
  };

  const mockAdmin: AuthenticatedUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    firstName: 'Admin',
    lastName: 'User',
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    email: 'user@example.com',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    firstName: 'Regular',
    lastName: 'User',
  };

  const mockFestival = {
    id: 'festival-123',
    name: 'Summer Music Festival',
    slug: 'summer-music-festival',
    description: 'A great music festival',
    location: 'Paris',
    address: '123 Main Street',
    startDate: new Date('2025-07-01'),
    endDate: new Date('2025-07-03'),
    status: FestivalStatus.DRAFT,
    maxCapacity: 10000,
    currentAttendees: 0,
    logoUrl: null,
    bannerUrl: null,
    websiteUrl: null,
    contactEmail: 'contact@festival.com',
    timezone: 'Europe/Paris',
    currency: 'EUR',
    isDeleted: false,
    deletedAt: null,
    organizerId: mockOrganizer.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    organizer: {
      id: mockOrganizer.id,
      firstName: mockOrganizer.firstName,
      lastName: mockOrganizer.lastName,
      email: mockOrganizer.email,
    },
  };

  const mockCreateDto: CreateFestivalDto = {
    name: 'New Festival',
    description: 'A new festival',
    location: 'Lyon',
    address: '456 Festival Ave',
    startDate: '2025-08-01',
    endDate: '2025-08-03',
    maxCapacity: 5000,
    contactEmail: 'contact@newfest.com',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      festival: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FestivalService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FestivalService>(FestivalService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a festival with auto-generated slug', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.festival.create as jest.Mock).mockResolvedValue({
        ...mockFestival,
        name: mockCreateDto.name,
        slug: 'new-festival',
      });

      // Act
      const result = await service.create(mockCreateDto, mockOrganizer.id);

      // Assert
      expect(result.name).toBe(mockCreateDto.name);
      expect(prismaService.festival.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: mockCreateDto.name,
          organizerId: mockOrganizer.id,
          status: FestivalStatus.DRAFT,
        }),
      });
    });

    it('should create a festival with custom slug', async () => {
      // Arrange
      const dtoWithSlug = { ...mockCreateDto, slug: 'custom-slug' };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.festival.create as jest.Mock).mockResolvedValue({
        ...mockFestival,
        slug: 'custom-slug',
      });

      // Act
      const result = await service.create(dtoWithSlug, mockOrganizer.id);

      // Assert
      expect(result.slug).toBe('custom-slug');
    });

    it('should throw BadRequestException when end date is before start date', async () => {
      // Arrange
      const invalidDto = {
        ...mockCreateDto,
        startDate: '2025-08-05',
        endDate: '2025-08-01',
      };

      // Act & Assert
      await expect(service.create(invalidDto, mockOrganizer.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto, mockOrganizer.id)).rejects.toThrow(
        'End date must be after start date',
      );
    });

    it('should throw ConflictException when slug is already taken', async () => {
      // Arrange
      const dtoWithSlug = { ...mockCreateDto, slug: 'existing-slug' };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);

      // Act & Assert
      await expect(service.create(dtoWithSlug, mockOrganizer.id)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should generate unique slug with counter when name-based slug exists', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFestival) // First slug exists
        .mockResolvedValueOnce(null); // new-festival-1 is available
      (prismaService.festival.create as jest.Mock).mockResolvedValue({
        ...mockFestival,
        slug: 'new-festival-1',
      });

      // Act
      const result = await service.create(mockCreateDto, mockOrganizer.id);

      // Assert
      expect(result.slug).toBe('new-festival-1');
    });
  });

  describe('findAll', () => {
    it('should return paginated festivals with default filters', async () => {
      // Arrange
      (prismaService.festival.findMany as jest.Mock).mockResolvedValue([mockFestival]);
      (prismaService.festival.count as jest.Mock).mockResolvedValue(1);

      const query: FestivalQueryDto = {};

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should filter by search term', async () => {
      // Arrange
      (prismaService.festival.findMany as jest.Mock).mockResolvedValue([mockFestival]);
      (prismaService.festival.count as jest.Mock).mockResolvedValue(1);

      const query: FestivalQueryDto = { search: 'Summer' };

      // Act
      await service.findAll(query);

      // Assert
      expect(prismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'Summer', mode: 'insensitive' } },
              { description: { contains: 'Summer', mode: 'insensitive' } },
              { location: { contains: 'Summer', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by status for authenticated users', async () => {
      // Arrange
      (prismaService.festival.findMany as jest.Mock).mockResolvedValue([mockFestival]);
      (prismaService.festival.count as jest.Mock).mockResolvedValue(1);

      const query: FestivalQueryDto = { status: FestivalStatus.DRAFT };

      // Act
      await service.findAll(query, mockOrganizer);

      // Assert
      expect(prismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: FestivalStatus.DRAFT,
          }),
        }),
      );
    });

    it('should only show published/ongoing festivals for regular users', async () => {
      // Arrange
      (prismaService.festival.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.festival.count as jest.Mock).mockResolvedValue(0);

      const query: FestivalQueryDto = {};

      // Act
      await service.findAll(query, mockUser);

      // Assert
      expect(prismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [FestivalStatus.PUBLISHED, FestivalStatus.ONGOING] },
          }),
        }),
      );
    });

    it('should filter upcoming festivals', async () => {
      // Arrange
      (prismaService.festival.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.festival.count as jest.Mock).mockResolvedValue(0);

      const query: FestivalQueryDto = { upcoming: true };

      // Act
      await service.findAll(query);

      // Assert
      expect(prismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startDate: { gt: expect.any(Date) },
          }),
        }),
      );
    });

    it('should filter by organizer ID', async () => {
      // Arrange
      (prismaService.festival.findMany as jest.Mock).mockResolvedValue([mockFestival]);
      (prismaService.festival.count as jest.Mock).mockResolvedValue(1);

      const query: FestivalQueryDto = { organizerId: mockOrganizer.id };

      // Act
      await service.findAll(query, mockOrganizer);

      // Assert
      expect(prismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizerId: mockOrganizer.id,
          }),
        }),
      );
    });

    it('should apply pagination correctly', async () => {
      // Arrange
      (prismaService.festival.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.festival.count as jest.Mock).mockResolvedValue(100);

      const query: FestivalQueryDto = { page: 3, limit: 20 };

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(prismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3-1) * 20
          take: 20,
        }),
      );
      expect(result.meta.totalPages).toBe(5);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(true);
    });

    it('should apply sorting', async () => {
      // Arrange
      (prismaService.festival.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.festival.count as jest.Mock).mockResolvedValue(0);

      const query: FestivalQueryDto = {
        sortBy: FestivalSortField.NAME,
        sortOrder: SortOrder.DESC,
      };

      // Act
      await service.findAll(query);

      // Assert
      expect(prismaService.festival.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'DESC' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return festival by ID', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);

      // Act
      const result = await service.findOne(mockFestival.id, mockOrganizer);

      // Assert
      expect(result.id).toBe(mockFestival.id);
      expect(result.name).toBe(mockFestival.name);
    });

    it('should throw NotFoundException for non-existent festival', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent', mockOrganizer)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for deleted festival (non-admin)', async () => {
      // Arrange
      const deletedFestival = { ...mockFestival, isDeleted: true };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(deletedFestival);

      // Act & Assert
      await expect(service.findOne(mockFestival.id, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for draft festival (regular user)', async () => {
      // Arrange
      const draftFestival = { ...mockFestival, status: FestivalStatus.DRAFT };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(draftFestival);

      // Act & Assert
      await expect(service.findOne(mockFestival.id, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow admin to see draft festivals', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);

      // Act
      const result = await service.findOne(mockFestival.id, mockAdmin);

      // Assert
      expect(result.id).toBe(mockFestival.id);
    });
  });

  describe('update', () => {
    it('should update festival by owner', async () => {
      // Arrange
      const updateDto: UpdateFestivalDto = { name: 'Updated Festival Name' };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);
      (prismaService.festival.update as jest.Mock).mockResolvedValue({
        ...mockFestival,
        name: 'Updated Festival Name',
        slug: 'updated-festival-name',
      });

      // Act
      const result = await service.update(mockFestival.id, updateDto, mockOrganizer);

      // Assert
      expect(result.name).toBe('Updated Festival Name');
      expect(prismaService.festival.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-owner', async () => {
      // Arrange
      const updateDto: UpdateFestivalDto = { name: 'Updated Name' };
      const otherUser: AuthenticatedUser = {
        ...mockOrganizer,
        id: 'other-user-id',
      };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);

      // Act & Assert
      await expect(
        service.update(mockFestival.id, updateDto, otherUser),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(mockFestival.id, updateDto, otherUser),
      ).rejects.toThrow('You can only update your own festivals');
    });

    it('should allow admin to update any festival', async () => {
      // Arrange
      const updateDto: UpdateFestivalDto = { name: 'Admin Updated' };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);
      (prismaService.festival.update as jest.Mock).mockResolvedValue({
        ...mockFestival,
        name: 'Admin Updated',
      });

      // Act
      const result = await service.update(mockFestival.id, updateDto, mockAdmin);

      // Assert
      expect(result.name).toBe('Admin Updated');
    });

    it('should throw NotFoundException for non-existent festival', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('non-existent', { name: 'New Name' }, mockOrganizer),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid date range', async () => {
      // Arrange
      const updateDto: UpdateFestivalDto = {
        startDate: '2025-08-05',
        endDate: '2025-08-01',
      };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);

      // Act & Assert
      await expect(
        service.update(mockFestival.id, updateDto, mockOrganizer),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(mockFestival.id, updateDto, mockOrganizer),
      ).rejects.toThrow('End date must be after start date');
    });

    it('should auto-generate new slug when name changes', async () => {
      // Arrange
      const updateDto: UpdateFestivalDto = { name: 'Completely New Name' };
      (prismaService.festival.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFestival) // Initial lookup
        .mockResolvedValueOnce(null); // Slug check
      (prismaService.festival.update as jest.Mock).mockResolvedValue({
        ...mockFestival,
        name: 'Completely New Name',
        slug: 'completely-new-name',
      });

      // Act
      const result = await service.update(mockFestival.id, updateDto, mockOrganizer);

      // Assert
      expect(result.slug).toBe('completely-new-name');
    });
  });

  describe('remove', () => {
    it('should soft delete festival for admin', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);
      (prismaService.festival.update as jest.Mock).mockResolvedValue({
        ...mockFestival,
        isDeleted: true,
        deletedAt: new Date(),
        status: FestivalStatus.CANCELLED,
      });

      // Act
      await service.remove(mockFestival.id, mockAdmin);

      // Assert
      expect(prismaService.festival.update).toHaveBeenCalledWith({
        where: { id: mockFestival.id },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
          status: FestivalStatus.CANCELLED,
        },
      });
    });

    it('should throw ForbiddenException for non-admin', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);

      // Act & Assert
      await expect(service.remove(mockFestival.id, mockOrganizer)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove(mockFestival.id, mockOrganizer)).rejects.toThrow(
        'Only administrators can delete festivals',
      );
    });

    it('should throw NotFoundException for non-existent festival', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent', mockAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('publish', () => {
    it('should publish a draft festival', async () => {
      // Arrange
      const draftFestival = { ...mockFestival, status: FestivalStatus.DRAFT };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(draftFestival);
      (prismaService.festival.update as jest.Mock).mockResolvedValue({
        ...draftFestival,
        status: FestivalStatus.PUBLISHED,
      });

      // Act
      const result = await service.publish(mockFestival.id, mockOrganizer);

      // Assert
      expect(result.status).toBe(FestivalStatus.PUBLISHED);
      expect(prismaService.festival.update).toHaveBeenCalledWith({
        where: { id: mockFestival.id },
        data: { status: FestivalStatus.PUBLISHED },
        include: expect.any(Object),
      });
    });

    it('should throw ForbiddenException for non-owner', async () => {
      // Arrange
      const draftFestival = { ...mockFestival, status: FestivalStatus.DRAFT };
      const otherUser: AuthenticatedUser = {
        ...mockOrganizer,
        id: 'other-user-id',
      };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(draftFestival);

      // Act & Assert
      await expect(service.publish(mockFestival.id, otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException for non-draft festival', async () => {
      // Arrange
      const publishedFestival = { ...mockFestival, status: FestivalStatus.PUBLISHED };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(publishedFestival);

      // Act & Assert
      await expect(service.publish(mockFestival.id, mockOrganizer)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.publish(mockFestival.id, mockOrganizer)).rejects.toThrow(
        /Cannot publish festival.*expected DRAFT/,
      );
    });

    it('should throw BadRequestException for incomplete festival', async () => {
      // Arrange
      const incompleteFestival = {
        ...mockFestival,
        status: FestivalStatus.DRAFT,
        location: null,
      };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(incompleteFestival);

      // Act & Assert
      await expect(service.publish(mockFestival.id, mockOrganizer)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.publish(mockFestival.id, mockOrganizer)).rejects.toThrow(
        'Festival must have name, location, and dates to be published',
      );
    });

    it('should throw NotFoundException for non-existent festival', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.publish('non-existent', mockOrganizer)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status with valid transition', async () => {
      // Arrange
      const publishedFestival = { ...mockFestival, status: FestivalStatus.PUBLISHED };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(publishedFestival);
      (prismaService.festival.update as jest.Mock).mockResolvedValue({
        ...publishedFestival,
        status: FestivalStatus.ONGOING,
      });

      const updateStatusDto: UpdateFestivalStatusDto = {
        status: FestivalStatus.ONGOING,
      };

      // Act
      const result = await service.updateStatus(
        mockFestival.id,
        updateStatusDto,
        mockOrganizer,
      );

      // Assert
      expect(result.status).toBe(FestivalStatus.ONGOING);
    });

    it('should throw BadRequestException for invalid transition', async () => {
      // Arrange
      const draftFestival = { ...mockFestival, status: FestivalStatus.DRAFT };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(draftFestival);

      const updateStatusDto: UpdateFestivalStatusDto = {
        status: FestivalStatus.ONGOING, // Invalid: DRAFT cannot go directly to ONGOING
      };

      // Act & Assert
      await expect(
        service.updateStatus(mockFestival.id, updateStatusDto, mockOrganizer),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateStatus(mockFestival.id, updateStatusDto, mockOrganizer),
      ).rejects.toThrow(/Cannot transition from DRAFT to ONGOING/);
    });

    it('should throw BadRequestException when transitioning from COMPLETED', async () => {
      // Arrange
      const completedFestival = { ...mockFestival, status: FestivalStatus.COMPLETED };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(completedFestival);

      const updateStatusDto: UpdateFestivalStatusDto = {
        status: FestivalStatus.DRAFT,
      };

      // Act & Assert
      await expect(
        service.updateStatus(mockFestival.id, updateStatusDto, mockOrganizer),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateStatus(mockFestival.id, updateStatusDto, mockOrganizer),
      ).rejects.toThrow(/Allowed transitions: none/);
    });
  });

  describe('getStats', () => {
    it('should return festival statistics for owner', async () => {
      // Arrange
      const festivalWithRelations = {
        ...mockFestival,
        ticketCategories: [
          { id: 'cat-1', name: 'VIP', quota: 100 },
          { id: 'cat-2', name: 'Regular', quota: 500 },
        ],
        tickets: [
          { categoryId: 'cat-1', status: 'SOLD', purchasePrice: 150 },
          { categoryId: 'cat-1', status: 'USED', purchasePrice: 150 },
          { categoryId: 'cat-2', status: 'SOLD', purchasePrice: 50 },
          { categoryId: 'cat-2', status: 'REFUNDED', purchasePrice: 50 },
        ],
        zones: [{ id: 'zone-1' }],
        staffAssignments: [{ id: 'staff-1' }, { id: 'staff-2' }],
        cashlessTransactions: [
          { type: TransactionType.TOPUP, amount: 100 },
          { type: TransactionType.PAYMENT, amount: -30 },
          { type: TransactionType.REFUND, amount: 10 },
        ],
      };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(festivalWithRelations);

      // Act
      const result = await service.getStats(mockFestival.id, mockOrganizer);

      // Assert
      expect(result.festivalId).toBe(mockFestival.id);
      expect(result.ticketsSold).toBe(3); // SOLD + USED
      expect(result.ticketsUsed).toBe(1);
      expect(result.ticketsRefunded).toBe(1);
      expect(result.totalRevenue).toBe(350); // 150 + 150 + 50
      expect(result.currency).toBe('EUR');
      expect(result.salesByCategory).toHaveLength(2);
      expect(result.zonesCount).toBe(1);
      expect(result.staffCount).toBe(2);
      expect(result.cashlessStats.totalTopups).toBe(100);
      expect(result.cashlessStats.totalPayments).toBe(30);
      expect(result.cashlessStats.totalRefunds).toBe(10);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);

      // Act & Assert
      await expect(service.getStats(mockFestival.id, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getStats(mockFestival.id, mockUser)).rejects.toThrow(
        'You can only view stats for your own festivals',
      );
    });

    it('should allow admin to view stats', async () => {
      // Arrange
      const festivalWithRelations = {
        ...mockFestival,
        ticketCategories: [],
        tickets: [],
        zones: [],
        staffAssignments: [],
        cashlessTransactions: [],
      };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(festivalWithRelations);

      // Act
      const result = await service.getStats(mockFestival.id, mockAdmin);

      // Assert
      expect(result.festivalId).toBe(mockFestival.id);
    });

    it('should throw NotFoundException for non-existent festival', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getStats('non-existent', mockOrganizer)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate capacity utilization correctly', async () => {
      // Arrange
      const festivalWithRelations = {
        ...mockFestival,
        maxCapacity: 100,
        ticketCategories: [{ id: 'cat-1', name: 'Regular', quota: 100 }],
        tickets: Array.from({ length: 25 }, (_, i) => ({
          categoryId: 'cat-1',
          status: i < 20 ? 'SOLD' : 'USED',
          purchasePrice: 50,
        })),
        zones: [],
        staffAssignments: [],
        cashlessTransactions: [],
      };
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(festivalWithRelations);

      // Act
      const result = await service.getStats(mockFestival.id, mockOrganizer);

      // Assert
      expect(result.capacityUtilization).toBe(25); // 25/100 * 100
      expect(result.averageTicketPrice).toBe(50);
    });
  });

  describe('findBySlug', () => {
    it('should return festival by slug', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(mockFestival);

      // Act
      const result = await service.findBySlug(mockFestival.slug, mockOrganizer);

      // Assert
      expect(result.slug).toBe(mockFestival.slug);
      expect(prismaService.festival.findUnique).toHaveBeenCalledWith({
        where: { slug: mockFestival.slug },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException for non-existent slug', async () => {
      // Arrange
      (prismaService.festival.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.findBySlug('non-existent-slug', mockOrganizer)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
