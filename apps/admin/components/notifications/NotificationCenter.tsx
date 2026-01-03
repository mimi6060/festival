'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../../lib/utils';

// Types
export interface AdminNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'alert';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  category: 'system' | 'sales' | 'security' | 'support' | 'festival';
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationCenterProps {
  className?: string;
}

// Mock notifications for demo
const mockNotifications: AdminNotification[] = [
  {
    id: '1',
    type: 'alert',
    title: 'Alerte capacite',
    message: 'La zone VIP a atteint 92% de sa capacite maximale.',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    read: false,
    category: 'festival',
    actionUrl: '/zones',
    actionLabel: 'Voir les zones',
  },
  {
    id: '2',
    type: 'success',
    title: 'Objectif atteint',
    message: 'Felicitations! Vous avez depasse votre objectif de ventes journalier de 15%.',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    read: false,
    category: 'sales',
  },
  {
    id: '3',
    type: 'warning',
    title: 'Stock faible',
    message: 'Le vendeur "Bar Central" signale un stock faible sur 3 produits.',
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    read: false,
    category: 'festival',
    actionUrl: '/vendors',
    actionLabel: 'Gerer le stock',
  },
  {
    id: '4',
    type: 'info',
    title: 'Nouveau ticket support',
    message: 'Un nouveau ticket de support a ete ouvert par un utilisateur VIP.',
    timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    read: true,
    category: 'support',
    actionUrl: '/support',
    actionLabel: 'Voir le ticket',
  },
  {
    id: '5',
    type: 'error',
    title: 'Echec de paiement',
    message: 'Transaction echouee pour la commande #ORD-2025-1234. Carte refusee.',
    timestamp: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
    read: true,
    category: 'sales',
    actionUrl: '/payments',
    actionLabel: 'Voir les details',
  },
];

// Notification type colors
const typeColors: Record<AdminNotification['type'], string> = {
  info: 'bg-blue-50 border-blue-200',
  success: 'bg-green-50 border-green-200',
  warning: 'bg-yellow-50 border-yellow-200',
  error: 'bg-red-50 border-red-200',
  alert: 'bg-purple-50 border-purple-200',
};

const categoryConfig: Record<AdminNotification['category'], { label: string; color: string }> = {
  system: { label: 'Systeme', color: 'bg-gray-100 text-gray-700' },
  sales: { label: 'Ventes', color: 'bg-green-100 text-green-700' },
  security: { label: 'Securite', color: 'bg-red-100 text-red-700' },
  support: { label: 'Support', color: 'bg-blue-100 text-blue-700' },
  festival: { label: 'Festival', color: 'bg-purple-100 text-purple-700' },
};

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return "A l'instant";
  }
  if (diffMins < 60) {
    return `Il y a ${diffMins} min`;
  }
  if (diffHours < 24) {
    return `Il y a ${diffHours}h`;
  }
  if (diffDays < 7) {
    return `Il y a ${diffDays}j`;
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}: {
  notification: AdminNotification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (notification: AdminNotification) => void;
}) {
  return (
    <div
      className={cn(
        'p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors',
        !notification.read && 'bg-blue-50/30'
      )}
      onClick={() => onClick(notification)}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 border',
            typeColors[notification.type]
          )}
        >
          {notification.type === 'info' && 'i'}
          {notification.type === 'success' && 'v'}
          {notification.type === 'warning' && '!'}
          {notification.type === 'error' && 'x'}
          {notification.type === 'alert' && 'b'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{notification.title}</h4>
            {!notification.read && (
              <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-medium rounded-full',
                categoryConfig[notification.category].color
              )}
            >
              {categoryConfig[notification.category].label}
            </span>
            <span className="text-xs text-gray-400">
              {formatRelativeTime(notification.timestamp)}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {!notification.read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Marquer comme lu"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Supprimer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationCenter({ className }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleNotificationClick = useCallback(
    (notification: AdminNotification) => {
      markAsRead(notification.id);
      if (notification.actionUrl) {
        setIsOpen(false);
      }
    },
    [markAsRead]
  );

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Tout lire
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-1 mt-3 bg-white p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded transition-colors',
                  filter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Toutes
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded transition-colors',
                  filter === 'unread'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Non lues ({unreadCount})
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onClick={handleNotificationClick}
                />
              ))
            ) : (
              <div className="py-12 text-center">
                <p className="text-gray-500 text-sm">Aucune notification</p>
              </div>
            )}
          </div>
          {filteredNotifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <a
                href="/notifications"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1"
              >
                Voir toutes les notifications
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
