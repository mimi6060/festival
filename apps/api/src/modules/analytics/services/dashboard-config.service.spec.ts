/**
 * Dashboard Config Service Unit Tests
 *
 * Comprehensive tests for dashboard configuration functionality including:
 * - Dashboard management (CRUD)
 * - Widget management within dashboards
 * - Dashboard templates
 * - Widget types and metrics
 * - Dashboard cloning
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DashboardConfigService } from './dashboard-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';

describe('DashboardConfigService', () => {
  let service: DashboardConfigService;

  const mockPrismaService = {};

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
  };

  const festivalId = 'festival-uuid-test';
  const userId = 'user-uuid-test';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardConfigService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<DashboardConfigService>(DashboardConfigService);
  });

  // ==========================================================================
  // Template Tests
  // ==========================================================================

  describe('getTemplates', () => {
    it('should return available dashboard templates', () => {
      const templates = service.getTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should include required fields in templates', () => {
      const templates = service.getTemplates();

      templates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.widgets).toBeDefined();
        expect(template.layout).toBeDefined();
      });
    });

    it('should include templates for different categories', () => {
      const templates = service.getTemplates();
      const categories = templates.map(t => t.category);

      expect(categories).toContain('executive');
      expect(categories).toContain('operations');
      expect(categories).toContain('finance');
    });

    it('should include executive dashboard template', () => {
      const templates = service.getTemplates();
      const executive = templates.find(t => t.id === 'executive');

      expect(executive).toBeDefined();
      expect(executive?.name).toBe('Executive Dashboard');
    });
  });

  describe('getTemplate', () => {
    it('should return a template by ID', () => {
      const template = service.getTemplate('executive');

      expect(template).toBeDefined();
      expect(template.id).toBe('executive');
      expect(template.name).toBe('Executive Dashboard');
    });

    it('should throw NotFoundException for unknown template', () => {
      expect(() => service.getTemplate('unknown-template')).toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // Dashboard Creation Tests
  // ==========================================================================

  describe('createFromTemplate', () => {
    it('should create a dashboard from a template', async () => {
      const result = await service.createFromTemplate(festivalId, userId, 'executive');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.festivalId).toBe(festivalId);
      expect(result.createdBy).toBe(userId);
      expect(result.name).toBe('Executive Dashboard');
      expect(result.widgets.length).toBeGreaterThan(0);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow custom name for dashboard created from template', async () => {
      const result = await service.createFromTemplate(festivalId, userId, 'executive', 'My Custom Dashboard');

      expect(result.name).toBe('My Custom Dashboard');
    });

    it('should throw NotFoundException for unknown template', async () => {
      await expect(
        service.createFromTemplate(festivalId, userId, 'unknown-template')
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate unique widget IDs for each dashboard', async () => {
      const dashboard1 = await service.createFromTemplate(festivalId, userId, 'executive');
      const dashboard2 = await service.createFromTemplate(festivalId, userId, 'executive');

      const widgetIds1 = dashboard1.widgets.map(w => w.id);
      const widgetIds2 = dashboard2.widgets.map(w => w.id);

      // No widget IDs should be shared between dashboards
      const intersection = widgetIds1.filter(id => widgetIds2.includes(id));
      expect(intersection.length).toBe(0);
    });
  });

  describe('createDashboard', () => {
    it('should create an empty dashboard', async () => {
      const result = await service.createDashboard(festivalId, userId, {
        name: 'My Dashboard',
        description: 'A custom dashboard',
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('My Dashboard');
      expect(result.description).toBe('A custom dashboard');
      expect(result.festivalId).toBe(festivalId);
      expect(result.createdBy).toBe(userId);
      expect(result.widgets).toEqual([]);
      expect(result.isDefault).toBe(false);
    });

    it('should generate unique IDs for each dashboard', async () => {
      const dashboard1 = await service.createDashboard(festivalId, userId, { name: 'Dashboard 1' });
      const dashboard2 = await service.createDashboard(festivalId, userId, { name: 'Dashboard 2' });

      expect(dashboard1.id).not.toBe(dashboard2.id);
    });

    it('should set default layout configuration', async () => {
      const result = await service.createDashboard(festivalId, userId, { name: 'Test' });

      expect(result.layout).toBeDefined();
      expect(result.layout.type).toBe('grid');
      expect(result.layout.columns).toBe(12);
    });
  });

  // ==========================================================================
  // Dashboard CRUD Tests
  // ==========================================================================

  describe('getDashboards', () => {
    it('should return all dashboards for a festival', async () => {
      await service.createDashboard(festivalId, userId, { name: 'Dashboard 1' });
      await service.createDashboard(festivalId, userId, { name: 'Dashboard 2' });
      await service.createDashboard('other-festival', userId, { name: 'Other Dashboard' });

      const result = await service.getDashboards(festivalId);

      expect(result.length).toBe(2);
      expect(result.every(d => d.festivalId === festivalId)).toBe(true);
    });

    it('should return empty array if no dashboards exist', async () => {
      const result = await service.getDashboards('non-existent-festival');

      expect(result).toEqual([]);
    });
  });

  describe('getDashboard', () => {
    it('should return a dashboard by ID', async () => {
      const created = await service.createDashboard(festivalId, userId, { name: 'Test Dashboard' });

      const result = await service.getDashboard(created.id);

      expect(result.id).toBe(created.id);
      expect(result.name).toBe('Test Dashboard');
    });

    it('should throw NotFoundException if dashboard not found', async () => {
      await expect(service.getDashboard('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDashboard', () => {
    it('should update dashboard properties', async () => {
      const created = await service.createDashboard(festivalId, userId, { name: 'Original' });

      const result = await service.updateDashboard(created.id, {
        name: 'Updated Name',
        description: 'Updated description',
      });

      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated description');
      expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should throw NotFoundException if dashboard not found', async () => {
      await expect(
        service.updateDashboard('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should update layout configuration', async () => {
      const created = await service.createDashboard(festivalId, userId, { name: 'Test' });

      const result = await service.updateDashboard(created.id, {
        layout: { type: 'grid', columns: 16, rowHeight: 100 },
      });

      expect(result.layout.columns).toBe(16);
      expect(result.layout.rowHeight).toBe(100);
    });

    it('should update refresh interval', async () => {
      const created = await service.createDashboard(festivalId, userId, { name: 'Test' });

      const result = await service.updateDashboard(created.id, { refreshInterval: 60 });

      expect(result.refreshInterval).toBe(60);
    });
  });

  describe('deleteDashboard', () => {
    it('should delete a dashboard', async () => {
      const created = await service.createDashboard(festivalId, userId, { name: 'To Delete' });

      await service.deleteDashboard(created.id);

      await expect(service.getDashboard(created.id)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if dashboard not found', async () => {
      await expect(service.deleteDashboard('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // Widget Management Tests
  // ==========================================================================

  describe('addWidget', () => {
    it('should add a widget to a dashboard', async () => {
      const dashboard = await service.createDashboard(festivalId, userId, { name: 'Test' });

      const result = await service.addWidget(dashboard.id, {
        type: 'kpi',
        title: 'Total Revenue',
        metric: 'total_revenue',
        position: { x: 0, y: 0, width: 3, height: 2 },
        config: { showTrend: true },
      });

      expect(result.widgets.length).toBe(1);
      expect(result.widgets[0].title).toBe('Total Revenue');
      expect(result.widgets[0].type).toBe('kpi');
      expect(result.widgets[0].id).toBeDefined();
    });

    it('should throw NotFoundException if dashboard not found', async () => {
      await expect(
        service.addWidget('non-existent-id', {
          type: 'kpi',
          title: 'Test',
          metric: 'test',
          position: { x: 0, y: 0, width: 2, height: 2 },
          config: {},
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate unique widget IDs', async () => {
      const dashboard = await service.createDashboard(festivalId, userId, { name: 'Test' });

      await service.addWidget(dashboard.id, {
        type: 'kpi',
        title: 'Widget 1',
        metric: 'metric1',
        position: { x: 0, y: 0, width: 2, height: 2 },
        config: {},
      });
      await service.addWidget(dashboard.id, {
        type: 'kpi',
        title: 'Widget 2',
        metric: 'metric2',
        position: { x: 2, y: 0, width: 2, height: 2 },
        config: {},
      });

      const updated = await service.getDashboard(dashboard.id);
      expect(updated.widgets[0].id).not.toBe(updated.widgets[1].id);
    });

    it('should update dashboard updatedAt timestamp', async () => {
      const dashboard = await service.createDashboard(festivalId, userId, { name: 'Test' });
      const originalUpdatedAt = dashboard.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await service.addWidget(dashboard.id, {
        type: 'kpi',
        title: 'Widget',
        metric: 'metric',
        position: { x: 0, y: 0, width: 2, height: 2 },
        config: {},
      });

      expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('updateWidget', () => {
    it('should update a widget in a dashboard', async () => {
      const dashboard = await service.createDashboard(festivalId, userId, { name: 'Test' });
      const withWidget = await service.addWidget(dashboard.id, {
        type: 'kpi',
        title: 'Original Title',
        metric: 'metric',
        position: { x: 0, y: 0, width: 2, height: 2 },
        config: {},
      });
      const widgetId = withWidget.widgets[0].id;

      const result = await service.updateWidget(dashboard.id, widgetId, {
        title: 'Updated Title',
        config: { showTrend: true },
      });

      expect(result.widgets[0].title).toBe('Updated Title');
      expect(result.widgets[0].config.showTrend).toBe(true);
    });

    it('should throw NotFoundException if dashboard not found', async () => {
      await expect(
        service.updateWidget('non-existent-dashboard', 'widget-id', { title: 'New' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if widget not found', async () => {
      const dashboard = await service.createDashboard(festivalId, userId, { name: 'Test' });

      await expect(
        service.updateWidget(dashboard.id, 'non-existent-widget', { title: 'New' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeWidget', () => {
    it('should remove a widget from a dashboard', async () => {
      const dashboard = await service.createDashboard(festivalId, userId, { name: 'Test' });
      const withWidget = await service.addWidget(dashboard.id, {
        type: 'kpi',
        title: 'Widget',
        metric: 'metric',
        position: { x: 0, y: 0, width: 2, height: 2 },
        config: {},
      });
      const widgetId = withWidget.widgets[0].id;

      const result = await service.removeWidget(dashboard.id, widgetId);

      expect(result.widgets.length).toBe(0);
    });

    it('should throw NotFoundException if widget not found', async () => {
      const dashboard = await service.createDashboard(festivalId, userId, { name: 'Test' });

      await expect(
        service.removeWidget(dashboard.id, 'non-existent-widget')
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // setDefault Tests
  // ==========================================================================

  describe('setDefault', () => {
    it('should set a dashboard as default', async () => {
      const dashboard1 = await service.createDashboard(festivalId, userId, { name: 'Dashboard 1' });
      const dashboard2 = await service.createDashboard(festivalId, userId, { name: 'Dashboard 2' });

      await service.setDefault(dashboard1.id);

      const updated1 = await service.getDashboard(dashboard1.id);
      const updated2 = await service.getDashboard(dashboard2.id);

      expect(updated1.isDefault).toBe(true);
      expect(updated2.isDefault).toBe(false);
    });

    it('should unset previous default when setting new default', async () => {
      const dashboard1 = await service.createDashboard(festivalId, userId, { name: 'Dashboard 1' });
      const dashboard2 = await service.createDashboard(festivalId, userId, { name: 'Dashboard 2' });

      await service.setDefault(dashboard1.id);
      await service.setDefault(dashboard2.id);

      const updated1 = await service.getDashboard(dashboard1.id);
      const updated2 = await service.getDashboard(dashboard2.id);

      expect(updated1.isDefault).toBe(false);
      expect(updated2.isDefault).toBe(true);
    });

    it('should throw NotFoundException if dashboard not found', async () => {
      await expect(service.setDefault('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // cloneDashboard Tests
  // ==========================================================================

  describe('cloneDashboard', () => {
    it('should clone a dashboard', async () => {
      const original = await service.createFromTemplate(festivalId, userId, 'executive');

      const cloned = await service.cloneDashboard(original.id, 'Cloned Dashboard');

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.name).toBe('Cloned Dashboard');
      expect(cloned.widgets.length).toBe(original.widgets.length);
      expect(cloned.isDefault).toBe(false);
    });

    it('should clone to a different festival', async () => {
      const original = await service.createFromTemplate(festivalId, userId, 'executive');

      const cloned = await service.cloneDashboard(original.id, 'Cloned', 'other-festival');

      expect(cloned.festivalId).toBe('other-festival');
    });

    it('should generate new widget IDs in cloned dashboard', async () => {
      const original = await service.createFromTemplate(festivalId, userId, 'executive');
      const originalWidgetIds = original.widgets.map(w => w.id);

      const cloned = await service.cloneDashboard(original.id, 'Cloned');
      const clonedWidgetIds = cloned.widgets.map(w => w.id);

      const intersection = originalWidgetIds.filter(id => clonedWidgetIds.includes(id));
      expect(intersection.length).toBe(0);
    });

    it('should throw NotFoundException if dashboard not found', async () => {
      await expect(
        service.cloneDashboard('non-existent-id', 'Clone')
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // Widget Types and Metrics Tests
  // ==========================================================================

  describe('getWidgetTypes', () => {
    it('should return available widget types', () => {
      const types = service.getWidgetTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should include required widget type properties', () => {
      const types = service.getWidgetTypes();

      types.forEach(type => {
        expect(type.type).toBeDefined();
        expect(type.name).toBeDefined();
        expect(type.description).toBeDefined();
        expect(type.supportedMetrics).toBeDefined();
      });
    });

    it('should include common widget types', () => {
      const types = service.getWidgetTypes();
      const typeIds = types.map(t => t.type);

      expect(typeIds).toContain('kpi');
      expect(typeIds).toContain('line_chart');
      expect(typeIds).toContain('bar_chart');
      expect(typeIds).toContain('pie_chart');
      expect(typeIds).toContain('table');
    });
  });

  describe('getAvailableMetrics', () => {
    it('should return available metrics', () => {
      const metrics = service.getAvailableMetrics();

      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should include required metric properties', () => {
      const metrics = service.getAvailableMetrics();

      metrics.forEach(metric => {
        expect(metric.id).toBeDefined();
        expect(metric.name).toBeDefined();
        expect(metric.category).toBeDefined();
      });
    });

    it('should include metrics for different categories', () => {
      const metrics = service.getAvailableMetrics();
      const categories = [...new Set(metrics.map(m => m.category))];

      expect(categories).toContain('revenue');
      expect(categories).toContain('tickets');
      expect(categories).toContain('attendance');
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration Scenarios', () => {
    it('should support complete dashboard lifecycle', async () => {
      // Create dashboard
      const dashboard = await service.createDashboard(festivalId, userId, {
        name: 'Test Dashboard',
        description: 'Integration test dashboard',
      });
      expect(dashboard.widgets).toHaveLength(0);

      // Add widgets
      await service.addWidget(dashboard.id, {
        type: 'kpi',
        title: 'Revenue',
        metric: 'total_revenue',
        position: { x: 0, y: 0, width: 3, height: 2 },
        config: {},
      });
      await service.addWidget(dashboard.id, {
        type: 'line_chart',
        title: 'Trend',
        metric: 'revenue_trend',
        position: { x: 3, y: 0, width: 6, height: 4 },
        config: {},
      });

      let updated = await service.getDashboard(dashboard.id);
      expect(updated.widgets).toHaveLength(2);

      // Update widget
      const widgetId = updated.widgets[0].id;
      await service.updateWidget(dashboard.id, widgetId, { title: 'Total Revenue' });
      updated = await service.getDashboard(dashboard.id);
      expect(updated.widgets[0].title).toBe('Total Revenue');

      // Remove widget
      await service.removeWidget(dashboard.id, widgetId);
      updated = await service.getDashboard(dashboard.id);
      expect(updated.widgets).toHaveLength(1);

      // Set as default
      await service.setDefault(dashboard.id);
      updated = await service.getDashboard(dashboard.id);
      expect(updated.isDefault).toBe(true);

      // Clone dashboard
      const cloned = await service.cloneDashboard(dashboard.id, 'Cloned Dashboard');
      expect(cloned.name).toBe('Cloned Dashboard');
      expect(cloned.widgets).toHaveLength(1);

      // Delete dashboard
      await service.deleteDashboard(dashboard.id);
      await expect(service.getDashboard(dashboard.id)).rejects.toThrow(NotFoundException);
    });

    it('should support creating multiple dashboards from templates', async () => {
      const templates = service.getTemplates();

      for (const template of templates.slice(0, 3)) {
        const dashboard = await service.createFromTemplate(festivalId, userId, template.id);
        expect(dashboard.widgets.length).toBeGreaterThan(0);
      }

      const dashboards = await service.getDashboards(festivalId);
      expect(dashboards.length).toBe(3);
    });
  });
});
