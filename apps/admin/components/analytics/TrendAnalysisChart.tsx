'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface DataPoint {
  date: string;
  value: number;
  previousPeriod?: number;
}

interface TrendAnalysisChartProps {
  data: DataPoint[];
  title?: string;
  valueLabel?: string;
  showMovingAverage?: boolean;
  showPreviousPeriod?: boolean;
  movingAverageDays?: number;
  period?: '7d' | '30d' | '90d' | '1y';
  onPeriodChange?: (period: '7d' | '30d' | '90d' | '1y') => void;
}

function calculateMovingAverage(data: DataPoint[], windowSize: number): (number | null)[] {
  return data.map((_, index) => {
    if (index < windowSize - 1) {
      return null;
    }
    const slice = data.slice(index - windowSize + 1, index + 1);
    const sum = slice.reduce((acc, item) => acc + item.value, 0);
    return Math.round(sum / windowSize);
  });
}

function calculateTrend(data: DataPoint[]): {
  slope: number;
  direction: 'up' | 'down' | 'stable';
  percentage: number;
} {
  if (data.length < 2) {
    return { slope: 0, direction: 'stable', percentage: 0 };
  }

  const n = data.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = data.reduce((acc, d) => acc + d.value, 0);
  const sumXY = data.reduce((acc, d, i) => acc + i * d.value, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  const firstHalf = data.slice(0, Math.floor(n / 2));
  const secondHalf = data.slice(Math.floor(n / 2));
  const avgFirst = firstHalf.reduce((acc, d) => acc + d.value, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((acc, d) => acc + d.value, 0) / secondHalf.length;

  const percentage = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;

  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(percentage) > 2) {
    direction = percentage > 0 ? 'up' : 'down';
  }

  return { slope, direction, percentage };
}

export function TrendAnalysisChart({
  data,
  title = 'Trend Analysis',
  valueLabel = 'Value',
  showMovingAverage = true,
  showPreviousPeriod = false,
  movingAverageDays = 7,
  period = '30d',
  onPeriodChange,
}: TrendAnalysisChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  const handlePeriodChange = (newPeriod: '7d' | '30d' | '90d' | '1y') => {
    setSelectedPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const chartData = useMemo(() => {
    const movingAvg = showMovingAverage ? calculateMovingAverage(data, movingAverageDays) : [];

    return data.map((point, index) => ({
      ...point,
      movingAverage: movingAvg[index],
    }));
  }, [data, showMovingAverage, movingAverageDays]);

  const trend = useMemo(() => calculateTrend(data), [data]);
  const average = useMemo(() => {
    if (data.length === 0) {
      return 0;
    }
    return Math.round(data.reduce((acc, d) => acc + d.value, 0) / data.length);
  }, [data]);

  const trendColor =
    trend.direction === 'up'
      ? 'text-green-600'
      : trend.direction === 'down'
        ? 'text-red-600'
        : 'text-gray-600';

  const trendIcon = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center gap-4 mt-1">
            <span className={`text-sm font-medium ${trendColor}`}>
              {trendIcon} {Math.abs(trend.percentage).toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500">Moyenne: {average.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex gap-1">
          {(['7d', '30d', '90d', '1y'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={{ stroke: '#d1d5db' }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name === 'movingAverage'
                  ? `MA(${movingAverageDays})`
                  : name === 'previousPeriod'
                    ? 'Période précédente'
                    : valueLabel,
              ]}
            />
            <Legend />

            <Area
              type="monotone"
              dataKey="value"
              name={valueLabel}
              stroke="#3b82f6"
              fill="url(#colorValue)"
              strokeWidth={2}
            />

            {showMovingAverage && (
              <Line
                type="monotone"
                dataKey="movingAverage"
                name={`MA(${movingAverageDays})`}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}

            {showPreviousPeriod && (
              <Line
                type="monotone"
                dataKey="previousPeriod"
                name="Période précédente"
                stroke="#9ca3af"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
            )}

            <ReferenceLine
              y={average}
              stroke="#10b981"
              strokeDasharray="3 3"
              label={{
                value: 'Moyenne',
                position: 'right',
                fill: '#10b981',
                fontSize: 12,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>{valueLabel}</span>
        </div>
        {showMovingAverage && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-amber-500" style={{ borderStyle: 'dashed' }} />
            <span>Moyenne mobile ({movingAverageDays}j)</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-green-500" style={{ borderStyle: 'dashed' }} />
          <span>Moyenne période</span>
        </div>
      </div>
    </div>
  );
}
