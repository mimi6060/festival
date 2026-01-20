/**
 * Analytics Controller Unit Tests
 *
 * Comprehensive tests for analytics API endpoints including:
 * - Basic Analytics (Dashboard, Sales, Cashless, Attendance, Zones, Vendors)
 * - Advanced Metrics (Revenue, Customers, Performance, Fraud, Growth, Forecast, Staff, Environmental, Security, Comprehensive)
 * - Custom Reports (Create, List, Get, Execute, Delete, Comparison, Cohort, Funnel, Anomalies, Benchmarks)
 * - Realtime Analytics (Realtime, Live Metrics, Zone Metrics, Sync)
 * - Exports (Analytics, Sales, Cashless, Attendance, Vendors, Financial, Comprehensive)
 * - Dashboard Config (Templates, Widget Types, Metrics, Dashboards, Widgets)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from '../services/analytics.service';
import { AdvancedMetricsService } from '../services/advanced-metrics.service';
import { CustomReportsService } from '../services/custom-reports.service';
import { RealtimeAggregationService } from '../services/realtime-aggregation.service';
import { ExportService } from '../services/export.service';
import { DashboardConfigService } from '../services/dashboard-config.service';
import { Response } from 'express';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { adminUser, organizerUser, ongoingFestival } from '../../../test/fixtures';

// ============================================================================
// Mock Setup
// ============================================================================

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: jest.Mocked<AnalyticsService>;
  let _advancedMetricsService: jest.Mocked<AdvancedMetricsService>;
  let _customReportsService: jest.Mocked<CustomReportsService>;
  let _realtimeService: jest.Mocked<RealtimeAggregationService>;
  let _exportService: jest.Mocked<ExportService>;
  let _dashboardConfigService: jest.Mocked<DashboardConfigService>;

  const mockAnalyticsService = {
    getDashboardKPIs: jest.fn().mockResolvedValue({}),
    getSalesAnalytics: jest.fn().mockResolvedValue({}),
    getCashlessAnalytics: jest.fn().mockResolvedValue({}),
    getAttendanceAnalytics: jest.fn().mockResolvedValue({}),
    getZoneAnalytics: jest.fn().mockResolvedValue({}),
    getVendorAnalytics: jest.fn().mockResolvedValue({}),
    getRealtimeAnalytics: jest.fn().mockResolvedValue({}),
    invalidateCache: jest.fn().mockResolvedValue({}),
  };

  const mockAdvancedMetricsService = {
    getRevenueMetrics: jest.fn(),
    getCustomerMetrics: jest.fn(),
    getPerformanceMetrics: jest.fn(),
    getFraudMetrics: jest.fn(),
    getGrowthMetrics: jest.fn(),
    getForecastMetrics: jest.fn(),
    getStaffMetrics: jest.fn(),
    getEnvironmentalMetrics: jest.fn(),
    getSecurityMetrics: jest.fn(),
    getComprehensiveAnalytics: jest.fn(),
  };

  const mockCustomReportsService = {
    getReports: jest.fn(),
    createReport: jest.fn(),
    getReport: jest.fn(),
    executeReport: jest.fn(),
    deleteReport: jest.fn(),
    getComparisonAnalytics: jest.fn(),
    getCohortAnalysis: jest.fn(),
    getFunnelAnalysis: jest.fn(),
    detectAnomalies: jest.fn(),
    getBenchmarks: jest.fn(),
  };

  const mockRealtimeService = {
    getLiveFestivalMetrics: jest.fn(),
    getLiveZoneMetrics: jest.fn(),
    syncFromDatabase: jest.fn(),
  };

  const mockExportService = {
    exportData: jest.fn(),
    exportSalesData: jest.fn(),
    exportCashlessData: jest.fn(),
    exportAttendanceData: jest.fn(),
    exportVendorData: jest.fn(),
    exportFinancialSummary: jest.fn(),
    exportComprehensiveReport: jest.fn(),
  };

  const mockDashboardConfigService = {
    getTemplates: jest.fn(),
    getTemplate: jest.fn(),
    getWidgetTypes: jest.fn(),
    getAvailableMetrics: jest.fn(),
    getDashboards: jest.fn(),
    createDashboard: jest.fn(),
    createFromTemplate: jest.fn(),
    getDashboard: jest.fn(),
    updateDashboard: jest.fn(),
    deleteDashboard: jest.fn(),
    addWidget: jest.fn(),
    updateWidget: jest.fn(),
    removeWidget: jest.fn(),
    setDefault: jest.fn(),
    cloneDashboard: jest.fn(),
  };

  const mockOrganizerUser = {
    id: organizerUser.id,
    email: organizerUser.email,
    role: organizerUser.role,
  };

  const mockAdminUser = {
    id: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
  };

  const mockResponse = () => {
    const res: Partial<Response> = {
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    return res as Response;
  };

  beforeEach(async () => {
    // Clear mock call history but keep implementations
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: AdvancedMetricsService, useValue: mockAdvancedMetricsService },
        { provide: CustomReportsService, useValue: mockCustomReportsService },
        { provide: RealtimeAggregationService, useValue: mockRealtimeService },
        { provide: ExportService, useValue: mockExportService },
        { provide: DashboardConfigService, useValue: mockDashboardConfigService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    analyticsService = module.get(AnalyticsService);
    _advancedMetricsService = module.get(AdvancedMetricsService);
    _customReportsService = module.get(CustomReportsService);
    _realtimeService = module.get(RealtimeAggregationService);
    _exportService = module.get(ExportService);
    _dashboardConfigService = module.get(DashboardConfigService);
  });

  // ==========================================================================
  // Basic Analytics Tests
  // ==========================================================================

  describe('Basic Analytics', () => {
    describe('GET /analytics/festivals/:festivalId/sales', () => {
      it('should return sales analytics for a festival', async () => {
        // Arrange
        const mockSales = {
          festivalId: ongoingFestival.id,
          period: { startDate: new Date(), endDate: new Date() },
          summary: {
            totalSales: 1000,
            totalRevenue: 50000,
            averageOrderValue: 50,
            uniqueCustomers: 900,
          },
          salesByDay: [],
          salesByHour: [],
          salesByCategory: [],
          topSellingCategories: [],
        };
        mockAnalyticsService.getSalesAnalytics.mockResolvedValue(mockSales);

        // Act
        const result = await controller.getSalesAnalytics(ongoingFestival.id, { groupBy: 'day' });

        // Assert
        expect(result.festivalId).toBe(ongoingFestival.id);
        expect(result.summary.totalSales).toBe(1000);
        expect(mockAnalyticsService.getSalesAnalytics).toHaveBeenCalledWith(ongoingFestival.id, {
          groupBy: 'day',
        });
      });
    });

    describe('GET /analytics/festivals/:festivalId/dashboard', () => {
      it('should have getFestivalDashboardKPIs method defined', () => {
        // Assert controller method exists
        expect(controller.getFestivalDashboardKPIs).toBeDefined();
        expect(typeof controller.getFestivalDashboardKPIs).toBe('function');
      });

      it('should call analyticsService.getDashboardKPIs with correct params', async () => {
        // Arrange
        const mockKPIs = { festivalId: ongoingFestival.id, ticketing: { totalSold: 1000 } };
        mockAnalyticsService.getDashboardKPIs.mockImplementation(() => Promise.resolve(mockKPIs));

        // Debug: check what service the controller is using
        // @ts-expect-error - accessing private property for testing
        const injectedService = controller['analyticsService'];
        expect(injectedService).toBe(mockAnalyticsService);
        expect(injectedService.getDashboardKPIs).toBe(mockAnalyticsService.getDashboardKPIs);

        // Act
        const result = await controller.getFestivalDashboardKPIs(ongoingFestival.id, {
          includeTrends: true,
        } as any);

        // Assert
        expect(mockAnalyticsService.getDashboardKPIs).toHaveBeenCalledWith(ongoingFestival.id, {
          includeTrends: true,
        });
        expect(result).toEqual(mockKPIs);
      });

      it('should propagate errors from service', async () => {
        // Arrange
        mockAnalyticsService.getDashboardKPIs.mockImplementation(() =>
          Promise.reject(new NotFoundException('Festival not found'))
        );

        // Act & Assert
        await expect(
          controller.getFestivalDashboardKPIs('non-existent', {} as any)
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('GET /analytics/festivals/:festivalId/cashless', () => {
      it('should return cashless analytics for a festival', async () => {
        // Arrange
        const mockCashless = {
          festivalId: ongoingFestival.id,
          period: { startDate: new Date(), endDate: new Date() },
          summary: {
            totalTopups: 500,
            totalTopupAmount: 25000,
            totalPayments: 800,
            totalPaymentAmount: 20000,
            totalTransfers: 50,
            totalRefunds: 20,
            averageTopupAmount: 50,
            averagePaymentAmount: 25,
            averageBalance: 45,
            totalActiveAccounts: 400,
          },
          transactionsByHour: [],
          transactionsByType: [],
          topupDistribution: [],
          balanceDistribution: [],
          vendorBreakdown: [],
        };
        mockAnalyticsService.getCashlessAnalytics.mockResolvedValue(mockCashless);

        // Act
        const result = await controller.getCashlessAnalytics(ongoingFestival.id, {
          groupBy: 'hour',
        });

        // Assert
        expect(result.festivalId).toBe(ongoingFestival.id);
        expect(result.summary.totalTopups).toBe(500);
        expect(mockAnalyticsService.getCashlessAnalytics).toHaveBeenCalledWith(ongoingFestival.id, {
          groupBy: 'hour',
        });
      });
    });

    describe('GET /analytics/festivals/:festivalId/attendance', () => {
      it('should return attendance analytics for a festival', async () => {
        // Arrange
        const mockAttendance = {
          festivalId: ongoingFestival.id,
          period: { startDate: new Date(), endDate: new Date() },
          current: { totalInside: 2500, maxCapacity: 10000, occupancyRate: 25 },
          hourlyAttendance: [],
          dailyAttendance: [],
          entryExitFlow: [],
          peakTimes: {
            peak: { time: new Date(), count: 3000 },
            lowest: { time: new Date(), count: 500 },
          },
          zoneDistribution: [],
        };
        mockAnalyticsService.getAttendanceAnalytics.mockResolvedValue(mockAttendance);

        // Act
        const result = await controller.getAttendanceAnalytics(ongoingFestival.id, {
          granularity: 'hour',
          includeFlow: true,
        });

        // Assert
        expect(result.festivalId).toBe(ongoingFestival.id);
        expect(result.current.totalInside).toBe(2500);
        expect(mockAnalyticsService.getAttendanceAnalytics).toHaveBeenCalledWith(
          ongoingFestival.id,
          { granularity: 'hour', includeFlow: true }
        );
      });
    });

    describe('GET /analytics/festivals/:festivalId/zones', () => {
      it('should return zone analytics for a festival', async () => {
        // Arrange
        const mockZones = {
          festivalId: ongoingFestival.id,
          period: { startDate: new Date(), endDate: new Date() },
          zones: [
            {
              zoneId: 'zone1',
              zoneName: 'Main Stage',
              capacity: 5000,
              currentOccupancy: 2000,
              occupancyRate: 40,
              totalVisits: 3000,
              uniqueVisitors: 2500,
              averageTimeSpent: 45,
              peakOccupancy: 3000,
              peakTime: new Date(),
              hourlyOccupancy: [],
            },
          ],
          heatmapData: [],
          zoneTransitions: [],
        };
        mockAnalyticsService.getZoneAnalytics.mockResolvedValue(mockZones);

        // Act
        const result = await controller.getZoneAnalytics(ongoingFestival.id, {
          includeHeatmap: false,
          includeTransitions: false,
        });

        // Assert
        expect(result.festivalId).toBe(ongoingFestival.id);
        expect(result.zones).toHaveLength(1);
        expect(result.zones[0].zoneName).toBe('Main Stage');
        expect(mockAnalyticsService.getZoneAnalytics).toHaveBeenCalledWith(ongoingFestival.id, {
          includeHeatmap: false,
          includeTransitions: false,
        });
      });
    });

    describe('GET /analytics/festivals/:festivalId/vendors', () => {
      it('should return vendor analytics for a festival', async () => {
        // Arrange
        const mockVendors = {
          festivalId: ongoingFestival.id,
          period: { startDate: new Date(), endDate: new Date() },
          summary: {
            totalVendors: 15,
            totalOrders: 2000,
            totalRevenue: 50000,
            averageOrderValue: 25,
          },
          vendorsByType: [],
          topVendors: [],
          topProducts: [],
          hourlyOrders: [],
          orderStatusBreakdown: [],
        };
        mockAnalyticsService.getVendorAnalytics.mockResolvedValue(mockVendors);

        // Act
        const result = await controller.getVendorAnalytics(ongoingFestival.id, {
          topLimit: 10,
          topProductsLimit: 20,
        });

        // Assert
        expect(result.festivalId).toBe(ongoingFestival.id);
        expect(result.summary.totalVendors).toBe(15);
        expect(mockAnalyticsService.getVendorAnalytics).toHaveBeenCalledWith(ongoingFestival.id, {
          topLimit: 10,
          topProductsLimit: 20,
        });
      });
    });
  });

  // ==========================================================================
  // Advanced Metrics Tests
  // ==========================================================================

  describe('Advanced Metrics', () => {
    const startDate = '2024-07-01T00:00:00Z';
    const endDate = '2024-07-07T23:59:59Z';

    describe('GET /analytics/festivals/:festivalId/metrics/revenue', () => {
      it('should return revenue metrics', async () => {
        // Arrange
        const mockMetrics = {
          festivalId: ongoingFestival.id,
          period: { startDate: new Date(startDate), endDate: new Date(endDate) },
          totalRevenue: 100000,
          ticketRevenue: 60000,
          cashlessRevenue: 25000,
          vendorRevenue: 10000,
          campingRevenue: 5000,
          refundsTotal: 2000,
          netRevenue: 98000,
          revenueByDay: [],
          revenueByCategory: [],
          projectedRevenue: 150000,
        };
        mockAdvancedMetricsService.getRevenueMetrics.mockResolvedValue(mockMetrics);

        // Act
        const result = await controller.getRevenueMetrics(ongoingFestival.id, startDate, endDate);

        // Assert
        expect(result.totalRevenue).toBe(100000);
        expect(mockAdvancedMetricsService.getRevenueMetrics).toHaveBeenCalledWith(
          ongoingFestival.id,
          new Date(startDate),
          new Date(endDate)
        );
      });
    });

    describe('GET /analytics/festivals/:festivalId/metrics/customers', () => {
      it('should return customer behavior metrics', async () => {
        // Arrange
        const mockMetrics = {
          festivalId: ongoingFestival.id,
          totalCustomers: 5000,
          newCustomers: 3000,
          returningCustomers: 2000,
          averageSpendPerCustomer: 200,
          customerSegments: [],
          purchasePatterns: [],
          retentionRate: 40,
        };
        mockAdvancedMetricsService.getCustomerMetrics.mockResolvedValue(mockMetrics);

        // Act
        const result = await controller.getCustomerMetrics(ongoingFestival.id, startDate, endDate);

        // Assert
        expect(result.totalCustomers).toBe(5000);
        expect(mockAdvancedMetricsService.getCustomerMetrics).toHaveBeenCalledWith(
          ongoingFestival.id,
          new Date(startDate),
          new Date(endDate)
        );
      });
    });

    describe('GET /analytics/festivals/:festivalId/metrics/performance', () => {
      it('should return operational performance metrics', async () => {
        // Arrange
        const mockMetrics = {
          festivalId: ongoingFestival.id,
          entryGatePerformance: [],
          vendorWaitTimes: [],
          staffEfficiency: [],
          systemUptime: 99.9,
          errorRates: [],
        };
        mockAdvancedMetricsService.getPerformanceMetrics.mockResolvedValue(mockMetrics);

        // Act
        const result = await controller.getPerformanceMetrics(
          ongoingFestival.id,
          startDate,
          endDate
        );

        // Assert
        expect(result.systemUptime).toBe(99.9);
        expect(mockAdvancedMetricsService.getPerformanceMetrics).toHaveBeenCalled();
      });
    });

    describe('GET /analytics/festivals/:festivalId/metrics/fraud', () => {
      it('should return fraud detection metrics', async () => {
        // Arrange
        const mockMetrics = {
          festivalId: ongoingFestival.id,
          suspiciousTransactions: 15,
          flaggedAccounts: 5,
          duplicateTicketAttempts: 3,
          fraudRiskScore: 12,
          alerts: [],
        };
        mockAdvancedMetricsService.getFraudMetrics.mockResolvedValue(mockMetrics);

        // Act
        const result = await controller.getFraudMetrics(ongoingFestival.id, startDate, endDate);

        // Assert
        expect(result.suspiciousTransactions).toBe(15);
        expect(mockAdvancedMetricsService.getFraudMetrics).toHaveBeenCalled();
      });
    });

    describe('GET /analytics/festivals/:festivalId/metrics/growth', () => {
      it('should return growth and trend metrics', async () => {
        // Arrange
        const mockMetrics = {
          festivalId: ongoingFestival.id,
          salesGrowth: 15,
          customerGrowth: 20,
          revenueGrowth: 25,
          trends: [],
        };
        mockAdvancedMetricsService.getGrowthMetrics.mockResolvedValue(mockMetrics);

        // Act
        const result = await controller.getGrowthMetrics(ongoingFestival.id, startDate, endDate);

        // Assert
        expect(result.salesGrowth).toBe(15);
        expect(mockAdvancedMetricsService.getGrowthMetrics).toHaveBeenCalled();
      });
    });

    describe('GET /analytics/festivals/:festivalId/metrics/forecast', () => {
      it('should return forecast metrics', async () => {
        // Arrange
        const mockMetrics = {
          festivalId: ongoingFestival.id,
          projectedRevenue: 200000,
          projectedAttendance: 15000,
          projectedSales: 12000,
          confidenceLevel: 85,
          forecastByDay: [],
        };
        mockAdvancedMetricsService.getForecastMetrics.mockResolvedValue(mockMetrics);

        // Act
        const result = await controller.getForecastMetrics(ongoingFestival.id, 7);

        // Assert
        expect(result.projectedRevenue).toBe(200000);
        expect(mockAdvancedMetricsService.getForecastMetrics).toHaveBeenCalledWith(
          ongoingFestival.id,
          7
        );
      });

      it('should use default daysAhead when not provided', async () => {
        // Arrange
        mockAdvancedMetricsService.getForecastMetrics.mockResolvedValue({
          festivalId: ongoingFestival.id,
          projectedRevenue: 0,
        });

        // Act
        await controller.getForecastMetrics(ongoingFestival.id, undefined);

        // Assert
        expect(mockAdvancedMetricsService.getForecastMetrics).toHaveBeenCalledWith(
          ongoingFestival.id,
          undefined
        );
      });
    });

    describe('GET /analytics/festivals/:festivalId/metrics/staff', () => {
      it('should return staff performance metrics', async () => {
        // Arrange
        const mockMetrics = {
          festivalId: ongoingFestival.id,
          totalStaff: 100,
          activeStaff: 85,
          staffByRole: [],
          averageShiftDuration: 8,
          efficiency: [],
        };
        mockAdvancedMetricsService.getStaffMetrics.mockResolvedValue(mockMetrics);

        // Act
        const result = await controller.getStaffMetrics(ongoingFestival.id, startDate, endDate);

        // Assert
        expect(result.totalStaff).toBe(100);
        expect(mockAdvancedMetricsService.getStaffMetrics).toHaveBeenCalled();
      });
    });

    describe('GET /analytics/festivals/:festivalId/metrics/environmental', () => {
      it('should return environmental metrics', async () => {
        // Arrange
        const mockMetrics = {
          festivalId: ongoingFestival.id,
          wasteGenerated: 5000,
          recyclingRate: 65,
          waterUsage: 10000,
          energyConsumption: 50000,
          carbonFootprint: 25000,
        };
        mockAdvancedMetricsService.getEnvironmentalMetrics.mockResolvedValue(mockMetrics);

        // Act
        const result = await controller.getEnvironmentalMetrics(
          ongoingFestival.id,
          startDate,
          endDate
        );

        // Assert
        expect(result.recyclingRate).toBe(65);
        expect(mockAdvancedMetricsService.getEnvironmentalMetrics).toHaveBeenCalled();
      });
    });

    describe('GET /analytics/festivals/:festivalId/metrics/security', () => {
      it('should return security metrics', async () => {
        // Arrange
        const mockMetrics = {
          festivalId: ongoingFestival.id,
          totalIncidents: 12,
          incidentsByType: [],
          responseTimeAverage: 3.5,
          securityAlerts: [],
        };
        mockAdvancedMetricsService.getSecurityMetrics.mockResolvedValue(mockMetrics);

        // Act
        const result = await controller.getSecurityMetrics(ongoingFestival.id, startDate, endDate);

        // Assert
        expect(result.totalIncidents).toBe(12);
        expect(mockAdvancedMetricsService.getSecurityMetrics).toHaveBeenCalled();
      });
    });

    describe('GET /analytics/festivals/:festivalId/metrics/comprehensive', () => {
      it('should return comprehensive analytics', async () => {
        // Arrange
        const mockMetrics = {
          festivalId: ongoingFestival.id,
          generatedAt: new Date(),
          revenue: {},
          customers: {},
          performance: {},
          fraud: {},
          growth: {},
        };
        mockAdvancedMetricsService.getComprehensiveAnalytics.mockResolvedValue(mockMetrics);

        // Act
        const result = await controller.getComprehensiveAnalytics(
          ongoingFestival.id,
          startDate,
          endDate
        );

        // Assert
        expect(result.festivalId).toBe(ongoingFestival.id);
        expect(mockAdvancedMetricsService.getComprehensiveAnalytics).toHaveBeenCalledWith(
          ongoingFestival.id,
          new Date(startDate),
          new Date(endDate)
        );
      });
    });
  });

  // ==========================================================================
  // Custom Reports Tests
  // ==========================================================================

  describe('Custom Reports', () => {
    describe('GET /analytics/festivals/:festivalId/reports', () => {
      it('should return all reports for a festival', async () => {
        // Arrange
        const mockReports = [
          {
            id: 'report1',
            name: 'Sales Report',
            festivalId: ongoingFestival.id,
            metrics: ['sales'],
            format: 'pdf',
          },
          {
            id: 'report2',
            name: 'Attendance Report',
            festivalId: ongoingFestival.id,
            metrics: ['attendance'],
            format: 'xlsx',
          },
        ];
        mockCustomReportsService.getReports.mockResolvedValue(mockReports);

        // Act
        const result = await controller.getReports(ongoingFestival.id);

        // Assert
        expect(result).toHaveLength(2);
        expect(mockCustomReportsService.getReports).toHaveBeenCalledWith(ongoingFestival.id);
      });
    });

    describe('POST /analytics/festivals/:festivalId/reports', () => {
      it('should create a custom report', async () => {
        // Arrange
        const reportData = {
          name: 'New Report',
          description: 'Test report',
          metrics: ['sales', 'revenue'],
          format: 'pdf',
        };
        const createdReport = {
          id: 'new-report-id',
          ...reportData,
          festivalId: ongoingFestival.id,
          createdBy: mockOrganizerUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockCustomReportsService.createReport.mockResolvedValue(createdReport);

        // Act
        const result = await controller.createReport(
          ongoingFestival.id,
          mockOrganizerUser,
          reportData
        );

        // Assert
        expect(result.id).toBe('new-report-id');
        expect(result.name).toBe('New Report');
        expect(mockCustomReportsService.createReport).toHaveBeenCalledWith(
          ongoingFestival.id,
          mockOrganizerUser.id,
          reportData
        );
      });
    });

    describe('GET /analytics/reports/:reportId', () => {
      it('should return a specific report', async () => {
        // Arrange
        const mockReport = { id: 'report1', name: 'Sales Report', festivalId: ongoingFestival.id };
        mockCustomReportsService.getReport.mockResolvedValue(mockReport);

        // Act
        const result = await controller.getReport('report1');

        // Assert
        expect(result.id).toBe('report1');
        expect(mockCustomReportsService.getReport).toHaveBeenCalledWith('report1');
      });

      it('should throw NotFoundException when report not found', async () => {
        // Arrange
        mockCustomReportsService.getReport.mockRejectedValue(
          new NotFoundException('Report not found')
        );

        // Act & Assert
        await expect(controller.getReport('non-existent')).rejects.toThrow(NotFoundException);
      });
    });

    describe('POST /analytics/reports/:reportId/execute', () => {
      it('should execute a report with time range', async () => {
        // Arrange
        const mockResult = { reportId: 'report1', data: [], generatedAt: new Date() };
        mockCustomReportsService.executeReport.mockResolvedValue(mockResult);
        const body = { startDate: '2024-07-01', endDate: '2024-07-07' };

        // Act
        const result = await controller.executeReport('report1', body);

        // Assert
        expect(result.reportId).toBe('report1');
        expect(mockCustomReportsService.executeReport).toHaveBeenCalledWith('report1', {
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
        });
      });

      it('should execute a report without time range', async () => {
        // Arrange
        const mockResult = { reportId: 'report1', data: [] };
        mockCustomReportsService.executeReport.mockResolvedValue(mockResult);

        // Act
        await controller.executeReport('report1', {});

        // Assert
        expect(mockCustomReportsService.executeReport).toHaveBeenCalledWith('report1', undefined);
      });
    });

    describe('DELETE /analytics/reports/:reportId', () => {
      it('should delete a report', async () => {
        // Arrange
        mockCustomReportsService.deleteReport.mockResolvedValue(undefined);

        // Act
        const result = await controller.deleteReport('report1');

        // Assert
        expect(result).toEqual({ success: true });
        expect(mockCustomReportsService.deleteReport).toHaveBeenCalledWith('report1');
      });
    });

    describe('GET /analytics/festivals/:festivalId/comparison', () => {
      it('should return comparison analytics', async () => {
        // Arrange
        const mockComparison = {
          currentPeriod: { revenue: 100000, sales: 1000 },
          previousPeriod: { revenue: 80000, sales: 800 },
          changes: { revenue: 25, sales: 25 },
        };
        mockCustomReportsService.getComparisonAnalytics.mockResolvedValue(mockComparison);

        // Act
        const result = await controller.getComparisonAnalytics(
          ongoingFestival.id,
          '2024-07-01',
          '2024-07-07',
          '2024-06-24',
          '2024-06-30',
          'revenue,sales'
        );

        // Assert
        expect(result.changes.revenue).toBe(25);
        expect(mockCustomReportsService.getComparisonAnalytics).toHaveBeenCalledWith(
          ongoingFestival.id,
          { startDate: new Date('2024-07-01'), endDate: new Date('2024-07-07') },
          { startDate: new Date('2024-06-24'), endDate: new Date('2024-06-30') },
          ['revenue', 'sales']
        );
      });
    });

    describe('GET /analytics/festivals/:festivalId/cohort', () => {
      it('should return cohort analysis', async () => {
        // Arrange
        const mockCohort = {
          cohorts: [],
          retentionMatrix: [],
          summary: { totalCohorts: 5, averageRetention: 40 },
        };
        mockCustomReportsService.getCohortAnalysis.mockResolvedValue(mockCohort);

        // Act
        const result = await controller.getCohortAnalysis(
          ongoingFestival.id,
          'acquisition_date',
          '2024-07-01',
          '2024-07-07'
        );

        // Assert
        expect(result.summary.totalCohorts).toBe(5);
        expect(mockCustomReportsService.getCohortAnalysis).toHaveBeenCalledWith(
          ongoingFestival.id,
          'acquisition_date',
          { startDate: new Date('2024-07-01'), endDate: new Date('2024-07-07') }
        );
      });
    });

    describe('GET /analytics/festivals/:festivalId/funnel/:funnelName', () => {
      it('should return funnel analysis', async () => {
        // Arrange
        const mockFunnel = {
          funnelName: 'purchase',
          stages: [
            { name: 'View', count: 10000 },
            { name: 'Cart', count: 3000 },
            { name: 'Purchase', count: 1000 },
          ],
          overallConversion: 10,
        };
        mockCustomReportsService.getFunnelAnalysis.mockResolvedValue(mockFunnel);

        // Act
        const result = await controller.getFunnelAnalysis(ongoingFestival.id, 'purchase');

        // Assert
        expect(result.overallConversion).toBe(10);
        expect(mockCustomReportsService.getFunnelAnalysis).toHaveBeenCalledWith(
          ongoingFestival.id,
          'purchase'
        );
      });
    });

    describe('GET /analytics/festivals/:festivalId/anomalies', () => {
      it('should detect anomalies', async () => {
        // Arrange
        const mockAnomalies = {
          metric: 'revenue',
          anomalies: [
            { timestamp: new Date(), value: 50000, expectedValue: 20000, deviation: 150 },
          ],
          totalAnomalies: 1,
        };
        mockCustomReportsService.detectAnomalies.mockResolvedValue(mockAnomalies);

        // Act
        const result = await controller.detectAnomalies(
          ongoingFestival.id,
          'revenue',
          '2024-07-01',
          '2024-07-07'
        );

        // Assert
        expect(result.totalAnomalies).toBe(1);
        expect(mockCustomReportsService.detectAnomalies).toHaveBeenCalledWith(
          ongoingFestival.id,
          'revenue',
          { startDate: new Date('2024-07-01'), endDate: new Date('2024-07-07') }
        );
      });
    });

    describe('GET /analytics/festivals/:festivalId/benchmarks', () => {
      it('should return benchmarks', async () => {
        // Arrange
        const mockBenchmarks = {
          festivalId: ongoingFestival.id,
          metrics: [
            { name: 'Revenue per attendee', value: 150, industryAverage: 120, percentile: 75 },
          ],
        };
        mockCustomReportsService.getBenchmarks.mockResolvedValue(mockBenchmarks);

        // Act
        const result = await controller.getBenchmarks(ongoingFestival.id);

        // Assert
        expect(result.metrics[0].percentile).toBe(75);
        expect(mockCustomReportsService.getBenchmarks).toHaveBeenCalledWith(ongoingFestival.id);
      });
    });
  });

  // ==========================================================================
  // Realtime Analytics Tests
  // ==========================================================================

  describe('Realtime Analytics', () => {
    describe('GET /analytics/festivals/:festivalId/realtime', () => {
      it('should return realtime analytics', async () => {
        // Arrange
        const mockRealtime = {
          festivalId: ongoingFestival.id,
          timestamp: new Date(),
          live: {
            currentAttendees: 5000,
            lastHourEntries: 500,
            lastHourExits: 200,
            activeZones: [],
          },
          lastHour: {
            ticketsSold: 50,
            ticketRevenue: 2500,
            cashlessTopups: 100,
            cashlessPayments: 300,
            vendorOrders: 150,
          },
          alerts: [],
        };
        mockAnalyticsService.getRealtimeAnalytics.mockResolvedValue(mockRealtime);

        // Act
        const result = await controller.getRealtimeAnalytics(ongoingFestival.id, {
          includeAlerts: true,
          includeZones: true,
        });

        // Assert
        expect(result.live.currentAttendees).toBe(5000);
        expect(mockAnalyticsService.getRealtimeAnalytics).toHaveBeenCalledWith(ongoingFestival.id, {
          includeAlerts: true,
          includeZones: true,
        });
      });
    });

    describe('GET /analytics/festivals/:festivalId/realtime/live', () => {
      it('should return live festival metrics', async () => {
        // Arrange
        const mockLive = {
          currentAttendees: 5000,
          entriesPerMinute: 15,
          exitsPerMinute: 8,
          activeZones: 12,
          ticketsSoldLastHour: 100,
          topupAmountLastHour: 5000,
        };
        mockRealtimeService.getLiveFestivalMetrics.mockResolvedValue(mockLive);

        // Act
        const result = await controller.getLiveMetrics(ongoingFestival.id);

        // Assert
        expect(result.currentAttendees).toBe(5000);
        expect(mockRealtimeService.getLiveFestivalMetrics).toHaveBeenCalledWith(ongoingFestival.id);
      });
    });

    describe('GET /analytics/festivals/:festivalId/realtime/zones', () => {
      it('should return live zone metrics', async () => {
        // Arrange
        const mockZones = [
          {
            zoneId: 'zone1',
            zoneName: 'Main Stage',
            currentOccupancy: 2000,
            capacity: 5000,
            trend: 'up',
          },
          {
            zoneId: 'zone2',
            zoneName: 'VIP Area',
            currentOccupancy: 300,
            capacity: 500,
            trend: 'stable',
          },
        ];
        mockRealtimeService.getLiveZoneMetrics.mockResolvedValue(mockZones);

        // Act
        const result = await controller.getLiveZoneMetrics(ongoingFestival.id);

        // Assert
        expect(result).toHaveLength(2);
        expect(mockRealtimeService.getLiveZoneMetrics).toHaveBeenCalledWith(ongoingFestival.id);
      });
    });

    describe('POST /analytics/festivals/:festivalId/realtime/sync', () => {
      it('should sync realtime counters from database', async () => {
        // Arrange
        mockRealtimeService.syncFromDatabase.mockResolvedValue(undefined);

        // Act
        const result = await controller.syncRealtimeCounters(ongoingFestival.id);

        // Assert
        expect(result).toEqual({ success: true, message: 'Counters synced successfully' });
        expect(mockRealtimeService.syncFromDatabase).toHaveBeenCalledWith(ongoingFestival.id);
      });
    });
  });

  // ==========================================================================
  // Export Tests
  // ==========================================================================

  describe('Exports', () => {
    describe('GET /analytics/festivals/:festivalId/export', () => {
      it('should export analytics data', async () => {
        // Arrange
        const mockResult = {
          data: Buffer.from('csv content'),
          mimeType: 'text/csv',
          filename: 'analytics_2024-07-01.csv',
        };
        mockExportService.exportData.mockResolvedValue(mockResult);
        const res = mockResponse();

        // Act
        await controller.exportAnalytics(
          ongoingFestival.id,
          { format: 'csv', dataType: 'sales', startDate: '2024-07-01', endDate: '2024-07-07' },
          res
        );

        // Assert
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
        expect(res.setHeader).toHaveBeenCalledWith(
          'Content-Disposition',
          'attachment; filename="analytics_2024-07-01.csv"'
        );
        expect(res.send).toHaveBeenCalledWith(mockResult.data);
      });
    });

    describe('GET /analytics/festivals/:festivalId/export/sales', () => {
      it('should export sales data as CSV', async () => {
        // Arrange
        const mockResult = {
          data: Buffer.from('sales csv'),
          mimeType: 'text/csv',
          filename: 'sales_2024-07-01.csv',
        };
        mockExportService.exportSalesData.mockResolvedValue(mockResult);
        const res = mockResponse();

        // Act
        await controller.exportSales(ongoingFestival.id, '2024-07-01', '2024-07-07', 'csv', res);

        // Assert
        expect(mockExportService.exportSalesData).toHaveBeenCalledWith(
          ongoingFestival.id,
          { startDate: new Date('2024-07-01'), endDate: new Date('2024-07-07') },
          'csv'
        );
        expect(res.send).toHaveBeenCalledWith(mockResult.data);
      });

      it('should default to CSV format', async () => {
        // Arrange
        const mockResult = {
          data: Buffer.from('data'),
          mimeType: 'text/csv',
          filename: 'sales.csv',
        };
        mockExportService.exportSalesData.mockResolvedValue(mockResult);
        const res = mockResponse();

        // Act
        await controller.exportSales(
          ongoingFestival.id,
          '2024-07-01',
          '2024-07-07',
          undefined as any,
          res
        );

        // Assert
        expect(mockExportService.exportSalesData).toHaveBeenCalledWith(
          ongoingFestival.id,
          expect.any(Object),
          'csv'
        );
      });
    });

    describe('GET /analytics/festivals/:festivalId/export/cashless', () => {
      it('should export cashless data', async () => {
        // Arrange
        const mockResult = {
          data: Buffer.from('cashless data'),
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: 'cashless.xlsx',
        };
        mockExportService.exportCashlessData.mockResolvedValue(mockResult);
        const res = mockResponse();

        // Act
        await controller.exportCashless(
          ongoingFestival.id,
          '2024-07-01',
          '2024-07-07',
          'xlsx',
          res
        );

        // Assert
        expect(mockExportService.exportCashlessData).toHaveBeenCalledWith(
          ongoingFestival.id,
          { startDate: new Date('2024-07-01'), endDate: new Date('2024-07-07') },
          'xlsx'
        );
      });
    });

    describe('GET /analytics/festivals/:festivalId/export/attendance', () => {
      it('should export attendance data', async () => {
        // Arrange
        const mockResult = {
          data: Buffer.from('attendance data'),
          mimeType: 'text/csv',
          filename: 'attendance.csv',
        };
        mockExportService.exportAttendanceData.mockResolvedValue(mockResult);
        const res = mockResponse();

        // Act
        await controller.exportAttendance(
          ongoingFestival.id,
          '2024-07-01',
          '2024-07-07',
          'csv',
          res
        );

        // Assert
        expect(mockExportService.exportAttendanceData).toHaveBeenCalledWith(
          ongoingFestival.id,
          { startDate: new Date('2024-07-01'), endDate: new Date('2024-07-07') },
          'csv'
        );
      });
    });

    describe('GET /analytics/festivals/:festivalId/export/vendors', () => {
      it('should export vendor data', async () => {
        // Arrange
        const mockResult = {
          data: Buffer.from('vendor data'),
          mimeType: 'text/csv',
          filename: 'vendors.csv',
        };
        mockExportService.exportVendorData.mockResolvedValue(mockResult);
        const res = mockResponse();

        // Act
        await controller.exportVendors(ongoingFestival.id, '2024-07-01', '2024-07-07', 'csv', res);

        // Assert
        expect(mockExportService.exportVendorData).toHaveBeenCalledWith(
          ongoingFestival.id,
          { startDate: new Date('2024-07-01'), endDate: new Date('2024-07-07') },
          'csv'
        );
      });
    });

    describe('GET /analytics/festivals/:festivalId/export/financial', () => {
      it('should export financial summary as PDF', async () => {
        // Arrange
        const mockResult = {
          data: Buffer.from('pdf content'),
          mimeType: 'application/pdf',
          filename: 'financial_report.pdf',
        };
        mockExportService.exportFinancialSummary.mockResolvedValue(mockResult);
        const res = mockResponse();

        // Act
        await controller.exportFinancial(
          ongoingFestival.id,
          '2024-07-01',
          '2024-07-07',
          'pdf',
          res
        );

        // Assert
        expect(mockExportService.exportFinancialSummary).toHaveBeenCalledWith(
          ongoingFestival.id,
          { startDate: new Date('2024-07-01'), endDate: new Date('2024-07-07') },
          'pdf'
        );
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      });
    });

    describe('GET /analytics/festivals/:festivalId/export/comprehensive', () => {
      it('should export comprehensive report', async () => {
        // Arrange
        const mockResult = {
          data: Buffer.from('comprehensive report'),
          mimeType: 'application/pdf',
          filename: 'comprehensive_report.pdf',
        };
        mockExportService.exportComprehensiveReport.mockResolvedValue(mockResult);
        const res = mockResponse();

        // Act
        await controller.exportComprehensive(
          ongoingFestival.id,
          '2024-07-01',
          '2024-07-07',
          'pdf',
          res
        );

        // Assert
        expect(mockExportService.exportComprehensiveReport).toHaveBeenCalledWith(
          ongoingFestival.id,
          { startDate: new Date('2024-07-01'), endDate: new Date('2024-07-07') },
          'pdf'
        );
      });
    });
  });

  // ==========================================================================
  // Dashboard Config Tests
  // ==========================================================================

  describe('Dashboard Config', () => {
    describe('GET /analytics/dashboards/templates', () => {
      it('should return available dashboard templates', async () => {
        // Arrange
        const mockTemplates = [
          { id: 'executive', name: 'Executive Dashboard', category: 'executive', widgets: [] },
          { id: 'operations', name: 'Operations Dashboard', category: 'operations', widgets: [] },
        ];
        mockDashboardConfigService.getTemplates.mockReturnValue(mockTemplates);

        // Act
        const result = await controller.getDashboardTemplates();

        // Assert
        expect(result).toHaveLength(2);
        expect(mockDashboardConfigService.getTemplates).toHaveBeenCalled();
      });
    });

    describe('GET /analytics/dashboards/templates/:templateId', () => {
      it('should return a specific template', async () => {
        // Arrange
        const mockTemplate = { id: 'executive', name: 'Executive Dashboard', widgets: [] };
        mockDashboardConfigService.getTemplate.mockReturnValue(mockTemplate);

        // Act
        const result = await controller.getDashboardTemplate('executive');

        // Assert
        expect(result.id).toBe('executive');
        expect(mockDashboardConfigService.getTemplate).toHaveBeenCalledWith('executive');
      });

      it('should throw NotFoundException for non-existent template', async () => {
        // Arrange
        const error = new NotFoundException('Template not found');
        mockDashboardConfigService.getTemplate.mockImplementation(() => {
          throw error;
        });

        // Act & Assert
        try {
          await controller.getDashboardTemplate('non-existent');
          fail('Should have thrown NotFoundException');
        } catch (e) {
          expect(e).toBeInstanceOf(NotFoundException);
          expect((e as NotFoundException).message).toBe('Template not found');
        }
      });
    });

    describe('GET /analytics/dashboards/widget-types', () => {
      it('should return available widget types', async () => {
        // Arrange
        const mockTypes = [
          { type: 'kpi', name: 'KPI Card', description: 'Single metric display' },
          { type: 'chart', name: 'Chart', description: 'Line/bar chart' },
        ];
        mockDashboardConfigService.getWidgetTypes.mockReturnValue(mockTypes);

        // Act
        const result = await controller.getWidgetTypes();

        // Assert
        expect(result).toHaveLength(2);
        expect(mockDashboardConfigService.getWidgetTypes).toHaveBeenCalled();
      });
    });

    describe('GET /analytics/dashboards/metrics', () => {
      it('should return available metrics', async () => {
        // Arrange
        const mockMetrics = [
          { id: 'total_revenue', name: 'Total Revenue', category: 'revenue' },
          { id: 'ticket_sales', name: 'Ticket Sales', category: 'sales' },
        ];
        mockDashboardConfigService.getAvailableMetrics.mockReturnValue(mockMetrics);

        // Act
        const result = await controller.getAvailableMetrics();

        // Assert
        expect(result).toHaveLength(2);
        expect(mockDashboardConfigService.getAvailableMetrics).toHaveBeenCalled();
      });
    });

    describe('GET /analytics/festivals/:festivalId/dashboards', () => {
      it('should return all dashboards for a festival', async () => {
        // Arrange
        const mockDashboards = [
          { id: 'dash1', name: 'Main Dashboard', festivalId: ongoingFestival.id },
          { id: 'dash2', name: 'Sales Dashboard', festivalId: ongoingFestival.id },
        ];
        mockDashboardConfigService.getDashboards.mockResolvedValue(mockDashboards);

        // Act
        const result = await controller.getDashboards(ongoingFestival.id);

        // Assert
        expect(result).toHaveLength(2);
        expect(mockDashboardConfigService.getDashboards).toHaveBeenCalledWith(ongoingFestival.id);
      });
    });

    describe('POST /analytics/festivals/:festivalId/dashboards', () => {
      it('should create a custom dashboard', async () => {
        // Arrange
        const dashboardData = { name: 'My Dashboard', description: 'Custom dashboard' };
        const createdDashboard = {
          id: 'new-dash-id',
          ...dashboardData,
          festivalId: ongoingFestival.id,
          createdBy: mockOrganizerUser.id,
          widgets: [],
        };
        mockDashboardConfigService.createDashboard.mockResolvedValue(createdDashboard);

        // Act
        const result = await controller.createDashboard(
          ongoingFestival.id,
          mockOrganizerUser,
          dashboardData
        );

        // Assert
        expect(result.id).toBe('new-dash-id');
        expect(mockDashboardConfigService.createDashboard).toHaveBeenCalledWith(
          ongoingFestival.id,
          mockOrganizerUser.id,
          dashboardData
        );
      });
    });

    describe('POST /analytics/festivals/:festivalId/dashboards/from-template', () => {
      it('should create dashboard from template', async () => {
        // Arrange
        const body = { templateId: 'executive', customName: 'My Executive Dashboard' };
        const createdDashboard = {
          id: 'new-dash-id',
          name: 'My Executive Dashboard',
          festivalId: ongoingFestival.id,
          widgets: [],
        };
        mockDashboardConfigService.createFromTemplate.mockResolvedValue(createdDashboard);

        // Act
        const result = await controller.createFromTemplate(
          ongoingFestival.id,
          mockOrganizerUser,
          body
        );

        // Assert
        expect(result.name).toBe('My Executive Dashboard');
        expect(mockDashboardConfigService.createFromTemplate).toHaveBeenCalledWith(
          ongoingFestival.id,
          mockOrganizerUser.id,
          'executive',
          'My Executive Dashboard'
        );
      });
    });

    describe('GET /analytics/dashboards/:dashboardId', () => {
      it('should return a specific dashboard', async () => {
        // Arrange
        const mockDashboard = { id: 'dash1', name: 'Main Dashboard', widgets: [] };
        mockDashboardConfigService.getDashboard.mockResolvedValue(mockDashboard);

        // Act
        const result = await controller.getDashboard('dash1');

        // Assert
        expect(result.id).toBe('dash1');
        expect(mockDashboardConfigService.getDashboard).toHaveBeenCalledWith('dash1');
      });
    });

    describe('PUT /analytics/dashboards/:dashboardId', () => {
      it('should update a dashboard', async () => {
        // Arrange
        const updates = { name: 'Updated Dashboard', refreshInterval: 60 };
        const updatedDashboard = { id: 'dash1', ...updates };
        mockDashboardConfigService.updateDashboard.mockResolvedValue(updatedDashboard);

        // Act
        const result = await controller.updateDashboard('dash1', updates);

        // Assert
        expect(result.name).toBe('Updated Dashboard');
        expect(mockDashboardConfigService.updateDashboard).toHaveBeenCalledWith('dash1', updates);
      });
    });

    describe('DELETE /analytics/dashboards/:dashboardId', () => {
      it('should delete a dashboard', async () => {
        // Arrange
        mockDashboardConfigService.deleteDashboard.mockResolvedValue(undefined);

        // Act
        const result = await controller.deleteDashboard('dash1');

        // Assert
        expect(result).toEqual({ success: true });
        expect(mockDashboardConfigService.deleteDashboard).toHaveBeenCalledWith('dash1');
      });
    });

    describe('POST /analytics/dashboards/:dashboardId/widgets', () => {
      it('should add a widget to dashboard', async () => {
        // Arrange
        const widget = {
          type: 'kpi',
          title: 'Total Revenue',
          metric: 'total_revenue',
          position: { x: 0, y: 0, width: 4, height: 2 },
        };
        const updatedDashboard = { id: 'dash1', widgets: [{ id: 'widget1', ...widget }] };
        mockDashboardConfigService.addWidget.mockResolvedValue(updatedDashboard);

        // Act
        const result = await controller.addWidget('dash1', widget);

        // Assert
        expect(result.widgets).toHaveLength(1);
        expect(mockDashboardConfigService.addWidget).toHaveBeenCalledWith('dash1', widget);
      });
    });

    describe('PUT /analytics/dashboards/:dashboardId/widgets/:widgetId', () => {
      it('should update a widget', async () => {
        // Arrange
        const updates = { title: 'Updated Title' };
        const updatedDashboard = {
          id: 'dash1',
          widgets: [{ id: 'widget1', title: 'Updated Title' }],
        };
        mockDashboardConfigService.updateWidget.mockResolvedValue(updatedDashboard);

        // Act
        const result = await controller.updateWidget('dash1', 'widget1', updates);

        // Assert
        expect(result.widgets[0].title).toBe('Updated Title');
        expect(mockDashboardConfigService.updateWidget).toHaveBeenCalledWith(
          'dash1',
          'widget1',
          updates
        );
      });
    });

    describe('DELETE /analytics/dashboards/:dashboardId/widgets/:widgetId', () => {
      it('should remove a widget from dashboard', async () => {
        // Arrange
        const updatedDashboard = { id: 'dash1', widgets: [] };
        mockDashboardConfigService.removeWidget.mockResolvedValue(updatedDashboard);

        // Act
        const result = await controller.removeWidget('dash1', 'widget1');

        // Assert
        expect(result.widgets).toHaveLength(0);
        expect(mockDashboardConfigService.removeWidget).toHaveBeenCalledWith('dash1', 'widget1');
      });
    });

    describe('POST /analytics/dashboards/:dashboardId/set-default', () => {
      it('should set dashboard as default', async () => {
        // Arrange
        const updatedDashboard = { id: 'dash1', isDefault: true };
        mockDashboardConfigService.setDefault.mockResolvedValue(updatedDashboard);

        // Act
        const result = await controller.setDefaultDashboard('dash1');

        // Assert
        expect(result.isDefault).toBe(true);
        expect(mockDashboardConfigService.setDefault).toHaveBeenCalledWith('dash1');
      });
    });

    describe('POST /analytics/dashboards/:dashboardId/clone', () => {
      it('should clone a dashboard', async () => {
        // Arrange
        const body = { newName: 'Cloned Dashboard', targetFestivalId: 'festival2' };
        const clonedDashboard = {
          id: 'cloned-dash',
          name: 'Cloned Dashboard',
          festivalId: 'festival2',
        };
        mockDashboardConfigService.cloneDashboard.mockResolvedValue(clonedDashboard);

        // Act
        const result = await controller.cloneDashboard('dash1', body);

        // Assert
        expect(result.name).toBe('Cloned Dashboard');
        expect(mockDashboardConfigService.cloneDashboard).toHaveBeenCalledWith(
          'dash1',
          'Cloned Dashboard',
          'festival2'
        );
      });

      it('should clone to same festival when targetFestivalId not provided', async () => {
        // Arrange
        const body = { newName: 'Cloned Dashboard' };
        mockDashboardConfigService.cloneDashboard.mockResolvedValue({
          id: 'cloned',
          name: 'Cloned Dashboard',
        });

        // Act
        await controller.cloneDashboard('dash1', body);

        // Assert
        expect(mockDashboardConfigService.cloneDashboard).toHaveBeenCalledWith(
          'dash1',
          'Cloned Dashboard',
          undefined
        );
      });
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should propagate NotFoundException from services', async () => {
      // Arrange
      (analyticsService.getDashboardKPIs as jest.Mock).mockRejectedValue(
        new NotFoundException('Festival not found')
      );

      // Act & Assert
      await expect(controller.getFestivalDashboardKPIs('non-existent', {})).rejects.toThrow(
        NotFoundException
      );
    });

    it('should propagate errors from advanced metrics service', async () => {
      // Arrange
      mockAdvancedMetricsService.getRevenueMetrics.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        controller.getRevenueMetrics(ongoingFestival.id, '2024-07-01', '2024-07-07')
      ).rejects.toThrow('Database error');
    });

    it('should propagate errors from export service', async () => {
      // Arrange
      mockExportService.exportSalesData.mockRejectedValue(new Error('Export failed'));
      const res = mockResponse();

      // Act & Assert
      await expect(
        controller.exportSales(ongoingFestival.id, '2024-07-01', '2024-07-07', 'csv', res)
      ).rejects.toThrow('Export failed');
    });
  });

  // ==========================================================================
  // Authorization Tests (Role-based)
  // ==========================================================================

  describe('Authorization', () => {
    it('should pass user from CurrentUser decorator to createReport', async () => {
      // Arrange
      mockCustomReportsService.createReport.mockResolvedValue({
        id: 'report1',
        createdBy: mockAdminUser.id,
      });

      // Act
      await controller.createReport(ongoingFestival.id, mockAdminUser, {
        name: 'Test',
        metrics: [],
        format: 'pdf',
      });

      // Assert
      expect(mockCustomReportsService.createReport).toHaveBeenCalledWith(
        ongoingFestival.id,
        mockAdminUser.id,
        expect.any(Object)
      );
    });

    it('should pass user from CurrentUser decorator to createDashboard', async () => {
      // Arrange
      mockDashboardConfigService.createDashboard.mockResolvedValue({
        id: 'dash1',
        createdBy: mockAdminUser.id,
      });

      // Act
      await controller.createDashboard(ongoingFestival.id, mockAdminUser, { name: 'Test' });

      // Assert
      expect(mockDashboardConfigService.createDashboard).toHaveBeenCalledWith(
        ongoingFestival.id,
        mockAdminUser.id,
        expect.any(Object)
      );
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty query parameters', async () => {
      // Arrange
      (analyticsService.getDashboardKPIs as jest.Mock).mockResolvedValue({
        festivalId: ongoingFestival.id,
        ticketing: { totalSold: 0 },
      });

      // Act
      const result = await controller.getFestivalDashboardKPIs(ongoingFestival.id, {});

      // Assert
      expect(result.festivalId).toBe(ongoingFestival.id);
    });

    it('should handle default export format values', async () => {
      // Arrange
      const mockResult = {
        data: Buffer.from('data'),
        mimeType: 'application/pdf',
        filename: 'report.pdf',
      };
      mockExportService.exportFinancialSummary.mockResolvedValue(mockResult);
      const res = mockResponse();

      // Act
      await controller.exportFinancial(
        ongoingFestival.id,
        '2024-07-01',
        '2024-07-07',
        undefined as any,
        res
      );

      // Assert
      // Default is 'pdf' for financial export
      expect(mockExportService.exportFinancialSummary).toHaveBeenCalledWith(
        ongoingFestival.id,
        expect.any(Object),
        'pdf'
      );
    });

    it('should handle optional daysAhead in forecast metrics', async () => {
      // Arrange
      mockAdvancedMetricsService.getForecastMetrics.mockResolvedValue({
        festivalId: ongoingFestival.id,
        projectedRevenue: 100000,
      });

      // Act
      const result = await controller.getForecastMetrics(ongoingFestival.id);

      // Assert
      expect(result.projectedRevenue).toBe(100000);
      expect(mockAdvancedMetricsService.getForecastMetrics).toHaveBeenCalledWith(
        ongoingFestival.id,
        undefined
      );
    });

    it('should parse metrics string correctly for comparison', async () => {
      // Arrange
      mockCustomReportsService.getComparisonAnalytics.mockResolvedValue({});

      // Act
      await controller.getComparisonAnalytics(
        ongoingFestival.id,
        '2024-07-01',
        '2024-07-07',
        '2024-06-24',
        '2024-06-30',
        'revenue,sales,attendance'
      );

      // Assert
      expect(mockCustomReportsService.getComparisonAnalytics).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
        ['revenue', 'sales', 'attendance']
      );
    });

    it('should handle includeCharts option in export', async () => {
      // Arrange
      const mockResult = {
        data: Buffer.from('data'),
        mimeType: 'text/csv',
        filename: 'export.csv',
      };
      mockExportService.exportData.mockResolvedValue(mockResult);
      const res = mockResponse();

      // Act
      await controller.exportAnalytics(
        ongoingFestival.id,
        { format: 'csv', dataType: 'sales', includeCharts: true },
        res
      );

      // Assert
      expect(mockExportService.exportData).toHaveBeenCalledWith(
        ongoingFestival.id,
        expect.objectContaining({
          includeCharts: true,
        })
      );
    });
  });
});
