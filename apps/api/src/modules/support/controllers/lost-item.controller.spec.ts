/**
 * Lost Item Controller Unit Tests
 *
 * Comprehensive tests for Lost Item endpoints including:
 * - GET /support/lost-items/found/:festivalId (public)
 * - POST /support/lost-items
 * - GET /support/lost-items
 * - GET /support/lost-items/my-items
 * - GET /support/lost-items/:id
 * - PUT /support/lost-items/:id
 * - DELETE /support/lost-items/:id
 * - POST /support/lost-items/:id/claim
 * - PATCH /support/lost-items/:id/found (staff)
 * - PATCH /support/lost-items/:id/returned (staff)
 * - PATCH /support/lost-items/:id/unclaimed (staff)
 * - GET /support/lost-items/admin/statistics (admin)
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LostItemController } from './lost-item.controller';
import { LostItemService } from '../services/lost-item.service';
import {
  CreateLostItemDto,
  UpdateLostItemDto,
  ClaimLostItemDto,
  MarkAsFoundDto,
  LostItemQueryDto,
  LostItemResponseDto,
  LostItemStatisticsDto,
  LostItemStatus,
} from '../dto/lost-item.dto';
import { UserRole } from '@prisma/client';
import {
  regularUser,
  staffUser,
  adminUser,
  organizerUser,
  securityUser,
} from '../../../test/fixtures';
import { publishedFestival } from '../../../test/fixtures';

// ============================================================================
// Mock Setup
// ============================================================================

describe('LostItemController', () => {
  let controller: LostItemController;

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

  const mockSecurityUser: AuthUser = {
    id: securityUser.id,
    email: securityUser.email,
    role: securityUser.role,
  };

  // Mock lost item response
  const mockLostItem: LostItemResponseDto = {
    id: 'lost-item-uuid-00000000-0000-0000-0000-000000000001',
    festivalId: publishedFestival.id,
    reportedBy: regularUser.id,
    description: 'Portefeuille noir en cuir avec initiales J.D.',
    location: 'Pres de la scene principale',
    status: LostItemStatus.REPORTED,
    contactInfo: 'email@example.com',
    imageUrl: 'https://example.com/image.jpg',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    reporter: {
      id: regularUser.id,
      firstName: regularUser.firstName,
      lastName: regularUser.lastName,
      email: regularUser.email,
    },
  };

  const mockFoundItem: LostItemResponseDto = {
    ...mockLostItem,
    status: LostItemStatus.FOUND,
    foundBy: staffUser.id,
    finder: {
      id: staffUser.id,
      firstName: staffUser.firstName,
      lastName: staffUser.lastName,
    },
  };

  const mockStatistics: LostItemStatisticsDto = {
    totalReported: 100,
    totalFound: 60,
    totalReturned: 40,
    totalUnclaimed: 10,
    returnRate: 66.67,
    byFestival: [
      {
        festivalId: publishedFestival.id,
        festivalName: publishedFestival.name,
        reported: 50,
        found: 30,
        returned: 20,
      },
    ],
  };

  const mockLostItemService = {
    getFoundItems: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    getMyReportedItems: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    claim: jest.fn(),
    markAsFound: jest.fn(),
    markAsReturned: jest.fn(),
    markAsUnclaimed: jest.fn(),
    getStatistics: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LostItemController],
      providers: [{ provide: LostItemService, useValue: mockLostItemService }],
    }).compile();

    controller = module.get<LostItemController>(LostItemController);
  });

  // ==========================================================================
  // GET /support/lost-items/found/:festivalId Tests (Public)
  // ==========================================================================

  describe('GET /support/lost-items/found/:festivalId', () => {
    it('should return found items for a festival', async () => {
      // Arrange
      mockLostItemService.getFoundItems.mockResolvedValue([mockFoundItem]);

      // Act
      const result = await controller.getFoundItems(publishedFestival.id);

      // Assert
      expect(result).toEqual([mockFoundItem]);
      expect(mockLostItemService.getFoundItems).toHaveBeenCalledWith(
        publishedFestival.id,
      );
    });

    it('should return empty array when no found items exist', async () => {
      // Arrange
      mockLostItemService.getFoundItems.mockResolvedValue([]);

      // Act
      const result = await controller.getFoundItems(publishedFestival.id);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return multiple found items', async () => {
      // Arrange
      const mockItems = [
        mockFoundItem,
        { ...mockFoundItem, id: 'lost-item-2', description: 'Telephone Samsung' },
      ];
      mockLostItemService.getFoundItems.mockResolvedValue(mockItems);

      // Act
      const result = await controller.getFoundItems(publishedFestival.id);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  // ==========================================================================
  // POST /support/lost-items Tests
  // ==========================================================================

  describe('POST /support/lost-items', () => {
    it('should create a lost item report', async () => {
      // Arrange
      const dto: CreateLostItemDto = {
        festivalId: publishedFestival.id,
        description: 'Sac a dos bleu avec laptop',
        location: 'Zone restauration',
        contactInfo: 'contact@example.com',
      };
      mockLostItemService.create.mockResolvedValue({
        ...mockLostItem,
        ...dto,
      });

      // Act
      const result = await controller.create(mockRegularUser, dto);

      // Assert
      expect(result.description).toBe(dto.description);
      expect(mockLostItemService.create).toHaveBeenCalledWith(
        mockRegularUser.id,
        dto,
      );
    });

    it('should create lost item with image URL', async () => {
      // Arrange
      const dto: CreateLostItemDto = {
        festivalId: publishedFestival.id,
        description: 'Appareil photo Canon',
        imageUrl: 'https://example.com/camera.jpg',
      };
      mockLostItemService.create.mockResolvedValue({
        ...mockLostItem,
        ...dto,
      });

      // Act
      const result = await controller.create(mockRegularUser, dto);

      // Assert
      expect(result.imageUrl).toBe(dto.imageUrl);
    });

    it('should propagate NotFoundException for non-existent festival', async () => {
      // Arrange
      const dto: CreateLostItemDto = {
        festivalId: 'non-existent-festival',
        description: 'Description test',
      };
      const error = new NotFoundException('Festival not found');
      mockLostItemService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(mockRegularUser, dto)).rejects.toThrow(
        'Festival not found',
      );
    });
  });

  // ==========================================================================
  // GET /support/lost-items Tests
  // ==========================================================================

  describe('GET /support/lost-items', () => {
    it('should return lost items with filters', async () => {
      // Arrange
      const query: LostItemQueryDto = { festivalId: publishedFestival.id };
      mockLostItemService.findAll.mockResolvedValue({
        items: [mockLostItem],
        total: 1,
      });

      // Act
      const result = await controller.findAll(mockRegularUser, query);

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockLostItemService.findAll).toHaveBeenCalledWith(
        query,
        mockRegularUser.id,
      );
    });

    it('should filter by status', async () => {
      // Arrange
      const query: LostItemQueryDto = { status: LostItemStatus.FOUND };
      mockLostItemService.findAll.mockResolvedValue({
        items: [mockFoundItem],
        total: 1,
      });

      // Act
      const result = await controller.findAll(mockRegularUser, query);

      // Assert
      expect(result.items[0].status).toBe(LostItemStatus.FOUND);
    });

    it('should paginate results', async () => {
      // Arrange
      const query: LostItemQueryDto = { page: 2, limit: 10 };
      mockLostItemService.findAll.mockResolvedValue({
        items: [mockLostItem],
        total: 25,
      });

      // Act
      const result = await controller.findAll(mockRegularUser, query);

      // Assert
      expect(mockLostItemService.findAll).toHaveBeenCalledWith(
        query,
        mockRegularUser.id,
      );
    });

    it('should search by description', async () => {
      // Arrange
      const query: LostItemQueryDto = { search: 'portefeuille' };
      mockLostItemService.findAll.mockResolvedValue({
        items: [mockLostItem],
        total: 1,
      });

      // Act
      const result = await controller.findAll(mockRegularUser, query);

      // Assert
      expect(mockLostItemService.findAll).toHaveBeenCalledWith(
        query,
        mockRegularUser.id,
      );
    });
  });

  // ==========================================================================
  // GET /support/lost-items/my-items Tests
  // ==========================================================================

  describe('GET /support/lost-items/my-items', () => {
    it('should return user reported items', async () => {
      // Arrange
      mockLostItemService.getMyReportedItems.mockResolvedValue([mockLostItem]);

      // Act
      const result = await controller.getMyItems(mockRegularUser);

      // Assert
      expect(result).toEqual([mockLostItem]);
      expect(mockLostItemService.getMyReportedItems).toHaveBeenCalledWith(
        mockRegularUser.id,
      );
    });

    it('should return empty array when user has no reports', async () => {
      // Arrange
      mockLostItemService.getMyReportedItems.mockResolvedValue([]);

      // Act
      const result = await controller.getMyItems(mockRegularUser);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET /support/lost-items/:id Tests
  // ==========================================================================

  describe('GET /support/lost-items/:id', () => {
    it('should return a lost item by ID', async () => {
      // Arrange
      mockLostItemService.findById.mockResolvedValue(mockLostItem);

      // Act
      const result = await controller.findById(mockLostItem.id);

      // Assert
      expect(result).toEqual(mockLostItem);
      expect(mockLostItemService.findById).toHaveBeenCalledWith(mockLostItem.id);
    });

    it('should propagate NotFoundException for non-existent item', async () => {
      // Arrange
      const error = new NotFoundException('Item not found');
      mockLostItemService.findById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findById('non-existent-id')).rejects.toThrow(
        'Item not found',
      );
    });
  });

  // ==========================================================================
  // PUT /support/lost-items/:id Tests
  // ==========================================================================

  describe('PUT /support/lost-items/:id', () => {
    it('should update a lost item as owner', async () => {
      // Arrange
      const dto: UpdateLostItemDto = {
        description: 'Updated description',
        location: 'Updated location',
      };
      mockLostItemService.update.mockResolvedValue({
        ...mockLostItem,
        ...dto,
      });

      // Act
      const result = await controller.update(
        mockRegularUser,
        mockLostItem.id,
        dto,
      );

      // Assert
      expect(result.description).toBe(dto.description);
      expect(mockLostItemService.update).toHaveBeenCalledWith(
        mockLostItem.id,
        dto,
        mockRegularUser.id,
        false,
      );
    });

    it('should update a lost item as staff', async () => {
      // Arrange
      const dto: UpdateLostItemDto = { status: LostItemStatus.FOUND };
      mockLostItemService.update.mockResolvedValue({
        ...mockLostItem,
        status: LostItemStatus.FOUND,
      });

      // Act
      const result = await controller.update(mockStaffUser, mockLostItem.id, dto);

      // Assert
      expect(result.status).toBe(LostItemStatus.FOUND);
      expect(mockLostItemService.update).toHaveBeenCalledWith(
        mockLostItem.id,
        dto,
        mockStaffUser.id,
        true,
      );
    });

    it('should update a lost item as admin', async () => {
      // Arrange
      const dto: UpdateLostItemDto = { status: LostItemStatus.RETURNED };
      mockLostItemService.update.mockResolvedValue({
        ...mockLostItem,
        status: LostItemStatus.RETURNED,
      });

      // Act
      const result = await controller.update(mockAdminUser, mockLostItem.id, dto);

      // Assert
      expect(mockLostItemService.update).toHaveBeenCalledWith(
        mockLostItem.id,
        dto,
        mockAdminUser.id,
        true,
      );
    });

    it('should propagate ForbiddenException for unauthorized user', async () => {
      // Arrange
      const dto: UpdateLostItemDto = { description: 'Updated' };
      const error = new ForbiddenException('Not authorized');
      mockLostItemService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.update(mockRegularUser, mockLostItem.id, dto),
      ).rejects.toThrow('Not authorized');
    });

    it('should propagate NotFoundException for non-existent item', async () => {
      // Arrange
      const dto: UpdateLostItemDto = { description: 'Updated' };
      const error = new NotFoundException('Item not found');
      mockLostItemService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.update(mockRegularUser, 'non-existent-id', dto),
      ).rejects.toThrow('Item not found');
    });
  });

  // ==========================================================================
  // DELETE /support/lost-items/:id Tests
  // ==========================================================================

  describe('DELETE /support/lost-items/:id', () => {
    it('should delete a lost item as owner', async () => {
      // Arrange
      mockLostItemService.delete.mockResolvedValue(undefined);

      // Act
      const result = await controller.delete(mockRegularUser, mockLostItem.id);

      // Assert
      expect(result).toBeUndefined();
      expect(mockLostItemService.delete).toHaveBeenCalledWith(
        mockLostItem.id,
        mockRegularUser.id,
        false,
      );
    });

    it('should delete a lost item as staff', async () => {
      // Arrange
      mockLostItemService.delete.mockResolvedValue(undefined);

      // Act
      await controller.delete(mockStaffUser, mockLostItem.id);

      // Assert
      expect(mockLostItemService.delete).toHaveBeenCalledWith(
        mockLostItem.id,
        mockStaffUser.id,
        true,
      );
    });

    it('should propagate ForbiddenException for unauthorized user', async () => {
      // Arrange
      const error = new ForbiddenException('Not authorized');
      mockLostItemService.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.delete(mockRegularUser, mockLostItem.id),
      ).rejects.toThrow('Not authorized');
    });

    it('should propagate NotFoundException for non-existent item', async () => {
      // Arrange
      const error = new NotFoundException('Item not found');
      mockLostItemService.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.delete(mockRegularUser, 'non-existent-id'),
      ).rejects.toThrow('Item not found');
    });
  });

  // ==========================================================================
  // POST /support/lost-items/:id/claim Tests
  // ==========================================================================

  describe('POST /support/lost-items/:id/claim', () => {
    it('should claim a found item', async () => {
      // Arrange
      const dto: ClaimLostItemDto = {
        proofOfOwnership:
          'Le portefeuille contient ma carte avec mon nom et adresse...',
        contactInfo: 'Disponible au stand info',
      };
      mockLostItemService.claim.mockResolvedValue({
        ...mockFoundItem,
        claimedAt: new Date(),
      });

      // Act
      const result = await controller.claim(
        mockRegularUser,
        mockFoundItem.id,
        dto,
      );

      // Assert
      expect(result.claimedAt).toBeDefined();
      expect(mockLostItemService.claim).toHaveBeenCalledWith(
        mockFoundItem.id,
        mockRegularUser.id,
        dto,
      );
    });

    it('should propagate BadRequestException when item cannot be claimed', async () => {
      // Arrange
      const dto: ClaimLostItemDto = {
        proofOfOwnership: 'Some proof of ownership text...',
      };
      const error = new BadRequestException('Item cannot be claimed');
      mockLostItemService.claim.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.claim(mockRegularUser, mockLostItem.id, dto),
      ).rejects.toThrow('Item cannot be claimed');
    });

    it('should propagate NotFoundException for non-existent item', async () => {
      // Arrange
      const dto: ClaimLostItemDto = {
        proofOfOwnership: 'Some proof of ownership text...',
      };
      const error = new NotFoundException('Item not found');
      mockLostItemService.claim.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.claim(mockRegularUser, 'non-existent-id', dto),
      ).rejects.toThrow('Item not found');
    });
  });

  // ==========================================================================
  // PATCH /support/lost-items/:id/found Tests (Staff)
  // ==========================================================================

  describe('PATCH /support/lost-items/:id/found', () => {
    it('should mark item as found by staff', async () => {
      // Arrange
      const dto: MarkAsFoundDto = {
        foundLocation: 'Trouve au stand restauration zone B',
        notes: 'Item en bon etat',
      };
      mockLostItemService.markAsFound.mockResolvedValue(mockFoundItem);

      // Act
      const result = await controller.markAsFound(
        mockStaffUser,
        mockLostItem.id,
        dto,
      );

      // Assert
      expect(result.status).toBe(LostItemStatus.FOUND);
      expect(mockLostItemService.markAsFound).toHaveBeenCalledWith(
        mockLostItem.id,
        mockStaffUser.id,
        dto,
      );
    });

    it('should mark item as found by security', async () => {
      // Arrange
      const dto: MarkAsFoundDto = {
        foundLocation: 'Entree principale',
      };
      mockLostItemService.markAsFound.mockResolvedValue(mockFoundItem);

      // Act
      await controller.markAsFound(mockSecurityUser, mockLostItem.id, dto);

      // Assert
      expect(mockLostItemService.markAsFound).toHaveBeenCalledWith(
        mockLostItem.id,
        mockSecurityUser.id,
        dto,
      );
    });

    it('should propagate BadRequestException when item already processed', async () => {
      // Arrange
      const dto: MarkAsFoundDto = { foundLocation: 'Location' };
      const error = new BadRequestException('Item already processed');
      mockLostItemService.markAsFound.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.markAsFound(mockStaffUser, mockLostItem.id, dto),
      ).rejects.toThrow('Item already processed');
    });

    it('should propagate NotFoundException for non-existent item', async () => {
      // Arrange
      const dto: MarkAsFoundDto = { foundLocation: 'Location' };
      const error = new NotFoundException('Item not found');
      mockLostItemService.markAsFound.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.markAsFound(mockStaffUser, 'non-existent-id', dto),
      ).rejects.toThrow('Item not found');
    });
  });

  // ==========================================================================
  // PATCH /support/lost-items/:id/returned Tests (Staff)
  // ==========================================================================

  describe('PATCH /support/lost-items/:id/returned', () => {
    it('should mark item as returned by staff', async () => {
      // Arrange
      mockLostItemService.markAsReturned.mockResolvedValue({
        ...mockFoundItem,
        status: LostItemStatus.RETURNED,
      });

      // Act
      const result = await controller.markAsReturned(
        mockStaffUser,
        mockFoundItem.id,
      );

      // Assert
      expect(result.status).toBe(LostItemStatus.RETURNED);
      expect(mockLostItemService.markAsReturned).toHaveBeenCalledWith(
        mockFoundItem.id,
        mockStaffUser.id,
      );
    });

    it('should propagate BadRequestException when item not in FOUND status', async () => {
      // Arrange
      const error = new BadRequestException('Item not in FOUND status');
      mockLostItemService.markAsReturned.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.markAsReturned(mockStaffUser, mockLostItem.id),
      ).rejects.toThrow('Item not in FOUND status');
    });

    it('should propagate NotFoundException for non-existent item', async () => {
      // Arrange
      const error = new NotFoundException('Item not found');
      mockLostItemService.markAsReturned.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.markAsReturned(mockStaffUser, 'non-existent-id'),
      ).rejects.toThrow('Item not found');
    });
  });

  // ==========================================================================
  // PATCH /support/lost-items/:id/unclaimed Tests (Staff)
  // ==========================================================================

  describe('PATCH /support/lost-items/:id/unclaimed', () => {
    it('should mark item as unclaimed', async () => {
      // Arrange
      mockLostItemService.markAsUnclaimed.mockResolvedValue({
        ...mockFoundItem,
        status: LostItemStatus.UNCLAIMED,
      });

      // Act
      const result = await controller.markAsUnclaimed(mockFoundItem.id);

      // Assert
      expect(result.status).toBe(LostItemStatus.UNCLAIMED);
      expect(mockLostItemService.markAsUnclaimed).toHaveBeenCalledWith(
        mockFoundItem.id,
      );
    });

    it('should propagate NotFoundException for non-existent item', async () => {
      // Arrange
      const error = new NotFoundException('Item not found');
      mockLostItemService.markAsUnclaimed.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.markAsUnclaimed('non-existent-id'),
      ).rejects.toThrow('Item not found');
    });
  });

  // ==========================================================================
  // GET /support/lost-items/admin/statistics Tests (Admin)
  // ==========================================================================

  describe('GET /support/lost-items/admin/statistics', () => {
    it('should return statistics without festival filter', async () => {
      // Arrange
      mockLostItemService.getStatistics.mockResolvedValue(mockStatistics);

      // Act
      const result = await controller.getStatistics();

      // Assert
      expect(result).toEqual(mockStatistics);
      expect(mockLostItemService.getStatistics).toHaveBeenCalledWith(undefined);
    });

    it('should return statistics for specific festival', async () => {
      // Arrange
      mockLostItemService.getStatistics.mockResolvedValue(mockStatistics);

      // Act
      const result = await controller.getStatistics(publishedFestival.id);

      // Assert
      expect(result).toEqual(mockStatistics);
      expect(mockLostItemService.getStatistics).toHaveBeenCalledWith(
        publishedFestival.id,
      );
    });

    it('should return correct statistics structure', async () => {
      // Arrange
      mockLostItemService.getStatistics.mockResolvedValue(mockStatistics);

      // Act
      const result = await controller.getStatistics();

      // Assert
      expect(result).toHaveProperty('totalReported');
      expect(result).toHaveProperty('totalFound');
      expect(result).toHaveProperty('totalReturned');
      expect(result).toHaveProperty('totalUnclaimed');
      expect(result).toHaveProperty('returnRate');
      expect(result).toHaveProperty('byFestival');
    });
  });

  // ==========================================================================
  // isStaffRole Helper Tests
  // ==========================================================================

  describe('isStaffRole helper', () => {
    it('should identify ADMIN as staff role', async () => {
      // Arrange
      const dto: UpdateLostItemDto = { description: 'Test' };
      mockLostItemService.update.mockResolvedValue(mockLostItem);

      // Act
      await controller.update(mockAdminUser, mockLostItem.id, dto);

      // Assert
      expect(mockLostItemService.update).toHaveBeenCalledWith(
        mockLostItem.id,
        dto,
        mockAdminUser.id,
        true,
      );
    });

    it('should identify ORGANIZER as staff role', async () => {
      // Arrange
      const mockOrganizerUser: AuthUser = {
        id: organizerUser.id,
        email: organizerUser.email,
        role: organizerUser.role,
      };
      const dto: UpdateLostItemDto = { description: 'Test' };
      mockLostItemService.update.mockResolvedValue(mockLostItem);

      // Act
      await controller.update(mockOrganizerUser, mockLostItem.id, dto);

      // Assert
      expect(mockLostItemService.update).toHaveBeenCalledWith(
        mockLostItem.id,
        dto,
        mockOrganizerUser.id,
        true,
      );
    });

    it('should identify STAFF as staff role', async () => {
      // Arrange
      const dto: UpdateLostItemDto = { description: 'Test' };
      mockLostItemService.update.mockResolvedValue(mockLostItem);

      // Act
      await controller.update(mockStaffUser, mockLostItem.id, dto);

      // Assert
      expect(mockLostItemService.update).toHaveBeenCalledWith(
        mockLostItem.id,
        dto,
        mockStaffUser.id,
        true,
      );
    });

    it('should identify SECURITY as staff role', async () => {
      // Arrange
      const dto: UpdateLostItemDto = { description: 'Test' };
      mockLostItemService.update.mockResolvedValue(mockLostItem);

      // Act
      await controller.update(mockSecurityUser, mockLostItem.id, dto);

      // Assert
      expect(mockLostItemService.update).toHaveBeenCalledWith(
        mockLostItem.id,
        dto,
        mockSecurityUser.id,
        true,
      );
    });

    it('should identify USER as non-staff role', async () => {
      // Arrange
      const dto: UpdateLostItemDto = { description: 'Test' };
      mockLostItemService.update.mockResolvedValue(mockLostItem);

      // Act
      await controller.update(mockRegularUser, mockLostItem.id, dto);

      // Assert
      expect(mockLostItemService.update).toHaveBeenCalledWith(
        mockLostItem.id,
        dto,
        mockRegularUser.id,
        false,
      );
    });
  });
});
