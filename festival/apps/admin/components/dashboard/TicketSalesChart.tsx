'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatDate, formatNumber } from '../../lib/utils';
import type { ChartDataPoint } from '../../types';

interface TicketSalesChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
}

type Period = '7d' | '30d' | '90d';

export default function TicketSalesChart({ data, loading = false }: TicketSalesChartProps) {
  const [period, setPeriod] = useState<Period>('30d');

  const filterDataByPeriod = (data: ChartDataPoint[], period: Period): ChartDataPoint[] => {
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };
    return data.slice(-days[period]);
  };

  const filteredData = filterDataByPeriod(data, period);

  const totalSales = filteredData.reduce((sum, item) => sum + item.value, 0);
  const maxSales = Math.max(...filteredData.map((item) => item.value));
  const avgSales = filteredData.length > 0 ? totalSales / filteredData.length : 0;

  const getBarColor = (value: number) => {
    const ratio = value / maxSales;
    if (ratio >= 0.8) return '#0ea5e9';
    if (ratio >= 0.5) return '#38bdf8';
    return '#7dd3fc';
  };

  if (loading) {
    return (
      <div className="chart-container animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-5 bg-gray-200 rounded w-32" />
            <div className="h-8 bg-gray-200 rounded w-24" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
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
          <h3 className="text-lg font-semibold text-gray-900">Ventes de billets</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatNumber(totalSales)} billets
          </p>
          <p className="text-sm text-gray-500">
            Moyenne: {formatNumber(Math.round(avgSales))}/jour
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
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
          <BarChart
            data={filteredData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
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
              width={40}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
                      <p className="text-sm text-gray-500 mb-1">
                        {formatDate(label, { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatNumber(payload[0]?.value as number)} billets
                      </p>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
