'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface CategoryData {
  date: string;
  [category: string]: string | number;
}

interface RevenueBreakdownChartProps {
  data: CategoryData[];
  categories: string[];
  title?: string;
  currency?: string;
  viewMode?: 'stacked' | 'grouped' | 'pie';
}

const CATEGORY_COLORS: Record<string, string> = {
  standard: '#3b82f6',
  vip: '#8b5cf6',
  backstage: '#ec4899',
  camping: '#10b981',
  cashless: '#f59e0b',
  vendors: '#ef4444',
  merchandise: '#06b6d4',
  parking: '#6366f1',
  default: '#6b7280',
};

function getCategoryColor(category: string): string {
  const key = category.toLowerCase();
  return CATEGORY_COLORS[key] || CATEGORY_COLORS['default'];
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueBreakdownChart({
  data,
  categories,
  title = 'Répartition des revenus',
  currency = 'EUR',
  viewMode: initialViewMode = 'stacked',
}: RevenueBreakdownChartProps) {
  const [viewMode, setViewMode] = useState(initialViewMode);

  const totals = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    let grandTotal = 0;

    categories.forEach((cat) => {
      categoryTotals[cat] = 0;
    });

    data.forEach((row) => {
      categories.forEach((cat) => {
        const value = typeof row[cat] === 'number' ? row[cat] : 0;
        categoryTotals[cat] += value as number;
        grandTotal += value as number;
      });
    });

    return { byCategory: categoryTotals, total: grandTotal };
  }, [data, categories]);

  const pieData = useMemo(() => {
    return categories
      .map((cat) => ({
        name: cat,
        value: totals.byCategory[cat],
        percentage:
          totals.total > 0 ? ((totals.byCategory[cat] / totals.total) * 100).toFixed(1) : '0',
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [categories, totals]);

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={{ stroke: '#d1d5db' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={{ stroke: '#d1d5db' }}
          tickFormatter={(value) => formatCurrency(value, currency)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          formatter={(value: number, name: string) => [
            formatCurrency(value, currency),
            name.charAt(0).toUpperCase() + name.slice(1),
          ]}
        />
        <Legend />
        {categories.map((cat) => (
          <Bar
            key={cat}
            dataKey={cat}
            name={cat.charAt(0).toUpperCase() + cat.slice(1)}
            stackId={viewMode === 'stacked' ? 'stack' : undefined}
            fill={getCategoryColor(cat)}
            radius={viewMode === 'grouped' ? [4, 4, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => (
    <div className="flex items-center gap-8">
      <div className="flex-1 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percentage }) => `${name} (${percentage}%)`}
              labelLine={true}
            >
              {pieData.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={getCategoryColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(
                value: number,
                _name: string,
                props: { payload: { name: string; percentage: string } }
              ) => [
                formatCurrency(value, currency),
                `${props.payload.name} (${props.payload.percentage}%)`,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-48 space-y-2">
        {pieData.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: getCategoryColor(item.name) }}
              />
              <span className="text-sm text-gray-700">
                {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-900">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Total: {formatCurrency(totals.total, currency)}
          </p>
        </div>

        <div className="flex gap-1">
          {(['stacked', 'grouped', 'pie'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {mode === 'stacked' ? 'Empilé' : mode === 'grouped' ? 'Groupé' : 'Camembert'}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80">{viewMode === 'pie' ? renderPieChart() : renderBarChart()}</div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.slice(0, 4).map((cat) => {
          const value = totals.byCategory[cat];
          const percentage = totals.total > 0 ? ((value / totals.total) * 100).toFixed(1) : '0';
          return (
            <div key={cat} className="text-center p-3 bg-gray-50 rounded-lg">
              <div
                className="w-2 h-2 rounded-full mx-auto mb-2"
                style={{ backgroundColor: getCategoryColor(cat) }}
              />
              <p className="text-xs text-gray-500">{cat.charAt(0).toUpperCase() + cat.slice(1)}</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(value, currency)}
              </p>
              <p className="text-xs text-gray-400">{percentage}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
