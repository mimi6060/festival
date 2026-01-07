'use client';

import { useState, useMemo } from 'react';
import { cn, formatDateTime } from '../../lib/utils';

// Types
interface AdminNotification {
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

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  categories: {
    system: boolean;
    sales: boolean;
    security: boolean;
    support: boolean;
    festival: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

// Mock data
const mockNotifications: AdminNotification[] = [
  {
    id: '1',
    type: 'alert',
    title: 'Alerte capacite zone VIP',
    message: 'La zone VIP a atteint 92% de sa capacite maximale. Verifiez les entrees et sorties.',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    read: false,
    category: 'festival',
    actionUrl: '/zones',
    actionLabel: 'Gerer les zones',
  },
  {
    id: '2',
    type: 'success',
    title: 'Objectif de ventes atteint',
    message: 'Felicitations! Vous avez depasse votre objectif de ventes journalier de 15%.',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    read: false,
    category: 'sales',
  },
  {
    id: '3',
    type: 'warning',
    title: 'Stock faible detecte',
    message: 'Le vendeur "Bar Central" signale un stock faible sur 3 produits: Biere blonde, Cocktail maison, Eau minerale.',
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
    message: 'Un nouveau ticket de support a ete ouvert par un utilisateur VIP concernant un probleme de paiement.',
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
    message: 'Transaction echouee pour la commande #ORD-2025-1234. Raison: Carte refusee par la banque.',
    timestamp: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
    read: true,
    category: 'sales',
    actionUrl: '/payments',
    actionLabel: 'Voir les details',
  },
  {
    id: '6',
    type: 'warning',
    title: 'Tentative de connexion suspecte',
    message: '5 tentatives de connexion echouees pour admin@festival.com depuis une adresse IP inconnue (192.168.1.100).',
    timestamp: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
    read: true,
    category: 'security',
  },
  {
    id: '7',
    type: 'info',
    title: 'Mise a jour systeme prevue',
    message: 'Une maintenance est prevue ce soir de 02h00 a 04h00. Le systeme pourrait etre indisponible.',
    timestamp: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
    read: true,
    category: 'system',
  },
  {
    id: '8',
    type: 'success',
    title: 'Nouveau partenaire active',
    message: 'Le vendeur "Pizza Corner" a ete active avec succes et peut maintenant accepter les paiements.',
    timestamp: new Date(Date.now() - 6 * 60 * 60000).toISOString(),
    read: true,
    category: 'festival',
  },
  {
    id: '9',
    type: 'alert',
    title: 'Rapport journalier disponible',
    message: 'Le rapport de ventes du 01/01/2025 est pret. Cliquez pour le telecharger.',
    timestamp: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
    read: true,
    category: 'sales',
    actionUrl: '/reports',
    actionLabel: 'Voir le rapport',
  },
  {
    id: '10',
    type: 'error',
    title: 'Erreur de synchronisation',
    message: 'Echec de la synchronisation avec le terminal de paiement #12. Verifiez la connexion.',
    timestamp: new Date(Date.now() - 25 * 60 * 60000).toISOString(),
    read: true,
    category: 'system',
  },
];

const defaultPreferences: NotificationPreferences = {
  email: true,
  push: true,
  sms: false,
  categories: {
    system: true,
    sales: true,
    security: true,
    support: true,
    festival: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

// Config
const typeConfig = {
  info: { icon: 'ℹ️', color: 'bg-blue-50 border-blue-200 text-blue-800' },
  success: { icon: '✅', color: 'bg-green-50 border-green-200 text-green-800' },
  warning: { icon: '⚠️', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  error: { icon: '🚨', color: 'bg-red-50 border-red-200 text-red-800' },
  alert: { icon: '🔔', color: 'bg-purple-50 border-purple-200 text-purple-800' },
};

const categoryConfig = {
  system: { label: 'Systeme', icon: '⚙️', color: 'bg-gray-100 text-gray-700' },
  sales: { label: 'Ventes', icon: '💰', color: 'bg-green-100 text-green-700' },
  security: { label: 'Securite', icon: '🔒', color: 'bg-red-100 text-red-700' },
  support: { label: 'Support', icon: '🎧', color: 'bg-blue-100 text-blue-700' },
  festival: { label: 'Festival', icon: '🎪', color: 'bg-purple-100 text-purple-700' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>(mockNotifications);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [activeTab, setActiveTab] = useState<'all' | 'settings'>('all');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [categoryFilter, setCategoryFilter] = useState<keyof typeof categoryConfig | 'all'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  // Stats
  const unreadCount = notifications.filter((n) => !n.read).length;
  const stats = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const byType: Record<string, number> = {};

    notifications.forEach((n) => {
      byCategory[n.category] = (byCategory[n.category] || 0) + 1;
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    return { byCategory, byType };
  }, [notifications]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread' && n.read) return false;
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
      return true;
    });
  }, [notifications, filter, categoryFilter]);

  // Actions
  const markAsRead = (ids: string[]) => {
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
    );
    setSelectedNotifications(new Set());
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotifications = (ids: string[]) => {
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
    setSelectedNotifications(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedNotifications((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: unknown) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const updateCategoryPreference = (category: keyof NotificationPreferences['categories'], value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      categories: { ...prev.categories, [category]: value },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centre de Notifications</h1>
          <p className="text-gray-500 mt-1">
            Gerez vos notifications et preferences d'alertes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="btn-secondary">
              Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
          <p className="text-sm text-gray-500">Non lues</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-2xl font-bold text-red-600">{stats.byType['error'] || 0}</p>
          <p className="text-sm text-gray-500">Erreurs</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-2xl font-bold text-yellow-600">{stats.byType['warning'] || 0}</p>
          <p className="text-sm text-gray-500">Alertes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'py-3 px-1 border-b-2 text-sm font-medium transition-colors',
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Toutes les notifications
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'py-3 px-1 border-b-2 text-sm font-medium transition-colors',
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Parametres
          </button>
        </nav>
      </div>

      {activeTab === 'all' ? (
        <>
          {/* Filters & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
                className="input-field w-auto"
              >
                <option value="all">Toutes</option>
                <option value="unread">Non lues</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as keyof typeof categoryConfig | 'all')}
                className="input-field w-auto"
              >
                <option value="all">Toutes categories</option>
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>
            {selectedNotifications.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {selectedNotifications.size} selectionne(s)
                </span>
                <button
                  onClick={() => markAsRead(Array.from(selectedNotifications))}
                  className="btn-secondary text-sm"
                >
                  Marquer comme lu
                </button>
                <button
                  onClick={() => deleteNotifications(Array.from(selectedNotifications))}
                  className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Select All Header */}
            {filteredNotifications.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0}
                  onChange={selectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600">
                  Selectionner tout ({filteredNotifications.length})
                </span>
              </div>
            )}

            {/* Notification Items */}
            <div className="divide-y divide-gray-100">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4 hover:bg-gray-50 transition-colors',
                      !notification.read && 'bg-blue-50/30'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.has(notification.id)}
                        onChange={() => toggleSelect(notification.id)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0',
                          typeConfig[notification.type].color
                        )}
                      >
                        {typeConfig[notification.type].icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full" />
                            )}
                            <span className="text-xs text-gray-400">
                              {formatDateTime(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <span
                            className={cn(
                              'px-2 py-0.5 text-xs font-medium rounded-full',
                              categoryConfig[notification.category].color
                            )}
                          >
                            {categoryConfig[notification.category].icon}{' '}
                            {categoryConfig[notification.category].label}
                          </span>
                          {notification.actionUrl && (
                            <a
                              href={notification.actionUrl}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {notification.actionLabel || 'Voir'} →
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead([notification.id])}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Marquer comme lu"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotifications([notification.id])}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Aucune notification</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Vous n'avez pas de notification correspondant aux filtres
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Settings Tab */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Channels */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Canaux de notification</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📧</span>
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-500">Recevoir les notifications par email</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.email}
                  onChange={(e) => updatePreference('email', e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔔</span>
                  <div>
                    <p className="font-medium text-gray-900">Push</p>
                    <p className="text-sm text-gray-500">Notifications push dans le navigateur</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.push}
                  onChange={(e) => updatePreference('push', e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📱</span>
                  <div>
                    <p className="font-medium text-gray-900">SMS</p>
                    <p className="text-sm text-gray-500">Alertes critiques par SMS</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.sms}
                  onChange={(e) => updatePreference('sms', e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded"
                />
              </label>
            </div>
          </div>

          {/* Category Preferences */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
            <div className="space-y-3">
              {Object.entries(categoryConfig).map(([key, config]) => (
                <label key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{config.icon}</span>
                    <p className="font-medium text-gray-900">{config.label}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.categories[key as keyof typeof preferences.categories]}
                    onChange={(e) => updateCategoryPreference(key as keyof typeof preferences.categories, e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Heures calmes</h3>
              <input
                type="checkbox"
                checked={preferences.quietHours.enabled}
                onChange={(e) => updatePreference('quietHours', { ...preferences.quietHours, enabled: e.target.checked })}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded"
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Desactiver les notifications non-critiques pendant certaines heures
            </p>
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Debut</label>
                <input
                  type="time"
                  value={preferences.quietHours.start}
                  onChange={(e) => updatePreference('quietHours', { ...preferences.quietHours, start: e.target.value })}
                  disabled={!preferences.quietHours.enabled}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                <input
                  type="time"
                  value={preferences.quietHours.end}
                  onChange={(e) => updatePreference('quietHours', { ...preferences.quietHours, end: e.target.value })}
                  disabled={!preferences.quietHours.enabled}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="lg:col-span-2">
            <button className="btn-primary">
              Sauvegarder les preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
