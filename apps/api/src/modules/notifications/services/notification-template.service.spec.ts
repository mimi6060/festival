/**
 * NotificationTemplateService Unit Tests
 *
 * Comprehensive tests for notification template functionality including:
 * - Creating templates
 * - Updating templates
 * - Deleting templates
 * - Getting templates by ID, name, type
 * - Getting all templates
 * - Seeding default templates
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTemplateService } from './notification-template.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
} from '../dto';

describe('NotificationTemplateService', () => {
  let templateService: NotificationTemplateService;
  let _prismaService: jest.Mocked<PrismaService>;

  // Mock data
  const mockTemplateId = 'template-uuid-123';

  const mockTemplate = {
    id: mockTemplateId,
    name: 'ticket_purchased',
    type: NotificationType.TICKET_PURCHASED,
    titleTemplate: 'Billet confirme !',
    bodyTemplate:
      'Votre billet {{ticketType}} pour {{festivalName}} a ete confirme.',
    defaultImageUrl: null,
    defaultActionUrl: '/tickets',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaymentTemplate = {
    id: 'template-uuid-456',
    name: 'payment_success',
    type: NotificationType.PAYMENT_SUCCESS,
    titleTemplate: 'Paiement reussi',
    bodyTemplate: 'Votre paiement de {{amount}} EUR a ete confirme.',
    defaultImageUrl: null,
    defaultActionUrl: '/payments',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInactiveTemplate = {
    id: 'template-uuid-789',
    name: 'promo_old',
    type: NotificationType.PROMO,
    titleTemplate: 'Old Promo',
    bodyTemplate: 'Old promo body',
    defaultImageUrl: null,
    defaultActionUrl: '/promotions',
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    notificationTemplate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplateService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    templateService = module.get<NotificationTemplateService>(
      NotificationTemplateService,
    );
    _prismaService = module.get(PrismaService);
  });

  // ==========================================================================
  // Service Definition Tests
  // ==========================================================================

  describe('service definition', () => {
    it('should be defined', () => {
      expect(templateService).toBeDefined();
    });
  });

  // ==========================================================================
  // create Tests
  // ==========================================================================

  describe('create', () => {
    it('should create a new template successfully', async () => {
      // Arrange
      const createDto: CreateNotificationTemplateDto = {
        name: 'new_template',
        type: NotificationType.SYSTEM,
        titleTemplate: 'New Template',
        bodyTemplate: 'New template body with {{variable}}',
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue({
        id: 'new-template-id',
        ...createDto,
        defaultImageUrl: null,
        defaultActionUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await templateService.create(createDto);

      // Assert
      expect(result.name).toBe('new_template');
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw ConflictException if template name already exists', async () => {
      // Arrange
      const createDto: CreateNotificationTemplateDto = {
        name: 'ticket_purchased',
        type: NotificationType.TICKET_PURCHASED,
        titleTemplate: 'Duplicate',
        bodyTemplate: 'Duplicate body',
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );

      // Act & Assert
      await expect(templateService.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(templateService.create(createDto)).rejects.toThrow(
        "Template 'ticket_purchased' already exists",
      );
    });

    it('should create template with optional fields', async () => {
      // Arrange
      const createDto: CreateNotificationTemplateDto = {
        name: 'promo_template',
        type: NotificationType.PROMO,
        titleTemplate: 'Promo Title',
        bodyTemplate: 'Promo body',
        defaultImageUrl: 'https://example.com/promo.jpg',
        defaultActionUrl: '/promotions/special',
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue({
        id: 'promo-template-id',
        ...createDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await templateService.create(createDto);

      // Assert
      expect(result.defaultImageUrl).toBe('https://example.com/promo.jpg');
      expect(result.defaultActionUrl).toBe('/promotions/special');
    });

    it('should create template for each notification type', async () => {
      // Arrange
      const types = Object.values(NotificationType);
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);

      for (const type of types) {
        const createDto: CreateNotificationTemplateDto = {
          name: `template_${type.toLowerCase()}`,
          type,
          titleTemplate: `Title for ${type}`,
          bodyTemplate: `Body for ${type}`,
        };
        mockPrismaService.notificationTemplate.create.mockResolvedValue({
          id: `template-${type}`,
          ...createDto,
          defaultImageUrl: null,
          defaultActionUrl: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Act
        const result = await templateService.create(createDto);

        // Assert
        expect(result.type).toBe(type);
      }
    });
  });

  // ==========================================================================
  // update Tests
  // ==========================================================================

  describe('update', () => {
    it('should update template successfully', async () => {
      // Arrange
      const updateDto: UpdateNotificationTemplateDto = {
        titleTemplate: 'Updated Title',
        bodyTemplate: 'Updated body',
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.notificationTemplate.update.mockResolvedValue({
        ...mockTemplate,
        ...updateDto,
      });

      // Act
      const result = await templateService.update(mockTemplateId, updateDto);

      // Assert
      expect(result.titleTemplate).toBe('Updated Title');
      expect(result.bodyTemplate).toBe('Updated body');
      expect(mockPrismaService.notificationTemplate.update).toHaveBeenCalledWith({
        where: { id: mockTemplateId },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        templateService.update('non-existent-id', { titleTemplate: 'New' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        templateService.update('non-existent-id', { titleTemplate: 'New' }),
      ).rejects.toThrow('Template not found');
    });

    it('should update only title template', async () => {
      // Arrange
      const updateDto: UpdateNotificationTemplateDto = {
        titleTemplate: 'Only Title Updated',
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.notificationTemplate.update.mockResolvedValue({
        ...mockTemplate,
        titleTemplate: 'Only Title Updated',
      });

      // Act
      const result = await templateService.update(mockTemplateId, updateDto);

      // Assert
      expect(result.titleTemplate).toBe('Only Title Updated');
      expect(result.bodyTemplate).toBe(mockTemplate.bodyTemplate);
    });

    it('should update only body template', async () => {
      // Arrange
      const updateDto: UpdateNotificationTemplateDto = {
        bodyTemplate: 'Only Body Updated',
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.notificationTemplate.update.mockResolvedValue({
        ...mockTemplate,
        bodyTemplate: 'Only Body Updated',
      });

      // Act
      const result = await templateService.update(mockTemplateId, updateDto);

      // Assert
      expect(result.bodyTemplate).toBe('Only Body Updated');
      expect(result.titleTemplate).toBe(mockTemplate.titleTemplate);
    });

    it('should update isActive status', async () => {
      // Arrange
      const updateDto: UpdateNotificationTemplateDto = {
        isActive: false,
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.notificationTemplate.update.mockResolvedValue({
        ...mockTemplate,
        isActive: false,
      });

      // Act
      const result = await templateService.update(mockTemplateId, updateDto);

      // Assert
      expect(result.isActive).toBe(false);
    });

    it('should update default URLs', async () => {
      // Arrange
      const updateDto: UpdateNotificationTemplateDto = {
        defaultImageUrl: 'https://new-image.com/image.jpg',
        defaultActionUrl: '/new-action',
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.notificationTemplate.update.mockResolvedValue({
        ...mockTemplate,
        ...updateDto,
      });

      // Act
      const result = await templateService.update(mockTemplateId, updateDto);

      // Assert
      expect(result.defaultImageUrl).toBe('https://new-image.com/image.jpg');
      expect(result.defaultActionUrl).toBe('/new-action');
    });
  });

  // ==========================================================================
  // delete Tests
  // ==========================================================================

  describe('delete', () => {
    it('should delete template successfully', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.notificationTemplate.delete.mockResolvedValue(
        mockTemplate,
      );

      // Act
      await templateService.delete(mockTemplateId);

      // Assert
      expect(mockPrismaService.notificationTemplate.delete).toHaveBeenCalledWith({
        where: { id: mockTemplateId },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(templateService.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(templateService.delete('non-existent-id')).rejects.toThrow(
        'Template not found',
      );
    });

    it('should delete inactive template', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(
        mockInactiveTemplate,
      );
      mockPrismaService.notificationTemplate.delete.mockResolvedValue(
        mockInactiveTemplate,
      );

      // Act
      await templateService.delete(mockInactiveTemplate.id);

      // Assert
      expect(mockPrismaService.notificationTemplate.delete).toHaveBeenCalledWith({
        where: { id: mockInactiveTemplate.id },
      });
    });
  });

  // ==========================================================================
  // getById Tests
  // ==========================================================================

  describe('getById', () => {
    it('should return template when found', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );

      // Act
      const result = await templateService.getById(mockTemplateId);

      // Assert
      expect(result).toEqual(mockTemplate);
      expect(mockPrismaService.notificationTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: mockTemplateId },
      });
    });

    it('should return null when template not found', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);

      // Act
      const result = await templateService.getById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // getByName Tests
  // ==========================================================================

  describe('getByName', () => {
    it('should return template when found by name', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );

      // Act
      const result = await templateService.getByName('ticket_purchased');

      // Assert
      expect(result).toEqual(mockTemplate);
      expect(mockPrismaService.notificationTemplate.findUnique).toHaveBeenCalledWith({
        where: { name: 'ticket_purchased' },
      });
    });

    it('should return null when template name not found', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);

      // Act
      const result = await templateService.getByName('non_existent');

      // Assert
      expect(result).toBeNull();
    });

    it('should be case sensitive for name lookup', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);

      // Act
      const result = await templateService.getByName('TICKET_PURCHASED');

      // Assert
      expect(result).toBeNull();
      expect(mockPrismaService.notificationTemplate.findUnique).toHaveBeenCalledWith({
        where: { name: 'TICKET_PURCHASED' },
      });
    });
  });

  // ==========================================================================
  // getByType Tests
  // ==========================================================================

  describe('getByType', () => {
    it('should return active templates of specified type', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findMany.mockResolvedValue([
        mockTemplate,
      ]);

      // Act
      const result = await templateService.getByType(
        NotificationType.TICKET_PURCHASED,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(NotificationType.TICKET_PURCHASED);
      expect(mockPrismaService.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: { type: NotificationType.TICKET_PURCHASED, isActive: true },
      });
    });

    it('should return empty array when no templates of type exist', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findMany.mockResolvedValue([]);

      // Act
      const result = await templateService.getByType(
        NotificationType.SECURITY_ALERT,
      );

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should return multiple templates of same type', async () => {
      // Arrange
      const template1 = { ...mockTemplate, id: 'template-1', name: 'ticket_v1' };
      const template2 = { ...mockTemplate, id: 'template-2', name: 'ticket_v2' };
      mockPrismaService.notificationTemplate.findMany.mockResolvedValue([
        template1,
        template2,
      ]);

      // Act
      const result = await templateService.getByType(
        NotificationType.TICKET_PURCHASED,
      );

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should only return active templates', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findMany.mockResolvedValue([]);

      // Act
      await templateService.getByType(NotificationType.PROMO);

      // Assert
      expect(mockPrismaService.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: { type: NotificationType.PROMO, isActive: true },
      });
    });
  });

  // ==========================================================================
  // getAll Tests
  // ==========================================================================

  describe('getAll', () => {
    it('should return all active templates by default', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findMany.mockResolvedValue([
        mockTemplate,
        mockPaymentTemplate,
      ]);

      // Act
      const result = await templateService.getAll();

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrismaService.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });

    it('should return all templates including inactive when requested', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findMany.mockResolvedValue([
        mockTemplate,
        mockPaymentTemplate,
        mockInactiveTemplate,
      ]);

      // Act
      const result = await templateService.getAll(true);

      // Assert
      expect(result).toHaveLength(3);
      expect(mockPrismaService.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { name: 'asc' },
      });
    });

    it('should return templates ordered by name', async () => {
      // Arrange
      const templateA = { ...mockTemplate, name: 'a_template' };
      const templateB = { ...mockPaymentTemplate, name: 'b_template' };
      const templateC = { ...mockTemplate, id: 'c', name: 'c_template' };
      mockPrismaService.notificationTemplate.findMany.mockResolvedValue([
        templateA,
        templateB,
        templateC,
      ]);

      // Act
      const result = await templateService.getAll();

      // Assert
      expect(result[0].name).toBe('a_template');
      expect(mockPrismaService.notificationTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('should return empty array when no templates exist', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findMany.mockResolvedValue([]);

      // Act
      const result = await templateService.getAll();

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // seedDefaultTemplates Tests
  // ==========================================================================

  describe('seedDefaultTemplates', () => {
    it('should create default templates when none exist', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue(
        mockTemplate,
      );

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      // Should check for 10 default templates
      expect(
        mockPrismaService.notificationTemplate.findUnique,
      ).toHaveBeenCalledTimes(10);
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledTimes(
        10,
      );
    });

    it('should not create templates that already exist', async () => {
      // Arrange - all templates exist
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      expect(mockPrismaService.notificationTemplate.create).not.toHaveBeenCalled();
    });

    it('should create only missing templates', async () => {
      // Arrange - some templates exist, some don't
      let callCount = 0;
      mockPrismaService.notificationTemplate.findUnique.mockImplementation(() => {
        callCount++;
        // First 5 exist, rest don't
        return Promise.resolve(callCount <= 5 ? mockTemplate : null);
      });
      mockPrismaService.notificationTemplate.create.mockResolvedValue(
        mockTemplate,
      );

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledTimes(5);
    });

    it('should seed ticket_purchased template with correct data', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue(
        mockTemplate,
      );

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'ticket_purchased',
          type: NotificationType.TICKET_PURCHASED,
          titleTemplate: 'Billet confirme !',
          defaultActionUrl: '/tickets',
        }),
      });
    });

    it('should seed payment_success template with correct data', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue(
        mockTemplate,
      );

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'payment_success',
          type: NotificationType.PAYMENT_SUCCESS,
          defaultActionUrl: '/payments',
        }),
      });
    });

    it('should seed payment_failed template with correct data', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue(
        mockTemplate,
      );

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'payment_failed',
          type: NotificationType.PAYMENT_FAILED,
        }),
      });
    });

    it('should seed cashless_topup template with correct data', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue(
        mockTemplate,
      );

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'cashless_topup',
          type: NotificationType.CASHLESS_TOPUP,
          defaultActionUrl: '/cashless',
        }),
      });
    });

    it('should seed artist_reminder template with correct data', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue(
        mockTemplate,
      );

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'artist_reminder',
          type: NotificationType.ARTIST_REMINDER,
          defaultActionUrl: '/program',
        }),
      });
    });

    it('should seed schedule_change template with correct data', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue(
        mockTemplate,
      );

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'schedule_change',
          type: NotificationType.SCHEDULE_CHANGE,
          defaultActionUrl: '/program',
        }),
      });
    });

    it('should seed festival_update template with correct data', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue(
        mockTemplate,
      );

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'festival_update',
          type: NotificationType.FESTIVAL_UPDATE,
          defaultActionUrl: '/info',
        }),
      });
    });

    it('should seed security_alert template with correct data', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue(
        mockTemplate,
      );

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'security_alert',
          type: NotificationType.SECURITY_ALERT,
          defaultActionUrl: '/info',
        }),
      });
    });

    it('should seed vendor_order_ready template with correct data', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue(
        mockTemplate,
      );

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'vendor_order_ready',
          type: NotificationType.VENDOR_ORDER,
        }),
      });
    });

    it('should seed promo template with correct data', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue(
        mockTemplate,
      );

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'promo',
          type: NotificationType.PROMO,
          defaultActionUrl: '/promotions',
        }),
      });
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle template with special characters in name', async () => {
      // Arrange
      const createDto: CreateNotificationTemplateDto = {
        name: 'template_with-special.chars_123',
        type: NotificationType.SYSTEM,
        titleTemplate: 'Title',
        bodyTemplate: 'Body',
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue({
        id: 'new-id',
        ...createDto,
        defaultImageUrl: null,
        defaultActionUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await templateService.create(createDto);

      // Assert
      expect(result.name).toBe('template_with-special.chars_123');
    });

    it('should handle template with unicode characters in title', async () => {
      // Arrange
      const createDto: CreateNotificationTemplateDto = {
        name: 'unicode_template',
        type: NotificationType.SYSTEM,
        titleTemplate: 'Notification title!',
        bodyTemplate: 'Body with emojis and accents: eaoiu',
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue({
        id: 'unicode-id',
        ...createDto,
        defaultImageUrl: null,
        defaultActionUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await templateService.create(createDto);

      // Assert
      expect(result.titleTemplate).toBe('Notification title!');
    });

    it('should handle very long template body', async () => {
      // Arrange
      const longBody = 'a'.repeat(5000);
      const createDto: CreateNotificationTemplateDto = {
        name: 'long_body_template',
        type: NotificationType.SYSTEM,
        titleTemplate: 'Title',
        bodyTemplate: longBody,
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue({
        id: 'long-id',
        ...createDto,
        defaultImageUrl: null,
        defaultActionUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await templateService.create(createDto);

      // Assert
      expect(result.bodyTemplate.length).toBe(5000);
    });

    it('should handle template with multiple Handlebars variables', async () => {
      // Arrange
      const createDto: CreateNotificationTemplateDto = {
        name: 'multi_var_template',
        type: NotificationType.SYSTEM,
        titleTemplate: 'Hello {{firstName}} {{lastName}}!',
        bodyTemplate:
          'Your order #{{orderId}} for {{itemName}} ({{quantity}}x) is {{status}}. Total: {{amount}} {{currency}}.',
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue({
        id: 'multi-var-id',
        ...createDto,
        defaultImageUrl: null,
        defaultActionUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await templateService.create(createDto);

      // Assert
      expect(result.bodyTemplate).toContain('{{orderId}}');
      expect(result.bodyTemplate).toContain('{{itemName}}');
      expect(result.bodyTemplate).toContain('{{quantity}}');
    });

    it('should handle concurrent getById calls', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );

      // Act
      const [result1, result2, result3] = await Promise.all([
        templateService.getById(mockTemplateId),
        templateService.getById(mockTemplateId),
        templateService.getById(mockTemplateId),
      ]);

      // Assert
      expect(result1).toEqual(mockTemplate);
      expect(result2).toEqual(mockTemplate);
      expect(result3).toEqual(mockTemplate);
    });

    it('should handle empty template title', async () => {
      // Arrange
      const createDto: CreateNotificationTemplateDto = {
        name: 'empty_title_template',
        type: NotificationType.SYSTEM,
        titleTemplate: '',
        bodyTemplate: 'Body content',
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue({
        id: 'empty-title-id',
        ...createDto,
        defaultImageUrl: null,
        defaultActionUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await templateService.create(createDto);

      // Assert
      expect(result.titleTemplate).toBe('');
    });

    it('should update template with empty optional fields', async () => {
      // Arrange
      const updateDto: UpdateNotificationTemplateDto = {
        defaultImageUrl: null,
        defaultActionUrl: null,
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.notificationTemplate.update.mockResolvedValue({
        ...mockTemplate,
        defaultImageUrl: null,
        defaultActionUrl: null,
      });

      // Act
      const result = await templateService.update(mockTemplateId, updateDto);

      // Assert
      expect(result.defaultImageUrl).toBeNull();
      expect(result.defaultActionUrl).toBeNull();
    });
  });

  // ==========================================================================
  // Notification Type Coverage Tests
  // ==========================================================================

  describe('Notification Type Coverage', () => {
    it.each([
      NotificationType.TICKET_PURCHASED,
      NotificationType.PAYMENT_SUCCESS,
      NotificationType.PAYMENT_FAILED,
      NotificationType.CASHLESS_TOPUP,
      NotificationType.ARTIST_REMINDER,
      NotificationType.FESTIVAL_UPDATE,
      NotificationType.SCHEDULE_CHANGE,
      NotificationType.SECURITY_ALERT,
      NotificationType.PROMO,
      NotificationType.VENDOR_ORDER,
      NotificationType.SYSTEM,
    ])('should handle %s notification type', async (type) => {
      // Arrange
      mockPrismaService.notificationTemplate.findMany.mockResolvedValue([
        { ...mockTemplate, type },
      ]);

      // Act
      const result = await templateService.getByType(type);

      // Assert
      expect(result[0].type).toBe(type);
    });
  });
});
