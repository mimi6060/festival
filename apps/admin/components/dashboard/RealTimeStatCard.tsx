'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

interface RealTimeStatCardProps {
  title: string;
  value: number;
  previousValue?: number;
  type?: 'number' | 'currency' | 'percentage';
  currency?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  loading?: boolean;
  trend?: 'up' | 'down' | 'stable';
  isLive?: boolean;
  lastUpdate?: Date | null;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    pulse: 'bg-blue-400',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    pulse: 'bg-green-400',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    pulse: 'bg-purple-400',
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    pulse: 'bg-orange-400',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    pulse: 'bg-red-400',
  },
};

export function RealTimeStatCard({
  title,
  value,
  previousValue,
  type = 'number',
  currency = 'EUR',
  icon,
  color = 'blue',
  loading = false,
  trend,
  isLive = false,
  lastUpdate,
}: RealTimeStatCardProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);
  const colors = colorClasses[color];

  // Animate value changes
  useEffect(() => {
    if (prevValueRef.current !== value) {
      setIsAnimating(true);

      // Animate to new value
      const startValue = prevValueRef.current;
      const endValue = value;
      const duration = 500; // ms
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (endValue - startValue) * easeProgress;

        setDisplayValue(Math.round(currentValue * 100) / 100);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
          setTimeout(() => setIsAnimating(false), 200);
        }
      };

      requestAnimationFrame(animate);
      prevValueRef.current = value;
    }
  }, [value]);

  const formatValue = (val: number) => {
    switch (type) {
      case 'currency':
        return formatCurrency(val, currency);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return formatNumber(Math.round(val));
    }
  };

  const calculateChange = () => {
    if (previousValue === undefined || previousValue === 0) { return null; }
    return ((value - previousValue) / previousValue) * 100;
  };

  const change = calculateChange();
  const trendDirection = trend || (change !== null ? (change > 0 ? 'up' : change < 0 ? 'down' : 'stable') : undefined);

  if (loading) {
    return (
      <div className="stat-card animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-8 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'stat-card group relative overflow-hidden',
      isAnimating && 'ring-2 ring-offset-2',
      isAnimating && colors.text.replace('text-', 'ring-')
    )}>
      {/* Live indicator */}
      {isLive && (
        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1">
            <span className={cn(
              'w-2 h-2 rounded-full animate-pulse',
              colors.pulse
            )} />
            <span className="text-xs font-medium text-gray-500">LIVE</span>
          </span>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={cn(
            'text-2xl font-bold text-gray-900 transition-all duration-300',
            isAnimating && 'scale-105'
          )}>
            {formatValue(displayValue)}
          </p>

          {/* Trend indicator */}
          <div className="flex items-center gap-2">
            {trendDirection && (
              <div className={cn(
                'flex items-center gap-1',
                trendDirection === 'up' && 'text-green-600',
                trendDirection === 'down' && 'text-red-600',
                trendDirection === 'stable' && 'text-gray-500'
              )}>
                {trendDirection === 'up' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
                {trendDirection === 'down' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
                {trendDirection === 'stable' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                  </svg>
                )}
                {change !== null && (
                  <span className="text-sm font-medium">
                    {Math.abs(change).toFixed(1)}%
                  </span>
                )}
              </div>
            )}
            {lastUpdate && (
              <span className="text-xs text-gray-400">
                MAJ: {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110',
            colors.bg,
            colors.text
          )}
        >
          {icon}
        </div>
      </div>

      {/* Update flash effect */}
      {isAnimating && (
        <div className={cn(
          'absolute inset-0 opacity-10 animate-pulse',
          colors.bg
        )} />
      )}
    </div>
  );
}

export default RealTimeStatCard;
