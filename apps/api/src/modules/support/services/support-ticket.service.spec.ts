/**
 * Support Ticket Service Unit Tests
 *
 * Comprehensive tests for support ticket functionality including:
 * - Ticket creation
 * - Ticket retrieval with filters
 * - Ticket updates
 * - Ticket assignment
 * - Status changes
 * - Message handling
 * - SLA management
 * - Statistics
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupportTicketService } from './support-ticket.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  SupportTicketStatus,
  Priority,
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  ChangeTicketStatusDto,
  CreateSupportMessageDto,
  SupportTicketQueryDto,
} from '../dto/support-ticket.dto';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockUser = {
  id: 'user-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  role: 'USER',
  status: 'ACTIVE',
};

const mockStaffUser = {
  id: 'staff-456',
  firstName: 'Jane',
  lastName: 'Staff',
  email: 'jane.staff@example.com',
  role: 'STAFF',
  status: 'ACTIVE',
};

const mockAdminUser = {
  id: 'admin-789',
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@example.com',
  role: 'ADMIN',
  status: 'ACTIVE',
};

const mockFestival = {
  id: 'festival-123',
  name: 'Summer Festival 2026',
};

const mockTicket = {
  id: 'ticket-123',
  userId: mockUser.id,
  festivalId: mockFestival.id,
  subject: 'Payment issue',
  description: 'I have a problem with my payment transaction.',
  status: SupportTicketStatus.OPEN,
  priority: Priority.MEDIUM,
  assignedTo: null,
  createdAt: new Date('2026-01-08T10:00:00Z'),
  updatedAt: new Date('2026-01-08T10:00:00Z'),
  user: {
    id: mockUser.id,
    firstName: mockUser.firstName,
    lastName: mockUser.lastName,
    email: mockUser.email,
  },
};

const mockAssignedTicket = {
  ...mockTicket,
  id: 'ticket-456',
  status: SupportTicketStatus.IN_PROGRESS,
  assignedTo: mockStaffUser.id,
};

const mockMessage = {
  id: 'message-123',
  ticketId: mockTicket.id,
  senderId: mockUser.id,
  message: 'Here are the additional details...',
  isStaff: false,
  createdAt: new Date('2026-01-08T11:00:00Z'),
};

// ============================================================================
// Test Suite
// ============================================================================

describe('SupportTicketService', () => {
  let service: SupportTicketService;
  let prismaService: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockPrismaService = {
    supportTicket: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    supportMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportTicketService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<SupportTicketService>(SupportTicketService);
    prismaService = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);
  });

  // ==========================================================================
  // Create Ticket Tests
  // ==========================================================================

  describe('create', () => {
    const createDto: CreateSupportTicketDto = {
      festivalId: mockFestival.id,
      subject: 'Payment issue',
      description: 'I have a problem with my payment transaction.',
      priority: Priority.MEDIUM,
    };

    it('should create a support ticket successfully', async () => {
      // Arrange
      mockPrismaService.supportTicket.create.mockResolvedValue(mockTicket);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      const result = await service.create(mockUser.id, createDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockTicket.id);
      expect(result.status).toBe(SupportTicketStatus.OPEN);
      expect(mockPrismaService.supportTicket.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          festivalId: createDto.festivalId,
          subject: createDto.subject,
          description: createDto.description,
          priority: Priority.MEDIUM,
          status: SupportTicketStatus.OPEN,
        },
        include: expect.any(Object),
      });
    });

    it('should use default MEDIUM priority when not specified', async () => {
      // Arrange
      const dtoWithoutPriority: CreateSupportTicketDto = {
        festivalId: mockFestival.id,
        subject: 'General question',
        description: 'I have a general question about the festival.',
      };
      mockPrismaService.supportTicket.create.mockResolvedValue(mockTicket);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      await service.create(mockUser.id, dtoWithoutPriority);

      // Assert
      expect(mockPrismaService.supportTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: Priority.MEDIUM,
        }),
        include: expect.any(Object),
      });
    });

    it('should emit ticket.created event', async () => {
      // Arrange
      mockPrismaService.supportTicket.create.mockResolvedValue(mockTicket);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      await service.create(mockUser.id, createDto);

      // Assert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'support.ticket.created',
        expect.objectContaining({
          ticketId: mockTicket.id,
          userId: mockUser.id,
          subject: createDto.subject,
        }),
      );
    });

    it('should auto-assign urgent tickets', async () => {
      // Arrange
      const urgentDto: CreateSupportTicketDto = {
        ...createDto,
        priority: Priority.URGENT,
      };
      const urgentTicket = { ...mockTicket, priority: Priority.URGENT };
      mockPrismaService.supportTicket.create.mockResolvedValue(urgentTicket);
      mockPrismaService.user.findMany.mockResolvedValue([mockAdminUser]);
      mockPrismaService.supportTicket.update.mockResolvedValue({
        ...urgentTicket,
        assignedTo: mockAdminUser.id,
        status: SupportTicketStatus.IN_PROGRESS,
      });

      // Act
      await service.create(mockUser.id, urgentDto);

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
      expect(mockPrismaService.supportTicket.update).toHaveBeenCalledWith({
        where: { id: urgentTicket.id },
        data: expect.objectContaining({
          assignedTo: mockAdminUser.id,
          status: SupportTicketStatus.IN_PROGRESS,
        }),
      });
    });

    it('should create ticket without festivalId', async () => {
      // Arrange
      const dtoWithoutFestival: CreateSupportTicketDto = {
        subject: 'General support',
        description: 'I need help with something general.',
      };
      const ticketWithoutFestival = { ...mockTicket, festivalId: undefined };
      mockPrismaService.supportTicket.create.mockResolvedValue(ticketWithoutFestival);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      const result = await service.create(mockUser.id, dtoWithoutFestival);

      // Assert
      expect(result).toBeDefined();
      expect(mockPrismaService.supportTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          festivalId: undefined,
        }),
        include: expect.any(Object),
      });
    });
  });

  // ==========================================================================
  // Find All Tickets Tests
  // ==========================================================================

  describe('findAll', () => {
    it('should return paginated tickets for staff', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { page: 1, limit: 20 };
      mockPrismaService.supportTicket.findMany.mockResolvedValue([mockTicket]);
      mockPrismaService.supportTicket.count.mockResolvedValue(1);

      // Act
      const result = await service.findAll(query, mockStaffUser.id, true);

      // Assert
      expect(result.tickets).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should return only user own tickets for non-staff', async () => {
      // Arrange
      const query: SupportTicketQueryDto = {};
      mockPrismaService.supportTicket.findMany.mockResolvedValue([mockTicket]);
      mockPrismaService.supportTicket.count.mockResolvedValue(1);

      // Act
      await service.findAll(query, mockUser.id, false);

      // Assert
      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUser.id,
          }),
        }),
      );
    });

    it('should filter by festival ID', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { festivalId: mockFestival.id };
      mockPrismaService.supportTicket.findMany.mockResolvedValue([mockTicket]);
      mockPrismaService.supportTicket.count.mockResolvedValue(1);

      // Act
      await service.findAll(query, mockStaffUser.id, true);

      // Assert
      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            festivalId: mockFestival.id,
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { status: SupportTicketStatus.OPEN };
      mockPrismaService.supportTicket.findMany.mockResolvedValue([mockTicket]);
      mockPrismaService.supportTicket.count.mockResolvedValue(1);

      // Act
      await service.findAll(query, mockStaffUser.id, true);

      // Assert
      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: SupportTicketStatus.OPEN,
          }),
        }),
      );
    });

    it('should filter by priority', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { priority: Priority.HIGH };
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);

      // Act
      await service.findAll(query, mockStaffUser.id, true);

      // Assert
      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: Priority.HIGH,
          }),
        }),
      );
    });

    it('should filter by assigned staff', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { assignedTo: mockStaffUser.id };
      mockPrismaService.supportTicket.findMany.mockResolvedValue([mockAssignedTicket]);
      mockPrismaService.supportTicket.count.mockResolvedValue(1);

      // Act
      await service.findAll(query, mockStaffUser.id, true);

      // Assert
      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedTo: mockStaffUser.id,
          }),
        }),
      );
    });

    it('should filter unassigned tickets only', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { unassignedOnly: true };
      mockPrismaService.supportTicket.findMany.mockResolvedValue([mockTicket]);
      mockPrismaService.supportTicket.count.mockResolvedValue(1);

      // Act
      await service.findAll(query, mockStaffUser.id, true);

      // Assert
      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedTo: null,
          }),
        }),
      );
    });

    it('should search in subject and description', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { search: 'payment' };
      mockPrismaService.supportTicket.findMany.mockResolvedValue([mockTicket]);
      mockPrismaService.supportTicket.count.mockResolvedValue(1);

      // Act
      await service.findAll(query, mockStaffUser.id, true);

      // Assert
      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { subject: { contains: 'payment', mode: 'insensitive' } },
              { description: { contains: 'payment', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should apply sorting', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { sortBy: 'priority', sortOrder: 'asc' };
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);

      // Act
      await service.findAll(query, mockStaffUser.id, true);

      // Assert
      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { priority: 'asc' },
        }),
      );
    });

    it('should use default pagination values', async () => {
      // Arrange
      const query: SupportTicketQueryDto = {};
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);

      // Act
      await service.findAll(query, mockStaffUser.id, true);

      // Assert
      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should calculate correct pagination offset', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { page: 3, limit: 10 };
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);

      // Act
      await service.findAll(query, mockStaffUser.id, true);

      // Assert
      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10,
        }),
      );
    });
  });

  // ==========================================================================
  // Find By ID Tests
  // ==========================================================================

  describe('findById', () => {
    it('should return ticket by ID for staff', async () => {
      // Arrange
      const ticketWithMessages = { ...mockTicket, messages: [] };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(ticketWithMessages);

      // Act
      const result = await service.findById(mockTicket.id, mockStaffUser.id, true);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockTicket.id);
    });

    it('should return ticket by ID for owner', async () => {
      // Arrange
      const ticketWithMessages = { ...mockTicket, messages: [] };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(ticketWithMessages);

      // Act
      const result = await service.findById(mockTicket.id, mockUser.id, false);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockTicket.id);
    });

    it('should throw NotFoundException when ticket not found', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findById('non-existent', mockStaffUser.id, true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-owner non-staff tries to access', async () => {
      // Arrange
      const ticketWithMessages = { ...mockTicket, messages: [] };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(ticketWithMessages);

      // Act & Assert
      await expect(
        service.findById(mockTicket.id, 'other-user-id', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should include messages ordered by creation date', async () => {
      // Arrange
      const ticketWithMessages = { ...mockTicket, messages: [mockMessage] };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(ticketWithMessages);

      // Act
      await service.findById(mockTicket.id, mockUser.id, false);

      // Assert
      expect(mockPrismaService.supportTicket.findUnique).toHaveBeenCalledWith({
        where: { id: mockTicket.id },
        include: expect.objectContaining({
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        }),
      });
    });
  });

  // ==========================================================================
  // Update Ticket Tests
  // ==========================================================================

  describe('update', () => {
    const updateDto: UpdateSupportTicketDto = {
      priority: Priority.HIGH,
    };

    it('should update ticket successfully', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      const updatedTicket = { ...mockTicket, priority: Priority.HIGH };
      mockPrismaService.supportTicket.update.mockResolvedValue(updatedTicket);

      // Act
      const result = await service.update(mockTicket.id, updateDto, mockStaffUser.id);

      // Assert
      expect(result.priority).toBe(Priority.HIGH);
    });

    it('should throw NotFoundException when ticket not found', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('non-existent', updateDto, mockStaffUser.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should emit status-changed event when status changes', async () => {
      // Arrange
      const statusDto: UpdateSupportTicketDto = {
        status: SupportTicketStatus.IN_PROGRESS,
      };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      const updatedTicket = { ...mockTicket, status: SupportTicketStatus.IN_PROGRESS };
      mockPrismaService.supportTicket.update.mockResolvedValue(updatedTicket);

      // Act
      await service.update(mockTicket.id, statusDto, mockStaffUser.id);

      // Assert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'support.ticket.status-changed',
        expect.objectContaining({
          ticketId: mockTicket.id,
          oldStatus: SupportTicketStatus.OPEN,
          newStatus: SupportTicketStatus.IN_PROGRESS,
        }),
      );
    });

    it('should emit assigned event when assignedTo changes', async () => {
      // Arrange
      const assignDto: UpdateSupportTicketDto = {
        assignedTo: mockStaffUser.id,
      };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      const updatedTicket = { ...mockTicket, assignedTo: mockStaffUser.id };
      mockPrismaService.supportTicket.update.mockResolvedValue(updatedTicket);

      // Act
      await service.update(mockTicket.id, assignDto, mockAdminUser.id);

      // Assert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'support.ticket.assigned',
        expect.objectContaining({
          ticketId: mockTicket.id,
          assignedTo: mockStaffUser.id,
          assignedBy: mockAdminUser.id,
        }),
      );
    });
  });

  // ==========================================================================
  // Change Status Tests
  // ==========================================================================

  describe('changeStatus', () => {
    it('should change status successfully', async () => {
      // Arrange
      const changeDto: ChangeTicketStatusDto = {
        status: SupportTicketStatus.IN_PROGRESS,
      };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      const updatedTicket = { ...mockTicket, status: SupportTicketStatus.IN_PROGRESS };
      mockPrismaService.supportTicket.update.mockResolvedValue(updatedTicket);
      mockPrismaService.supportMessage.create.mockResolvedValue(mockMessage);

      // Act
      const result = await service.changeStatus(mockTicket.id, changeDto, mockStaffUser.id);

      // Assert
      expect(result.status).toBe(SupportTicketStatus.IN_PROGRESS);
    });

    it('should throw NotFoundException when ticket not found', async () => {
      // Arrange
      const changeDto: ChangeTicketStatusDto = {
        status: SupportTicketStatus.IN_PROGRESS,
      };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.changeStatus('non-existent', changeDto, mockStaffUser.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should add system message for status change', async () => {
      // Arrange
      const changeDto: ChangeTicketStatusDto = {
        status: SupportTicketStatus.RESOLVED,
        reason: 'Issue fixed',
      };
      const inProgressTicket = { ...mockTicket, status: SupportTicketStatus.IN_PROGRESS };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(inProgressTicket);
      const resolvedTicket = { ...mockTicket, status: SupportTicketStatus.RESOLVED };
      mockPrismaService.supportTicket.update.mockResolvedValue(resolvedTicket);
      mockPrismaService.supportMessage.create.mockResolvedValue(mockMessage);

      // Act
      await service.changeStatus(mockTicket.id, changeDto, mockStaffUser.id);

      // Assert
      expect(mockPrismaService.supportMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ticketId: mockTicket.id,
          senderId: mockStaffUser.id,
          isStaff: true,
        }),
      });
    });

    it('should emit status-changed event', async () => {
      // Arrange
      const changeDto: ChangeTicketStatusDto = {
        status: SupportTicketStatus.IN_PROGRESS,
      };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      const updatedTicket = { ...mockTicket, status: SupportTicketStatus.IN_PROGRESS };
      mockPrismaService.supportTicket.update.mockResolvedValue(updatedTicket);
      mockPrismaService.supportMessage.create.mockResolvedValue(mockMessage);

      // Act
      await service.changeStatus(mockTicket.id, changeDto, mockStaffUser.id);

      // Assert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'support.ticket.status-changed',
        expect.objectContaining({
          ticketId: mockTicket.id,
          oldStatus: SupportTicketStatus.OPEN,
          newStatus: SupportTicketStatus.IN_PROGRESS,
          changedBy: mockStaffUser.id,
        }),
      );
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      // Arrange - cannot go from OPEN to WAITING_FOR_USER directly
      const changeDto: ChangeTicketStatusDto = {
        status: SupportTicketStatus.WAITING_FOR_USER,
      };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);

      // Act & Assert
      await expect(
        service.changeStatus(mockTicket.id, changeDto, mockStaffUser.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid transition from OPEN to IN_PROGRESS', async () => {
      // Arrange
      const changeDto: ChangeTicketStatusDto = {
        status: SupportTicketStatus.IN_PROGRESS,
      };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.supportTicket.update.mockResolvedValue({
        ...mockTicket,
        status: SupportTicketStatus.IN_PROGRESS,
      });
      mockPrismaService.supportMessage.create.mockResolvedValue(mockMessage);

      // Act
      const result = await service.changeStatus(mockTicket.id, changeDto, mockStaffUser.id);

      // Assert
      expect(result.status).toBe(SupportTicketStatus.IN_PROGRESS);
    });

    it('should allow closing a ticket from OPEN', async () => {
      // Arrange
      const changeDto: ChangeTicketStatusDto = {
        status: SupportTicketStatus.CLOSED,
      };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.supportTicket.update.mockResolvedValue({
        ...mockTicket,
        status: SupportTicketStatus.CLOSED,
      });
      mockPrismaService.supportMessage.create.mockResolvedValue(mockMessage);

      // Act
      const result = await service.changeStatus(mockTicket.id, changeDto, mockStaffUser.id);

      // Assert
      expect(result.status).toBe(SupportTicketStatus.CLOSED);
    });

    it('should allow reopening a CLOSED ticket to IN_PROGRESS', async () => {
      // Arrange
      const closedTicket = { ...mockTicket, status: SupportTicketStatus.CLOSED };
      const changeDto: ChangeTicketStatusDto = {
        status: SupportTicketStatus.IN_PROGRESS,
      };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(closedTicket);
      mockPrismaService.supportTicket.update.mockResolvedValue({
        ...mockTicket,
        status: SupportTicketStatus.IN_PROGRESS,
      });
      mockPrismaService.supportMessage.create.mockResolvedValue(mockMessage);

      // Act
      const result = await service.changeStatus(mockTicket.id, changeDto, mockStaffUser.id);

      // Assert
      expect(result.status).toBe(SupportTicketStatus.IN_PROGRESS);
    });
  });

  // ==========================================================================
  // Assign Ticket Tests
  // ==========================================================================

  describe('assign', () => {
    it('should assign ticket to staff successfully', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.user.findUnique.mockResolvedValue(mockStaffUser);
      const assignedTicket = { ...mockTicket, assignedTo: mockStaffUser.id };
      mockPrismaService.supportTicket.update.mockResolvedValue(assignedTicket);

      // Act
      const result = await service.assign(mockTicket.id, mockStaffUser.id, mockAdminUser.id);

      // Assert
      expect(result.assignedTo).toBe(mockStaffUser.id);
    });

    it('should throw NotFoundException when ticket not found', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.assign('non-existent', mockStaffUser.id, mockAdminUser.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when staff user not found', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.assign(mockTicket.id, 'non-existent-staff', mockAdminUser.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when assigning to non-staff user', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser); // Regular USER role

      // Act & Assert
      await expect(
        service.assign(mockTicket.id, mockUser.id, mockAdminUser.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should change status to IN_PROGRESS when assigning OPEN ticket', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.user.findUnique.mockResolvedValue(mockStaffUser);
      const assignedTicket = {
        ...mockTicket,
        assignedTo: mockStaffUser.id,
        status: SupportTicketStatus.IN_PROGRESS,
      };
      mockPrismaService.supportTicket.update.mockResolvedValue(assignedTicket);

      // Act
      const result = await service.assign(mockTicket.id, mockStaffUser.id, mockAdminUser.id);

      // Assert
      expect(result.status).toBe(SupportTicketStatus.IN_PROGRESS);
      expect(mockPrismaService.supportTicket.update).toHaveBeenCalledWith({
        where: { id: mockTicket.id },
        data: expect.objectContaining({
          assignedTo: mockStaffUser.id,
          status: SupportTicketStatus.IN_PROGRESS,
        }),
        include: expect.any(Object),
      });
    });

    it('should not change status when ticket is already IN_PROGRESS', async () => {
      // Arrange
      const inProgressTicket = { ...mockTicket, status: SupportTicketStatus.IN_PROGRESS };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(inProgressTicket);
      mockPrismaService.user.findUnique.mockResolvedValue(mockStaffUser);
      mockPrismaService.supportTicket.update.mockResolvedValue({
        ...inProgressTicket,
        assignedTo: mockStaffUser.id,
      });

      // Act
      await service.assign(mockTicket.id, mockStaffUser.id, mockAdminUser.id);

      // Assert
      expect(mockPrismaService.supportTicket.update).toHaveBeenCalledWith({
        where: { id: mockTicket.id },
        data: expect.objectContaining({
          status: SupportTicketStatus.IN_PROGRESS,
        }),
        include: expect.any(Object),
      });
    });

    it('should emit assigned event', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.user.findUnique.mockResolvedValue(mockStaffUser);
      mockPrismaService.supportTicket.update.mockResolvedValue({
        ...mockTicket,
        assignedTo: mockStaffUser.id,
      });

      // Act
      await service.assign(mockTicket.id, mockStaffUser.id, mockAdminUser.id);

      // Assert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'support.ticket.assigned',
        expect.objectContaining({
          ticketId: mockTicket.id,
          assignedTo: mockStaffUser.id,
          assignedBy: mockAdminUser.id,
        }),
      );
    });

    it('should allow assigning to ADMIN role', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrismaService.supportTicket.update.mockResolvedValue({
        ...mockTicket,
        assignedTo: mockAdminUser.id,
      });

      // Act
      const result = await service.assign(mockTicket.id, mockAdminUser.id, mockAdminUser.id);

      // Assert
      expect(result.assignedTo).toBe(mockAdminUser.id);
    });

    it('should allow assigning to ORGANIZER role', async () => {
      // Arrange
      const organizerUser = { ...mockStaffUser, role: 'ORGANIZER' };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.user.findUnique.mockResolvedValue(organizerUser);
      mockPrismaService.supportTicket.update.mockResolvedValue({
        ...mockTicket,
        assignedTo: organizerUser.id,
      });

      // Act
      const result = await service.assign(mockTicket.id, organizerUser.id, mockAdminUser.id);

      // Assert
      expect(result.assignedTo).toBe(organizerUser.id);
    });
  });

  // ==========================================================================
  // Add Message Tests
  // ==========================================================================

  describe('addMessage', () => {
    const messageDto: CreateSupportMessageDto = {
      message: 'Here are more details about my issue...',
    };

    it('should add message successfully for ticket owner', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      const newMessage = { ...mockMessage, message: messageDto.message };
      mockPrismaService.supportMessage.create.mockResolvedValue(newMessage);
      mockPrismaService.supportTicket.update.mockResolvedValue(mockTicket);

      // Act
      const result = await service.addMessage(
        mockTicket.id,
        mockUser.id,
        messageDto,
        false,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.message).toBe(messageDto.message);
    });

    it('should add message successfully for staff', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      const staffMessage = { ...mockMessage, isStaff: true, senderId: mockStaffUser.id };
      mockPrismaService.supportMessage.create.mockResolvedValue(staffMessage);
      mockPrismaService.supportTicket.update.mockResolvedValue(mockTicket);

      // Act
      const result = await service.addMessage(
        mockTicket.id,
        mockStaffUser.id,
        messageDto,
        true,
      );

      // Assert
      expect(result.isStaff).toBe(true);
    });

    it('should throw NotFoundException when ticket not found', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.addMessage('non-existent', mockUser.id, messageDto, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-owner non-staff tries to add message', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);

      // Act & Assert
      await expect(
        service.addMessage(mockTicket.id, 'other-user-id', messageDto, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update ticket status to IN_PROGRESS when user adds message', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.supportMessage.create.mockResolvedValue(mockMessage);
      mockPrismaService.supportTicket.update.mockResolvedValue({
        ...mockTicket,
        status: SupportTicketStatus.IN_PROGRESS,
      });

      // Act
      await service.addMessage(mockTicket.id, mockUser.id, messageDto, false);

      // Assert
      expect(mockPrismaService.supportTicket.update).toHaveBeenCalledWith({
        where: { id: mockTicket.id },
        data: { status: SupportTicketStatus.IN_PROGRESS },
      });
    });

    it('should update ticket status to WAITING_FOR_USER when staff adds message', async () => {
      // Arrange
      const inProgressTicket = { ...mockTicket, status: SupportTicketStatus.IN_PROGRESS };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(inProgressTicket);
      mockPrismaService.supportMessage.create.mockResolvedValue({
        ...mockMessage,
        isStaff: true,
      });
      mockPrismaService.supportTicket.update.mockResolvedValue({
        ...mockTicket,
        status: SupportTicketStatus.WAITING_FOR_USER,
      });

      // Act
      await service.addMessage(mockTicket.id, mockStaffUser.id, messageDto, true);

      // Assert
      expect(mockPrismaService.supportTicket.update).toHaveBeenCalledWith({
        where: { id: mockTicket.id },
        data: { status: SupportTicketStatus.WAITING_FOR_USER },
      });
    });

    it('should not update status for RESOLVED ticket', async () => {
      // Arrange
      const resolvedTicket = { ...mockTicket, status: SupportTicketStatus.RESOLVED };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(resolvedTicket);
      mockPrismaService.supportMessage.create.mockResolvedValue(mockMessage);

      // Act
      await service.addMessage(mockTicket.id, mockUser.id, messageDto, false);

      // Assert
      expect(mockPrismaService.supportTicket.update).not.toHaveBeenCalled();
    });

    it('should not update status for CLOSED ticket', async () => {
      // Arrange
      const closedTicket = { ...mockTicket, status: SupportTicketStatus.CLOSED };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(closedTicket);
      mockPrismaService.supportMessage.create.mockResolvedValue(mockMessage);

      // Act
      await service.addMessage(mockTicket.id, mockUser.id, messageDto, false);

      // Assert
      expect(mockPrismaService.supportTicket.update).not.toHaveBeenCalled();
    });

    it('should emit message.created event', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.supportMessage.create.mockResolvedValue(mockMessage);
      mockPrismaService.supportTicket.update.mockResolvedValue(mockTicket);

      // Act
      await service.addMessage(mockTicket.id, mockUser.id, messageDto, false);

      // Assert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'support.message.created',
        expect.objectContaining({
          ticketId: mockTicket.id,
          messageId: mockMessage.id,
          senderId: mockUser.id,
          isStaff: false,
        }),
      );
    });
  });

  // ==========================================================================
  // Get Messages Tests
  // ==========================================================================

  describe('getMessages', () => {
    it('should return messages for ticket owner', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.supportMessage.findMany.mockResolvedValue([mockMessage]);

      // Act
      const result = await service.getMessages(mockTicket.id, mockUser.id, false);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].message).toBe(mockMessage.message);
    });

    it('should return messages for staff', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.supportMessage.findMany.mockResolvedValue([mockMessage]);

      // Act
      const result = await service.getMessages(mockTicket.id, mockStaffUser.id, true);

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException when ticket not found', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getMessages('non-existent', mockUser.id, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-owner non-staff tries to get messages', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);

      // Act & Assert
      await expect(
        service.getMessages(mockTicket.id, 'other-user-id', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return messages ordered by creation date ascending', async () => {
      // Arrange
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.supportMessage.findMany.mockResolvedValue([mockMessage]);

      // Act
      await service.getMessages(mockTicket.id, mockUser.id, false);

      // Assert
      expect(mockPrismaService.supportMessage.findMany).toHaveBeenCalledWith({
        where: { ticketId: mockTicket.id },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  // ==========================================================================
  // SLA Management Tests
  // ==========================================================================

  describe('getSlaDeadline', () => {
    it('should return correct deadline for URGENT priority', () => {
      // Arrange
      const createdAt = new Date('2026-01-08T10:00:00Z');

      // Act
      const deadline = service.getSlaDeadline(Priority.URGENT, createdAt);

      // Assert - 2 hours later
      expect(deadline.getTime()).toBe(createdAt.getTime() + 2 * 60 * 60 * 1000);
    });

    it('should return correct deadline for HIGH priority', () => {
      // Arrange
      const createdAt = new Date('2026-01-08T10:00:00Z');

      // Act
      const deadline = service.getSlaDeadline(Priority.HIGH, createdAt);

      // Assert - 8 hours later
      expect(deadline.getTime()).toBe(createdAt.getTime() + 8 * 60 * 60 * 1000);
    });

    it('should return correct deadline for MEDIUM priority', () => {
      // Arrange
      const createdAt = new Date('2026-01-08T10:00:00Z');

      // Act
      const deadline = service.getSlaDeadline(Priority.MEDIUM, createdAt);

      // Assert - 24 hours later
      expect(deadline.getTime()).toBe(createdAt.getTime() + 24 * 60 * 60 * 1000);
    });

    it('should return correct deadline for LOW priority', () => {
      // Arrange
      const createdAt = new Date('2026-01-08T10:00:00Z');

      // Act
      const deadline = service.getSlaDeadline(Priority.LOW, createdAt);

      // Assert - 72 hours later
      expect(deadline.getTime()).toBe(createdAt.getTime() + 72 * 60 * 60 * 1000);
    });
  });

  describe('updateSlaConfig', () => {
    it('should update SLA configuration', () => {
      // Arrange
      const newConfig = {
        lowPriorityHours: 96,
        mediumPriorityHours: 48,
        highPriorityHours: 12,
        urgentPriorityHours: 4,
      };

      // Act
      service.updateSlaConfig(newConfig);
      const createdAt = new Date('2026-01-08T10:00:00Z');
      const deadline = service.getSlaDeadline(Priority.URGENT, createdAt);

      // Assert - should now be 4 hours
      expect(deadline.getTime()).toBe(createdAt.getTime() + 4 * 60 * 60 * 1000);
    });
  });

  describe('getSlaBreachers', () => {
    it('should return tickets that have breached SLA', async () => {
      // Arrange
      const oldTicket = {
        ...mockTicket,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        priority: Priority.MEDIUM, // 24 hour SLA
      };
      mockPrismaService.supportTicket.findMany.mockResolvedValue([oldTicket]);

      // Act
      const result = await service.getSlaBreachers();

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should not return tickets within SLA', async () => {
      // Arrange
      const recentTicket = {
        ...mockTicket,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        priority: Priority.MEDIUM, // 24 hour SLA
      };
      mockPrismaService.supportTicket.findMany.mockResolvedValue([recentTicket]);

      // Act
      const result = await service.getSlaBreachers();

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should only check open tickets', async () => {
      // Arrange
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);

      // Act
      await service.getSlaBreachers();

      // Assert
      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER'] },
        },
        include: expect.any(Object),
      });
    });
  });

  // ==========================================================================
  // Statistics Tests
  // ==========================================================================

  describe('getStatistics', () => {
    beforeEach(() => {
      // Reset all mocks for statistics tests to ensure isolation
      jest.clearAllMocks();
    });

    it('should return comprehensive statistics', async () => {
      // Arrange - Setup all the count mocks in order
      mockPrismaService.supportTicket.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20) // open
        .mockResolvedValueOnce(30) // in progress
        .mockResolvedValueOnce(40) // resolved
        .mockResolvedValueOnce(10); // closed

      // GroupBy mocks - priority first, then by staff
      (mockPrismaService.supportTicket as any).groupBy = jest.fn()
        .mockResolvedValueOnce([
          { priority: 'LOW', _count: 25 },
          { priority: 'MEDIUM', _count: 50 },
          { priority: 'HIGH', _count: 20 },
          { priority: 'URGENT', _count: 5 },
        ])
        .mockResolvedValueOnce([
          { assignedTo: mockStaffUser.id, _count: 30 },
        ]);

      mockPrismaService.supportTicket.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-01-08T10:00:00Z'),
          updatedAt: new Date('2026-01-08T12:00:00Z'),
        },
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([mockStaffUser]);

      // Act
      const result = await service.getStatistics();

      // Assert
      expect(result.totalTickets).toBe(100);
      expect(result.openTickets).toBe(20);
      expect(result.inProgressTickets).toBe(30);
      expect(result.resolvedTickets).toBe(40);
      expect(result.closedTickets).toBe(10);
      expect(result.byPriority.low).toBe(25);
      expect(result.byPriority.medium).toBe(50);
      expect(result.byPriority.high).toBe(20);
      expect(result.byPriority.urgent).toBe(5);
    });

    it('should filter statistics by festival', async () => {
      // Arrange
      mockPrismaService.supportTicket.count.mockResolvedValue(10);
      (mockPrismaService.supportTicket as any).groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      await service.getStatistics(mockFestival.id);

      // Assert
      expect(mockPrismaService.supportTicket.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ festivalId: mockFestival.id }),
      });
    });

    it('should calculate average resolution time', async () => {
      // Arrange
      mockPrismaService.supportTicket.count.mockResolvedValue(10);
      (mockPrismaService.supportTicket as any).groupBy = jest.fn().mockResolvedValue([]);
      // 2 hours resolution time
      mockPrismaService.supportTicket.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-01-08T10:00:00Z'),
          updatedAt: new Date('2026-01-08T12:00:00Z'),
        },
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getStatistics();

      // Assert
      expect(result.averageResolutionTimeHours).toBe(2);
    });

    it('should handle zero resolved tickets', async () => {
      // Arrange
      mockPrismaService.supportTicket.count.mockResolvedValue(0);
      (mockPrismaService.supportTicket as any).groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getStatistics();

      // Assert
      expect(result.averageResolutionTimeHours).toBe(0);
    });

    it('should include staff assignment stats', async () => {
      // Arrange
      mockPrismaService.supportTicket.count.mockResolvedValue(50);
      (mockPrismaService.supportTicket as any).groupBy = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { assignedTo: mockStaffUser.id, _count: 30 },
          { assignedTo: mockAdminUser.id, _count: 20 },
        ]);
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.user.findMany.mockResolvedValue([mockStaffUser, mockAdminUser]);

      // Act
      const result = await service.getStatistics();

      // Assert
      expect(result.byStaff).toHaveLength(2);
      expect(result.byStaff[0].staffId).toBe(mockStaffUser.id);
      expect(result.byStaff[0].assignedCount).toBe(30);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { search: 'nonexistent' };
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);

      // Act
      const result = await service.findAll(query, mockStaffUser.id, true);

      // Assert
      expect(result.tickets).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle special characters in search', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { search: "test's \"query\"" };
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);

      // Act
      await service.findAll(query, mockStaffUser.id, true);

      // Assert
      expect(mockPrismaService.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { subject: { contains: "test's \"query\"", mode: 'insensitive' } },
              { description: { contains: "test's \"query\"", mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should handle concurrent ticket updates', async () => {
      // Arrange - Two updates at the same time
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.supportTicket.update.mockResolvedValue({
        ...mockTicket,
        priority: Priority.HIGH,
      });

      // Act
      const updatePromise1 = service.update(
        mockTicket.id,
        { priority: Priority.HIGH },
        mockStaffUser.id,
      );
      const updatePromise2 = service.update(
        mockTicket.id,
        { priority: Priority.URGENT },
        mockStaffUser.id,
      );

      // Assert - Both should complete (Prisma handles locking)
      await expect(Promise.all([updatePromise1, updatePromise2])).resolves.toBeDefined();
    });

    it('should handle null festivalId in query', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { festivalId: undefined };
      mockPrismaService.supportTicket.findMany.mockResolvedValue([mockTicket]);
      mockPrismaService.supportTicket.count.mockResolvedValue(1);

      // Act
      await service.findAll(query, mockStaffUser.id, true);

      // Assert - Should be called with a where clause that doesn't have festivalId as a key
      const callArgs = mockPrismaService.supportTicket.findMany.mock.calls[0][0];
      expect(callArgs.where).toBeDefined();
      expect(Object.prototype.hasOwnProperty.call(callArgs.where, 'festivalId')).toBe(false);
    });

    it('should format response correctly with all fields', async () => {
      // Arrange
      const fullTicket = {
        ...mockTicket,
        messages: [mockMessage],
      };
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(fullTicket);

      // Act
      const result = await service.findById(mockTicket.id, mockUser.id, false);

      // Assert
      expect(result).toEqual({
        id: mockTicket.id,
        userId: mockTicket.userId,
        festivalId: mockTicket.festivalId,
        subject: mockTicket.subject,
        description: mockTicket.description,
        status: mockTicket.status,
        priority: mockTicket.priority,
        assignedTo: mockTicket.assignedTo,
        createdAt: mockTicket.createdAt,
        updatedAt: mockTicket.updatedAt,
        user: mockTicket.user,
        messages: [
          {
            id: mockMessage.id,
            ticketId: mockMessage.ticketId,
            senderId: mockMessage.senderId,
            message: mockMessage.message,
            isStaff: mockMessage.isStaff,
            createdAt: mockMessage.createdAt,
          },
        ],
      });
    });
  });
});
