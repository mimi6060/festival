'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { ChartDataPoint } from '../../types';

interface RevenueChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
}

type Period = '7d' | '30d' | '90d' | '1y';

export default function RevenueChart({ data, loading = false }: RevenueChartProps) {
  const [period, setPeriod] = useState<Period>('30d');

  const filterDataByPeriod = (data: ChartDataPoint[], period: Period): ChartDataPoint[] => {
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    return data.slice(-days[period]);
  };

  const filteredData = filterDataByPeriod(data, period);

  const totalRevenue = filteredData.reduce((sum, item) => sum + item.value, 0);
  const avgRevenue = filteredData.length > 0 ? totalRevenue / filteredData.length : 0;

  if (loading) {
    return (
      <div className="chart-container animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-5 bg-gray-200 rounded w-32" />
            <div className="h-8 bg-gray-200 rounded w-40" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded w-12" />
            ))}
          </div>
        </div>
        <div className="h-64 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Revenus</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-sm text-gray-500">
            Moyenne: {formatCurrency(avgRevenue)}/jour
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(['7d', '30d', '90d', '1y'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={filteredData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => formatDate(value, { day: 'numeric', month: 'short' })}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k`}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip
              content={(props) => {
                const { active, payload, label } = props;
                if (active && payload?.length) {
                  return (
                    <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
                      <p className="text-sm text-gray-500 mb-1">
                        {formatDate(String(label ?? ''), { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(payload[0]?.value as number)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0ea5e9"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
