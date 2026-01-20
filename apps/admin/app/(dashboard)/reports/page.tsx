'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Scatter,
  ScatterChart,
  ZAxis,
} from 'recharts';
import { formatCurrency, formatNumber, formatDate, cn } from '@/lib/utils';
import {
  mockFestivals,
  mockTicketCategories,
  generateRevenueChartData,
  generateTicketSalesChartData,
} from '@/lib/mock-data';
import {
  TrendAnalysisChart,
  RevenueBreakdownChart,
  OccupancyHeatmap,
} from '@/components/analytics';

// Types
interface ReportMetric {
  label: string;
  value: number;
  previousValue: number;
  format: 'currency' | 'number' | 'percentage';
}

type ReportPeriod = '7d' | '30d' | '90d' | '1y' | 'all';
type ChartType = 'revenue' | 'tickets' | 'users' | 'cashless' | 'zones';

// Color palette
const COLORS = [
  '#0ea5e9',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

// Generate mock data for advanced reports
function generateCashlessData(days: number) {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      topups: Math.round(5000 + Math.random() * 3000),
      payments: Math.round(8000 + Math.random() * 5000),
      refunds: Math.round(500 + Math.random() * 500),
    });
  }
  return data;
}

function generateZoneData() {
  return [
    { name: 'Scene Principale', capacity: 50000, current: 42500, entries: 85000, exits: 42500 },
    { name: 'Zone VIP', capacity: 2000, current: 1850, entries: 3200, exits: 1350 },
    { name: 'Backstage', capacity: 500, current: 320, entries: 1200, exits: 880 },
    { name: 'Food Court', capacity: 5000, current: 3200, entries: 25000, exits: 21800 },
    { name: 'Camping', capacity: 10000, current: 8500, entries: 8500, exits: 0 },
    { name: 'Parking', capacity: 8000, current: 6200, entries: 6500, exits: 300 },
  ];
}

function generateUserGrowthData(days: number) {
  const data = [];
  const now = new Date();
  let totalUsers = 40000;
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const newUsers = Math.round(50 + Math.random() * 100);
    totalUsers += newUsers;
    data.push({
      date: date.toISOString().split('T')[0],
      newUsers,
      totalUsers,
      activeUsers: Math.round(totalUsers * (0.3 + Math.random() * 0.2)),
    });
  }
  return data;
}

function generateRevenueByCategory() {
  return mockTicketCategories.map((cat) => ({
    name: cat.name,
    value: cat.sold * cat.price,
    sold: cat.sold,
    price: cat.price,
  }));
}

function generateHourlyTraffic() {
  const data = [];
  for (let hour = 0; hour < 24; hour++) {
    const baseTraffic = hour >= 14 && hour <= 23 ? 3000 : hour >= 10 ? 1500 : 200;
    data.push({
      hour: `${hour.toString().padStart(2, '0')}h`,
      entries: Math.round(baseTraffic + Math.random() * 1000),
      exits: Math.round(baseTraffic * 0.6 + Math.random() * 600),
    });
  }
  return data;
}

function generatePerformanceRadar() {
  return [
    { metric: 'Ventes', current: 85, target: 100 },
    { metric: 'Satisfaction', current: 92, target: 100 },
    { metric: 'Affluence', current: 78, target: 100 },
    { metric: 'Cashless', current: 95, target: 100 },
    { metric: 'Securite', current: 98, target: 100 },
    { metric: 'Support', current: 88, target: 100 },
  ];
}

function generateVendorSalesData() {
  return [
    { name: 'Bar Central', x: 45000, y: 1200, z: 95 },
    { name: 'Food Truck A', x: 28000, y: 800, z: 88 },
    { name: 'Merch Official', x: 62000, y: 450, z: 92 },
    { name: 'Glaces', x: 15000, y: 600, z: 78 },
    { name: 'Pizza Corner', x: 35000, y: 950, z: 85 },
  ];
}

// Data for new analytics components
function generateTrendData(days: number) {
  const data = [];
  const now = new Date();
  const baseValue = 15000;
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    // Add some trend and seasonality
    const trend = i * 50; // Upward trend
    const weekday = date.getDay();
    const weekendBoost = weekday === 0 || weekday === 6 ? 3000 : 0;
    const noise = (Math.random() - 0.5) * 4000;
    const value = Math.max(0, Math.round(baseValue + trend + weekendBoost + noise));

    data.push({
      date: date.toISOString().split('T')[0],
      value,
      previousPeriod: Math.round(value * (0.75 + Math.random() * 0.2)),
    });
  }
  return data;
}

function generateRevenueByCategoryData(days: number) {
  const categories = ['standard', 'vip', 'backstage', 'camping', 'cashless'];
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const row: Record<string, string | number> = {
      date: date.toISOString().split('T')[0],
    };
    categories.forEach((cat) => {
      const base =
        cat === 'standard'
          ? 8000
          : cat === 'vip'
            ? 4000
            : cat === 'backstage'
              ? 1500
              : cat === 'camping'
                ? 2000
                : 5000;
      row[cat] = Math.round(base + Math.random() * base * 0.5);
    });
    data.push(row);
  }
  return { data, categories };
}

function generateHeatmapData() {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const data = [];

  for (const day of days) {
    for (let hour = 0; hour < 24; hour++) {
      // Peak hours during evening on weekends
      const isWeekend = day === 'Sam' || day === 'Dim';
      const isPeakHour = hour >= 16 && hour <= 23;
      const baseValue = isWeekend && isPeakHour ? 800 : isPeakHour ? 500 : hour >= 10 ? 200 : 50;
      const value = Math.round(baseValue + Math.random() * baseValue * 0.5);

      data.push({ hour, day, value });
    }
  }
  return data;
}

// Custom tooltip
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatNumber(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('30d');
  const [activeChart, setActiveChart] = useState<ChartType>('revenue');
  const [selectedFestival, setSelectedFestival] = useState<string>('all');

  // Generate data based on period
  const days = useMemo(() => {
    switch (period) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      case '1y':
        return 365;
      default:
        return 365;
    }
  }, [period]);

  const revenueData = useMemo(() => generateRevenueChartData(days), [days]);
  const ticketSalesData = useMemo(() => generateTicketSalesChartData(days), [days]);
  const cashlessData = useMemo(() => generateCashlessData(days), [days]);
  const userGrowthData = useMemo(() => generateUserGrowthData(days), [days]);
  const zoneData = useMemo(() => generateZoneData(), []);
  const revenueByCategoryData = useMemo(() => generateRevenueByCategory(), []);
  const hourlyTrafficData = useMemo(() => generateHourlyTraffic(), []);
  const performanceRadarData = useMemo(() => generatePerformanceRadar(), []);
  const vendorSalesData = useMemo(() => generateVendorSalesData(), []);

  // New analytics data
  const trendData = useMemo(() => generateTrendData(days), [days]);
  const revenueByCategoryResult = useMemo(() => generateRevenueByCategoryData(days), [days]);
  const heatmapData = useMemo(() => generateHeatmapData(), []);

  // Calculate metrics
  const metrics: ReportMetric[] = useMemo(() => {
    const currentRevenue = revenueData.reduce((sum, d) => sum + d.value, 0);
    const previousRevenue = currentRevenue * 0.85;
    const currentTickets = ticketSalesData.reduce((sum, d) => sum + d.value, 0);
    const previousTickets = currentTickets * 0.9;
    const currentCashless = cashlessData.reduce((sum, d) => sum + d.topups, 0);
    const previousCashless = currentCashless * 0.75;
    const avgOccupancy =
      zoneData.reduce((sum, z) => sum + (z.current / z.capacity) * 100, 0) / zoneData.length;

    return [
      {
        label: 'Revenus totaux',
        value: currentRevenue,
        previousValue: previousRevenue,
        format: 'currency',
      },
      {
        label: 'Billets vendus',
        value: currentTickets,
        previousValue: previousTickets,
        format: 'number',
      },
      {
        label: 'Recharges cashless',
        value: currentCashless,
        previousValue: previousCashless,
        format: 'currency',
      },
      {
        label: 'Taux occupation moyen',
        value: avgOccupancy,
        previousValue: 72,
        format: 'percentage',
      },
    ];
  }, [revenueData, ticketSalesData, cashlessData, zoneData]);

  const formatMetricValue = (metric: ReportMetric) => {
    switch (metric.format) {
      case 'currency':
        return formatCurrency(metric.value);
      case 'percentage':
        return `${metric.value.toFixed(1)}%`;
      default:
        return formatNumber(metric.value);
    }
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports et Analyses</h1>
          <p className="text-gray-500 mt-1">
            Visualisez les performances de vos festivals en detail
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Festival Filter */}
          <select
            value={selectedFestival}
            onChange={(e) => setSelectedFestival(e.target.value)}
            className="input-field"
          >
            <option value="all">Tous les festivals</option>
            {mockFestivals.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {/* Period Selector */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['7d', '30d', '90d', '1y', 'all'] as ReportPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  period === p
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {p === 'all' ? 'Tout' : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const change = getPercentageChange(metric.value, metric.previousValue);
          const isPositive = change >= 0;
          return (
            <div
              key={index}
              className="bg-white dark:bg-white/5 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-white/10"
            >
              <p className="text-sm text-gray-500 mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-900">{formatMetricValue(metric)}</p>
              <div
                className={cn(
                  'flex items-center gap-1 mt-2 text-sm font-medium',
                  isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                <svg
                  className={cn('w-4 h-4', !isPositive && 'rotate-180')}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
                {Math.abs(change).toFixed(1)}% vs periode precedente
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Type Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'revenue', label: 'Revenus', icon: '💰' },
          { key: 'tickets', label: 'Billets', icon: '🎫' },
          { key: 'users', label: 'Utilisateurs', icon: '👥' },
          { key: 'cashless', label: 'Cashless', icon: '💳' },
          { key: 'zones', label: 'Zones', icon: '📍' },
        ].map((chart) => (
          <button
            key={chart.key}
            onClick={() => setActiveChart(chart.key as ChartType)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              activeChart === chart.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {chart.icon} {chart.label}
          </button>
        ))}
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Primary Chart */}
        <div className="chart-container lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {activeChart === 'revenue' && 'Evolution des revenus'}
            {activeChart === 'tickets' && 'Ventes de billets'}
            {activeChart === 'users' && 'Croissance utilisateurs'}
            {activeChart === 'cashless' && 'Transactions cashless'}
            {activeChart === 'zones' && 'Occupation des zones'}
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {activeChart === 'revenue' ? (
                <ComposedChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => formatDate(value, { day: 'numeric', month: 'short' })}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Revenus"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenueGradient)"
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Tendance"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </ComposedChart>
              ) : activeChart === 'tickets' ? (
                <BarChart data={ticketSalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => formatDate(value, { day: 'numeric', month: 'short' })}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Billets vendus" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : activeChart === 'users' ? (
                <LineChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => formatDate(value, { day: 'numeric', month: 'short' })}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="newUsers"
                    name="Nouveaux"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="activeUsers"
                    name="Actifs"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              ) : activeChart === 'cashless' ? (
                <ComposedChart data={cashlessData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => formatDate(value, { day: 'numeric', month: 'short' })}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="topups" name="Recharges" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="payments" name="Paiements" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="refunds"
                    name="Remboursements"
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                </ComposedChart>
              ) : (
                <BarChart data={zoneData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="current" name="Actuel" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="capacity" name="Capacite" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Category - Pie Chart */}
        <div className="chart-container">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenus par categorie</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueByCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                >
                  {revenueByCategoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Traffic - Area Chart */}
        <div className="chart-container">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trafic horaire</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyTrafficData}>
                <defs>
                  <linearGradient id="entriesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exitsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="entries"
                  name="Entrees"
                  stroke="#10b981"
                  fill="url(#entriesGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="exits"
                  name="Sorties"
                  stroke="#ef4444"
                  fill="url(#exitsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Radar */}
        <div className="chart-container">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance globale</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={performanceRadarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                />
                <Radar
                  name="Actuel"
                  dataKey="current"
                  stroke="#0ea5e9"
                  fill="#0ea5e9"
                  fillOpacity={0.5}
                />
                <Radar
                  name="Objectif"
                  dataKey="target"
                  stroke="#e5e7eb"
                  fill="#e5e7eb"
                  fillOpacity={0.2}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vendor Performance - Scatter */}
        <div className="chart-container">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance vendeurs</h3>
          <p className="text-sm text-gray-500 mb-2">CA vs Transactions (taille = satisfaction)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="CA"
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Transactions"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <ZAxis type="number" dataKey="z" range={[100, 500]} name="Satisfaction" />
                <Tooltip
                  content={({ payload }) => {
                    if (payload?.length) {
                      const data = payload[0]?.payload as
                        | { name: string; x: number; y: number; z: number }
                        | undefined;
                      if (!data) {
                        return null;
                      }
                      return (
                        <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="font-medium text-gray-900">{data.name}</p>
                          <p className="text-sm text-gray-600">CA: {formatCurrency(data.x)}</p>
                          <p className="text-sm text-gray-600">Transactions: {data.y}</p>
                          <p className="text-sm text-gray-600">Satisfaction: {data.z}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={vendorSalesData} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Analyses avancées</h2>

        {/* Trend Analysis */}
        <TrendAnalysisChart
          data={trendData}
          title="Évolution des ventes"
          valueLabel="Ventes (EUR)"
          showMovingAverage={true}
          showPreviousPeriod={true}
          movingAverageDays={7}
          period={period === 'all' ? '1y' : period}
          onPeriodChange={(p) => setPeriod(p)}
        />

        {/* Revenue Breakdown by Category */}
        <RevenueBreakdownChart
          data={revenueByCategoryResult.data}
          categories={revenueByCategoryResult.categories}
          title="Répartition des revenus par catégorie"
          currency="EUR"
          viewMode="stacked"
        />

        {/* Occupancy Heatmap */}
        <OccupancyHeatmap
          data={heatmapData}
          title="Affluence par heure et jour"
          showValues={false}
          colorScheme="blue"
        />
      </div>

      {/* Data Tables Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories */}
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Top categories de billets</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Categorie
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Vendus
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Revenus
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Taux
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {revenueByCategoryData.slice(0, 5).map((cat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      {formatNumber(cat.sold)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {formatCurrency(cat.value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(cat.sold / 15230) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {((cat.sold / 15230) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Zone Occupancy */}
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Occupation des zones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Zone
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actuel
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Capacite
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Occupation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {zoneData.map((zone, index) => {
                  const occupancyPercent = (zone.current / zone.capacity) * 100;
                  const occupancyColor =
                    occupancyPercent > 90
                      ? 'bg-red-500'
                      : occupancyPercent > 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500';
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {zone.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                        {formatNumber(zone.current)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                        {formatNumber(zone.capacity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={cn('h-2 rounded-full', occupancyColor)}
                              style={{ width: `${occupancyPercent}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              'text-sm font-medium',
                              occupancyPercent > 90
                                ? 'text-red-600'
                                : occupancyPercent > 70
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                            )}
                          >
                            {occupancyPercent.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
