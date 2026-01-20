'use client';

import { useMemo } from 'react';
import { cn, formatNumber } from '@/lib/utils';
import { ZoneOccupancyData } from '@/hooks';

interface ZoneOccupancyWidgetProps {
  zones: Record<string, ZoneOccupancyData>;
  isLive?: boolean;
  loading?: boolean;
  className?: string;
}

const statusConfig = {
  open: { color: 'bg-green-500', label: 'Ouvert', textColor: 'text-green-700' },
  busy: { color: 'bg-yellow-500', label: 'Occupe', textColor: 'text-yellow-700' },
  near_capacity: { color: 'bg-orange-500', label: 'Proche capacite', textColor: 'text-orange-700' },
  full: { color: 'bg-red-500', label: 'Complet', textColor: 'text-red-700' },
  closed: { color: 'bg-gray-400', label: 'Ferme', textColor: 'text-gray-700' },
  emergency: { color: 'bg-red-600', label: 'Urgence', textColor: 'text-red-700' },
};

const trendConfig = {
  increasing: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    ),
    color: 'text-green-500',
    label: 'En hausse',
  },
  decreasing: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    ),
    color: 'text-red-500',
    label: 'En baisse',
  },
  stable: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    ),
    color: 'text-gray-500',
    label: 'Stable',
  },
};

function ZoneOccupancyBar({ zone }: { zone: ZoneOccupancyData }) {
  const status = statusConfig[zone.status];
  const trend = trendConfig[zone.trend];

  const barColor = useMemo(() => {
    if (zone.percentage >= 98) {
      return 'bg-red-500';
    }
    if (zone.percentage >= 90) {
      return 'bg-orange-500';
    }
    if (zone.percentage >= 75) {
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  }, [zone.percentage]);

  return (
    <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{zone.zoneName}</span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              status.color.replace('bg-', 'bg-opacity-20 '),
              status.textColor
            )}
          >
            {status.label}
          </span>
        </div>
        <div className={cn('flex items-center gap-1', trend.color)} title={trend.label}>
          {trend.icon}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${Math.min(zone.percentage, 100)}%` }}
          />
        </div>
        {zone.percentage >= 100 && (
          <div className="absolute inset-0 rounded-full animate-pulse bg-red-500 opacity-20" />
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between mt-2 text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-700">
            <span className="font-semibold">{formatNumber(zone.current)}</span>
            <span className="text-gray-500"> / {formatNumber(zone.capacity)}</span>
          </span>
          <span
            className={cn(
              'font-medium',
              zone.percentage >= 90
                ? 'text-red-600'
                : zone.percentage >= 75
                  ? 'text-orange-600'
                  : 'text-gray-600'
            )}
          >
            {zone.percentage}%
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg
              className="w-3 h-3 text-green-500"
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
            {zone.entriesLastHour}/h
          </span>
          <span className="flex items-center gap-1">
            <svg
              className="w-3 h-3 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
            {zone.exitsLastHour}/h
          </span>
        </div>
      </div>
    </div>
  );
}

export function ZoneOccupancyWidget({
  zones,
  isLive = false,
  loading = false,
  className,
}: ZoneOccupancyWidgetProps) {
  const zoneList = useMemo(() => {
    return Object.values(zones).sort((a, b) => b.percentage - a.percentage);
  }, [zones]);

  const totalOccupancy = useMemo(() => {
    if (zoneList.length === 0) {
      return { current: 0, capacity: 0, percentage: 0 };
    }
    const current = zoneList.reduce((sum, z) => sum + z.current, 0);
    const capacity = zoneList.reduce((sum, z) => sum + z.capacity, 0);
    return {
      current,
      capacity,
      percentage: capacity > 0 ? Math.round((current / capacity) * 100) : 0,
    };
  }, [zoneList]);

  if (loading) {
    return (
      <div
        className={cn(
          'bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6',
          className
        )}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Occupation des zones</h3>
          {isLive && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-700">LIVE</span>
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-lg font-bold text-gray-900">
            {formatNumber(totalOccupancy.current)} / {formatNumber(totalOccupancy.capacity)}
            <span className="text-sm font-normal text-gray-500 ml-1">
              ({totalOccupancy.percentage}%)
            </span>
          </p>
        </div>
      </div>

      {/* Zone list */}
      {zoneList.length > 0 ? (
        <div className="space-y-3">
          {zoneList.map((zone) => (
            <ZoneOccupancyBar key={zone.zoneId} zone={zone} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p>Aucune zone configuree</p>
        </div>
      )}

      {/* Legend */}
      {zoneList.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span>&lt; 75%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>75-90%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span>90-98%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span>&gt; 98%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ZoneOccupancyWidget;
