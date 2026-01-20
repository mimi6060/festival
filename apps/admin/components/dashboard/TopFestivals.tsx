'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  getStatusColor,
  getStatusLabel,
} from '../../lib/utils';
import type { Festival } from '../../types';

interface TopFestivalsProps {
  festivals?: Festival[];
  loading?: boolean;
}

export default function TopFestivals({ festivals = [], loading = false }: TopFestivalsProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Festivals populaires</h3>
        <Link
          href="/festivals"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Voir tout
        </Link>
      </div>
      <div className="divide-y divide-gray-100">
        {festivals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun festival actif</div>
        ) : (
          festivals.map((festival) => {
            const soldPercentage =
              festival.capacity > 0 ? (festival.ticketsSold / festival.capacity) * 100 : 0;

            return (
              <Link
                key={festival.id}
                href={`/festivals/${festival.id}`}
                className="flex gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {festival.coverImage ? (
                    <Image
                      src={festival.coverImage}
                      alt={festival.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{festival.name}</h4>
                    <span className={`badge ${getStatusColor(festival.status)}`}>
                      {getStatusLabel(festival.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {festival.location.city}, {festival.location.country}
                  </p>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Revenus</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(festival.revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Billets vendus</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatNumber(festival.ticketsSold)} / {formatNumber(festival.capacity)}
                      </p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          soldPercentage >= 90
                            ? 'bg-green-500'
                            : soldPercentage >= 50
                              ? 'bg-primary-500'
                              : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(soldPercentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatPercentage(soldPercentage)} vendu
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
