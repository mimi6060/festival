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
import { CreateNotificationTemplateDto, UpdateNotificationTemplateDto } from '../dto';

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
    bodyTemplate: 'Votre billet {{ticketType}} pour {{festivalName}} a ete confirme.',
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

    templateService = module.get<NotificationTemplateService>(NotificationTemplateService);
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
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);

      // Act & Assert
      await expect(templateService.create(createDto)).rejects.toThrow(ConflictException);
      await expect(templateService.create(createDto)).rejects.toThrow(
        "Template 'ticket_purchased' already exists"
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
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);
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
        templateService.update('non-existent-id', { titleTemplate: 'New' })
      ).rejects.toThrow(NotFoundException);
      await expect(
        templateService.update('non-existent-id', { titleTemplate: 'New' })
      ).rejects.toThrow('Template not found');
    });

    it('should update only title template', async () => {
      // Arrange
      const updateDto: UpdateNotificationTemplateDto = {
        titleTemplate: 'Only Title Updated',
      };
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);
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
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);
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
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);
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
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);
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
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.notificationTemplate.delete.mockResolvedValue(mockTemplate);

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
      await expect(templateService.delete('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(templateService.delete('non-existent-id')).rejects.toThrow('Template not found');
    });

    it('should delete inactive template', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockInactiveTemplate);
      mockPrismaService.notificationTemplate.delete.mockResolvedValue(mockInactiveTemplate);

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
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);

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
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);

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
      mockPrismaService.notificationTemplate.findMany.mockResolvedValue([mockTemplate]);

      // Act
      const result = await templateService.getByType(NotificationType.TICKET_PURCHASED);

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
      const result = await templateService.getByType(NotificationType.SECURITY_ALERT);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should return multiple templates of same type', async () => {
      // Arrange
      const template1 = { ...mockTemplate, id: 'template-1', name: 'ticket_v1' };
      const template2 = { ...mockTemplate, id: 'template-2', name: 'ticket_v2' };
      mockPrismaService.notificationTemplate.findMany.mockResolvedValue([template1, template2]);

      // Act
      const result = await templateService.getByType(NotificationType.TICKET_PURCHASED);

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
        })
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
      mockPrismaService.notificationTemplate.create.mockResolvedValue(mockTemplate);

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      // Should check for 10 default templates
      expect(mockPrismaService.notificationTemplate.findUnique).toHaveBeenCalledTimes(10);
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledTimes(10);
    });

    it('should not create templates that already exist', async () => {
      // Arrange - all templates exist
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);

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
      mockPrismaService.notificationTemplate.create.mockResolvedValue(mockTemplate);

      // Act
      await templateService.seedDefaultTemplates();

      // Assert
      expect(mockPrismaService.notificationTemplate.create).toHaveBeenCalledTimes(5);
    });

    it('should seed ticket_purchased template with correct data', async () => {
      // Arrange
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationTemplate.create.mockResolvedValue(mockTemplate);

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
      mockPrismaService.notificationTemplate.create.mockResolvedValue(mockTemplate);

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
      mockPrismaService.notificationTemplate.create.mockResolvedValue(mockTemplate);

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
      mockPrismaService.notificationTemplate.create.mockResolvedValue(mockTemplate);

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
      mockPrismaService.notificationTemplate.create.mockResolvedValue(mockTemplate);

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
      mockPrismaService.notificationTemplate.create.mockResolvedValue(mockTemplate);

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
      mockPrismaService.notificationTemplate.create.mockResolvedValue(mockTemplate);

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
      mockPrismaService.notificationTemplate.create.mockResolvedValue(mockTemplate);

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
      mockPrismaService.notificationTemplate.create.mockResolvedValue(mockTemplate);

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
      mockPrismaService.notificationTemplate.create.mockResolvedValue(mockTemplate);

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
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);

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
      mockPrismaService.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);
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

// =============================================================================
// Template Rendering Tests (Handlebars)
// =============================================================================

import * as Handlebars from 'handlebars';

describe('NotificationTemplateService - Template Rendering', () => {
  // Helper function to render templates (simulating NotificationsService behavior)
  const renderTemplate = (template: string, variables: Record<string, unknown>): string => {
    const compiled = Handlebars.compile(template);
    return compiled(variables);
  };

  // ==========================================================================
  // Email Template Rendering Tests
  // ==========================================================================

  describe('Email Template Rendering', () => {
    it('should render email template with all variables', () => {
      // Arrange
      const titleTemplate = 'Billet confirme pour {{festivalName}} !';
      const bodyTemplate = `Bonjour {{firstName}},

Votre billet {{ticketType}} pour {{festivalName}} a ete confirme.
Date: {{date}}
Lieu: {{location}}

Retrouvez votre QR code dans l'app.`;

      const variables = {
        firstName: 'Jean',
        festivalName: 'Summer Music Festival',
        ticketType: 'VIP',
        date: '15 Juillet 2026',
        location: 'Paris La Defense Arena',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Billet confirme pour Summer Music Festival !');
      expect(renderedBody).toContain('Bonjour Jean,');
      expect(renderedBody).toContain('billet VIP');
      expect(renderedBody).toContain('Summer Music Festival');
      expect(renderedBody).toContain('15 Juillet 2026');
      expect(renderedBody).toContain('Paris La Defense Arena');
    });

    it('should render payment confirmation email template', () => {
      // Arrange
      const titleTemplate = 'Confirmation de paiement - {{orderId}}';
      const bodyTemplate = `Cher(e) {{customerName}},

Nous confirmons la reception de votre paiement de {{amount}} {{currency}}.

Details de la commande:
- Numero de commande: {{orderId}}
- Date: {{orderDate}}
- Methode de paiement: {{paymentMethod}}

Merci pour votre achat!`;

      const variables = {
        customerName: 'Marie Dupont',
        amount: '150.00',
        currency: 'EUR',
        orderId: 'ORD-2026-001234',
        orderDate: '08 Janvier 2026',
        paymentMethod: 'Carte bancaire',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Confirmation de paiement - ORD-2026-001234');
      expect(renderedBody).toContain('Marie Dupont');
      expect(renderedBody).toContain('150.00 EUR');
      expect(renderedBody).toContain('ORD-2026-001234');
      expect(renderedBody).toContain('Carte bancaire');
    });

    it('should render password reset email template', () => {
      // Arrange
      const titleTemplate = 'Reinitialisation de votre mot de passe';
      const bodyTemplate = `Bonjour {{userName}},

Vous avez demande la reinitialisation de votre mot de passe.
Cliquez sur le lien ci-dessous pour creer un nouveau mot de passe:

{{{resetLink}}}

Ce lien expirera dans {{expirationHours}} heures.

Si vous n'avez pas demande cette reinitialisation, ignorez cet email.`;

      const variables = {
        userName: 'Pierre Martin',
        resetLink: 'https://festival.app/reset?token=abc123xyz',
        expirationHours: '24',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Reinitialisation de votre mot de passe');
      expect(renderedBody).toContain('Pierre Martin');
      // Triple braces {{{...}}} prevent HTML escaping of special chars like '='
      expect(renderedBody).toContain('https://festival.app/reset?token=abc123xyz');
      expect(renderedBody).toContain('24 heures');
    });
  });

  // ==========================================================================
  // Push Notification Template Rendering Tests
  // ==========================================================================

  describe('Push Notification Template Rendering', () => {
    it('should render artist reminder push notification', () => {
      // Arrange
      const titleTemplate = '{{artistName}} bientot sur scene !';
      const bodyTemplate =
        '{{artistName}} commence dans {{minutes}} minutes sur la scene {{stageName}}.';

      const variables = {
        artistName: 'Daft Punk',
        minutes: '15',
        stageName: 'Main Stage',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Daft Punk bientot sur scene !');
      expect(renderedBody).toBe('Daft Punk commence dans 15 minutes sur la scene Main Stage.');
    });

    it('should render cashless topup push notification', () => {
      // Arrange
      const titleTemplate = 'Compte recharge !';
      const bodyTemplate =
        'Votre compte cashless a ete credite de {{amount}} EUR. Nouveau solde: {{balance}} EUR.';

      const variables = {
        amount: '50.00',
        balance: '75.50',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Compte recharge !');
      expect(renderedBody).toBe(
        'Votre compte cashless a ete credite de 50.00 EUR. Nouveau solde: 75.50 EUR.'
      );
    });

    it('should render schedule change push notification', () => {
      // Arrange
      const titleTemplate = 'Changement de programme';
      const bodyTemplate =
        '{{artistName}} a ete deplace. Nouvelle heure: {{newTime}} sur {{stageName}}.';

      const variables = {
        artistName: 'The Weeknd',
        newTime: '21:00',
        stageName: 'Arena Stage',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Changement de programme');
      expect(renderedBody).toBe('The Weeknd a ete deplace. Nouvelle heure: 21:00 sur Arena Stage.');
    });

    it('should render vendor order ready push notification', () => {
      // Arrange
      const titleTemplate = 'Commande prete !';
      const bodyTemplate =
        'Votre commande #{{orderNumber}} chez {{vendorName}} est prete a etre recuperee.';

      const variables = {
        orderNumber: '1234',
        vendorName: 'Food Truck Paradise',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Commande prete !');
      expect(renderedBody).toBe(
        'Votre commande #1234 chez Food Truck Paradise est prete a etre recuperee.'
      );
    });

    it('should render security alert push notification', () => {
      // Arrange
      const titleTemplate = 'Alerte Securite - {{zone}}';
      const bodyTemplate = '{{message}}';

      const variables = {
        zone: 'Zone VIP',
        message:
          'Evacuation temporaire de la zone VIP. Veuillez suivre les instructions du personnel.',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Alerte Securite - Zone VIP');
      expect(renderedBody).toBe(
        'Evacuation temporaire de la zone VIP. Veuillez suivre les instructions du personnel.'
      );
    });
  });

  // ==========================================================================
  // SMS Template Rendering Tests
  // ==========================================================================

  describe('SMS Template Rendering', () => {
    it('should render ticket validation SMS', () => {
      // Arrange
      const template =
        'FESTIVAL: Votre billet {{ticketType}} pour {{festivalName}} est valide. Code: {{validationCode}}';

      const variables = {
        ticketType: 'PASS 3 JOURS',
        festivalName: 'Hellfest',
        validationCode: 'HF2026-VLD-8974',
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe(
        'FESTIVAL: Votre billet PASS 3 JOURS pour Hellfest est valide. Code: HF2026-VLD-8974'
      );
    });

    it('should render payment confirmation SMS', () => {
      // Arrange
      const template =
        'Paiement de {{amount}}EUR accepte pour {{festivalName}}. Ref: {{reference}}';

      const variables = {
        amount: '299',
        festivalName: 'Tomorrowland',
        reference: 'TML-PAY-456789',
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Paiement de 299EUR accepte pour Tomorrowland. Ref: TML-PAY-456789');
    });

    it('should render emergency SMS with short message', () => {
      // Arrange
      const template = 'URGENCE {{festivalName}}: {{message}}';

      const variables = {
        festivalName: 'Coachella',
        message: 'Orage imminent. Rejoignez les abris.',
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('URGENCE Coachella: Orage imminent. Rejoignez les abris.');
      expect(rendered.length).toBeLessThan(160); // SMS character limit
    });
  });

  // ==========================================================================
  // Missing Variables Handling Tests
  // ==========================================================================

  describe('Missing Variables Handling', () => {
    it('should render empty string for missing variables', () => {
      // Arrange
      const template = 'Hello {{name}}, your ticket type is {{ticketType}}';
      const variables = { name: 'John' }; // ticketType is missing

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Hello John, your ticket type is ');
    });

    it('should render empty string for undefined variables', () => {
      // Arrange
      const template = 'Amount: {{amount}} {{currency}}';
      const variables = { amount: '100', currency: undefined };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Amount: 100 ');
    });

    it('should render empty string for null variables', () => {
      // Arrange
      const template = 'Order #{{orderId}} - Status: {{status}}';
      const variables = { orderId: '12345', status: null };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Order #12345 - Status: ');
    });

    it('should handle template with all variables missing', () => {
      // Arrange
      const template = '{{greeting}} {{name}}, {{message}}';
      const variables = {};

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe(' , ');
    });

    it('should handle nested missing variables gracefully', () => {
      // Arrange
      const template = 'Welcome {{user.firstName}} {{user.lastName}}';
      const variables = { user: { firstName: 'Alice' } }; // lastName is missing

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Welcome Alice ');
    });

    it('should handle completely missing nested object', () => {
      // Arrange
      const template = 'Event: {{event.name}} at {{event.venue}}';
      const variables = {}; // event object is missing

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Event:  at ');
    });
  });

  // ==========================================================================
  // Edge Cases - Empty Data Tests
  // ==========================================================================

  describe('Edge Cases - Empty Data', () => {
    it('should handle empty string variables', () => {
      // Arrange
      const template = 'Welcome {{name}}!';
      const variables = { name: '' };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Welcome !');
    });

    it('should handle empty template', () => {
      // Arrange
      const template = '';
      const variables = { name: 'Test' };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('');
    });

    it('should handle template with only whitespace', () => {
      // Arrange
      const template = '   ';
      const variables = { name: 'Test' };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('   ');
    });

    it('should handle empty variables object', () => {
      // Arrange
      const template = 'Static text without variables';
      const variables = {};

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Static text without variables');
    });

    it('should handle zero as a valid variable value', () => {
      // Arrange
      const template = 'Your balance is {{balance}} EUR';
      const variables = { balance: 0 };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Your balance is 0 EUR');
    });

    it('should handle false as a valid variable value', () => {
      // Arrange
      const template = 'Notifications enabled: {{enabled}}';
      const variables = { enabled: false };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Notifications enabled: false');
    });
  });

  // ==========================================================================
  // Edge Cases - Special Characters Tests
  // ==========================================================================

  describe('Edge Cases - Special Characters', () => {
    it('should handle HTML special characters in variables', () => {
      // Arrange
      const template = 'Welcome {{name}}!';
      const variables = { name: '<script>alert("xss")</script>' };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      // Handlebars escapes HTML by default
      expect(rendered).toBe('Welcome &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;!');
    });

    it('should handle ampersand in variables', () => {
      // Arrange
      const template = 'Company: {{company}}';
      const variables = { company: 'Rock & Roll Festival' };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Company: Rock &amp; Roll Festival');
    });

    it('should handle quotes in variables', () => {
      // Arrange
      const template = 'Message: {{message}}';
      const variables = { message: 'He said "Hello"' };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Message: He said &quot;Hello&quot;');
    });

    it('should handle French accented characters', () => {
      // Arrange
      const template = 'Bonjour {{name}}, bienvenue au {{festival}}!';
      const variables = { name: 'Francois Lefevre', festival: 'Festival de lete' };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Bonjour Francois Lefevre, bienvenue au Festival de lete!');
    });

    it('should handle emoji in variables', () => {
      // Arrange
      const template = '{{status}} {{message}}';
      const variables = { status: 'Success!', message: 'Your order is ready' };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toContain('Success!');
      expect(rendered).toContain('Your order is ready');
    });

    it('should handle newlines in variables', () => {
      // Arrange
      const template = 'Message: {{message}}';
      const variables = { message: 'Line 1\nLine 2\nLine 3' };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Message: Line 1\nLine 2\nLine 3');
    });

    it('should handle tabs in variables', () => {
      // Arrange
      const template = 'Data: {{data}}';
      const variables = { data: 'Col1\tCol2\tCol3' };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Data: Col1\tCol2\tCol3');
    });

    it('should handle Unicode characters', () => {
      // Arrange
      const template = 'Welcome {{name}} to {{event}}';
      const variables = { name: 'James Bond', event: 'Spring Festival' };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Welcome James Bond to Spring Festival');
    });

    it('should handle very long variable values', () => {
      // Arrange
      const template = 'Description: {{description}}';
      const longDescription = 'A'.repeat(10000);
      const variables = { description: longDescription };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe(`Description: ${longDescription}`);
      expect(rendered.length).toBe(13 + 10000); // "Description: " + 10000 A's
    });

    it('should handle Handlebars syntax in variable values (escaped)', () => {
      // Arrange
      const template = 'User input: {{userInput}}';
      const variables = { userInput: '{{malicious}}' };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      // Handlebars should escape the braces
      expect(rendered).toBe('User input: {{malicious}}');
    });
  });

  // ==========================================================================
  // Template Type Specific Rendering Tests
  // ==========================================================================

  describe('Template Type Specific Rendering', () => {
    it('should render TICKET_PURCHASED template correctly', () => {
      // Arrange - using actual default template from service
      const titleTemplate = 'Billet confirme !';
      const bodyTemplate =
        "Votre billet {{ticketType}} pour {{festivalName}} a ete confirme. Retrouvez votre QR code dans l'app.";

      const variables = {
        ticketType: 'PASS VIP 3 JOURS',
        festivalName: 'Lollapalooza Paris',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Billet confirme !');
      expect(renderedBody).toBe(
        "Votre billet PASS VIP 3 JOURS pour Lollapalooza Paris a ete confirme. Retrouvez votre QR code dans l'app."
      );
    });

    it('should render PAYMENT_SUCCESS template correctly', () => {
      // Arrange
      const titleTemplate = 'Paiement reussi';
      const bodyTemplate = 'Votre paiement de {{amount}} EUR a ete confirme.';

      const variables = { amount: '199.99' };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Paiement reussi');
      expect(renderedBody).toBe('Votre paiement de 199.99 EUR a ete confirme.');
    });

    it('should render PAYMENT_FAILED template correctly', () => {
      // Arrange
      const titleTemplate = 'Echec du paiement';
      const bodyTemplate = 'Votre paiement de {{amount}} EUR a echoue. Veuillez reessayer.';

      const variables = { amount: '75.00' };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Echec du paiement');
      expect(renderedBody).toBe('Votre paiement de 75.00 EUR a echoue. Veuillez reessayer.');
    });

    it('should render CASHLESS_TOPUP template correctly', () => {
      // Arrange
      const titleTemplate = 'Compte recharge';
      const bodyTemplate =
        'Votre compte cashless a ete credite de {{amount}} EUR. Solde: {{balance}} EUR.';

      const variables = { amount: '100', balance: '150' };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Compte recharge');
      expect(renderedBody).toBe('Votre compte cashless a ete credite de 100 EUR. Solde: 150 EUR.');
    });

    it('should render ARTIST_REMINDER template correctly', () => {
      // Arrange
      const titleTemplate = '{{artistName}} bientot sur scene !';
      const bodyTemplate =
        '{{artistName}} commence dans {{minutes}} minutes sur la scene {{stageName}}.';

      const variables = {
        artistName: 'Stromae',
        minutes: '30',
        stageName: 'Grande Scene',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Stromae bientot sur scene !');
      expect(renderedBody).toBe('Stromae commence dans 30 minutes sur la scene Grande Scene.');
    });

    it('should render SCHEDULE_CHANGE template correctly', () => {
      // Arrange
      const titleTemplate = 'Changement de programme';
      const bodyTemplate =
        '{{artistName}} a ete deplace. Nouvelle heure: {{newTime}} sur {{stageName}}.';

      const variables = {
        artistName: 'Angele',
        newTime: '18:30',
        stageName: 'Scene Alternative',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Changement de programme');
      expect(renderedBody).toBe(
        'Angele a ete deplace. Nouvelle heure: 18:30 sur Scene Alternative.'
      );
    });

    it('should render FESTIVAL_UPDATE template correctly', () => {
      // Arrange
      const titleTemplate = 'Info {{festivalName}}';
      const bodyTemplate = '{{message}}';

      const variables = {
        festivalName: 'Rock en Seine',
        message: 'Les portes ouvrent exceptionnellement a 14h aujourdhui en raison de la meteo.',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Info Rock en Seine');
      expect(renderedBody).toBe(
        'Les portes ouvrent exceptionnellement a 14h aujourdhui en raison de la meteo.'
      );
    });

    it('should render SECURITY_ALERT template correctly', () => {
      // Arrange
      const titleTemplate = 'Alerte Securite';
      const bodyTemplate = '{{message}}';

      const variables = {
        message: 'Zone Est temporairement fermee pour maintenance. Utilisez les acces Nord ou Sud.',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Alerte Securite');
      expect(renderedBody).toBe(
        'Zone Est temporairement fermee pour maintenance. Utilisez les acces Nord ou Sud.'
      );
    });

    it('should render VENDOR_ORDER template correctly', () => {
      // Arrange
      const titleTemplate = 'Commande prete !';
      const bodyTemplate =
        'Votre commande #{{orderNumber}} chez {{vendorName}} est prete a etre recuperee.';

      const variables = {
        orderNumber: '4567',
        vendorName: 'Pizza Corner',
        orderId: 'order-uuid-123',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Commande prete !');
      expect(renderedBody).toBe(
        'Votre commande #4567 chez Pizza Corner est prete a etre recuperee.'
      );
    });

    it('should render PROMO template correctly', () => {
      // Arrange
      const titleTemplate = '{{title}}';
      const bodyTemplate = '{{message}}';

      const variables = {
        title: 'Offre Speciale -20%',
        message: 'Profitez de -20% sur tous les articles merchandising avec le code SUMMER20!',
      };

      // Act
      const renderedTitle = renderTemplate(titleTemplate, variables);
      const renderedBody = renderTemplate(bodyTemplate, variables);

      // Assert
      expect(renderedTitle).toBe('Offre Speciale -20%');
      expect(renderedBody).toBe(
        'Profitez de -20% sur tous les articles merchandising avec le code SUMMER20!'
      );
    });
  });

  // ==========================================================================
  // Complex Variable Scenarios Tests
  // ==========================================================================

  describe('Complex Variable Scenarios', () => {
    it('should handle multiple occurrences of same variable', () => {
      // Arrange
      const template =
        '{{name}} vous remercie! {{name}} vous souhaite un excellent festival, {{name}}!';
      const variables = { name: 'Glastonbury' };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe(
        'Glastonbury vous remercie! Glastonbury vous souhaite un excellent festival, Glastonbury!'
      );
    });

    it('should handle numeric variables', () => {
      // Arrange
      const template =
        'Vous avez {{ticketCount}} billets pour le jour {{day}} (Zone {{zoneNumber}})';
      const variables = { ticketCount: 3, day: 2, zoneNumber: 5 };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Vous avez 3 billets pour le jour 2 (Zone 5)');
    });

    it('should handle array-like variables with index access using bracket notation', () => {
      // Arrange - Handlebars requires bracket notation for numeric indices
      const template = 'Artists: {{artists.[0]}}, {{artists.[1]}}, {{artists.[2]}}';
      const variables = { artists: ['Orelsan', 'PNL', 'Vald'] };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Artists: Orelsan, PNL, Vald');
    });

    it('should handle deeply nested variables', () => {
      // Arrange
      const template = 'Event: {{event.details.name}} at {{event.venue.location.city}}';
      const variables = {
        event: {
          details: { name: 'Summer Festival' },
          venue: { location: { city: 'Lyon' } },
        },
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Event: Summer Festival at Lyon');
    });

    it('should handle mixed types of variables', () => {
      // Arrange
      const template =
        'User: {{userName}} | Premium: {{isPremium}} | Balance: {{balance}} | Items: {{itemCount}}';
      const variables = {
        userName: 'Sophie',
        isPremium: true,
        balance: 125.5,
        itemCount: 7,
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('User: Sophie | Premium: true | Balance: 125.5 | Items: 7');
    });

    it('should handle date-like string variables', () => {
      // Arrange
      const template = 'Event on {{eventDate}} at {{eventTime}}. Doors open: {{doorsOpen}}';
      const variables = {
        eventDate: '2026-07-15',
        eventTime: '20:00',
        doorsOpen: '18:00',
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Event on 2026-07-15 at 20:00. Doors open: 18:00');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle malformed template syntax gracefully', () => {
      // Arrange - unclosed bracket
      const template = 'Hello {{name}';
      const variables = { name: 'Test' };

      // Act & Assert
      expect(() => renderTemplate(template, variables)).toThrow();
    });

    it('should handle double opening brackets', () => {
      // Arrange
      const template = 'Hello {{{name}}}'; // Triple braces for unescaped
      const variables = { name: '<strong>Bold</strong>' };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert - triple braces don't escape HTML
      expect(rendered).toBe('Hello <strong>Bold</strong>');
    });

    it('should handle variables with dots in names using bracket notation', () => {
      // Arrange
      const template = 'Config: {{config.[api.url]}}';
      const variables = { config: { 'api.url': 'https://api.festival.com' } };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Config: https://api.festival.com');
    });
  });

  // ==========================================================================
  // Performance Edge Cases Tests
  // ==========================================================================

  describe('Performance Edge Cases', () => {
    it('should handle template with many variables efficiently', () => {
      // Arrange
      const variableCount = 100;
      let template = '';
      const variables: Record<string, string> = {};

      for (let i = 0; i < variableCount; i++) {
        template += `{{var${i}}} `;
        variables[`var${i}`] = `value${i}`;
      }

      // Act
      const startTime = Date.now();
      const rendered = renderTemplate(template, variables);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      expect(rendered).toContain('value0');
      expect(rendered).toContain('value99');
    });

    it('should handle repeated rendering of same template', () => {
      // Arrange
      const template = 'Hello {{name}}, welcome to {{event}}!';
      const iterations = 1000;

      // Act
      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        renderTemplate(template, { name: `User${i}`, event: 'Festival' });
      }
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
