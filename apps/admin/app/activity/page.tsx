'use client';

import { useState, useMemo } from 'react';
import { cn, formatDateTime } from '../../lib/utils';
import { ExportButton } from '../../components/export';
import type { ExportColumn } from '../../lib/export';

// Types
interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: 'admin' | 'organizer' | 'staff' | 'user';
  action: string;
  actionType: 'create' | 'update' | 'delete' | 'read' | 'login' | 'logout' | 'export' | 'import';
  resource: string;
  resourceType:
    | 'user'
    | 'festival'
    | 'ticket'
    | 'payment'
    | 'cashless'
    | 'zone'
    | 'staff'
    | 'vendor'
    | 'system';
  resourceId?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'pending';
  duration?: number;
}

// Mock data
const mockActivityLogs: ActivityLog[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    userId: '1',
    userName: 'Jean Dupont',
    userEmail: 'admin@festival.com',
    userRole: 'admin',
    action: 'Connexion',
    actionType: 'login',
    resource: 'Session utilisateur',
    resourceType: 'user',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'success',
    duration: 245,
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    userId: '1',
    userName: 'Jean Dupont',
    userEmail: 'admin@festival.com',
    userRole: 'admin',
    action: 'Export des donnees utilisateurs',
    actionType: 'export',
    resource: 'Utilisateurs',
    resourceType: 'user',
    details: 'Export CSV de 1250 utilisateurs',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'success',
    duration: 1520,
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    userId: '2',
    userName: 'Marie Martin',
    userEmail: 'marie@festival.com',
    userRole: 'organizer',
    action: 'Modification du festival',
    actionType: 'update',
    resource: 'Summer Beats Festival',
    resourceType: 'festival',
    resourceId: '1',
    details: 'Mise a jour de la capacite: 45000 -> 50000',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success',
    duration: 320,
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    userId: '3',
    userName: 'Pierre Bernard',
    userEmail: 'pierre@festival.com',
    userRole: 'staff',
    action: 'Validation de billet',
    actionType: 'update',
    resource: 'Billet #TKT-ABC123',
    resourceType: 'ticket',
    resourceId: 'ticket-123',
    details: 'Entree zone principale',
    ipAddress: '192.168.1.50',
    userAgent: 'FestivalApp/2.1.0 (Android)',
    status: 'success',
    duration: 85,
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    userId: '1',
    userName: 'Jean Dupont',
    userEmail: 'admin@festival.com',
    userRole: 'admin',
    action: 'Creation utilisateur',
    actionType: 'create',
    resource: 'Nouvel utilisateur staff',
    resourceType: 'staff',
    resourceId: 'staff-456',
    details: 'staff@festival.com - Role: Security',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'success',
    duration: 450,
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
    userId: '2',
    userName: 'Marie Martin',
    userEmail: 'marie@festival.com',
    userRole: 'organizer',
    action: 'Suppression categorie billet',
    actionType: 'delete',
    resource: 'Pass Early Bird',
    resourceType: 'ticket',
    resourceId: 'cat-789',
    details: 'Categorie epuisee - 500 billets vendus',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success',
    duration: 180,
  },
  {
    id: '7',
    timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    userId: '1',
    userName: 'Jean Dupont',
    userEmail: 'admin@festival.com',
    userRole: 'admin',
    action: 'Remboursement paiement',
    actionType: 'update',
    resource: 'Commande #ORD-2025-1234',
    resourceType: 'payment',
    resourceId: 'pay-567',
    details: 'Remboursement complet: 120.00 EUR',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'success',
    duration: 2100,
  },
  {
    id: '8',
    timestamp: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
    userId: 'system',
    userName: 'Systeme',
    userEmail: 'system@festival.com',
    userRole: 'admin',
    action: 'Sauvegarde automatique',
    actionType: 'export',
    resource: 'Base de donnees',
    resourceType: 'system',
    details: 'Backup quotidien - 2.3 GB',
    ipAddress: '127.0.0.1',
    userAgent: 'FestivalBackup/1.0',
    status: 'success',
    duration: 45000,
  },
  {
    id: '9',
    timestamp: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
    userId: '1',
    userName: 'Jean Dupont',
    userEmail: 'admin@festival.com',
    userRole: 'admin',
    action: 'Tentative de connexion',
    actionType: 'login',
    resource: 'Session utilisateur',
    resourceType: 'user',
    details: 'Mot de passe incorrect',
    ipAddress: '203.0.113.50',
    userAgent: 'Mozilla/5.0 (Unknown)',
    status: 'failure',
  },
  {
    id: '10',
    timestamp: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
    userId: '4',
    userName: 'Vendeur Bar',
    userEmail: 'bar@vendor.com',
    userRole: 'staff',
    action: 'Mise a jour stock',
    actionType: 'update',
    resource: 'Produit: Biere blonde',
    resourceType: 'vendor',
    resourceId: 'prod-123',
    details: 'Stock: 500 -> 200 unites',
    ipAddress: '192.168.1.60',
    userAgent: 'VendorApp/1.5.0 (iOS)',
    status: 'success',
    duration: 120,
  },
  {
    id: '11',
    timestamp: new Date(Date.now() - 6 * 60 * 60000).toISOString(),
    userId: '2',
    userName: 'Marie Martin',
    userEmail: 'marie@festival.com',
    userRole: 'organizer',
    action: 'Modification zone',
    actionType: 'update',
    resource: 'Zone VIP',
    resourceType: 'zone',
    resourceId: 'zone-vip',
    details: 'Capacite mise a jour: 1500 -> 2000',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success',
    duration: 250,
  },
  {
    id: '12',
    timestamp: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
    userId: '1',
    userName: 'Jean Dupont',
    userEmail: 'admin@festival.com',
    userRole: 'admin',
    action: 'Deconnexion',
    actionType: 'logout',
    resource: 'Session utilisateur',
    resourceType: 'user',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'success',
  },
];

// Config
const actionTypeConfig: Record<
  ActivityLog['actionType'],
  { label: string; icon: string; color: string }
> = {
  create: { label: 'Creation', icon: '+', color: 'bg-green-100 text-green-700' },
  update: { label: 'Modification', icon: 'e', color: 'bg-blue-100 text-blue-700' },
  delete: { label: 'Suppression', icon: '-', color: 'bg-red-100 text-red-700' },
  read: { label: 'Consultation', icon: 'o', color: 'bg-gray-100 text-gray-700' },
  login: { label: 'Connexion', icon: '>', color: 'bg-purple-100 text-purple-700' },
  logout: { label: 'Deconnexion', icon: '<', color: 'bg-purple-100 text-purple-700' },
  export: { label: 'Export', icon: 'd', color: 'bg-orange-100 text-orange-700' },
  import: { label: 'Import', icon: 'u', color: 'bg-orange-100 text-orange-700' },
};

const resourceTypeConfig: Record<ActivityLog['resourceType'], { label: string; icon: string }> = {
  user: { label: 'Utilisateur', icon: 'U' },
  festival: { label: 'Festival', icon: 'F' },
  ticket: { label: 'Billet', icon: 'T' },
  payment: { label: 'Paiement', icon: 'P' },
  cashless: { label: 'Cashless', icon: 'C' },
  zone: { label: 'Zone', icon: 'Z' },
  staff: { label: 'Staff', icon: 'S' },
  vendor: { label: 'Vendeur', icon: 'V' },
  system: { label: 'Systeme', icon: '*' },
};

const roleConfig: Record<ActivityLog['userRole'], { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700' },
  organizer: { label: 'Organisateur', color: 'bg-blue-100 text-blue-700' },
  staff: { label: 'Staff', color: 'bg-green-100 text-green-700' },
  user: { label: 'Utilisateur', color: 'bg-gray-100 text-gray-700' },
};

// Export columns for activity logs
const activityExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { key: 'timestamp', label: 'Date/Heure', format: (v) => formatDateTime(v as string) },
  { key: 'userName', label: 'Utilisateur' },
  { key: 'userEmail', label: 'Email' },
  { key: 'userRole', label: 'Role' },
  { key: 'action', label: 'Action' },
  { key: 'actionType', label: 'Type' },
  { key: 'resource', label: 'Ressource' },
  { key: 'resourceType', label: 'Type Ressource' },
  { key: 'details', label: 'Details' },
  { key: 'ipAddress', label: 'Adresse IP' },
  { key: 'status', label: 'Statut' },
  { key: 'duration', label: 'Duree (ms)' },
];

export default function ActivityLogsPage() {
  const [logs] = useState<ActivityLog[]>(mockActivityLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<ActivityLog['actionType'] | 'all'>(
    'all'
  );
  const [resourceTypeFilter, setResourceTypeFilter] = useState<ActivityLog['resourceType'] | 'all'>(
    'all'
  );
  const [statusFilter, setStatusFilter] = useState<ActivityLog['status'] | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          log.action.toLowerCase().includes(query) ||
          log.userName.toLowerCase().includes(query) ||
          log.userEmail.toLowerCase().includes(query) ||
          log.resource.toLowerCase().includes(query) ||
          (log.details?.toLowerCase().includes(query) ?? false);
        if (!matchesSearch) {
          return false;
        }
      }

      // Action type filter
      if (actionTypeFilter !== 'all' && log.actionType !== actionTypeFilter) {
        return false;
      }

      // Resource type filter
      if (resourceTypeFilter !== 'all' && log.resourceType !== resourceTypeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && log.status !== statusFilter) {
        return false;
      }

      // Date range filter
      if (dateRange.start) {
        const logDate = new Date(log.timestamp);
        const startDate = new Date(dateRange.start);
        if (logDate < startDate) {
          return false;
        }
      }
      if (dateRange.end) {
        const logDate = new Date(log.timestamp);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (logDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, actionTypeFilter, resourceTypeFilter, statusFilter, dateRange]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = logs.filter((l) => new Date(l.timestamp) >= today);
    const failures = logs.filter((l) => l.status === 'failure');
    const byActionType: Record<string, number> = {};

    logs.forEach((l) => {
      byActionType[l.actionType] = (byActionType[l.actionType] || 0) + 1;
    });

    return {
      total: logs.length,
      today: todayLogs.length,
      failures: failures.length,
      byActionType,
    };
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal d'Activite</h1>
          <p className="text-gray-500 mt-1">Suivi des actions et evenements du systeme</p>
        </div>
        <ExportButton
          data={filteredLogs as unknown as Record<string, unknown>[]}
          columns={activityExportColumns}
          filename="activity-logs"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total logs</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
          <p className="text-sm text-gray-500">Aujourd'hui</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-2xl font-bold text-green-600">{stats.byActionType['update'] || 0}</p>
          <p className="text-sm text-gray-500">Modifications</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-2xl font-bold text-red-600">{stats.failures}</p>
          <p className="text-sm text-gray-500">Echecs</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full"
            />
          </div>

          {/* Action Type */}
          <select
            value={actionTypeFilter}
            onChange={(e) =>
              setActionTypeFilter(e.target.value as ActivityLog['actionType'] | 'all')
            }
            className="input-field"
          >
            <option value="all">Tous les types</option>
            {Object.entries(actionTypeConfig).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          {/* Resource Type */}
          <select
            value={resourceTypeFilter}
            onChange={(e) =>
              setResourceTypeFilter(e.target.value as ActivityLog['resourceType'] | 'all')
            }
            className="input-field"
          >
            <option value="all">Toutes ressources</option>
            {Object.entries(resourceTypeConfig).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ActivityLog['status'] | 'all')}
            className="input-field"
          >
            <option value="all">Tous statuts</option>
            <option value="success">Succes</option>
            <option value="failure">Echec</option>
            <option value="pending">En cours</option>
          </select>

          {/* Date Range */}
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="input-field flex-1"
            />
          </div>
        </div>
      </div>

      {/* Activity Log Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date/Heure
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Utilisateur
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ressource
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{formatDateTime(log.timestamp)}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.userName}</p>
                        <p className="text-xs text-gray-500">{log.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded',
                            actionTypeConfig[log.actionType].color
                          )}
                        >
                          {actionTypeConfig[log.actionType].label}
                        </span>
                        <span className="text-sm text-gray-700">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          [{resourceTypeConfig[log.resourceType].label}]
                        </span>
                        <span className="text-sm text-gray-700">{log.resource}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs font-medium rounded-full',
                          log.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : log.status === 'failure'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        )}
                      >
                        {log.status === 'success'
                          ? 'Succes'
                          : log.status === 'failure'
                            ? 'Echec'
                            : 'En cours'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {log.details || '-'}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="text-gray-500">Aucun log correspondant aux filtres</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Details de l'activite</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Main Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Date/Heure</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDateTime(selectedLog.timestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Statut</p>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      selectedLog.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : selectedLog.status === 'failure'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    )}
                  >
                    {selectedLog.status === 'success'
                      ? 'Succes'
                      : selectedLog.status === 'failure'
                        ? 'Echec'
                        : 'En cours'}
                  </span>
                </div>
              </div>

              {/* User Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase mb-2">Utilisateur</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                    {selectedLog.userName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedLog.userName}</p>
                    <p className="text-xs text-gray-500">{selectedLog.userEmail}</p>
                  </div>
                  <span
                    className={cn(
                      'ml-auto px-2 py-0.5 text-xs font-medium rounded',
                      roleConfig[selectedLog.userRole].color
                    )}
                  >
                    {roleConfig[selectedLog.userRole].label}
                  </span>
                </div>
              </div>

              {/* Action Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Action</p>
                  <p className="text-sm font-medium text-gray-900">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Type</p>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded',
                      actionTypeConfig[selectedLog.actionType].color
                    )}
                  >
                    {actionTypeConfig[selectedLog.actionType].label}
                  </span>
                </div>
              </div>

              {/* Resource Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Ressource</p>
                  <p className="text-sm font-medium text-gray-900">{selectedLog.resource}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Type ressource</p>
                  <p className="text-sm text-gray-700">
                    {resourceTypeConfig[selectedLog.resourceType].label}
                  </p>
                </div>
              </div>

              {/* Details */}
              {selectedLog.details && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Details</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                    {selectedLog.details}
                  </p>
                </div>
              )}

              {/* Technical Info */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 uppercase mb-2">Informations techniques</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Adresse IP</p>
                    <p className="font-mono text-gray-900">{selectedLog.ipAddress}</p>
                  </div>
                  {selectedLog.duration && (
                    <div>
                      <p className="text-gray-500">Duree</p>
                      <p className="font-mono text-gray-900">{selectedLog.duration} ms</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-gray-500">User Agent</p>
                    <p className="font-mono text-gray-900 text-xs break-all">
                      {selectedLog.userAgent}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
