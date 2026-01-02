'use client';

import Link from 'next/link';
import { formatDateTime, formatCurrency, getStatusColor, getStatusLabel } from '../../lib/utils';

interface ActivityItem {
  id: string;
  type: 'order' | 'ticket' | 'festival' | 'user';
  title: string;
  description: string;
  status?: string;
  amount?: number;
  timestamp: string;
  link: string;
}

interface RecentActivityProps {
  activities?: ActivityItem[];
  loading?: boolean;
}

const defaultActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'order',
    title: 'Nouvelle commande',
    description: 'Sophie Petit - 2x Pass VIP Summer Beats',
    status: 'completed',
    amount: 598,
    timestamp: '2025-01-02T11:30:00Z',
    link: '/orders/1',
  },
  {
    id: '2',
    type: 'ticket',
    title: 'Billet scanne',
    description: 'Lucas Moreau - Jazz in the Park',
    status: 'used',
    timestamp: '2025-01-02T11:15:00Z',
    link: '/tickets/2',
  },
  {
    id: '3',
    type: 'festival',
    title: 'Festival publie',
    description: 'Summer Beats Festival 2025',
    status: 'published',
    timestamp: '2025-01-02T10:00:00Z',
    link: '/festivals/1',
  },
  {
    id: '4',
    type: 'user',
    title: 'Nouvel utilisateur',
    description: 'Emma Bernard a rejoint la plateforme',
    timestamp: '2025-01-02T09:45:00Z',
    link: '/users/6',
  },
  {
    id: '5',
    type: 'order',
    title: 'Remboursement effectue',
    description: 'Pierre Martin - 1x Pass 1 Jour',
    status: 'refunded',
    amount: -45,
    timestamp: '2025-01-02T09:30:00Z',
    link: '/orders/3',
  },
];

const typeIcons = {
  order: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  ticket: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  festival: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

const typeColors = {
  order: 'bg-green-50 text-green-600',
  ticket: 'bg-purple-50 text-purple-600',
  festival: 'bg-blue-50 text-blue-600',
  user: 'bg-orange-50 text-orange-600',
};

export default function RecentActivity({ activities = defaultActivities, loading = false }: RecentActivityProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Activite recente</h3>
        <Link
          href="/activity"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Voir tout
        </Link>
      </div>
      <div className="divide-y divide-gray-100">
        {activities.map((activity) => (
          <Link
            key={activity.id}
            href={activity.link}
            className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeColors[activity.type]}`}>
              {typeIcons[activity.type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                {activity.status && (
                  <span className={`badge ${getStatusColor(activity.status)}`}>
                    {getStatusLabel(activity.status)}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 truncate">{activity.description}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDateTime(activity.timestamp)}</p>
            </div>
            {activity.amount !== undefined && (
              <div className={`text-sm font-medium ${activity.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {activity.amount >= 0 ? '+' : ''}{formatCurrency(activity.amount)}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
