/**
 * Support Ticket Controller Unit Tests
 *
 * Comprehensive tests for Support Ticket endpoints including:
 * - POST /support/tickets
 * - GET /support/tickets
 * - GET /support/tickets/:id
 * - POST /support/tickets/:id/messages
 * - GET /support/tickets/:id/messages
 * - PATCH /support/tickets/:id (staff)
 * - PATCH /support/tickets/:id/status (staff)
 * - PATCH /support/tickets/:id/assign (staff)
 * - GET /support/tickets/admin/all (staff)
 * - GET /support/tickets/admin/sla-breaches (staff)
 * - GET /support/tickets/admin/statistics (admin)
 * - PUT /support/tickets/admin/sla-config (admin)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupportTicketController } from './support-ticket.controller';
import { SupportTicketService } from '../services/support-ticket.service';
import {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  CreateSupportMessageDto,
  ChangeTicketStatusDto,
  AssignTicketDto,
  SupportTicketQueryDto,
  SupportTicketResponseDto,
  SupportMessageResponseDto,
  TicketStatisticsDto,
  SlaConfigDto,
  SupportTicketStatus,
  Priority,
} from '../dto/support-ticket.dto';
import { UserRole } from '@prisma/client';
import {
  regularUser,
  staffUser,
  adminUser,
  organizerUser,
  publishedFestival,
} from '../../../test/fixtures';

// ============================================================================
// Mock Setup
// ============================================================================

describe('SupportTicketController', () => {
  let controller: SupportTicketController;

  // Auth user mock interface
  interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
  }

  // Mock auth users
  const mockRegularUser: AuthUser = {
    id: regularUser.id,
    email: regularUser.email,
    role: regularUser.role,
  };

  const mockStaffUser: AuthUser = {
    id: staffUser.id,
    email: staffUser.email,
    role: staffUser.role,
  };

  const mockAdminUser: AuthUser = {
    id: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
  };

  const mockOrganizerUser: AuthUser = {
    id: organizerUser.id,
    email: organizerUser.email,
    role: organizerUser.role,
  };

  // Mock support ticket response
  const mockTicket: SupportTicketResponseDto = {
    id: 'ticket-uuid-00000000-0000-0000-0000-000000000001',
    userId: regularUser.id,
    festivalId: publishedFestival.id,
    subject: 'Probleme de paiement',
    description: 'Mon paiement a ete refuse mais le montant a ete debite...',
    status: SupportTicketStatus.OPEN,
    priority: Priority.MEDIUM,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    user: {
      id: regularUser.id,
      firstName: regularUser.firstName,
      lastName: regularUser.lastName,
      email: regularUser.email,
    },
  };

  const mockAssignedTicket: SupportTicketResponseDto = {
    ...mockTicket,
    assignedTo: staffUser.id,
    status: SupportTicketStatus.IN_PROGRESS,
    assignedStaff: {
      id: staffUser.id,
      firstName: staffUser.firstName,
      lastName: staffUser.lastName,
      email: staffUser.email,
    },
  };

  // Mock message response
  const mockMessage: SupportMessageResponseDto = {
    id: 'message-uuid-00000000-0000-0000-0000-000000000001',
    ticketId: mockTicket.id,
    senderId: regularUser.id,
    message: 'Voici les details supplementaires...',
    isStaff: false,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    sender: {
      id: regularUser.id,
      firstName: regularUser.firstName,
      lastName: regularUser.lastName,
      email: regularUser.email,
    },
  };

  const mockStaffMessage: SupportMessageResponseDto = {
    ...mockMessage,
    id: 'message-uuid-00000000-0000-0000-0000-000000000002',
    senderId: staffUser.id,
    message: 'Nous avons bien recu votre demande...',
    isStaff: true,
    sender: {
      id: staffUser.id,
      firstName: staffUser.firstName,
      lastName: staffUser.lastName,
      email: staffUser.email,
    },
  };

  const mockStatistics: TicketStatisticsDto = {
    totalTickets: 150,
    openTickets: 30,
    inProgressTickets: 45,
    resolvedTickets: 60,
    closedTickets: 15,
    averageResolutionTimeHours: 24.5,
    slaBreaches: 5,
    byPriority: {
      low: 40,
      medium: 70,
      high: 30,
      urgent: 10,
    },
    byStaff: [
      {
        staffId: staffUser.id,
        staffName: `${staffUser.firstName} ${staffUser.lastName}`,
        assignedCount: 50,
        resolvedCount: 35,
      },
    ],
  };

  const mockSupportTicketService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    addMessage: jest.fn(),
    getMessages: jest.fn(),
    update: jest.fn(),
    changeStatus: jest.fn(),
    assign: jest.fn(),
    getSlaBreachers: jest.fn(),
    getStatistics: jest.fn(),
    updateSlaConfig: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportTicketController],
      providers: [{ provide: SupportTicketService, useValue: mockSupportTicketService }],
    }).compile();

    controller = module.get<SupportTicketController>(SupportTicketController);
  });

  // ==========================================================================
  // POST /support/tickets Tests
  // ==========================================================================

  describe('POST /support/tickets', () => {
    it('should create a new support ticket', async () => {
      // Arrange
      const dto: CreateSupportTicketDto = {
        festivalId: publishedFestival.id,
        subject: 'Nouveau probleme',
        description: 'Description detaillee du probleme...',
        priority: Priority.HIGH,
      };
      mockSupportTicketService.create.mockResolvedValue({
        ...mockTicket,
        ...dto,
      });

      // Act
      const result = await controller.create(mockRegularUser, dto);

      // Assert
      expect(result.subject).toBe(dto.subject);
      expect(result.priority).toBe(dto.priority);
      expect(mockSupportTicketService.create).toHaveBeenCalledWith(mockRegularUser.id, dto);
    });

    it('should create ticket without festival ID', async () => {
      // Arrange
      const dto: CreateSupportTicketDto = {
        subject: 'Question generale',
        description: 'Question qui ne concerne pas un festival specifique...',
      };
      mockSupportTicketService.create.mockResolvedValue({
        ...mockTicket,
        festivalId: undefined,
        subject: dto.subject,
        description: dto.description,
      });

      // Act
      const result = await controller.create(mockRegularUser, dto);

      // Assert
      expect(result.festivalId).toBeUndefined();
    });

    it('should create ticket with default MEDIUM priority', async () => {
      // Arrange
      const dto: CreateSupportTicketDto = {
        subject: 'Sans priorite',
        description: 'Ticket sans priorite specifiee...',
      };
      mockSupportTicketService.create.mockResolvedValue({
        ...mockTicket,
        subject: dto.subject,
        priority: Priority.MEDIUM,
      });

      // Act
      const result = await controller.create(mockRegularUser, dto);

      // Assert
      expect(result.priority).toBe(Priority.MEDIUM);
    });
  });

  // ==========================================================================
  // GET /support/tickets Tests
  // ==========================================================================

  describe('GET /support/tickets', () => {
    it('should return user tickets with filters', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { status: SupportTicketStatus.OPEN };
      mockSupportTicketService.findAll.mockResolvedValue({
        tickets: [mockTicket],
        total: 1,
      });

      // Act
      const result = await controller.findMyTickets(mockRegularUser, query);

      // Assert
      expect(result.tickets).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockSupportTicketService.findAll).toHaveBeenCalledWith(
        query,
        mockRegularUser.id,
        false
      );
    });

    it('should filter tickets by priority', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { priority: Priority.URGENT };
      mockSupportTicketService.findAll.mockResolvedValue({
        tickets: [{ ...mockTicket, priority: Priority.URGENT }],
        total: 1,
      });

      // Act
      const result = await controller.findMyTickets(mockRegularUser, query);

      // Assert
      expect(result.tickets[0].priority).toBe(Priority.URGENT);
    });

    it('should return all tickets for staff users', async () => {
      // Arrange
      const query: SupportTicketQueryDto = {};
      mockSupportTicketService.findAll.mockResolvedValue({
        tickets: [mockTicket, mockAssignedTicket],
        total: 2,
      });

      // Act
      const _result = await controller.findMyTickets(mockStaffUser, query);

      // Assert
      expect(mockSupportTicketService.findAll).toHaveBeenCalledWith(query, mockStaffUser.id, true);
    });

    it('should paginate results', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { page: 2, limit: 10 };
      mockSupportTicketService.findAll.mockResolvedValue({
        tickets: [mockTicket],
        total: 25,
      });

      // Act
      const _result = await controller.findMyTickets(mockRegularUser, query);

      // Assert
      expect(mockSupportTicketService.findAll).toHaveBeenCalledWith(
        query,
        mockRegularUser.id,
        false
      );
    });

    it('should search tickets', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { search: 'paiement' };
      mockSupportTicketService.findAll.mockResolvedValue({
        tickets: [mockTicket],
        total: 1,
      });

      // Act
      const _result = await controller.findMyTickets(mockRegularUser, query);

      // Assert
      expect(mockSupportTicketService.findAll).toHaveBeenCalledWith(
        query,
        mockRegularUser.id,
        false
      );
    });
  });

  // ==========================================================================
  // GET /support/tickets/:id Tests
  // ==========================================================================

  describe('GET /support/tickets/:id', () => {
    it('should return ticket by ID for owner', async () => {
      // Arrange
      mockSupportTicketService.findById.mockResolvedValue(mockTicket);

      // Act
      const result = await controller.findById(mockRegularUser, mockTicket.id);

      // Assert
      expect(result).toEqual(mockTicket);
      expect(mockSupportTicketService.findById).toHaveBeenCalledWith(
        mockTicket.id,
        mockRegularUser.id,
        false
      );
    });

    it('should return ticket by ID for staff', async () => {
      // Arrange
      mockSupportTicketService.findById.mockResolvedValue(mockTicket);

      // Act
      const _result = await controller.findById(mockStaffUser, mockTicket.id);

      // Assert
      expect(mockSupportTicketService.findById).toHaveBeenCalledWith(
        mockTicket.id,
        mockStaffUser.id,
        true
      );
    });

    it('should propagate NotFoundException for non-existent ticket', async () => {
      // Arrange
      const error = new NotFoundException('Ticket not found');
      mockSupportTicketService.findById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findById(mockRegularUser, 'non-existent-id')).rejects.toThrow(
        'Ticket not found'
      );
    });

    it('should propagate ForbiddenException for access denied', async () => {
      // Arrange
      const error = new ForbiddenException('Access denied');
      mockSupportTicketService.findById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findById(mockRegularUser, mockTicket.id)).rejects.toThrow(
        'Access denied'
      );
    });
  });

  // ==========================================================================
  // POST /support/tickets/:id/messages Tests
  // ==========================================================================

  describe('POST /support/tickets/:id/messages', () => {
    it('should add message as user', async () => {
      // Arrange
      const dto: CreateSupportMessageDto = {
        message: 'Voici une reponse de lutilisateur...',
      };
      mockSupportTicketService.addMessage.mockResolvedValue(mockMessage);

      // Act
      const result = await controller.addMessage(mockRegularUser, mockTicket.id, dto);

      // Assert
      expect(result.message).toBe(mockMessage.message);
      expect(result.isStaff).toBe(false);
      expect(mockSupportTicketService.addMessage).toHaveBeenCalledWith(
        mockTicket.id,
        mockRegularUser.id,
        dto,
        false
      );
    });

    it('should add message as staff', async () => {
      // Arrange
      const dto: CreateSupportMessageDto = {
        message: 'Reponse du support...',
      };
      mockSupportTicketService.addMessage.mockResolvedValue(mockStaffMessage);

      // Act
      const result = await controller.addMessage(mockStaffUser, mockTicket.id, dto);

      // Assert
      expect(result.isStaff).toBe(true);
      expect(mockSupportTicketService.addMessage).toHaveBeenCalledWith(
        mockTicket.id,
        mockStaffUser.id,
        dto,
        true
      );
    });

    it('should add message with attachments', async () => {
      // Arrange
      const dto: CreateSupportMessageDto = {
        message: 'Message avec pieces jointes',
        attachments: ['https://example.com/file1.pdf', 'https://example.com/file2.jpg'],
      };
      mockSupportTicketService.addMessage.mockResolvedValue({
        ...mockMessage,
        ...dto,
      });

      // Act
      const _result = await controller.addMessage(mockRegularUser, mockTicket.id, dto);

      // Assert
      expect(mockSupportTicketService.addMessage).toHaveBeenCalledWith(
        mockTicket.id,
        mockRegularUser.id,
        dto,
        false
      );
    });

    it('should propagate NotFoundException for non-existent ticket', async () => {
      // Arrange
      const dto: CreateSupportMessageDto = { message: 'Test message' };
      const error = new NotFoundException('Ticket not found');
      mockSupportTicketService.addMessage.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.addMessage(mockRegularUser, 'non-existent-id', dto)).rejects.toThrow(
        'Ticket not found'
      );
    });

    it('should propagate ForbiddenException for access denied', async () => {
      // Arrange
      const dto: CreateSupportMessageDto = { message: 'Test message' };
      const error = new ForbiddenException('Access denied');
      mockSupportTicketService.addMessage.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.addMessage(mockRegularUser, mockTicket.id, dto)).rejects.toThrow(
        'Access denied'
      );
    });
  });

  // ==========================================================================
  // GET /support/tickets/:id/messages Tests
  // ==========================================================================

  describe('GET /support/tickets/:id/messages', () => {
    it('should return ticket messages for owner', async () => {
      // Arrange
      mockSupportTicketService.getMessages.mockResolvedValue([mockMessage, mockStaffMessage]);

      // Act
      const result = await controller.getMessages(mockRegularUser, mockTicket.id);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockSupportTicketService.getMessages).toHaveBeenCalledWith(
        mockTicket.id,
        mockRegularUser.id,
        false
      );
    });

    it('should return ticket messages for staff', async () => {
      // Arrange
      mockSupportTicketService.getMessages.mockResolvedValue([mockMessage]);

      // Act
      const _result = await controller.getMessages(mockStaffUser, mockTicket.id);

      // Assert
      expect(mockSupportTicketService.getMessages).toHaveBeenCalledWith(
        mockTicket.id,
        mockStaffUser.id,
        true
      );
    });

    it('should return empty array for ticket with no messages', async () => {
      // Arrange
      mockSupportTicketService.getMessages.mockResolvedValue([]);

      // Act
      const result = await controller.getMessages(mockRegularUser, mockTicket.id);

      // Assert
      expect(result).toEqual([]);
    });

    it('should propagate NotFoundException for non-existent ticket', async () => {
      // Arrange
      const error = new NotFoundException('Ticket not found');
      mockSupportTicketService.getMessages.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getMessages(mockRegularUser, 'non-existent-id')).rejects.toThrow(
        'Ticket not found'
      );
    });

    it('should propagate ForbiddenException for access denied', async () => {
      // Arrange
      const error = new ForbiddenException('Access denied');
      mockSupportTicketService.getMessages.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getMessages(mockRegularUser, mockTicket.id)).rejects.toThrow(
        'Access denied'
      );
    });
  });

  // ==========================================================================
  // PATCH /support/tickets/:id Tests (Staff)
  // ==========================================================================

  describe('PATCH /support/tickets/:id', () => {
    it('should update ticket status', async () => {
      // Arrange
      const dto: UpdateSupportTicketDto = { status: SupportTicketStatus.IN_PROGRESS };
      mockSupportTicketService.update.mockResolvedValue({
        ...mockTicket,
        status: SupportTicketStatus.IN_PROGRESS,
      });

      // Act
      const result = await controller.update(mockStaffUser, mockTicket.id, dto);

      // Assert
      expect(result.status).toBe(SupportTicketStatus.IN_PROGRESS);
      expect(mockSupportTicketService.update).toHaveBeenCalledWith(
        mockTicket.id,
        dto,
        mockStaffUser.id
      );
    });

    it('should update ticket priority', async () => {
      // Arrange
      const dto: UpdateSupportTicketDto = { priority: Priority.URGENT };
      mockSupportTicketService.update.mockResolvedValue({
        ...mockTicket,
        priority: Priority.URGENT,
      });

      // Act
      const result = await controller.update(mockStaffUser, mockTicket.id, dto);

      // Assert
      expect(result.priority).toBe(Priority.URGENT);
    });

    it('should update ticket assignee', async () => {
      // Arrange
      const dto: UpdateSupportTicketDto = { assignedTo: staffUser.id };
      mockSupportTicketService.update.mockResolvedValue(mockAssignedTicket);

      // Act
      const result = await controller.update(mockStaffUser, mockTicket.id, dto);

      // Assert
      expect(result.assignedTo).toBe(staffUser.id);
    });

    it('should propagate NotFoundException for non-existent ticket', async () => {
      // Arrange
      const dto: UpdateSupportTicketDto = { priority: Priority.HIGH };
      const error = new NotFoundException('Ticket not found');
      mockSupportTicketService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(mockStaffUser, 'non-existent-id', dto)).rejects.toThrow(
        'Ticket not found'
      );
    });
  });

  // ==========================================================================
  // PATCH /support/tickets/:id/status Tests (Staff)
  // ==========================================================================

  describe('PATCH /support/tickets/:id/status', () => {
    it('should change ticket status to IN_PROGRESS', async () => {
      // Arrange
      const dto: ChangeTicketStatusDto = {
        status: SupportTicketStatus.IN_PROGRESS,
      };
      mockSupportTicketService.changeStatus.mockResolvedValue({
        ...mockTicket,
        status: SupportTicketStatus.IN_PROGRESS,
      });

      // Act
      const result = await controller.changeStatus(mockStaffUser, mockTicket.id, dto);

      // Assert
      expect(result.status).toBe(SupportTicketStatus.IN_PROGRESS);
      expect(mockSupportTicketService.changeStatus).toHaveBeenCalledWith(
        mockTicket.id,
        dto,
        mockStaffUser.id
      );
    });

    it('should change ticket status to RESOLVED with reason', async () => {
      // Arrange
      const dto: ChangeTicketStatusDto = {
        status: SupportTicketStatus.RESOLVED,
        reason: 'Probleme resolu avec succes',
      };
      mockSupportTicketService.changeStatus.mockResolvedValue({
        ...mockTicket,
        status: SupportTicketStatus.RESOLVED,
      });

      // Act
      const result = await controller.changeStatus(mockStaffUser, mockTicket.id, dto);

      // Assert
      expect(result.status).toBe(SupportTicketStatus.RESOLVED);
    });

    it('should change ticket status to WAITING_FOR_USER', async () => {
      // Arrange
      const dto: ChangeTicketStatusDto = {
        status: SupportTicketStatus.WAITING_FOR_USER,
      };
      mockSupportTicketService.changeStatus.mockResolvedValue({
        ...mockTicket,
        status: SupportTicketStatus.WAITING_FOR_USER,
      });

      // Act
      const result = await controller.changeStatus(mockStaffUser, mockTicket.id, dto);

      // Assert
      expect(result.status).toBe(SupportTicketStatus.WAITING_FOR_USER);
    });

    it('should propagate BadRequestException for invalid status transition', async () => {
      // Arrange
      const dto: ChangeTicketStatusDto = {
        status: SupportTicketStatus.OPEN,
      };
      const error = new BadRequestException('Invalid status transition');
      mockSupportTicketService.changeStatus.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.changeStatus(mockStaffUser, mockTicket.id, dto)).rejects.toThrow(
        'Invalid status transition'
      );
    });

    it('should propagate NotFoundException for non-existent ticket', async () => {
      // Arrange
      const dto: ChangeTicketStatusDto = {
        status: SupportTicketStatus.RESOLVED,
      };
      const error = new NotFoundException('Ticket not found');
      mockSupportTicketService.changeStatus.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.changeStatus(mockStaffUser, 'non-existent-id', dto)).rejects.toThrow(
        'Ticket not found'
      );
    });
  });

  // ==========================================================================
  // PATCH /support/tickets/:id/assign Tests (Staff)
  // ==========================================================================

  describe('PATCH /support/tickets/:id/assign', () => {
    it('should assign ticket to staff member', async () => {
      // Arrange
      const dto: AssignTicketDto = { staffId: staffUser.id };
      mockSupportTicketService.assign.mockResolvedValue(mockAssignedTicket);

      // Act
      const result = await controller.assign(mockAdminUser, mockTicket.id, dto);

      // Assert
      expect(result.assignedTo).toBe(staffUser.id);
      expect(mockSupportTicketService.assign).toHaveBeenCalledWith(
        mockTicket.id,
        dto.staffId,
        mockAdminUser.id
      );
    });

    it('should reassign ticket to different staff', async () => {
      // Arrange
      const dto: AssignTicketDto = { staffId: adminUser.id };
      mockSupportTicketService.assign.mockResolvedValue({
        ...mockAssignedTicket,
        assignedTo: adminUser.id,
      });

      // Act
      const result = await controller.assign(mockOrganizerUser, mockAssignedTicket.id, dto);

      // Assert
      expect(result.assignedTo).toBe(adminUser.id);
    });

    it('should propagate NotFoundException for non-existent ticket', async () => {
      // Arrange
      const dto: AssignTicketDto = { staffId: staffUser.id };
      const error = new NotFoundException('Ticket not found');
      mockSupportTicketService.assign.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.assign(mockStaffUser, 'non-existent-id', dto)).rejects.toThrow(
        'Ticket not found'
      );
    });

    it('should propagate NotFoundException for non-existent staff', async () => {
      // Arrange
      const dto: AssignTicketDto = { staffId: 'non-existent-staff' };
      const error = new NotFoundException('Staff not found');
      mockSupportTicketService.assign.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.assign(mockStaffUser, mockTicket.id, dto)).rejects.toThrow(
        'Staff not found'
      );
    });
  });

  // ==========================================================================
  // GET /support/tickets/admin/all Tests (Staff)
  // ==========================================================================

  describe('GET /support/tickets/admin/all', () => {
    it('should return all tickets for staff', async () => {
      // Arrange
      const query: SupportTicketQueryDto = {};
      mockSupportTicketService.findAll.mockResolvedValue({
        tickets: [mockTicket, mockAssignedTicket],
        total: 2,
      });

      // Act
      const result = await controller.findAllTickets(query);

      // Assert
      expect(result.tickets).toHaveLength(2);
      expect(mockSupportTicketService.findAll).toHaveBeenCalledWith(query, undefined, true);
    });

    it('should filter by unassigned tickets', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { unassignedOnly: true };
      mockSupportTicketService.findAll.mockResolvedValue({
        tickets: [mockTicket],
        total: 1,
      });

      // Act
      const result = await controller.findAllTickets(query);

      // Assert
      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].assignedTo).toBeUndefined();
    });

    it('should filter by assigned staff', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { assignedTo: staffUser.id };
      mockSupportTicketService.findAll.mockResolvedValue({
        tickets: [mockAssignedTicket],
        total: 1,
      });

      // Act
      const result = await controller.findAllTickets(query);

      // Assert
      expect(result.tickets[0].assignedTo).toBe(staffUser.id);
    });

    it('should sort tickets', async () => {
      // Arrange
      const query: SupportTicketQueryDto = { sortBy: 'priority', sortOrder: 'desc' };
      mockSupportTicketService.findAll.mockResolvedValue({
        tickets: [{ ...mockTicket, priority: Priority.URGENT }, mockTicket],
        total: 2,
      });

      // Act
      const _result = await controller.findAllTickets(query);

      // Assert
      expect(mockSupportTicketService.findAll).toHaveBeenCalledWith(query, undefined, true);
    });
  });

  // ==========================================================================
  // GET /support/tickets/admin/sla-breaches Tests (Staff)
  // ==========================================================================

  describe('GET /support/tickets/admin/sla-breaches', () => {
    it('should return SLA breaching tickets', async () => {
      // Arrange
      const slaBreachTicket = {
        ...mockTicket,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };
      mockSupportTicketService.getSlaBreachers.mockResolvedValue([slaBreachTicket]);

      // Act
      const result = await controller.getSlaBreaches();

      // Assert
      expect(result).toHaveLength(1);
      expect(mockSupportTicketService.getSlaBreachers).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no SLA breaches', async () => {
      // Arrange
      mockSupportTicketService.getSlaBreachers.mockResolvedValue([]);

      // Act
      const result = await controller.getSlaBreaches();

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET /support/tickets/admin/statistics Tests (Admin)
  // ==========================================================================

  describe('GET /support/tickets/admin/statistics', () => {
    it('should return statistics without festival filter', async () => {
      // Arrange
      mockSupportTicketService.getStatistics.mockResolvedValue(mockStatistics);

      // Act
      const result = await controller.getStatistics();

      // Assert
      expect(result).toEqual(mockStatistics);
      expect(mockSupportTicketService.getStatistics).toHaveBeenCalledWith(undefined);
    });

    it('should return statistics for specific festival', async () => {
      // Arrange
      mockSupportTicketService.getStatistics.mockResolvedValue(mockStatistics);

      // Act
      const _result = await controller.getStatistics(publishedFestival.id);

      // Assert
      expect(mockSupportTicketService.getStatistics).toHaveBeenCalledWith(publishedFestival.id);
    });

    it('should return correct statistics structure', async () => {
      // Arrange
      mockSupportTicketService.getStatistics.mockResolvedValue(mockStatistics);

      // Act
      const result = await controller.getStatistics();

      // Assert
      expect(result).toHaveProperty('totalTickets');
      expect(result).toHaveProperty('openTickets');
      expect(result).toHaveProperty('inProgressTickets');
      expect(result).toHaveProperty('resolvedTickets');
      expect(result).toHaveProperty('closedTickets');
      expect(result).toHaveProperty('averageResolutionTimeHours');
      expect(result).toHaveProperty('slaBreaches');
      expect(result).toHaveProperty('byPriority');
      expect(result).toHaveProperty('byStaff');
    });
  });

  // ==========================================================================
  // PUT /support/tickets/admin/sla-config Tests (Admin)
  // ==========================================================================

  describe('PUT /support/tickets/admin/sla-config', () => {
    it('should update SLA configuration', async () => {
      // Arrange
      const config: SlaConfigDto = {
        lowPriorityHours: 72,
        mediumPriorityHours: 24,
        highPriorityHours: 8,
        urgentPriorityHours: 2,
      };
      mockSupportTicketService.updateSlaConfig.mockReturnValue(undefined);

      // Act
      const result = await controller.updateSlaConfig(config);

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockSupportTicketService.updateSlaConfig).toHaveBeenCalledWith(config);
    });

    it('should update partial SLA configuration', async () => {
      // Arrange
      const config: SlaConfigDto = {
        lowPriorityHours: 96,
        mediumPriorityHours: 48,
        highPriorityHours: 12,
        urgentPriorityHours: 4,
      };
      mockSupportTicketService.updateSlaConfig.mockReturnValue(undefined);

      // Act
      const result = await controller.updateSlaConfig(config);

      // Assert
      expect(result).toEqual({ success: true });
    });
  });

  // ==========================================================================
  // isStaffRole Helper Tests
  // ==========================================================================

  describe('isStaffRole helper', () => {
    it('should identify ADMIN as staff role', async () => {
      // Arrange
      const query: SupportTicketQueryDto = {};
      mockSupportTicketService.findAll.mockResolvedValue({
        tickets: [],
        total: 0,
      });

      // Act
      await controller.findMyTickets(mockAdminUser, query);

      // Assert
      expect(mockSupportTicketService.findAll).toHaveBeenCalledWith(query, mockAdminUser.id, true);
    });

    it('should identify ORGANIZER as staff role', async () => {
      // Arrange
      const query: SupportTicketQueryDto = {};
      mockSupportTicketService.findAll.mockResolvedValue({
        tickets: [],
        total: 0,
      });

      // Act
      await controller.findMyTickets(mockOrganizerUser, query);

      // Assert
      expect(mockSupportTicketService.findAll).toHaveBeenCalledWith(
        query,
        mockOrganizerUser.id,
        true
      );
    });

    it('should identify STAFF as staff role', async () => {
      // Arrange
      const query: SupportTicketQueryDto = {};
      mockSupportTicketService.findAll.mockResolvedValue({
        tickets: [],
        total: 0,
      });

      // Act
      await controller.findMyTickets(mockStaffUser, query);

      // Assert
      expect(mockSupportTicketService.findAll).toHaveBeenCalledWith(query, mockStaffUser.id, true);
    });

    it('should identify USER as non-staff role', async () => {
      // Arrange
      const query: SupportTicketQueryDto = {};
      mockSupportTicketService.findAll.mockResolvedValue({
        tickets: [],
        total: 0,
      });

      // Act
      await controller.findMyTickets(mockRegularUser, query);

      // Assert
      expect(mockSupportTicketService.findAll).toHaveBeenCalledWith(
        query,
        mockRegularUser.id,
        false
      );
    });
  });
});
