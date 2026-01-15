'use client';

import { useMemo } from 'react';

interface HeatmapDataPoint {
  hour: number;
  day: string;
  value: number;
  zone?: string;
}

interface OccupancyHeatmapProps {
  data: HeatmapDataPoint[];
  title?: string;
  maxValue?: number;
  showValues?: boolean;
  colorScheme?: 'blue' | 'red' | 'green' | 'purple';
}

const COLOR_SCHEMES = {
  blue: {
    0: '#eff6ff',
    0.2: '#bfdbfe',
    0.4: '#60a5fa',
    0.6: '#3b82f6',
    0.8: '#2563eb',
    1: '#1d4ed8',
  },
  red: {
    0: '#fef2f2',
    0.2: '#fecaca',
    0.4: '#f87171',
    0.6: '#ef4444',
    0.8: '#dc2626',
    1: '#b91c1c',
  },
  green: {
    0: '#f0fdf4',
    0.2: '#bbf7d0',
    0.4: '#4ade80',
    0.6: '#22c55e',
    0.8: '#16a34a',
    1: '#15803d',
  },
  purple: {
    0: '#faf5ff',
    0.2: '#e9d5ff',
    0.4: '#c084fc',
    0.6: '#a855f7',
    0.8: '#9333ea',
    1: '#7e22ce',
  },
};

const DAYS_ORDER = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getColorForValue(
  value: number,
  maxValue: number,
  scheme: keyof typeof COLOR_SCHEMES
): string {
  const ratio = Math.min(value / maxValue, 1);
  const colors = COLOR_SCHEMES[scheme];

  const thresholds = [0, 0.2, 0.4, 0.6, 0.8, 1] as const;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (ratio >= thresholds[i]) {
      return colors[thresholds[i]];
    }
  }
  return colors[0];
}

export function OccupancyHeatmap({
  data,
  title = 'Affluence par heure',
  maxValue: providedMaxValue,
  showValues = false,
  colorScheme = 'blue',
}: OccupancyHeatmapProps) {
  const { matrix, maxValue } = useMemo(() => {
    const grid: Record<string, Record<number, number>> = {};
    let max = providedMaxValue || 0;

    DAYS_ORDER.forEach((day) => {
      grid[day] = {};
      HOURS.forEach((hour) => {
        grid[day][hour] = 0;
      });
    });

    data.forEach((point) => {
      if (grid[point.day]) {
        grid[point.day][point.hour] = (grid[point.day][point.hour] || 0) + point.value;
        if (!providedMaxValue && grid[point.day][point.hour] > max) {
          max = grid[point.day][point.hour];
        }
      }
    });

    return { matrix: grid, maxValue: max || 100 };
  }, [data, providedMaxValue]);

  const cellWidth = 32;
  const cellHeight = 28;
  const labelWidth = 40;
  const headerHeight = 30;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Faible</span>
          <div className="flex">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((threshold) => (
              <div
                key={threshold}
                className="w-4 h-4"
                style={{
                  backgroundColor:
                    COLOR_SCHEMES[colorScheme][
                      threshold as keyof (typeof COLOR_SCHEMES)[typeof colorScheme]
                    ],
                }}
              />
            ))}
          </div>
          <span>Elevé</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={labelWidth + HOURS.length * cellWidth + 20}
          height={headerHeight + DAYS_ORDER.length * cellHeight + 20}
        >
          {/* Hour labels */}
          {HOURS.map((hour) => (
            <text
              key={`hour-${hour}`}
              x={labelWidth + hour * cellWidth + cellWidth / 2}
              y={headerHeight - 8}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {hour.toString().padStart(2, '0')}
            </text>
          ))}

          {/* Day labels and cells */}
          {DAYS_ORDER.map((day, dayIndex) => (
            <g key={day}>
              <text
                x={labelWidth - 8}
                y={headerHeight + dayIndex * cellHeight + cellHeight / 2 + 4}
                textAnchor="end"
                className="text-xs fill-gray-700 font-medium"
              >
                {day}
              </text>

              {HOURS.map((hour) => {
                const value = matrix[day]?.[hour] || 0;
                const color = getColorForValue(value, maxValue, colorScheme);
                const x = labelWidth + hour * cellWidth;
                const y = headerHeight + dayIndex * cellHeight;

                return (
                  <g key={`${day}-${hour}`}>
                    <rect
                      x={x + 1}
                      y={y + 1}
                      width={cellWidth - 2}
                      height={cellHeight - 2}
                      rx={2}
                      fill={color}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                    >
                      <title>
                        {day} {hour}:00 - {value.toLocaleString()}
                      </title>
                    </rect>
                    {showValues && value > 0 && (
                      <text
                        x={x + cellWidth / 2}
                        y={y + cellHeight / 2 + 4}
                        textAnchor="middle"
                        className="text-xs fill-white font-medium"
                        style={{
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        }}
                      >
                        {value > 999 ? `${Math.round(value / 1000)}k` : value}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <div>
          <span className="font-medium">Maximum:</span> {maxValue.toLocaleString()} personnes
        </div>
        <div className="flex gap-4">
          <div>
            <span className="font-medium">Heure de pointe:</span>{' '}
            {(() => {
              let peakHour = 0;
              let peakDay = '';
              let peakValue = 0;
              DAYS_ORDER.forEach((day) => {
                HOURS.forEach((hour) => {
                  if (matrix[day]?.[hour] > peakValue) {
                    peakValue = matrix[day][hour];
                    peakHour = hour;
                    peakDay = day;
                  }
                });
              });
              return peakValue > 0 ? `${peakDay} ${peakHour}h00` : 'N/A';
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
